/**
 * The session controller: it owns the one practice session the workspace runs at a time, from the
 * player's Start click to its end, and exposes it to the screen as reactive state and two actions.
 * Start unlocks the audio, asks for the screen locks and starts the transport inside the click;
 * from then on everything is driven by the audio clock, through an injected wake-up timer that
 * reads it: the count-in display, the count-in's end, each phrase starting to sound, and the
 * engine's deadlines. Every runner output goes into the session's history; phrases from 2 on are
 * shown at `phrase-ready` and scheduled at their own tempo at `phrase-tempo`
 * (./workspace-session-phrases.ts). Its rolling display (./workspace-session-display.ts) gives the
 * screen the staff to draw, checks each look-ahead phrase's fit and moves the playhead once a
 * frame. Besides Stop, a session ends on an audio interruption, and on what its end watchers
 * report (the page hidden, the staff no longer shown or failing); every end takes the same path.
 * An end once phrase 1 has sounded opens the Review (./session-review-state.ts) and asks Idle for
 * the next phrase; the next start discards it. Its MIDI side (./workspace-session-midi.ts) starts
 * a session from the starting note and reads a session's controller, whose presence its
 * adaptive-tempo side (./workspace-adaptive-tempo.ts, the page's flag) hands the engine.
 */
import { computed, shallowReactive, shallowReadonly, shallowRef } from 'vue'

import type { GenerationSessionState } from '@/composables/use-generation-session'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import type { TransportTimeline } from '@/audio/audio-transport'
import type { DisposableWakeTimer, WakeTimer } from '@/audio/audio-ports'
import { isRhythmSettingBlocked } from '@/domain/controls/unsupported-rhythm-settings'
import { countInDisplayAt } from '@/session/count-in-display'
import { createAudioTimeAgenda, type AudioTimeAgenda } from '@/session/session-agenda'
import type { WindowShapeReading } from '@/session/session-browser-ports'
import { createSessionHistory, type SessionHistory } from '@/session/session-history'
import type { SessionRunner } from '@/session/session-runner'
import {
  sessionStartBlocker,
  type SessionStartBlocker,
  type SessionStartFacts,
} from '@/session/session-start-conditions'
import type {
  AudioTime,
  SessionEndCause,
  SessionOutput,
  SessionSettings,
} from '@/session/session-types'
import { isPortraitBelowDesktop, sessionLayoutAtStart } from '@/session/session-window'
import type { StaffLayout } from '@/notation/notation-layout-policy'
import type { SessionStaff } from '@/components/notation/session-staff'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import type { StartingNote } from '@/session/starting-note'
import type { ExpectedNoteIdentity } from '@/domain/acknowledgement/expected-note'
import { closedReview, openedReview, shownReview } from './session-review-state'
import { createSessionDisplay, type SessionDisplay } from './workspace-session-display'
import { createSessionPhrases, type SessionPhrases } from './workspace-session-phrases'
import { createAdaptiveTempoFlag, forwardPresence } from './workspace-adaptive-tempo'
import { watchSessionEnds, type SessionEndWatch } from './workspace-session-end-watchers'
import {
  createSessionMidi,
  type ControllerLostCountdown,
  type SessionMidiRun,
} from './workspace-session-midi'
import {
  SessionControllerError,
  type RunningCountIn,
  type SessionController,
  type SessionControllerDependencies,
  type SessionControllerPhase,
  type SessionEndSummary,
  type SessionReview,
  type UntimedEvent,
} from './workspace-session-controller-types'

/** The ended output, the one that closes a session. */
type EndedOutput = Extract<SessionOutput, { kind: 'ended' }>

/**
 * The running session: its timeline, starting tempo (phrase 1's and the count-in's, which its
 * settings keep), history, runner, agenda, display, phrase steps and audio-time floor.
 */
interface ActiveSession {
  readonly timeline: TransportTimeline
  readonly startingTempo: number
  readonly phraseOne: WorkspaceSessionResult
  readonly history: SessionHistory
  readonly agenda: AudioTimeAgenda
  runner: SessionRunner | null
  /** The latest time handed to the engine: its events must never go back in time. */
  floor: AudioTime
  /** The steps of phrases 2 on, from the start until the session is torn down. */
  phrases: SessionPhrases | null
  ended: EndedOutput | null
  /** The watchers of the session's other ends, once it is fully started. */
  watch: SessionEndWatch | null
  /** The rolling display, from the start until the session is torn down. */
  display: SessionDisplay | null
  /** The session's MIDI handling, from the start until the session is torn down. */
  midi: SessionMidiRun | null
}

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
 * Intent: build the session controller over the workspace's Idle state, audio transport, browser
 * ports and runner factory. It reads the window's shape from creation (for the rotate-device start
 * condition) and listens to the MIDI controller (for the starting note) until `dispose`; it asks
 * for no lock and opens no audio until a start.
 */
