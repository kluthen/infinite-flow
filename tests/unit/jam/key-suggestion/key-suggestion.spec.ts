// @vitest-environment node
/**
 * The key and mode suggestion's answer (master spec C6.1–C6.3, C6.5): judged in C6.3's order
 * (spec D452), too little material, then no fit, then Jam's key and mode among the kept
 * candidates, otherwise the drawn pair, named in written pitch in the player's family; the
 * research note's worked examples; the same doodle giving the same answer every run; and the
 * golden answers of a fixed list, the same list the in-browser spec computes in Chrome.
 */
import { describe, expect, it } from 'vitest'

import {
  COLLECTIONS,
  PITCH_CLASSES,
  type Collection,
  type PitchClass,
} from '@/domain/controls/generation-controls'
import type { QuantizedDoodle } from '@/domain/doodle/quantized-doodle'
import { findBuiltInInstrumentProfile } from '@/domain/profile/instrument-profiles'
import { suggestKeyAndMode, type KeySuggestion } from '@/jam/key-suggestion/key-suggestion'
import { keySuggestionSeed } from '@/jam/key-suggestion/key-suggestion-draw'
import { fitsWell, keptCandidates, scorePairs } from '@/jam/key-suggestion/key-suggestion-scores'

import { describeKeySuggestion, loadKeySuggestionGolden } from './key-suggestion-golden'
import {
  beatsDoodle,
  BLUESY,
  ENDING_ON_E,
  HARMONIC_MINOR,
  tickDoodle,
  WORKED_EXAMPLE,
} from './key-suggestion-doodles'

/** Intent: a built-in instrument profile, by id. */
function instrument(id: string) {
  const profile = findBuiltInInstrumentProfile(id)
  if (profile === undefined) throw new Error(`No built-in instrument ${id}.`)
  return profile
}

const C_KEYBOARD = instrument('c-keyboard')
const TENOR = instrument('bb-tenor')

/** Intent: the answer for a doodle under Jam's written key and Collection, on an instrument. */
function answer(
  doodle: QuantizedDoodle,
  tonalCenter: PitchClass,
  collection: Collection,
  profile = C_KEYBOARD,
): KeySuggestion {
  return suggestKeyAndMode(doodle, { tonalCenter, collection }, profile)
}

/** Intent: a suggested answer as "D Minor", or the answer's kind. */
function said(suggestion: KeySuggestion): string {
  return suggestion.kind === 'suggested'
    ? `${suggestion.tonalCenter} ${suggestion.collection}`
    : suggestion.kind
}

/** Six notes, five pitch classes, eight ticks of white keys: just enough of everything. */
const JUST_ENOUGH: readonly (readonly [number, number, number])[] = [
  [1, 1, 62],
  [2, 1, 64],
  [3, 1, 65],
  [4, 1, 67],
  [5, 1, 69],
  [6, 3, 62],
]

/** C D E G C off the beats (weight 8 each), then a C# of the given length. */
function withOutside(lengthTicks: number): QuantizedDoodle {
  return tickDoodle([
    [1, 4, 60],
    [5, 4, 62],
    [9, 4, 64],
    [13, 4, 67],
    [17, 4, 72],
    [21, lengthTicks, 61],
  ])
}

/** The twelve pitch classes up and down, a quarter each: no mode holds 80 % of it. */
const CHROMATIC = beatsDoodle([
  ...Array.from({ length: 12 }, (_, step) => [60 + step, 1] as const),
  [72, 1] as const,
])

