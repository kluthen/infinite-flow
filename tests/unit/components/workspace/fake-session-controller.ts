/**
 * A hand-driven session controller for the workspace component specs: its state is a reactive
 * object a test edits directly, and `start`/`stop`/`dispose` are spies that move the phase the
 * way the real controller does (the real one is covered by workspace-session-controller*.spec.ts).
 * As the real one, `start` hides the Review and keeps the most recent session, and `stop` opens a
 * Review, showing, once phrase 1 has sounded (over `fakeReviewHistory`), its session becoming the
 * most recent one; `closeReview` is a spy that flips its `showing`, and `showReview` one that shows
 * the most recent session held in memory (a kept one stays for the test to read, the spy resolving
 * false). `isPhraseOnScreen` answers from the session staff the test sets. `setKeepPlayedNotes`
 * sets the setting and resolves nothing to confirm unless the test mocks it; the two deletions
 * resolve deleted, the Review's session losing its played notes as the real one does.
 */
import { shallowReactive } from 'vue'
import { vi, type Mock } from 'vitest'

import { withoutPlayedNotes } from '@/components/workspace/session-review-state'
import type {
  KeepPlayedNotesSwitch,
  MostRecentSession,
  PlayedNotesDeletion,
  SessionDeletion,
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
  readonly setKeepPlayedNotes: Mock<(on: boolean) => Promise<KeepPlayedNotesSwitch>>
  readonly deletePlayedNotes: Mock<() => Promise<PlayedNotesDeletion>>
  readonly deleteEveryKeptPlayedNote: Mock<() => Promise<PlayedNotesDeletion>>
  readonly setFavorite: Mock<SessionController['setFavorite']>
  readonly setPinned: Mock<SessionController['setPinned']>
  readonly setComment: Mock<SessionController['setComment']>
  readonly deleteSession: Mock<SessionController['deleteSession']>
}

/** The key the fake's Reviews are kept under: the fixed test start and session seed. */
export const FAKE_REVIEW_KEY = `session-${SESSION_START_EPOCH_MS}-${DEFAULT_SESSION_SEED}`

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
 * profile of the history's id, at tempo 90, not pinned unless `keeping` says otherwise, under the
 * fake key, its played notes not kept unless `playedNotesKept` says so.
 */
// @test-link [[req_last_session_review]]
export function fakeReview(
  history: SessionHistory,
  showing: boolean,
  keeping: SessionKeeping = 'not-pinned',
  playedNotesKept = false,
): SessionReview {
  return Object.freeze({
    history: history as ReviewedHistory,
    instrumentName: getInstrumentProfile(history.instrumentProfileId).displayName,
    tempoReached: 90,
    keeping,
    key: FAKE_REVIEW_KEY,
    playedNotesKept,
    pinned: keeping === 'pinned',
    favorites: Object.freeze([]),
    comment: '',
    showing,
  })
}

/** Intent: the most recent session `review` draws, held in memory. */
// @test-link [[rule_most_recent_session_kept]]
export function heldSessionOf(review: SessionReview): MostRecentSession {
  const { history, instrumentName, tempoReached, keeping, key, playedNotesKept } = review
  const { pinned, favorites, comment } = review
  return Object.freeze({
    kind: 'held',
    session: Object.freeze({
      history,
      instrumentName,
      tempoReached,
      keeping,
      key,
      playedNotesKept,
      pinned,
      favorites,
      comment,
    }),
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
    startingNoteAwaitsClick: false,
    controllerLost: null,
    acknowledged: [],
    sessionHasController: null,
    adaptiveTempo: false,
    adaptiveTempoAvailable: false,
    lastSessionReachedTempo: null,
    varySettings: false,
    tensionAcrossPhrases: false,
    shownSettings: null,
    keepPlayedNotes: false,
    savingOff: false,
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
  const setKeepPlayedNotes = vi.fn((on: boolean): Promise<KeepPlayedNotesSwitch> => {
    state.keepPlayedNotes = on
    return Promise.resolve({ kind: 'done' })
  })
  /** Intent: the Review's session without its played notes, as after a deletion. */
  const deleted = (): Promise<PlayedNotesDeletion> => {
    const review = state.review
    if (review !== null) {
      state.review = Object.freeze({ ...withoutPlayedNotes(review), showing: review.showing })
    }
    return Promise.resolve('deleted')
  }
  const deletePlayedNotes = vi.fn(deleted)
  const deleteEveryKeptPlayedNote = vi.fn(deleted)
  /** Intent: apply `change` to the Review's session, as the controller does in memory. */
  const changed = (change: (review: SessionReview) => SessionReview): Promise<void> => {
    const review = state.review
    if (review !== null) state.review = Object.freeze(change(review))
    return Promise.resolve()
  }
  const setFavorite = vi.fn((_key: string, phraseNumber: number, favorite: boolean) =>
    changed((review) => {
      const others = review.favorites.filter((number) => number !== phraseNumber)
      const favorites = favorite ? [...others, phraseNumber].sort((a, b) => a - b) : others
      const pinned = review.pinned || favorite
      const keeping =
        review.keeping === 'not-saved' ? review.keeping : pinned ? 'pinned' : 'not-pinned'
      return { ...review, favorites, pinned, keeping }
    }),
  )
  const setPinned = vi.fn((_key: string, pinned: boolean) =>
    changed((review) => {
      const keeping =
        review.keeping === 'not-saved' ? review.keeping : pinned ? 'pinned' : 'not-pinned'
      return { ...review, pinned, keeping }
    }),
  )
  const setComment = vi.fn((_key: string, comment: string) =>
    changed((review) => ({ ...review, comment: comment.trim() })),
  )
  const deleteSession = vi.fn((): Promise<SessionDeletion> => {
    state.review = null
    state.mostRecent = null
    return Promise.resolve('deleted')
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
      setKeepPlayedNotes,
      deletePlayedNotes,
      deleteEveryKeptPlayedNote,
      setFavorite,
      setPinned,
      setComment,
      deleteSession,
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
    setKeepPlayedNotes,
    deletePlayedNotes,
    deleteEveryKeptPlayedNote,
    setFavorite,
    setPinned,
    setComment,
    deleteSession,
  }
}
