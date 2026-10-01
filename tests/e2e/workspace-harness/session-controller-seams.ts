/**
 * The workspace harness's session controller seam: it wraps the workspace's own
 * `createSessionController`, unchanged, to keep the controller the app built, and publishes
 * `window.__workspaceHarness.session`, a plain-JSON reading of its state. Nothing is driven
 * through it: a spec starts and stops sessions by clicking the app's own buttons.
 */
import type {
  SessionController,
  SessionControllerState,
} from '../../../src/components/workspace/workspace-session-controller-types'

/** The seam: the wrapper for the workspace's factory and the API published for specs. */
export interface HarnessSessionController {
  readonly wrap: (create: () => Promise<SessionController>) => () => Promise<SessionController>
  readonly api: WorkspaceHarnessSessionApi
}

/** Intent: the controller's state as plain JSON, its last history reduced to its phrase count. */
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
