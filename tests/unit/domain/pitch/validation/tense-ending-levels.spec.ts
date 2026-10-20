import { describe, expect, it } from 'vitest'
import { NEUTRAL_FIGURE_LEVELS, type FigureLevels } from '@/domain/figures/figure-levels'
import { makeCarryIn } from '@/domain/generation/carry-in/carry-in'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeRegisterWindow } from '@/domain/profile/register-window'
import { validatePitchMidis } from '@/domain/pitch/validation/pitch-phrase-validator'
import { QUARTERS, bar, context } from './validation-fixtures'

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

/** A carry-in after a phrase ending on a settled middle C, with no carried chord. */
const CARRY_IN = makeCarryIn({
  lastPitch: { midi: makeConcertPitch(60), arrivingInterval: null, recovery: { kind: 'settled' } },
  registerWindow: makeRegisterWindow(55, 79),
  finalHarmony: null,
  phraseNumber: 1,
})

/** Chord tones of C major over the first three bars, with checkpoints 60, 67 and 60. */
const OPENING = [60, 64, 67, 64, 67, 64, 60, 64, 60, 64, 60, 64] as const

/**
 * Quarter notes ending off beats 1 and 3: the final D (62), on beat 4, is a scale note outside the
 * C chord, stepped into from E, that the next phrase can resolve onto C or E.
 */
const WEAK_ENDING = { midis: [...OPENING, 64, 67, 64, 62], bars: QUARTERS } as const

/**
 * The last bar is two quarters and a half note: the final F (65), on beat 3, is a scale note
 * outside the C chord, stepped into from G, that the next phrase can resolve onto E or G.
 */
const STRONG_ENDING = {
  midis: [...OPENING, 64, 67, 65],
  bars: [...QUARTERS.slice(0, 3), bar(3, 'q q h')],
} as const

/**
 * The validator's failures for a tense-ending phrase under `figureLevels` and Angular leapiness
 * (room for its two arpeggio runs), with the carry-in unless `withCarryIn` is false.
 */
function failures(
  ending: typeof WEAK_ENDING | typeof STRONG_ENDING,
  figureLevels: FigureLevels,
  withCarryIn = true,
) {
  const overrides = {
    figureLevels,
    leapiness: 'Angular',
    bars: ending.bars,
    ...(withCarryIn ? { carryIn: CARRY_IN } : {}),
  } as const
  const result = validatePitchMidis(context(overrides), ending.midis)
  return result.kind === 'valid_pitch_phrase' ? [] : result.failures
}

/** The failures of an ending the levels do not let the phrase owe, at its final attack. */
function refusedAt(ending: typeof WEAK_ENDING | typeof STRONG_ENDING) {
  const attackIndex = ending.midis.length - 1
  return [
    { code: 'unexplained_non_chord_tone', attackIndex },
    { code: 'open_endpoint_violation', attackIndex },
  ]
}

// @test-link [[rule_join_tense_note_resolution]]
// @test-link [[rule_levels_govern_free_figures_only]]
describe('pitch validation: the levels gate the tense ending of a joined phrase', () => {
  it("accepts a tense ending on either beat under Neutral's levels", () => {
    expect(failures(WEAK_ENDING, NEUTRAL_FIGURE_LEVELS)).toEqual([])
    expect(failures(STRONG_ENDING, NEUTRAL_FIGURE_LEVELS)).toEqual([])
  })

  it('refuses it without carry-in, whatever the levels', () => {
    expect(failures(WEAK_ENDING, NEUTRAL_FIGURE_LEVELS, false)).toEqual(refusedAt(WEAK_ENDING))
    expect(failures(STRONG_ENDING, NEUTRAL_FIGURE_LEVELS, false)).toEqual(refusedAt(STRONG_ENDING))
  })

  it('refuses it with the passing, accented passing and neighbor tones Off', () => {
    expect(failures(WEAK_ENDING, FREE_TONES_OFF)).toEqual(refusedAt(WEAK_ENDING))
    expect(failures(STRONG_ENDING, FREE_TONES_OFF)).toEqual(refusedAt(STRONG_ENDING))
  })

  it('accepts it off beats 1 and 3 only when only the passing tone is allowed', () => {
    const levels = onlyFreeTone('passingTone')
    expect(failures(WEAK_ENDING, levels)).toEqual([])
    expect(failures(STRONG_ENDING, levels)).toEqual(refusedAt(STRONG_ENDING))
  })

  it('accepts it on beats 1 and 3 only when only the accented passing tone is allowed', () => {
    const levels = onlyFreeTone('accentedPassingTone')
    expect(failures(WEAK_ENDING, levels)).toEqual(refusedAt(WEAK_ENDING))
    expect(failures(STRONG_ENDING, levels)).toEqual([])
  })

  it('accepts it on either beat when only the neighbor tone is allowed', () => {
    const levels = onlyFreeTone('neighborTone')
    expect(failures(WEAK_ENDING, levels)).toEqual([])
    expect(failures(STRONG_ENDING, levels)).toEqual([])
  })
})
