import { deepFreeze } from '../events/deep-freeze'
import { type GenerationControls, makeGenerationControls } from '../controls/generation-controls'
import type { ProfileSelection } from '../controls/profile-selection'
import { ADOPTED_INSTRUMENT_PROFILES } from '../profile/instrument-profiles'
import type { InstrumentProfile } from '../profile/instrument-profile'
import { buildRegisterIntent, type RegisterIntent } from '../profile/register-intent'
import type { Seed } from '../random/seed'
import {
  FOUR_FOUR_METER,
  PHRASE_MEASURE_COUNT,
  type Meter,
  type RequestId,
} from './generation-request'

/** The outer request accepted by Step 7 orchestration; its register intent may still be Varying. */
// @spec-link [[module_generation_request_construction]]
export interface GenerationIntent {
  readonly requestId: RequestId
  readonly seed: Seed
  readonly measureCount: 4
  readonly meter: Meter
  readonly controls: GenerationControls
  readonly musicalProfile: ProfileSelection
  readonly instrumentProfile: InstrumentProfile
  readonly registerIntent: RegisterIntent
}

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

/**
 * Create an immutable, serializable outer intent. This deliberately does not construct the
 * resolved GenerationRequest: fixed-register resolution and Varying feasibility are Step 7 work.
 */
// @spec-link [[module_generation_request_construction]]
export function makeGenerationIntent(input: GenerationIntentInput): GenerationIntent {
  const controls = makeGenerationControls(input.controls)
  const instrumentProfile = getInstrumentProfile(controls.instrumentProfileId)
  const registerIntent = buildRegisterIntent(instrumentProfile, controls.register)

  return deepFreeze({
    requestId: input.requestId,
    seed: input.seed,
    measureCount: PHRASE_MEASURE_COUNT as 4,
    meter: FOUR_FOUR_METER,
    controls,
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
export function regenerateGenerationIntent(
  previous: GenerationIntent,
  providers: GenerationIntentProviders,
): GenerationIntent {
  return makeGenerationIntent({
    requestId: providers.nextRequestId(),
    seed: providers.nextSeed(),
    controls: previous.controls,
    musicalProfile: previous.musicalProfile,
  })
}
