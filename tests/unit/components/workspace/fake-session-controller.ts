/**
 * A hand-driven session controller for the workspace component specs: its state is a reactive
 * object a test edits directly, and `start`/`stop`/`dispose` are spies that move the phase the
 * way the real controller does (the real one is covered by workspace-session-controller*.spec.ts).
 * `isPhraseOnScreen` answers from the session staff the test sets.
 */
import { shallowReactive } from 'vue'
import { vi, type Mock } from 'vitest'

import type {
  SessionController,
  SessionControllerState,
} from '@/components/workspace/workspace-session-controller-types'

/** The fake's state, writable by the test. */
export type FakeSessionControllerState = {
  -readonly [K in keyof SessionControllerState]: SessionControllerState[K]
}

/** The fake controller, its writable state and its spies. */
export interface FakeSessionController {
  readonly controller: SessionController
  readonly state: FakeSessionControllerState
  readonly start: Mock<() => void>
  readonly stop: Mock<() => void>
  readonly dispose: Mock<() => void>
}

/** Intent: whether the fake's session staff shows any part of phrase `phraseNumber`. */
function staffShows(state: FakeSessionControllerState, phraseNumber: number): boolean {
  const staff = state.sessionStaff
  if (staff === null) return false
  return [staff.top, staff.bottom].some((system) => system?.phraseNumber === phraseNumber)
}

/** The four count-in beats, all muted: the count-in row before its first click. */
export const COUNT_IN_MUTED = {
  over: false,
  beats: ['muted', 'muted', 'muted', 'muted'],
  nextChangeAt: 0.1,
} as const

/**
 * Intent: a fake controller at Idle, startable unless `overrides` say otherwise. `start` enters
 * the count-in at tempo 90 in the one-system layout; `stop` ends it during the count-in.
 */
// @test-link [[service_workspace_session_flow]]
export function createFakeSessionController(
  overrides: Partial<FakeSessionControllerState> = {},
): FakeSessionController {
  const state = shallowReactive<FakeSessionControllerState>({
    phase: 'idle',
    countIn: null,
    strugglingNotice: false,
    sessionTempo: null,
    heldLayout: null,
    canStart: true,
    startBlocker: null,
    lastEnd: null,
    lastHistory: null,
    sessionStaff: null,
    latestReady: null,
    startingNote: null,
    controllerLost: null,
    acknowledged: [],
    sessionHasController: null,
    ...overrides,
  })
  const start = vi.fn((): void => {
    state.phase = 'count-in'
    state.countIn = COUNT_IN_MUTED
    state.sessionTempo = 90
    state.heldLayout = 'one-system'
    state.canStart = false
    state.startBlocker = 'session_active'
  })
  const stop = vi.fn((): void => {
    const phase = state.phase === 'running' ? 'running' : 'count-in'
    state.phase = 'idle'
    state.countIn = null
    state.sessionTempo = null
    state.heldLayout = null
    state.sessionStaff = null
    state.latestReady = null
    state.canStart = true
    state.startBlocker = null
    state.lastEnd = { cause: 'stop', phase, soundedPhraseCount: phase === 'running' ? 1 : 0 }
  })
  const dispose = vi.fn((): void => {})
  const isPhraseOnScreen = (phraseNumber: number): boolean => staffShows(state, phraseNumber)
  return {
    controller: { state, start, stop, isPhraseOnScreen, dispose },
    state,
    start,
    stop,
    dispose,
  }
}
