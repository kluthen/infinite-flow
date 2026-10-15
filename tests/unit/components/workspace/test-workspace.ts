/**
 * A real, worker-free workspace runtime for Step 9 component tests: the actual session composable
 * and the actual notation coordinator, wired together exactly as `create-workspace-session.ts`
 * wires them for production, but with an injectable `generate` seam so a spec never touches a
 * real generation worker. Its saver records every batch the session or a component saves.
 */
import { instrumentClefOf } from '@/domain/profile/instrument-clef'
import {
  createGenerationSession,
  type GenerationSession,
} from '@/composables/use-generation-session'
import { createNotationCoordinator } from '@/composables/use-notation-coordinator'
import {
  withSessionSeed,
  type WorkspaceGeneratedPhrase,
  type WorkspaceSessionResult,
} from '@/composables/workspace-session-result'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { makeSeed } from '@/domain/random/seed'
import type { NotationError } from '@/notation/notation-error'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'
import type { AudioTransport } from '@/audio/audio-transport'
import { CHEAP_CONTROLS, buildWorkspaceSessionResult } from '../../workspace-test-fixtures'
import { countingSessionSeeds } from '../../composables/fake-session-seed'
import { createFakeStaffFit, type FakeStaffFit } from '../../composables/fake-staff-fit'
import {
  createFakeViewportWidth,
  type FakeViewportWidth,
} from '../../composables/fake-viewport-width'
import { transportRig } from '../../audio/transport-rig'
import type { SaveSettings, SettingChanges } from '@/storage/settings-saver'
import { recordingSaveSettings } from './recording-save-settings'

export interface TestWorkspace {
  readonly session: GenerationSession<WorkspaceSessionResult>
  readonly pendingPhrase: ReturnType<typeof createNotationCoordinator>['pendingPhrase']
  readonly handleEngraved: () => void
  readonly handleNotationError: ReturnType<typeof createNotationCoordinator>['handleNotationError']
  /** Records every session staff failure a ScorePanel forwards. */
  readonly handleSessionStaffFailed: (error: NotationError) => void
  readonly sessionStaffFailures: NotationError[]
  /** Records every layout report a ScorePanel forwards; the session's fit checks are `staff`'s. */
  readonly handleLayoutInputs: (inputs: StaffLayoutInputs) => void
  readonly layoutReports: StaffLayoutInputs[]
  /** The fake fit and room checks the session runs: every phrase fits unless a test queues otherwise. */
  readonly staff: FakeStaffFit<WorkspaceGeneratedPhrase>
  /** The fake window width the session reads: from `bp-tablet-landscape` up unless a test moves it. */
  readonly viewport: FakeViewportWidth
  /** A real audio transport on the fake audio clock, its mix read from the stylesheet's tokens. */
  readonly audio: AudioTransport
  /** The saver the session saves through, and a mounted component when a spec provides it. */
  readonly saveSettings: SaveSettings
  /** Every batch `saveSettings` was given, in order. */
  readonly saves: SettingChanges[]
}

/** Intent: the default fake generate seam -- always the same cheap, real generation result. */
async function defaultGenerate(intent: GenerationIntent): Promise<WorkspaceGeneratedPhrase> {
  return buildWorkspaceSessionResult(intent.requestId, intent.seed)
}

/**
 * Intent: build one real session + coordinator pair for a component spec, defaulting every
 * generation to a cheap real result so `useCheapControls` is not required at every call site.
 */
export function createTestWorkspace(
  generate: (intent: GenerationIntent) => Promise<WorkspaceGeneratedPhrase> = defaultGenerate,
): TestWorkspace {
  let requestCounter = 0
  let seedCounter = 0
  // eslint-disable-next-line prefer-const -- definite-assignment: this closure needs `session` before it exists.
  let session!: GenerationSession<WorkspaceSessionResult>
  const staff = createFakeStaffFit<WorkspaceGeneratedPhrase>()
  const layoutReports: StaffLayoutInputs[] = []
  const sessionStaffFailures: NotationError[] = []
  const viewport = createFakeViewportWidth()
  const { saveSettings, saves } = recordingSaveSettings()
  const coordinator = createNotationCoordinator(
    {
      reportNotationFailure: (error) => session.actions.reportNotationFailure(error),
      reportNotationRecovered: () => session.actions.reportNotationRecovered(),
    },
    {
      of: (id) => instrumentClefOf(id, session.state.myInstrument),
      selected: () =>
        instrumentClefOf(session.state.controls.instrumentProfileId, session.state.myInstrument),
    },
  )
  session = createGenerationSession<WorkspaceSessionResult, WorkspaceGeneratedPhrase>({
    checkFit: staff.checkFit,
    checkRoom: staff.checkRoom,
    staffLayout: staff.staffLayout,
    viewport,
    providers: {
      nextRequestId: () => makeRequestId(`workspace-spec-${++requestCounter}`),
      nextSeed: () => makeSeed(++seedCounter),
    },
    nextSessionSeed: countingSessionSeeds(),
    withSessionSeed,
    generate,
    notate: coordinator.notate,
    clearPresentedPhrase: coordinator.clearPresentedPhrase,
    saveSettings,
  })

  return {
    session,
    pendingPhrase: coordinator.pendingPhrase,
    handleEngraved: coordinator.handleEngraved,
    handleNotationError: coordinator.handleNotationError,
    handleSessionStaffFailed: (error) => {
      sessionStaffFailures.push(error)
    },
    sessionStaffFailures,
    handleLayoutInputs: (inputs) => {
      layoutReports.push(inputs)
    },
    layoutReports,
    staff,
    viewport,
    audio: transportRig().transport,
    saveSettings,
    saves,
  }
}

/** Intent: apply the same cheap rhythm/harmony controls `defaultGenerate`'s fixture assumes. */
export function useCheapControls(session: GenerationSession<WorkspaceSessionResult>): void {
  session.actions.setControl('noteDensity', CHEAP_CONTROLS.noteDensity)
  session.actions.setControl('syncopation', CHEAP_CONTROLS.syncopation)
  session.actions.setControl('silenceDensity', CHEAP_CONTROLS.silenceDensity)
  session.actions.setControl('harmonicMotion', CHEAP_CONTROLS.harmonicMotion)
  session.actions.setControl('tension', CHEAP_CONTROLS.tension)
}

/** A minimal global stub for `PhraseScore`: renders only its default slot (the frame's messages) and exposes the same emitted events. */
export const PHRASE_SCORE_STUB = {
  name: 'PhraseScore',
  template: '<div class="phrase-score-stub"><slot /></div>',
  props: ['phrase', 'session', 'overlays'],
  emits: ['engraved', 'notation-error', 'layout-inputs', 'session-staff-failed'],
}
