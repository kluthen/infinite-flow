/**
 * The workspace harness's session controller seam: it wraps the workspace's own
 * `createSessionController`, unchanged, to keep the controller the app built, and publishes
 * `window.__workspaceHarness.session`, a plain-JSON reading of its state. Nothing is driven
 * through it: a spec starts and stops sessions by clicking the app's own buttons, or by playing
 * the starting note on the fake MIDI access.
 */
import type {
  SessionController,
  SessionControllerState,
} from '../../../src/components/workspace/workspace-session-controller-types'
import type { ExpectedNoteIdentity } from '../../../src/domain/acknowledgement/expected-note'
import type { SessionHistory } from '../../../src/session/session-history'
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
 * workspace's own, keeps it and hands it on; the app calls it once, at setup.
 */
// @test-link [[service_workspace_session_flow]]
export function createHarnessSessionController(): HarnessSessionController {
  let controller: SessionController | null = null
  return {
    wrap: (create) => async () => {
      const built = await create()
      controller = built
      return built
    },
    api: {
      loaded: () => controller !== null,
      state: () => {
        if (controller === null) {
          throw new Error('Workspace harness: session.state() before the controller loaded')
        }
        return snapshotOf(controller.state)
      },
    },
  }
}
