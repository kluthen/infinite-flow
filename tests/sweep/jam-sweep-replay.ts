/**
 * The Jam sweep's replay sample (measurement tooling, v3.2 measurement M1): while a configuration
 * is played, a few phrases of each kind are kept with the intent they were asked with and the
 * outcome they sounded with: phrase 1 from each rung of Jam's ladder, a later phrase of a Jam with
 * the lock on (locked), and a later phrase of a Jam with the lock off under each drift (drifted).
 * Each is then encoded as its `ifk5.` replay key and replayed through the generation worker
 * runtime the replay tool uses (lock-census-replay.ts), and its result and provenance compared
 * with the session's. One sample key per kind is kept, so a phrase can be replayed by hand. A rung
 * that never made phrase 1 in the configuration is probed instead: that rung's own attempt for a
 * few of its Jams (its intent at C11's seed, generated once), replayed the same way.
 */

import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type { TimedSession } from '../unit/session/deadline-sweep'
import type { JamRunRecord } from './jam-sweep'
import { jamAttemptSeed, type DoodlePhraseOne, type LadderRung } from './jam-sweep-ladder'
import { replaySample, type ReplaySample } from './lock-census-replay'

/** How many phrases of each kind a configuration keeps for replay. */
export const JAM_REPLAY_SAMPLE_PER_KIND = 5

/** The kinds of phrase sampled for replay, in report order. */
export const JAM_REPLAY_KINDS = [
  'join-and-block',
  'block',
  'standalone',
  'locked',
  'drifted Close',
  'drifted Near',
  'drifted Free',
] as const

/** One kind of phrase sampled for replay. */
export type JamReplayKind = (typeof JAM_REPLAY_KINDS)[number]

/** One kind's replays: how many replayed and matched, and one key to replay by hand. */
export interface JamReplayKindFigures {
  readonly replayed: number
  readonly matched: number
  readonly sampleKey: string | null
  /** Whether the kind, a rung that never made phrase 1, was probed with its own attempts. */
  readonly probed: boolean
}

/** A configuration's replays: per kind, and every key whose replay did not match. */
export interface JamReplayFigures {
  readonly byKind: Readonly<Record<JamReplayKind, JamReplayKindFigures>>
  readonly mismatchedKeys: readonly string[]
}

/** One sampled phrase: what replaySample needs. */
type JamSample = Pick<ReplaySample, 'phraseNumber' | 'intent' | 'sounded'>

/** The attempt index of each rung's first attempt (C11's label). */
const FIRST_ATTEMPT: Readonly<Record<LadderRung, number>> = {
  'join-and-block': 0,
  block: 4,
  standalone: 5,
}

/** A rung's own attempt for one Jam, made only when the rung is probed. */
type Probe = () => JamSample | undefined

/**
 * A configuration's replay sample: from each steered Jam, phrase 1 under the kind of its rung,
 * and one later phrase (its number walking 2, 3, ... from one Jam to the next) under locked or its
 * drift's kind, until a kind holds its share; so the sample is deterministic and spread over Jams.
 */
export class JamReplaySampler {
  private readonly samples = new Map<JamReplayKind, JamSample[]>(
    JAM_REPLAY_KINDS.map((kind) => [kind, []]),
  )
  private readonly probes = new Map<LadderRung, Probe[]>([
    ['join-and-block', []],
    ['block', []],
    ['standalone', []],
  ])
  private replayed: JamReplayFigures | undefined

  /** Intent: a sampler keeping up to `perKind` phrases of each kind. */
  constructor(private readonly perKind: number = JAM_REPLAY_SAMPLE_PER_KIND) {}

