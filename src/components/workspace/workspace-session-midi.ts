/**
 * The session controller's MIDI side: from the controller's creation to its disposal it follows
 * the MIDI controller's state and every played note. At Idle the one starting note
 * (./workspace-session-starting-note.ts) starts a session through the controller's own start,
 * which asks first when phrase 1 is stale, but only once the audio can sound: unlocked
 * already (a Start or Connect controller click), or, after the page's first click, tap or key
 * press, made by the starting note itself; before that click it starts nothing, and the
 * starting-note line asks for it. A session reads the controller only if it was
 * connected at the start (./workspace-session-midi-run.ts handles such a session: its notes
 * acknowledged and recorded, its silence timeout, its controller-loss countdown). A session
 * started without it never reads one, and the away device reattaches only once that session
 * ends. While session mode is held, the note route of the code holding it (Jam's Idle note
 * routing) hears every note and says which note starts what it starts (none while tap tempo
 * listens, every note then a tap). Loaded with the controller, never in the entry chunk.
 */
import { shallowRef } from 'vue'

import type { AudioTransport } from '@/audio/audio-transport'
import type { WorkspaceSessionResult } from '@/composables/workspace-session-result'
import type { ExpectedNoteIdentity } from '@/domain/acknowledgement/expected-note'
import type { ConcertPitch } from '@/domain/events/concert-pitch'
import type { WrittenPhrase } from '@/domain/notation/written-phrase-types'
import type {
  MidiController,
  MidiControllerChange,
  MidiControllerState,
} from '@/midi/midi-controller-state'
import type { PlayedNoteEvent } from '@/midi/played-note-tracker'
import type { PageActivation } from '@/session/session-browser-ports'
import type { AudioTime } from '@/session/session-types'
import { isStartingNote, type StartingNote } from '@/session/starting-note'
import {
  beginWithController,
  NONE_ACKNOWLEDGED,
  type ControllerLostCountdown,
  type SessionListeners,
  type SessionMidiRun,
  type SessionMidiSeams,
} from './workspace-session-midi-run'
import { createIdleStartingNote } from './workspace-session-starting-note'

export type {
  ControllerLostCountdown,
  SessionMidiRun,
  SessionMidiSeams,
} from './workspace-session-midi-run'

/**
 * The note route of the code holding session mode (Jam's Idle note routing): what a note at an
 * exact concert pitch means at Idle now (a tap while tap tempo listens), the start a `start` note
 * triggers, and where every note's event at Idle goes first (its taps).
 */
// @spec-link [[rule_midi_starting_note]]
// @spec-link [[rule_jam_tap_in_listening]]
export interface HeldModeNoteRoute {
  readonly meaningOf: (concertPitch: number) => 'start' | 'tap' | 'ignored'
  readonly start: () => void
  readonly hear: (event: PlayedNoteEvent) => void
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
   * Intent: at Idle while session mode is held, every note's event, played or ended, goes to the
   * holding code's route first (a tap while tap tempo listens); then a played note the route means
   * `start` by starts what it starts. As session mode's starting note, it arms the silence timer
   * of a session it starts with phrase 1 (a Jam on the kept doodle, started on phrase 1's first
   * note), and none of one started without phrase 1 (a fresh Jam's home note). Any other note,
   * a tap included, starts nothing.
   */
  // @spec-link [[rule_midi_starting_note]]
  // @spec-link [[rule_silence_timeout_ends_session]]
  // @spec-link [[rule_jam_tap_in_listening]]
  function onHeldModeNote(event: PlayedNoteEvent): void {
    const route = deps.heldModeNotes()
    if (route === null) return
    route.hear(event)
    if (event.kind !== 'played') return
    if (route.meaningOf(event.note.pitch) !== 'start') return
    startingOnset = event.note.onsetAt
    try {
      route.start()
    } finally {
      startingOnset = null
    }
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
