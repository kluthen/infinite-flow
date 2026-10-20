/**
 * How a session controller's sessions end. Every end takes one path: the notes still held end and
 * are recorded, the engine gets `end` (its `ended` output closes the history), and the session is
 * torn down (wake-ups, audio, both screen locks, the display, MIDI, the end watchers and the hold
 * of the player's saves, released once back at Idle) and summed up; once phrase 1 has sounded the
 * Review opens and Idle is asked for the next phrase. The same teardown undoes a start that threw
 * part-way, and a programming error ends the session it hit before it propagates. The audio
 * interrupted ends whichever session runs, like Stop. An end with a review then saves the session,
 * after the release, without waiting for it (workspace-session-save.ts); that session becomes the
 * most recent one, kept as its save's outcome says once it is known (not saved when the page went
 * away before the save finished: a reload or close), or not saved at once while saving is off.
 */
import type { Preset } from '@/domain/presets/preset-selection'
import type { SessionHistory } from '@/session/session-history'
import type { SessionEndCause } from '@/session/session-types'
import { endedSession, openedReview, settledKeeping } from './session-review-state'
import { endedSessionSave, saveEndedSession, tellDamagedDeleted } from './workspace-session-save'
import type { KeptSessionRows } from './use-kept-sessions'
import type { AdaptiveTempoFlag } from './workspace-adaptive-tempo'
import { findHeldSession } from './workspace-kept-session-opening'
import {
  dispatchAt,
  type ActiveSession,
  type SessionControllerCore,
} from './workspace-session-active'
import { SessionControllerError, type ReviewedSession } from './workspace-session-controller-types'
import type { SessionSaveOutcome } from '@/storage/save-policy'

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
 * player's saves the start held released (each end and each undone start tears down once), the
 * session's MIDI handling stopped (an away device held back is free to reattach), and,
 * last, the end watchers stopped, which hands the staff's reports back to the Idle machinery and
 * re-applies the latest of them. A start that failed
 * part-way passes the session only once it was built, and may not have started the timer or
 * the watchers yet: only what was set up is undone. The shown and start settings go with the
 * session, so the controls show the player's own choices again, before anything asks Idle for a
 * phrase.
 */
// @spec-link [[rule_stop_ends_session]]
// @spec-link [[rule_screen_wake_lock_during_session]]
// @spec-link [[rule_landscape_lock_during_session]]
// @spec-link [[rule_no_save_during_session]]
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
  state.startSettings = null
  core.deps.saveHold.release()
  session?.midi?.stop()
  session?.watch?.stop()
}

/**
 * Intent: build the ends of one controller's sessions over its core; an end once phrase 1 has
 * sounded hands the tempo reached to the adaptive-tempo flag, its save keeps the played notes as
 * `Keep my played notes` says then, and a save the device refused hands its session's history on
 * for the retry. A save that succeeds adds the session's row to `rows` and removes those of the
 * sessions it deleted. Interruptions are heard from the first start on.
 */
// @spec-link [[rule_stop_ends_session]]
export function createSessionEnds(
  core: SessionControllerCore,
  adaptiveTempo: Pick<AdaptiveTempoFlag, 'sessionEnded'>,
  keepPlayedNotes: () => boolean,
  saveRefused: (key: string, history: SessionHistory, presets: readonly Preset[]) => void,
  rows: Pick<KeptSessionRows, 'savingThrough'>,
): SessionEnds {
  const { audio, idle } = core.deps
  const { state } = core
  let hearsInterruptions = false

  /**
   * Intent: end the running session for `cause`, the one path every end takes: the notes still
   * held end now and are recorded, the engine gets `end` (its `ended` output closes the history),
   * then the session is torn down and summed up. Once phrase 1 has sounded, the Review opens over
   * the closed history and that session becomes the most recent one, not pinned, or not saved at
   * once while saving is off, under the key minted for its save, its played notes kept when
   * `Keep my played notes` is on, saving is on and it holds one, its preset label named from the
   * presets the session knew (Idle's, which never change during a session); the session's own
   * save is asked
   * for after the release (never
   * awaited, so the end is not delayed; its outcome settles how the session is kept, and the
   * damaged kept sessions its batch deleted are told once it is saved) and, the
   * reports handed back to Idle, Idle is asked for the next phrase; an end during the count-in
   * opens none, saves nothing, asks for nothing and leaves the most recent session as it was.
   * The session is dropped first, so nothing can end it twice; ending with none running throws.
   */
  // @spec-link [[rule_stop_ends_session]]
  // @spec-link [[req_last_session_review]]
  // @spec-link [[rule_session_end_generates_next_phrase_one]]
  // @spec-link [[module_kept_session_save]]
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
    const savingOff = core.deps.keptSessions.savingOff()
    const save = endedSessionSave(
      session.history,
      !savingOff && keepPlayedNotes(),
      idle.state.presets,
    )
    const reviewed = endedSession(session.history, savingOff ? 'not-saved' : 'not-pinned', save)
    state.review = openedReview(reviewed)
    state.mostRecent = Object.freeze({ kind: 'held', session: reviewed })
    const saves = rows.savingThrough(core.deps.saveHold, () => findHeldSession(state, reviewed.key))
    const saving = saveEndedSession(saves, core.deps.browser.pageLeaving, session.history, save)
    if (!savingOff) {
      void saving.then((outcome) => {
        settleKeeping(reviewed, outcome)
        if (outcome.status === 'refused') saveRefused(reviewed.key, session.history, save.presets)
        tellDamagedDeleted(core.deps.keptSessions.reports, outcome)
      })
    }
    adaptiveTempo.sessionEnded(reviewed.tempoReached)
    void idle.actions.startFreshPhrase()
  }

  /**
   * Intent: once the save of `ended` resolves, keep that session as its outcome says, in the most
   * recent session and in the Review while it draws that session (each found by the session's
   * key, as a change made since may have replaced them); a later session that has taken its place
   * since is left alone.
   */
  // @spec-link [[module_kept_session_save]]
  function settleKeeping(ended: ReviewedSession, outcome: SessionSaveOutcome): void {
    const { keeping } = settledKeeping(ended, outcome)
    const recent = state.mostRecent
    if (keeping === ended.keeping || recent?.kind !== 'held' || recent.session.key !== ended.key)
      return
    const session = Object.freeze({ ...recent.session, keeping })
    state.mostRecent = Object.freeze({ kind: 'held', session })
    if (state.review !== null && state.review.key === ended.key) {
      state.review = Object.freeze({ ...state.review, keeping })
    }
  }

  /**
   * Intent: surface a programming error loudly, as the workspace does with any unexpected error
   * (it propagates, uncaught): end `session` first if it is still the running one, so nothing keeps
   * sounding, then throw. A late error from an earlier session never ends a later one.
   */
  // @spec-link [[service_session_end]]
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
  // @spec-link [[service_session_start]]
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
