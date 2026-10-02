/**
 * The session controller's MIDI side: from the controller's creation to its disposal it follows
 * the MIDI controller's state and every played note. At Idle the one starting note starts a
 * session, through the controller's own start. A session reads the controller only if it was
 * connected at the start: its played notes are acknowledged and recorded in the history, once one
 * is played more than 30 s without another ends it, and losing the controller shows a 30-second
 * countdown that ends it unless the same device comes back (the silence count, if it had begun,
 * restarting from then). A session started without it never reads one, and the away
 * device reattaches only once that session ends. Every time is on the audio clock; every timer is
 * on the session's audio-time agenda. Loaded with the controller, never in the entry chunk.
 */
import { computed, shallowRef } from 'vue'

import type { AudioTransport } from '@/audio/audio-transport'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import type { ExpectedNoteIdentity } from '@/domain/acknowledgement/expected-note'
import { latencyCorrectionFor } from '@/domain/acknowledgement/played-onset-latency'
import type { ConcertEventTimeline } from '@/domain/events/timeline'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import type {
  MidiController,
  MidiControllerChange,
  MidiControllerState,
} from '@/midi/midi-controller-state'
import { toNoteOnOnAudioClock, type PlayedNoteEvent } from '@/midi/played-note-tracker'
import { createSessionAcknowledgement } from '@/session/session-acknowledgement'
import type { AudioTimeAgenda } from '@/session/session-agenda'
import type { SessionHistory } from '@/session/session-history'
import {
  countdownSecondsLeft,
  nextCountdownChangeAt,
  reconnectionExpired,
  silenceDeadline,
  silenceExpired,
} from '@/session/session-midi-timers'
import type { AudioTime, SessionEndCause } from '@/session/session-types'
import { isStartingNote, startingNoteOf, type StartingNote } from '@/session/starting-note'

/** A lost controller's countdown: the whole seconds left before the session ends, 30 down to 1. */
// @spec-link [[rule_controller_loss_mid_session]]
// @spec-link [[rule_controller_reconnection_window]]
export interface ControllerLostCountdown {
  readonly secondsLeft: number
}

/**
 * What the MIDI side reads from the controller: the MIDI controller and the audio transport, whether
 * the connection sheet is open and whether Start may be clicked (both reactive), the Idle result and
 * the written phrase the staff shows, and the controller's own start.
 */
// @spec-link [[rule_midi_starting_note]]
export interface SessionMidiDependencies {
  readonly midi: MidiController
  readonly audio: AudioTransport
  readonly connectionSheetOpen: () => boolean
  readonly canStart: () => boolean
  readonly idleResult: () => WorkspaceSessionResult | null
  readonly idlePhrase: () => WrittenPhrase | null
  readonly start: () => void
}

/**
 * What one session gives its MIDI side at its start: its tempo, phrase 1's concert timeline, its
 * history and agenda, how it ends for a cause (nothing once it has ended), and how a programming
 * error ends it loudly.
 */
// @spec-link [[rule_session_history_records_played_notes]]
export interface SessionMidiSeams {
  readonly tempo: number
  readonly phraseOne: ConcertEventTimeline
  readonly history: SessionHistory
  readonly agenda: AudioTimeAgenda
  readonly end: (cause: SessionEndCause) => void
  readonly fail: (error: unknown) => never
}

/**
 * One session's MIDI handling: `phraseReady` adds a readied phrase's expected notes,
 * `releaseHeld` ends every held note now (call it before the engine's end closes the history), and
 * `stop` ends the handling at the teardown.
 */
// @spec-link [[rule_acknowledgement_highlights_expected_note_only]]
export interface SessionMidiRun {
  readonly phraseReady: (phraseNumber: number, timeline: ConcertEventTimeline) => void
  readonly releaseHeld: () => void
  readonly stop: () => void
}

/** The MIDI side's reactive readings and its session hand-over. */
// @spec-link [[rule_midi_starting_note]]
export interface SessionMidi {
  readonly startingNote: () => StartingNote | null
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

  const startingNote = computed(() => {
    if (!deps.canStart() || midiState.value.kind !== 'connected' || deps.connectionSheetOpen())
      return null
    const result = deps.idleResult()
    const written = deps.idlePhrase()
    if (result === null || written === null) return null
    return startingNoteOf(result.outcome.result.timeline, written)
  })

  /** Intent: at Idle, start the session from the starting note, exactly as Start does. */
  // @spec-link [[rule_starting_note_only_starts_count_in]]
  function onIdleNote(event: PlayedNoteEvent): void {
    if (event.kind !== 'played') return
    const starting = startingNote.value
    if (starting === null || !isStartingNote(event.note, starting)) return
    startingOnset = event.note.onsetAt
    try {
      deps.start()
    } finally {
      startingOnset = null
    }
  }

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
    startingNote: () => startingNote.value,
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
      stopHearingNotes()
      stopFollowingState()
    },
  }
}

/** What a session with a controller writes to and reads from, besides its seams. */
interface ControllerSessionPorts {
  readonly audio: AudioTransport
  readonly midi: MidiController
  readonly controllerLost: { value: ControllerLostCountdown | null }
  readonly acknowledged: { value: readonly ExpectedNoteIdentity[] }
}

/**
 * Intent: one session with a controller. Phrase 1's notes are expected from its first downbeat and
 * each readied phrase's from its own. A played note re-arms the silence timer from its onset and
 * is matched once: a match is recorded and shown, anything else changes nothing; each finished
 * note is recorded latency-compensated (the USB correction). The silence timer is armed by the
 * starting note when it started the session, else by the first note played; before that, silence
 * never ends the session. A loss suspends it and counts 30 s down; the same device back clears the
 * countdown, passes over the notes that fell due while it was away (never acknowledged), and, only
 * if a note had armed the timer, re-arms it from then — otherwise it stays unarmed until the first
 * played note.
 */
// @spec-link [[rule_acknowledgement_highlights_expected_note_only]]
// @spec-link [[rule_session_history_records_played_notes]]
// @spec-link [[rule_played_onset_latency_compensation]]
// @spec-link [[rule_silence_timeout_ends_session]]
// @spec-link [[rule_controller_loss_mid_session]]
// @spec-link [[rule_controller_reconnection_window]]
function beginWithController(
  seams: SessionMidiSeams,
  startingOnset: AudioTime | null,
  ports: ControllerSessionPorts,
): { readonly listeners: SessionListeners; readonly run: SessionMidiRun } {
  const { audio, midi } = ports
  const acknowledgement = createSessionAcknowledgement({
    tempo: seams.tempo,
    correction: latencyCorrectionFor('usb'),
  })
  acknowledgement.addPhrase(1, seams.phraseOne, audio.phraseStartsAt(1))
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
   * it stays unacknowledged even if its window is still open.
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
    } else if (lostAt === null) {
      lostAt = audio.now()
      lossToken += 1
      silenceToken += 1
      showCountdown(lossToken, lostAt)
    }
  }

  /** Intent: acknowledge and re-arm on a played note; record a finished one. */
  function note(event: PlayedNoteEvent): void {
    if (event.kind === 'ended') {
      seams.history.recordPlayedNote(acknowledgement.compensatedRecord(event.note))
      return
    }
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
      phraseReady: (phraseNumber, timeline) =>
        acknowledgement.addPhrase(phraseNumber, timeline, audio.phraseStartsAt(phraseNumber)),
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