  /**
   * Intent: offer one Jam steered by its doodle, with the session it played and what its doodle
   * gave phrase 1 (for the probes of the rungs that did not make its phrase 1).
   */
  addJam(
    record: JamRunRecord,
    session: TimedSession | undefined,
    doodle?: DoodlePhraseOne,
    sessionSeed?: number,
  ): void {
    if (record.drift === null) return
    if (doodle !== undefined && sessionSeed !== undefined)
      this.offerProbes(record.phraseOne?.rung ?? null, doodle, sessionSeed)
    if (session === undefined) return
    const sounded = new Map<number, JamSample>()
    for (const { output } of session.outputs)
      if (output.kind === 'phrase-sounding') {
        const { phraseNumber, intent, outcome } = output.phrase
        const { result, provenance } = outcome
        sounded.set(phraseNumber, { phraseNumber, intent, sounded: { result, provenance } })
      }
    const rung = record.phraseOne?.rung
    if (rung !== undefined && rung !== null) this.keep(rung, sounded.get(1))
    const later: JamReplayKind = record.lockCensus !== null ? 'locked' : `drifted ${record.drift}`
    const kept = this.samples.get(later)!.length
    this.keep(later, sounded.get(2 + (kept % Math.max(1, record.phraseCount - 1))))
  }

  /** Intent: keep, for each rung other than the one that made phrase 1, a probe of its attempt. */
  private offerProbes(made: LadderRung | null, doodle: DoodlePhraseOne, sessionSeed: number): void {
    for (const [rung, probes] of this.probes) {
      if (rung === made || probes.length >= this.perKind) continue
      if (rung === 'join-and-block' && !doodle.hasJoin) continue
      probes.push(() => {
        const intent = doodle.intentAt(rung, jamAttemptSeed(sessionSeed, FIRST_ATTEMPT[rung]))
        const outcome = generatePhrase(intent)
        if (outcome.kind !== 'generation_success') return undefined
        const { result, provenance } = outcome
        return { phraseNumber: 1, intent, sounded: { result, provenance } }
      })
    }
  }

  /** Intent: the samples of a kind: its own, or a rung's probes when it never made phrase 1. */
  private samplesOf(kind: JamReplayKind): { samples: JamSample[]; probed: boolean } {
    const own = this.samples.get(kind)!
    const probes = this.probes.get(kind as LadderRung)
    if (own.length > 0 || probes === undefined || probes.length === 0)
      return { samples: own, probed: false }
    return {
      samples: probes.flatMap((probe) => {
        const sample = probe()
        return sample === undefined ? [] : [sample]
      }),
      probed: true,
    }
  }

  /** Intent: keep one phrase under a kind, unless the kind is full or there is no phrase. */
  private keep(kind: JamReplayKind, sample: JamSample | undefined): void {
    const kept = this.samples.get(kind)!
    if (sample !== undefined && kept.length < this.perKind) kept.push(sample)
  }

  /** Intent: replay every sample once (later calls give the same figures). */
  replay(): JamReplayFigures {
    if (this.replayed !== undefined) return this.replayed
    const mismatchedKeys: string[] = []
    const byKind = Object.fromEntries(
      JAM_REPLAY_KINDS.map((kind) => {
        let matched = 0
        let sampleKey: string | null = null
        const { samples, probed } = this.samplesOf(kind)
        for (const sample of samples) {
          const replay = replaySample(sample)
          sampleKey ??= replay.key
          if (replay.matched) matched += 1
          else mismatchedKeys.push(replay.key)
        }
        return [kind, { replayed: samples.length, matched, sampleKey, probed }]
      }),
    ) as Record<JamReplayKind, JamReplayKindFigures>
    this.replayed = { byKind, mismatchedKeys }
    return this.replayed
  }
}

/**
 * Intent: the readable replay lines of a configuration: the replays matched per kind, one sample
 * key per kind sampled, and every key that did not match.
 */
export function jamReplayLines(label: string, figures: JamReplayFigures): readonly string[] {
  const prefix = `JAM-SWEEP [${label}] replay`
  const counts = JAM_REPLAY_KINDS.map((kind) => {
    const { replayed, matched, probed } = figures.byKind[kind]
    return `${kind} ${matched}/${replayed}${probed ? ' (probed)' : ''}`
  })
  const keys = JAM_REPLAY_KINDS.flatMap((kind) => {
    const key = figures.byKind[kind].sampleKey
    return key === null ? [] : [`${prefix} key ${kind}: ${key}`]
  })
  const mismatched = figures.mismatchedKeys.map((key) => `${prefix} MISMATCH: ${key}`)
  return [`${prefix}: ${counts.join(', ')}`, ...keys, ...mismatched]
}
