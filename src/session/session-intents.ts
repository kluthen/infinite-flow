/**
 * How the session builds the intent of each generation attempt: from the settings in effect when
 * the request is built (the chosen ones, frozen at start, until a change at a phrase boundary),
 * with the note density resolved at that moment (and the session's step-down memory updated from
 * it), and for a standalone attempt with its register given explicitly: the window the session
 * already resolved, so a Varying register is resolved once per session, or Varying after a change
 * to it, so the window is resolved again. Each attempt's seed is its rung's seed in the session
 * seed plan; only its request id is drawn.
 */

import { makeGenerationControls } from '../domain/controls/generation-controls'
import { resolveGeneratedNoteDensity } from '../domain/controls/generated-note-density'
import { deepFreeze } from '../domain/events/deep-freeze'
import type { CarryIn } from '../domain/generation/carry-in/carry-in'
import { makeCarryInGenerationIntent } from '../domain/generation/carry-in/carry-in-intent'
import {
  makeGenerationIntent,
  resolveInstrumentProfile,
  type GenerationIntent,
} from '../domain/generation/generation-intent'
import {
  FIGURE_IDS,
  levelsForProfile,
  type FigureId,
  type FigureLevels,
} from '../domain/figures/figure-levels'
import type { InstrumentProfile } from '../domain/profile/instrument-profile'
import { MY_INSTRUMENT_ID } from '../domain/profile/instrument-profiles'
import type { RegisterId } from '../domain/profile/register-id'
import type { RegisterChoice } from '../domain/profile/register-intent'
import type { RegisterWindowCandidate } from '../domain/profile/register-window-derivation'
import type { Seed } from '../domain/random/seed'
import { phraseAttemptSeed } from './session-seed-plan'
import {
  SessionEngineError,
  type SessionEngineDependencies,
  type SessionSettings,
} from './session-types'

/**
 * What an attempt's intent reads besides its settings: the request identities, the window width
 * and the session seed its seed is derived from.
 */
// @spec-link [[service_session_engine]]
// @spec-link [[module_session_seed_plan]]
export interface IntentSeams extends Pick<SessionEngineDependencies, 'providers' | 'viewport'> {
  readonly sessionSeed: Seed
}

/** Where an attempt stands: its phrase's number and its rung's index on the failure ladder. */
// @spec-link [[module_session_seed_plan]]
export interface AttemptSlot {
  readonly phraseNumber: number
  readonly rung: number
}

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
 * Intent: the profile the settings' instrument has: my instrument's, carried as data, or a
 * built-in's, resolved from its id. Settings naming my instrument without its profile, or a
 * built-in with one, are refused as a GenerationIntentError, as an intent built from them would be.
 */
// @spec-link [[entity_my_instrument]]
// @spec-link [[service_session_engine]]
export function sessionInstrumentProfile(settings: SessionSettings): InstrumentProfile {
  return resolveInstrumentProfile(settings.controls.instrumentProfileId, settings.instrumentProfile)
}

/**
 * Intent: the figure levels the settings generate with: until presets replace it, the levels of
 * the settings' musical profile through `levelsForProfile`, whatever its customized mark, as the
 * intent factory maps them.
 */
// @spec-link [[module_session_carry_in_after_change]]
// @spec-link [[rule_stale_phrase_prompt_at_start]]
export function sessionFigureLevels(settings: SessionSettings): FigureLevels {
  return levelsForProfile(settings.musicalProfile.musicalProfile)
}

/**
 * Intent: every figure whose level differs between the two settings' levels, in FIGURE_IDS order;
 * none when the levels are equal, as after a change of the customized mark alone.
 */
// @spec-link [[module_session_carry_in_after_change]]
// @spec-link [[rule_stale_phrase_prompt_at_start]]
export function figuresWithChangedLevels(
  before: SessionSettings,
  after: SessionSettings,
): readonly FigureId[] {
  const was = sessionFigureLevels(before)
  const is = sessionFigureLevels(after)
  return FIGURE_IDS.filter((figure) => was[figure] !== is[figure])
}

/**
 * Intent: the settings' profile as an intent input takes it: my instrument's profile when the
 * settings carry one, nothing for a built-in, which the intent resolves from its id.
 */
