/**
 * How the session engine handles settings that change during a session, as pure functions: what
 * a look-ahead phrase's attempts are built from once its phrase before was generated under other
 * settings (the carry-in adapted, or a standalone generation), which attempt each ladder rung then
 * makes, whether a settings change is one the session accepts, and whether it discards the pending
 * look-ahead phrase or applies from the phrase after it.
 */

import type { CarryIn } from '../domain/generation/carry-in/carry-in'
import type { RegisterWindowCandidate } from '../domain/profile/register-window-derivation'
import { adaptCarryIn, type CarryInAdaptation } from './carry-in-adaptation'
import {
  openLookAhead,
  type LadderRung,
  type LookAhead,
  type LookAheadBasis,
} from './failure-ladder'
import { freezeSessionSettings, resolvedRegister, type AttemptPlan } from './session-intents'
import { measureSeconds } from './session-timing'
import {
  SessionEngineError,
  type AudioTime,
  type SessionDisplayReading,
  type SessionPhrase,
  type SessionSettings,
  type SettingsChangedOutput,
} from './session-types'

/** Intent: the instrument's register windows, as the phrase a look-ahead carries in from has them. */
// @spec-link [[rule_varying_register_once_per_session]]
export function registerCandidates(previous: SessionPhrase): readonly RegisterWindowCandidate[] {
  return previous.intent.registerIntent.candidates
}

/**
 * Intent: what a look-ahead phrase's attempts are built from: its carry-in as it is when the
 * settings in effect are those its phrase before was generated under, and otherwise the carry-in
 * adapted to the change, or a standalone generation when the adaptation leaves no carry-in.
 */
// @spec-link [[rule_setting_change_rechecks_pitch_carry_in]]
// @spec-link [[rule_key_change_drops_harmonic_carry_in]]
// @spec-link [[rule_register_change_replaces_carried_window]]
// @spec-link [[service_session_engine]]
export function lookAheadBasis(
  previous: SessionPhrase,
  previousSettings: SessionSettings,
  settings: SessionSettings,
  carryIn: CarryIn,
): LookAheadBasis {
  const source: CarryInAdaptation =
    settings === previousSettings
      ? { kind: 'carry-in', carryIn }
      : adaptCarryIn({
          carryIn,
          before: previousSettings,
          after: settings,
          candidates: registerCandidates(previous),
        })
  return { settings, previousSettings, source }
}

/**
 * Intent: a look-ahead opened again from the same phrase before and with the same deadline, its
 * attempts built from new settings, with no attempt in flight: a late result of the old one is
 * then a superseded attempt's.
 */
// @spec-link [[rule_session_change_applies_at_phrase_boundary]]
export function reopenedLookAhead(lookAhead: LookAhead, settings: SessionSettings): LookAhead {
  const { previous, carryIn, basis, deadline } = lookAhead
  return openLookAhead(
    previous,
    carryIn,
    lookAheadBasis(previous, basis.previousSettings, settings, carryIn),
    deadline,
  )
}

/**
 * Intent: the attempt one ladder rung makes for a look-ahead. With a carry-in source, a carry-in
 * rung keeps the (possibly adapted) carry-in and the standalone rung fixes the register whose
 * window it carries, so a Varying register stays resolved. With a standalone source every rung is
 * standalone, with the source's register: a fixed one, or Varying, resolved again.
 */
// @spec-link [[rule_session_generation_failure_ladder]]
// @spec-link [[rule_varying_register_once_per_session]]
// @spec-link [[rule_setting_change_rechecks_pitch_carry_in]]
export function attemptPlan(
  rung: LadderRung,
  source: CarryInAdaptation,
  candidates: readonly RegisterWindowCandidate[],
): AttemptPlan {
  if (source.kind === 'standalone') return { step: 'standalone', register: source.register }
  if (rung.step === 'carry-in') return { step: 'carry-in', carryIn: source.carryIn }
  return { step: 'standalone', register: resolvedRegister(source.carryIn, candidates) }
}

/**
 * Intent: the settings a settings change puts in effect, frozen: the instrument and the tempo
 * never change during a session (tempo has its own adaptive-tempo source), so a change to either
 * is a caller bug and throws.
 */
// @spec-link [[rule_session_settings_locked]]
// @spec-link [[service_session_engine]]
export function changedSettings(inEffect: SessionSettings, next: SessionSettings): SessionSettings {
  const settings = freezeSessionSettings(next)
  const { instrumentProfileId, tempo } = inEffect.controls
  if (settings.controls.instrumentProfileId !== instrumentProfileId)
    throw new SessionEngineError(
      `A settings change cannot change the instrument from ${instrumentProfileId} to ${settings.controls.instrumentProfileId}.`,
    )
  if (settings.controls.tempo !== tempo)
    throw new SessionEngineError(
      `A settings change cannot change the tempo from ${tempo} to ${settings.controls.tempo} BPM.`,
    )
  return settings
}

/**
 * Intent: whether a settings change at `at` discards the pending look-ahead phrase: only when at
 * least one measure remains before its deadline and none of it is on screen. The display is read
 * only when the time allows a discard.
 */
// @spec-link [[rule_session_change_applies_at_phrase_boundary]]
// @spec-link [[rule_look_ahead_deadline]]
export function discardsPendingPhrase(
  at: AudioTime,
  pending: LookAhead,
  tempo: number,
  display: SessionDisplayReading,
): boolean {
  if (pending.deadline - at < measureSeconds(tempo)) return false
  return !display.isPhraseOnScreen(pending.phraseNumber)
}

/** Intent: the output telling that settings from an automatic change apply from a phrase on. */
// @spec-link [[rule_session_change_applies_at_phrase_boundary]]
export function automaticChange(
  phraseNumber: number,
  settings: SessionSettings,
): SettingsChangedOutput {
  return { kind: 'settings-changed', phraseNumber, settings, cause: 'automatic' }
}
