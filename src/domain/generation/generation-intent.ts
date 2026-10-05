import { deepFreeze } from '../events/deep-freeze'
import {
  PITCH_CLASSES,
  type GenerationControls,
  type PitchClass,
  makeGenerationControls,
} from '../controls/generation-controls'
import type { ProfileSelection } from '../controls/profile-selection'
import { ADOPTED_INSTRUMENT_PROFILES } from '../profile/instrument-profiles'
import type { InstrumentProfile } from '../profile/instrument-profile'
import { buildRegisterIntent, type RegisterIntent } from '../profile/register-intent'
import type { Seed } from '../random/seed'
import type { CarryIn } from './carry-in/carry-in'
import {
  FOUR_FOUR_METER,
  PHRASE_MEASURE_COUNT,
  type Meter,
  type RequestId,
} from './generation-request'

/**
 * The outer request accepted by Step 7 orchestration; its register intent may still be Varying.
 * `controls.tonalCenter` is always the concert-pitch tonal center the generator consumes;
 * `writtenTonalCenter` is the player's written-pitch selection it was converted from.
 */
// @spec-link [[module_generation_request_construction]]
export interface GenerationIntent {
  readonly requestId: RequestId
  readonly seed: Seed
  readonly measureCount: 4
  readonly meter: Meter
  readonly controls: GenerationControls
  readonly writtenTonalCenter: PitchClass
  readonly musicalProfile: ProfileSelection
  readonly instrumentProfile: InstrumentProfile
  readonly registerIntent: RegisterIntent
  /** What the session phrase before hands forward; absent for a phrase generated without one. */
  readonly carryIn?: CarryIn
}

/**
 * `controls.tonalCenter` here is the player's written-pitch selection, not concert pitch. It holds
 * no carry-in: an intent that receives one is built by `makeCarryInGenerationIntent`, which checks
 * the carry-in against the intent.
 */
export interface GenerationIntentInput {
  readonly requestId: RequestId
  readonly seed: Seed
  readonly controls: GenerationControls
  readonly musicalProfile: ProfileSelection
}

// @spec-link [[module_generation_request_construction]]
export class GenerationIntentError extends Error {
  readonly kind = 'GenerationIntentError' as const

  constructor(message: string) {
    super(message)
    this.name = 'GenerationIntentError'
  }
}

/** Resolve the selected identity through the adopted Step 3 declarative profile data. */
// @spec-link [[module_generation_request_construction]]
export function getInstrumentProfile(
  id: GenerationControls['instrumentProfileId'],
): InstrumentProfile {
  const profile = ADOPTED_INSTRUMENT_PROFILES.find((candidate) => candidate.id === id)
  if (profile === undefined) {
    throw new GenerationIntentError(`No adopted instrument profile exists for "${id}".`)
  }
  return profile
}

/** Intent: reduce an integer pitch-class arithmetic result into the closed 0..11 index range. */
function pcIndexMod12(value: number): number {
  return ((value % 12) + 12) % 12
}

/**
 * Convert a written tonal center into its concert-pitch equivalent for the given instrument's
 * chromatic transposition: concert pc = (written pc - chromatic) mod 12. Exported as the seam for
 * request construction: it takes a full `InstrumentProfile` value, not a closed adopted-profile id,
 * so a test-only profile (an open chromatic/diatonic pair no shipped preset uses) exercises this
 * exact conversion without widening `getInstrumentProfile`'s closed lookup or any UI/worker-boundary
 * type to accept arbitrary ids.
 */
// @spec-link [[module_generation_request_construction]]
// @spec-link [[rule_instrument_profile_range]]
export function writtenToConcertTonalCenter(
  writtenTonalCenter: PitchClass,
  instrumentProfile: InstrumentProfile,
): PitchClass {
  const writtenIndex = PITCH_CLASSES.indexOf(writtenTonalCenter)
  const concertIndex = pcIndexMod12(writtenIndex - instrumentProfile.transposition.chromatic)
  return PITCH_CLASSES[concertIndex]!
}

/**
 * Create an immutable, serializable outer intent without a carry-in: the intent has no `carryIn`
 * field at all. This deliberately does not construct the resolved GenerationRequest: fixed-register
 * resolution and Varying feasibility are Step 7 work. The caller's `controls.tonalCenter` is read
 * as the player's written-pitch selection and converted to concert pitch here; the generator
 * downstream only ever sees concert pitch. An input that still holds a carry-in is a caller bug
 * and is refused, never silently dropped: such an intent is built by `makeCarryInGenerationIntent`,
 * which checks the carry-in against it.
 */
// @spec-link [[module_generation_request_construction]]
export function makeGenerationIntent(input: GenerationIntentInput): GenerationIntent {
  if ('carryIn' in input && input.carryIn !== undefined) {
    throw new GenerationIntentError(
      'makeGenerationIntent builds an intent without a carry-in; use makeCarryInGenerationIntent.',
    )
  }
  const writtenControls = makeGenerationControls(input.controls)
  const instrumentProfile = getInstrumentProfile(writtenControls.instrumentProfileId)
  const writtenTonalCenter = writtenControls.tonalCenter
  const controls: GenerationControls = {
    ...writtenControls,
    tonalCenter: writtenToConcertTonalCenter(writtenTonalCenter, instrumentProfile),
  }
  const registerIntent = buildRegisterIntent(instrumentProfile, controls.register)

  return deepFreeze({
    requestId: input.requestId,
    seed: input.seed,
    measureCount: PHRASE_MEASURE_COUNT as 4,
    meter: FOUR_FOUR_METER,
    controls,
    writtenTonalCenter,
    musicalProfile: { ...input.musicalProfile },
    instrumentProfile,
    registerIntent,
  })
}

/** Injected identity and seed providers keep explicit generation deterministic and browser-independent. */
export interface GenerationIntentProviders {
  readonly nextRequestId: () => RequestId
  readonly nextSeed: () => Seed
}

/** Explicit generation consumes the caller's supplied identity and seed. */
// @spec-link [[module_generation_request_construction]]
export function createGenerationIntent(input: GenerationIntentInput): GenerationIntent {
  return makeGenerationIntent(input)
}

/** Regeneration retains active controls/profile grammar and obtains a fresh injected seed and identity. */
// @spec-link [[module_generation_request_construction]]
// @spec-link [[rule_seeded_phrase_reproduction]]
export function regenerateGenerationIntent(
  previous: GenerationIntent,
  providers: GenerationIntentProviders,
): GenerationIntent {
  return makeGenerationIntent({
    requestId: providers.nextRequestId(),
    seed: providers.nextSeed(),
    controls: { ...previous.controls, tonalCenter: previous.writtenTonalCenter },
    musicalProfile: previous.musicalProfile,
  })
}
