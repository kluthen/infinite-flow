import { describe, expect, it } from 'vitest'

import {
  ADOPTED_INSTRUMENT_PROFILE_IDS,
  ADOPTED_INSTRUMENT_PROFILES,
  BB_TENOR_PROFILE,
  C_KEYBOARD_PROFILE,
  EB_ALTO_PROFILE,
} from '@/domain/profile/instrument-profiles'
import { INSTRUMENT_PROFILE_IDS } from '@/domain/controls/generation-controls'
import { instrumentProfileOptions } from '@/components/controls/control-options'
import { deriveRegisterWindowCandidates } from '@/domain/profile/register-window-derivation'

// Literal expected values transcribed directly from the validated business rule
// (rule_instrument_profile_range), not computed with the derivation formula under test.
const EXPECTED_PROFILES = [
  {
    profile: C_KEYBOARD_PROFILE,
    id: 'c-keyboard',
    displayName: 'C MIDI keyboard',
    activeRange: { minMidi: 48, maxMidi: 72 },
    low: { minMidi: 48, maxMidi: 60 },
    middle: { minMidi: 54, maxMidi: 66 },
    high: { minMidi: 60, maxMidi: 72 },
  },
  {
    profile: BB_TENOR_PROFILE,
    id: 'bb-tenor',
    displayName: 'B-flat tenor saxophone',
    activeRange: { minMidi: 46, maxMidi: 70 },
    low: { minMidi: 46, maxMidi: 58 },
    middle: { minMidi: 52, maxMidi: 64 },
    high: { minMidi: 58, maxMidi: 70 },
  },
  {
    profile: EB_ALTO_PROFILE,
    id: 'eb-alto',
    displayName: 'E-flat alto saxophone',
    activeRange: { minMidi: 51, maxMidi: 75 },
    low: { minMidi: 51, maxMidi: 63 },
    middle: { minMidi: 57, maxMidi: 69 },
    high: { minMidi: 63, maxMidi: 75 },
  },
] as const

// @test-link [[rule_instrument_profile_range]]
describe('adopted instrument profiles: exact ranges and windows', () => {
  it.each(EXPECTED_PROFILES)(
    '$id has the documented active concert range and display name',
    ({ profile, id, displayName, activeRange }) => {
      expect(profile.id).toBe(id)
      expect(profile.displayName).toBe(displayName)
      expect(profile.concertRange.minMidi).toBe(activeRange.minMidi)
      expect(profile.concertRange.maxMidi).toBe(activeRange.maxMidi)
    },
  )
})

// @test-link [[rule_instrument_profile_range]]
describe('adopted instrument profiles: exact derived windows', () => {
  it.each(EXPECTED_PROFILES)(
    '$id derives the documented Low/Middle/High windows',
    ({ profile, low, middle, high }) => {
      const [derivedLow, derivedMiddle, derivedHigh] = deriveRegisterWindowCandidates(
        profile.concertRange,
        profile.registerWindows,
      )

      expect(derivedLow?.window).toMatchObject(low)
      expect(derivedMiddle?.window).toMatchObject(middle)
      expect(derivedHigh?.window).toMatchObject(high)
    },
  )
})

// @test-link [[rule_instrument_profile_range]]
describe('adopted instrument profiles: canonical registered set', () => {
  it('contains exactly the three adopted profiles in id order', () => {
    expect(ADOPTED_INSTRUMENT_PROFILES.map((profile) => profile.id)).toEqual([
      'c-keyboard',
      'bb-tenor',
      'eb-alto',
    ])
  })

  it('is deep-frozen and cannot be mutated', () => {
    expect(() => {
      // @ts-expect-error the adopted profile list is readonly
      ADOPTED_INSTRUMENT_PROFILES.push(C_KEYBOARD_PROFILE)
    }).toThrow()
  })
})

/**
 * Open transposition (Definition of Done, first-release-master-spec.md): adding an instrument
 * profile is one declarative entry in FIRST_RELEASE_PROFILE_TABLE. These tests demonstrate that
 * property by proving every downstream id list/option set is *derived* from the same table rather
 * than hand-maintained: every id in the derived id list resolves to a validated profile, and the
 * control catalog / UI option list are exactly that same derived list, in the same order.
 */
// @test-link [[entity_instrument_profile]]
describe('adopted instrument profiles: one declarative entry drives every id list', () => {
  it('every id in ADOPTED_INSTRUMENT_PROFILE_IDS has exactly one adopted profile, in the same order', () => {
    expect(ADOPTED_INSTRUMENT_PROFILES.map((profile) => profile.id)).toEqual([
      ...ADOPTED_INSTRUMENT_PROFILE_IDS,
    ])
  })

  it('the control catalog id list is exactly the table-derived id list', () => {
    expect([...INSTRUMENT_PROFILE_IDS]).toEqual([...ADOPTED_INSTRUMENT_PROFILE_IDS])
  })

  it('the UI instrument-profile options are exactly the table-derived id list, in order', () => {
    expect(instrumentProfileOptions().map((option) => option.value)).toEqual([
      ...ADOPTED_INSTRUMENT_PROFILE_IDS,
    ])
  })

  it("the UI instrument-profile options' labels come from each profile's own displayName, not a parallel map", () => {
    expect(instrumentProfileOptions().map((option) => option.label)).toEqual(
      ADOPTED_INSTRUMENT_PROFILES.map((profile) => profile.displayName),
    )
  })
})
