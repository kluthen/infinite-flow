/**
 * The session engine's state between events, as immutable values: what is fixed for the whole
 * session, what changes from event to event, and the small accessors and transitions over it that
 * more than one kind of event needs.
 */

import type { AdaptiveTempoSchedule } from './adaptive-tempo'
import type { LookAhead } from './failure-ladder'
import type { IntentSeams } from './session-intents'
import {
  SessionEngineError,
  type AudioTime,
  type SessionDisplayReading,
  type SessionOutput,
  type SessionPhrase,
  type SessionSettings,
} from './session-types'
import type { SettingsMutationFlag } from './settings-mutation'
import type { StrugglingNotice } from './struggling-notice'

/** Everything fixed for the whole session: the seams, the mutation flag and phrase 1. */
// @spec-link [[service_session_engine]]
// @spec-link [[req_settings_mutation_flag]]
export interface EngineContext extends IntentSeams {
  readonly display: SessionDisplayReading
  readonly mutation: SettingsMutationFlag
  readonly phraseOne: SessionPhrase
}

/**
 * A decided phrase not yet sounding, kept so a settings change can discard it: the look-ahead it
 * was decided from (its phrase before, deadline and basis) and the notice before its decision.
 */
// @spec-link [[rule_session_change_applies_at_phrase_boundary]]
export interface DecidedPhrase {
  readonly lookAhead: LookAhead
  readonly notice: StrugglingNotice
}

/**
 * The engine's tempo state: the adaptive-tempo schedule, and the tempo fixed for phrases 1, 2, ...
 * in order, phrase 1's being the starting tempo. It is never part of the settings in effect, which
 * keep the starting tempo, so no intent ever sees it.
 */
// @spec-link [[service_session_engine]]
// @spec-link [[rule_tempo_never_affects_generation]]
export interface SessionTempo {
  readonly schedule: AdaptiveTempoSchedule
  readonly fixed: readonly number[]
}

/**
 * The engine's state between events. `settings` are the settings in effect; `lastDecided` is the
 * latest decided phrase (phrase 1 at start), generated under `lastDecidedSettings` (a repeat's are
 * those of the phrase it repeats); `lookAhead` is the phrase after it while undecided, and
 * `decided` its record once decided until it starts sounding; `soundedCount` is how many phrases
 * have started sounding; `tempo` is the adaptive-tempo schedule and each phrase's fixed tempo,
 * kept apart from the settings.
 */
// @spec-link [[service_session_engine]]
// @spec-link [[rule_session_change_applies_at_phrase_boundary]]
export interface EngineState {
  readonly phase: 'count-in' | 'running' | 'ended'
  readonly lastAt: AudioTime
  readonly soundedCount: number
  readonly settings: SessionSettings
  readonly lastDecided: SessionPhrase
  readonly lastDecidedSettings: SessionSettings
  readonly lookAhead: LookAhead | undefined
  readonly decided: DecidedPhrase | undefined
  readonly steppedDown: boolean
  readonly notice: StrugglingNotice
  readonly nextAttemptId: number
  readonly tempo: SessionTempo
}

/** A new state and the outputs that produced it. */
// @spec-link [[service_session_engine]]
export interface Step {
  readonly state: EngineState
  readonly outputs: readonly SessionOutput[]
}

/** Intent: the look-ahead of a state, which the caller has established exists. */
// @spec-link [[service_session_engine]]
export function lookAheadOf(state: EngineState): LookAhead {
  if (state.lookAhead === undefined)
    throw new SessionEngineError('No phrase is being looked ahead.')
  return state.lookAhead
}

/** Intent: the decided phrase not yet sounding, which the caller has established exists. */
// @spec-link [[rule_session_change_applies_at_phrase_boundary]]
export function decidedOf(state: EngineState): DecidedPhrase {
  if (state.decided === undefined)
    throw new SessionEngineError('No phrase is waiting to start sounding.')
  return state.decided
}

/**
 * Intent: take back the decision of the phrase not yet sounding, as if it was never decided: the
 * phrase before is the latest decided again, with its settings, and the notice is as it was.
 */
// @spec-link [[rule_session_change_applies_at_phrase_boundary]]
// @spec-link [[rule_struggling_generator_notice]]
export function undecide(state: EngineState): EngineState {
  const { lookAhead, notice } = decidedOf(state)
  return {
    ...state,
    lastDecided: lookAhead.previous,
    lastDecidedSettings: lookAhead.basis.previousSettings,
    decided: undefined,
    notice,
  }
}
