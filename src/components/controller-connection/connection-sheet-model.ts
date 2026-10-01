/**
 * The controller-connection sheet as a pure reducer: which state the sheet shows, the picker's
 * list, the device-change line, and the controller snapshot last seen. Events come from the view
 * (open, named actions, a chosen device) and from the controller (connect settled, changes,
 * played notes); effects are data the view runs on the controller (connect, select, disconnect,
 * abandon the connect). It follows the screen handoff's states, named actions and device changes
 * while the sheet is open, and the flow handoff's entry-and-exit diagram.
 */

import type {
  MidiControllerChange,
  MidiControllerState,
  MidiDevice,
} from '@/midi/midi-controller-state'

/** The browser's MIDI permission, as far as it is known (structurally the controller's own). */
type MidiPermissionState = 'granted' | 'prompt' | 'denied' | 'unknown'

/**
 * The sheet's state. `requesting.waiting`: the browser's own permission prompt is showing (Allow
 * MIDI access), else Checking (Connecting…). `check.played`: null in the Prompt sub-state, the
 * played pitch in the Result sub-state. `picker.fromConnected`: reached through Choose a different
 * device, so the device in use is marked.
 */
// @spec-link [[rule_controller_connects_between_sessions]]
// @spec-link [[rule_controller_transposition_check]]
export type SheetStage =
  | { readonly kind: 'requesting'; readonly waiting: boolean }
  | { readonly kind: 'unsupported' }
  | { readonly kind: 'denied' }
  | { readonly kind: 'no-device' }
  | { readonly kind: 'picker'; readonly fromConnected: boolean }
  | { readonly kind: 'check'; readonly device: MidiDevice; readonly played: number | null }
  | { readonly kind: 'connected'; readonly device: MidiDevice }
  | { readonly kind: 'closed' }

/**
 * The whole sheet. `pickerDevices`: the picker's list, in browser order when the picker opens,
 * newly plugged devices appended, unplugged ones removed. `unplugged`: the chosen device unplugged
 * during the check or at Connected; its device-change line ("{name} was unplugged.") shows while
 * it is set and the stage is the picker or No device found. `controller`: the latest snapshot.
 */
// @spec-link [[rule_controller_connects_between_sessions]]
// @spec-link [[rule_same_controller_reattaches]]
export interface SheetModel {
  readonly stage: SheetStage
  readonly pickerDevices: readonly MidiDevice[]
  readonly unplugged: { readonly device: MidiDevice; readonly reachedConnected: boolean } | null
  readonly controller: MidiControllerChange
}

/** The sheet's named actions; `close` is also Continue without a controller, Escape, backdrop. */
type SheetAction =
  | 'check-again'
  | 'try-again'
  | 'continue'
  | 'run-check-again'
  | 'choose-different'
  | 'disconnect'
  | 'done'
  | 'close'

/**
 * What the sheet reacts to. `open-requesting`: the caller has already started connect().
 * `open-connected`: the connected badge was clicked. `connect-settled`: connect() resolved (or no
 * connect was made, on an unsupported browser). `note-played`: a played note from the selected,
 * connected input only.
 */
// @spec-link [[req_midi_controller_input]]
export type SheetEvent =
  | { readonly kind: 'open-requesting'; readonly controller: MidiControllerChange }
  | { readonly kind: 'open-connected'; readonly controller: MidiControllerChange }
  | { readonly kind: 'permission-known'; readonly permission: MidiPermissionState }
  | { readonly kind: 'connect-settled'; readonly controller: MidiControllerChange }
  | { readonly kind: 'controller-changed'; readonly controller: MidiControllerChange }
  | { readonly kind: 'note-played'; readonly pitch: number }
  | { readonly kind: 'action'; readonly action: SheetAction }
  | { readonly kind: 'choose'; readonly deviceId: string }

/** What the view must do on the controller after a step. */
// @spec-link [[req_midi_controller_input]]
export type SheetEffect =
  | { readonly kind: 'connect' }
  | { readonly kind: 'select'; readonly deviceId: string }
  | { readonly kind: 'disconnect' }
  | { readonly kind: 'abandon-connect' }

/** One reducer step: the next model and the effects to run, in order. */
interface SheetStep {
  readonly model: SheetModel
  readonly effects: readonly SheetEffect[]
}

