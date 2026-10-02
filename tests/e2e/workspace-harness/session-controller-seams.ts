/**
 * The workspace harness's session controller seam: it wraps the workspace's own
 * `createSessionController` to keep the controller the app built, and publishes
 * `window.__workspaceHarness.session`, a plain-JSON reading of its state. Nothing is driven
 * through it: a spec starts and stops sessions by clicking the app's own buttons, or by playing
 * the starting note on the fake MIDI access. The one thing it may change is what the app reads as
 * the Review's history: once `inflateHistory(n)` is called, the app is handed the controller with
 * a view of its state whose Review holds `n` phrases (the ended session's own, repeated in order
 * and numbered 1 to n), so a spec can show a long Review without playing hours of session; the
 * controller itself, its actions and `state()` keep the real history.
 */
import { shallowRef } from 'vue'

import type {
  SessionController,
  SessionControllerState,
  SessionReview,
} from '../../../src/components/workspace/workspace-session-controller-types'
import type { ExpectedNoteIdentity } from '../../../src/domain/acknowledgement/expected-note'
import type { SessionHistory, SessionHistoryRecord } from '../../../src/session/session-history'
import { slotKey, waitingMaterial } from '../../../src/session/rolling-display'

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
 * renumbered from 1, everything else the real history's. Recording into it is a defect.
 */
function inflatedHistory(real: SessionHistory, phraseCount: number): SessionHistory {
  const records = real.phrases()
  if (records.length === 0) throw new Error('Workspace harness: an empty history cannot inflate')
  const inflated: readonly SessionHistoryRecord[] = Object.freeze(
    Array.from({ length: phraseCount }, (_, index) => ({
      ...records[index % records.length]!,
      phraseNumber: index + 1,
    })),
  )
  const closed = (): never => {
    throw new Error('Workspace harness: an inflated history records nothing')
  }
  return Object.freeze({
    record: closed,
    recordPlayedNote: closed,
    recordAcknowledgement: closed,
    phrases: () => inflated,
    phraseCount,
    startedAt: real.startedAt,
    instrumentProfileId: real.instrumentProfileId,
  })
}

/**
 * Intent: a view of the controller's state whose Review, once `phraseCount()` is set, holds that
 * many phrases; every read goes through the real (reactive) state, so the app still tracks it.
 * One inflated Review per real one, so the app sees a stable object.
 */
function inflatingStateView(
  state: SessionControllerState,
  phraseCount: () => number | null,
): SessionControllerState {
  const inflated = new WeakMap<SessionReview, SessionReview>()
  return new Proxy(state, {
    get(target, key) {
      const value: unknown = Reflect.get(target, key)
      if (key !== 'review' || value === null) return value
      const count = phraseCount()
      if (count === null) return value
      const review = value as SessionReview
      let view = inflated.get(review)
      if (view === undefined || view.history.phraseCount !== count) {
        view = Object.freeze({
          history: inflatedHistory(review.history, count),
          showing: review.showing,
        })
        inflated.set(review, view)
      }
      return view
    },
  })
}

/** The seam: the wrapper for the workspace's factory and the API published for specs. */
export interface HarnessSessionController {
  readonly wrap: (create: () => Promise<SessionController>) => () => Promise<SessionController>
  readonly api: WorkspaceHarnessSessionApi
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
    ...rollingDisplayOf(state),
    latestReady: state.latestReady,
  }
}

/**
 * Intent: build the seam. `wrap` returns a factory that builds the controller with the
 * workspace's own, keeps it and hands the app the same controller with its state read through
 * the inflating view; the app calls it once, at setup.
 */
// @test-link [[service_workspace_session_flow]]
// @test-link [[req_last_session_review]]
export function createHarnessSessionController(): HarnessSessionController {
  let controller: SessionController | null = null
  // Reactive, so a Review already showing re-renders with the inflated history.
  const inflateTo = shallowRef<number | null>(null)
  return {
    wrap: (create) => async () => {
      const built = await create()
      controller = built
      return { ...built, state: inflatingStateView(built.state, () => inflateTo.value) }
    },
    api: {
      loaded: () => controller !== null,
      inflateHistory: (phraseCount) => {
        if (!Number.isInteger(phraseCount) || phraseCount < 1) {
          throw new Error(`Workspace harness: inflateHistory(${phraseCount}) needs a phrase count`)
        }
        inflateTo.value = phraseCount
      },
      state: () => {
        if (controller === null) {
          throw new Error('Workspace harness: session.state() before the controller loaded')
        }
        return snapshotOf(controller.state)
      },
    },
  }
}
