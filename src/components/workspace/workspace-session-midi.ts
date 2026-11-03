/**
 * The session controller's MIDI side: from the controller's creation to its disposal it follows
 * the MIDI controller's state and every played note. At Idle the one starting note
 * (./workspace-session-starting-note.ts) starts a session through the controller's own start,
 * which asks first when phrase 1 is stale, but only once the audio can sound: unlocked
 * already (a Start or Connect controller click), or, after the page's first click, tap or key
 * press, made by the starting note itself; before that click it starts nothing, and the
 * starting-note line asks for it. A session reads the controller only if it was
 * connected at the start: its played notes are acknowledged and recorded in the history, once one
 * is played more than 30 s without another ends it, and losing the controller shows a 30-second
 * countdown that ends it unless the same device comes back (the silence count, if it had begun,
 * restarting from then). A session started without it never reads one, and the away
 * device reattaches only once that session ends. While session mode is held, the note route of
 * the code holding it (Jam's Idle note routing) says which note starts what it starts. A session
 * started without phrase 1 hands every note to its caller's port, arms the silence timer only on a
 * note played from phrase 1 on, and ends at once on a controller lost before phrase 1 sounds.
 * Every time is on the audio clock; every timer is on the session's audio-time agenda. Loaded with
 * the controller, never in the entry chunk.
 */
import { shallowRef } from 'vue'

import type { AudioTransport } from '@/audio/audio-transport'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import type { ExpectedNoteIdentity } from '@/domain/acknowledgement/expected-note'
import type { ConcertPitch } from '@/domain/events/concert-pitch'
import {
  compensatePlayedNote,
  latencyCorrectionFor,
  type LatencyCorrection,
} from '@/domain/acknowledgement/played-onset-latency'
import type { ConcertEventTimeline } from '@/domain/events/timeline'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import type {
  MidiController,
  MidiControllerChange,
  MidiControllerState,
} from '@/midi/midi-controller-state'
import {
  toNoteOnOnAudioClock,
  type PlayedNoteEvent,
  type PlayedNoteOn,
} from '@/midi/played-note-tracker'
import { createSessionAcknowledgement } from '@/session/session-acknowledgement'
import type { AudioTimeAgenda } from '@/session/session-agenda'
import type { SessionHistory } from '@/session/session-history'
import {
  countdownSecondsLeft,
  lossEndsAtOnceBeforePhraseOne,
  nextCountdownChangeAt,
  noteArmsSilenceBeforePhraseOne,
  reconnectionExpired,
  silenceDeadline,
  silenceExpired,
} from '@/session/session-midi-timers'
import type { PageActivation } from '@/session/session-browser-ports'
import type { AudioTime, SessionEndCause } from '@/session/session-types'
import { isStartingNote, type StartingNote } from '@/session/starting-note'
import { createIdleStartingNote } from './workspace-session-starting-note'

/**
 * The note route of the code holding session mode (Jam's Idle note routing): what a note at an
 * exact concert pitch means at Idle now, and the start a `start` note triggers.
 */
// @spec-link [[rule_midi_starting_note]]
export interface HeldModeNoteRoute {
  readonly meaningOf: (concertPitch: number) => 'start' | 'ignored'
  readonly start: () => void
}

/** A lost controller's countdown: the whole seconds left before the session ends, 30 down to 1. */
// @spec-link [[rule_controller_loss_mid_session]]
// @spec-link [[rule_controller_reconnection_window]]
export interface ControllerLostCountdown {
  readonly secondsLeft: number
}

/**
 * What the MIDI side reads from the controller: the MIDI controller and the audio transport, the
 * page's first click, tap or key press, whether a sheet or the stale-phrase prompt is open,
 * whether session mode is held and whether Start may be clicked (all reactive), the Idle result and the written phrase the staff
 * shows, and the controller's own start (which opens the prompt instead with a stale phrase 1).
 */
