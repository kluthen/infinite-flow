/**
 * The three first-release adopted instrument profiles, validated at module load: C MIDI keyboard,
 * B-flat tenor saxophone, and E-flat alto saxophone. Each active range and its derived Low/Middle/
 * High windows are the exact values rule_instrument_profile_range fixes as the validated business
 * contract — see the accompanying spec-linked tests for the literal expected values.
 */

import { deepFreeze } from '../events/deep-freeze'
import { type InstrumentProfile, makeInstrumentProfile } from './instrument-profile'
import { REGISTER_WINDOW_ALGORITHM_V1 } from './register-window-derivation'

const FIRST_RELEASE_REGISTER_WINDOW_POLICY = {
  algorithm: REGISTER_WINDOW_ALGORITHM_V1,
  minimumSpan: 12,
  widthNumerator: 1,
  widthDenominator: 2,
} as const

/** The C MIDI keyboard profile: active concert range 48-72. */
// @spec-link [[rule_instrument_profile_range]]
export const C_KEYBOARD_PROFILE: InstrumentProfile = makeInstrumentProfile({
  id: 'c-keyboard',
  concertRange: { minMidi: 48, maxMidi: 72 },
  registerWindows: FIRST_RELEASE_REGISTER_WINDOW_POLICY,
})

/** The B-flat tenor saxophone profile: active concert range 46-70. */
// @spec-link [[rule_instrument_profile_range]]
export const BB_TENOR_PROFILE: InstrumentProfile = makeInstrumentProfile({
  id: 'bb-tenor',
  concertRange: { minMidi: 46, maxMidi: 70 },
  registerWindows: FIRST_RELEASE_REGISTER_WINDOW_POLICY,
})

/** The E-flat alto saxophone profile: active concert range 51-75. */
// @spec-link [[rule_instrument_profile_range]]
export const EB_ALTO_PROFILE: InstrumentProfile = makeInstrumentProfile({
  id: 'eb-alto',
  concertRange: { minMidi: 51, maxMidi: 75 },
  registerWindows: FIRST_RELEASE_REGISTER_WINDOW_POLICY,
})

/** The complete, immutable set of first-release adopted instrument profiles. */
// @spec-link [[rule_instrument_profile_range]]
export const ADOPTED_INSTRUMENT_PROFILES: readonly InstrumentProfile[] = deepFreeze([
  C_KEYBOARD_PROFILE,
  BB_TENOR_PROFILE,
  EB_ALTO_PROFILE,
])
