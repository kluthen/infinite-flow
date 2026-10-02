/**
 * The MIDI controller's public shapes: the device snapshot, the connection state, the change it
 * reports, its operations and its typed failure. Every state is a normal state the app works in:
 * none of them blocks a session.
 */

import type { AudioTime } from '../session/session-types'
import type { MidiPermissionState } from './midi-access-port'
import type { PlayedNoteEvent, PlayedNoteEvents } from './played-note-tracker'

/** A plain snapshot of one MIDI input, for display and selection; never the port itself. */
// @spec-link [[req_midi_controller_input]]
export interface MidiDevice {
  readonly id: string
  readonly name: string
  readonly manufacturer: string
}

/**
 * Where the controller connection stands.
 * - `unsupported`: this browser has no Web MIDI (known without asking the player).
 * - `not-requested`: MIDI access was never asked for.
 * - `requesting`: the permission request is in flight.
 * - `denied`: the player or the browser refused MIDI access.
 * - `no-device`: access granted, nothing selected, no input present.
 * - `choosing`: access granted, nothing selected, inputs present: the player must pick one.
 * - `opening`: the selected input's port is being opened.
 * - `connected`: the selected input's port is present and open (the controller is attached).
 * - `away`: the selected input's port reports disconnected (the controller is lost), or is
 *   present but its open failed (not attached; its next input change retries), or its
 *   reattachment is held back; the selection is kept.
 */
// @spec-link [[rule_controller_attached_definition]]
// @spec-link [[rule_midi_never_blocks_session]]
export type MidiControllerState =
  | { readonly kind: 'unsupported' }
  | { readonly kind: 'not-requested' }
  | { readonly kind: 'requesting' }
  | { readonly kind: 'denied' }
  | { readonly kind: 'no-device' }
  | { readonly kind: 'choosing' }
  | { readonly kind: 'opening'; readonly device: MidiDevice }
  | { readonly kind: 'connected'; readonly device: MidiDevice }
  | { readonly kind: 'away'; readonly device: MidiDevice }

/** What subscribers are told whenever the state or the list of present devices changes. */
// @spec-link [[rule_controller_attached_definition]]
export interface MidiControllerChange {
  readonly state: MidiControllerState
  readonly devices: readonly MidiDevice[]
}

/** The MIDI controller's operations; see createMidiController. */
// @spec-link [[req_midi_controller_input]]
export interface MidiController {
  readonly state: () => MidiControllerState
  readonly devices: () => readonly MidiDevice[]
  /** The browser's MIDI permission, read through the provider; never prompts, in any state. */
  // @spec-link [[rule_controller_connects_between_sessions]]
  readonly permission: () => Promise<MidiPermissionState>
  readonly connect: () => Promise<void>
  /**
   * Abandon the connect() whose request is in flight (only while `requesting`, else throws a
   * MidiControllerError): its outcome is still recorded, but that connect() selects nothing,
   * unless a connect() called before the answer adopts the request.
   */
  // @spec-link [[rule_controller_connects_between_sessions]]
  readonly abandonConnect: () => void
  readonly select: (deviceId: string) => Promise<void>
  /**
   * The player's Disconnect: end held notes, clear the selection (ending any reattachment hold);
   * the old port is no longer read nor reattached by itself. Throws a MidiControllerError when
   * nothing is selected.
   */
  // @spec-link [[req_midi_controller_input]]
  readonly disconnect: () => void
  /**
   * Hold back the away device's reattachment, for a session started without it: while held, the
   * selected port coming back stays `away`, is never opened nor read; the selection is kept. Only
   * while `away` and not already held, else throws a MidiControllerError.
   */
  // @spec-link [[rule_start_while_controller_away]]
  // @spec-link [[rule_controllerless_session_never_gains_controller]]
  readonly holdReattachment: () => void
  /**
   * End the hold: the selected port present now reattaches as on a replug (reopened if closed),
   * else it reattaches when it comes back. Throws a MidiControllerError when nothing is held.
   */
  // @spec-link [[rule_start_while_controller_away]]
  // @spec-link [[rule_same_controller_reattaches]]
  readonly releaseReattachment: () => void
  readonly subscribe: (listener: (change: MidiControllerChange) => void) => () => void
  readonly onPlayedNote: (listener: (event: PlayedNoteEvent) => void) => () => void
  /**
   * End every held note and return the ended notes (also told to the note listeners). They end at
   * `at`, or at the last time mapped from the current selection's messages when that is later:
   * message order beats clock jitter, so a note pressed just before `at` never ends before its
   * onset.
   */
  // @spec-link [[rule_only_note_on_counts_as_played]]
  readonly releaseHeld: (at: AudioTime) => PlayedNoteEvents
}

/** Typed failure for a call the controller's current state does not allow (a caller bug). */
// @spec-link [[req_midi_controller_input]]
export class MidiControllerError extends Error {
  readonly kind = 'MidiControllerError' as const

  constructor(message: string) {
    super(message)
    this.name = 'MidiControllerError'
  }
}
