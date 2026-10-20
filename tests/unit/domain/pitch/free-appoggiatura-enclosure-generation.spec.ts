// @vitest-environment node
/**
 * The free appoggiatura and the diatonic enclosure, end to end: with each Strongly favored and
 * every other figure as today, real standalone phrases over a few fixed seeds and controls hold
 * the figure, every instance the figure census finds resolves onto a chord tone under the chord it
 * began under, and the whole-result validator accepts every phrase.
 */

import { describe, expect, it } from 'vitest'

import type { FigureId } from '@/domain/figures/figure-levels'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { reconstructPhraseFacts } from '@/domain/pitch/validation/phrase-facts'
import type { SoundingFact } from '@/domain/pitch/validation/pitch-validation-types'
import { validateGenerationResult } from '@/domain/validation/generation-result-validator'
import { flattenNotes } from '@/domain/validation/generation-result-validator-checks'
import {
  censusOfOutcome,
  contextOf,
  type FigureInstance,
  type FreeFigure,
} from '../../../sweep/figure-census'
import { everyFigureAt, gridIntent, type GridPoint } from './figure-levels-grid'

/** A handful of fixed grid points: two seeds, two densities, a Settled Major and a Build Dorian. */
const POINTS: readonly GridPoint[] = [7, 13].flatMap((seed) =>
  (['Quarter', 'Eighth'] as const).flatMap((noteDensity) => [
    { seed, arpeggioChaos: 'Varied', noteDensity, collection: 'Major', tension: 'Settled' },
    { seed, arpeggioChaos: 'Varied', noteDensity, collection: 'Dorian', tension: 'Build' },
  ]),
)

/** One generated phrase: its sounding attacks and the census's instances of the figure. */
interface FigurePhrase {
  readonly attacks: readonly SoundingFact[]
  readonly instances: readonly FigureInstance[]
}

/**
 * Generate every point with `figure` Strongly favored and the others as today; check each phrase
 * is accepted by the whole-result validator and holds no unexplained note.
 */
function phrasesWith(figure: FigureId, label: FreeFigure): readonly FigurePhrase[] {
  const levels = { ...everyFigureAt('asToday'), [figure]: 'stronglyFavored' } as const
  return POINTS.map((point) => {
    const intent = gridIntent(point, levels, `free-${figure}`)
    const outcome = generatePhrase(intent)
    if (outcome.kind !== 'generation_success')
      throw new Error(`seed ${point.seed} ${point.noteDensity} gave ${outcome.code}`)
    const { request, result, provenance } = outcome
    expect(validateGenerationResult({ intent, request, result, provenance })).toEqual({
      kind: 'valid_generation_result',
    })
    const census = censusOfOutcome(intent, outcome)
    if ('kind' in census) throw new Error(`census failed: ${census.code}`)
    expect(census.counts.unexplained).toBe(0)
    const midis = flattenNotes(result.timeline.measures)
      .filter((ref) => !ref.event.tieContinuation)
      .map((ref) => ref.event.pitch)
    const { attacks } = reconstructPhraseFacts(contextOf(intent, outcome), midis)
    return { attacks, instances: census.instances.filter((found) => found.figure === label) }
  })
}

/**
 * Check one instance resolves once onto a chord tone under the chord it began under: its members
 * are scale notes outside the chord, and the attack right after the last one is a chord tone, a
 * scale step from each member, under the first member's harmony.
 */
function expectResolved(attacks: readonly SoundingFact[], instance: FigureInstance): void {
  const members = instance.attackIndices.map((index) => attacks[index]!)
  const target = attacks[instance.attackIndices.at(-1)! + 1]
  expect(target, `instance at ${instance.attackIndices.join(',')} has a target`).toBeDefined()
  expect(target!.chordTone).toBe(true)
  expect(target!.harmony).toBe(members[0]!.harmony)
  for (const member of members) {
    expect(member.inCollection && !member.chordTone).toBe(true)
    expect([1, 2]).toContain(Math.abs(member.midi - target!.midi))
  }
}

// @test-link [[rule_embellishment_figures_defined]]
// @test-link [[rule_figures_resolve_onto_chord_tones]]
// @test-link [[req_embellishment_figure_levels]]
// @test-link [[module_favored_figure_draw]]
describe('generation: the free appoggiatura and the diatonic enclosure, strongly favored', () => {
  it('writes free appoggiaturas entered by a leap on beat 1 or 3, each resolving onto a chord tone', () => {
    const phrases = phrasesWith('appoggiatura', 'appoggiatura')
    const instances = phrases.flatMap(({ attacks, instances }) =>
      instances.map((instance) => ({ attacks, instance })),
    )
    expect(instances.length).toBeGreaterThan(0)
    for (const { attacks, instance } of instances) {
      const [index] = instance.attackIndices as [number]
      expect(attacks[index]!.strongOnset).toBe(true)
      expect(Math.abs(attacks[index]!.midi - attacks[index - 1]!.midi)).toBeGreaterThanOrEqual(3)
      expectResolved(attacks, instance)
    }
  })

  it('writes diatonic enclosures, one note above and one below, each resolving onto a chord tone', () => {
    const phrases = phrasesWith('diatonicEnclosure', 'diatonic_enclosure')
    const instances = phrases.flatMap(({ attacks, instances }) =>
      instances.map((instance) => ({ attacks, instance })),
    )
    expect(instances.length).toBeGreaterThan(0)
    for (const { attacks, instance } of instances) {
      const [first, second] = instance.attackIndices.map((index) => attacks[index]!)
      const target = attacks[instance.attackIndices[1]! + 1]!
      expect(Math.sign(first!.midi - target.midi)).toBe(-Math.sign(second!.midi - target.midi))
      expectResolved(attacks, instance)
    }
  })
})
