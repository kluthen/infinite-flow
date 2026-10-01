/**
 * The MIDI controller's connection: MIDI access is only requested by connect(), every outcome is a
 * typed state that never throws, the only device present is selected by itself, several devices
 * leave the player to pick one, and only the selected port is ever opened or listened to.
 */
import { describe, expect, it } from 'vitest'

import { MidiControllerError } from '@/midi/midi-controller-state'

import { createControllerRig, KEYS_A, KEYS_A2, PAD_B } from './midi-controller-rig'

/** Intent: let every pending promise callback run. */
function settled(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

// @test-link [[rule_controller_connects_between_sessions]]
describe('MidiController: MIDI access is requested only by connect()', () => {
  it('starts not-requested, lists no device and never requests access by itself', () => {
    const { midi, controller } = createControllerRig({ devices: [KEYS_A] })
    expect(controller.state()).toEqual({ kind: 'not-requested' })
    expect(controller.devices()).toEqual([])
    expect(midi.requestCount()).toBe(0)
  })

  it('requests access once when connect() is called', async () => {
    const { midi, controller } = createControllerRig({ devices: [KEYS_A] })
    await controller.connect()
    expect(midi.requestCount()).toBe(1)
  })

  it('does not request access again when connecting with access already granted', async () => {
    const { midi, controller } = createControllerRig({ devices: [KEYS_A] })
    await controller.connect()
    await controller.connect()
    expect(midi.requestCount()).toBe(1)
  })

  it('is requesting while the request is in flight, and connect() then throws', async () => {
    const { midi, controller } = createControllerRig({ devices: [KEYS_A] })
    midi.holdNextRequest()
    const pending = controller.connect()
    expect(controller.state()).toEqual({ kind: 'requesting' })
    await expect(controller.connect()).rejects.toBeInstanceOf(MidiControllerError)
    midi.releaseHeldRequest()
    await pending
    expect(controller.state()).toEqual({ kind: 'connected', device: KEYS_A })
  })
})

// @test-link [[rule_midi_never_blocks_session]]
// @test-link [[rule_chromium_only_support]]
describe('MidiController: unsupported and denied are typed states', () => {
  it('is unsupported from construction, without requesting, and connect() throws', async () => {
    const { midi, controller } = createControllerRig({ supported: false })
    expect(controller.state()).toEqual({ kind: 'unsupported' })
    await expect(controller.connect()).rejects.toBeInstanceOf(MidiControllerError)
    expect(midi.requestCount()).toBe(0)
  })

  it('is denied when access is refused, and connect() asks again from there', async () => {
    const { midi, controller } = createControllerRig({ devices: [KEYS_A] })
    midi.denyNextRequest()
    await controller.connect()
    expect(controller.state()).toEqual({ kind: 'denied' })
    expect(controller.devices()).toEqual([])
    expect(midi.openCount(KEYS_A.id)).toBe(0)
    await controller.connect()
    expect(midi.requestCount()).toBe(2)
    expect(controller.state()).toEqual({ kind: 'connected', device: KEYS_A })
  })

  it('restores not-requested when the request rejects, rethrows the same error, and connects again', async () => {
    const { midi, controller, changes } = createControllerRig({ devices: [KEYS_A] })
    const failure = new Error('broken request')
    midi.failNextRequest(failure)
    await expect(controller.connect()).rejects.toBe(failure)
    expect(controller.state()).toEqual({ kind: 'not-requested' })
    expect(changes.map((change) => change.state.kind)).toEqual(['requesting', 'not-requested'])
    await controller.connect()
    expect(controller.state()).toEqual({ kind: 'connected', device: KEYS_A })
  })

  it('restores denied when a request from denied rejects', async () => {
    const { midi, controller } = createControllerRig({ devices: [KEYS_A] })
    midi.denyNextRequest()
    await controller.connect()
    const failure = new Error('broken request')
    midi.failNextRequest(failure)
    await expect(controller.connect()).rejects.toBe(failure)
    expect(controller.state()).toEqual({ kind: 'denied' })
  })

  it('rejects select() before access is granted', async () => {
    const { controller } = createControllerRig({ devices: [KEYS_A] })
    await expect(controller.select(KEYS_A.id)).rejects.toBeInstanceOf(MidiControllerError)
  })
})

// @test-link [[rule_controller_attached_definition]]
// @test-link [[req_midi_controller_input]]
describe('MidiController: picking the one input', () => {
  it('is no-device when access is granted and no input is present', async () => {
    const { controller } = createControllerRig()
    await controller.connect()
    expect(controller.state()).toEqual({ kind: 'no-device' })
    expect(controller.devices()).toEqual([])
  })

  it('selects the only device present and is connected without any note played', async () => {
    const { midi, controller, changes } = createControllerRig({ devices: [KEYS_A] })
    await controller.connect()
    expect(controller.state()).toEqual({ kind: 'connected', device: KEYS_A })
    expect(controller.devices()).toEqual([KEYS_A])
    expect(midi.openCount(KEYS_A.id)).toBe(1)
    expect(midi.isListening(KEYS_A.id)).toBe(true)
    expect(changes.map((change) => change.state.kind)).toEqual([
      'requesting',
      'opening',
      'connected',
    ])
  })

  it('leaves the player to choose among several devices, opening and listening to none', async () => {
    const { midi, controller } = createControllerRig({ devices: [KEYS_A, PAD_B] })
    await controller.connect()
    expect(controller.state()).toEqual({ kind: 'choosing' })
    expect(controller.devices()).toEqual([KEYS_A, PAD_B])
    expect([midi.openCount(KEYS_A.id), midi.openCount(PAD_B.id)]).toEqual([0, 0])
    expect([midi.isListening(KEYS_A.id), midi.isListening(PAD_B.id)]).toEqual([false, false])
  })

  it('connects the picked device only, keeping two identical keyboards apart by id', async () => {
    const { midi, controller } = createControllerRig({ devices: [KEYS_A, KEYS_A2] })
    await controller.connect()
    await controller.select(KEYS_A2.id)
    expect(controller.state()).toEqual({ kind: 'connected', device: KEYS_A2 })
    expect(midi.openCount(KEYS_A.id)).toBe(0)
    expect(midi.isListening(KEYS_A.id)).toBe(false)
  })

  it('is opening while the picked port opens', async () => {
    const { midi, controller } = createControllerRig({ devices: [KEYS_A, PAD_B] })
    await controller.connect()
    midi.holdNextOpen(PAD_B.id)
    const opening = controller.select(PAD_B.id)
    expect(controller.state()).toEqual({ kind: 'opening', device: PAD_B })
    midi.releaseHeldOpen(PAD_B.id)
    await opening
    expect(controller.state()).toEqual({ kind: 'connected', device: PAD_B })
  })

  // @test-link [[rule_controller_attached_definition]]
  // @test-link [[rule_same_controller_reattaches]]
  it('is away when the picked port fails to open, rejects select(), and opens it on replug', async () => {
    const { midi, controller, changes, at } = createControllerRig({ devices: [KEYS_A, PAD_B] })
    await controller.connect()
    const failure = new Error('port busy')
    midi.failNextOpen(PAD_B.id, failure)
    await expect(controller.select(PAD_B.id)).rejects.toBe(failure)
    expect(controller.state()).toEqual({ kind: 'away', device: PAD_B })
    expect(changes.map((change) => change.state.kind).slice(-2)).toEqual(['opening', 'away'])
    midi.unplug(PAD_B.id, at(1))
    midi.plug(PAD_B, at(2))
    await settled()
    expect(midi.openCount(PAD_B.id)).toBe(2)
    expect(controller.state()).toEqual({ kind: 'connected', device: PAD_B })
  })

  it('rejects select() of an id that is not a present input', async () => {
    const { controller } = createControllerRig({ devices: [KEYS_A, PAD_B] })
    await controller.connect()
    await expect(controller.select('port-unknown')).rejects.toBeInstanceOf(MidiControllerError)
    expect(controller.state()).toEqual({ kind: 'choosing' })
  })

  it('keeps an existing selection when connect() is called again', async () => {
    const { midi, controller } = createControllerRig({ devices: [KEYS_A, PAD_B] })
    await controller.connect()
    await controller.select(PAD_B.id)
    await controller.connect()
    expect(controller.state()).toEqual({ kind: 'connected', device: PAD_B })
    expect(midi.openCount(PAD_B.id)).toBe(1)
  })

  it('selects the only device plugged in after a connect() that found none, on the next connect()', async () => {
    const { midi, controller } = createControllerRig()
    await controller.connect()
    midi.plug(KEYS_A)
    expect(controller.state()).toEqual({ kind: 'choosing' })
    expect(midi.openCount(KEYS_A.id)).toBe(0)
    await controller.connect()
    expect(controller.state()).toEqual({ kind: 'connected', device: KEYS_A })
  })

  it('switches to another device picked later', async () => {
    const { controller } = createControllerRig({ devices: [KEYS_A, PAD_B] })
    await controller.connect()
    await controller.select(KEYS_A.id)
    await controller.select(PAD_B.id)
    expect(controller.state()).toEqual({ kind: 'connected', device: PAD_B })
  })

  it('ignores a stale open that completes after a newer pick', async () => {
    const { midi, controller } = createControllerRig({ devices: [KEYS_A, PAD_B] })
    await controller.connect()
    midi.holdNextOpen(KEYS_A.id)
    const stale = controller.select(KEYS_A.id)
    await controller.select(PAD_B.id)
    midi.releaseHeldOpen(KEYS_A.id)
    await stale
    expect(controller.state()).toEqual({ kind: 'connected', device: PAD_B })
  })
})

// @test-link [[rule_controller_attached_definition]]
describe('MidiController: subscribe', () => {
  it('reports the state and the present devices, and stops after unsubscribing', async () => {
    const { midi, controller } = createControllerRig({ devices: [KEYS_A, PAD_B] })
    const seen: string[] = []
    const unsubscribe = controller.subscribe((change) =>
      seen.push(`${change.state.kind}:${change.devices.map((d) => d.id).join(',')}`),
    )
    await controller.connect()
    unsubscribe()
    midi.unplug(PAD_B.id, 0)
    expect(seen).toEqual(['requesting:', 'choosing:port-a,port-b'])
  })
})
