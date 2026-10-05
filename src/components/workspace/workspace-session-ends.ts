/**
 * How a session controller's sessions end. Every end takes one path: the notes still held end and
 * are recorded, the engine gets `end` (its `ended` output closes the history), and the session is
 * torn down (wake-ups, audio, both screen locks, the display, MIDI and the end watchers) and
 * summed up; once phrase 1 has sounded the Review opens and Idle is asked for the next phrase. The
 * same teardown undoes a start that threw part-way, and a programming error ends the session it
 * hit before it propagates. The audio interrupted ends whichever session runs, like Stop.
 */
import type { SessionEndCause } from '@/session/session-types'
import { openedReview } from './session-review-state'
import type { AdaptiveTempoFlag } from './workspace-adaptive-tempo'
import {
  dispatchAt,
  type ActiveSession,
  type SessionControllerCore,
} from './workspace-session-active'
import { SessionControllerError } from './workspace-session-controller-types'

/** The ends of one controller's sessions, shared by its start, its sessions' seams and Stop. */
// @spec-link [[rule_stop_ends_session]]
export interface SessionEnds {
  /** End the running session for `cause`; throws with none running. */
  readonly end: (cause: SessionEndCause) => void
  /** End `session` for `cause` if it is still the running one; a later cause does nothing. */
  readonly endIfRunning: (session: ActiveSession, cause: SessionEndCause) => void
  /** End `session` if it is still the running one, then throw `error`. */
  readonly failLoudly: (session: ActiveSession, error: unknown) => never
  /** Undo a start that threw part-way, then throw its `error` on. */
  readonly abandonStart: (session: ActiveSession | null, error: unknown) => never
  /** Listen, once for the controller's life, for the audio being interrupted. */
  readonly hearInterruptions: () => void
}

/**
 * Intent: undo everything a start set up: no more wake-ups or scheduled events, the audio
 * faded out (unless the transport already ended its own session), both locks released, the
 * display's frame loop stopped and the staff left to Idle, the session state back to Idle, the
 * session's MIDI handling stopped (an away device held back is free to reattach), and,
 * last, the end watchers stopped, which hands the staff's reports back to the Idle machinery and
 * re-applies the latest of them. A start that failed
 * part-way passes the session only once it was built, and may not have started the timer or
 * the watchers yet: only what was set up is undone. The shown settings go with the session, so
 * the controls show the player's own choices again, before anything asks Idle for a phrase.
 */
// @spec-link [[rule_stop_ends_session]]
// @spec-link [[rule_screen_wake_lock_during_session]]
// @spec-link [[rule_landscape_lock_during_session]]
function tearDown(core: SessionControllerCore, session: ActiveSession | null): void {
  const { audio, browser } = core.deps
  const { state } = core
  session?.agenda.clear()
  core.startedTimer?.stop()
  core.startedTimer = null
  session?.display?.stop()
  if (audio.isRunning()) audio.stop()
  browser.wakeLock.release()
  browser.orientationLock.unlock()
  state.phase = 'idle'
  state.countIn = null
  state.strugglingNotice = false
  state.sessionTempo = null
  state.heldLayout = null
  state.sessionStaff = null
  state.latestReady = null
  state.shownSettings = null
  session?.midi?.stop()
  session?.watch?.stop()
}

/**
 * Intent: build the ends of one controller's sessions over its core; an end once phrase 1 has
 * sounded hands the tempo reached to the adaptive-tempo flag. Interruptions are heard from the
 * first start on.
 */
// @spec-link [[rule_stop_ends_session]]
export function createSessionEnds(
  core: SessionControllerCore,
  adaptiveTempo: Pick<AdaptiveTempoFlag, 'sessionEnded'>,
): SessionEnds {
  const { audio, idle } = core.deps
  const { state } = core
  let hearsInterruptions = false

  /**
   * Intent: end the running session for `cause`, the one path every end takes: the notes still
   * held end now and are recorded, the engine gets `end` (its `ended` output closes the history),
   * then the session is torn down and summed up. Once phrase 1 has sounded, the Review opens over
   * the closed history and, the reports handed back to Idle, Idle is asked for the next phrase;
   * an end during the count-in opens none and asks for nothing.
   * The session is dropped first, so nothing can end it twice; ending with none running throws.
   */
  // @spec-link [[rule_stop_ends_session]]
  // @spec-link [[req_last_session_review]]
  // @spec-link [[rule_session_end_generates_next_phrase_one]]
  function end(cause: SessionEndCause): void {
    const session = core.active
    if (session === null)
      throw new SessionControllerError('session controller: no session is running')
    core.active = null
    try {
      session.midi?.releaseHeld()
      dispatchAt(session, audio.now(), { kind: 'end', cause })
    } finally {
      tearDown(core, session)
    }
    const ended = session.ended
    if (ended === null) throw new Error('session controller: the engine did not report the end')
    state.lastEnd = Object.freeze({
      cause: ended.cause,
      phase: ended.phase,
      soundedPhraseCount: ended.soundedPhraseCount,
    })
    state.lastHistory = session.history
    if (ended.soundedPhraseCount === 0) return
    state.review = openedReview(session.history)
    adaptiveTempo.sessionEnded(state.review.tempoReached)
    void idle.actions.startFreshPhrase()
  }

  /**
   * Intent: surface a programming error loudly, as the workspace does with any unexpected error
   * (it propagates, uncaught): end `session` first if it is still the running one, so nothing keeps
   * sounding, then throw. A late error from an earlier session never ends a later one.
   */
  // @spec-link [[service_workspace_session_flow]]
  function failLoudly(session: ActiveSession, error: unknown): never {
    if (core.active === session) {
      try {
        end('stop')
      } catch (endError: unknown) {
        throw new AggregateError(
          [error, endError],
          'session controller: failed, then failed to end',
          { cause: endError },
        )
      }
    }
    throw error
  }

  /**
   * Intent: undo a start that threw part-way, then throw its error on: a runner already built gets
   * `end`, so its pending answers change nothing, and everything acquired is torn down as at any
   * end; no end summary is recorded, as the session never fully started. A failure while undoing
   * is thrown together with the start's.
   */
  // @spec-link [[service_workspace_session_flow]]
  // @spec-link [[rule_screen_wake_lock_during_session]]
  // @spec-link [[rule_landscape_lock_during_session]]
  function abandonStart(session: ActiveSession | null, error: unknown): never {
    core.active = null
    try {
      try {
        session?.midi?.releaseHeld()
        if (session !== null && session.runner !== null)
          dispatchAt(session, audio.now(), { kind: 'end', cause: 'stop' })
      } finally {
        tearDown(core, session)
      }
    } catch (undoError: unknown) {
      throw new AggregateError(
        [error, undoError],
        'session controller: a start failed, then failed to undo',
        { cause: undoError },
      )
    }
    throw error
  }

  /** Intent: end `session` for `cause` if it is still the running one; a later cause does nothing. */
  function endIfRunning(session: ActiveSession, cause: SessionEndCause): void {
    if (core.active === session) end(cause)
  }

  /**
   * Intent: listen, once for the controller's life, for the browser interrupting the audio (the
   * transport has no way to stop listening): it ends whichever session runs then, like Stop.
   */
  // @spec-link [[rule_stop_ends_session]]
  // @spec-link [[rule_session_never_pauses]]
  function hearInterruptions(): void {
    if (hearsInterruptions) return
    hearsInterruptions = true
    audio.onInterrupted(() => {
      if (core.active !== null) end('stop')
    })
  }

  return { end, endIfRunning, failLoudly, abandonStart, hearInterruptions }
}