/** Typed failure for an event the sheet's current stage does not allow (a caller bug). */
// @spec-link [[req_midi_controller_input]]
export class ConnectionSheetError extends Error {
  readonly kind = 'ConnectionSheetError' as const

  constructor(message: string) {
    super(message)
    this.name = 'ConnectionSheetError'
  }
}

/** Intent: the sheet before it ever opens: closed, with the controller's current snapshot. */
// @spec-link [[rule_controller_connects_between_sessions]]
export function initialSheetModel(controller: MidiControllerChange): SheetModel {
  return closedModel(controller)
}

/**
 * Intent: reduce one event. The sheet opens at Requesting access (connect() already started) or
 * at Connected; Requesting access resolves on connect-settled only, so a late answer after close
 * opens nothing; device changes follow the screen handoff's rules; a played note fills the
 * check's Prompt; every action or choice the current stage does not offer throws.
 */
// @spec-link [[rule_controller_connects_between_sessions]]
// @spec-link [[rule_controller_transposition_check]]
// @spec-link [[rule_same_controller_reattaches]]
// @spec-link [[req_midi_controller_input]]
export function reduceSheet(model: SheetModel, event: SheetEvent): SheetStep {
  switch (event.kind) {
    case 'open-requesting':
      requireStage(model, event.kind, 'closed')
      return step(sheet(event.controller, { kind: 'requesting', waiting: false }))
    case 'open-connected':
      requireStage(model, event.kind, 'closed')
      return step(sheet(event.controller, connectedStage(event.controller.state)))
    case 'permission-known':
      return onPermission(model, event.permission)
    case 'connect-settled':
      return onConnectSettled(model, event.controller)
    case 'controller-changed':
      return onControllerChanged({ ...model, controller: event.controller })
    case 'note-played':
      return onNotePlayed(model, event.pitch)
    case 'action':
      return onAction(model, event.action)
    case 'choose':
      return onChoose(model, event.deviceId)
  }
}

/** Intent: a frozen model at this stage, no picker list and no device-change line. */
function sheet(controller: MidiControllerChange, stage: SheetStage): SheetModel {
  return Object.freeze({ stage, pickerDevices: Object.freeze([]), unplugged: null, controller })
}

/** Intent: the closed sheet: nothing listed, no line, the snapshot kept. */
function closedModel(controller: MidiControllerChange): SheetModel {
  return sheet(controller, { kind: 'closed' })
}

/** Intent: a frozen step from a model (frozen too) and its effects. */
function step(model: SheetModel, effects: readonly SheetEffect[] = []): SheetStep {
  return Object.freeze({ model: Object.freeze(model), effects: Object.freeze(effects) })
}

/** Intent: Connected for the controller's connected device; any other state is a caller bug. */
function connectedStage(state: MidiControllerState): SheetStage {
  if (state.kind !== 'connected') {
    throw new ConnectionSheetError(`Cannot show Connected: the controller is ${state.kind}.`)
  }
  return { kind: 'connected', device: state.device }
}

/** Intent: the stage, narrowed to one of `kinds`; any other stage throws (crash early). */
function requireStage<K extends SheetStage['kind']>(
  model: SheetModel,
  what: string,
  ...kinds: K[]
): Extract<SheetStage, { kind: K }> {
  const stage = model.stage
  if (!(kinds as string[]).includes(stage.kind)) {
    throw new ConnectionSheetError(`Cannot ${what} while the sheet is at ${stage.kind}.`)
  }
  return stage as Extract<SheetStage, { kind: K }>
}

/** Intent: the id of the device the controller has selected and opening or open, else null. */
function selectedOpenId(state: MidiControllerState): string | null {
  return state.kind === 'opening' || state.kind === 'connected' ? state.device.id : null
}

/** Intent: Waiting for your browser once the permission is known to be `prompt`, while requesting. */
function onPermission(model: SheetModel, permission: MidiPermissionState): SheetStep {
  if (model.stage.kind !== 'requesting' || permission !== 'prompt') return step(model)
  return step({ ...model, stage: { kind: 'requesting', waiting: true } })
}

/**
 * Intent: resolve Requesting access from the settled snapshot: unsupported, denied, or by the
 * inputs present when access was granted. Anywhere else (a late answer after close) it only
 * stores the snapshot. A controller still requesting or never asked breaks connect()'s contract.
 */
