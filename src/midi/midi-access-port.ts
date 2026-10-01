/**
 * The slice of Web MIDI the MIDI controller depends on, as plain structural types. The browser
 * adapter wraps `navigator.requestMIDIAccess`, `MIDIAccess` and `MIDIInput` into these; tests use
 * a fake. A port object keeps its identity across an unplug and a replug, as Chromium does: the
 * same input object, with the same id, comes back, and Chromium reopens a port that was open.
 */

/** Whether an input's device is present (`connected`) or gone (`disconnected`). */
// @spec-link [[rule_controller_attached_definition]]
export type MidiPortState = 'connected' | 'disconnected'

/**
 * Whether an input is open for reading. `pending` is a port that was opened but whose device is
 * gone, or whose opening has not completed yet.
 */
// @spec-link [[rule_controller_attached_definition]]
export type MidiPortConnection = 'open' | 'closed' | 'pending'

/**
 * One MIDI input port. `id` is the device's identity for the page's lifetime; `name` and
 * `manufacturer` are display only (two identical keyboards share them). `state` and `connection`
 * are live readings. `listen` adds a listener for every raw message the port delivers, with its
 * performance.now() timestamp in milliseconds; a port delivers nothing while it is not open.
 */
// @spec-link [[req_midi_controller_input]]
// @spec-link [[rule_controller_attached_definition]]
export interface MidiInputPort {
  readonly id: string
  readonly name: string
  readonly manufacturer: string
  readonly state: () => MidiPortState
  readonly connection: () => MidiPortConnection
  readonly open: () => Promise<void>
  readonly listen: (listener: (data: Uint8Array, timestampMs: number) => void) => void
}

/**
 * Granted MIDI access. `inputs` lists the inputs present right now, in the browser's order.
 * `onInputStateChange` adds a listener called whenever an input's state or connection changes
 * (a device plugged or unplugged, a port opened), with the change's performance.now() timestamp.
 */
// @spec-link [[req_midi_controller_input]]
// @spec-link [[rule_same_controller_reattaches]]
export interface MidiAccessPort {
  readonly inputs: () => readonly MidiInputPort[]
  readonly onInputStateChange: (
    listener: (port: MidiInputPort, timestampMs: number) => void,
  ) => void
}

/**
 * The outcome of one MIDI access request: granted with the access, denied by the player or the
 * browser, or unsupported by this browser. The provider maps the browser's known rejections onto
 * these; any other rejection is a failure of its own.
 */
// @spec-link [[rule_midi_never_blocks_session]]
export type MidiAccessRequest =
  | { readonly kind: 'granted'; readonly access: MidiAccessPort }
  | { readonly kind: 'denied' }
  | { readonly kind: 'unsupported' }

/**
 * The browser's MIDI permission, read without prompting. `unknown`: this browser can't tell (no
 * Permissions API, or it doesn't know the `midi` name).
 */
// @spec-link [[rule_controller_connects_between_sessions]]
export type MidiPermissionState = 'granted' | 'prompt' | 'denied' | 'unknown'

/**
 * Where MIDI access comes from. `isSupported` answers without asking the player anything;
 * `request` asks for MIDI permission, and is only called when the player connects a controller;
 * `permission` reads that permission and never prompts.
 */
// @spec-link [[rule_controller_connects_between_sessions]]
// @spec-link [[rule_chromium_only_support]]
export interface MidiAccessProvider {
  readonly isSupported: () => boolean
  readonly request: () => Promise<MidiAccessRequest>
  readonly permission: () => Promise<MidiPermissionState>
}
