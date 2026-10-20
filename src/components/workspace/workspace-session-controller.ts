/**
 * The session controller: it owns the one practice session the workspace runs at a time, from the
 * player's Start click to its end, and exposes it to the screen as reactive state and two actions.
 * Start (./workspace-session-start.ts) unlocks the audio, asks for the screen locks and starts the
 * transport inside the click; from then on (./workspace-session-begin.ts) everything is driven by
 * the audio clock, through an injected wake-up timer that reads it: the count-in display, the
 * count-in's end, each phrase starting to sound, and the engine's deadlines. Every runner output
 * goes into the session's history (./workspace-session-outputs.ts); phrases from 2 on are shown at
 * `phrase-ready` and scheduled at their own tempo at `phrase-tempo`
 * (./workspace-session-phrases.ts). Its rolling display (./workspace-session-display.ts) gives the
 * screen the staff to draw, checks each look-ahead phrase's fit and moves the playhead once a
 * frame. Besides Stop, a session ends on an audio interruption, and on what its end watchers
 * report (the page hidden, the staff no longer shown or failing); every end takes the same path
 * (./workspace-session-ends.ts). An end once phrase 1 has sounded opens the Review
 * (./session-review-state.ts), makes that session the most recent one and asks Idle for the next
 * phrase; the next start hides the Review, and the most recent session stays until the next session
 * ends with a review. After a reload the most recent session is the latest readable kept one,
 * read from the device when it is shown (./workspace-kept-session-read.ts). The kept sessions'
 * rows are held for the visit and kept current (./use-kept-sessions.ts); the review mode's moves
 * (./workspace-kept-session-opening.ts) show the session list and open any kept session by its
 * key. Its MIDI side (./workspace-session-midi.ts) starts a session from the starting note and reads a
 * session's controller, whose presence its adaptive-tempo side (./workspace-adaptive-tempo.ts,
 * the page's flag) hands the engine. Its settings side (./workspace-session-settings.ts) holds the
 * page's `Vary settings` and `Tension across phrases` flags, which turn the engine's settings
 * mutations and multi-phrase tension arc on for a session, and the settings the read-only controls
 * show while a session runs; the engine reads the rolling display to know whether a phrase is on
 * screen. At Idle, while every start condition holds, its pre-generation queue
 * (./workspace-pregeneration.ts) makes the phrases after phrase 1 in the background, and each
 * start takes those ready. The parts share one core (./workspace-session-active.ts). The player's
 * own controls are never written, so every end shows them again. The player's saves are held from
 * an accepted start to its end, so a change made during a session is written when it ends. Its
 * `Keep my played notes` side (./workspace-kept-played-notes.ts) holds that setting, which each
 * end's save reads, and keeps or deletes a kept session's played notes after its save. Its side
 * of the Review's other changes (./workspace-kept-session-edits.ts) marks favorites, pins, sets
 * the comment and deletes the session, each at once in memory and saved when made, a session whose
 * own save failed by a retry of that save; `Delete every session`, from Your data
 * (./workspace-kept-sessions-deletion.ts), deletes them all, from the device then from memory.
 * It counts the kept sessions of my instrument for the batch that deletes or changes my instrument,
 * and makes them leave memory once it is saved (./workspace-my-instrument-sessions.ts).
 * While the visit saves, a kept session found damaged is deleted
 * (./workspace-damaged-session-deletions.ts): at load, by a clean-up run once this controller is
 * built, only when a summary the load read is damaged; at an opening; and by a session's own save.
 */
import { computed, shallowReactive, shallowReadonly, shallowRef } from 'vue'