// @spec-link [[rule_midi_starting_note]]
export interface SessionMidiDependencies {
  readonly midi: MidiController
  readonly audio: AudioTransport
  readonly pageActivation: PageActivation
  /** A sheet (connection, My instrument, Your data) or the stale-phrase prompt is open. */
  readonly connectionSheetOpen: () => boolean
  /** Session mode is held (Jam mode opening or showing): no note starts a session. */
  readonly sessionModeHeld: () => boolean
  /** The note route of the code holding session mode; null while it routes none. */
  readonly heldModeNotes: () => HeldModeNoteRoute | null
  readonly canStart: () => boolean
  readonly idleResult: () => WorkspaceSessionResult | null
  readonly idlePhrase: () => WrittenPhrase | null
  readonly start: () => void
}

/**
 * What one session gives its MIDI side at its start: its starting tempo (phrase 1's), phrase 1's
 * concert timeline (null for a session started without phrase 1, whose phrase 1 comes through
 * `phraseReady`), its history and agenda, how it ends for a cause (nothing once it has ended),
 * how a programming error ends it loudly, where the controller's presence goes in a session
 * started with it: away at the loss that starts the countdown, back at its reattachment, and,
 * for a session started without phrase 1, the port every played note goes to as well, its times
 * latency-compensated as the history keeps them.
 */
// @spec-link [[rule_session_history_records_played_notes]]
// @spec-link [[rule_controller_loss_mid_session]]
export interface SessionMidiSeams {
  readonly startingTempo: number
  readonly phraseOne: ConcertEventTimeline | null
  readonly playedNotes?: (event: PlayedNoteEvent) => void
  readonly history: SessionHistory
  readonly agenda: AudioTimeAgenda
  readonly end: (cause: SessionEndCause) => void
  readonly fail: (error: unknown) => never
  readonly controllerPresence: (attached: boolean) => void
}

/**
 * One session's MIDI handling: `phraseReady` adds a phrase's expected notes at its tempo, once the
 * engine has fixed that tempo, `releaseHeld` ends every held note now (call it before the engine's end closes the history), and
 * `stop` ends the handling at the teardown.
 */
// @spec-link [[rule_acknowledgement_highlights_expected_note_only]]
export interface SessionMidiRun {
  readonly phraseReady: (
    phraseNumber: number,
    timeline: ConcertEventTimeline,
    tempo: number,
  ) => void
  readonly releaseHeld: () => void
  readonly stop: () => void
}

/** The MIDI side's reactive readings and its session hand-over. */
// @spec-link [[rule_midi_starting_note]]
export interface SessionMidi {
  /** The MIDI controller's state now. */
  readonly controllerState: () => MidiControllerState
  readonly startingNote: () => StartingNote | null
  /**
   * Whether the named starting note waits for the page's first click, tap or key press: true from
   * the load until then, while the audio is still locked; false while no note is named.
   */
  // @spec-link [[rule_midi_starting_note]]
  readonly startingNoteAwaitsClick: () => boolean
  /** Whether the page has had its first click, tap or key press since it loaded. */
  readonly pageActivated: () => boolean
  readonly controllerLost: () => ControllerLostCountdown | null
  readonly acknowledged: () => readonly ExpectedNoteIdentity[]
  readonly sessionHasController: () => boolean | null
  /** Begin the starting session's handling; one session at a time. */
  readonly beginSession: (seams: SessionMidiSeams) => SessionMidiRun
  readonly dispose: () => void
}

/** Where a running session's notes and controller changes go. */
interface SessionListeners {
  readonly note: (event: PlayedNoteEvent) => void
  readonly stateChanged: (state: MidiControllerState) => void
}

/** The acknowledged notes at Idle: one empty list, so Idle never re-renders for a new one. */
const NONE_ACKNOWLEDGED: readonly ExpectedNoteIdentity[] = Object.freeze([])

/** Intent: the smallest audio time strictly after `at`, for a check that must wait past it. */
function justAfter(at: AudioTime): AudioTime {
  return at + Math.max(Math.abs(at), 1) * Number.EPSILON
}

/**
 * Intent: build the controller's MIDI side, listening to the MIDI controller's state and notes at
 * once and until `dispose`. A note at Idle starts a session only when it is the starting note and
 * the starting note is named; any other note, or the starting note while nothing is named, does
 * nothing at all.
 */
