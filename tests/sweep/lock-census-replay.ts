/**
 * The lock census's replay sample (measurement tooling, v3.2 measurement M2): while a setting
 * group is tallied, a few phrases of each census class are kept with the intent they were asked
 * with and the outcome they sounded with; each is then encoded as its phrase replay key, replayed
 * through the generation worker runtime the replay tool uses (`npm run replay:phrase`), and its
 * result and provenance compared with the session's. A sample key per class is kept, so a phrase
 * can be replayed by hand.
 */

import { isDeepStrictEqual } from 'node:util'

import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { replayPhraseKey } from '@/generation-worker/phrase-replay'
import {
  PHRASE_REPLAY_KEY_V4_PREFIX,
  encodePhraseReplayKey,
} from '@/generation-worker/phrase-replay-key'
import type { SuccessfulOutcome } from '@/session/session-types'
import type { CensusClass, CensusEntry } from './lock-census'

/** How many phrases of each census class a setting group keeps for replay. */
export const REPLAY_SAMPLE_PER_CLASS = 5

/** The census classes sampled for replay, in report order. */
export const REPLAY_CLASSES = ['kept', 'change', 'bend', 'relock'] as const

/** One census class sampled for replay. */
export type ReplayClass = (typeof REPLAY_CLASSES)[number]

/** One phrase that sounded, as a replay reads it: its number, its intent and its outcome. */
export interface ReplayablePhrase {
  readonly phraseNumber: number
  readonly intent: GenerationIntent
  readonly outcome: SuccessfulOutcome
}

/** One sampled phrase: its class, its number, its intent, and what it sounded with. */
export interface ReplaySample {
  readonly lockClass: ReplayClass
  readonly phraseNumber: number
  readonly intent: GenerationIntent
  readonly sounded: Pick<SuccessfulOutcome, 'result' | 'provenance'>
}

/** One class's replays: how many replayed and matched, and one key to replay by hand. */
export interface ReplayClassFigures {
  readonly replayed: number
  readonly matched: number
  readonly sampleKey: string | null
}

/** A setting group's replays: per class, and every key whose replay did not match. */
export interface ReplayFigures {
  readonly byClass: Readonly<Record<ReplayClass, ReplayClassFigures>>
  readonly mismatchedKeys: readonly string[]
}

/** Intent: the replay class of a census class; none for phrase 1, a repeat or an unreadable one. */
export function replayClassOf(lockClass: CensusClass): ReplayClass | undefined {
  const kind = lockClass.kind
  return kind === 'kept' || kind === 'change' || kind === 'bend' || kind === 'relock'
    ? kind
    : undefined
}

/** Intent: a value as plain JSON data, as a structured clone or a printed report would carry it. */
function asJson(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value)) as unknown
}

/**
 * Intent: replay one sample from its key: encode it, require an `ifk4.` key, replay it through
 * the generation worker runtime, and compare the replayed result and provenance with the
 * session's, as JSON data. A key of another version, or a replay that did not succeed, does not
 * match.
 */
export function replaySample(sample: ReplaySample): {
  readonly key: string
  readonly matched: boolean
} {
  const key = encodePhraseReplayKey(sample.intent, sample.phraseNumber)
  if (!key.startsWith(PHRASE_REPLAY_KEY_V4_PREFIX)) return { key, matched: false }
  const { output } = replayPhraseKey(key)
  if (output.kind !== 'generation_success' || output.raw.kind !== 'generation_success')
    return { key, matched: false }
  const replayed = { result: output.raw.result, provenance: output.raw.provenance }
  const sounded = { result: sample.sounded.result, provenance: sample.sounded.provenance }
  return { key, matched: isDeepStrictEqual(asJson(replayed), asJson(sounded)) }
}

/**
 * A setting group's replay sample: from each session, at most one phrase of each class, in phrase
 * order, until a class holds its share; so the sample is deterministic and spread over sessions.
 */
export class ReplaySampler {
  private readonly samples = new Map<ReplayClass, ReplaySample[]>(
    REPLAY_CLASSES.map((lockClass) => [lockClass, []]),
  )
  private replayed: ReplayFigures | undefined

  /** Intent: a sampler keeping up to `perClass` phrases of each class. */
  constructor(private readonly perClass: number = REPLAY_SAMPLE_PER_CLASS) {}

  /** Intent: offer one session's census entries, with the phrases that sounded in it. */
  addSession(entries: readonly CensusEntry[], sounded: readonly ReplayablePhrase[]): void {
    const taken = new Set<ReplayClass>()
    for (const entry of entries) {
      const lockClass = replayClassOf(entry.lockClass)
      if (lockClass === undefined || taken.has(lockClass)) continue
      const kept = this.samples.get(lockClass)!
      if (kept.length >= this.perClass) continue
      const phrase = sounded.find((each) => each.phraseNumber === entry.phraseNumber)
      if (phrase === undefined) continue
      taken.add(lockClass)
      const { result, provenance } = phrase.outcome
      kept.push({
        lockClass,
        phraseNumber: phrase.phraseNumber,
        intent: phrase.intent,
        sounded: { result, provenance },
      })
    }
  }

  /** Intent: replay every sample once (later calls give the same figures). */
  replay(): ReplayFigures {
    if (this.replayed !== undefined) return this.replayed
    const mismatchedKeys: string[] = []
    const byClass = Object.fromEntries(
      REPLAY_CLASSES.map((lockClass) => {
        let matched = 0
        let sampleKey: string | null = null
        const samples = this.samples.get(lockClass)!
        for (const sample of samples) {
          const replay = replaySample(sample)
          sampleKey ??= replay.key
          if (replay.matched) matched += 1
          else mismatchedKeys.push(replay.key)
        }
        return [lockClass, { replayed: samples.length, matched, sampleKey }]
      }),
    ) as Record<ReplayClass, ReplayClassFigures>
    this.replayed = { byClass, mismatchedKeys }
    return this.replayed
  }
}

/**
 * Intent: the readable replay lines of a setting group: the replays matched per class, one sample
 * key per class sampled, and every key that did not match.
 */
export function replayLines(label: string, figures: ReplayFigures): readonly string[] {
  const prefix = `LOCK-CENSUS [${label}] replay`
  const counts = REPLAY_CLASSES.map((lockClass) => {
    const { replayed, matched } = figures.byClass[lockClass]
    return `${lockClass} ${matched}/${replayed}`
  })
  const keys = REPLAY_CLASSES.flatMap((lockClass) => {
    const key = figures.byClass[lockClass].sampleKey
    return key === null ? [] : [`${prefix} key ${lockClass}: ${key}`]
  })
  const mismatched = figures.mismatchedKeys.map((key) => `${prefix} MISMATCH: ${key}`)
  return [`${prefix}: ${counts.join(', ')}`, ...keys, ...mismatched]
}