function suppliedProfileOf(
  settings: SessionSettings,
): { readonly instrumentProfile: InstrumentProfile } | Record<string, never> {
  return settings.instrumentProfile === undefined
    ? {}
    : { instrumentProfile: settings.instrumentProfile }
}

/**
 * Intent: an independent, deep-frozen copy of the chosen settings, so nothing the caller does to
 * its own objects after the start can reach the session. The controls are validated on the way,
 * and my instrument's profile, when the settings carry it, is kept: settings whose profile does
 * not match their instrument are refused.
 */
// @spec-link [[rule_session_settings_locked]]
// @spec-link [[entity_my_instrument]]
export function freezeSessionSettings(settings: SessionSettings): SessionSettings {
  const controls = makeGenerationControls(settings.controls)
  sessionInstrumentProfile({ ...settings, controls })
  return deepFreeze({
    controls,
    musicalProfile: {
      musicalProfile: settings.musicalProfile.musicalProfile,
      isCustom: settings.musicalProfile.isCustom,
    },
    ...suppliedProfileOf(settings),
  })
}

/**
 * Intent: the settings a session starts with: the chosen controls and musical profile, and, when
 * the controls name my instrument, its profile as phrase 1's intent embeds it, so the session
 * generates with the very profile phrase 1 was generated with.
 */
// @spec-link [[service_session_engine]]
// @spec-link [[entity_my_instrument]]
export function sessionSettingsAtStart(
  chosen: Pick<SessionSettings, 'controls' | 'musicalProfile'>,
  phraseOne: GenerationIntent,
): SessionSettings {
  const mine = chosen.controls.instrumentProfileId === MY_INSTRUMENT_ID
  return {
    controls: chosen.controls,
    musicalProfile: chosen.musicalProfile,
    ...(mine ? { instrumentProfile: phraseOne.instrumentProfile } : {}),
  }
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
 * Intent: build one attempt's intent from the settings in effect with a fresh request id and the
 * seed the session seed plan gives its slot (its phrase and rung), whatever ran before it. The
 * note density comes from the density in effect, the window reading now and the step-down memory;
 * building it as Eighth for a Sixteenth in effect sets the memory, whatever the attempt's fate. A
 * carry-in attempt keeps its carry-in; a standalone one drops it and fixes its register. My
 * instrument's profile, carried by the settings, goes into every attempt as data.
 */
// @spec-link [[rule_session_settings_locked]]
// @spec-link [[rule_session_density_only_steps_down]]
// @spec-link [[rule_varying_register_once_per_session]]
// @spec-link [[module_session_density_step_down]]
// @spec-link [[module_session_seed_plan]]
// @spec-link [[entity_my_instrument]]
export function buildAttemptIntent(
  seams: IntentSeams,
  settings: SessionSettings,
  plan: AttemptPlan,
  steppedDown: boolean,
  slot: AttemptSlot,
): BuiltIntent {
  const chosen = settings.controls
  const noteDensity = resolveGeneratedNoteDensity(chosen.noteDensity, {
    belowTabletLandscape: seams.viewport.isBelowTabletLandscape(),
    sessionSteppedDown: steppedDown,
  })
  const register = plan.step === 'standalone' ? plan.register : chosen.register
  const input = {
    requestId: seams.providers.nextRequestId(),
    seed: phraseAttemptSeed(seams.sessionSeed, slot.phraseNumber, slot.rung),
    controls: { ...chosen, noteDensity, register },
    musicalProfile: settings.musicalProfile,
    ...suppliedProfileOf(settings),
  }
  const intent =
    plan.step === 'carry-in'
      ? makeCarryInGenerationIntent({ ...input, carryIn: plan.carryIn })
      : makeGenerationIntent(input)
  return { intent, steppedDown: steppedDown || noteDensity !== chosen.noteDensity }
}

/**
 * Intent: draw and discard the request id of each skipped ladder rung, so the attempt requested
 * after the skip gets exactly the request id it would have had if those rungs had run and failed.
 * No seed is drawn: a skipped rung's planned seed is simply unused and shifts no other seed. The
 * window is not read for them: the attempt requested next reads it at the same moment, so the
 * step-down memory ends the same.
 */
// @spec-link [[module_session_failure_ladder]]
// @spec-link [[module_session_seed_plan]]
export function discardSkippedRungs(seams: IntentSeams, skipped: number): void {
  for (let rung = 0; rung < skipped; rung += 1) seams.providers.nextRequestId()
}
