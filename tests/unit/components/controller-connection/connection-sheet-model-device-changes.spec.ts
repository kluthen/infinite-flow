/**
 * The connection sheet follows the inputs the browser reports while it is open: no effect while
 * requesting, unsupported or denied; No device found and the picker follow plugs and unplugs; the
 * chosen device unplugged during the check or at Connected moves to the picker or No device found
 * with the device-change line, and that same device plugged back returns where it was.
 */
import { describe, expect, it } from 'vitest'

import {
  reduceSheet,
  type SheetModel,
} from '@/components/controller-connection/connection-sheet-model'
import type { MidiControllerChange } from '@/midi/midi-controller-state'

import {
  change,
  checkSheet,
  connectedSheet,
  FLUTE,
  KEYS,
  PAD,
  pickerSheet,
  run,
  selected,
  settled,
} from './sheet-model-fixtures'

/** Intent: one controller change while the sheet is open. */
function changed(model: SheetModel, controller: MidiControllerChange) {
  return reduceSheet(model, { kind: 'controller-changed', controller })
}

/** Intent: KEYS (the chosen device) unplugged while the sheet is at `model`, PAD maybe present. */
function unplugKeys(model: SheetModel, others: readonly (typeof PAD)[] = []): SheetModel {
  return changed(model, change(selected('away', KEYS), others)).model
}

// @test-link [[rule_controller_connects_between_sessions]]
describe('connection sheet device changes: requesting, unsupported, denied', () => {
  it.each([
    ['unsupported', change({ kind: 'unsupported' })],
    ['denied', change({ kind: 'denied' })],
  ] as const)('only stores the snapshot on %s', (_label, controller) => {
    const model = settled(controller).model
    const step = changed(model, change({ kind: 'denied' }, [KEYS]))
    expect(step.model.stage).toEqual(model.stage)
    expect(step.model.controller).toEqual(change({ kind: 'denied' }, [KEYS]))
    expect(step.effects).toEqual([])
  })
})

// @test-link [[rule_controller_connects_between_sessions]]
describe('connection sheet device changes: No device found', () => {
  const noDevice = (): SheetModel => settled(change({ kind: 'no-device' })).model

  it('moves on by itself to the check when one device is plugged in, without a request', () => {
    const step = changed(noDevice(), change({ kind: 'choosing' }, [PAD]))
    expect(step.model.stage).toEqual({ kind: 'check', device: PAD, played: null })
    expect(step.effects).toEqual([{ kind: 'select', deviceId: 'pad' }])
  })

  it('moves on by itself to the picker when two devices appear', () => {
    const step = changed(noDevice(), change({ kind: 'choosing' }, [PAD, KEYS]))
    expect(step.model.stage).toEqual({ kind: 'picker', fromConnected: false })
    expect(step.model.pickerDevices).toEqual([PAD, KEYS])
    expect(step.effects).toEqual([])
  })

  it('stays when nothing is present', () => {
    const step = changed(noDevice(), change({ kind: 'no-device' }))
    expect(step.model.stage).toEqual({ kind: 'no-device' })
  })

  it('moves to the check for a new device after an unplug, clearing the line', () => {
    const lost = unplugKeys(checkSheet())
    const step = changed(lost, change(selected('away', KEYS), [PAD]))
    expect(step.model.stage).toEqual({ kind: 'check', device: PAD, played: null })
    expect(step.model.unplugged).toBeNull()
    expect(step.effects).toEqual([{ kind: 'select', deviceId: 'pad' }])
  })
})

// @test-link [[rule_controller_connects_between_sessions]]
describe('connection sheet device changes: the picker list', () => {
  it('appends a device plugged in at the end, whatever the browser order', () => {
    const step = changed(pickerSheet([PAD, KEYS]), change({ kind: 'choosing' }, [FLUTE, KEYS, PAD]))
    expect(step.model.pickerDevices).toEqual([PAD, KEYS, FLUTE])
    expect(step.model.stage).toEqual({ kind: 'picker', fromConnected: false })
  })

  it('removes an unplugged device and keeps the picker with one option left', () => {
    const step = changed(pickerSheet([PAD, KEYS, FLUTE]), change({ kind: 'choosing' }, [FLUTE]))
    expect(step.model.pickerDevices).toEqual([FLUTE])
    expect(step.model.stage).toEqual({ kind: 'picker', fromConnected: false })
  })

  it('goes to No device found once the last listed device is unplugged', () => {
    const step = changed(pickerSheet([PAD, KEYS]), change({ kind: 'no-device' }))
    expect(step.model.stage).toEqual({ kind: 'no-device' })
    expect(step.model.pickerDevices).toEqual([])
    expect(step.effects).toEqual([])
  })

  it('keeps the device-change line when the picker empties', () => {
    const lost = unplugKeys(checkSheet([KEYS, PAD]), [PAD])
    const step = changed(lost, change(selected('away', KEYS)))
    expect(step.model.stage).toEqual({ kind: 'no-device' })
    expect(step.model.unplugged).toEqual({ device: KEYS, reachedConnected: false })
  })
})

