import { deepFreeze } from '../events/deep-freeze'
import {
  PITCH_CLASSES,
  type GenerationControls,
  type PitchClass,
  makeGenerationControls,
} from '../controls/generation-controls'
import { parseFigureLevels, type FigureLevels } from '../figures/figure-levels'
import {
  MY_INSTRUMENT_ID,
  findBuiltInInstrumentProfile,
  isBuiltInInstrumentProfileId,
} from '../profile/instrument-profiles'
import type { InstrumentProfile } from '../profile/instrument-profile'
import { buildRegisterIntent, type RegisterIntent } from '../profile/register-intent'
import type { Seed } from '../random/seed'
import type { CarryIn } from './carry-in/carry-in'
import {
  FOUR_FOUR_METER,
  PHRASE_MEASURE_COUNT,
  type Meter,
  type RequestId,
} from './generation-request-envelope'

/**
 * The outer request accepted by Step 7 orchestration; its register intent may still be Varying.
 * `controls.tonalCenter` is always the concert-pitch tonal center the generator consumes;
 * `writtenTonalCenter` is the player's written-pitch selection it was converted from.
 * `figureLevels` are the seven figure levels the generator may read what it writes from. The
 * intent holds no musical profile.
 */
// @spec-link [[module_generation_request_construction]]
// @spec-link [[module_figure_levels]]
export interface GenerationIntent {
  readonly requestId: RequestId
  readonly seed: Seed
  readonly measureCount: 4
  readonly meter: Meter
  readonly controls: GenerationControls
  readonly writtenTonalCenter: PitchClass
  readonly figureLevels: FigureLevels
  readonly instrumentProfile: InstrumentProfile
  readonly registerIntent: RegisterIntent
  /** What the session phrase before hands forward; absent for a phrase generated without one. */
  readonly carryIn?: CarryIn
}

/**
 * What the intent factory takes. `controls.tonalCenter` here is the player's written-pitch
 * selection, not concert pitch. `figureLevels` are the seven figure levels the intent holds. It
 * holds no carry-in: an intent that receives one is built by `makeCarryInGenerationIntent`, which
 * checks the carry-in against the intent. `instrumentProfile` is my instrument's profile, given as
 * data exactly when the controls name `my-instrument`; a built-in is resolved from its id.
 */
// @spec-link [[module_generation_request_construction]]
// @spec-link [[module_figure_levels]]
// @spec-link [[entity_my_instrument]]
export interface GenerationIntentInput {
  readonly requestId: RequestId
  readonly seed: Seed
  readonly controls: GenerationControls
  readonly figureLevels: FigureLevels
  readonly instrumentProfile?: InstrumentProfile
}

// @spec-link [[module_generation_request_construction]]
export class GenerationIntentError extends Error {
  readonly kind = 'GenerationIntentError' as const

  constructor(message: string) {
    super(message)
    this.name = 'GenerationIntentError'
  }
}

/**
 * Resolve a built-in identity through the declarative built-in profile table. My instrument has
 * no table entry: its profile travels as data, so looking it up by id alone is refused.
 */
// @spec-link [[module_generation_request_construction]]
export function getInstrumentProfile(
  id: GenerationControls['instrumentProfileId'],
): InstrumentProfile {
  if (id === MY_INSTRUMENT_ID) {
    throw new GenerationIntentError(
      `"${MY_INSTRUMENT_ID}" has no built-in profile to look up: its profile travels as data beside the controls.`,
    )
  }
  const profile = findBuiltInInstrumentProfile(id)
  if (profile === undefined) {
    throw new GenerationIntentError(`No adopted instrument profile exists for "${id}".`)
  }
  return profile
}

/**
 * Intent: the instrument profile an intent embeds. A built-in id resolves from the built-in table
 * and refuses a supplied profile; `my-instrument` requires the supplied profile, whose id must be
 * `my-instrument`. Every refusal is a GenerationIntentError; nothing is ever substituted.
 */
