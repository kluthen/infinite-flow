/**
 * Adapting a carry-in to settings that changed between the phrase it comes from and the phrase it
 * feeds, so that building the receiving phrase's intent never refuses it. A register change
 * replaces the carried window (a change to Varying drops the carry-in instead), a key or
 * collection change drops the harmonic part, as does any harmony setting change after which the
 * carried chord no longer fits, and the pitch part is then re-checked against the new window and
 * collection. A pitch part that no longer fits leaves no carry-in: the phrase is generated
 * standalone with the session's register pinned. The fit checks are the very predicates the
 * intent's own carry-in check uses, so the two can never disagree. Pure: it reads no clock and
 * holds no state.
 */

import type { GenerationControls } from '../domain/controls/generation-controls'
import { makeCarryIn, type CarryIn } from '../domain/generation/carry-in/carry-in'
import {
  carriedDebtProblem,
  carriedHarmonyFits,
  type CarryInReceiver,
} from '../domain/generation/carry-in/carry-in-fit'
import { writtenToConcertTonalCenter } from '../domain/generation/generation-intent'
import { deepFreeze } from '../domain/events/deep-freeze'
import type { CarriedHarmony } from '../domain/harmony/harmony-join'
import type { RegisterId } from '../domain/profile/register-id'
import type { RegisterChoice } from '../domain/profile/register-intent'
import type { RegisterWindowCandidate } from '../domain/profile/register-window-derivation'
import { registerWindowContainsPitch, type RegisterWindow } from '../domain/profile/register-window'
import { resolvedRegister, sessionInstrumentProfile } from './session-intents'
import { SessionEngineError, type SessionSettings } from './session-types'

/**
 * What the receiving phrase is generated from: a carry-in (unchanged, or with its harmony dropped
 * and/or its window replaced), or no carry-in at all, standalone with this register pinned. The
 * register is Varying only after a change to Varying, whose window is then resolved again.
 */
// @spec-link [[rule_register_change_replaces_carried_window]]
// @spec-link [[rule_setting_change_rechecks_pitch_carry_in]]
export type CarryInAdaptation =
  | { readonly kind: 'carry-in'; readonly carryIn: CarryIn }
  | { readonly kind: 'standalone'; readonly register: RegisterChoice }

/** What an adaptation reads: the carry-in, the settings on both sides, the instrument's windows. */
// @spec-link [[rule_setting_change_rechecks_pitch_carry_in]]
export interface CarryInAdaptationInput {
  readonly carryIn: CarryIn
  /** The settings the carry-in's phrase was generated under. */
  readonly before: SessionSettings
  /** The settings in effect for the receiving phrase. */
  readonly after: SessionSettings
  /** The session instrument's register windows. */
  readonly candidates: readonly RegisterWindowCandidate[]
}

/** The controls that fix the collection: a change to either drops the harmonic part outright. */
const KEY_CONTROLS = [
  'tonalCenter',
  'collection',
] as const satisfies readonly (keyof GenerationControls)[]

/**
 * The controls the harmony-fit check reads, the key among them; it also reads the musical profile.
 * Tempo, note density, rhythm, syncopation, silence, contour, leapiness and arpeggio chaos never
 * matter here.
 */
const HARMONY_CONTROLS = [
  ...KEY_CONTROLS,
  'harmonicMotion',
  'tension',
] as const satisfies readonly (keyof GenerationControls)[]

/** Intent: true when any of the given controls differs between the two settings. */
function controlsDiffer(
  before: SessionSettings,
  after: SessionSettings,
  keys: readonly (keyof GenerationControls)[],
): boolean {
  return keys.some((key) => before.controls[key] !== after.controls[key])
}

/** Intent: true when a setting the harmony-fit check reads differs between the two settings. */
// @spec-link [[rule_harmony_change_drops_unfit_harmonic_carry_in]]
function harmonySettingsDiffer(before: SessionSettings, after: SessionSettings): boolean {
  return (
    controlsDiffer(before, after, HARMONY_CONTROLS) ||
    before.musicalProfile.musicalProfile !== after.musicalProfile.musicalProfile
  )
}

/**
 * Intent: the receiving side of the fit checks for the new settings, built as the intent builds
 * it: the written tonal center converted to concert pitch for the session's instrument, my
 * instrument's transposition read from the profile the settings carry.
 */
