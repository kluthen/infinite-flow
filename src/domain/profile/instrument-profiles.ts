/**
 * The single declarative table of first-release adopted instrument profiles: C MIDI keyboard,
 * B-flat tenor saxophone, and E-flat alto saxophone. Each active range and its derived Low/Middle/
 * High windows are the exact values rule_instrument_profile_range fixes as the validated business
 * contract — see the accompanying spec-linked tests for the literal expected values.
 *
 * This table is the one place a new instrument preset is declared: `BuiltInInstrumentProfileId`, the
 * validated `ADOPTED_INSTRUMENT_PROFILES` array, and `ADOPTED_INSTRUMENT_PROFILE_IDS` are all
 * derived from `FIRST_RELEASE_PROFILE_TABLE` below, so adding a profile is one entry in that array
 * plus its validation tests -- nothing else in the codebase hand-maintains a parallel id list. Each
 * entry's `displayName` is the player-facing instrument name; the UI option catalog
 * (`instrumentProfileOptions` in `src/components/controls/control-options.ts`) builds its labels
 * from that same field, so adding a profile needs no parallel UI label map either.
 */

import { deepFreeze } from '../events/deep-freeze'
import { type InstrumentProfile, makeInstrumentProfile } from './instrument-profile'
import { REGISTER_WINDOW_ALGORITHM_V1 } from './register-window-derivation'

/**
 * The register-window policy every instrument profile uses: the three built-ins and my instrument
 * alike, so a player-made profile's windows come from the same derivation as the built-ins'.
 */
// @spec-link [[entity_instrument_profile]]
// @spec-link [[entity_my_instrument]]
export const BUILT_IN_REGISTER_WINDOW_POLICY = {
  algorithm: REGISTER_WINDOW_ALGORITHM_V1,
  minimumSpan: 12,
  widthNumerator: 1,
  widthDenominator: 2,
} as const

/**
 * The declarative data for every first-release adopted instrument profile. Each entry's `id` is a
 * literal, so `BuiltInInstrumentProfileId` below is derived (not hand-written) from this array.
 */
// @spec-link [[entity_instrument_profile]]
const FIRST_RELEASE_PROFILE_TABLE = [
  {
    id: 'c-keyboard',
    displayName: 'C MIDI keyboard',
    concertRange: { minMidi: 48, maxMidi: 72 },
    transposition: { chromatic: 0, diatonic: 0 },
  },
  {
    id: 'bb-tenor',
    displayName: 'B-flat tenor saxophone',
    concertRange: { minMidi: 46, maxMidi: 70 },
    transposition: { chromatic: 14, diatonic: 8 },
  },
  {
    id: 'eb-alto',
    displayName: 'E-flat alto saxophone',
    concertRange: { minMidi: 51, maxMidi: 75 },
    transposition: { chromatic: 9, diatonic: 5 },
  },
] as const

/** The closed set of built-in instrument profile identities, derived from the table. */
// @spec-link [[entity_instrument_profile]]
export type BuiltInInstrumentProfileId = (typeof FIRST_RELEASE_PROFILE_TABLE)[number]['id']

/**
 * My instrument's fixed id: what saved settings, kept sessions and replay keys store for the
 * player-made instrument. It is never renamed and is never the display name.
 */
// @spec-link [[entity_my_instrument]]
export const MY_INSTRUMENT_ID = 'my-instrument' as const

/**
 * Every instrument profile identity the controls can name: the three built-ins, resolved from the
 * table, and my instrument, whose profile travels as data beside the controls.
 */
// @spec-link [[entity_my_instrument]]
export type InstrumentProfileId = BuiltInInstrumentProfileId | typeof MY_INSTRUMENT_ID

/** The complete, immutable set of first-release adopted instrument profiles, built from the table. */
// @spec-link [[rule_instrument_profile_range]]
export const ADOPTED_INSTRUMENT_PROFILES: readonly InstrumentProfile[] = deepFreeze(
  FIRST_RELEASE_PROFILE_TABLE.map((entry) =>
    makeInstrumentProfile({
      id: entry.id,
      displayName: entry.displayName,
      concertRange: entry.concertRange,
      registerWindows: BUILT_IN_REGISTER_WINDOW_POLICY,
      transposition: entry.transposition,
    }),
  ),
)

/** The complete, immutable set of first-release adopted identities, derived from the same table. */
// @spec-link [[entity_instrument_profile]]
export const ADOPTED_INSTRUMENT_PROFILE_IDS: readonly BuiltInInstrumentProfileId[] = deepFreeze(
  FIRST_RELEASE_PROFILE_TABLE.map((entry) => entry.id),
)

/** The C MIDI keyboard profile: active concert range 48-72, non-transposing. */
// @spec-link [[rule_instrument_profile_range]]
export const C_KEYBOARD_PROFILE: InstrumentProfile = ADOPTED_INSTRUMENT_PROFILES[0]!

/** The B-flat tenor saxophone profile: active concert range 46-70, written a major 9th above concert. */
// @spec-link [[rule_instrument_profile_range]]
export const BB_TENOR_PROFILE: InstrumentProfile = ADOPTED_INSTRUMENT_PROFILES[1]!

/** The E-flat alto saxophone profile: active concert range 51-75, written a major 6th above concert. */
// @spec-link [[rule_instrument_profile_range]]
export const EB_ALTO_PROFILE: InstrumentProfile = ADOPTED_INSTRUMENT_PROFILES[2]!

/** Intent: true when a value is one of the built-in instrument profile ids. */
// @spec-link [[entity_instrument_profile]]
export function isBuiltInInstrumentProfileId(value: unknown): value is BuiltInInstrumentProfileId {
  return ADOPTED_INSTRUMENT_PROFILE_IDS.includes(value as BuiltInInstrumentProfileId)
}

/** Intent: the built-in profile with this id, or nothing for an id that names no built-in. */
// @spec-link [[entity_instrument_profile]]
export function findBuiltInInstrumentProfile(id: string): InstrumentProfile | undefined {
  return ADOPTED_INSTRUMENT_PROFILES.find((profile) => profile.id === id)
}
