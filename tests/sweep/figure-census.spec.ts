// @vitest-environment node
/**
 * The figure census's own tests (measurement tooling, run by `npm run measure:figures`): a
 * hand-written C major phrase holding one of each of the seven figures and one Tension scheduled
 * figure is named exactly, chord tones alone give nothing, a stray note is counted as unexplained,
 * and the census runs on a real generated phrase without leaving any non-chord attack unexplained.
 */

import { describe, expect, it } from 'vitest'

import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { buildIntent } from '../unit/domain/generation/carry-in/carry-in-fixture'
import { QUARTERS, bar, context, figure } from '../unit/domain/pitch/validation/validation-fixtures'
import { censusOfContext, censusOfOutcome, type PhraseCensus } from './figure-census'

/** Four bars of eighth notes: attacks 0 and 4 of each bar fall on beats 1 and 3. */
const EIGHTHS = [0, 1, 2, 3].map((index) => bar(index as 0 | 1 | 2 | 3, 'e e e e e e e e'))

/**
 * One of each figure over C major (C E G in every bar), as attack index: figure.
 * Bar 0: C D E G | D C G E — 1 passing tone (C-D-E), 4 appoggiatura (G leaps up to D on beat 3,
 * then C). Bar 1: D C E F | E F D E — 8 accented passing tone (E-D-C, D on beat 1), 11 neighbor
 * tone (E-F-E), 13-14 diatonic enclosure (F-D-E). Bar 2: G D# E F | D# E G C — 17 chromatic
 * approach (D#-E), 19-20 chromatic enclosure (F-D#-E). Bar 3: G A G E | C E G C — 25 Tension's
 * scheduled figure (G-A-G).
 */
const EVERY_FIGURE = [
  [60, 62, 64, 67, 74, 72, 67, 64],
  [62, 60, 64, 65, 64, 65, 62, 64],
  [67, 63, 64, 65, 63, 64, 67, 72],
  [67, 69, 67, 64, 60, 64, 67, 72],
].flat()

/** Intent: the census of a hand-written phrase through the census's own facts path. */
function census(midis: readonly number[], overrides: Parameters<typeof context>[0]): PhraseCensus {
  return censusOfContext(context(overrides), midis)
}

describe('figure census on hand-written phrases', () => {
  it('names one of each of the seven figures and the Tension scheduled figure', () => {
    const result = census(EVERY_FIGURE, {
      profile: 'Jazz',
      bars: EIGHTHS,
      binding: figure('diatonic_passing_or_neighbor', [25]),
    })
    expect(result.instances).toEqual([
      { figure: 'passing_tone', attackIndices: [1], barIndex: 0 },
      { figure: 'appoggiatura', attackIndices: [4], barIndex: 0 },
      { figure: 'accented_passing_tone', attackIndices: [8], barIndex: 1 },
      { figure: 'neighbor_tone', attackIndices: [11], barIndex: 1 },
      { figure: 'diatonic_enclosure', attackIndices: [13, 14], barIndex: 1 },
      { figure: 'chromatic_approach', attackIndices: [17], barIndex: 2 },
      { figure: 'chromatic_enclosure', attackIndices: [19, 20], barIndex: 2 },
      {
        figure: 'tension_scheduled',
        attackIndices: [25],
        barIndex: 3,
        figureKind: 'diatonic_passing_or_neighbor',
      },
    ])
    expect(result.counts.unexplained).toBe(0)
  })

  it('finds no figure in a phrase of chord tones only', () => {
    const chordTones = [60, 64, 67, 64, 60, 64, 67, 72, 67, 64, 60, 64, 67, 64, 60, 67]
    const result = census(chordTones, { bars: QUARTERS })
    expect(result.instances).toEqual([])
    expect(result.nonChordAttacks).toEqual([])
  })

  it('counts a non-chord note entered and left by leap on a weak beat as unexplained', () => {
    const stray = [60, 69, 64, 67, 60, 64, 67, 64, 60, 64, 67, 72, 67, 64, 60, 67]
    const result = census(stray, { bars: QUARTERS })
    expect(result.instances).toEqual([{ figure: 'unexplained', attackIndices: [1], barIndex: 0 }])
    expect(result.counts.unexplained).toBe(1)
  })
})

describe('figure census on a real generated phrase', () => {
  it('explains every non-chord attack of a standalone Jazz phrase', () => {
    const intent = buildIntent({
      controls: { noteDensity: 'Eighth', tension: 'Build', collection: 'Major' },
      musicalProfile: 'Jazz',
      seed: 7,
      label: 'figure-census',
    })
    const outcome = generatePhrase(intent)
    if (outcome.kind !== 'generation_success')
      throw new Error(`Expected a generated phrase, got ${outcome.code}.`)
    const result = censusOfOutcome(intent, outcome)
    if ('kind' in result) throw new Error(`Expected a census, got ${result.code}.`)

    const binding = outcome.provenance.tensionBinding
    expect(binding.attackIndices.length).toBeGreaterThan(0)
    const covered = new Set(result.instances.flatMap((instance) => instance.attackIndices))
    expect(result.nonChordAttacks.filter((index) => !covered.has(index))).toEqual([])
    expect(result.instances.filter((instance) => instance.figure === 'unexplained')).toEqual([])
    expect(result.instances.filter((instance) => instance.figure === 'tension_scheduled')).toEqual([
      {
        figure: 'tension_scheduled',
        attackIndices: binding.attackIndices,
        barIndex: expect.any(Number),
        figureKind: binding.figureKind,
      },
    ])
  })
})