// @spec-link [[entity_my_instrument]]
function receiverFor(after: SessionSettings): Pick<CarryInReceiver, 'controls' | 'musicalProfile'> {
  const instrument = sessionInstrumentProfile(after)
  return {
    controls: {
      ...after.controls,
      tonalCenter: writtenToConcertTonalCenter(after.controls.tonalCenter, instrument),
    },
    musicalProfile: after.musicalProfile,
  }
}

/** Intent: the window of a fixed register; a register missing from the windows is a caller bug. */
// @spec-link [[rule_register_change_replaces_carried_window]]
function registerWindowOf(
  register: RegisterId,
  candidates: readonly RegisterWindowCandidate[],
): RegisterWindow {
  const candidate = candidates.find((entry) => entry.id === register)
  if (candidate === undefined)
    throw new SessionEngineError(`The instrument's register windows have no ${register} window.`)
  return candidate.window
}

/**
 * Intent: the carried harmony kept for the new settings: dropped after a key or collection change,
 * and dropped when the new harmony settings never end a phrase on that chord and endpoint class.
 */
// @spec-link [[rule_key_change_drops_harmonic_carry_in]]
// @spec-link [[rule_harmony_change_drops_unfit_harmonic_carry_in]]
function adaptedHarmony(
  input: CarryInAdaptationInput,
  receiver: Pick<CarryInReceiver, 'controls' | 'musicalProfile'>,
): CarriedHarmony | null {
  const harmony = input.carryIn.finalHarmony
  if (harmony === null || controlsDiffer(input.before, input.after, KEY_CONTROLS)) return null
  return carriedHarmonyFits(harmony, receiver) ? harmony : null
}

/**
 * Intent: true when the carried pitch lies inside the window and whatever it owes (a tense note
 * while a chord is carried, a leap recovery) can be settled under the new settings.
 */
// @spec-link [[rule_setting_change_rechecks_pitch_carry_in]]
function pitchPartFits(adapted: CarryIn, receiver: Pick<CarryInReceiver, 'controls'>): boolean {
  return (
    registerWindowContainsPitch(adapted.registerWindow, adapted.lastPitch.midi) &&
    carriedDebtProblem(adapted, receiver) === null
  )
}

/**
 * Intent: adapt a carry-in to the settings of the phrase it feeds. Unchanged when no relevant
 * setting changed (the same object comes back); standalone with Varying after a change to Varying;
 * otherwise the window becomes the new register's, the harmony is dropped when the key or
 * collection changed or it no longer fits, and the pitch part is re-checked. A pitch part that no
 * longer fits gives a standalone phrase pinned to the new fixed register, or to the session's
 * resolved register when Varying stays selected. Refuses settings for two different instruments.
 */
// @spec-link [[rule_key_change_drops_harmonic_carry_in]]
// @spec-link [[rule_harmony_change_drops_unfit_harmonic_carry_in]]
// @spec-link [[rule_setting_change_rechecks_pitch_carry_in]]
// @spec-link [[rule_register_change_replaces_carried_window]]
// @spec-link [[rule_varying_register_once_per_session]]
// @spec-link [[entity_phrase_carry_in]]
export function adaptCarryIn(input: CarryInAdaptationInput): CarryInAdaptation {
  const { carryIn, before, after, candidates } = input
  if (before.controls.instrumentProfileId !== after.controls.instrumentProfileId)
    throw new SessionEngineError(
      `A session keeps its instrument: ${before.controls.instrumentProfileId} cannot become ${after.controls.instrumentProfileId}.`,
    )
  const afterRegister = after.controls.register
  const registerChanged = before.controls.register !== afterRegister
  if (!registerChanged && !harmonySettingsDiffer(before, after))
    return deepFreeze<CarryInAdaptation>({ kind: 'carry-in', carryIn })
  if (registerChanged && afterRegister === 'Varying')
    return deepFreeze<CarryInAdaptation>({ kind: 'standalone', register: 'Varying' })
  const receiver = receiverFor(after)
  const adapted: CarryIn = {
    lastPitch: carryIn.lastPitch,
    registerWindow:
      registerChanged && afterRegister !== 'Varying'
        ? registerWindowOf(afterRegister, candidates)
        : carryIn.registerWindow,
    finalHarmony: adaptedHarmony(input, receiver),
    phraseNumber: carryIn.phraseNumber,
  }
  if (!pitchPartFits(adapted, receiver))
    return deepFreeze<CarryInAdaptation>({
      kind: 'standalone',
      register: afterRegister === 'Varying' ? resolvedRegister(carryIn, candidates) : afterRegister,
    })
  return deepFreeze<CarryInAdaptation>({ kind: 'carry-in', carryIn: makeCarryIn(adapted) })
}
