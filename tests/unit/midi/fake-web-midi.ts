/**
 * Hand-made fakes of the Web MIDI browser objects the adapter reads (jsdom has no Web MIDI): a
 * navigator whose `requestMIDIAccess` records its calls, a `MIDIAccess` whose inputs map and
 * `statechange` the test drives, and ports whose live state, opening and messages the test drives.
 * Like Chromium, a port object keeps its identity: unplugging and replugging reuse the same object.
 * It imports no test framework.
 */

import type {
  WebMidiAccessLike,
  WebMidiConnectionEventLike,
  WebMidiInputLike,
  WebMidiMessageEventLike,
  WebMidiNavigatorPort,
} from '../../../src/midi/web-midi-access'

/** A fake Web MIDI port whose live readings the test sets, with the test's controls. */
export interface FakeWebMidiPort extends WebMidiInputLike {
  state: 'connected' | 'disconnected'
  connection: 'open' | 'closed' | 'pending'
  /** How many times `open()` was called. */
  readonly opens: () => number
  /** Dispatch one `midimessage` event to the port's listeners. */
  readonly emit: (data: Uint8Array | null, timeStamp: number) => void
}

/** A fake granted `MIDIAccess`, with the test's controls. */
export interface FakeWebMidiAccess extends WebMidiAccessLike {
  /** Put a port in the inputs map (at the end) and fire its `statechange`. */
  readonly plug: (port: FakeWebMidiPort, timeStamp: number) => void
  /** Take a port out of the inputs map, mark it disconnected, and fire its `statechange`. */
  readonly unplug: (port: FakeWebMidiPort, timeStamp: number) => void
  /** Dispatch one `statechange` event, as given. */
  readonly fireStateChange: (event: WebMidiConnectionEventLike) => void
}

/** One recorded `requestMIDIAccess` call: its options and the `this` it was called on. */
export interface FakeRequestCall {
  readonly options: { sysex: boolean }
  readonly self: unknown
}

/** A fake navigator with Web MIDI, recording every `requestMIDIAccess` call. */
export interface FakeWebMidiNavigator extends WebMidiNavigatorPort {
  readonly calls: FakeRequestCall[]
}

/** Intent: a fake port, present and closed, of the given type; `open()` opens it at once. */
// @test-link [[req_midi_controller_input]]
export function createFakeWebMidiPort(
  id: string,
  type: 'input' | 'output' = 'input',
  name: string | null = `Name ${id}`,
  manufacturer: string | null = `Maker ${id}`,
): FakeWebMidiPort {
  const listeners: ((event: WebMidiMessageEventLike) => void)[] = []
  let opens = 0
  const port: FakeWebMidiPort = {
    id,
    name,
    manufacturer,
    type,
    state: 'connected',
    connection: 'closed',
    open: () => {
      opens += 1
      port.connection = 'open'
      return Promise.resolve(port)
    },
    addEventListener: (_type, listener) => listeners.push(listener),
    opens: () => opens,
    emit: (data, timeStamp) => [...listeners].forEach((listener) => listener({ data, timeStamp })),
  }
  return port
}

/** Intent: a fake granted access whose inputs map holds these ports, in this order. */
// @test-link [[req_midi_controller_input]]
export function createFakeWebMidiAccess(ports: readonly FakeWebMidiPort[]): FakeWebMidiAccess {
  const inputs = new Map(ports.map((port) => [port.id, port]))
  const listeners: ((event: WebMidiConnectionEventLike) => void)[] = []

  /** Intent: dispatch one statechange event to every listener. */
  function fireStateChange(event: WebMidiConnectionEventLike): void {
    ;[...listeners].forEach((listener) => listener(event))
  }

  return {
    inputs: { values: () => inputs.values() },
    addEventListener: (_type, listener) => listeners.push(listener),
    plug: (port, timeStamp) => {
      inputs.set(port.id, port)
      port.state = 'connected'
      fireStateChange({ port, timeStamp })
    },
    unplug: (port, timeStamp) => {
      inputs.delete(port.id)
      port.state = 'disconnected'
      if (port.connection === 'open') port.connection = 'pending'
      fireStateChange({ port, timeStamp })
    },
    fireStateChange,
  }
}

/** Intent: a fake navigator whose `requestMIDIAccess` records the call and returns `answer()`. */
// @test-link [[rule_controller_connects_between_sessions]]
export function createFakeWebMidiNavigator(
  answer: () => Promise<WebMidiAccessLike>,
): FakeWebMidiNavigator {
  const calls: FakeRequestCall[] = []
  return {
    calls,
    requestMIDIAccess(options) {
      calls.push({ options, self: this })
      return answer()
    },
  }
}