function onConnectSettled(model: SheetModel, controller: MidiControllerChange): SheetStep {
  const stored = { ...model, controller }
  if (model.stage.kind !== 'requesting') return step(stored)
  const kind = controller.state.kind
  if (kind === 'requesting' || kind === 'not-requested') {
    throw new ConnectionSheetError(`connect() settled with the controller still ${kind}.`)
  }
  if (kind === 'unsupported' || kind === 'denied') return step(sheet(controller, { kind }))
  return resolveDevices(stored)
}

/**
 * Intent: resolve by the inputs present, as Try again would: none → No device found; exactly one
 * → its check, selected unless already the controller's opening or open selection; two or more →
 * the picker in browser order. The device-change line is cleared.
 */
function resolveDevices(model: SheetModel): SheetStep {
  const devices = model.controller.devices
  const [only] = devices
  if (devices.length === 0) return step(sheet(model.controller, { kind: 'no-device' }))
  if (devices.length === 1 && only !== undefined) return checkFor(model, only)
  return step({
    ...sheet(model.controller, { kind: 'picker', fromConnected: false }),
    pickerDevices: Object.freeze([...devices]),
  })
}

/** Intent: the check's Prompt for this device, selecting it unless it is already selected. */
function checkFor(model: SheetModel, device: MidiDevice): SheetStep {
  const next = sheet(model.controller, { kind: 'check', device, played: null })
  if (selectedOpenId(model.controller.state) === device.id) return step(next)
  return step(next, [{ kind: 'select', deviceId: device.id }])
}

/** Intent: the first played note in the check's Prompt is its result; any other is ignored. */
function onNotePlayed(model: SheetModel, pitch: number): SheetStep {
  const stage = model.stage
  if (stage.kind !== 'check' || stage.played !== null) return step(model)
  return step({ ...model, stage: { ...stage, played: pitch } })
}

/** Intent: in the picker, the chosen listed device goes to its check (selected if not already). */
function onChoose(model: SheetModel, deviceId: string): SheetStep {
  requireStage(model, 'choose a device', 'picker')
  const device = model.pickerDevices.find((listed) => listed.id === deviceId)
  if (device === undefined) {
    throw new ConnectionSheetError(`Cannot choose "${deviceId}": the picker does not list it.`)
  }
  return checkFor(model, device)
}

/**
 * Intent: run a named action, only from the stages offering it (screen handoff, Named actions):
 * Check again and Try again request access again; Continue and Run check again need a check
 * result (Run check again also from Connected); Choose a different device, Disconnect and Done
 * are on Connected; Close works from any open stage and abandons a connect still requesting.
 */
function onAction(model: SheetModel, action: SheetAction): SheetStep {
  const controller = model.controller
  switch (action) {
    case 'check-again':
    case 'try-again':
      requireStage(model, action, action === 'check-again' ? 'denied' : 'no-device')
      return step(sheet(controller, { kind: 'requesting', waiting: false }), [{ kind: 'connect' }])
    case 'continue':
      return step(sheet(controller, { kind: 'connected', device: checkResult(model, action) }))
    case 'run-check-again': {
      const device =
        model.stage.kind === 'connected' ? model.stage.device : checkResult(model, action)
      return step(sheet(controller, { kind: 'check', device, played: null }))
    }
    case 'choose-different':
      requireStage(model, action, 'connected')
      return step({
        ...sheet(controller, { kind: 'picker', fromConnected: true }),
        pickerDevices: Object.freeze([...controller.devices]),
      })
    case 'disconnect':
      requireStage(model, action, 'connected')
      return step(closedModel(controller), [{ kind: 'disconnect' }])
    case 'done':
      requireStage(model, action, 'connected')
      return step(closedModel(controller))
    case 'close':
      return onClose(model)
  }
}

/** Intent: the checked device of a check showing its result; any other stage throws. */
function checkResult(model: SheetModel, action: SheetAction): MidiDevice {
  const stage = requireStage(model, action, 'check')
  if (stage.played === null) {
    throw new ConnectionSheetError(`Cannot ${action} before the check has a result.`)
  }
  return stage.device
}

/** Intent: close from any open stage; a close while the controller still requests abandons it. */
function onClose(model: SheetModel): SheetStep {
  const stage = model.stage
  if (stage.kind === 'closed') throw new ConnectionSheetError('Cannot close a closed sheet.')
  const abandon = stage.kind === 'requesting' && model.controller.state.kind === 'requesting'
  return step(closedModel(model.controller), abandon ? [{ kind: 'abandon-connect' }] : [])
}

