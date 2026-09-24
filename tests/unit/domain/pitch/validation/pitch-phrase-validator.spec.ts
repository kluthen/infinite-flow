import { describe, expect, it } from 'vitest'
import type { PitchPhrase } from '@/domain/pitch/pitch-types'
import {
  validatePitchMidis,
  validatePitchPhrase,
} from '@/domain/pitch/validation/pitch-phrase-validator'
import { BASELINE, QUARTERS, bar, chord, context, withMidis } from './validation-fixtures'

type Overrides = Parameters<typeof context>[0]

function failures(midis: readonly number[], overrides: Overrides = {}) {
  const result = validatePitchMidis(context(overrides), midis)
  return result.kind === 'valid_pitch_phrase' ? [] : result.failures
}

// @test-link [[module_pitch_domain_validation]]
describe('independent pitch phrase validation: shape and range', () => {
  it('returns the unchanged candidate when every rule holds', () => {
    const result = validatePitchMidis(context(), BASELINE)
    expect(result).toEqual({ kind: 'valid_pitch_phrase', candidate: BASELINE })
    expect(result.kind === 'valid_pitch_phrase' && result.candidate).toBe(BASELINE)
  })

  it('reports one MIDI value per sounding attack, including after ties and rests', () => {
    const bars = [bar(0, 'h ~:q r:q'), ...QUARTERS.slice(1)]
    expect(failures(BASELINE, { bars })).toEqual([{ code: 'attack_count_mismatch' }])
  })

  it('rejects non-integer MIDI values', () => {
    expect(failures(withMidis({ 2: 64.5 }))).toEqual([{ code: 'invalid_midi', attackIndex: 2 }])
  })

  it('rejects pitches outside the resolved register window', () => {
    expect(failures(BASELINE, { window: [61, 79] })).toEqual([
      { code: 'outside_register_window', attackIndex: 0 },
      { code: 'outside_register_window', attackIndex: 8 },
    ])
  })

  it('finds harmony by absolute beat when an event spans bar lines', () => {
    expect(failures(BASELINE, { events: [chord(1, 0, 16)] })).toEqual([])
  })

  it('fails loudly when the harmony leaves a sounding attack uncovered', () => {
    expect(() => failures(BASELINE, { events: [chord(1, 0, 12)] })).toThrow(/uncovered/)
  })

  it('reads only assignment MIDI values from a planned phrase and returns it unchanged', () => {
    const phrase = {
      kind: 'pitch_phrase',
      assignments: BASELINE.map((midi) => ({
        attack: {},
        candidate: { midi, role: 'appoggiatura' },
      })),
    } as unknown as PitchPhrase
    const result = validatePitchPhrase(context(), phrase)
    expect(result.kind === 'valid_pitch_phrase' && result.candidate).toBe(phrase)
    expect(validatePitchPhrase(context(), phrase)).toEqual(result)
  })
})

