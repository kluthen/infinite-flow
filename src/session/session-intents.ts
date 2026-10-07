/**
 * How the session builds the intent of each generation attempt: from the settings in effect when
 * the request is built (the chosen ones, frozen at start, until a change at a phrase boundary),
 * with the note density resolved at that moment (and the session's step-down memory updated from
 * it), and for a standalone attempt with its register given explicitly: the window the session
 * already resolved, so a Varying register is resolved once per session, or Varying after a change
 * to it, so the window is resolved again.
 */

import { makeGenerationControls } from '../domain/controls/generation-controls'
import { resolveGeneratedNoteDensity } from '../domain/controls/generated-note-density'
import { deepFreeze } from '../domain/events/deep-freeze'
import type { CarryIn } from '../domain/generation/carry-in/carry-in'
import { makeCarryInGenerationIntent } from '../domain/generation/carry-in/carry-in-intent'
import { makeGenerationIntent, type GenerationIntent } from '../domain/generation/generation-intent'
import type { RegisterId } from '../domain/profile/register-id'
import type { RegisterChoice } from '../domain/profile/register-intent'
import type { RegisterWindowCandidate } from '../domain/profile/register-window-derivation'
import {
  SessionEngineError,
  type SessionEngineDependencies,
  type SessionSettings,
} from './session-types'

/** The seams an attempt's intent reads: request identities and seeds, and the window width. */
// @spec-link [[service_session_engine]]
export type IntentSeams = Pick<SessionEngineDependencies, 'providers' | 'viewport'>

/**
 * What one attempt asks for: a carry-in attempt keeps the carry-in it is given; a standalone one
 * has none and fixes the register it is given.
 */
// @spec-link [[module_session_failure_ladder]]
// @spec-link [[rule_varying_register_once_per_session]]
export type AttemptPlan =
  | { readonly step: 'carry-in'; readonly carryIn: CarryIn }
  | { readonly step: 'standalone'; readonly register: RegisterChoice }

/** A built intent and the step-down memory after building it. */
// @spec-link [[rule_session_density_only_steps_down]]
// @spec-link [[module_session_density_step_down]]
export interface BuiltIntent {
  readonly intent: GenerationIntent
  readonly steppedDown: boolean
}

/**
 * Intent: an independent, deep-frozen copy of the chosen settings, so nothing the caller does to
 * its own objects after the start can reach the session. The controls are validated on the way.
 */
// @spec-link [[rule_session_settings_locked]]
export function freezeSessionSettings(settings: SessionSettings): SessionSettings {
  return deepFreeze({
    controls: makeGenerationControls(settings.controls),
    musicalProfile: {
      musicalProfile: settings.musicalProfile.musicalProfile,
      isCustom: settings.musicalProfile.isCustom,
    },
  })
}

/**
 * Intent: the register identity whose window is the carried window: the session's resolved
 * register, which a standalone retry keeps. No such window means the carry-in did not come from
 * this session's instrument, which is a caller bug.
 */
// @spec-link [[rule_varying_register_once_per_session]]
export function resolvedRegister(
  carryIn: CarryIn,
  candidates: readonly RegisterWindowCandidate[],
): RegisterId {
  const { minMidi, maxMidi } = carryIn.registerWindow
  const candidate = candidates.find(
    (entry) => entry.window.minMidi === minMidi && entry.window.maxMidi === maxMidi,
  )
  if (candidate === undefined)
    throw new SessionEngineError(
      `No register window of the instrument is the carried window ${minMidi}-${maxMidi}.`,
    )
  return candidate.id
}

/**
 * Intent: build one attempt's intent from the settings in effect with a fresh request id and seed.
 * The note density comes from the density in effect, the window reading now and the step-down
 * memory; building it as Eighth for a Sixteenth in effect sets the memory, whatever the attempt's
 * fate. A carry-in attempt keeps its carry-in; a standalone one drops it and fixes its register.
 */
// @spec-link [[rule_session_settings_locked]]
// @spec-link [[rule_session_density_only_steps_down]]
// @spec-link [[rule_varying_register_once_per_session]]
// @spec-link [[module_session_density_step_down]]
export function buildAttemptIntent(
  seams: IntentSeams,
  settings: SessionSettings,
  plan: AttemptPlan,
  steppedDown: boolean,
): BuiltIntent {
  const chosen = settings.controls
  const noteDensity = resolveGeneratedNoteDensity(chosen.noteDensity, {
    belowTabletLandscape: seams.viewport.isBelowTabletLandscape(),
    sessionSteppedDown: steppedDown,
  })
  const register = plan.step === 'standalone' ? plan.register : chosen.register
  const input = {
    requestId: seams.providers.nextRequestId(),
    seed: seams.providers.nextSeed(),
    controls: { ...chosen, noteDensity, register },
    musicalProfile: settings.musicalProfile,
  }
  const intent =
    plan.step === 'carry-in'
      ? makeCarryInGenerationIntent({ ...input, carryIn: plan.carryIn })
      : makeGenerationIntent(input)
  return { intent, steppedDown: steppedDown || noteDensity !== chosen.noteDensity }
}

/**
 * Intent: draw and discard the request id and seed of each skipped ladder rung, in the order
 * `buildAttemptIntent` draws them, so the attempt requested after the skip gets exactly the request
 * id and seed it would have had if those rungs had run and failed. The window is not read for them:
 * the attempt requested next reads it at the same moment, so the step-down memory ends the same.
 */
// @spec-link [[module_session_failure_ladder]]
export function discardSkippedRungs(seams: IntentSeams, skipped: number): void {
  for (let rung = 0; rung < skipped; rung += 1) {
    seams.providers.nextRequestId()
    seams.providers.nextSeed()
  }
}