// @spec-link [[service_workspace_session_flow]]
// @spec-link [[rule_session_start_conditions]]
// @spec-link [[rule_midi_never_blocks_session]]
// @spec-link [[rule_phrase_one_is_idle_phrase]]
export function createSessionController(deps: SessionControllerDependencies): SessionController {
  const { idle, audio, browser } = deps
  const windowShape = shallowRef(browser.windowShape.read())
  const stopReadingWindow = browser.windowShape.subscribe(() => {
    windowShape.value = browser.windowShape.read()
  })
  /** The wake-up timer, built at the first start and disposed of with the controller. */
  let timer: DisposableWakeTimer | null = null
  /** The wake-up timer while it is started, from a start's wake-ups to that session's end. */
  let startedTimer: WakeTimer | null = null
  let active: ActiveSession | null = null
  let disposed = false
  let hearsInterruptions = false

  const state = shallowReactive({
    phase: 'idle' as SessionControllerPhase,
    countIn: null as RunningCountIn | null,
    strugglingNotice: false,
    sessionTempo: null as number | null,
    heldLayout: null as StaffLayout | null,
    lastEnd: null as SessionEndSummary | null,
    lastHistory: null as SessionHistory | null,
    review: null as SessionReview | null,
    sessionStaff: null as SessionStaff | null,
    latestReady: null as number | null,
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
  })
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
  const adaptiveTempo = createAdaptiveTempoFlag(sessionMidi.controllerState, () => state.phase)

  /** Intent: an audio time for the engine, never before one it already handled. */
  function engineTime(session: ActiveSession, at: AudioTime): AudioTime {
    session.floor = Math.max(session.floor, at)
    return session.floor
  }

  /** Intent: the running session's runner; reaching here before it exists is a wiring defect. */
  function runnerOf(session: ActiveSession): SessionRunner {
    if (session.runner === null) throw new Error('session controller: the runner is not built yet')
    return session.runner
  }

  /** Intent: the running session's phrase steps; reaching here before they exist is a wiring defect. */
  function phrasesOf(session: ActiveSession): SessionPhrases {
    if (session.phrases === null) throw new Error('session controller: no phrase steps yet')
    return session.phrases
  }

  /** Intent: send one transport event at `at` (raised to the floor) to the session's runner. */
  function dispatchAt(session: ActiveSession, at: AudioTime, event: UntimedEvent): void {
    runnerOf(session).dispatch({ ...event, at: engineTime(session, at) })
  }

  /**
   * Intent: show the count-in row as it stands at audio time `at`, and schedule its next change
   * on the audio clock; the row empties once the count-in is over.
   */
  // @spec-link [[rule_count_in_shown_on_screen]]
  function showCountIn(session: ActiveSession, at: AudioTime): void {
    const display = countInDisplayAt(session.timeline.startAt, session.startingTempo, at)
    if (display.over) {
      state.countIn = null
      return
    }
    state.countIn = display
    session.agenda.schedule(display.nextChangeAt, () => showCountIn(session, display.nextChangeAt))
  }

  /**
   * Intent: an output as the history keeps it: a phrase starting to sound is placed at its
   * scheduled start on the transport, where the phrases sit exactly back to back, not at the
   * engine's time, which the floor may have raised past it before the wake-up fired; every other
   * output is kept as it is.
   */
  // @spec-link [[rule_session_history_records_played_notes]]
  // @spec-link [[rule_played_notes_export_unquantized_timing]]
  function historyOutput(output: SessionOutput): SessionOutput {
    if (output.kind !== 'phrase-sounding') return output
    return { ...output, at: audio.phraseStartsAt(output.phrase.phraseNumber) }
  }

  /**
   * Intent: record one runner output in the history, a sounding phrase at its scheduled start,
   * then act on it: a phrase is shown when ready and scheduled at its tempo; the tempo shown
   * becomes each sounding phrase's own, the exact tempo in effect, while the Idle tempo control is
   * never written, so it shows the starting tempo again at the end.
   */
  // @spec-link [[rule_struggling_generator_notice]]
  // @spec-link [[rule_session_history_records_played_notes]]
  // @spec-link [[rule_played_notes_export_unquantized_timing]]
  // @spec-link [[service_workspace_session_flow]]
  function onOutput(session: ActiveSession, output: SessionOutput): void {
    session.history.record(historyOutput(output))
    if (output.kind === 'phrase-ready') phrasesOf(session).phraseReady(output.phrase)
    else if (output.kind === 'phrase-tempo')
      phrasesOf(session).phraseTempo(output.phraseNumber, output.tempo)
    else if (output.kind === 'phrase-sounding') state.sessionTempo = output.tempo
    else if (output.kind === 'struggling-notice') state.strugglingNotice = output.visible
    else if (output.kind === 'wake-at')
      session.agenda.schedule(output.at, () => dispatchAt(session, output.at, { kind: 'tick' }))
    else if (output.kind === 'ended') session.ended = output
  }

  /**
   * Intent: undo everything a start set up: no more wake-ups or scheduled events, the audio
   * faded out (unless the transport already ended its own session), both locks released, the
   * display's frame loop stopped and the staff left to Idle, the session state back to Idle, the
   * session's MIDI handling stopped (an away device held back is free to reattach), and,
   * last, the end watchers stopped, which hands the staff's reports back to the Idle machinery and
   * re-applies the latest of them. A start that failed
   * part-way passes the session only once it was built, and may not have started the timer or
   * the watchers yet: only what was set up is undone.
   */
  // @spec-link [[rule_stop_ends_session]]
  // @spec-link [[rule_screen_wake_lock_during_session]]
  // @spec-link [[rule_landscape_lock_during_session]]
  function tearDown(session: ActiveSession | null): void {
    session?.agenda.clear()
    startedTimer?.stop()
    startedTimer = null
    session?.display?.stop()
    if (audio.isRunning()) audio.stop()
    browser.wakeLock.release()
    browser.orientationLock.unlock()
    state.phase = 'idle'
    state.countIn = null
    state.strugglingNotice = false
    state.sessionTempo = null
    state.heldLayout = null
    state.sessionStaff = null
    state.latestReady = null
    session?.midi?.stop()
    session?.watch?.stop()
  }

  /**
   * Intent: end the running session for `cause`, the one path every end takes: the notes still
   * held end now and are recorded, the engine gets `end` (its `ended` output closes the history),
   * then the session is torn down and summed up. Once phrase 1 has sounded, the Review opens over
   * the closed history and, the reports handed back to Idle, Idle is asked for the next phrase;
   * an end during the count-in opens none and asks for nothing.
   * The session is dropped first, so nothing can end it twice; ending with none running throws.
   */
  // @spec-link [[rule_stop_ends_session]]
  // @spec-link [[req_last_session_review]]
  // @spec-link [[rule_session_end_generates_next_phrase_one]]
  function end(cause: SessionEndCause): void {
    const session = active
    if (session === null)
      throw new SessionControllerError('session controller: no session is running')
    active = null
    try {
      session.midi?.releaseHeld()
      dispatchAt(session, audio.now(), { kind: 'end', cause })
    } finally {
      tearDown(session)
    }
    const ended = session.ended
    if (ended === null) throw new Error('session controller: the engine did not report the end')
    state.lastEnd = Object.freeze({
      cause: ended.cause,
      phase: ended.phase,
      soundedPhraseCount: ended.soundedPhraseCount,
    })
    state.lastHistory = session.history
    if (ended.soundedPhraseCount === 0) return
    state.review = openedReview(session.history)
    void idle.actions.startFreshPhrase()
  }

  /**
   * Intent: surface a programming error loudly, as the workspace does with any unexpected error
   * (it propagates, uncaught): end `session` first if it is still the running one, so nothing keeps
   * sounding, then throw. A late error from an earlier session never ends a later one.
   */
  // @spec-link [[service_workspace_session_flow]]
  function failLoudly(session: ActiveSession, error: unknown): never {
    if (active === session) {
      try {
        end('stop')
      } catch (endError: unknown) {
        throw new AggregateError(
          [error, endError],
          'session controller: failed, then failed to end',
          { cause: endError },
        )
      }
    }
    throw error
  }

  /**
   * Intent: undo a start that threw part-way, then throw its error on: a runner already built gets
   * `end`, so its pending answers change nothing, and everything acquired is torn down as at any
   * end; no end summary is recorded, as the session never fully started. A failure while undoing
   * is thrown together with the start's.
   */
  // @spec-link [[service_workspace_session_flow]]
  // @spec-link [[rule_screen_wake_lock_during_session]]
  // @spec-link [[rule_landscape_lock_during_session]]
  function abandonStart(session: ActiveSession | null, error: unknown): never {
    active = null
    try {
      try {
        session?.midi?.releaseHeld()
        if (session !== null && session.runner !== null)
          dispatchAt(session, audio.now(), { kind: 'end', cause: 'stop' })
      } finally {
        tearDown(session)
      }
    } catch (undoError: unknown) {
      throw new AggregateError(
        [error, undoError],
        'session controller: a start failed, then failed to undo',
        { cause: undoError },
      )
    }
    throw error
  }

  /** Intent: end `session` for `cause` if it is still the running one; a later cause does nothing. */
  function endIfRunning(session: ActiveSession, cause: SessionEndCause): void {
    if (active === session) end(cause)
  }

  /**
   * Intent: listen, once for the controller's life, for the browser interrupting the audio (the
   * transport has no way to stop listening): it ends whichever session runs then, like Stop.
   */
  // @spec-link [[rule_stop_ends_session]]
  // @spec-link [[rule_session_never_pauses]]
  function hearInterruptions(): void {
    if (hearsInterruptions) return
    hearsInterruptions = true
    audio.onInterrupted(() => {
      if (active !== null) end('stop')
    })
  }

  /**
   * Intent: on each wake-up, fire every scheduled event the audio clock has reached. The timer is
   * stopped at every end, so a wake-up with no session is one already in flight: it has nothing to do.
   */
  function onWake(): void {
    const session = active
    if (session === null) return
    try {
      session.agenda.fireDue(audio.now())
    } catch (error: unknown) {
      failLoudly(session, error)
    }
  }

  /**
   * Intent: start a session from the Idle phrase, synchronously, inside the player's Start click
   * (or the starting note's MIDI callback, once a Connect-controller click has unlocked the audio):
   * unlock the audio, ask for the wake lock and the landscape lock (a refusal changes nothing, so
   * their outcomes are ignored), start the transport and queue phrase 1's backing; then lock the
   * current settings, hold the staff layout the window's width selects, open the history and
   * start the runner, the count-in display, the wake-ups and the end watchers. Throws, touching
   * nothing, while a start condition does not hold. An accepted start first discards the kept
   * Review, before anything else changes. Once the locks are asked for, it is all or nothing: a
   * throw from any later step undoes what was set up and throws on (`abandonStart`).
   */
  // @spec-link [[rule_new_session_discards_review]]
  // @spec-link [[rule_audio_unlocked_by_player_click]]
  // @spec-link [[rule_screen_wake_lock_during_session]]
  // @spec-link [[rule_landscape_lock_during_session]]
  // @spec-link [[rule_count_in_shown_on_screen]]
  // @spec-link [[rule_session_start_conditions]]
  // @spec-link [[rule_session_layout_fixed_at_start]]
  function start(): void {
    if (disposed) throw new SessionControllerError('session controller: disposed')
    const blocker = startBlocker.value
    const phraseOne = idle.state.result
    if (blocker !== null || phraseOne === null) {
      throw new SessionControllerError(`session controller: a session cannot start: ${blocker}`)
    }
    state.review = null
    const settings: SessionSettings = {
      controls: idle.state.controls,
      musicalProfile: idle.state.profileSelection,
    }
    const tempo = settings.controls.tempo
    const idleWritten = deps.idlePhrase()
    if (idleWritten === null) throw new Error('session controller: Idle shows no written phrase')
    const shape = browser.windowShape.read()
    const heldLayout = sessionLayoutAtStart(shape.widthPx, shape.remPx)
    audio.unlock()
    hearInterruptions()
    let session: ActiveSession | null = null
    try {
      void browser.wakeLock.request()
      void browser.orientationLock.lock()
      const timeline = audio.start({ tempo })
      audio.queueBacking(1, phraseOne.outcome.provenance.harmony.events, tempo)
      session = {
        timeline,
        startingTempo: tempo,
        phraseOne,
        history: createSessionHistory(settings, deps.clock.wallClock),
        agenda: createAudioTimeAgenda(),
        runner: null,
        floor: timeline.startAt,
        phrases: null,
        ended: null,
        watch: null,
        display: null,
        midi: null,
      }
      startSession(session, settings, heldLayout, idleWritten)
    } catch (error: unknown) {
      abandonStart(session, error)
    }
  }

  /**
   * Intent: the rest of a start, once the transport runs and phrase 1's backing is queued: make
   * `session` the running one, begin its MIDI handling (with or without the controller, fixed now),
   * show its count-in and its staff (phrase 1, the very phrase Idle shows), schedule the count-in's
   * end, start the wake-ups, the display's frame loop, the runner
   * (checking fits through the display) and the end watchers. `start` undoes it all if any of it
   * throws.
   */
  // @spec-link [[rule_count_in_shown_on_screen]]
  // @spec-link [[rule_session_layout_fixed_at_start]]
  // @spec-link [[rule_phrase_one_is_idle_phrase]]
  // @spec-link [[rule_look_ahead_phrase_must_fit_staff]]
  // @spec-link [[module_session_rolling_display]]
  function startSession(
    session: ActiveSession,
    settings: SessionSettings,
    heldLayout: StaffLayout,
    idleWritten: WrittenPhrase,
  ): void {
    const { timeline, startingTempo, phraseOne } = session
    active = session
    state.phase = 'count-in'
    state.sessionTempo = startingTempo
    state.heldLayout = heldLayout
    state.strugglingNotice = false
    session.midi = sessionMidi.beginSession({
      startingTempo,
      phraseOne: phraseOne.outcome.result.timeline,
      history: session.history,
      agenda: session.agenda,
      end: (cause) => endIfRunning(session, cause),
      fail: (error) => failLoudly(session, error),
      controllerPresence: forwardPresence(audio.now, (at, event) => dispatchAt(session, at, event)),
    })
    showCountIn(session, audio.now())
    session.agenda.schedule(timeline.countInEndsAt, () => {
      state.phase = 'running'
      state.countIn = null
      dispatchAt(session, timeline.countInEndsAt, { kind: 'count-in-over' })
    })
    timer ??= deps.clock.createWakeTimer()
    timer.start(onWake)
    startedTimer = timer
    const display = createSessionDisplay({
      audio,
      frames: deps.clock.frames,
      startingTempo,
      heldLayout,
      phraseOne: idleWritten,
      latestInputs: deps.idleLayout.latestInputs,
      loadPlanner: deps.staffFitPlanner,
      publish: (staff, latestReady) => {
        state.sessionStaff = staff
        state.latestReady = latestReady
      },
      fail: (error) => failLoudly(session, error),
    })
    session.display = display
    session.phrases = createSessionPhrases({
      audio,
      display,
      midi: session.midi,
      agenda: session.agenda,
      startedSounding: (phraseNumber, at) =>
        dispatchAt(session, at, { kind: 'phrase-started-sounding', phraseNumber }),
    })
    session.runner = deps.createSessionRunner({
      start: {
        at: timeline.startAt,
        settings,
        phraseOne: { intent: phraseOne.intent, outcome: phraseOne.outcome },
        adaptiveTempo: adaptiveTempo.forSession(state.sessionHasController),
      },
      checkFit: display.checkFit,
      now: () => engineTime(session, audio.now()),
      onOutput: (output) => onOutput(session, output),
      onError: (error) => failLoudly(session, error),
    })
    session.watch = watchSessionEnds({
      browser,
      idleLayout: deps.idleLayout,
      heldLayout,
      fixedParts: deps.staffFixedParts(phraseOne),
      materialFits: display.materialFits,
      end: (cause) => endIfRunning(session, cause),
      fail: (error) => failLoudly(session, error),
    })
  }

  /** Intent: `Close review`: the Review stops showing and is kept; throws unless it shows. */
  // @spec-link [[req_last_session_review]]
  function closeReview(): void {
    state.review = closedReview(state.review)
  }

  /** Intent: `Review last session`: the kept Review shows again, only at Idle; else throws. */
  // @spec-link [[req_last_session_review]]
  function showReview(): void {
    state.review = shownReview(state.review, state.phase)
  }

  return {
    state: shallowReadonly(state),
    start,
    stop: () => end('stop'),
    isPhraseOnScreen: (phraseNumber) => {
      if (!(Number.isInteger(phraseNumber) && phraseNumber >= 1)) {
        throw new SessionControllerError(`session controller: ${phraseNumber} is no phrase number`)
      }
      return active?.display?.isPhraseOnScreen(phraseNumber) ?? false
    },
    closeReview,
    showReview,
    setAdaptiveTempo: adaptiveTempo.set,
    dispose: () => {
      if (disposed) throw new SessionControllerError('session controller: disposed twice')
      disposed = true
      if (active !== null) end('stop')
      stopReadingWindow()
      sessionMidi.dispose()
      // No timer exists when no session ever started: there is no worker to free then.
      timer?.dispose()
    },
  }
}