// @spec-link [[entity_my_instrument]]
// @spec-link [[module_generation_request_construction]]
export function resolveInstrumentProfile(
  id: GenerationControls['instrumentProfileId'],
  supplied: InstrumentProfile | undefined,
): InstrumentProfile {
  if (id === MY_INSTRUMENT_ID) {
    if (supplied === undefined) {
      throw new GenerationIntentError(
        `The controls name "${MY_INSTRUMENT_ID}" but no my-instrument profile was given.`,
      )
    }
    if (supplied.id !== MY_INSTRUMENT_ID) {
      throw new GenerationIntentError(
        `The controls name "${MY_INSTRUMENT_ID}" but the profile given is "${supplied.id}".`,
      )
    }
    return supplied
  }
  if (supplied !== undefined) {
    throw new GenerationIntentError(
      `The controls name the built-in "${id}"; a supplied profile ("${supplied.id}") is refused.`,
    )
  }
  if (!isBuiltInInstrumentProfileId(id)) {
    throw new GenerationIntentError(`No adopted instrument profile exists for "${id}".`)
  }
  return getInstrumentProfile(id)
}

/**
 * Intent: the profile of the instrument `id` names, as the screen shows and checks it: my
 * instrument's own, given as data, or a built-in's from the table. Naming my instrument while none
 * exists is a caller defect and throws a GenerationIntentError, as resolving its intent would.
 */
// @spec-link [[entity_my_instrument]]
export function selectedInstrumentProfile(
  id: GenerationControls['instrumentProfileId'],
  myInstrument: { readonly profile: InstrumentProfile } | null,
): InstrumentProfile {
  return resolveInstrumentProfile(id, id === MY_INSTRUMENT_ID ? myInstrument?.profile : undefined)
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
 * downstream only ever sees concert pitch. The embedded instrument profile comes from
 * `resolveInstrumentProfile`: the built-in table for a built-in id, the supplied profile for
 * `my-instrument`. An input that still holds a carry-in is a caller bug and is refused, never
 * silently dropped: such an intent is built by `makeCarryInGenerationIntent`, which checks the
 * carry-in against it. The figure levels are a fresh frozen copy of the input's own, keys in
 * FIGURE_IDS order (an invalid value is refused as a FigureLevelsError).
 */
// @spec-link [[module_generation_request_construction]]
export function makeGenerationIntent(input: GenerationIntentInput): GenerationIntent {
  if ('carryIn' in input && input.carryIn !== undefined) {
    throw new GenerationIntentError(
      'makeGenerationIntent builds an intent without a carry-in; use makeCarryInGenerationIntent.',
    )
  }
  const writtenControls = makeGenerationControls(input.controls)
  const instrumentProfile = resolveInstrumentProfile(
    writtenControls.instrumentProfileId,
    input.instrumentProfile,
  )
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
    figureLevels: parseFigureLevels(input.figureLevels),
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

/**
 * Regeneration retains the active controls and figure levels and obtains a fresh injected seed and
 * identity. My instrument's profile is handed on as data, since its id alone resolves nothing; a
 * built-in is resolved from its id again.
 */
// @spec-link [[module_generation_request_construction]]
// @spec-link [[rule_seeded_phrase_reproduction]]
// @spec-link [[entity_my_instrument]]
export function regenerateGenerationIntent(
  previous: GenerationIntent,
  providers: GenerationIntentProviders,
): GenerationIntent {
  const suppliedProfile =
    previous.controls.instrumentProfileId === MY_INSTRUMENT_ID
      ? { instrumentProfile: previous.instrumentProfile }
      : {}
  return makeGenerationIntent({
    requestId: providers.nextRequestId(),
    seed: providers.nextSeed(),
    controls: { ...previous.controls, tonalCenter: previous.writtenTonalCenter },
    figureLevels: previous.figureLevels,
    ...suppliedProfile,
  })
}
