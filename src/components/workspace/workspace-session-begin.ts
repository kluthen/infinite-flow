/**
 * The rest of a session's start, once the transport runs and phrase 1's backing is queued (the
 * in-click part is ./workspace-session-start.ts): the session becomes the running one and gets its
 * MIDI handling, its count-in row and staff, the count-in's end on the audio clock, the wake-ups
 * that fire its scheduled events, the rolling display (./workspace-session-display.ts), the steps
 * of phrases 2 on, the runner, and the watchers of its other ends.
 */
import { countInDisplayAt } from '@/session/count-in-display'
import type { ReadyPhrase } from '@/session/session-ready-phrases'
import type { AudioTime, SessionSettings } from '@/session/session-types'
import type { StaffLayout } from '@/notation/notation-layout-policy'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import { forwardPresence } from './workspace-adaptive-tempo'
import {
  dispatchAt,
  engineTime,
  type ActiveSession,
  type SessionControllerCore,
  type SessionControllerSides,
} from './workspace-session-active'
import { createSessionDisplay } from './workspace-session-display'
import { watchSessionEnds } from './workspace-session-end-watchers'
import type { SessionEnds } from './workspace-session-ends'
import { onSessionOutput } from './workspace-session-outputs'
import { createSessionPhrases } from './workspace-session-phrases'

/**
 * Intent: show the count-in row as it stands at audio time `at`, and schedule its next change
 * on the audio clock; the row empties once the count-in is over.
 */
// @spec-link [[rule_count_in_shown_on_screen]]
function showCountIn(core: SessionControllerCore, session: ActiveSession, at: AudioTime): void {
  const display = countInDisplayAt(session.timeline.startAt, session.startingTempo, at)
  if (display.over) {
    core.state.countIn = null
    return
  }
  core.state.countIn = display
  session.agenda.schedule(display.nextChangeAt, () =>
    showCountIn(core, session, display.nextChangeAt),
  )
}

/**
 * Intent: on each wake-up, fire every scheduled event the audio clock has reached. The timer is
 * stopped at every end, so a wake-up with no session is one already in flight: it has nothing to do.
 */
// @spec-link [[service_session_controller]]
function onWake(core: SessionControllerCore, ends: SessionEnds): void {
  const session = core.active
  if (session === null) return
  try {
    session.agenda.fireDue(core.deps.audio.now())
  } catch (error: unknown) {
    ends.failLoudly(session, error)
  }
}

/**
 * What the in-click part of a start settled: the session's settings and those phrase 1 was
 * generated under, the staff layout it holds, the written phrase Idle shows (phrase 1) and the
 * pre-generated phrases Start took.
 */
// @spec-link [[module_session_ready_phrases]]
export interface SessionBeginning {
  readonly settings: SessionSettings
  readonly phraseOneSettings: SessionSettings
  readonly heldLayout: StaffLayout
  readonly idleWritten: WrittenPhrase
  readonly readyPhrases: readonly ReadyPhrase[]
}

/**
 * Intent: the rest of a start, once the transport runs and phrase 1's backing is queued: make
 * `session` the running one, begin its MIDI handling (with or without the controller, fixed now),
 * show its count-in and its staff (phrase 1, the very phrase Idle shows), schedule the count-in's
 * end, start the wake-ups, the display's frame loop, the runner (from phrase 1 and its session
 * seed and the ready phrases Start took, checking fits through the display, reading it for what
 * is on screen, with the page's `Vary settings` choice) and the end watchers; the controls show the start settings. `start`
 * undoes it all if any of it throws.
 */
// @spec-link [[req_settings_mutation_flag]]
// @spec-link [[rule_count_in_shown_on_screen]]
// @spec-link [[rule_session_layout_fixed_at_start]]
// @spec-link [[rule_phrase_one_is_idle_phrase]]
// @spec-link [[rule_look_ahead_phrase_must_fit_staff]]
// @spec-link [[module_session_rolling_display]]
// @spec-link [[module_session_seed_plan]]
export function beginSession(
  core: SessionControllerCore,
  sides: SessionControllerSides,
  ends: SessionEnds,
  session: ActiveSession,
  begun: SessionBeginning,
): void {
  const { settings, phraseOneSettings, heldLayout, idleWritten, readyPhrases } = begun
  const { deps, state } = core
  const { audio, browser } = deps
  const { sessionMidi, adaptiveTempo, varySettings, tensionAcrossPhrases } = sides
  const { timeline, startingTempo, phraseOne } = session
  core.active = session
  state.phase = 'count-in'
  state.sessionTempo = startingTempo
  state.heldLayout = heldLayout
  state.strugglingNotice = false
  state.shownSettings = session.shown.current()
  session.midi = sessionMidi.beginSession({
    startingTempo,
    phraseOne: phraseOne.outcome.result.timeline,
    history: session.history,
    agenda: session.agenda,
    end: (cause) => ends.endIfRunning(session, cause),
    fail: (error) => ends.failLoudly(session, error),
    controllerPresence: forwardPresence(audio.now, (at, event) => dispatchAt(session, at, event)),
  })
  showCountIn(core, session, audio.now())
  session.agenda.schedule(timeline.countInEndsAt, () => {
    state.phase = 'running'
    state.countIn = null
    dispatchAt(session, timeline.countInEndsAt, { kind: 'count-in-over' })
  })
  const timer = (core.timer ??= deps.clock.createWakeTimer())
  timer.start(() => onWake(core, ends))
  core.startedTimer = timer
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
    fail: (error) => ends.failLoudly(session, error),
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
      phraseOneSettings,
      sessionSeed: phraseOne.sessionSeed,
      adaptiveTempo: adaptiveTempo.forSession(sessionMidi.sessionHasController()),
      varySettings: varySettings.on(),
      multiPhraseTensionArc: tensionAcrossPhrases.on(),
      readyPhrases,
    },
    checkFit: display.checkFit,
    display: { isPhraseOnScreen: display.isPhraseOnScreen },
    now: () => engineTime(session, audio.now()),
    onOutput: (output) => onSessionOutput(audio, state, session, output),
    onError: (error) => ends.failLoudly(session, error),
  })
  session.watch = watchSessionEnds({
    browser,
    idleLayout: deps.idleLayout,
    heldLayout,
    fixedParts: deps.staffFixedParts(phraseOne, idleWritten.clef),
    materialFits: display.materialFits,
    end: (cause) => ends.endIfRunning(session, cause),
    fail: (error) => ends.failLoudly(session, error),
  })
}