// @test-link [[rule_leapiness_arpeggio_run_limits]]
describe('independent pitch phrase validation: intervals, runs, and recovery', () => {
  const RUN_WITH_FIRST_LARGE_LEAP = [60, 67, 72, 71, 72, 71, 72, 67, 65, 64, 62, 60, 62, 64, 65, 67]

  it('enforces the adjacent interval cap and leap budgets', () => {
    const leap = withMidis({ 1: 65, 2: 64 })
    expect(failures(leap, { leapiness: 'Smooth' })).toEqual([
      { code: 'unexplained_non_chord_tone', attackIndex: 1 },
      { code: 'interval_cap_exceeded', attackIndex: 1 },
      { code: 'leap_budget_exceeded', attackIndex: 1 },
    ])
    expect(failures(RUN_WITH_FIRST_LARGE_LEAP, { leapiness: 'Shaped' })).toContainEqual({
      code: 'leap_budget_exceeded',
      attackIndex: 7,
    })
  })

  // @test-link [[rule_leap_recovery]]
  it('requires a large leap to recover on the next note by a contrary move of 1-4 semitones', () => {
    const recovered = withMidis({ 1: 67, 2: 65, 3: 64 })
    expect(failures(recovered, { leapiness: 'Shaped' })).toEqual([])
    const unrecovered = withMidis({ 1: 67, 2: 69, 3: 67 })
    expect(failures(unrecovered)).toEqual([{ code: 'unrecovered_large_leap', attackIndex: 1 }])
  })

  // @test-link [[rule_leap_recovery]]
  it('never lets the final sounding note carry recovery debt', () => {
    expect(failures(withMidis({ 13: 62, 14: 60, 15: 67 }))).toEqual([
      { code: 'unrecovered_large_leap', attackIndex: 15 },
    ])
  })

  // @test-link [[rule_leap_recovery]]
  it('defers recovery to after a recognized run only where the level permits it', () => {
    expect(failures(RUN_WITH_FIRST_LARGE_LEAP, { leapiness: 'Leaping' })).toEqual([])
    expect(failures(RUN_WITH_FIRST_LARGE_LEAP, { leapiness: 'Shaped' })).toContainEqual({
      code: 'unrecovered_large_leap',
      attackIndex: 1,
    })
  })

  it('treats a single chord-tone skip as ordinary motion and a three-note run as one run', () => {
    expect(failures(withMidis({ 1: 64, 2: 67, 3: 64 }), { leapiness: 'Smooth' })).toEqual([])
    expect(failures(withMidis({ 3: 67 }), { leapiness: 'Smooth' })).toEqual([])
  })

  it('rejects two wide same-direction intervals that do not form a recognized run', () => {
    const events = [chord(1, 0, 2), chord(6, 2, 2), chord(1, 4, 12)]
    expect(failures(withMidis({ 1: 64, 2: 69, 3: 64 }), { events })).toEqual([
      { code: 'unrecognized_wide_chain', attackIndex: 2 },
    ])
  })

  it('rejects any chain of three wide same-direction intervals', () => {
    expect(failures(withMidis({ 1: 64, 2: 67, 3: 72 }))).toEqual([
      { code: 'wide_chain_too_long', attackIndex: 3 },
    ])
  })

  it('enforces phrase run budgets per level', () => {
    const twoRuns = [60, 64, 67, 65, 64, 62, 60, 62, 60, 64, 67, 65, 64, 65, 67, 67]
    expect(failures(twoRuns, { leapiness: 'Leaping' })).toEqual([
      { code: 'arpeggio_run_budget_exceeded', attackIndex: 8 },
    ])
    expect(failures(twoRuns, { leapiness: 'Angular' })).toEqual([])
  })

  it('limits Angular to one run per measure, counted in the bar of its first note', () => {
    const sameBar = [60, 64, 67, 64, 60, 62, 64, 62, 60, 62, 64, 62, 64, 65, 67, 67]
    const events = [chord(1, 0, 16)]
    expect(failures(sameBar, { leapiness: 'Angular', contour: 'Rising', events })).toEqual([
      { code: 'arpeggio_run_budget_exceeded', attackIndex: 2 },
    ])
  })
})

