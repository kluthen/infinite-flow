/**
 * How the session builds the intent of each generation attempt: always from the settings frozen
 * at start, with the note density resolved at the moment the request is built (and the session's
 * step-down memory updated from it), and for a standalone retry with the register fixed to the
 * window the session already resolved, so a Varying register is resolved once per session.
 */

import { makeGenerationControls } from '../domain/controls/generation-controls'
import { resolveGeneratedNoteDensity } from '../domain/controls/generated-note-density'
import { deepFreeze } from '../domain/events/deep-freeze'
import type { CarryIn } from '../domain/generation/carry-in/carry-in'
import { makeGenerationIntent, type GenerationIntent } from '../domain/generation/generation-intent'
import type { RegisterId } from '../domain/profile/register-id'
import type { RegisterWindowCandidate } from '../domain/profile/register-window-derivation'
import {
  SessionEngineError,
  type SessionEngineDependencies,
  type SessionSettings,
} from './session-types'

/** Everything an attempt's intent is built from, besides what the ladder decides. */
// @spec-link [[service_session_engine]]
export interface IntentSeams extends SessionEngineDependencies {
  readonly settings: SessionSettings
}

/** What one attempt asks for: its ladder step, the carry-in it keeps, and the register windows. */
// @spec-link [[service_session_engine]]
export interface AttemptPlan {
  readonly step: 'carry-in' | 'standalone'
  /** The carry-in of the phrase before; a standalone attempt reads only its register window. */
  readonly carryIn: CarryIn
  /** The instrument's register windows, as the phrase before resolved them. */
  readonly candidates: readonly RegisterWindowCandidate[]
}

/** A built intent and the step-down memory after building it. */
// @spec-link [[rule_session_density_only_steps_down]]
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
 * Intent: build one attempt's intent from the frozen settings with a fresh request id and seed.
 * The note density comes from the chosen one, the window reading now and the step-down memory;
 * building it as Eighth for a chosen Sixteenth sets the memory, whatever the attempt's fate. A
 * carry-in attempt keeps the carry-in; a standalone one drops it and fixes the resolved register.
 */
// @spec-link [[rule_session_settings_locked]]
// @spec-link [[rule_session_density_only_steps_down]]
// @spec-link [[rule_varying_register_once_per_session]]
export function buildAttemptIntent(
  seams: IntentSeams,
  plan: AttemptPlan,
  steppedDown: boolean,
): BuiltIntent {
  const chosen = seams.settings.controls
  const noteDensity = resolveGeneratedNoteDensity(chosen.noteDensity, {
    belowTabletLandscape: seams.viewport.isBelowTabletLandscape(),
    sessionSteppedDown: steppedDown,
  })
  const standalone = plan.step === 'standalone'
  const register = standalone ? resolvedRegister(plan.carryIn, plan.candidates) : chosen.register
  const intent = makeGenerationIntent({
    requestId: seams.providers.nextRequestId(),
    seed: seams.providers.nextSeed(),
    controls: { ...chosen, noteDensity, register },
    musicalProfile: seams.settings.musicalProfile,
    ...(standalone ? {} : { carryIn: plan.carryIn }),
  })
  return { intent, steppedDown: steppedDown || noteDensity !== chosen.noteDensity }
}