// @test-link [[req_key_and_mode_suggestion]]
// @test-link [[rule_suggestion_candidates]]
describe("the research note's worked examples", () => {
  // @test-link [[rule_suggestion_candidates]]
  // @test-link [[rule_suggestion_named_in_players_family]]
  it('suggest D Dorian or D Minor for the D doodle under C Major, as its draw falls', () => {
    const doodle = beatsDoodle(WORKED_EXAMPLE)
    expect(['D Dorian', 'D Minor']).toContain(said(answer(doodle, 'C', 'Major')))
    expect(['D Dorian', 'D Aeolian']).toContain(said(answer(doodle, 'C', 'Ionian')))
  })

  // @test-link [[rule_suggestion_candidates]]
  it('suggest A Minor for harmonic minor, C Mixolydian for the bluesy doodle', () => {
    expect(said(answer(beatsDoodle(HARMONIC_MINOR), 'C', 'Major'))).toBe('A Minor')
    expect(said(answer(beatsDoodle(BLUESY), 'C', 'Major'))).toBe('C Mixolydian')
  })

  // @test-link [[rule_suggestion_candidates]]
  it('suggest one of the three kept for the doodle ending on E', () => {
    expect(['E Phrygian', 'E Locrian', 'D Dorian']).toContain(
      said(answer(beatsDoodle(ENDING_ON_E), 'C', 'Major')),
    )
  })

  // @test-link [[rule_suggestion_candidates]]
  it('name the same concert answer in written pitch on tenor saxophone, E for D', () => {
    const doodle = beatsDoodle(WORKED_EXAMPLE)
    const onKeyboard = answer(doodle, 'C', 'Major')
    const onTenor = answer(doodle, 'C', 'Major', TENOR)
    expect(onKeyboard.kind).toBe('suggested')
    expect(onTenor).toEqual({ ...onKeyboard, tonalCenter: 'E' })
  })
})

// @test-link [[rule_suggestion_withheld]]
describe("Jam's key and mode among the kept candidates", () => {
  // @test-link [[rule_suggestion_withheld]]
  it('gives nothing, Major compared as Ionian and Minor as Aeolian', () => {
    const doodle = beatsDoodle(WORKED_EXAMPLE)
    expect(said(answer(doodle, 'D', 'Dorian'))).toBe('nothing')
    expect(said(answer(doodle, 'D', 'Aeolian'))).toBe('nothing')
    expect(said(answer(doodle, 'D', 'Minor'))).toBe('nothing')
    expect(said(answer(doodle, 'D', 'Major'))).not.toBe('nothing')
    expect(said(answer(doodle, 'D', 'Ionian'))).not.toBe('nothing')
    expect(said(answer(beatsDoodle(HARMONIC_MINOR), 'A', 'Minor'))).toBe('nothing')
    expect(said(answer(beatsDoodle(HARMONIC_MINOR), 'A', 'Aeolian'))).toBe('nothing')
  })

  // @test-link [[rule_suggestion_withheld]]
  it('compares in concert pitch: written E Minor on tenor saxophone is concert D Aeolian', () => {
    const doodle = beatsDoodle(WORKED_EXAMPLE)
    expect(said(answer(doodle, 'E', 'Minor', TENOR))).toBe('nothing')
    expect(said(answer(doodle, 'D', 'Minor', TENOR))).not.toBe('nothing')
  })
})

// @test-link [[rule_doodle_outside_modes_told]]
// @test-link [[rule_suggestion_withheld]]
describe('no fit', () => {
  // @test-link [[rule_doodle_outside_modes_told]]
  it('is the answer under 80 % of the weighted length, and not at exactly 80 %', () => {
    expect(said(answer(withOutside(5), 'F#', 'Major'))).not.toMatch(/^(nothing|no_fit)$/)
    expect(said(answer(withOutside(6), 'F#', 'Major'))).toBe('no_fit')
  })

  // @test-link [[rule_doodle_outside_modes_told]]
  // @test-link [[rule_suggestion_withheld]]
  it('comes before Jam’s key and mode among the kept candidates, under every one (D452)', () => {
    const kept = keptCandidates(scorePairs(CHROMATIC))
    expect(kept.length).toBeGreaterThan(0)
    expect(fitsWell(CHROMATIC, kept[0]!)).toBe(false)
    const among = kept.map((pair) => `${PITCH_CLASSES[pair.homeNote]} ${pair.mode}`)
    expect(among.length).toBeGreaterThan(0)
    for (const tonalCenter of PITCH_CLASSES) {
      for (const collection of COLLECTIONS) {
        expect(said(answer(CHROMATIC, tonalCenter, collection))).toBe('no_fit')
        expect(said(answer(CHROMATIC, tonalCenter, collection, TENOR))).toBe('no_fit')
      }
    }
  })
})

