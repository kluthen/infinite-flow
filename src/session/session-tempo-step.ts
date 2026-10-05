/**
 * Where the session engine meets the adaptive-tempo schedule: the tempo state the engine keeps
 * (the schedule and the tempo fixed for each phrase so far), fixing the pending phrase's tempo
 * once its look-ahead deadline has passed, counting a phrase that starts sounding, the controller
 * event, and the tempo a given phrase plays at. Tempo is kept apart from the settings in effect,
 * which keep the starting tempo, so it never reaches an intent.
 */

import {
  controllerPresence,
  nextPhraseTempo,
  phraseStartedSounding,
  startAdaptiveTempo,
} from './adaptive-tempo'
import { decidedOf, type EngineState, type SessionTempo, type Step } from './session-engine-state'
import { deadlineReached } from './session-timing'
import { SessionEngineError, type AudioTime, type SessionSettings } from './session-types'

/**
 * Intent: the tempo state at a session's start: phrase 1 fixed at the chosen settings' tempo, the
 * starting tempo, and the schedule running only when the start says adaptive tempo runs.
 */
// @spec-link [[module_session_adaptive_tempo_schedule]]
// @spec-link [[rule_tempo_never_affects_generation]]
export function startSessionTempo(settings: SessionSettings, adaptiveTempo: boolean): SessionTempo {
  if (typeof adaptiveTempo !== 'boolean')
    throw new SessionEngineError(
      `Whether adaptive tempo runs must be a boolean, got ${adaptiveTempo}.`,
    )
  const schedule = startAdaptiveTempo(settings.controls.tempo, adaptiveTempo)
  return { schedule, fixed: [schedule.tempo] }
}

/** Intent: the tempo phrase N plays at; asking before it is fixed is an engine bug and throws. */
// @spec-link [[module_session_adaptive_tempo_schedule]]
export function tempoOfPhrase(tempo: SessionTempo, phraseNumber: number): number {
  const fixed = tempo.fixed[phraseNumber - 1]
  if (fixed === undefined)
    throw new SessionEngineError(`Phrase ${phraseNumber}'s tempo is not fixed yet.`)
  return fixed
}

/** Intent: the tempo of the phrase sounding now; in the count-in, phrase 1's, the starting one. */
// @spec-link [[module_session_adaptive_tempo_schedule]]
// @spec-link [[rule_session_change_applies_at_phrase_boundary]]
export function soundingTempo(state: EngineState): number {
  return tempoOfPhrase(state.tempo, Math.max(state.soundedCount, 1))
}

/** Intent: a phrase starts sounding, which the schedule may count toward the next rise. */
// @spec-link [[module_session_adaptive_tempo_schedule]]
export function countSoundingPhrase(tempo: SessionTempo): SessionTempo {
  return { ...tempo, schedule: phraseStartedSounding(tempo.schedule) }
}

/**
 * Intent: a controller lost mid-session goes away or reconnects; an event that does not change
 * its presence throws.
 */
// @spec-link [[module_session_adaptive_tempo_schedule]]
export function onController(state: EngineState, attached: boolean): Step {
  const schedule = controllerPresence(state.tempo.schedule, attached)
  return { state: { ...state, tempo: { ...state.tempo, schedule } }, outputs: [] }
}

/**
 * Intent: fix the pending phrase's tempo once its look-ahead deadline is reached, after the
 * deadline logic, and output it, once per phrase. From then on the phrase can no longer be
 * discarded, so its tempo applies at its phrase boundary; it must be decided by then.
 */
// @spec-link [[rule_session_change_applies_at_phrase_boundary]]
// @spec-link [[module_session_adaptive_tempo_schedule]]
export function fixDueTempo(state: EngineState, at: AudioTime): Step {
  const { phraseNumber, deadline } = state.lookAhead ?? decidedOf(state).lookAhead
  const { fixed } = state.tempo
  if (phraseNumber <= fixed.length || !deadlineReached(at, deadline)) return { state, outputs: [] }
  if (state.lookAhead !== undefined)
    throw new SessionEngineError(`Phrase ${phraseNumber}'s tempo is due but it is not decided.`)
  if (phraseNumber !== fixed.length + 1)
    throw new SessionEngineError(
      `Phrase ${phraseNumber}'s tempo is due before phrase ${fixed.length + 1}'s.`,
    )
  const schedule = nextPhraseTempo(state.tempo.schedule)
  return {
    state: { ...state, tempo: { schedule, fixed: [...fixed, schedule.tempo] } },
    outputs: [{ kind: 'phrase-tempo', phraseNumber, tempo: schedule.tempo }],
  }
}