import type { GenerationSessionState } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import { isRhythmSettingBlocked } from '@/domain/controls/unsupported-rhythm-settings'
import type { WindowShapeReading } from '@/session/session-browser-ports'
import type { SessionHistory } from '@/session/session-history'
import {
  sessionStartBlocker,
  type SessionStartBlocker,
  type SessionStartFacts,
} from '@/session/session-start-conditions'
import type { SessionSettings } from '@/session/session-types'
import { isPortraitBelowDesktop } from '@/session/session-window'
import type { StaffLayout } from '@/notation/notation-layout-policy'
import type { SessionStaff } from '@/components/notation/session-staff'
import type { StartingNote } from '@/session/starting-note'
import type { ExpectedNoteIdentity } from '@/domain/acknowledgement/expected-note'
import { useKeptSessions, type KeptSessionRow } from './use-kept-sessions'
import { createReviewMode } from './workspace-kept-session-opening'
import { mostRecentKept } from './workspace-kept-session-read'
import { createAdaptiveTempoFlag } from './workspace-adaptive-tempo'
import { createKeptPlayedNotes } from './workspace-kept-played-notes'
import { createKeptSessionEdits } from './workspace-kept-session-edits'
import { createEverySessionDeletion } from './workspace-kept-sessions-deletion'
import { createMyInstrumentSessions } from './workspace-my-instrument-sessions'
import { createDamagedSessionDeletions } from './workspace-damaged-session-deletions'
import type { SessionControllerCore, SessionControllerSides } from './workspace-session-active'
import { createSessionEnds } from './workspace-session-ends'
import {
  createTensionAcrossPhrasesFlag,
  createVarySettingsFlag,
} from './workspace-session-settings'
import { createSessionMidi, type ControllerLostCountdown } from './workspace-session-midi'
import { createSessionStart } from './workspace-session-start'
import { createStalePhraseStart, type StalePhrasePrompt } from './workspace-stale-phrase'
import type { WorkspacePregeneration } from './workspace-pregeneration'
import {
  SessionControllerError,
  type RunningCountIn,
  type SessionController,
  type SessionControllerDependencies,
  type SessionControllerPhase,
  type SessionEndSummary,
  type SessionReview,
} from './workspace-session-controller-types'

/**
 * Intent: the start facts the Idle state, the window and the controller give. A phrase is shown
 * once its result is engraved; any Idle generation (generate, regenerate, fit retries) or
 * notation in progress counts as running; the Review blocks only while it shows; no MIDI fact
 * exists.
 */
// @spec-link [[rule_session_start_conditions]]
// @spec-link [[rule_midi_never_blocks_session]]
// @spec-link [[req_last_session_review]]
function startFactsOf(
  idle: Readonly<GenerationSessionState<WorkspaceSessionResult>>,
  shape: WindowShapeReading,
  sessionActive: boolean,
  review: SessionReview | null,
  listShowing: boolean,
): SessionStartFacts {
  return {
    phraseShown: idle.result !== null && idle.resultEngraved,
    generationRunning: idle.operation !== 'idle' || idle.retriesRunning,
    notationError: idle.notationError !== null,
    generationFailureShown: idle.generationError !== null,
    rhythmUnsupported: isRhythmSettingBlocked(idle.controls, idle.noteDensityContext),
    orientationNoticeShown: isPortraitBelowDesktop(shape),
    roomNoticeShown: idle.roomNotice !== null,
    sessionActive,
    reviewShowing: review?.showing === true || listShowing,
  }
}

/**
 * Intent: build the Idle pre-generation queue's orchestrator over the controller's run conditions
 * (`startBlocker`), its two session flags, the Idle state, the window's shape and the staff's
 * reports. A programming error it meets has no session to end: it is thrown out of band, the
 * unhandled error it is.
 */
// @spec-link [[module_idle_pregeneration_queue]]
function createIdlePregeneration(
  deps: SessionControllerDependencies,
  startBlocker: () => SessionStartBlocker | null,
  flags: Pick<SessionControllerSides, 'varySettings' | 'tensionAcrossPhrases'>,
): WorkspacePregeneration {
  return deps.pregeneration({
    idle: deps.idle.state,
    startBlocker,
    varySettings: flags.varySettings.on,
    tensionAcrossPhrases: flags.tensionAcrossPhrases.on,
    windowShape: () => deps.browser.windowShape.read(),
    idleLayout: deps.idleLayout,
    loadPlanner: deps.staffFitPlanner,
    fail: (error) =>
      queueMicrotask(() => {
        throw error
      }),
  })
}

