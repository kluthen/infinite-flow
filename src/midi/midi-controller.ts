/**
 * The MIDI controller: the one MIDI input the app reads, from asking for MIDI access to the notes
 * played on it. Access is only requested when the player connects a controller. Exactly one input
 * is read at a time: the player's pick, or the only device present; several inputs are never
 * merged, and every other port is never opened nor listened to. Its state is derived, on every
 * input change, from permission, selection and the selected port's own state; every state is a
 * normal, non-blocking one. The selection lives in memory only and survives an unplug: the same
 * port coming back is reattached by itself, and a different device is never picked up that way.
 * Notes are read on every channel, mapped onto the audio clock through a fresh clock anchor per
 * message, kept in the port's message order, and tracked into played and ended notes.
 */

import type { ClockAnchor } from '../audio/audio-ports'
import type { AudioTime } from '../session/session-types'
import type {
  MidiAccessPort,
  MidiAccessProvider,
  MidiAccessRequest,
  MidiInputPort,
} from './midi-access-port'
import { midiTimestampToAudioTime } from './midi-clock-mapping'
import {
  MidiControllerError,
  type MidiController,
  type MidiControllerChange,
  type MidiControllerState,
  type MidiDevice,
} from './midi-controller-state'
import { parseMidiMessage } from './midi-message'
import {
  createPlayedNoteTracker,
  type PlayedNoteEvent,
  type PlayedNoteEvents,
} from './played-note-tracker'

export type { MidiController }

/** What the controller needs: where MIDI access comes from, and the audio clock's anchor. */
// @spec-link [[req_midi_controller_input]]
export interface MidiControllerDeps {
  readonly provider: MidiAccessProvider
  readonly clock: { readonly anchor: () => ClockAnchor }
}

/** Where the MIDI access request stands; once `granted`, the selection decides the state. */
type AccessPhase = 'unsupported' | 'not-requested' | 'requesting' | 'denied' | 'granted'

/**
 * Intent: create the MIDI controller, `unsupported` when the provider says this browser has no
 * Web MIDI, else `not-requested`. Nothing is requested until `connect()`.
 * - connect: requests access from `not-requested` or `denied`, then selects the only device
 *   present if nothing is selected yet; an existing selection is kept. Throws from `requesting`
 *   or `unsupported`. A rejected request restores the stage it started from, then propagates.
 * - select: selects a present input by id (replacing any selection), listens to it and opens it.
 * - releaseHeld: ends every held note at `at` (the session end), and reports it.
 * Subscribers hear every change of state or of the present devices; note listeners hear every
 * played and ended note. Both are called synchronously, in subscription order.
 */
