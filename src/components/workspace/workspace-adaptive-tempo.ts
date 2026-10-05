/**
 * The session controller's adaptive-tempo side: the page's adaptive-tempo flag, whether it is
 * available, what a session's engine is told at its start, the tempo the last session that ran it
 * reached, and the controller's presence the engine follows during a session. The flag and the
 * reached tempo are held in memory only, for the controller's life, which is the page's (App.vue
 * builds the one controller at setup and disposes of it at unmount); no session's start or end
 * resets the flag. The "During a session" group's `Rising tempo` control shows and sets the flag;
 * the tempo field's "Last session reached {n} BPM." note shows the reached tempo. Loaded with the
 * controller, never in the entry chunk.
 */
import { shallowRef } from 'vue'

import type { MidiControllerState } from '@/midi/midi-controller-state'
import type { AudioTime } from '@/session/session-types'
import {
  SessionControllerError,
  type SessionControllerPhase,
} from './workspace-session-controller-types'

/**
 * The page's flag: `on`, `available` and `lastSessionReachedTempo` are reactive readings; `set` is
 * the player's on/off; `forSession` is the engine's `adaptiveTempo` for a session starting now,
 * which it also keeps for that session's end; `sessionEnded` is told the tempo reached by a session
 * that ended once phrase 1 had sounded.
 */
// @spec-link [[service_workspace_session_flow]]
// @spec-link [[req_adaptive_tempo]]
// @spec-link [[rule_adaptive_tempo_resets_after_session]]
export interface AdaptiveTempoFlag {
  readonly on: () => boolean
  readonly available: () => boolean
  readonly set: (on: boolean) => void
  readonly forSession: (sessionHasController: boolean | null) => boolean
  readonly sessionEnded: (tempoReached: number) => void
  /**
   * The tempo the last session that ran adaptive tempo reached, in BPM: null before any, and after
   * an end, once phrase 1 has sounded, of a session that did not run it.
   */
  readonly lastSessionReachedTempo: () => number | null
}

/** A controller event, its time left to the dispatcher, which raises it to the engine's floor. */
// @spec-link [[service_workspace_session_flow]]
export interface ControllerPresenceEvent {
  readonly kind: 'controller'
  readonly attached: boolean
}

/**
 * Intent: whether a controller is attached: permission granted, one input selected, its port
 * present and open, which is exactly the MIDI controller's `connected` state.
 */
// @spec-link [[req_adaptive_tempo]]
// @spec-link [[rule_controller_attached_definition]]
export function isControllerAttached(state: MidiControllerState): boolean {
  return state.kind === 'connected'
}

/**
 * Intent: build the page's flag, off, over the MIDI controller's state and the session's phase,
 * both read reactively. It changes only at Idle (a session's settings are locked
 * from its count-in to its end): any change while a session runs throws. Turning it on throws
 * while no controller is attached; turning it off is always allowed at Idle. It stays on when the
 * controller then goes away: it is only unavailable until a controller is attached again.
 */
// @spec-link [[req_adaptive_tempo]]
// @spec-link [[rule_ephemeral_session_state]]
// @spec-link [[service_workspace_session_flow]]
export function createAdaptiveTempoFlag(
  controllerState: () => MidiControllerState,
  phase: () => SessionControllerPhase,
): AdaptiveTempoFlag {
  const on = shallowRef(false)
  const available = (): boolean => isControllerAttached(controllerState())
  /** Whether the session started last runs adaptive tempo; null before the first start. */
  let lastSessionRuns: boolean | null = null
  const reached = shallowRef<number | null>(null)

  /**
   * Intent: a session runs adaptive tempo when the flag is on and the session reads a controller,
   * fixed at its start; one started with the selected controller away, or none selected, has no
   * controller and so no adaptive tempo. The answer is kept for that session's end.
   */
  // @spec-link [[req_adaptive_tempo]]
  // @spec-link [[rule_controller_attached_definition]]
  function forSession(sessionHasController: boolean | null): boolean {
    lastSessionRuns = on.value && sessionHasController === true
    return lastSessionRuns
  }

  /**
   * Intent: a session ended once phrase 1 had sounded, at `tempoReached`, the tempo of its last
   * phrase to start sounding: the reached tempo becomes it when that session ran adaptive tempo,
   * and none when it did not. A start and an end during the count-in never come here, so they
   * leave it as it is. Only the tempo is kept, never anything about the player's playing.
   */
  // @spec-link [[rule_adaptive_tempo_resets_after_session]]
  // @spec-link [[rule_no_grading_or_mismatch_signal]]
  function sessionEnded(tempoReached: number): void {
    if (lastSessionRuns === null)
      throw new SessionControllerError('adaptive tempo: a session ended that never started')
    reached.value = lastSessionRuns ? tempoReached : null
  }

  return {
    on: () => on.value,
    available,
    set: (next) => {
      if (phase() !== 'idle')
        throw new SessionControllerError('adaptive tempo: it cannot change during a session')
      if (next && !available())
        throw new SessionControllerError('adaptive tempo: no controller is attached')
      on.value = next
    },
    forSession,
    sessionEnded,
    lastSessionReachedTempo: () => reached.value,
  }
}

/**
 * Intent: forward a session's controller going away (the loss that starts the 30-second
 * countdown) and coming back (its reattachment inside the window) to the engine, at the audio
 * clock's time now, so a phrase whose tempo is fixed while it is away does not rise and a phrase
 * that starts sounding while it is away does not count. Only a session started with a controller
 * reports either.
 */
// @spec-link [[rule_adaptive_tempo_flat_schedule]]
// @spec-link [[rule_controller_loss_mid_session]]
export function forwardPresence(
  now: () => AudioTime,
  dispatch: (at: AudioTime, event: ControllerPresenceEvent) => void,
): (attached: boolean) => void {
  return (attached) => dispatch(now(), { kind: 'controller', attached })
}