/**
 * Intent: build the session controller over the workspace's Idle state, audio transport, browser
 * ports and runner factory, its three "During a session" flags starting from the player's saved
 * choices. It reads the window's shape from creation (for the rotate-device start condition) and
 * listens to the MIDI controller (for the starting note) until `dispose`; it asks for no lock and
 * opens no audio until a start.
 */
// @spec-link [[service_session_controller]]
// @spec-link [[rule_first_phrase_waits_for_saved_settings]]
// @spec-link [[rule_session_start_conditions]]
// @spec-link [[rule_midi_never_blocks_session]]
// @spec-link [[rule_phrase_one_is_idle_phrase]]
// @spec-link [[module_key_and_mode_marks]]
export function createSessionController(deps: SessionControllerDependencies): SessionController {
  const { idle, audio, browser } = deps
  const windowShape = shallowRef(browser.windowShape.read())
  const stopReadingWindow = browser.windowShape.subscribe(() => {
    windowShape.value = browser.windowShape.read()
  })

  const rows = useKeptSessions(deps.keptSessions.summaries)
  const state = shallowReactive({
    phase: 'idle' as SessionControllerPhase,
    countIn: null as RunningCountIn | null,
    strugglingNotice: false,
    sessionTempo: null as number | null,
    heldLayout: null as StaffLayout | null,
    lastEnd: null as SessionEndSummary | null,
    lastHistory: null as SessionHistory | null,
    review: null as SessionReview | null,
    mostRecent: mostRecentKept(deps.keptSessions.summaries),
    readingMostRecent: false,
    listShowing: false,
    openingKey: null as string | null,
    sessionStaff: null as SessionStaff | null,
    latestReady: null as number | null,
    shownSettings: null as SessionSettings | null,
    startSettings: null as SessionSettings | null,
    stalePhrasePrompt: null as StalePhrasePrompt | null,
    get canStart(): boolean {
      return startBlocker.value === null
    },
    get startBlocker(): SessionStartBlocker | null {
      return startBlocker.value
    },
    get startingNote(): StartingNote | null {
      return sessionMidi.startingNote()
    },
    get startingNoteAwaitsClick(): boolean {
      return sessionMidi.startingNoteAwaitsClick()
    },
    get controllerLost(): ControllerLostCountdown | null {
      return sessionMidi.controllerLost()
    },
    get acknowledged(): readonly ExpectedNoteIdentity[] {
      return sessionMidi.acknowledged()
    },
    get sessionHasController(): boolean | null {
      return sessionMidi.sessionHasController()
    },
    get adaptiveTempo(): boolean {
      return adaptiveTempo.on()
    },
    get adaptiveTempoAvailable(): boolean {
      return adaptiveTempo.available()
    },
    get lastSessionReachedTempo(): number | null {
      return adaptiveTempo.lastSessionReachedTempo()
    },
    get varySettings(): boolean {
      return varySettings.on()
    },
    get tensionAcrossPhrases(): boolean {
      return tensionAcrossPhrases.on()
    },
    get keepPlayedNotes(): boolean {
      return keptPlayedNotes.on()
    },
    get savingOff(): boolean {
      return deps.keptSessions.savingOff()
    },
    get keptRows(): readonly KeptSessionRow[] {
      return rows.rows()
    },
    get keptSessionsUnreadable(): boolean {
      return deps.keptSessions.startedFromDefaults
    },
  })
  const core: SessionControllerCore = {
    deps,
    state,
    active: null,
    timer: null,
    startedTimer: null,
    disposed: false,
  }
  const startBlocker = computed(() =>
    sessionStartBlocker(
      startFactsOf(
        idle.state,
        windowShape.value,
        state.phase !== 'idle',
        state.review,
        state.listShowing,
      ),
    ),
  )
  const sessionMidi = createSessionMidi({
    midi: deps.midi,
    audio,
    pageActivation: deps.browser.pageActivation,
    // While the stale-phrase prompt shows, as while a sheet is open, no note starts anything.
    connectionSheetOpen: () => deps.connectionSheetOpen() || state.stalePhrasePrompt !== null,
    canStart: () => startBlocker.value === null,
    idleResult: () => idle.state.result,
    idlePhrase: deps.idlePhrase,
    start: () => void stalePhrase.request('note'),
  })
  const saved = deps.savedSessionOptions
  const adaptiveTempo = createAdaptiveTempoFlag(
    sessionMidi.controllerState,
    () => state.phase,
    saved.risingTempo,
  )
  const varySettings = createVarySettingsFlag(() => state.phase, saved.varySettings)
  const tensionAcrossPhrases = createTensionAcrossPhrasesFlag(
    () => state.phase,
    saved.tensionAcrossPhrases,
  )
  const pregeneration = createIdlePregeneration(deps, () => startBlocker.value, {
    varySettings,
    tensionAcrossPhrases,
  })
  const keptPlayedNotes = createKeptPlayedNotes(core, deps.savedKeepPlayedNotes, rows)
  const edits = createKeptSessionEdits(core, rows)
  const damagedSessions = createDamagedSessionDeletions(core, rows)
  const reviewMode = createReviewMode(core, rows, damagedSessions)
  const deleteEverySession = createEverySessionDeletion(core, rows, reviewMode.cancelOpening)
  const myInstrumentSessions = createMyInstrumentSessions(
    core,
    rows,
    reviewMode.cancelOpening,
    edits,
  )
  const ends = createSessionEnds(core, adaptiveTempo, keptPlayedNotes.on, edits.saveRefused, rows)
  const start = createSessionStart(
    core,
    { sessionMidi, adaptiveTempo, varySettings, tensionAcrossPhrases, pregeneration },
    ends,
    () => startBlocker.value,
  )
  const stalePhrase = createStalePhraseStart({
    idle: idle.state,
    state,
    startBlocker: () => startBlocker.value,
    start,
  })

  // Never awaited: a defect in the clean-up surfaces as the unhandled rejection it is.
  void damagedSessions.cleanUpAtLoad()

  return {
    state: shallowReadonly(state),
    start: () => stalePhrase.request('start'),
    useStalePhrase: stalePhrase.use,
    dismissStalePhrase: stalePhrase.dismiss,
    stop: () => ends.end('stop'),
    isPhraseOnScreen: (phraseNumber) => {
      if (!(Number.isInteger(phraseNumber) && phraseNumber >= 1)) {
        throw new SessionControllerError(`session controller: ${phraseNumber} is no phrase number`)
      }
      return core.active?.display?.isPhraseOnScreen(phraseNumber) ?? false
    },
    closeReview: reviewMode.closeReview,
    showReview: reviewMode.showReview,
    openSession: reviewMode.openSession,
    showList: reviewMode.showList,
    setKeepPlayedNotes: keptPlayedNotes.set,
    deletePlayedNotes: keptPlayedNotes.deleteShown,
    deleteEveryKeptPlayedNote: keptPlayedNotes.deleteEvery,
    setFavorite: edits.setFavorite,
    setPinned: edits.setPinned,
    setComment: edits.setComment,
    deleteSession: edits.deleteSession,
    deleteEverySession,
    myInstrumentSessions,
    setAdaptiveTempo: adaptiveTempo.set,
    setVarySettings: varySettings.set,
    setTensionAcrossPhrases: tensionAcrossPhrases.set,
    dispose: () => {
      if (core.disposed) throw new SessionControllerError('session controller: disposed twice')
      core.disposed = true
      // First, so a session ending now never makes pre-generation run.
      pregeneration.dispose()
      stalePhrase.dispose()
      if (core.active !== null) ends.end('stop')
      stopReadingWindow()
      sessionMidi.dispose()
      // No timer exists when no session ever started: there is no worker to free then.
      core.timer?.dispose()
    },
  }
}
