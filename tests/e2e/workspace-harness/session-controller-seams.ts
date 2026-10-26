/**
 * The workspace harness's session controller seam: it wraps the workspace's own
 * `createSessionController` to keep the controller the app built, and publishes
 * `window.__workspaceHarness.session`, a plain-JSON reading of its state. A spec starts and stops
 * sessions by clicking the app's own buttons, or by playing the starting note on the fake MIDI
 * access, and sets the session options through their controls; it sends the running session
 * an automatic settings change through the runner seam (`changeSettings`), which no part of the
 * app sends yet. The one thing it may change is
 * what the app reads as the Review's history: once `inflateHistory(n)` is called, the app is
 * handed the controller with a view of its state whose Review holds `n` phrases (the ended
 * session's own, repeated in order and numbered 1 to n), so a spec can show a long Review without
 * playing hours of session; the controller itself, its actions and `state()` keep the real
 * history.
 */
import { shallowRef } from 'vue'

import type {
  MostRecentSession,
  ReviewedHistory,
  SessionController,
  SessionControllerPhase,
  SessionControllerState,
  SessionReview,
} from '../../../src/components/workspace/workspace-session-controller-types'
import type { ExpectedNoteIdentity } from '../../../src/domain/acknowledgement/expected-note'
import type { ReviewedPhrase, SessionHistory } from '../../../src/session/session-history'
import { slotKey, waitingMaterial } from '../../../src/session/rolling-display'
import { changeSettings } from './session-runner-seam'

/** Intent: a note identity as plain JSON. */
function identityOf(identity: ExpectedNoteIdentity): WorkspaceHarnessNoteIdentity {
  return {
    phraseNumber: identity.phraseNumber,
    measureIndex: identity.measureIndex,
    eventIndex: identity.eventIndex,
  }
}

/**
 * Intent: a closed history phrase by phrase as plain JSON: each phrase's number, start, concert
 * timeline, acknowledgements and played notes.
 */
function historyPhrasesOf(history: SessionHistory): WorkspaceHarnessHistoryPhrase[] {
  return history.phrases().map((record) => ({
    phraseNumber: record.phraseNumber,
    startedAt: record.startedAt,
    timeline: JSON.stringify(record.outcome.result.timeline),
    acknowledgements: record.acknowledgements.map(identityOf),
    playedNotes: record.playedNotes.map((note) => ({
      pitch: note.pitch,
      velocity: note.velocity,
      onsetAt: note.onsetAt,
      releaseAt: note.releaseAt,
    })),
  }))
}

/** Intent: the session staff as plain JSON: the playhead, the shown and the waiting slot keys. */
function rollingDisplayOf(state: SessionControllerState) {
  const staff = state.sessionStaff
  if (staff === null || state.latestReady === null) {
    return { playhead: null, systems: { top: null, bottom: null }, waiting: [] }
  }
  return {
    playhead: staff.playhead === null ? null : { ...staff.playhead },
    systems: {
      top: staff.top === null ? null : slotKey(staff.top),
      bottom: staff.bottom === null ? null : slotKey(staff.bottom),
    },
    waiting: waitingMaterial(staff.layout, staff.playhead, state.latestReady).map(slotKey),
  }
}

/**
 * Intent: a closed history read as `phraseCount` phrases: the real ones repeated in order, each
 * renumbered from 1, its phrase count and start the real history's otherwise.
 */
function inflatedHistory(real: ReviewedHistory, phraseCount: number): ReviewedHistory {
  const records = real.phrases()
  if (records.length === 0) throw new Error('Workspace harness: an empty history cannot inflate')
  const inflated: readonly ReviewedPhrase[] = Object.freeze(
    Array.from({ length: phraseCount }, (_, index) => ({
      ...records[index % records.length]!,
      phraseNumber: index + 1,
    })),
  )
  return Object.freeze({ phrases: () => inflated, phraseCount, startedAt: real.startedAt })
}

/**
 * Intent: a view of the controller's state whose Review and most recent session, once
 * `phraseCount()` is set, hold that many phrases; every read goes through the real (reactive)
 * state, so the app still tracks it. One inflated history per real one and count, and one view
 * per real Review or most recent session, so the app sees stable objects and the Review's history
 * is still the most recent session's.
 */
function inflatingStateView(
  state: SessionControllerState,
  phraseCount: () => number | null,
): SessionControllerState {
  const histories = new WeakMap<ReviewedHistory, ReviewedHistory>()
  const views = new WeakMap<object, object>()
  /** Intent: the one inflated history of `real` at `count` phrases. */
  const historyFor = (real: ReviewedHistory, count: number): ReviewedHistory => {
    let history = histories.get(real)
    if (history === undefined || history.phraseCount !== count) {
      history = inflatedHistory(real, count)
      histories.set(real, history)
    }
    return history
  }
  /** Intent: the one view of `real` (a Review or a session) with its history inflated. */
  const viewOf = <T extends { readonly history: ReviewedHistory }>(real: T, count: number): T => {
    const history = historyFor(real.history, count)
    const cached = views.get(real) as T | undefined
    if (cached !== undefined && cached.history === history) return cached
    const view = Object.freeze({ ...real, history })
    views.set(real, view)
    return view
  }
  return new Proxy(state, {
    get(target, key) {
      const value: unknown = Reflect.get(target, key)
      const count = phraseCount()
      if (value === null || count === null) return value
      if (key === 'review') return viewOf(value as SessionReview, count)
      if (key !== 'mostRecent') return value
      const recent = value as MostRecentSession
      if (recent.kind !== 'held') return recent
      const cached = views.get(recent) as MostRecentSession | undefined
      const session = viewOf(recent.session, count)
      if (cached?.kind === 'held' && cached.session === session) return cached
      const view = Object.freeze({ kind: 'held' as const, session })
      views.set(recent, view)
      return view
    },
  })
}