// @spec-link [[rule_midi_starting_note]]
// @spec-link [[rule_starting_note_only_starts_count_in]]
export function createSessionMidi(deps: SessionMidiDependencies): SessionMidi {
  const { midi, audio } = deps
  const midiState = shallowRef(midi.state())
  const controllerLost = shallowRef<ControllerLostCountdown | null>(null)
  const acknowledged = shallowRef(NONE_ACKNOWLEDGED)
  const sessionHasController = shallowRef<boolean | null>(null)
  let listeners: SessionListeners | null = null
  /** The onset of the starting note while the start it triggered runs. */
  let startingOnset: AudioTime | null = null
  const idleStartingNote = createIdleStartingNote({ ...deps, midiState: () => midiState.value })

  /**
   * Intent: at Idle, the starting note played while the audio is still locked: after the page's
   * first click it makes the audio context (Chromium allows it once the page has had that click),
   * so the note is then read and starts the session; before that click, and for any other note,
   * nothing is made and the note is dropped.
   */
  // @spec-link [[rule_midi_starting_note]]
  function onUnclockedNote(pitch: ConcertPitch): void {
    if (listeners !== null || !idleStartingNote.pageActivated()) return
    if (deps.sessionModeHeld()) {
      if (deps.heldModeNotes()?.meaningOf(pitch) === 'start') audio.unlock()
      return
    }
    const starting = idleStartingNote.startingNote()
    if (starting === null || !isStartingNote({ pitch }, starting)) return
    audio.unlock()
  }

  /**
   * Intent: at Idle while session mode is held, a note the holding code's route means `start` by
   * starts what it starts; it arms no silence timer. Any other note does nothing.
   */
  // @spec-link [[rule_midi_starting_note]]
  // @spec-link [[rule_silence_timeout_ends_session]]
  function onHeldModeNote(event: PlayedNoteEvent): void {
    if (event.kind !== 'played') return
    const route = deps.heldModeNotes()
    if (route?.meaningOf(event.note.pitch) === 'start') route.start()
  }

  /**
   * Intent: at Idle, start the session from the starting note, exactly as Start does: with a stale
   * phrase 1 the controller's start opens the prompt instead, and nothing starts.
   */
  // @spec-link [[rule_starting_note_only_starts_count_in]]
  function onIdleNote(event: PlayedNoteEvent): void {
    if (deps.sessionModeHeld()) {
      onHeldModeNote(event)
      return
    }
    if (event.kind !== 'played') return
    const starting = idleStartingNote.startingNote()
    if (starting === null || !isStartingNote(event.note, starting)) return
    startingOnset = event.note.onsetAt
    try {
      deps.start()
    } finally {
      startingOnset = null
    }
  }

  const stopHearingUnclockedNotes = midi.onUnclockedNoteOn(onUnclockedNote)
  const stopHearingNotes = midi.onPlayedNote((event) => {
    if (listeners === null) onIdleNote(event)
    else listeners.note(event)
  })
  const stopFollowingState = midi.subscribe((change: MidiControllerChange) => {
    midiState.value = change.state
    listeners?.stateChanged(change.state)
  })

  /**
   * Intent: a session started while the controller is not connected reads no note and has no
   * timer; an away device is held from reattaching until the session ends.
   */
  // @spec-link [[rule_controllerless_session_never_gains_controller]]
  // @spec-link [[rule_start_while_controller_away]]
  function beginWithoutController(): SessionMidiRun {
    const held = midi.state().kind === 'away'
    if (held) midi.holdReattachment()
    sessionHasController.value = false
    // Every note and every controller change is ignored for the whole session, count-in included.
    listeners = { note: () => undefined, stateChanged: () => undefined }
    return {
      phraseReady: () => undefined,
      releaseHeld: () => undefined,
      stop: () => {
        listeners = null
        sessionHasController.value = null
        if (held) midi.releaseReattachment()
      },
    }
  }

  return {
    controllerState: () => midiState.value,
    startingNote: idleStartingNote.startingNote,
    startingNoteAwaitsClick: idleStartingNote.awaitsClick,
    pageActivated: idleStartingNote.pageActivated,
    controllerLost: () => controllerLost.value,
    acknowledged: () => acknowledged.value,
    sessionHasController: () => sessionHasController.value,
    beginSession: (seams) => {
      if (listeners !== null) throw new Error('session MIDI: a session is already being read')
      if (midi.state().kind !== 'connected') return beginWithoutController()
      const run = beginWithController(seams, startingOnset, {
        audio,
        midi,
        controllerLost,
        acknowledged,
      })
      listeners = run.listeners
      sessionHasController.value = true
      return {
        ...run.run,
        stop: () => {
          listeners = null
          run.run.stop()
          sessionHasController.value = null
        },
      }
    },
    dispose: () => {
      stopHearingUnclockedNotes()
      stopHearingNotes()
      stopFollowingState()
      idleStartingNote.dispose()
    },
  }
}

