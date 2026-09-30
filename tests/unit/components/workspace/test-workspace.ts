/**
 * A real, worker-free workspace runtime for Step 9 component tests: the actual session composable
 * and the actual notation coordinator, wired together exactly as `create-workspace-session.ts`
 * wires them for production, but with an injectable `generate` seam so a spec never touches a
 * real generation worker.
 */
import {
  createGenerationSession,
  type GenerationSession,
} from '@/composables/use-generation-session'
import { createNotationCoordinator } from '@/composables/use-notation-coordinator'
import { type WorkspaceSessionResult } from '@/composables/workspace-session-result'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { makeSeed } from '@/domain/random/seed'
import type { StaffLayoutInputs } from '@/notation/staff-fit-types'
import { CHEAP_CONTROLS, buildWorkspaceSessionResult } from '../../workspace-test-fixtures'
import { createFakeStaffFit, type FakeStaffFit } from '../../composables/fake-staff-fit'
import {
  createFakeViewportWidth,
  type FakeViewportWidth,
} from '../../composables/fake-viewport-width'

export interface TestWorkspace {
  readonly session: GenerationSession<WorkspaceSessionResult>
  readonly pendingPhrase: ReturnType<typeof createNotationCoordinator>['pendingPhrase']
  readonly handleEngraved: () => void
  readonly handleNotationError: ReturnType<typeof createNotationCoordinator>['handleNotationError']
  /** Records every layout report a ScorePanel forwards; the session's fit checks are `staff`'s. */
  readonly handleLayoutInputs: (inputs: StaffLayoutInputs) => void
  readonly layoutReports: StaffLayoutInputs[]
  /** The fake fit and room checks the session runs: every phrase fits unless a test queues otherwise. */
  readonly staff: FakeStaffFit<WorkspaceSessionResult>
  /** The fake window width the session reads: from `bp-tablet-landscape` up unless a test moves it. */
  readonly viewport: FakeViewportWidth
}

/** Intent: the default fake generate seam -- always the same cheap, real generation result. */
async function defaultGenerate(intent: GenerationIntent): Promise<WorkspaceSessionResult> {
  return buildWorkspaceSessionResult(intent.requestId, intent.seed)
}

/**
 * Intent: build one real session + coordinator pair for a component spec, defaulting every
 * generation to a cheap real result so `useCheapControls` is not required at every call site.
 */
export function createTestWorkspace(
  generate: (intent: GenerationIntent) => Promise<WorkspaceSessionResult> = defaultGenerate,
): TestWorkspace {
  let requestCounter = 0
  let seedCounter = 0
  // eslint-disable-next-line prefer-const -- definite-assignment: this closure needs `session` before it exists.
  let session!: GenerationSession<WorkspaceSessionResult>
  const staff = createFakeStaffFit<WorkspaceSessionResult>()
  const layoutReports: StaffLayoutInputs[] = []
  const viewport = createFakeViewportWidth()
  const coordinator = createNotationCoordinator({
    reportNotationFailure: (error) => session.actions.reportNotationFailure(error),
    reportNotationRecovered: () => session.actions.reportNotationRecovered(),
  })
  session = createGenerationSession<WorkspaceSessionResult>({
    checkFit: staff.checkFit,
    checkRoom: staff.checkRoom,
    staffLayout: staff.staffLayout,
    viewport,
    providers: {
      nextRequestId: () => makeRequestId(`workspace-spec-${++requestCounter}`),
      nextSeed: () => makeSeed(++seedCounter),
    },
    generate,
    notate: coordinator.notate,
    clearPresentedPhrase: coordinator.clearPresentedPhrase,
  })

  return {
    session,
    pendingPhrase: coordinator.pendingPhrase,
    handleEngraved: coordinator.handleEngraved,
    handleNotationError: coordinator.handleNotationError,
    handleLayoutInputs: (inputs) => {
      layoutReports.push(inputs)
    },
    layoutReports,
    staff,
    viewport,
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
  props: ['phrase'],
  emits: ['engraved', 'notation-error', 'layout-inputs'],
}
