/**
 * The browser adapter of the MIDI access port: `navigator.requestMIDIAccess`, the `midi` permission
 * of `navigator.permissions`, `MIDIAccess` and `MIDIInput`, read through structural slices so tests
 * can supply hand-made fakes.
 */

import type {
  MidiAccessPort,
  MidiAccessProvider,
  MidiAccessRequest,
  MidiInputPort,
  MidiPermissionState,
} from './midi-access-port'

/** The slice of a Web MIDI port (input or output) the adapter reads. */
// @spec-link [[req_midi_controller_input]]
export interface WebMidiPortLike {
  readonly id: string
  readonly name: string | null
  readonly manufacturer: string | null
  readonly type: 'input' | 'output'
  readonly state: 'connected' | 'disconnected'
  readonly connection: 'open' | 'closed' | 'pending'
}

/** The slice of a Web MIDI `midimessage` event the adapter reads. */
// @spec-link [[req_midi_controller_input]]
export interface WebMidiMessageEventLike {
  readonly data: Uint8Array | null
  readonly timeStamp: number
}

/** The slice of a Web MIDI input the adapter reads: a port that opens and delivers messages. */
// @spec-link [[req_midi_controller_input]]
export interface WebMidiInputLike extends WebMidiPortLike {
  open(): Promise<unknown>
  addEventListener(type: 'midimessage', listener: (event: WebMidiMessageEventLike) => void): void
}

/** The slice of a Web MIDI `statechange` event the adapter reads. */
// @spec-link [[rule_same_controller_reattaches]]
export interface WebMidiConnectionEventLike {
  readonly port: WebMidiPortLike | null
  readonly timeStamp: number
}

/** The slice of a granted `MIDIAccess` the adapter reads. */
// @spec-link [[req_midi_controller_input]]
export interface WebMidiAccessLike {
  readonly inputs: { values(): Iterable<WebMidiPortLike> }
  addEventListener(type: 'statechange', listener: (event: WebMidiConnectionEventLike) => void): void
}

/** The slice of `navigator.permissions` the adapter reads: a permission query that never prompts. */
// @spec-link [[rule_controller_connects_between_sessions]]
export interface WebMidiPermissionsLike {
  query(descriptor: PermissionDescriptor): Promise<{ readonly state: PermissionState }>
}

/**
 * The slice of `navigator` the adapter reads; `requestMIDIAccess` is absent without Web MIDI, and
 * `permissions` without the Permissions API.
 */
// @spec-link [[rule_chromium_only_support]]
export interface WebMidiNavigatorPort {
  requestMIDIAccess?: (options: { sysex: boolean }) => Promise<WebMidiAccessLike>
  readonly permissions?: WebMidiPermissionsLike
}

/** Typed failure for a MIDI access request the browser rejected for a reason no state covers. */
// @spec-link [[rule_midi_never_blocks_session]]
export class WebMidiAccessError extends Error {
  readonly kind = 'WebMidiAccessError' as const

  constructor(
    readonly rejectionName: string,
    readonly rejectionMessage: string,
  ) {
    super(`MIDI access request failed: ${rejectionName}: ${rejectionMessage}`)
    this.name = 'WebMidiAccessError'
  }
}

/** Typed failure for a Web MIDI event missing what the Web MIDI contract says it carries. */
// @spec-link [[req_midi_controller_input]]
export class WebMidiEventError extends Error {
  readonly kind = 'WebMidiEventError' as const

  constructor(message: string) {
    super(message)
    this.name = 'WebMidiEventError'
  }
}

/** The browser rejection names that are a known product state, and the outcome each maps onto. */
const KNOWN_REJECTIONS: ReadonlyMap<string, MidiAccessRequest> = new Map<string, MidiAccessRequest>(
  [
    ['NotAllowedError', Object.freeze({ kind: 'denied' })],
    ['SecurityError', Object.freeze({ kind: 'denied' })],
    ['NotSupportedError', Object.freeze({ kind: 'unsupported' })],
  ],
)

/**
 * Intent: create the MIDI access provider over the browser's `navigator` (production passes the
 * real one).
 * - isSupported: whether `navigator.requestMIDIAccess` exists; it is never called for that.
 * - request: the one and only `requestMIDIAccess` call of the app, always `{ sysex: false }`
 *   (SysEx is ignored by the product, and asking for it prompts a stronger permission). Without
 *   Web MIDI it resolves `unsupported` without calling. A rejection maps by its DOMException name:
 *   `NotAllowedError` (the player refused) and `SecurityError` (the browser refused) resolve
 *   `denied`; `NotSupportedError` (the browser cannot provide MIDI on this system, the same
 *   meaning for the player as no Web MIDI) resolves `unsupported`. Any other rejection is no known
 *   product state and throws a WebMidiAccessError carrying the original name and message.
 * - permission: see readMidiPermission.
 */