/**
 * Intent: a note-on with its onset latency-compensated as the history's finished notes are, so
 * the caller's port reads the very onset the history keeps for it.
 */
// @spec-link [[rule_played_onset_latency_compensation]]
function compensatedNoteOn(note: PlayedNoteOn, correction: LatencyCorrection): PlayedNoteOn {
  const { onsetSeconds } = compensatePlayedNote(toNoteOnOnAudioClock(note), correction)
  return Object.freeze({ ...note, onsetAt: onsetSeconds })
}

/** What a session with a controller writes to and reads from, besides its seams. */
interface ControllerSessionPorts {
  readonly audio: AudioTransport
  readonly midi: MidiController
  readonly controllerLost: { value: ControllerLostCountdown | null }
  readonly acknowledged: { value: readonly ExpectedNoteIdentity[] }
}

/**
 * Intent: one session with a controller. Phrase 1's notes are expected from its first downbeat at
 * the starting tempo and each later phrase's from its own, at its own tempo. A played note re-arms the silence timer from its onset and
 * is matched once: a match is recorded and shown, anything else changes nothing; each finished
 * note is recorded latency-compensated (the USB correction). The silence timer is armed by the
 * starting note when it started the session, else by the first note played; before that, silence
 * never ends the session. A loss suspends it and counts 30 s down; the same device back clears the
 * countdown, passes over the notes that fell due while it was away (never acknowledged), and, only
 * if a note had armed the timer, re-arms it from then — otherwise it stays unarmed until the first
 * played note. A session started without phrase 1 hands every note to its caller's port, adds
 * phrase 1's notes once phrase 1 is ready, arms the silence timer only from phrase 1 on, and ends
 * at once on a loss before phrase 1 sounds.
 */