/**
 * Intent: follow a controller change (already stored), by stage, per the screen handoff's Device
 * changes while the sheet is open: Requesting access, Unsupported browser, Permission denied (and
 * a closed sheet) only keep the snapshot.
 */
function onControllerChanged(model: SheetModel): SheetStep {
  const stage = model.stage
  switch (stage.kind) {
    case 'no-device':
      return onNoDeviceChange(model)
    case 'picker':
      return onPickerChange(model)
    case 'check':
    case 'connected':
      return onChosenChange(model, stage)
    default:
      return step(model)
  }
}

/**
 * Where the unplugged device stands: `returned` once it is back far enough to leave (opening or
 * open for a mid-check device, open for one that had reached Connected), `returning` while one
 * that had reached Connected is reopening, else `absent`.
 */
type Return = 'returned' | 'returning' | 'absent'

/** Intent: whether the unplugged device is back as the controller's selection (see Return). */
function returnOf(model: SheetModel): Return {
  const unplugged = model.unplugged
  const state = model.controller.state
  if (unplugged === null || selectedOpenId(state) !== unplugged.device.id) return 'absent'
  return state.kind === 'opening' && unplugged.reachedConnected ? 'returning' : 'returned'
}

/**
 * Intent: the unplugged device back: Connected again if it had reached it (reattached, no new
 * check), else its check from the Prompt; the line is cleared, and nothing is selected (the
 * controller kept the selection).
 */
function onReturn(model: SheetModel, unplugged: NonNullable<SheetModel['unplugged']>): SheetStep {
  const device = unplugged.device
  const stage: SheetStage = unplugged.reachedConnected
    ? { kind: 'connected', device }
    : { kind: 'check', device, played: null }
  return step(sheet(model.controller, stage))
}

/**
 * Intent: on No device found, the unplugged device back returns where it was (waiting while it
 * reopens); otherwise any input present resolves as Try again would, with no new request.
 */
// @spec-link [[rule_same_controller_reattaches]]
function onNoDeviceChange(model: SheetModel): SheetStep {
  const back = returnOf(model)
  if (back === 'returned' && model.unplugged !== null) return onReturn(model, model.unplugged)
  if (back === 'returning' || model.controller.devices.length === 0) return step(model)
  return resolveDevices(model)
}

/**
 * Intent: in the picker, the unplugged device back returns where it was; otherwise the list
 * follows the present inputs (kept in place, new ones appended, gone ones removed), and an empty
 * list becomes No device found, keeping the device-change line.
 */
// @spec-link [[rule_same_controller_reattaches]]
function onPickerChange(model: SheetModel): SheetStep {
  if (returnOf(model) === 'returned' && model.unplugged !== null) {
    return onReturn(model, model.unplugged)
  }
  const present = model.controller.devices
  const kept = model.pickerDevices.filter((shown) => present.some((p) => p.id === shown.id))
  const added = present.filter((p) => !model.pickerDevices.some((shown) => shown.id === p.id))
  const pickerDevices = Object.freeze([...kept, ...added])
  if (pickerDevices.length === 0) {
    return step({ ...model, stage: { kind: 'no-device' }, pickerDevices })
  }
  return step({ ...model, pickerDevices })
}

/**
 * Intent: during the check or at Connected, the chosen device away ends the connection: the
 * picker with the present inputs, or No device found, with the device-change line remembering
 * whether it had reached Connected. The sheet never switches device by itself; any other change
 * shows nothing.
 */
// @spec-link [[rule_controller_transposition_check]]
function onChosenChange(
  model: SheetModel,
  stage: Extract<SheetStage, { kind: 'check' | 'connected' }>,
): SheetStep {
  const state = model.controller.state
  if (state.kind !== 'away' || state.device.id !== stage.device.id) return step(model)
  const unplugged = Object.freeze({
    device: stage.device,
    reachedConnected: stage.kind === 'connected',
  })
  const present = model.controller.devices
  const next: SheetStage =
    present.length === 0 ? { kind: 'no-device' } : { kind: 'picker', fromConnected: false }
  return step({
    ...sheet(model.controller, next),
    pickerDevices: Object.freeze([...present]),
    unplugged,
  })
}