// @test-link [[module_pitch_domain_validation]]
describe('independent pitch phrase validation: contour and open endpoint', () => {
  it('checks the selected contour on reconstructed checkpoints', () => {
    expect(failures(BASELINE, { contour: 'Rising' })).toEqual([{ code: 'contour_violation' }])
    expect(failures(BASELINE, { contour: 'Arch' })).toEqual([{ code: 'contour_violation' }])
  })

  it("falls back to a bar's first fresh attack at any tick when it has no beat-1/beat-3 attack", () => {
    // Bar 1 has no attack on tick 0 or 8 (both are rests), so its checkpoint falls back to its
    // first fresh attack, tick 4 (index 4). Picking the tick-12 attack (index 5) instead would
    // break Rising (index 5's 67 exceeds bar 2's checkpoint, 64), so this proves tick 4 is used.
    const bars = [QUARTERS[0]!, bar(1, 'r:q q r:q q'), ...QUARTERS.slice(2)]
    const midis = [60, 64, 60, 64, 64, 67, 64, 64, 67, 64, 67, 64, 67, 67]
    expect(failures(midis, { bars, contour: 'Rising' })).toEqual([])
  })

  it("uses the later fresh attack when a bar's tick-0 anchor is only a tie continuation", () => {
    // Bar 0's last note ties into bar 1's tick 0, so bar 1 has no fresh attack at tick 0 or 8; its
    // checkpoint falls back to its first fresh attack, tick 4 (index 3). Picking the tick-12
    // attack (index 4, 67) instead would break Rising against bar 2's checkpoint (64), proving
    // the tick-4 attack, not the tied-over tick 0, is used.
    const bars = [bar(0, 'q q h'), bar(1, '~:q q r:q q'), QUARTERS[2]!, QUARTERS[3]!]
    const midis = [60, 64, 64, 64, 67, 64, 67, 64, 67, 67, 64, 67, 67]
    expect(failures(midis, { bars, contour: 'Rising' })).toEqual([])
  })

  it("uses a bar's tick-8 anchor over an earlier tick-4 attack", () => {
    // Bar 1 has fresh attacks at tick 4 and tick 8; tick 8 is the anchor and must win even though
    // tick 4 comes first. Setting the tick-4 attack (index 4, 67) higher than bar 2's checkpoint
    // (64) would break Rising if it were wrongly used, proving the tick-8 attack (index 5) wins.
    const bars = [QUARTERS[0]!, bar(1, 'r:q q q q'), QUARTERS[2]!, QUARTERS[3]!]
    const midis = [60, 64, 64, 64, 67, 64, 67, 64, 67, 64, 67, 67, 64, 67, 67]
    expect(failures(midis, { bars, contour: 'Rising' })).toEqual([])
  })

  it('reports missing_contour_checkpoint only when a bar has no fresh attack at all', () => {
    // Bar 1 is a whole-bar tie continuation of bar 0's note, so it has no fresh attack at any tick.
    const bars = [bar(0, 'w'), bar(1, '~:w'), QUARTERS[2]!, QUARTERS[3]!]
    const midis = [60, 64, 64, 64, 64, 67, 67, 67, 67]
    expect(failures(midis, { bars })).toEqual([{ code: 'missing_contour_checkpoint' }])
  })

  it('applies the static, modal, and tonal open endpoints to the final sounding attack', () => {
    const endsOnE = withMidis({ 15: 64 })
    expect(failures(endsOnE)).toEqual([{ code: 'open_endpoint_violation', attackIndex: 15 }])
    expect(failures(endsOnE, { endpoint: 'modal_non_tonic_chord_tone' })).toEqual([])
    const endsOnC = withMidis({ 13: 62, 14: 60, 15: 60 })
    expect(failures(endsOnC, { endpoint: 'modal_non_tonic_chord_tone' })).toEqual([
      { code: 'open_endpoint_violation', attackIndex: 15 },
    ])
    const dominant = [chord(1, 0, 12), chord(5, 12, 4)]
    const endsOnDominant = withMidis({ 11: 65, 12: 67, 13: 69, 14: 71, 15: 67 })
    expect(
      failures(endsOnDominant, { endpoint: 'tonal_degree_five_chord_tone', events: dominant }),
    ).toEqual([])
    expect(failures(BASELINE, { endpoint: 'tonal_degree_five_chord_tone' })).toEqual([
      { code: 'open_endpoint_violation', attackIndex: 15 },
    ])
  })

  it('ignores a trailing rest when finding the final sounding attack', () => {
    const bars = [...QUARTERS.slice(0, 3), bar(3, 'q q q r:q')]
    expect(failures(BASELINE.slice(0, 15), { bars })).toEqual([])
  })
})
