/**
 * Shared fixtures for the connection-sheet reducer specs: devices, controller snapshots, and
 * helpers that drive the reducer to a given stage through its public events.
 */
import {
  initialSheetModel,
  reduceSheet,
  type SheetEffect,
  type SheetEvent,
  type SheetModel,
} from '@/components/controller-connection/connection-sheet-model'
import type {
  MidiControllerChange,
  MidiControllerState,
  MidiDevice,
} from '@/midi/midi-controller-state'

export const KEYS: MidiDevice = { id: 'keys', name: 'Keys', manufacturer: 'Acme' }
export const PAD: MidiDevice = { id: 'pad', name: 'Pad', manufacturer: 'Beta' }
export const FLUTE: MidiDevice = { id: 'flute', name: 'Flute', manufacturer: 'Gamma' }

/** Intent: a controller snapshot with these devices present. */
export function change(
  state: MidiControllerState,
  devices: readonly MidiDevice[] = [],
): MidiControllerChange {
  return { state, devices }
}

/** Intent: the controller asking for access, nothing listed yet. */
export const REQUESTING = change({ kind: 'requesting' })

/** Intent: a state with this device selected, in the given kind. */
export function selected(
  kind: 'opening' | 'connected' | 'away',
  device: MidiDevice,
): MidiControllerState {
  return { kind, device }
}

/** The result of running events: the last model, and every effect emitted, in order. */
export interface Run {
  readonly model: SheetModel
  readonly effects: readonly SheetEffect[]
}

/** Intent: run events through the reducer from a model, collecting every effect. */
export function run(model: SheetModel, ...events: SheetEvent[]): Run {
  return events.reduce<Run>(
    (acc, event) => {
      const step = reduceSheet(acc.model, event)
      return { model: step.model, effects: [...acc.effects, ...step.effects] }
    },
    { model, effects: [] },
  )
}

/** Intent: a sheet just opened at Requesting access, the controller requesting. */
export function requestingSheet(): SheetModel {
  return run(initialSheetModel(change({ kind: 'not-requested' })), {
    kind: 'open-requesting',
    controller: REQUESTING,
  }).model
}

/** Intent: a sheet opened at Requesting access whose connect() settled with this snapshot. */
export function settled(controller: MidiControllerChange): Run {
  return run(requestingSheet(), { kind: 'connect-settled', controller })
}

/** Intent: a sheet at Transposition check for KEYS (the only input), with these devices present. */
export function checkSheet(devices: readonly MidiDevice[] = [KEYS]): SheetModel {
  const opened = settled(change(selected('connected', KEYS), [KEYS])).model
  return run(opened, {
    kind: 'controller-changed',
    controller: change(selected('connected', KEYS), devices),
  }).model
}

/** Intent: a sheet at Connected for KEYS (checked, then continued), with these devices present. */
export function connectedSheet(devices: readonly MidiDevice[] = [KEYS]): SheetModel {
  return run(
    checkSheet(devices),
    { kind: 'note-played', pitch: 60 },
    { kind: 'action', action: 'continue' },
  ).model
}

/** Intent: a sheet at the picker, reached by settling with these devices and nothing selected. */
export function pickerSheet(devices: readonly MidiDevice[]): SheetModel {
  return settled(change({ kind: 'choosing' }, devices)).model
}
