/**
 * The header's controller-status form. A few facts are folded from every controller change (the
 * latest state, whether a controller ever connected this page session, whether the latest request
 * was refused, the inputs seen), and one header form is read from them, per the header-form table
 * of the controller-connection flow. Pure; loaded with the workspace, so kept small.
 */

import type { MidiControllerChange, MidiControllerState, MidiDevice } from './midi-controller-state'

/** What the header remembers from the controller's changes this page session. */
// @spec-link [[rule_controller_attached_definition]]
export interface ControllerStatusFacts {
  readonly state: MidiControllerState
  readonly everConnected: boolean
  readonly blocked: boolean
  readonly seenDeviceIds: readonly string[]
}

/** The states in which MIDI access is granted: a request that ended in one was not refused. */
const GRANTED_KINDS: ReadonlySet<MidiControllerState['kind']> = new Set([
  'no-device',
  'choosing',
  'opening',
  'connected',
  'away',
])

/** Intent: the facts at page start, from the controller's current state, no input seen yet. */
// @spec-link [[rule_controller_attached_definition]]
export function initialControllerStatusFacts(state: MidiControllerState): ControllerStatusFacts {
  return Object.freeze({
    state,
    everConnected: state.kind === 'connected',
    blocked: state.kind === 'denied',
    seenDeviceIds: Object.freeze([]),
  })
}

/**
 * Intent: fold one controller change. A connected state marks a controller as ever connected (for
 * good: the header never returns to Connect controller); denied blocks, a granted state unblocks,
 * and requesting, not-requested or unsupported leave the latest answer standing. Every device id
 * present joins the seen ids, once, in first-seen order.
 */
// @spec-link [[rule_controller_attached_definition]]
// @spec-link [[rule_same_controller_reattaches]]
export function foldControllerStatus(
  facts: ControllerStatusFacts,
  change: MidiControllerChange,
): ControllerStatusFacts {
  const kind = change.state.kind
  const newIds = change.devices
    .map((device) => device.id)
    .filter((id, index, ids) => !facts.seenDeviceIds.includes(id) && ids.indexOf(id) === index)
  return Object.freeze({
    state: change.state,
    everConnected: facts.everConnected || kind === 'connected',
    blocked: kind === 'denied' ? true : GRANTED_KINDS.has(kind) ? false : facts.blocked,
    seenDeviceIds:
      newIds.length === 0
        ? facts.seenDeviceIds
        : Object.freeze([...facts.seenDeviceIds, ...newIds]),
  })
}

/** The header's controller-status forms (the error-toned `disconnected` exists in sessions only). */
// @spec-link [[rule_controller_attached_definition]]
export type ControllerStatusForm =
  | { readonly kind: 'connect' }
  | { readonly kind: 'connected'; readonly device: MidiDevice }
  | { readonly kind: 'no-controller' }
  | { readonly kind: 'blocked' }
  | { readonly kind: 'disconnected' }

/**
 * Intent: the one form the header shows. A controller lost in a running session shows
 * disconnected before all else; then a connected state (the same device reattached by itself
 * included) shows the connected badge; a refused latest request shows MIDI blocked; a controller
 * that connected earlier this page session shows no-controller; otherwise Connect controller.
 * `opening` and `away` are not connected. No form ever blocks a session.
 */
// @spec-link [[rule_controller_attached_definition]]
// @spec-link [[rule_same_controller_reattaches]]
// @spec-link [[rule_midi_never_blocks_session]]
export function controllerStatusForm(
  facts: ControllerStatusFacts,
  options: { readonly lostInSession: boolean },
): ControllerStatusForm {
  if (options.lostInSession) return Object.freeze({ kind: 'disconnected' })
  if (facts.state.kind === 'connected') {
    return Object.freeze({ kind: 'connected', device: facts.state.device })
  }
  if (facts.blocked) return Object.freeze({ kind: 'blocked' })
  if (facts.everConnected) return Object.freeze({ kind: 'no-controller' })
  return Object.freeze({ kind: 'connect' })
}
