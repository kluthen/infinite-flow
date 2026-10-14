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
 * read from the device when it is shown (./workspace-kept-session-read.ts). Its MIDI side (./workspace-session-midi.ts) starts a session from the starting note and reads a
 * session's controller, whose presence its adaptive-tempo side (./workspace-adaptive-tempo.ts,
 * the page's flag) hands the engine. Its settings side (./workspace-session-settings.ts) holds the
 * page's `Vary settings` and `Tension across phrases` flags, which turn the engine's settings
 * mutations and multi-phrase tension arc on for a session, and the settings the read-only controls
 * show while a session runs; the engine reads the rolling display to know whether a phrase is on
 * screen. At Idle, while every start condition holds, its pre-generation queue
 * (./workspace-pregeneration.ts) makes the phrases after phrase 1 in the background, and each
 * start takes those ready. The parts share one core (./workspace-session-active.ts). The player's
 * own controls are never written, so every end shows them again. The player's saves are held from
 * an accepted start to its end, so a change made during a session is written when it ends.
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
import { assertReviewMayShow, closedReview, shownReview } from './session-review-state'
import { mostRecentKept, readKeptReviewedSession } from './workspace-kept-session-read'
import { createAdaptiveTempoFlag } from './workspace-adaptive-tempo'
import type { SessionControllerCore, SessionControllerSides } from './workspace-session-active'
import { createSessionEnds } from './workspace-session-ends'
import {
  createTensionAcrossPhrasesFlag,
  createVarySettingsFlag,
} from './workspace-session-settings'
import { createSessionMidi, type ControllerLostCountdown } from './workspace-session-midi'
import { createSessionStart } from './workspace-session-start'
import type { WorkspacePregeneration } from './workspace-pregeneration'
import {
  SessionControllerError,
  type RunningCountIn,
  type SessionController,
  type SessionControllerDependencies,
  type MostRecentSession,
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
    reviewShowing: review?.showing === true,
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
export function createSessionController(deps: SessionControllerDependencies): SessionController {
  const { idle, audio, browser } = deps
  const windowShape = shallowRef(browser.windowShape.read())
  const stopReadingWindow = browser.windowShape.subscribe(() => {
    windowShape.value = browser.windowShape.read()
  })

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
    sessionStaff: null as SessionStaff | null,
    latestReady: null as number | null,
    shownSettings: null as SessionSettings | null,
    get canStart(): boolean {
      return startBlocker.value === null
    },
    get startBlocker(): SessionStartBlocker | null {
      return startBlocker.value
    },
    get startingNote(): StartingNote | null {
      return sessionMidi.startingNote()
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
      startFactsOf(idle.state, windowShape.value, state.phase !== 'idle', state.review),
    ),
  )
  const sessionMidi = createSessionMidi({
    midi: deps.midi,
    audio,
    connectionSheetOpen: deps.connectionSheetOpen,
    canStart: () => startBlocker.value === null,
    idleResult: () => idle.state.result,
    idlePhrase: deps.idlePhrase,
    start: () => start(),
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
  const ends = createSessionEnds(core, adaptiveTempo)
  const start = createSessionStart(
    core,
    { sessionMidi, adaptiveTempo, varySettings, tensionAcrossPhrases, pregeneration },
    ends,
    () => startBlocker.value,
  )

  /** Intent: `Close review`: the Review stops showing and is kept; throws unless it shows. */
  // @spec-link [[req_last_session_review]]
  function closeReview(): void {
    state.review = closedReview(state.review)
  }

  /**
   * Intent: `Review last session`: the most recent session's Review shows, only at Idle; else
   * throws. One held in memory shows at once. A kept one is read first by its key, the read shown
   * as under way; once read it is held in memory and shows, unless a session started or the most
   * recent session changed meanwhile; a read the device refuses, or records this version cannot
   * read, show nothing. Resolves whether the Review shows.
   */
  // @spec-link [[req_last_session_review]]
  // @spec-link [[req_kept_session_review]]
  // @spec-link [[module_kept_session_save]]
  function showReview(): Promise<boolean> {
    const recent = assertReviewMayShow(
      state.mostRecent,
      state.review,
      state.phase,
      state.readingMostRecent,
    )
    if (recent.kind === 'held') {
      state.review = shownReview(recent.session)
      return Promise.resolve(true)
    }
    return showKept(recent)
  }

  /** Intent: read the kept most recent session `recent`, then show it if still in turn. */
  // @spec-link [[req_kept_session_review]]
  async function showKept(recent: Extract<MostRecentSession, { kind: 'kept' }>): Promise<boolean> {
    state.readingMostRecent = true
    let read
    try {
      read = await readKeptReviewedSession(deps.keptSessions.read, recent.key)
    } finally {
      state.readingMostRecent = false
    }
    if (read === null || state.mostRecent !== recent || state.phase !== 'idle') return false
    state.mostRecent = Object.freeze({ kind: 'held', session: read })
    state.review = shownReview(read)
    return true
  }

  return {
    state: shallowReadonly(state),
    start,
    stop: () => ends.end('stop'),
    isPhraseOnScreen: (phraseNumber) => {
      if (!(Number.isInteger(phraseNumber) && phraseNumber >= 1)) {
        throw new SessionControllerError(`session controller: ${phraseNumber} is no phrase number`)
      }
      return core.active?.display?.isPhraseOnScreen(phraseNumber) ?? false
    },
    closeReview,
    showReview,
    setAdaptiveTempo: adaptiveTempo.set,
    setVarySettings: varySettings.set,
    setTensionAcrossPhrases: tensionAcrossPhrases.set,
    dispose: () => {
      if (core.disposed) throw new SessionControllerError('session controller: disposed twice')
      core.disposed = true
      // First, so a session ending now never makes pre-generation run.
      pregeneration.dispose()
      if (core.active !== null) ends.end('stop')
      stopReadingWindow()
      sessionMidi.dispose()
      // No timer exists when no session ever started: there is no worker to free then.
      core.timer?.dispose()
    },
  }
}
