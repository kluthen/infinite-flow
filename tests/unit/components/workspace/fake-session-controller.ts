/**
 * A hand-driven session controller for the workspace component specs: its state is a reactive
 * object a test edits directly, and `start`/`stop`/`dispose` are spies that move the phase the
 * way the real controller does (the real one is covered by workspace-session-controller*.spec.ts).
 * As the real one, `start` discards the Review and `stop` opens one, showing, once phrase 1 has
 * sounded (over `fakeReviewHistory`); `closeReview`/`showReview` are spies that flip its `showing`.
 * `isPhraseOnScreen` answers from the session staff the test sets.
 */
import { shallowReactive } from 'vue'
import { vi, type Mock } from 'vitest'

import type {
  SessionController,
  SessionControllerState,
  SessionReview,
} from '@/components/workspace/workspace-session-controller-types'
import type { InstrumentProfileId } from '@/domain/profile/instrument-profiles'
import type { SessionHistory, SessionHistoryRecord } from '@/session/session-history'
import { DEFAULT_SESSION_SEED, SESSION_START_EPOCH_MS } from '../../session/session-harness'

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
  readonly closeReview: Mock<() => void>
  readonly showReview: Mock<() => void>
  readonly setAdaptiveTempo: Mock<(on: boolean) => void>
  readonly setVarySettings: Mock<(on: boolean) => void>
  readonly setTensionAcrossPhrases: Mock<(on: boolean) => void>
}

/** Intent: whether the fake's session staff shows any part of phrase `phraseNumber`. */
function staffShows(state: FakeSessionControllerState, phraseNumber: number): boolean {
  const staff = state.sessionStaff
  if (staff === null) return false
  return [staff.top, staff.bottom].some((system) => system?.phraseNumber === phraseNumber)
}

/** Intent: a recording method no Review ever calls: a closed history takes nothing more. */
function closed(): never {
  throw new Error('fake review history: the history is closed')
}

/**
 * Intent: a closed session history for a Review: `records` as its phrases, the fixed test start
 * time, and the session's instrument profile (the B-flat tenor unless given).
 */
// @test-link [[req_last_session_review]]
export function fakeReviewHistory(
  records: readonly SessionHistoryRecord[] = [],
  instrumentProfileId: InstrumentProfileId = 'bb-tenor',
): SessionHistory {
  return {
    record: closed,
    recordPlayedNote: closed,
    recordAcknowledgement: closed,
    phrases: () => records,
    tempoReached: () => records.at(-1)?.tempo ?? null,
    phraseCount: records.length,
    startedAt: SESSION_START_EPOCH_MS,
    instrumentProfileId,
    sessionSeed: DEFAULT_SESSION_SEED,
  }
}

/** The four count-in beats, all muted: the count-in row before its first click. */
export const COUNT_IN_MUTED = {
  over: false,
  beats: ['muted', 'muted', 'muted', 'muted'],
  nextChangeAt: 0.1,
} as const

/**
 * Intent: a fake controller at Idle, startable unless `overrides` say otherwise. `start` discards
 * the Review and enters the count-in at tempo 90 in the one-system layout; `stop` ends it, opening
 * the Review if phrase 1 had sounded (the test moved the phase to `running`).
 */
// @test-link [[service_session_controller]]
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
    review: null,
    sessionStaff: null,
    latestReady: null,
    startingNote: null,
    controllerLost: null,
    acknowledged: [],
    sessionHasController: null,
    adaptiveTempo: false,
    adaptiveTempoAvailable: false,
    lastSessionReachedTempo: null,
    varySettings: false,
    tensionAcrossPhrases: false,
    shownSettings: null,
    ...overrides,
  })
  /** Intent: show `review`, which blocks a start, as the real start conditions do. */
  function showing(review: SessionReview): void {
    state.review = review
    state.canStart = false
    state.startBlocker = 'review_showing'
  }
  const start = vi.fn((): void => {
    state.review = null
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
    state.shownSettings = null
    state.canStart = true
    state.startBlocker = null
    state.lastEnd = { cause: 'stop', phase, soundedPhraseCount: phase === 'running' ? 1 : 0 }
    if (phase === 'running')
      showing({ history: fakeReviewHistory(), showing: true, tempoReached: 90 })
  })
  const dispose = vi.fn((): void => {})
  const closeReview = vi.fn((): void => {
    if (state.review?.showing !== true) throw new Error('fake controller: no Review shows')
    state.review = { ...state.review, showing: false }
    if (state.startBlocker === 'review_showing') {
      state.canStart = true
      state.startBlocker = null
    }
  })
  const showReview = vi.fn((): void => {
    if (state.review === null) throw new Error('fake controller: no Review exists')
    showing({ ...state.review, showing: true })
  })
  const isPhraseOnScreen = (phraseNumber: number): boolean => staffShows(state, phraseNumber)
  const setAdaptiveTempo = vi.fn((on: boolean): void => {
    if (state.phase !== 'idle') throw new Error('fake controller: adaptive tempo during a session')
    if (on && !state.adaptiveTempoAvailable) throw new Error('fake controller: no controller')
    state.adaptiveTempo = on
  })
  const setVarySettings = vi.fn((on: boolean): void => {
    if (state.phase !== 'idle') throw new Error('fake controller: vary settings during a session')
    state.varySettings = on
  })
  const setTensionAcrossPhrases = vi.fn((on: boolean): void => {
    if (state.phase !== 'idle')
      throw new Error('fake controller: tension across phrases during a session')
    state.tensionAcrossPhrases = on
  })
  return {
    controller: {
      state,
      start,
      stop,
      isPhraseOnScreen,
      dispose,
      closeReview,
      showReview,
      setAdaptiveTempo,
      setVarySettings,
      setTensionAcrossPhrases,
    },
    state,
    start,
    stop,
    dispose,
    closeReview,
    showReview,
    setAdaptiveTempo,
    setVarySettings,
    setTensionAcrossPhrases,
  }
}