// @spec-link [[rule_acknowledgement_highlights_expected_note_only]]
// @spec-link [[rule_silence_timeout_ends_session]]
// @spec-link [[rule_controller_loss_mid_session]]
// @spec-link [[rule_session_history_records_played_notes]]
// @spec-link [[rule_played_onset_latency_compensation]]
// @spec-link [[rule_controller_reconnection_window]]
function beginWithController(
  seams: SessionMidiSeams,
  startingOnset: AudioTime | null,
  ports: ControllerSessionPorts,
): { readonly listeners: SessionListeners; readonly run: SessionMidiRun } {
  const { audio, midi } = ports
  const correction = latencyCorrectionFor('usb')
  const acknowledgement = createSessionAcknowledgement({ correction })
  const withoutPhraseOne = seams.phraseOne === null
  if (seams.phraseOne !== null)
    acknowledgement.addPhrase(1, seams.phraseOne, audio.phraseStartsAt(1), seams.startingTempo)
  /** In a session started without phrase 1: when phrase 1 sounds, once it is ready; null before. */
  let phraseOneAt: AudioTime | null = null
  /** Bumped at each re-arm, suspension and stop: a check scheduled before it does nothing. */
  let silenceToken = 0
  /** Bumped at each loss, reattachment and stop: a countdown change scheduled before it does nothing. */
  let lossToken = 0
  let lostAt: AudioTime | null = null
  /** Whether a played note (the starting note included) has armed the silence timer yet. */
  let silenceArmed = false

  /** Intent: count 30 s of silence from `from`, dropping any earlier count. */
  function armSilence(from: AudioTime): void {
    silenceArmed = true
    silenceToken += 1
    checkSilenceAt(silenceToken, from, silenceDeadline(from))
  }

  /** Intent: at `at`, end the session if more than 30 s passed since `from`, else check again just after. */
  function checkSilenceAt(token: number, from: AudioTime, at: AudioTime): void {
    seams.agenda.schedule(at, () => {
      if (token !== silenceToken) return
      const now = audio.now()
      if (silenceExpired(from, now)) seams.end('silence-timeout')
      else checkSilenceAt(token, from, justAfter(now))
    })
  }

  /** Intent: show the countdown as it stands now and schedule its next change, or end at zero. */
  function showCountdown(token: number, since: AudioTime): void {
    const now = audio.now()
    if (reconnectionExpired(since, now)) {
      seams.end('controller-lost')
      return
    }
    ports.controllerLost.value = Object.freeze({ secondsLeft: countdownSecondsLeft(since, now) })
    seams.agenda.schedule(nextCountdownChangeAt(since, now), () => {
      if (token === lossToken) showCountdown(token, since)
    })
  }

  /**
   * Intent: follow the controller: lost when it stops being connected, back when it is again. Back,
   * every note that fell due between the loss and now is passed over before the silence re-arms:
   * it stays unacknowledged even if its window is still open. Each loss and return is reported
   * through `controllerPresence`, once the countdown is shown or cleared.
   */
  // @spec-link [[rule_controller_loss_mid_session]]
  function stateChanged(state: MidiControllerState): void {
    if (state.kind === 'connected') {
      if (lostAt === null) return
      acknowledgement.passDueBetween(lostAt, audio.now())
      lostAt = null
      lossToken += 1
      ports.controllerLost.value = null
      if (silenceArmed) armSilence(audio.now())
      seams.controllerPresence(true)
    } else if (withoutPhraseOne && lossEndsAtOnceBeforePhraseOne(audio.now(), phraseOneAt)) {
      seams.end('controller-lost')
    } else if (lostAt === null) {
      lostAt = audio.now()
      lossToken += 1
      silenceToken += 1
      showCountdown(lossToken, lostAt)
      seams.controllerPresence(false)
    }
  }

  /**
   * Intent: hand the note to the caller's port latency-compensated, on the times the history keeps,
   * then acknowledge and re-arm on a played note (before phrase 1 sounds, in a session started
   * without it, no note arms); record a finished one.
   */
  function note(event: PlayedNoteEvent): void {
    if (event.kind === 'ended') {
      const record = acknowledgement.compensatedRecord(event.note)
      seams.playedNotes?.({ kind: 'ended', note: record })
      seams.history.recordPlayedNote(record)
      return
    }
    seams.playedNotes?.({ kind: 'played', note: compensatedNoteOn(event.note, correction) })
    if (!withoutPhraseOne || noteArmsSilenceBeforePhraseOne(event.note.onsetAt, phraseOneAt))
      armSilence(event.note.onsetAt)
    const matched = acknowledgement.notePlayed(toNoteOnOnAudioClock(event.note))
    if (matched.length === 0) return
    matched.forEach((identity) => seams.history.recordAcknowledgement(identity))
    ports.acknowledged.value = acknowledgement.acknowledged()
  }

  /** Intent: run a listener, ending the session loudly on a programming error. */
  function guarded<T>(listener: (value: T) => void): (value: T) => void {
    return (value) => {
      try {
        listener(value)
      } catch (error: unknown) {
        seams.fail(error)
      }
    }
  }

  if (startingOnset !== null) armSilence(startingOnset)
  return {
    listeners: { note: guarded(note), stateChanged: guarded(stateChanged) },
    run: {
      phraseReady: (phraseNumber, timeline, tempo) => {
        const startsAt = audio.phraseStartsAt(phraseNumber)
        if (withoutPhraseOne && phraseNumber === 1) phraseOneAt = startsAt
        acknowledgement.addPhrase(phraseNumber, timeline, startsAt, tempo)
      },
      releaseHeld: () => {
        midi.releaseHeld(audio.now())
      },
      stop: () => {
        silenceToken += 1
        lossToken += 1
        ports.controllerLost.value = null
        ports.acknowledged.value = NONE_ACKNOWLEDGED
      },
    },
  }
}
