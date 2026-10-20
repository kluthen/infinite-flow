// @vitest-environment node
/**
 * Measurement M3, the my-instrument range sweep (`npm run sweep:my-instrument` only; never part of
 * `npm run test:unit` nor `npm run test:sweep`). It measures how often the real generator succeeds
 * for my instruments whose ranges sit low, in the middle, high, at the MIDI extremes and wider
 * than the built-ins: each range, made from the C keyboard template at concert pitch, is generated
 * with every supported rhythm setting and the seed matrix's first two seeds, every other control
 * at its default. It prints one table (range case, generations, failures, share, failures by
 * failure code) and the total wall time. It records a measurement and gates nothing: the only
 * assertion is that every planned generation ran.
 */

import { describe, expect, it } from 'vitest'

import { DEFAULT_GENERATION_CONTROLS } from '@/domain/controls/profile-selection'
import { createGenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type { GenerationFailureCode } from '@/domain/generation/orchestration/orchestration-types'
import { makeMyInstrument, type WrittenRange } from '@/domain/profile/my-instrument'
import { makeSeed } from '@/domain/random/seed'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import { SEEDS } from '../unit/domain/generation/carry-in/carry-in-matrix'
import type { RhythmSetting } from '../unit/domain/generation/orchestration/cold-generation-golden/cold-generation-golden-fixture'
import { supportedRhythmSettings } from '../unit/session/deadline-sweep'

/** One swept range: its label and its written range (concert pitch: the transposition is "same"). */
interface RangeCase {
  readonly label: string
  readonly writtenRange: WrittenRange
}

/** The swept ranges: three two-octave positions, the two MIDI extremes and two wider spans. */
const RANGE_CASES: readonly RangeCase[] = [
  { label: 'low 24 (12-36)', writtenRange: { minMidi: 12, maxMidi: 36 } },
  { label: 'middle 24 (54-78)', writtenRange: { minMidi: 54, maxMidi: 78 } },
  { label: 'high 24 (91-115)', writtenRange: { minMidi: 91, maxMidi: 115 } },
  { label: 'extreme low 24 (0-24)', writtenRange: { minMidi: 0, maxMidi: 24 } },
  { label: 'extreme high 24 (103-127)', writtenRange: { minMidi: 103, maxMidi: 127 } },
  { label: 'wide 48 (36-84)', writtenRange: { minMidi: 36, maxMidi: 84 } },
  { label: 'wide 60 (30-90)', writtenRange: { minMidi: 30, maxMidi: 90 } },
]

/** The seeds each setting is generated with: the seed matrix's first two. */
const SWEEP_SEEDS: readonly number[] = SEEDS.slice(0, 2)

/** One range case's tally. */
interface RangeTally {
  readonly label: string
  readonly generations: number
  readonly failures: number
  readonly failuresByCode: ReadonlyMap<GenerationFailureCode, number>
}

/** Intent: one generation of the range's my instrument with one rhythm setting and seed. */
function generateOnce(
  rangeCase: RangeCase,
  rhythm: RhythmSetting,
  seed: number,
  index: number,
): ReturnType<typeof generatePhrase> {
  const instrument = makeMyInstrument({
    template: 'c-keyboard',
    name: `M3 ${rangeCase.label}`,
    clef: 'treble',
    writtenRange: rangeCase.writtenRange,
    transposition: { octaves: 0, semitones: 0, direction: 'same' },
  })
  const intent = createGenerationIntent({
    requestId: makeRequestId(`m3-${rangeCase.writtenRange.minMidi}-${index}`),
    seed: makeSeed(seed),
    controls: {
      ...DEFAULT_GENERATION_CONTROLS,
      tension: rhythm.tensionArc,
      noteDensity: rhythm.noteDensity,
      rhythmicVariety: rhythm.rhythmicVariety,
      syncopation: rhythm.syncopation,
      silenceDensity: rhythm.silenceDensity,
      instrumentProfileId: 'my-instrument',
    },
    figureLevels: NEUTRAL_FIGURE_LEVELS,
    instrumentProfile: instrument.profile,
  })
  return generatePhrase(intent)
}

/** Intent: generate every supported rhythm setting with every sweep seed for one range case. */
function sweepRange(rangeCase: RangeCase, settings: readonly RhythmSetting[]): RangeTally {
  const failuresByCode = new Map<GenerationFailureCode, number>()
  let generations = 0
  let failures = 0
  for (const rhythm of settings)
    for (const seed of SWEEP_SEEDS) {
      const outcome = generateOnce(rangeCase, rhythm, seed, generations)
      generations += 1
      if (outcome.kind === 'generation_failure') {
        failures += 1
        failuresByCode.set(outcome.code, (failuresByCode.get(outcome.code) ?? 0) + 1)
      }
    }
  return { label: rangeCase.label, generations, failures, failuresByCode }
}

/** Intent: the printed table, one row per range case. */
function tableLines(tallies: readonly RangeTally[]): string[] {
  const rows = tallies.map((tally) => {
    const share = ((100 * tally.failures) / tally.generations).toFixed(1)
    const byCode =
      [...tally.failuresByCode.entries()].map(([code, count]) => `${code}: ${count}`).join(', ') ||
      '-'
    return `| ${tally.label} | ${tally.generations} | ${tally.failures} | ${share}% | ${byCode} |`
  })
  return [
    '| range case | generations | failures | share | failures by code |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
  ]
}

describe('M3: my-instrument range sweep', () => {
  it('generates every supported rhythm setting with two seeds for each range case and prints the failure table', () => {
    const settings = supportedRhythmSettings()
    const started = performance.now()
    const tallies = RANGE_CASES.map((rangeCase) => sweepRange(rangeCase, settings))
    const seconds = (performance.now() - started) / 1000
    console.log(
      [
        `M3 my-instrument range sweep: ${settings.length} supported rhythm settings x seeds ${SWEEP_SEEDS.join(', ')}`,
        ...tableLines(tallies),
        `Total wall time: ${seconds.toFixed(1)} s`,
      ].join('\n'),
    )
    for (const tally of tallies)
      expect(tally.generations).toBe(settings.length * SWEEP_SEEDS.length)
  })
})
