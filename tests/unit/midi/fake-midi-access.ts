/**
 * A fake Web MIDI access the MIDI controller is tested on. It behaves like Chromium where the
 * controller depends on it: one port object per device id for the page's lifetime, reused when the
 * same device is plugged back in, and a port that was open reopens itself on replug. The test plugs
 * and unplugs devices, sends raw messages, and controls the permission request and port opening.
 * It imports no Node module and no test framework, so the browser workspace harness can reuse it.
 */

import type {
  MidiAccessPort,
  MidiAccessProvider,
  MidiAccessRequest,
  MidiInputPort,
  MidiPortConnection,
  MidiPortState,
} from '../../../src/midi/midi-access-port'

const NOTE_ON = 0x90
const NOTE_OFF = 0x80

/** The identity and display names of a fake device. */
export interface FakeMidiDevice {
  readonly id: string
  readonly name: string
  readonly manufacturer: string
}

/**
 * Options: whether this fake browser supports Web MIDI, whether it reopens a replugged port that
 * was open (Chromium does; default true), and its performance.now() reading.
 */
export interface FakeMidiAccessOptions {
  readonly supported?: boolean
  readonly reopensOnReplug?: boolean
  /** The fake performance.now(), in milliseconds, used when a plug gives no timestamp. */
  readonly now?: () => number
}

/** The fake provider plus the controls and queries a test needs. */
export interface FakeMidiAccess extends MidiAccessProvider {
  /** Plug a device in: a new id is appended to the inputs; a known id comes back as the same port. */
  readonly plug: (device: FakeMidiDevice, timestampMs?: number) => void
  /** Unplug a present device. */
  readonly unplug: (id: string, timestampMs: number) => void
  /** Deliver one raw message from an open, connected device. */
  readonly send: (id: string, bytes: readonly number[], timestampMs: number) => void
  /** Deliver a note-on from an open, connected device. */
  readonly noteOn: (
    id: string,
    pitch: number,
    velocity: number,
    timestampMs: number,
    channel?: number,
  ) => void
  /** Deliver a note-off from an open, connected device. */
  readonly noteOff: (id: string, pitch: number, timestampMs: number, channel?: number) => void
  /** Make the next access request resolve as denied. */
  readonly denyNextRequest: () => void
  /** Make the next access request reject with this error, as a broken browser request would. */
  readonly failNextRequest: (error: Error) => void
  /** Keep the next access request in flight until `releaseHeldRequest`. */
  readonly holdNextRequest: () => void
  /** Settle the held access request. */
  readonly releaseHeldRequest: () => void
  /** Keep the next `open()` of this device in flight until `releaseHeldOpen`. */
  readonly holdNextOpen: (id: string) => void
  /** Complete the held `open()` of this device. */
  readonly releaseHeldOpen: (id: string) => void
  /** Make the next `open()` of this device reject with this error, its connection unchanged. */
  readonly failNextOpen: (id: string, error: Error) => void
  /** How many times access was requested. */
  readonly requestCount: () => number
  /** How many times this device's port was asked to open. */
  readonly openCount: (id: string) => number
  /** Whether anyone listens to this device's messages. */
  readonly isListening: (id: string) => boolean
  /** This device's port connection, as the controller reads it. */
  readonly connectionOf: (id: string) => MidiPortConnection
}

/** One fake port and the fake's private bookkeeping for it. */
interface FakePort {
  readonly port: MidiInputPort
  readonly listeners: ((data: Uint8Array, timestampMs: number) => void)[]
  state: MidiPortState
  connection: MidiPortConnection
  opens: number
  holdNextOpen: boolean
  heldOpen: (() => void) | undefined
  failNextOpen: Error | undefined
}

/**
 * Intent: create a fake MIDI access provider with no device plugged in. Requests resolve granted
 * (one access object shared by every request) unless failed, denied, held or unsupported.
 */