// @spec-link [[req_midi_controller_input]]
// @spec-link [[rule_controller_attached_definition]]
// @spec-link [[rule_controller_connects_between_sessions]]
// @spec-link [[rule_midi_never_blocks_session]]
export function createMidiController(deps: MidiControllerDeps): MidiController {
  const { provider, clock } = deps
  const tracker = createPlayedNoteTracker()
  const changeListeners = createListeners<MidiControllerChange>()
  const noteListeners = createListeners<PlayedNoteEvent>()
  const listened = new WeakSet<MidiInputPort>()
  let phase: AccessPhase = provider.isSupported() ? 'not-requested' : 'unsupported'
  let access: MidiAccessPort | undefined
  let selected: MidiInputPort | undefined
  let openToken = 0
  let openInFlight = false
  let lastMappedAt: AudioTime | undefined
  let lastReported = changeKey(snapshot())

  /**
   * Intent: derive the state from the access phase, the selection and the selected port. A selected
   * port that is present but not open with no open in flight (its open failed) is `away`, like an
   * unplugged one: the controller is not attached, and the port's next input change retries.
   */
  function state(): MidiControllerState {
    if (phase !== 'granted') return Object.freeze({ kind: phase })
    if (selected === undefined) {
      return Object.freeze({ kind: devices().length === 0 ? 'no-device' : 'choosing' })
    }
    const device = toDevice(selected)
    if (selected.state() === 'disconnected') return Object.freeze({ kind: 'away', device })
    if (openInFlight) return Object.freeze({ kind: 'opening', device })
    if (selected.connection() !== 'open') return Object.freeze({ kind: 'away', device })
    return Object.freeze({ kind: 'connected', device })
  }

  /** Intent: the present inputs as device snapshots; none before access is granted. */
  function devices(): readonly MidiDevice[] {
    if (access === undefined) return Object.freeze([])
    return Object.freeze(access.inputs().map(toDevice))
  }

  /** Intent: the current state and devices, as subscribers are told them. */
  function snapshot(): MidiControllerChange {
    return Object.freeze({ state: state(), devices: devices() })
  }

  /** Intent: tell subscribers the current snapshot, only when it differs from the last one told. */
  function report(): void {
    const change = snapshot()
    const key = changeKey(change)
    if (key === lastReported) return
    lastReported = key
    changeListeners.emit(change)
  }

  /** Intent: hand tracker events to the note listeners, and return them. */
  function emitNotes(events: PlayedNoteEvents): PlayedNoteEvents {
    events.forEach((event) => noteListeners.emit(event))
    return events
  }

  /** Intent: end every held note at `at`, and report the ended notes. */
  function releaseHeld(at: AudioTime): PlayedNoteEvents {
    return emitNotes(tracker.releaseAll(at))
  }

  /** Intent: the granted access, or a typed failure for a call that needs it before it exists. */
  function grantedAccess(action: string): MidiAccessPort {
    if (access === undefined) {
      throw new MidiControllerError(`Cannot ${action}: MIDI access is ${phase}, not granted.`)
    }
    return access
  }

  /** Intent: request MIDI access (the only place that does), then pick the only device. */
  async function connect(): Promise<void> {
    if (phase === 'unsupported' || phase === 'requesting') {
      throw new MidiControllerError(`Cannot connect a controller while MIDI access is ${phase}.`)
    }
    if (phase === 'not-requested' || phase === 'denied') {
      const result = await requestAccess(phase)
      if (result.kind !== 'granted') {
        phase = result.kind
        report()
        return
      }
      access = result.access
      phase = 'granted'
      access.onInputStateChange(onInputStateChange)
    }
    await selectTheOnlyDevice()
  }

  /**
   * Intent: ask the provider for access, `requesting` meanwhile. A rejected request is no state of
   * its own: the stage goes back to `before` (reported), and the same error propagates, so a later
   * connect() can ask again.
   */
  async function requestAccess(before: 'not-requested' | 'denied'): Promise<MidiAccessRequest> {
    phase = 'requesting'
    report()
    try {
      return await provider.request()
    } catch (error) {
      phase = before
      report()
      throw error
    }
  }

  /** Intent: with nothing selected and exactly one input present, select it; else just report. */
  async function selectTheOnlyDevice(): Promise<void> {
    const inputs = grantedAccess('pick the only device').inputs()
    const only = inputs[0]
    if (selected === undefined && inputs.length === 1 && only !== undefined) {
      await select(only.id)
      return
    }
    report()
  }

  /**
   * Intent: select the present input with this id, replacing any selection. Notes still held on a
   * previous device end now, on the audio clock. Listens to the port, then opens it.
   */
  async function select(deviceId: string): Promise<void> {
    const port = grantedAccess('select a device')
      .inputs()
      .find((input) => input.id === deviceId)
    if (port === undefined) {
      throw new MidiControllerError(`Cannot select "${deviceId}": no such input is present.`)
    }
    if (selected !== undefined && selected.id !== port.id && tracker.held().length > 0) {
      releaseHeld(clock.anchor().audioTime)
    }
    if (selected?.id !== port.id) lastMappedAt = undefined
    selected = port
    listenTo(port)
    await openSelected(port)
  }

  /**
   * Intent: open the selected port, `opening` meanwhile. Once the open settles, fulfilled or
   * rejected, it is no longer in flight, so a failed open leaves the port `away` and its next input
   * change retries; the rejection still propagates. An open that settles after a newer one started
   * changes nothing. A present port still not open once its open completed breaks the port's
   * contract and throws.
   */
  async function openSelected(port: MidiInputPort): Promise<void> {
    openToken += 1
    const token = openToken
    openInFlight = true
    report()
    try {
      await port.open()
    } finally {
      if (token === openToken) {
        openInFlight = false
        report()
      }
    }
    if (token !== openToken) return
    if (port.state() === 'connected' && port.connection() !== 'open') {
      throw new MidiControllerError(
        `Input "${port.id}" finished opening but its connection is ${port.connection()}.`,
      )
    }
  }

  /** Intent: attach the message listener to a port once; only the selected port is ever passed. */
  function listenTo(port: MidiInputPort): void {
    if (listened.has(port)) return
    listened.add(port)
    port.listen((data, timestampMs) => onMessage(port, data, timestampMs))
  }

  /**
   * Intent: follow one input change. The selected port reporting disconnected is lost: its held
   * notes end at the change's time. The selected port back and not open is reopened, with no
   * player action (a failing reopen leaves it `away` and rejects unhandled: it is a broken port,
   * never hidden; its next input change tries again). Any other port only changes the device list.
   */
  // @spec-link [[rule_same_controller_reattaches]]
  function onInputStateChange(port: MidiInputPort, timestampMs: number): void {
    if (selected !== undefined && port.id === selected.id) {
      selected = port
      listenTo(port)
      if (port.state() === 'disconnected' && tracker.held().length > 0) {
        releaseHeld(inMessageOrder(timestampMs))
      }
      if (port.state() === 'connected' && port.connection() !== 'open' && !openInFlight) {
        void openSelected(port)
      }
    }
    report()
  }

  /**
   * Intent: map a timestamp from the selected port onto the audio clock, never earlier than the
   * last time mapped from this selection. Web MIDI delivers a port's messages in order, so that
   * order is authoritative; two anchors read a few milliseconds apart can disagree (the output
   * timestamp moves once per audio callback, or one reading comes from a stopped clock and the next
   * from a running one), and the clamp only absorbs that jitter, so a quick release never maps
   * before its onset. The selection changing starts the order afresh.
   */
  // @spec-link [[rule_only_note_on_counts_as_played]]
  function inMessageOrder(timestampMs: number): AudioTime {
    const mapped = midiTimestampToAudioTime(timestampMs, clock.anchor())
    const at = lastMappedAt === undefined ? mapped : Math.max(mapped, lastMappedAt)
    lastMappedAt = at
    return at
  }

  /** Intent: read a message from the selected, connected port into played and ended notes. */
  function onMessage(port: MidiInputPort, data: Uint8Array, timestampMs: number): void {
    if (selected?.id !== port.id || state().kind !== 'connected') return
    const message = parseMidiMessage(data)
    if (message.kind === 'ignored') return
    const at = inMessageOrder(timestampMs)
    emitNotes(
      message.kind === 'note-on'
        ? tracker.noteOn(message.pitch, message.velocity, at)
        : tracker.noteOff(message.pitch, at),
    )
  }

  return {
    state,
    devices,
    connect,
    select,
    subscribe: changeListeners.add,
    onPlayedNote: noteListeners.add,
    releaseHeld,
  }
}

/** Intent: a plain, frozen snapshot of a port's identity and display names. */
function toDevice(port: MidiInputPort): MidiDevice {
  return Object.freeze({ id: port.id, name: port.name, manufacturer: port.manufacturer })
}

/** Intent: a comparable key of a snapshot, to report only real changes. */
function changeKey(change: MidiControllerChange): string {
  return JSON.stringify(change)
}

/** A list of listeners: add one (returning its removal), or call them all in order. */
interface Listeners<T> {
  readonly add: (listener: (value: T) => void) => () => void
  readonly emit: (value: T) => void
}

/** Intent: create an empty listener list; a listener added twice is called twice. */
function createListeners<T>(): Listeners<T> {
  const entries: { readonly listener: (value: T) => void }[] = []
  return {
    add: (listener) => {
      const entry = { listener }
      entries.push(entry)
      return () => {
        const index = entries.indexOf(entry)
        if (index >= 0) entries.splice(index, 1)
      }
    },
    emit: (value) => [...entries].forEach((entry) => entry.listener(value)),
  }
}
