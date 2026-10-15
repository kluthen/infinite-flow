/**
 * A hand-driven Idle session double for the workspace component specs of the Review: a reactive
 * state a test edits directly (as the Idle rules running underneath the Review would), and spies
 * for every action. The real Idle machinery is covered by the composable specs.
 */
import { shallowReactive } from 'vue'
import { vi } from 'vitest'

import type {
  GenerationSession,
  GenerationSessionState,
} from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import {
  DEFAULT_GENERATION_CONTROLS,
  DEFAULT_PROFILE_SELECTION,
} from '@/domain/controls/profile-selection'
import { buildWorkspaceSessionResult } from '../../workspace-test-fixtures'

/** The Idle state, writable by the test. */
export type FakeIdleState = {
  -readonly [
    K in keyof GenerationSessionState<WorkspaceSessionResult>
  ]: GenerationSessionState<WorkspaceSessionResult>[K]
}

/** Intent: Ready: a phrase engraved on the staff, nothing running. */
export function readyState(): Partial<FakeIdleState> {
  return { result: buildWorkspaceSessionResult(), resultEngraved: true }
}

/** Intent: a session double at Empty unless `overrides` say otherwise; its state is shallowly reactive. */
// @test-link [[service_idle_generation_session]]
export function fakeGenerationSession(overrides: Partial<FakeIdleState> = {}): {
  readonly session: GenerationSession<WorkspaceSessionResult>
  readonly state: FakeIdleState
} {
  const state = shallowReactive<FakeIdleState>({
    controls: DEFAULT_GENERATION_CONTROLS,
    profileSelection: DEFAULT_PROFILE_SELECTION,
    presentation: { theme: 'System' },
    myInstrument: null,
    latestIntent: null,
    result: null,
    operation: 'idle',
    generationError: null,
    notationError: null,
    resultEngraved: false,
    noteDensityContext: { belowTabletLandscape: false, sessionSteppedDown: false },
    roomNotice: null,
    retriesRunning: false,
    roomNoticeAnnouncements: 0,
    ...overrides,
  })
  const session: GenerationSession<WorkspaceSessionResult> = {
    state,
    actions: {
      setControl: vi.fn(() => true),
      selectMusicalProfile: vi.fn(() => true),
      selectInstrumentProfile: vi.fn(async () => 'applied' as const),
      setTheme: vi.fn(() => true),
      generate: vi.fn(async () => true),
      regenerate: vi.fn(async () => true),
      retryGeneration: vi.fn(async () => true),
      retryNotation: vi.fn(async () => true),
      reportNotationFailure: vi.fn(() => true),
      reportNotationRecovered: vi.fn(() => true),
      startFreshPhrase: vi.fn(async () => true),
    },
    dispose: vi.fn(),
  }
  return { session, state }
}
