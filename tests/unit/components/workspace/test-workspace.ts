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
import {
  evaluateWorkspaceProfileSwitch,
  type WorkspaceSessionResult,
} from '@/composables/workspace-session-result'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { makeSeed } from '@/domain/random/seed'
import { CHEAP_CONTROLS, buildWorkspaceSessionResult } from '../../workspace-test-fixtures'

export interface TestWorkspace {
  readonly session: GenerationSession<WorkspaceSessionResult>
  readonly pendingPhrase: ReturnType<typeof createNotationCoordinator>['pendingPhrase']
  readonly handleEngraved: () => void
  readonly handleNotationError: ReturnType<typeof createNotationCoordinator>['handleNotationError']
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
  const coordinator = createNotationCoordinator({
    reportNotationFailure: (error) => session.actions.reportNotationFailure(error),
    reportNotationRecovered: () => session.actions.reportNotationRecovered(),
  })
  session = createGenerationSession<WorkspaceSessionResult>({
    providers: {
      nextRequestId: () => makeRequestId(`workspace-spec-${++requestCounter}`),
      nextSeed: () => makeSeed(++seedCounter),
    },
    generate,
    notate: coordinator.notate,
    evaluateProfileSwitch: evaluateWorkspaceProfileSwitch,
  })

  return {
    session,
    pendingPhrase: coordinator.pendingPhrase,
    handleEngraved: coordinator.handleEngraved,
    handleNotationError: coordinator.handleNotationError,
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

/** A minimal global stub for `PhraseScore`: renders nothing, but exposes the same emitted events. */
export const PHRASE_SCORE_STUB = {
  name: 'PhraseScore',
  template: '<div class="phrase-score-stub" />',
  props: ['phrase'],
  emits: ['engraved', 'notation-error'],
}