// @test-link [[rule_controller_connects_between_sessions]]
// @test-link [[rule_controller_transposition_check]]
describe('connection sheet device changes: the chosen device unplugged', () => {
  it('moves the check to the picker when other inputs are present, with the line', () => {
    const step = changed(
      checkSheet([KEYS, PAD, FLUTE]),
      change(selected('away', KEYS), [PAD, FLUTE]),
    )
    expect(step.model.stage).toEqual({ kind: 'picker', fromConnected: false })
    expect(step.model.pickerDevices).toEqual([PAD, FLUTE])
    expect(step.model.unplugged).toEqual({ device: KEYS, reachedConnected: false })
    expect(step.effects).toEqual([])
  })

  it('moves the check to No device found when no input is left, with the line', () => {
    const step = changed(checkSheet(), change(selected('away', KEYS)))
    expect(step.model.stage).toEqual({ kind: 'no-device' })
    expect(step.model.unplugged).toEqual({ device: KEYS, reachedConnected: false })
  })

  it('moves Connected to the picker or No device found, remembering it had connected', () => {
    const toPicker = unplugKeys(connectedSheet([KEYS, PAD]), [PAD])
    expect(toPicker.stage).toEqual({ kind: 'picker', fromConnected: false })
    expect(toPicker.unplugged).toEqual({ device: KEYS, reachedConnected: true })
    const toNoDevice = unplugKeys(connectedSheet())
    expect(toNoDevice.stage).toEqual({ kind: 'no-device' })
    expect(toNoDevice.unplugged).toEqual({ device: KEYS, reachedConnected: true })
  })

  it.each<[string, () => SheetModel]>([
    ['the check', () => checkSheet([KEYS, PAD])],
    ['Connected', () => connectedSheet([KEYS, PAD])],
  ])('shows no change on %s when another device is plugged or unplugged', (_label, at) => {
    const model = at()
    for (const devices of [[KEYS], [KEYS, PAD, FLUTE]]) {
      const step = changed(model, change(selected('connected', KEYS), devices))
      expect(step.model.stage).toEqual(model.stage)
      expect(step.model.unplugged).toBeNull()
      expect(step.model.controller.devices).toEqual(devices)
      expect(step.effects).toEqual([])
    }
  })
})

// @test-link [[rule_same_controller_reattaches]]
// @test-link [[rule_controller_transposition_check]]
describe('connection sheet device changes: the unplugged device plugged back', () => {
  it('restarts the check for a device unplugged mid-check (No device found)', () => {
    const result = run(checkSheet(), { kind: 'note-played', pitch: 61 }).model
    const step = changed(unplugKeys(result), change(selected('opening', KEYS), [KEYS]))
    expect(step.model.stage).toEqual({ kind: 'check', device: KEYS, played: null })
    expect(step.model.unplugged).toBeNull()
    expect(step.effects).toEqual([])
  })

  it('restarts the check for a device unplugged mid-check (picker)', () => {
    const lost = unplugKeys(checkSheet([KEYS, PAD]), [PAD])
    const step = changed(lost, change(selected('opening', KEYS), [PAD, KEYS]))
    expect(step.model.stage).toEqual({ kind: 'check', device: KEYS, played: null })
    expect(step.model.unplugged).toBeNull()
    expect(step.effects).toEqual([])
  })

  it.each<[string, readonly (typeof PAD)[]]>([
    ['No device found', []],
    ['the picker', [PAD]],
  ])('returns to Connected from %s once a connected device reattaches', (_label, others) => {
    const lost = unplugKeys(connectedSheet([KEYS, ...others]), others)
    const reopening = changed(lost, change(selected('opening', KEYS), [...others, KEYS]))
    expect(reopening.model.stage).toEqual(lost.stage)
    expect(reopening.model.unplugged).toEqual({ device: KEYS, reachedConnected: true })
    const step = changed(reopening.model, change(selected('connected', KEYS), [...others, KEYS]))
    expect(step.model.stage).toEqual({ kind: 'connected', device: KEYS })
    expect(step.model.unplugged).toBeNull()
    expect(step.effects).toEqual([])
  })

  it('never switches to a different device by itself', () => {
    const lost = unplugKeys(connectedSheet([KEYS, PAD]), [PAD])
    const step = changed(lost, change(selected('away', KEYS), [PAD, FLUTE]))
    expect(step.model.stage).toEqual({ kind: 'picker', fromConnected: false })
    expect(step.model.pickerDevices).toEqual([PAD, FLUTE])
    expect(step.model.unplugged).toEqual({ device: KEYS, reachedConnected: true })
    expect(step.effects).toEqual([])
  })
})
