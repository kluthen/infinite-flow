/**
 * The MIDI controller: the one MIDI input the app reads, from asking for MIDI access to the notes
 * played on it. Access is only requested when the player connects a controller, or once at load to
 * reselect the controller remembered from an earlier visit, only when the browser already allows
 * MIDI access (a request that cannot prompt). Exactly one input
 * is read at a time: the player's pick, or the only device present; several inputs are never
 * merged, and every other port is never opened nor listened to. Its state is derived, on every
 * input change, from permission, selection and the selected port's own state; every state is a
 * normal, non-blocking one. The selection lives in memory only and survives an unplug: the same
 * port coming back is reattached by itself (unless that is held back for a session started without
 * it), and a different device is never picked up that way; only the player's Disconnect clears it.
 * The remembered controller reselected at load is selected the same way, by its port id only, at
 * once or when it appears; until then it is `away`. The remembered controller is the one given at
 * load, then the last device that counted as connected, and the player's Disconnect forgets it.
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
  MidiPermissionState,
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
 *   present if nothing is selected yet; an existing selection is kept. While `requesting`, adopts
 *   an abandoned in-flight connect() (settling with it); throws from `requesting` otherwise, or
 *   from `unsupported`. A rejected request restores the stage it started from, then propagates.
 * - permission: the provider's reading of the MIDI permission; never prompts, in any state.
 * - abandonConnect: only while `requesting`; the request's outcome is still recorded, but the
 *   connect() it belongs to selects nothing, unless a later connect() adopts it.
 * - select: selects a present input by id (replacing any selection), listens to it and opens it.
 * - disconnect: the player's Disconnect; ends held notes now and clears the selection.
 * - holdReattachment / releaseReattachment: only while `away`, keep the selected port from
 *   reattaching until released; the release reattaches it if present.
 * - releaseHeld: ends every held note at `at` (the session end), or at the last time mapped from
 *   the current selection when that is later (message order beats clock jitter), and reports it.
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
  let connectAbandoned = false
  let connectInFlight: Promise<void> | undefined
  let reattachmentHeld = false
  // The remembered controller reselected at load and selected while its port is not present yet.
  let awaited: MidiDevice | undefined
  // The controller remembered for this page; see MidiControllerChange.
  let remembered: MidiDevice | undefined
  let reselectStarted = false
  let reselectedAtLoad = false
  // While the load's request is in flight, a connect() adopts it rather than asking again.
  let loadRequestAdoptable = false
  let lastMappedAt: AudioTime | undefined
  let lastReported = changeKey(snapshot())

  /**
   * Intent: derive the state from the access phase, the selection and the selected port. A selected
   * port that is present but not open with no open in flight (its open failed) is `away`, like an
   * unplugged one: the controller is not attached, and the port's next input change retries. A
   * held reattachment keeps it `away` whatever the port reads.
   */
  function state(): MidiControllerState {
    if (phase !== 'granted') return Object.freeze({ kind: phase })
    if (selected === undefined) {
      if (awaited !== undefined) return Object.freeze({ kind: 'away', device: awaited })
      return Object.freeze({ kind: devices().length === 0 ? 'no-device' : 'choosing' })
    }
    const device = toDevice(selected)
    if (reattachmentHeld || selected.state() === 'disconnected') {
      return Object.freeze({ kind: 'away', device })
    }
    if (openInFlight) return Object.freeze({ kind: 'opening', device })
    if (selected.connection() !== 'open') return Object.freeze({ kind: 'away', device })
    return Object.freeze({ kind: 'connected', device })
  }

  /** Intent: the present inputs as device snapshots; none before access is granted. */
  function devices(): readonly MidiDevice[] {
    if (access === undefined) return Object.freeze([])
    return Object.freeze(access.inputs().map(toDevice))
  }

  /**
   * Intent: the current state, devices and remembered controller, as subscribers are told them. A
   * connected device becomes the remembered controller here, as every change is read through it.
   */
  // @spec-link [[rule_last_controller_remembered]]
  function snapshot(): MidiControllerChange {
    const current = state()
    if (current.kind === 'connected') remembered = current.device
    return Object.freeze({
      state: current,
      devices: devices(),
      remembered: remembered ?? null,
      reselectedAtLoad,
    })
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

  /**
   * Intent: end every held note at `at`, and report the ended notes. Message order beats clock
   * jitter: `at` (read from the audio clock directly) can be a few milliseconds behind the last time
   * mapped from this selection's messages, so the notes end at the later of the two, never before
   * an onset; a later `at` is kept as it is.
   */
  // @spec-link [[rule_only_note_on_counts_as_played]]
  function releaseHeld(at: AudioTime): PlayedNoteEvents {
    const releaseAt = lastMappedAt === undefined ? at : Math.max(at, lastMappedAt)
    return emitNotes(tracker.releaseAll(releaseAt))
  }

  /** Intent: the browser's MIDI permission, as the provider reads it; never prompts, in any state. */
  // @spec-link [[rule_controller_connects_between_sessions]]
  function permission(): Promise<MidiPermissionState> {
    return provider.permission()
  }

  /** Intent: the granted access, or a typed failure for a call that needs it before it exists. */
  function grantedAccess(action: string): MidiAccessPort {
    if (access === undefined) {
      throw new MidiControllerError(`Cannot ${action}: MIDI access is ${phase}, not granted.`)
    }
    return access
  }

  /**
   * Intent: connect a controller. While a request is in flight that the player abandoned (closed
   * the sheet while the browser asks), a new connect() adopts it rather than asking again: the
   * abandon is withdrawn, so the only device is picked on grant, and it settles with that request.
   */
  // @spec-link [[rule_controller_connects_between_sessions]]
  function connect(): Promise<void> {
    const adoptable = connectAbandoned || loadRequestAdoptable
    if (phase === 'requesting' && adoptable && connectInFlight !== undefined) {
      connectAbandoned = false
      loadRequestAdoptable = false
      return connectInFlight
    }
    if (phase === 'unsupported' || phase === 'requesting') {
      return Promise.reject(
        new MidiControllerError(`Cannot connect a controller while MIDI access is ${phase}.`),
      )
    }
    connectInFlight = requestAndPick()
    return connectInFlight
  }

  /**
   * Intent: request MIDI access (the only place that does), then pick the only device. A connect()
   * abandoned while its request was in flight records the outcome, then picks nothing.
   */
  async function requestAndPick(): Promise<void> {
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
      if (connectAbandoned) {
        report()
        return
      }
    }
    await selectRememberedOrOnly()
  }

  /**
   * Intent: abandon the connect() whose request is in flight (the player closed the sheet while
   * the browser asks). The request cannot be withdrawn from the browser, so the state stays
   * `requesting` until it is answered; only the device pick after it is dropped, unless a later
   * connect() adopts the request.
   */
  // @spec-link [[rule_controller_connects_between_sessions]]
  function abandonConnect(): void {
    if (phase !== 'requesting') {
      throw new MidiControllerError(`Cannot abandon a connect while MIDI access is ${phase}.`)
    }
    connectAbandoned = true
  }

  /**
   * Intent: ask the provider for access, `requesting` meanwhile. A rejected request is no state of
   * its own: the stage goes back to `before` (reported), and the same error propagates, so a later
   * connect() can ask again.
   */
  async function requestAccess(before: 'not-requested' | 'denied'): Promise<MidiAccessRequest> {
    phase = 'requesting'
    connectAbandoned = false
    report()
    try {
      return await provider.request()
    } catch (error) {
      phase = before
      report()
      throw error
    }
  }

  /**
   * Intent: with nothing selected, select the remembered controller when it is among the inputs,
   * however many there are, else the only input present; otherwise just report.
   */
  // @spec-link [[rule_last_controller_remembered]]
  async function selectRememberedOrOnly(): Promise<void> {
    const inputs = grantedAccess('pick a device').inputs()
    if (selected === undefined && awaited === undefined) {
      const known = remembered
      const pick =
        inputs.find((input) => known !== undefined && input.id === known.id) ??
        (inputs.length === 1 ? inputs[0] : undefined)
      if (pick !== undefined) {
        await select(pick.id)
        return
      }
    }
    report()
  }

  /**
   * Intent: the load's reselection (see MidiController.reselect). Whatever the permission says,
   * `device` becomes the remembered controller; the request is made only when the permission reads
   * `granted` and nothing was requested meanwhile.
   */
  // @spec-link [[rule_last_controller_remembered]]
  function reselect(device: MidiDevice): Promise<void> {
    if (reselectStarted || phase !== 'not-requested' || remembered !== undefined) {
      return Promise.reject(
        new MidiControllerError(
          `Cannot reselect a remembered controller once MIDI access is ${phase}.`,
        ),
      )
    }
    reselectStarted = true
    remembered = Object.freeze({
      id: device.id,
      name: device.name,
      manufacturer: device.manufacturer,
    })
    report()
    return reselectWhenAllowed(remembered)
  }

  /** Intent: request access for the reselection only when the browser already allows it. */
  async function reselectWhenAllowed(device: MidiDevice): Promise<void> {
    if ((await provider.permission()) !== 'granted' || phase !== 'not-requested') return
    reselectedAtLoad = true
    loadRequestAdoptable = true
    connectInFlight = requestRemembered(device)
    return connectInFlight
  }

  /**
   * Intent: the load's one request, which cannot prompt, then the remembered port selected if
   * present, else awaited (away) until it appears. A refused request leaves the player to connect
   * (not-requested, or unsupported when the browser says so); a broken one goes back to
   * not-requested and propagates. Neither keeps the reselection.
   */
  // @spec-link [[rule_last_controller_remembered]]
  async function requestRemembered(device: MidiDevice): Promise<void> {
    phase = 'requesting'
    connectAbandoned = false
    report()
    let result: MidiAccessRequest
    try {
      result = await provider.request()
    } catch (error) {
      phase = 'not-requested'
      reselectedAtLoad = false
      loadRequestAdoptable = false
      report()
      throw error
    }
    loadRequestAdoptable = false
    if (result.kind !== 'granted') {
      phase = result.kind === 'unsupported' ? 'unsupported' : 'not-requested'
      reselectedAtLoad = false
      report()
      return
    }
    access = result.access
    phase = 'granted'
    access.onInputStateChange(onInputStateChange)
    const port = access.inputs().find((input) => input.id === device.id)
    if (port === undefined) {
      awaited = device
      report()
      return
    }
    await select(port.id)
  }

  /**
   * Intent: select the present input with this id, replacing any selection. Notes still held on a
   * previous device end now, on the audio clock. Listens to the port, then opens it. Throws while
   * the reattachment is held: a session started without a controller never gains one.
   */
  // @spec-link [[rule_controllerless_session_never_gains_controller]]
  async function select(deviceId: string): Promise<void> {
    if (reattachmentHeld) {
      throw new MidiControllerError(`Cannot select "${deviceId}" while the reattachment is held.`)
    }
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
    awaited = undefined
    selected = port
    listenTo(port)
    await openSelected(port)
  }

  /**
   * Intent: the player's Disconnect. Notes still held end now, on the audio clock, as on a device
   * switch; the selection clears, so the state is `choosing` or `no-device`. An open still in flight
   * no longer counts; the old port stays listened to but is never read (only the selected port is),
   * and its coming back changes only the device list. A held reattachment ends with the selection
   * it held: there is nothing left to reattach. Throws when nothing is selected.
   */
  // @spec-link [[req_midi_controller_input]]
  // @spec-link [[rule_controller_attached_definition]]
  // @spec-link [[rule_disconnect_forgets_controller]]
  function disconnect(): void {
    if (selected === undefined && awaited === undefined) {
      throw new MidiControllerError('Cannot disconnect: no controller is selected.')
    }
    if (tracker.held().length > 0) releaseHeld(clock.anchor().audioTime)
    selected = undefined
    awaited = undefined
    remembered = undefined
    reattachmentHeld = false
    lastMappedAt = undefined
    openToken += 1
    openInFlight = false
    report()
  }

  /**
   * Intent: keep the away selected port from reattaching, for a session started without it: its
   * coming back only changes the device list, it is never opened nor read. Throws unless `away`
   * and not already held.
   */
  // @spec-link [[rule_start_while_controller_away]]
  // @spec-link [[rule_controllerless_session_never_gains_controller]]
  function holdReattachment(): void {
    const kind = state().kind
    if (kind !== 'away' || reattachmentHeld) {
      const why = reattachmentHeld ? 'already held' : `the controller is ${kind}`
      throw new MidiControllerError(`Cannot hold the reattachment: ${why}.`)
    }
    reattachmentHeld = true
  }

  /**
   * Intent: end the hold. The selected port present now reattaches as on a replug (reopened if
   * the browser left it closed); absent, it stays `away` and reattaches when it comes back. Throws
   * when nothing is held.
   */
  // @spec-link [[rule_start_while_controller_away]]
  // @spec-link [[rule_same_controller_reattaches]]
  function releaseReattachment(): void {
    if (!reattachmentHeld || (selected === undefined && awaited === undefined)) {
      throw new MidiControllerError('Cannot release the reattachment: it is not held.')
    }
    reattachmentHeld = false
    if (selected !== undefined) reopenIfBack(selected)
    else attachAwaitedIfPresent()
    report()
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
   * notes end at the change's time. The selected port back is reattached unless that is held. Any
   * other port only changes the device list.
   */
  // @spec-link [[rule_same_controller_reattaches]]
  function onInputStateChange(port: MidiInputPort, timestampMs: number): void {
    if (awaited !== undefined && port.id === awaited.id) {
      if (!reattachmentHeld) attachAwaitedIfPresent()
    } else if (selected !== undefined && port.id === selected.id) {
      selected = port
      listenTo(port)
      if (port.state() === 'disconnected' && tracker.held().length > 0) {
        releaseHeld(inMessageOrder(timestampMs))
      }
      if (!reattachmentHeld) reopenIfBack(port)
    }
    report()
  }

  /**
   * Intent: attach the awaited remembered controller when its port is present, as a device that
   * comes back within a page: selected, listened to and opened, with no player action (a failing
   * open leaves it `away` and rejects unhandled, as a reopen does).
   */
  // @spec-link [[rule_last_controller_remembered]]
  // @spec-link [[rule_same_controller_reattaches]]
  function attachAwaitedIfPresent(): void {
    const device = awaited
    if (device === undefined || access === undefined) return
    const port = access.inputs().find((input) => input.id === device.id)
    if (port === undefined || port.state() !== 'connected') return
    awaited = undefined
    selected = port
    lastMappedAt = undefined
    listenTo(port)
    void openSelected(port)
  }

  /**
   * Intent: reopen the selected port when it is back but not open, with no player action (a
   * failing reopen leaves it `away` and rejects unhandled: it is a broken port, never hidden; its
   * next input change tries again).
   */
  // @spec-link [[rule_same_controller_reattaches]]
  function reopenIfBack(port: MidiInputPort): void {
    if (port.state() === 'connected' && port.connection() !== 'open' && !openInFlight) {
      void openSelected(port)
    }
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
    change: snapshot,
    reselect,
    permission,
    connect,
    abandonConnect,
    select,
    disconnect,
    holdReattachment,
    releaseReattachment,
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