// @test-link [[req_midi_controller_input]]
export function createFakeMidiAccess(options: FakeMidiAccessOptions = {}): FakeMidiAccess {
  const supported = options.supported ?? true
  const reopensOnReplug = options.reopensOnReplug ?? true
  const now = options.now ?? (() => 0)
  const ports = new Map<string, FakePort>()
  const present: string[] = []
  const stateListeners: ((port: MidiInputPort, timestampMs: number) => void)[] = []
  let requests = 0
  let denyNext = false
  let failNext: Error | undefined
  let holdNext = false
  let heldRequest: (() => void) | undefined

  const access: MidiAccessPort = {
    inputs: () => Object.freeze(present.map((id) => portOf(id).port)),
    onInputStateChange: (listener) => stateListeners.push(listener),
  }

  /** Intent: the fake port of a known id; an unknown id is a test bug. */
  function portOf(id: string): FakePort {
    const fake = ports.get(id)
    if (fake === undefined) throw new Error(`fake MIDI: no device with id "${id}"`)
    return fake
  }

  /** Intent: tell every state-change listener that this port changed. */
  function fireStateChange(fake: FakePort, timestampMs: number): void {
    ;[...stateListeners].forEach((listener) => listener(fake.port, timestampMs))
  }

  /** Intent: finish an open: the port is open if its device is present, else pending. */
  function completeOpen(fake: FakePort): void {
    const before = fake.connection
    fake.connection = fake.state === 'connected' ? 'open' : 'pending'
    if (fake.connection !== before) fireStateChange(fake, now())
  }

  /** Intent: build a fresh fake port, closed and present, for a device seen for the first time. */
  function createPort(device: FakeMidiDevice): FakePort {
    const fake: FakePort = {
      port: {
        id: device.id,
        name: device.name,
        manufacturer: device.manufacturer,
        state: () => fake.state,
        connection: () => fake.connection,
        open: () => openPort(fake),
        listen: (listener) => fake.listeners.push(listener),
      },
      listeners: [],
      state: 'connected',
      connection: 'closed',
      opens: 0,
      holdNextOpen: false,
      heldOpen: undefined,
      failNextOpen: undefined,
    }
    return fake
  }

  /**
   * Intent: count an open, then reject it when a failure is set (the port stays as it was, with no
   * state change, as a browser refusing an unavailable port does), complete it now, or keep it in
   * flight when a hold is set.
   */
  function openPort(fake: FakePort): Promise<void> {
    fake.opens += 1
    const failure = fake.failNextOpen
    fake.failNextOpen = undefined
    if (failure !== undefined) return Promise.reject(failure)
    if (!fake.holdNextOpen) {
      completeOpen(fake)
      return Promise.resolve()
    }
    fake.holdNextOpen = false
    if (fake.connection !== 'open') fake.connection = 'pending'
    return new Promise((resolve) => {
      fake.heldOpen = () => {
        completeOpen(fake)
        resolve()
      }
    })
  }

  /** Intent: deliver raw bytes to a port's listeners, which only an open, present port does. */
  function deliver(id: string, bytes: readonly number[], timestampMs: number): void {
    const fake = portOf(id)
    if (fake.state !== 'connected' || fake.connection !== 'open') {
      throw new Error(`fake MIDI: device "${id}" is ${fake.state}/${fake.connection}, not open`)
    }
    const data = Uint8Array.from(bytes)
    ;[...fake.listeners].forEach((listener) => listener(data, timestampMs))
  }

  /** Intent: resolve a request the way the fake is currently set up to answer it. */
  function answer(): MidiAccessRequest {
    if (!supported) return { kind: 'unsupported' }
    if (denyNext) {
      denyNext = false
      return { kind: 'denied' }
    }
    return { kind: 'granted', access }
  }

  return {
    isSupported: () => supported,
    request: () => {
      requests += 1
      const failure = failNext
      failNext = undefined
      if (failure !== undefined) return Promise.reject(failure)
      if (!holdNext) return Promise.resolve(answer())
      holdNext = false
      return new Promise((resolve) => {
        heldRequest = () => resolve(answer())
      })
    },
    plug: (device, timestampMs) => {
      const known = ports.get(device.id)
      if (known !== undefined && known.state === 'connected') {
        throw new Error(`fake MIDI: device "${device.id}" is already plugged in`)
      }
      const fake = known ?? createPort(device)
      ports.set(device.id, fake)
      fake.state = 'connected'
      const reopens = reopensOnReplug && fake.heldOpen === undefined
      if (fake.connection === 'pending' && reopens) fake.connection = 'open'
      present.push(device.id)
      fireStateChange(fake, timestampMs ?? now())
    },
    unplug: (id, timestampMs) => {
      const fake = portOf(id)
      if (fake.state !== 'connected') throw new Error(`fake MIDI: device "${id}" is not plugged in`)
      present.splice(present.indexOf(id), 1)
      fake.state = 'disconnected'
      if (fake.connection === 'open') fake.connection = 'pending'
      fireStateChange(fake, timestampMs)
    },
    send: deliver,
    noteOn: (id, pitch, velocity, timestampMs, channel = 0) =>
      deliver(id, [NOTE_ON | channel, pitch, velocity], timestampMs),
    noteOff: (id, pitch, timestampMs, channel = 0) =>
      deliver(id, [NOTE_OFF | channel, pitch, 0], timestampMs),
    denyNextRequest: () => {
      denyNext = true
    },
    failNextRequest: (error) => {
      failNext = error
    },
    holdNextRequest: () => {
      holdNext = true
    },
    releaseHeldRequest: () => {
      if (heldRequest === undefined) throw new Error('fake MIDI: no access request is held')
      const release = heldRequest
      heldRequest = undefined
      release()
    },
    holdNextOpen: (id) => {
      portOf(id).holdNextOpen = true
    },
    releaseHeldOpen: (id) => {
      const fake = portOf(id)
      const release = fake.heldOpen
      if (release === undefined) throw new Error(`fake MIDI: no open of "${id}" is held`)
      fake.heldOpen = undefined
      release()
    },
    failNextOpen: (id, error) => {
      portOf(id).failNextOpen = error
    },
    requestCount: () => requests,
    openCount: (id) => ports.get(id)?.opens ?? 0,
    isListening: (id) => (ports.get(id)?.listeners.length ?? 0) > 0,
    connectionOf: (id) => portOf(id).connection,
  }
}
