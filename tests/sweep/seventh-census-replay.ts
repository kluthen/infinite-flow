/**
 * The seventh census's replay sample (measurement tooling, v3.3 measurement M1): while the census
 * runs, a few of its phrases are kept with the intent they were asked with and the outcome they got:
 * up to five generated phrases per level, up to five fallbacks (any level above Off), and up to five
 * phrases above Off whose plan stays triads with no seventh drawn, at most one phrase of a sweep
 * case per class so the sample spreads over the sweep. Each is then encoded as its `ifk5.` replay
 * key, replayed through the generation worker runtime the replay tool uses (lock-census-replay.ts)
 * as phrase 1, and its result and provenance compared with the census's. One sample key per class
 * is kept, so a phrase can be replayed by hand.
 */

import type { ChordFamilyLevel } from '@/domain/chords/chord-families'
import type { GeneratedCensusCase } from './seventh-census-sweep'
import { replaySample, type ReplaySample } from './lock-census-replay'
import { SEVENTH_LEVEL_NAMES } from './seventh-levels'

/** How many phrases of each class the census keeps for replay. */
export const SEVENTH_REPLAY_PER_CLASS = 5

/** The class of the fallback phrases, at any level above Off. */
export const FALLBACK_CLASS = 'fallback'

/** The class of the phrases above Off whose draw gave no event its seventh form. */
export const UNDRAWN_CLASS = 'triads, none drawn'

/** Intent: the class of the phrases generated at one level. */
export function generatedClass(level: ChordFamilyLevel): string {
  return `generated at ${SEVENTH_LEVEL_NAMES[level]}`
}

/** One class's replays: how many replayed and matched, and one key to replay by hand. */
export interface SeventhReplayClassFigures {
  readonly replayClass: string
  readonly replayed: number
  readonly matched: number
  readonly sampleKey: string | null
}

/** The census's replays: per class, in report order, and every key whose replay did not match. */
export interface SeventhReplayFigures {
  readonly classes: readonly SeventhReplayClassFigures[]
  readonly mismatchedKeys: readonly string[]
}

/** One sampled phrase: the sweep case it comes from, and what replaySample needs. */
interface SeventhSample extends Pick<ReplaySample, 'phraseNumber' | 'intent' | 'sounded'> {
  readonly caseIndex: number
}

/**
 * The census's replay sample: per class, at most `perClass` phrases, at most one of each sweep
 * case, taken in the order the census offers them; so the sample is deterministic and bounded,
 * never every outcome.
 */
export class SeventhReplaySampler {
  private readonly samples: Map<string, SeventhSample[]>
  private replayed: SeventhReplayFigures | undefined

  /** Intent: a sampler for the census of `levels`, keeping up to `perClass` phrases per class. */
  constructor(
    levels: readonly ChordFamilyLevel[],
    private readonly perClass: number = SEVENTH_REPLAY_PER_CLASS,
  ) {
    const classes = [...levels.map(generatedClass)]
    if (levels.some((level) => level !== 'off')) classes.push(FALLBACK_CLASS, UNDRAWN_CLASS)
    this.samples = new Map(classes.map((replayClass) => [replayClass, []]))
  }

  /** Intent: the classes one generated census case belongs to; none for a failed generation. */
  private classesOf({ census }: GeneratedCensusCase): readonly string[] {
    if ('kind' in census) return []
    const classes = [generatedClass(census.level)]
    if (census.level === 'off') return classes
    if (census.fallback) classes.push(FALLBACK_CLASS)
    if (census.drawnSevenths === 0) classes.push(UNDRAWN_CLASS)
    return classes
  }

  /** Intent: offer one census case of sweep case `caseIndex`, kept in each class it may still join. */
  offer(caseIndex: number, generated: GeneratedCensusCase): void {
    const { intent, outcome } = generated
    if (outcome.kind !== 'generation_success') return
    for (const replayClass of this.classesOf(generated)) {
      const kept = this.samples.get(replayClass)
      if (kept === undefined || kept.length >= this.perClass) continue
      if (kept.some((sample) => sample.caseIndex === caseIndex)) continue
      kept.push({
        caseIndex,
        phraseNumber: 1,
        intent,
        sounded: { result: outcome.result, provenance: outcome.provenance },
      })
    }
  }

  /** Intent: replay every sample once (later calls give the same figures). */
  replay(): SeventhReplayFigures {
    if (this.replayed !== undefined) return this.replayed
    const mismatchedKeys: string[] = []
    const classes = [...this.samples].map(([replayClass, samples]) => {
      let matched = 0
      let sampleKey: string | null = null
      for (const sample of samples) {
        const replay = replaySample(sample)
        sampleKey ??= replay.key
        if (replay.matched) matched += 1
        else mismatchedKeys.push(replay.key)
      }
      return { replayClass, replayed: samples.length, matched, sampleKey }
    })
    this.replayed = { classes, mismatchedKeys }
    return this.replayed
  }
}

/**
 * Intent: the readable replay lines of the census: per class, the replays matched and one sample
 * key, then every key that did not match.
 */
export function seventhReplayLines(figures: SeventhReplayFigures): readonly string[] {
  return [
    ...figures.classes.map(
      ({ replayClass, replayed, matched, sampleKey }) =>
        `SEVENTH-CENSUS replay ${replayClass}: matched ${matched} of ${replayed}, sample key ${sampleKey ?? 'none'}`,
    ),
    ...figures.mismatchedKeys.map((key) => `SEVENTH-CENSUS replay MISMATCH: ${key}`),
  ]
}
