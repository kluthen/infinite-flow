import { describe, expect, it } from 'vitest'

import {
  ADOPTED_INSTRUMENT_PROFILES,
  BB_TENOR_PROFILE,
  C_KEYBOARD_PROFILE,
  EB_ALTO_PROFILE,
} from '@/domain/profile/instrument-profiles'
import { deriveRegisterWindowCandidates } from '@/domain/profile/register-window-derivation'

// Literal expected values transcribed directly from the validated business rule
// (rule_instrument_profile_range), not computed with the derivation formula under test.
const EXPECTED_PROFILES = [
  {
    profile: C_KEYBOARD_PROFILE,
    id: 'c-keyboard',
    activeRange: { minMidi: 48, maxMidi: 72 },
    low: { minMidi: 48, maxMidi: 60 },
    middle: { minMidi: 54, maxMidi: 66 },
    high: { minMidi: 60, maxMidi: 72 },
  },
  {
    profile: BB_TENOR_PROFILE,
    id: 'bb-tenor',
    activeRange: { minMidi: 46, maxMidi: 70 },
    low: { minMidi: 46, maxMidi: 58 },
    middle: { minMidi: 52, maxMidi: 64 },
    high: { minMidi: 58, maxMidi: 70 },
  },
  {
    profile: EB_ALTO_PROFILE,
    id: 'eb-alto',
    activeRange: { minMidi: 51, maxMidi: 75 },
    low: { minMidi: 51, maxMidi: 63 },
    middle: { minMidi: 57, maxMidi: 69 },
    high: { minMidi: 63, maxMidi: 75 },
  },
] as const

// @test-link [[rule_instrument_profile_range]]
describe('adopted instrument profiles: exact ranges and windows', () => {
  it.each(EXPECTED_PROFILES)(
    '$id has the documented active concert range',
    ({ profile, id, activeRange }) => {
      expect(profile.id).toBe(id)
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
