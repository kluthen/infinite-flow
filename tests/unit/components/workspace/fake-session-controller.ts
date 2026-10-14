/**
 * A hand-driven session controller for the workspace component specs: its state is a reactive
 * object a test edits directly, and `start`/`stop`/`dispose` are spies that move the phase the
 * way the real controller does (the real one is covered by workspace-session-controller*.spec.ts).
 * As the real one, `start` hides the Review and keeps the most recent session, and `stop` opens a
 * Review, showing, once phrase 1 has sounded (over `fakeReviewHistory`), its session becoming the
 * most recent one; `closeReview` is a spy that flips its `showing`, and `showReview` one that shows
 * the most recent session held in memory (a kept one stays for the test to read, the spy resolving
 * false). `isPhraseOnScreen` answers from the session staff the test sets.
 */
import { shallowReactive } from 'vue'
import { vi, type Mock } from 'vitest'

import type {
  MostRecentSession,
  ReviewedHistory,
  SessionController,
  SessionControllerState,
  SessionKeeping,
  SessionReview,
} from '@/components/workspace/workspace-session-controller-types'
import { getInstrumentProfile } from '@/domain/generation/generation-intent'
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
  readonly showReview: Mock<() => Promise<boolean>>
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

/**
 * Intent: a frozen Review of `history`, showing or kept, its instrument named after the built-in
 * profile of the history's id, at tempo 90, not pinned unless `keeping` says otherwise.
 */
// @test-link [[req_last_session_review]]
export function fakeReview(
  history: SessionHistory,
  showing: boolean,
  keeping: SessionKeeping = 'not-pinned',
): SessionReview {
  return Object.freeze({
    history: history as ReviewedHistory,
    instrumentName: getInstrumentProfile(history.instrumentProfileId).displayName,
    tempoReached: 90,
    keeping,
    showing,
  })
}

/** Intent: the most recent session `review` draws, held in memory. */
// @test-link [[rule_most_recent_session_kept]]
export function heldSessionOf(review: SessionReview): MostRecentSession {
  const { history, instrumentName, tempoReached, keeping } = review
  return Object.freeze({
    kind: 'held',
    session: Object.freeze({ history, instrumentName, tempoReached, keeping }),
  })
}

/** Intent: the state fields of `review` showing: the Review, and its session the most recent one. */
export function showingWith(
  review: SessionReview,
): Pick<FakeSessionControllerState, 'review' | 'mostRecent'> {
  return { review, mostRecent: heldSessionOf(review) }
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
    mostRecent: null,
    readingMostRecent: false,
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
  /** Intent: open `review` at a session end: showing, its session the most recent one. */
  function opened(review: SessionReview): void {
    state.mostRecent = heldSessionOf(review)
    showing(review)
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
    if (phase === 'running') opened(fakeReview(fakeReviewHistory(), true))
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
  const showReview = vi.fn((): Promise<boolean> => {
    const recent = state.mostRecent
    if (recent === null) throw new Error('fake controller: no Review exists')
    if (recent.kind === 'kept') return Promise.resolve(false)
    showing(Object.freeze({ ...recent.session, showing: true }))
    return Promise.resolve(true)
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
