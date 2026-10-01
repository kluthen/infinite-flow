import { describe, expect, it } from 'vitest'

import {
  checkWrittenNote,
  expectedConcertPitch,
  judgeTranspositionCheck,
} from '@/domain/controller-check/transposition-check'
import { transpositionCheckCopy } from '@/domain/controller-check/transposition-check-copy'
import type { InstrumentProfile } from '@/domain/profile/instrument-profile'
import {
  ADOPTED_INSTRUMENT_PROFILES,
  BB_TENOR_PROFILE,
  C_KEYBOARD_PROFILE,
  EB_ALTO_PROFILE,
} from '@/domain/profile/instrument-profiles'

// Literal wording transcribed from the controller-connection handoff ("## Check result copy").
// Per offset d: distance wording, direction, opposite direction, and which setting to change.
const OFFSET_WORDING: ReadonlyArray<readonly [number, string, string, string, string]> = [
  [12, '1 octave', 'higher', 'lower', 'octave'],
  [-12, '1 octave', 'lower', 'higher', 'octave'],
  [2, '2 semitones', 'higher', 'lower', 'transpose'],
  [-2, '2 semitones', 'lower', 'higher', 'transpose'],
  [14, '14 semitones (1 octave and 2)', 'higher', 'lower', 'transpose'],
  [-14, '14 semitones (1 octave and 2)', 'lower', 'higher', 'transpose'],
  [9, '9 semitones', 'higher', 'lower', 'transpose'],
  [-9, '9 semitones', 'lower', 'higher', 'transpose'],
  [5, '5 semitones', 'higher', 'lower', 'transpose'],
  [-5, '5 semitones', 'lower', 'higher', 'transpose'],
]

// The six handoff table rows, as (current profile name, d, suggested profile name).
const SUGGESTION_ROWS: ReadonlyArray<readonly [string, number, string]> = [
  ['B-flat tenor saxophone', 14, 'C MIDI keyboard'],
  ['B-flat tenor saxophone', 5, 'E-flat alto saxophone'],
  ['E-flat alto saxophone', 9, 'C MIDI keyboard'],
  ['E-flat alto saxophone', -5, 'B-flat tenor saxophone'],
  ['C MIDI keyboard', -14, 'B-flat tenor saxophone'],
  ['C MIDI keyboard', -9, 'E-flat alto saxophone'],
]

const PROFILES: ReadonlyArray<readonly [InstrumentProfile, string]> = [
  [C_KEYBOARD_PROFILE, 'C MIDI keyboard'],
  [BB_TENOR_PROFILE, 'B-flat tenor saxophone'],
  [EB_ALTO_PROFILE, 'E-flat alto saxophone'],
]

/** Intent: the copy the check produces when the controller plays `offset` away from expected. */
function copyFor(profile: InstrumentProfile, offset: number) {
  const played = expectedConcertPitch(profile, checkWrittenNote(profile)) + offset
  return transpositionCheckCopy(
    judgeTranspositionCheck(profile, played, ADOPTED_INSTRUMENT_PROFILES),
    profile,
  )
}

const MISMATCH_GRID = PROFILES.flatMap(([profile, name]) =>
  OFFSET_WORDING.map(([offset, distance, direction, opposite, setting]) => {
    const row = SUGGESTION_ROWS.find(([current, d]) => current === name && d === offset)
    return { profile, name, offset, distance, direction, opposite, setting, other: row?.[2] }
  }),
)

// @test-link [[rule_controller_transposition_check]]
describe('transpositionCheckCopy', () => {
  it.each(PROFILES)('uses the handoff name for %s', (profile, name) => {
    expect(profile.displayName).toBe(name)
  })

  // @test-link [[rule_controller_transposition_check]]
  it.each(PROFILES.map(([profile, name]) => ({ profile, name })))(
    '$name, d = 0: match copy',
    ({ profile, name }) => {
      expect(copyFor(profile, 0)).toEqual({
        result: `Your controller matches the ${name} profile.`,
        suggestion: "Nothing to change — you're ready to play.",
        profileSuggestion: null,
      })
    },
  )

  // @test-link [[rule_controller_transposition_check]]
  it.each(MISMATCH_GRID)(
    '$name, d = $offset',
    ({ profile, name, offset, distance, direction, opposite, setting, other }) => {
      expect(copyFor(profile, offset)).toEqual({
        result: `Your controller sounds ${distance} ${direction} than the ${name} profile expects.`,
        suggestion: `Change your controller's ${setting} setting so it plays ${distance} ${opposite}, then run the check again.`,
        profileSuggestion:
          other === undefined
            ? null
            : `If you actually play the ${other}, choose the ${other} instrument profile instead — no controller change needed.`,
      })
    },
  )

  it('reproduces the handoff worked example verbatim', () => {
    expect(
      transpositionCheckCopy(
        judgeTranspositionCheck(BB_TENOR_PROFILE, 72, ADOPTED_INSTRUMENT_PROFILES),
        BB_TENOR_PROFILE,
      ),
    ).toEqual({
      result:
        'Your controller sounds 14 semitones (1 octave and 2) higher than the B-flat tenor saxophone profile expects.',
      suggestion:
        "Change your controller's transpose setting so it plays 14 semitones (1 octave and 2) lower, then run the check again.",
      profileSuggestion:
        'If you actually play the C MIDI keyboard, choose the C MIDI keyboard instrument profile instead — no controller change needed.',
    })
  })

  it('uses the singular for one semitone and one octave, and plural octaves beyond', () => {
    expect(copyFor(C_KEYBOARD_PROFILE, 1).result).toBe(
      'Your controller sounds 1 semitone higher than the C MIDI keyboard profile expects.',
    )
    expect(copyFor(C_KEYBOARD_PROFILE, -1).suggestion).toBe(
      "Change your controller's transpose setting so it plays 1 semitone higher, then run the check again.",
    )
    expect(copyFor(C_KEYBOARD_PROFILE, 24).result).toBe(
      'Your controller sounds 2 octaves higher than the C MIDI keyboard profile expects.',
    )
    expect(copyFor(C_KEYBOARD_PROFILE, 13).result).toBe(
      'Your controller sounds 13 semitones (1 octave and 1) higher than the C MIDI keyboard profile expects.',
    )
    expect(copyFor(C_KEYBOARD_PROFILE, -27).result).toBe(
      'Your controller sounds 27 semitones (2 octaves and 3) lower than the C MIDI keyboard profile expects.',
    )
  })
})
