/**
 * A session controller's start without phrase 1, a fresh Jam's way in: the in-click part (as a
 * start's, but with the session seed drawn once at Start, no backing queued and the click forced
 * on) and the rest of its start (its MIDI handling with no phrase 1, its count-in row, the
 * wake-ups, the runner, the watchers of its ends), and the handle the code that runs it drives the
 * session through. That code shows its own staff and hands phrase 1 over; this module never names
 * it. Part of the session controller's chunk.
 */
import type { TransportTimeline } from '@/audio/audio-transport'
import type { Seed } from '@/domain/random/seed'
import type { InstrumentClef } from '@/domain/profile/instrument-clef'
import type { PlayedNoteEvent } from '@/midi/played-note-tracker'
import type { StaffLayout } from '@/notation/notation-layout-policy'
import { createAudioTimeAgenda } from '@/session/session-agenda'
import { createSessionHistory, type RecordedDoodle } from '@/session/session-history'
import type {
  PhraseOneEvent,
  SessionEndCause,
  SessionOutput,
  SessionSettings,
} from '@/session/session-types'
import { sessionLayoutAtStart } from '@/session/session-window'
import { forwardPresence } from './workspace-adaptive-tempo'
import {
  dispatchAt,
  engineTime,
  type ActiveSession,
  type SessionControllerCore,
  type SessionControllerSides,
} from './workspace-session-active'
import { showCountIn, startWakeUps } from './workspace-session-begin'
import { SessionControllerError, type UntimedEvent } from './workspace-session-controller-types'
import type { WorkspaceSessionRunnerInput } from './workspace-session-dependencies'
import { watchSessionEnds } from './workspace-session-end-watchers'
import type { SessionEnds } from './workspace-session-ends'
import { onSessionOutput } from './workspace-session-outputs'
import { createSessionShownSettings } from './workspace-session-settings'

/**
 * What a start without phrase 1 takes from the code that runs it (Jam's): the session's settings
 * and clef, where every note the session reads goes (the capture's port), the fit check of phrase
 * 1's attempts against the session staff layout, and where each engine output goes once the
 * controller has handled it.
 */
// @spec-link [[module_session_start_without_phrase_one]]
export interface StartWithoutPhraseOne {
  readonly settings: SessionSettings
  readonly clef: InstrumentClef
  readonly playedNotes: (event: PlayedNoteEvent) => void
  readonly checkFit: WorkspaceSessionRunnerInput['checkFit']
  readonly outputs: (output: SessionOutput) => void
}

/**
 * A session started without phrase 1, as the code that runs it drives it: its transport timeline
 * (the click plan's start, the count-in's end), its phrase 1 events (an attempt asked for, phrase
 * 1 handed over with the time it sounds, which also sets the forced click's end), stamped now on
 * the audio clock, its own ends (no note played, no phrase 1, the staff no longer shown), and the
 * doodle its capture ended, kept in the session's history with its raw notes marked; each a no-op
 * once the session has ended.
 */
// @spec-link [[module_session_start_without_phrase_one]]
// @spec-link [[rule_raw_doodle_notes_are_played_notes]]
export interface SessionWithoutPhraseOne {
  readonly timeline: TransportTimeline
  readonly dispatch: (event: UntimedEvent<PhraseOneEvent>) => void
  readonly end: (cause: SessionEndCause) => void
  readonly recordDoodle: (doodle: RecordedDoodle) => void
}

/**
 * What the in-click part of a start without phrase 1 settled: the caller's request, the staff
 * layout it holds and the session seed drawn at Start.
 */
// @spec-link [[module_session_start_without_phrase_one]]
export interface SessionBeginningWithoutPhraseOne {
  readonly request: StartWithoutPhraseOne
  readonly heldLayout: StaffLayout
  readonly sessionSeed: Seed
}

/**
 * Intent: the rest of a start without phrase 1, once the transport runs with its click forced on:
 * make `session` the running one, in its count-in phase until phrase 1 sounds; begin its MIDI
 * handling with no phrase 1, every note going to the caller's port too; show its count-in row;
 * start the wake-ups; start the runner from the session seed drawn at Start (none of session
 * mode's options, Vary settings, Tension across phrases and Rising tempo, runs in it), checking
 * phrase 1's fits through the caller, nothing on screen to read, each output handled and then
 * handed to the caller; and watch the hidden tab and the window's shape. No count-in-over is
 * scheduled: phrase 1 sounds when the caller says. Returns the caller's handle: its phrase 1
 * events stamped now (handing phrase 1 over also ends the forced click when phrase 1 sounds) and
 * its own ends, a no-op once the session has ended.
 */
