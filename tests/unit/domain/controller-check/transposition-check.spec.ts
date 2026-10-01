import { describe, expect, it } from 'vitest'

import {
  checkWrittenNote,
  expectedConcertPitch,
  judgeTranspositionCheck,
} from '@/domain/controller-check/transposition-check'
import { makeInstrumentProfile, type InstrumentProfile } from '@/domain/profile/instrument-profile'
import {
  ADOPTED_INSTRUMENT_PROFILES,
  BB_TENOR_PROFILE,
  C_KEYBOARD_PROFILE,
  EB_ALTO_PROFILE,
} from '@/domain/profile/instrument-profiles'

// Literal values transcribed from the controller-connection handoff ("## Check result copy"):
// the six (current profile, d) pairs that suggest another profile, and nothing else does.
const SUGGESTION_TABLE: ReadonlyArray<readonly [InstrumentProfile, number, InstrumentProfile]> = [
  [BB_TENOR_PROFILE, 14, C_KEYBOARD_PROFILE],
  [BB_TENOR_PROFILE, 5, EB_ALTO_PROFILE],
  [EB_ALTO_PROFILE, 9, C_KEYBOARD_PROFILE],
  [EB_ALTO_PROFILE, -5, BB_TENOR_PROFILE],
  [C_KEYBOARD_PROFILE, -14, BB_TENOR_PROFILE],
  [C_KEYBOARD_PROFILE, -9, EB_ALTO_PROFILE],
]

const PROFILES = [C_KEYBOARD_PROFILE, BB_TENOR_PROFILE, EB_ALTO_PROFILE] as const
const OFFSETS = [0, 12, -12, 2, -2, 14, -14, 9, -9, 5, -5] as const

/** Intent: the profile the handoff table suggests for (profile, d), or null when it lists none. */
function tableSuggestion(profile: InstrumentProfile, offset: number): InstrumentProfile | null {
  const row = SUGGESTION_TABLE.find(([current, d]) => current === profile && d === offset)
  return row === undefined ? null : row[2]
}

const GRID = PROFILES.flatMap((profile) =>
  OFFSETS.map((offset) => ({ name: profile.displayName, profile, offset })),
)

// @test-link [[rule_controller_transposition_check]]
// @test-link [[entity_instrument_profile]]
describe('checkWrittenNote', () => {
  it('shows C4 (60) for the C MIDI keyboard and C5 (72) for both saxophones', () => {
    expect(checkWrittenNote(C_KEYBOARD_PROFILE)).toBe(60)
    expect(checkWrittenNote(BB_TENOR_PROFILE)).toBe(72)
    expect(checkWrittenNote(EB_ALTO_PROFILE)).toBe(72)
  })

  it('takes the lower C when the range middle is exactly between two Cs', () => {
    const profile = makeInstrumentProfile({
      id: 'tie-test',
      displayName: 'Tie test',
      concertRange: { minMidi: 54, maxMidi: 78 },
      registerWindows: {
        algorithm: C_KEYBOARD_PROFILE.registerWindows.algorithm,
        minimumSpan: 12,
        widthNumerator: 1,
        widthDenominator: 2,
      },
      transposition: { chromatic: 0, diatonic: 0 },
    })
    expect(checkWrittenNote(profile)).toBe(60)
  })

  it('throws when the nearest C falls outside the written range', () => {
    // A validated profile spans at least 24 semitones, so always holds that C; only a hand-built
    // profile that bypassed makeInstrumentProfile can reach this guard.
    const profile: InstrumentProfile = {
      ...C_KEYBOARD_PROFILE,
      concertRange: { kind: 'ActiveConcertRange', minMidi: 61, maxMidi: 71 },
    }
    expect(() => checkWrittenNote(profile)).toThrow(/outside/)
  })
})

// @test-link [[rule_controller_transposition_check]]
// @test-link [[entity_instrument_profile]]
describe('expectedConcertPitch', () => {
  it('subtracts the chromatic transposition from the written note', () => {
    expect(expectedConcertPitch(C_KEYBOARD_PROFILE, 60)).toBe(60)
    expect(expectedConcertPitch(BB_TENOR_PROFILE, 72)).toBe(58)
    expect(expectedConcertPitch(EB_ALTO_PROFILE, 72)).toBe(63)
  })
})

// @test-link [[rule_controller_transposition_check]]
// @test-link [[entity_instrument_profile]]
describe('judgeTranspositionCheck', () => {
  // @test-link [[rule_controller_transposition_check]]
  it.each(GRID)('$name, d = $offset', ({ profile, offset }) => {
    const expected = expectedConcertPitch(profile, checkWrittenNote(profile))
    const report = judgeTranspositionCheck(profile, expected + offset, ADOPTED_INSTRUMENT_PROFILES)
    if (offset === 0) {
      expect(report).toEqual({ kind: 'match' })
    } else if (offset % 12 === 0) {
      expect(report).toEqual({ kind: 'octaves', offset })
    } else {
      expect(report).toEqual({
        kind: 'semitones',
        offset,
        suggestedProfile: tableSuggestion(profile, offset),
      })
    }
  })

  it('suggests a profile for exactly the six handoff table rows', () => {
    const suggesting = GRID.filter(({ profile, offset }) => {
      const expected = expectedConcertPitch(profile, checkWrittenNote(profile))
      const report = judgeTranspositionCheck(
        profile,
        expected + offset,
        ADOPTED_INSTRUMENT_PROFILES,
      )
      return report.kind === 'semitones' && report.suggestedProfile !== null
    })
    expect(suggesting).toHaveLength(SUGGESTION_TABLE.length)
  })

  it('suggests only from the given profile list', () => {
    const played = 72 // B-flat tenor saxophone, written C5 sent untransposed: d = +14
    expect(judgeTranspositionCheck(BB_TENOR_PROFILE, played, ADOPTED_INSTRUMENT_PROFILES)).toEqual({
      kind: 'semitones',
      offset: 14,
      suggestedProfile: C_KEYBOARD_PROFILE,
    })
    expect(judgeTranspositionCheck(BB_TENOR_PROFILE, played, [BB_TENOR_PROFILE])).toEqual({
      kind: 'semitones',
      offset: 14,
      suggestedProfile: null,
    })
  })

  it.each([-1, 128, 60.5, Number.NaN])('rejects played pitch %s loudly', (played) => {
    expect(() =>
      judgeTranspositionCheck(C_KEYBOARD_PROFILE, played, ADOPTED_INSTRUMENT_PROFILES),
    ).toThrow(/played pitch/i)
  })
})