// @spec-link [[rule_controller_connects_between_sessions]]
// @spec-link [[rule_midi_never_blocks_session]]
// @spec-link [[rule_chromium_only_support]]
export function createWebMidiAccessProvider(
  navigatorPort: WebMidiNavigatorPort,
): MidiAccessProvider {
  return {
    isSupported: () => typeof navigatorPort.requestMIDIAccess === 'function',
    permission: () => readMidiPermission(navigatorPort.permissions),
    request: async () => {
      if (typeof navigatorPort.requestMIDIAccess !== 'function') return { kind: 'unsupported' }
      let access: WebMidiAccessLike
      try {
        access = await navigatorPort.requestMIDIAccess({ sysex: false })
      } catch (error) {
        return mapRejection(error)
      }
      return { kind: 'granted', access: wrapAccess(access) }
    },
  }
}

/**
 * Intent: read the browser's `midi` permission without prompting: `granted`, `prompt` or `denied`
 * as the browser reports it. `unknown` when the browser can't tell: no Permissions API, or a query
 * rejected with a TypeError (the browser does not know the `midi` name). Any other rejection is no
 * known product state and propagates as it is.
 */
// @spec-link [[rule_controller_connects_between_sessions]]
async function readMidiPermission(
  permissions: WebMidiPermissionsLike | undefined,
): Promise<MidiPermissionState> {
  if (permissions === undefined) return 'unknown'
  try {
    return (await permissions.query({ name: 'midi' })).state
  } catch (error) {
    if (error instanceof TypeError) return 'unknown'
    throw error
  }
}

/** Intent: the outcome of a known browser rejection, or a WebMidiAccessError for any other. */
// @spec-link [[rule_midi_never_blocks_session]]
function mapRejection(error: unknown): MidiAccessRequest {
  if (typeof error !== 'object' || error === null || !('name' in error)) {
    throw new WebMidiAccessError('(not an error)', String(error))
  }
  const name = String(error.name)
  const known = KNOWN_REJECTIONS.get(name)
  if (known !== undefined) return known
  throw new WebMidiAccessError(name, 'message' in error ? String(error.message) : '')
}

/** Intent: a browser port as an input, narrowing on its type. */
function isInput(port: WebMidiPortLike): port is WebMidiInputLike {
  return port.type === 'input'
}

/**
 * Intent: wrap a granted `MIDIAccess` into the controller's access port. Inputs are wrapped once
 * per browser input object, so a port keeps its identity across an unplug and a replug (Chromium
 * reuses the object). Outputs are never exposed: their state changes are ignored.
 */
// @spec-link [[req_midi_controller_input]]
// @spec-link [[rule_same_controller_reattaches]]
function wrapAccess(access: WebMidiAccessLike): MidiAccessPort {
  const wrappers = new WeakMap<WebMidiInputLike, MidiInputPort>()

  /** Intent: the one wrapper of this browser input, created on first sight. */
  function wrapperOf(input: WebMidiInputLike): MidiInputPort {
    const known = wrappers.get(input)
    if (known !== undefined) return known
    const wrapper = wrapInput(input)
    wrappers.set(input, wrapper)
    return wrapper
  }

  return {
    inputs: () => Object.freeze([...access.inputs.values()].filter(isInput).map(wrapperOf)),
    onInputStateChange: (listener) =>
      access.addEventListener('statechange', (event) => {
        if (event.port === null) {
          throw new WebMidiEventError('A MIDI statechange event carried no port.')
        }
        if (isInput(event.port)) listener(wrapperOf(event.port), event.timeStamp)
      }),
  }
}

/**
 * Intent: wrap one browser input. `state` and `connection` read the live properties; a null name
 * or manufacturer (Web MIDI's "the system gives none") reads as the empty string, both being
 * display only. Messages are forwarded with their performance.now() timestamp.
 */
// @spec-link [[req_midi_controller_input]]
function wrapInput(input: WebMidiInputLike): MidiInputPort {
  return Object.freeze({
    id: input.id,
    name: input.name ?? '',
    manufacturer: input.manufacturer ?? '',
    state: () => input.state,
    connection: () => input.connection,
    open: async () => {
      await input.open()
    },
    listen: (listener: (data: Uint8Array, timestampMs: number) => void) =>
      input.addEventListener('midimessage', (event) => {
        if (event.data === null) {
          throw new WebMidiEventError(`A MIDI message from input "${input.id}" carried no data.`)
        }
        listener(event.data, event.timeStamp)
      }),
  })
}