// @spec-link [[module_session_start_without_phrase_one]]
// @spec-link [[rule_count_in_shown_on_screen]]
// @spec-link [[rule_jam_click_runs_until_phrase_one]]
// @spec-link [[rule_jam_silence_timer_from_phrase_one]]
export function beginSessionWithoutPhraseOne(
  core: SessionControllerCore,
  sides: SessionControllerSides,
  ends: SessionEnds,
  session: ActiveSession,
  begun: SessionBeginningWithoutPhraseOne,
): SessionWithoutPhraseOne {
  const { request, heldLayout, sessionSeed } = begun
  const { deps, state } = core
  const { audio, browser } = deps
  const { timeline, startingTempo } = session
  const end = (cause: SessionEndCause) => ends.endIfRunning(session, cause)
  const fail = (error: unknown) => ends.failLoudly(session, error)
  core.active = session
  state.phase = 'count-in'
  state.sessionTempo = startingTempo
  state.heldLayout = heldLayout
  state.strugglingNotice = false
  state.shownSettings = session.shown.current()
  state.startSettings = request.settings
  session.midi = sides.sessionMidi.beginSession({
    startingTempo,
    phraseOne: null,
    playedNotes: request.playedNotes,
    history: session.history,
    agenda: session.agenda,
    end,
    fail,
    controllerPresence: forwardPresence(audio.now, (at, event) => dispatchAt(session, at, event)),
  })
  showCountIn(core, session, audio.now())
  startWakeUps(core, ends)
  session.runner = deps.createSessionRunner({
    start: {
      at: timeline.startAt,
      settings: request.settings,
      sessionSeed,
      adaptiveTempo: false,
      multiPhraseTensionArc: false,
    },
    checkFit: request.checkFit,
    display: { isPhraseOnScreen: () => false },
    now: () => engineTime(session, audio.now()),
    onOutput: (output) => {
      onSessionOutput(audio, state, session, output)
      request.outputs(output)
    },
    onError: fail,
  })
  session.watch = watchSessionEnds({
    browser,
    idleLayout: deps.idleLayout,
    heldLayout,
    fixedParts: null,
    materialFits: () => Promise.resolve(true),
    end,
    fail,
  })
  return {
    timeline,
    dispatch: (event) => {
      if (core.active !== session) return
      if (event.kind === 'phrase-one') audio.forceClickUntil(event.soundsAt)
      dispatchAt(session, audio.now(), event)
    },
    end,
    recordDoodle: (doodle) => {
      if (core.active === session) session.history.recordDoodle(doodle)
    },
  }
}

/**
 * Intent: build one controller's start without phrase 1 over its core, sides and ends: refused,
 * touching nothing, while a session runs or no controller is connected (the code that runs it
 * judges its own start conditions first); otherwise, inside the Start click or the home note's
 * MIDI callback, it discards the kept Review, unlocks the audio, holds the player's saves until
 * the session ends, asks for both screen locks (their outcomes ignored), draws the session seed
 * once from the session-seed provider, before the count-in (there is no Idle result to take it
 * from, and nothing after Start draws one), starts the transport with the click forced on and no
 * backing queued, holds the staff layout the window's width selects, opens the history with that
 * seed and the caller's clef, and hands the session to the rest of its start
 * (./workspace-session-begin.ts). Once the saves are held it is all or nothing.
 */
// @spec-link [[module_session_start_without_phrase_one]]
// @spec-link [[module_session_seed_plan]]
// @spec-link [[rule_jam_click_runs_until_phrase_one]]
// @spec-link [[rule_jam_no_backing_before_phrase_one]]
// @spec-link [[rule_session_start_conditions]]
// @spec-link [[rule_session_layout_fixed_at_start]]
export function createSessionStartWithoutPhraseOne(
  core: SessionControllerCore,
  sides: SessionControllerSides,
  ends: SessionEnds,
): (request: StartWithoutPhraseOne) => SessionWithoutPhraseOne {
  const { deps, state } = core
  const { audio, browser } = deps

  return (request) => {
    if (core.disposed) throw new SessionControllerError('session controller: disposed')
    if (core.active !== null)
      throw new SessionControllerError('session controller: a session is already running')
    if (sides.sessionMidi.controllerState().kind !== 'connected')
      throw new SessionControllerError('session controller: no controller is connected')
    state.review = null
    const { settings } = request
    const tempo = settings.controls.tempo
    const shape = browser.windowShape.read()
    const heldLayout = sessionLayoutAtStart(shape.widthPx, shape.remPx)
    audio.unlock()
    ends.hearInterruptions()
    let session: ActiveSession | null = null
    deps.saveHold.hold()
    try {
      void browser.wakeLock.request()
      void browser.orientationLock.lock()
      const sessionSeed = deps.nextSessionSeed()
      const timeline = audio.start({ tempo, clickForced: true })
      session = {
        timeline,
        startingTempo: tempo,
        phraseOne: null,
        history: createSessionHistory(settings, deps.clock.wallClock, sessionSeed, request.clef),
        agenda: createAudioTimeAgenda(),
        runner: null,
        floor: timeline.startAt,
        phrases: null,
        ended: null,
        watch: null,
        display: null,
        midi: null,
        shown: createSessionShownSettings(settings, settings),
      }
      return beginSessionWithoutPhraseOne(core, sides, ends, session, {
        request,
        heldLayout,
        sessionSeed,
      })
    } catch (error: unknown) {
      return ends.abandonStart(session, error)
    }
  }
}