/** The seam: the wrapper for the workspace's factory and the API published for specs. */
export interface HarnessSessionController {
  readonly wrap: (create: () => Promise<SessionController>) => () => Promise<SessionController>
  /** The controller's phase now; null until the app has built it. */
  readonly phase: () => SessionControllerPhase | null
  readonly api: WorkspaceHarnessSessionApi
}

/** Intent: the most recent session as plain JSON: held, with its count and keeping, or kept. */
function mostRecentOf(
  recent: MostRecentSession | null,
): WorkspaceHarnessSessionState['mostRecent'] {
  if (recent === null) return null
  if (recent.kind === 'kept') return { kind: 'kept', key: recent.key }
  const { history, keeping } = recent.session
  return { kind: 'held', phraseCount: history.phraseCount, keeping }
}

/**
 * Intent: the controller's state as plain JSON, its last history reduced to its phrase count and
 * its phrases' timelines, acknowledgements and played notes, and its session staff to the playhead
 * and slot keys.
 */
function snapshotOf(state: SessionControllerState): WorkspaceHarnessSessionState {
  return {
    phase: state.phase,
    countIn:
      state.countIn === null
        ? null
        : { beats: [...state.countIn.beats], nextChangeAt: state.countIn.nextChangeAt },
    strugglingNotice: state.strugglingNotice,
    sessionTempo: state.sessionTempo,
    heldLayout: state.heldLayout,
    canStart: state.canStart,
    startBlocker: state.startBlocker,
    lastEnd: state.lastEnd === null ? null : { ...state.lastEnd },
    lastHistoryPhraseCount: state.lastHistory === null ? null : state.lastHistory.phraseCount,
    lastHistoryPhrases: state.lastHistory === null ? null : historyPhrasesOf(state.lastHistory),
    review:
      state.review === null
        ? null
        : { showing: state.review.showing, phraseCount: state.review.history.phraseCount },
    mostRecent: mostRecentOf(state.mostRecent),
    startingNote:
      state.startingNote === null
        ? null
        : {
            identity: identityOf(state.startingNote.identity),
            concertPitch: state.startingNote.concertPitch,
            label: state.startingNote.label,
          },
    controllerLost:
      state.controllerLost === null ? null : { secondsLeft: state.controllerLost.secondsLeft },
    acknowledged: state.acknowledged.map(identityOf),
    sessionHasController: state.sessionHasController,
    adaptiveTempo: state.adaptiveTempo,
    adaptiveTempoAvailable: state.adaptiveTempoAvailable,
    lastSessionReachedTempo: state.lastSessionReachedTempo,
    varySettings: state.varySettings,
    tensionAcrossPhrases: state.tensionAcrossPhrases,
    varySettingsAvailable: state.varySettingsAvailable,
    rhythmLockOn: state.rhythmLockOn,
    allowedRhythmChanges: [...state.allowedRhythmChanges],
    allowedGroups: { ...state.allowedGroups },
    shownSettings:
      state.shownSettings === null
        ? null
        : {
            controls: { ...state.shownSettings.controls },
            figureLevels: { ...state.shownSettings.figureLevels },
            selection: { ...state.shownSettings.selection },
          },
    ...rollingDisplayOf(state),
    latestReady: state.latestReady,
  }
}

/**
 * Intent: build the seam. `wrap` returns a factory that builds the controller with the
 * workspace's own, keeps it and hands the app the same controller with its state read through
 * the inflating view; the app calls it once, at setup.
 */
// @test-link [[service_session_controller]]
// @test-link [[req_last_session_review]]
// @test-link [[req_adaptive_tempo]]
export function createHarnessSessionController(): HarnessSessionController {
  let controller: SessionController | null = null

  /** Intent: the controller the app holds; reaching here before it loaded is a spec error. */
  function controllerFor(call: string): SessionController {
    if (controller === null) {
      throw new Error(`Workspace harness: session.${call}() before the controller loaded`)
    }
    return controller
  }

  // Reactive, so a Review already showing re-renders with the inflated history.
  const inflateTo = shallowRef<number | null>(null)
  return {
    wrap: (create) => async () => {
      const built = await create()
      controller = built
      return { ...built, state: inflatingStateView(built.state, () => inflateTo.value) }
    },
    phase: () => (controller === null ? null : controller.state.phase),
    api: {
      loaded: () => controller !== null,
      inflateHistory: (phraseCount) => {
        if (!Number.isInteger(phraseCount) || phraseCount < 1) {
          throw new Error(`Workspace harness: inflateHistory(${phraseCount}) needs a phrase count`)
        }
        inflateTo.value = phraseCount
      },
      state: () => snapshotOf(controllerFor('state').state),
      changeSettings,
    },
  }
}