// @test-link [[rule_suggestion_withheld]]
describe('too little material', () => {
  // @test-link [[rule_suggestion_withheld]]
  it('gives nothing one below each threshold, a suggestion at them', () => {
    expect(said(answer(tickDoodle(JUST_ENOUGH), 'F#', 'Major'))).not.toMatch(/^(nothing|no_fit)$/)
    const fourPitchClasses = JUST_ENOUGH.map(([start, length, pitch], index) =>
      index === 4 ? ([start, length, 62] as const) : ([start, length, pitch] as const),
    )
    expect(said(answer(tickDoodle(fourPitchClasses), 'F#', 'Major'))).toBe('nothing')
    const fiveNotes = [...JUST_ENOUGH.slice(0, 4), [5, 4, 69] as const]
    expect(said(answer(tickDoodle(fiveNotes), 'F#', 'Major'))).toBe('nothing')
    const sevenTicks = [...JUST_ENOUGH.slice(0, 5), [6, 2, 62] as const]
    expect(said(answer(tickDoodle(sevenTicks), 'F#', 'Major'))).toBe('nothing')
  })

  // @test-link [[rule_suggestion_withheld]]
  it('comes before no fit: a short chromatic run gives nothing', () => {
    const short = beatsDoodle([
      [60, 0.25],
      [61, 0.25],
      [62, 0.25],
      [63, 0.25],
      [64, 0.25],
      [65, 0.25],
    ])
    expect(said(answer(short, 'C', 'Major'))).toBe('nothing')
  })
})

// @test-link [[rule_suggestion_same_doodle_same_answer]]
describe('the same doodle', () => {
  // @test-link [[rule_suggestion_same_doodle_same_answer]]
  it('gives the same answer every run, rebuilt or not', () => {
    const doodle = beatsDoodle(ENDING_ON_E)
    const first = answer(doodle, 'C', 'Major')
    for (let run = 0; run < 20; run += 1) {
      expect(answer(doodle, 'C', 'Major')).toEqual(first)
      expect(answer(beatsDoodle(ENDING_ON_E), 'C', 'Major')).toEqual(first)
    }
    expect(Object.isFrozen(first)).toBe(true)
  })

  // @test-link [[rule_suggestion_same_doodle_same_answer]]
  it('does not transpose its drawn answer with the doodle, since the seed hashes concert pitch', () => {
    const doodle = beatsDoodle(ENDING_ON_E)
    const fifthUp = beatsDoodle(ENDING_ON_E.map(([pitch, beats]) => [pitch + 7, beats] as const))
    expect(keySuggestionSeed(fifthUp)).not.toBe(keySuggestionSeed(doodle))
  })
})

// @test-link [[rule_suggestion_same_doodle_same_answer]]
describe('the golden answers', () => {
  const golden = loadKeySuggestionGolden()

  // @test-link [[rule_suggestion_same_doodle_same_answer]]
  it('cover every kind of answer and more than one drawn candidate', () => {
    const kinds = new Set(golden.cases.map((each) => each.answer.kind))
    expect([...kinds].sort()).toEqual(['no_fit', 'nothing', 'suggested'])
    expect(golden.cases.some((each) => each.kept.length > 1)).toBe(true)
  })

  // @test-link [[rule_suggestion_same_doodle_same_answer]]
  it.each(golden.cases.map((each) => [each.label, each] as const))('%s', (_label, golden) => {
    expect(describeKeySuggestion(golden)).toEqual({
      seed: golden.seed,
      kept: golden.kept,
      answer: golden.answer,
    })
  })
})
