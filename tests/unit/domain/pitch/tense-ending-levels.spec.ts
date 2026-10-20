import { describe, expect, it } from 'vitest'
import { NEUTRAL_FIGURE_LEVELS, type FigureLevels } from '@/domain/figures/figure-levels'
import {
  FOUR_FOUR_METER,
  makeGenerationRequest,
  makeRequestId,
} from '@/domain/generation/generation-request'
import { makeCarryIn, type CarryIn } from '@/domain/generation/carry-in/carry-in'
import { makeHarmonyCandidateDomain } from '@/domain/harmony/harmony-planner'
import { makeActiveConcertRange } from '@/domain/profile/active-concert-range'
import { makeRegisterWindow } from '@/domain/profile/register-window'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeSeed } from '@/domain/random/seed'
import { makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'
import type { RhythmCandidate } from '@/domain/rhythm/rhythm-types'
import { buildCandidateDomains } from '@/domain/pitch/pitch-candidates'
import { compileAttacks } from '@/domain/pitch/pitch-context'
import { collectionPitchClasses } from '@/domain/pitch/pitch-harmony'
import { bindTensionRequirement, makePitchPolicy } from '@/domain/pitch/pitch-policy'
import { makeBoundPitchPlannerInput, type BoundPitchPlannerInput } from '@/domain/pitch/pitch-types'

/** The figure levels with the passing tone, the accented passing tone and the neighbor tone Off. */
const FREE_TONES_OFF: FigureLevels = {
  ...NEUTRAL_FIGURE_LEVELS,
  passingTone: 'off',
  accentedPassingTone: 'off',
  neighborTone: 'off',
}

/** The three-Off levels with only `figure` back at As today. */
function onlyFreeTone(
  figure: 'passingTone' | 'accentedPassingTone' | 'neighborTone',
): FigureLevels {
  return { ...FREE_TONES_OFF, [figure]: 'asToday' }
}

/** True when an onset falls on beat 1 or beat 3 of its bar. */
function onStrongBeat(startTick: number): boolean {
  return startTick === 0 || startTick === 8
}

/** A carry-in over the fixture's window, with no carried chord, so nothing is owed. */
function plainCarryIn(): CarryIn {
  return makeCarryIn({
    lastPitch: {
      midi: makeConcertPitch(60),
      arrivingInterval: null,
      recovery: { kind: 'settled' },
    },
    registerWindow: makeRegisterWindow(48, 72),
    finalHarmony: null,
    phraseNumber: 1,
  })
}

/**
 * The first fixture rhythm whose final note is on beat 1 or 3 (`strongFinal`) or off them: four
 * quarter-note bars ending on beat 3 with sparse silence, and on beat 4 with conversational
 * silence.
 */
function rhythmEndingOn(strongFinal: boolean): RhythmCandidate {
  const rhythms = makeRhythmCandidateDomain({
    noteDensity: 'Quarter',
    rhythmicVariety: 'Slightly varied',
    silenceDensity: strongFinal ? 'Sparse' : 'Conversational',
    syncopation: 'Straight',
    tensionArc: 'Settled',
  })
  if (rhythms.kind !== 'rhythm_candidate_domain') throw new Error('fixture rhythm missing')
  const rhythm = rhythms.candidates().next().value
  if (!rhythm) throw new Error('fixture rhythm missing')
  return rhythm
}

/** A bound input over a static C-major tonic phrase on `rhythm`, with or without carry-in. */
function fixtureInput(
  rhythm: RhythmCandidate,
  figureLevels: FigureLevels,
  carryIn: CarryIn | undefined,
): BoundPitchPlannerInput {
  const harmony = makeHarmonyCandidateDomain({
    tonalCenter: 'C',
    collection: 'Major',
    harmonicMotion: 'Static',
    tensionArc: 'Settled',
  })
  if (harmony.kind !== 'harmony_candidate_domain') throw new Error('fixture harmony missing')
  const tonic = harmony.candidates[0]
  if (!tonic) throw new Error('fixture harmony candidate missing')
  const binding = bindTensionRequirement(tonic, rhythm)
  if (!binding) throw new Error('fixture binding missing')
  return makeBoundPitchPlannerInput({
    request: makeGenerationRequest({
      requestId: makeRequestId('tense-ending-levels-test'),
      seed: makeSeed(1),
      measureCount: 4,
      meter: FOUR_FOUR_METER,
      activeConcertRange: makeActiveConcertRange(40, 84),
      register: 'Middle',
      registerWindow: makeRegisterWindow(48, 72),
      ...(carryIn === undefined ? {} : { carryIn }),
    }),
    policy: makePitchPolicy({
      figureLevels,
      collection: 'Major',
      tonalCenter: 'C',
      contour: 'Wandering',
      leapiness: 'Angular',
      arpeggioChaos: 'Predictable',
      searchFuel: 20_000,
    }),
    harmony: tonic,
    rhythm,
    tensionBinding: binding,
  })
}

/**
 * The tense-ending candidates of the final attack (scale notes off its chord) on a fixture rhythm
 * whose final note is, or is not, on beat 1 or 3; with the plain carry-in unless `withCarryIn` is
 * false.
 */
function finalTenseCandidates(
  strongFinal: boolean,
  figureLevels: FigureLevels,
  withCarryIn = true,
) {
  const carryIn = withCarryIn ? plainCarryIn() : undefined
  const input = fixtureInput(rhythmEndingOn(strongFinal), figureLevels, carryIn)
  const attacks = compileAttacks(input)
  const final = attacks.at(-1)!
  expect(final.isFinal).toBe(true)
  expect(onStrongBeat(final.startTick)).toBe(strongFinal)
  const domains = buildCandidateDomains(input, attacks, collectionPitchClasses(input.policy))
  return domains[final.attackIndex]!.filter((candidate) => candidate.role !== 'chord_tone')
}

/** Whether the final attack offers a tense ending, on beat 1 or 3 and off them, under `levels`. */
function offeredByBeat(levels: FigureLevels) {
  return {
    strong: finalTenseCandidates(true, levels).length > 0,
    weak: finalTenseCandidates(false, levels).length > 0,
  }
}

// @test-link [[rule_join_tense_note_resolution]]
// @test-link [[rule_levels_govern_free_figures_only]]
describe('pitch-candidates: the levels gate the tense ending of a joined phrase', () => {
  it("offers a tense ending on either beat under Neutral's levels", () => {
    expect(offeredByBeat(NEUTRAL_FIGURE_LEVELS)).toEqual({ strong: true, weak: true })
  })

  it('offers no tense ending with the passing, accented passing and neighbor tones Off', () => {
    expect(offeredByBeat(FREE_TONES_OFF)).toEqual({ strong: false, weak: false })
  })

  it('offers it off beats 1 and 3 only when only the passing tone is allowed', () => {
    expect(offeredByBeat(onlyFreeTone('passingTone'))).toEqual({ strong: false, weak: true })
  })

  it('offers it on beats 1 and 3 only when only the accented passing tone is allowed', () => {
    expect(offeredByBeat(onlyFreeTone('accentedPassingTone'))).toEqual({
      strong: true,
      weak: false,
    })
  })

  it('offers it on either beat when only the neighbor tone is allowed', () => {
    expect(offeredByBeat(onlyFreeTone('neighborTone'))).toEqual({ strong: true, weak: true })
  })

  it('names no figure and carries no resolution on a tense ending', () => {
    const levelsCases = [
      NEUTRAL_FIGURE_LEVELS,
      onlyFreeTone('passingTone'),
      onlyFreeTone('accentedPassingTone'),
      onlyFreeTone('neighborTone'),
    ]
    for (const levels of levelsCases)
      for (const strongFinal of [true, false])
        for (const candidate of finalTenseCandidates(strongFinal, levels)) {
          expect(candidate.role).toBe('passing_or_neighbor')
          expect(candidate).not.toHaveProperty('figures')
          expect(candidate).not.toHaveProperty('freeResolution')
          expect(candidate).not.toHaveProperty('reservation')
        }
  })

  it('never offers a tense ending without carry-in', () => {
    for (const levels of [NEUTRAL_FIGURE_LEVELS, onlyFreeTone('neighborTone')])
      for (const strongFinal of [true, false])
        expect(finalTenseCandidates(strongFinal, levels, false)).toEqual([])
  })
})
