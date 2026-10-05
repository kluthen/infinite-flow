/**
 * The MIDI controller's connection-sheet actions: reading the browser's MIDI permission without
 * prompting, abandoning a connect() whose request is in flight (its outcome is recorded, but it
 * selects nothing), and the player's Disconnect (held notes end, the selection clears, and the old
 * port is never read nor reattached by itself again).
 */
import { describe, expect, it } from 'vitest'

import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { MidiControllerError } from '@/midi/midi-controller-state'

import { createControllerRig, KEYS_A, PAD_B } from './midi-controller-rig'

const C4 = makeConcertPitch(60)

// @test-link [[rule_controller_connects_between_sessions]]
describe('MidiController: permission() reads the browser permission without prompting', () => {
  it('is prompt before any request, without requesting access', async () => {
    const { midi, controller } = createControllerRig({ devices: [KEYS_A] })
    await expect(controller.permission()).resolves.toBe('prompt')
    expect(midi.requestCount()).toBe(0)
  })

  it('follows the answered requests: granted after a grant, denied after a refusal', async () => {
    const granted = createControllerRig({ devices: [KEYS_A] })
    await granted.controller.connect()
    await expect(granted.controller.permission()).resolves.toBe('granted')
    const refused = createControllerRig({ devices: [KEYS_A] })
    refused.midi.denyNextRequest()
    await refused.controller.connect()
    await expect(refused.controller.permission()).resolves.toBe('denied')
  })

  it('passes through whatever the provider answers, in any state', async () => {
    const { midi, controller } = createControllerRig({ devices: [KEYS_A] })
    midi.holdNextRequest()
    const pending = controller.connect()
    midi.setPermission('denied')
    await expect(controller.permission()).resolves.toBe('denied')
    midi.setPermission('unknown')
    await expect(controller.permission()).resolves.toBe('unknown')
    midi.releaseHeldRequest()
    await pending
  })

  it('is unknown in a browser without Web MIDI', async () => {
    const { controller } = createControllerRig({ supported: false })
    await expect(controller.permission()).resolves.toBe('unknown')
  })
})

// @test-link [[rule_controller_connects_between_sessions]]
describe('MidiController: abandonConnect()', () => {
  it('keeps a grant answered after abandoning, but selects nothing, even with one device', async () => {
    const { midi, controller } = createControllerRig({ devices: [KEYS_A] })
    midi.holdNextRequest()
    const pending = controller.connect()
    controller.abandonConnect()
    expect(controller.state()).toEqual({ kind: 'requesting' })
    midi.releaseHeldRequest()
    await pending
    expect(controller.state()).toEqual({ kind: 'choosing' })
    expect(controller.devices()).toEqual([KEYS_A])
    expect(midi.openCount(KEYS_A.id)).toBe(0)
    expect(midi.isListening(KEYS_A.id)).toBe(false)
  })

  it('still follows input changes after an abandoned grant, picking no device by itself', async () => {
    const { midi, controller, changes } = createControllerRig()
    midi.holdNextRequest()
    const pending = controller.connect()
    controller.abandonConnect()
    midi.releaseHeldRequest()
    await pending
    expect(controller.state()).toEqual({ kind: 'no-device' })
    midi.plug(KEYS_A)
    expect(controller.state()).toEqual({ kind: 'choosing' })
    expect(changes.at(-1)?.devices).toEqual([KEYS_A])
    expect(midi.openCount(KEYS_A.id)).toBe(0)
  })

  it('records a refusal answered after abandoning', async () => {
    const { midi, controller } = createControllerRig({ devices: [KEYS_A] })
    midi.denyNextRequest()
    midi.holdNextRequest()
    const pending = controller.connect()
    controller.abandonConnect()
    midi.releaseHeldRequest()
    await pending
    expect(controller.state()).toEqual({ kind: 'denied' })
  })

  it('lets a later connect() behave normally, picking the only device', async () => {
    const { midi, controller } = createControllerRig({ devices: [KEYS_A] })
    midi.holdNextRequest()
    const pending = controller.connect()
    controller.abandonConnect()
    midi.releaseHeldRequest()
    await pending
    await controller.connect()
    expect(controller.state()).toEqual({ kind: 'connected', device: KEYS_A })
    expect(midi.requestCount()).toBe(1)
  })

  it('is adopted by a connect() called while its request is in flight: the only device is picked on grant', async () => {
    const { midi, controller } = createControllerRig({ devices: [KEYS_A] })
    midi.holdNextRequest()
    const pending = controller.connect()
    controller.abandonConnect()
    let adoptedSettled = false
    const adopted = controller.connect().then(() => {
      adoptedSettled = true
    })
    await Promise.resolve()
    expect(adoptedSettled).toBe(false)
    expect(controller.state()).toEqual({ kind: 'requesting' })
    midi.releaseHeldRequest()
    await adopted
    await pending
    expect(controller.state()).toEqual({ kind: 'connected', device: KEYS_A })
    expect(midi.requestCount()).toBe(1)
  })

  it('makes the adopting connect() settle as the in-flight one does, rejection included', async () => {
    const { midi, controller } = createControllerRig({ devices: [KEYS_A] })
    const failure = new Error('broken request')
    midi.failNextRequest(failure)
    const pending = controller.connect()
    controller.abandonConnect()
    const adopted = controller.connect()
    await expect(adopted).rejects.toBe(failure)
    await expect(pending).rejects.toBe(failure)
    expect(controller.state()).toEqual({ kind: 'not-requested' })
  })

  it('can be abandoned again once adopted, then picks nothing', async () => {
    const { midi, controller } = createControllerRig({ devices: [KEYS_A] })
    midi.holdNextRequest()
    const pending = controller.connect()
    controller.abandonConnect()
    const adopted = controller.connect()
    controller.abandonConnect()
    midi.releaseHeldRequest()
    await adopted
    await pending
    expect(controller.state()).toEqual({ kind: 'choosing' })
    expect(midi.openCount(KEYS_A.id)).toBe(0)
  })

  it('leaves a connect() during a request still wanted throwing, adopted or not', async () => {
    const { midi, controller } = createControllerRig({ devices: [KEYS_A] })
    midi.holdNextRequest()
    const pending = controller.connect()
    await expect(controller.connect()).rejects.toThrow(MidiControllerError)
    controller.abandonConnect()
    const adopted = controller.connect()
    await expect(controller.connect()).rejects.toThrow(MidiControllerError)
    midi.releaseHeldRequest()
    await adopted
    await pending
    expect(controller.state()).toEqual({ kind: 'connected', device: KEYS_A })
    expect(midi.requestCount()).toBe(1)
  })

  it('throws outside requesting: not-requested, connected or unsupported', async () => {
    const { controller } = createControllerRig({ devices: [KEYS_A] })
    expect(() => controller.abandonConnect()).toThrow(MidiControllerError)
    await controller.connect()
    expect(() => controller.abandonConnect()).toThrow(MidiControllerError)
    const unsupported = createControllerRig({ supported: false })
    expect(() => unsupported.controller.abandonConnect()).toThrow(MidiControllerError)
  })
})

/** Intent: a rig connected to KEYS_A, with PAD_B also present. */
async function connectedToKeysWithPad() {
  const rig = createControllerRig({ devices: [KEYS_A, PAD_B] })
  await rig.controller.connect()
  await rig.controller.select(KEYS_A.id)
  return rig
}

// @test-link [[req_midi_controller_input]]
// @test-link [[rule_controller_attached_definition]]
// @test-link [[rule_disconnect_forgets_controller]]
describe('MidiController: disconnect()', () => {
  it('clears the selection: choosing among the present devices, and reports it', async () => {
    const { controller, changes } = await connectedToKeysWithPad()
    controller.disconnect()
    expect(controller.state()).toEqual({ kind: 'choosing' })
    expect(controller.devices()).toEqual([KEYS_A, PAD_B])
    expect(changes.at(-1)?.state).toEqual({ kind: 'choosing' })
  })

  it('is no-device when the selected device was away and no other is present', async () => {
    const { midi, controller, at } = createControllerRig({ devices: [KEYS_A] })
    await controller.connect()
    midi.unplug(KEYS_A.id, at(1))
    controller.disconnect()
    expect(controller.state()).toEqual({ kind: 'no-device' })
  })

  it('ends every held note at the audio clock anchor time, and reports it', async () => {
    const { midi, audio, controller, notes, at } = await connectedToKeysWithPad()
    midi.noteOn(KEYS_A.id, 60, 90, at(1))
    audio.advanceTo(2.5)
    notes.length = 0
    controller.disconnect()
    expect(notes).toEqual([
      { kind: 'ended', note: { pitch: C4, velocity: 90, onsetAt: 1, releaseAt: 2.5 } },
    ])
    expect(controller.releaseHeld(3)).toEqual([])
  })

  it('no longer reads the old port', async () => {
    const { midi, controller, notes, at } = await connectedToKeysWithPad()
    controller.disconnect()
    midi.noteOn(KEYS_A.id, 60, 90, at(1))
    expect(notes).toEqual([])
  })

  it('never reattaches the same port coming back by itself', async () => {
    const { midi, controller, notes, at } = await connectedToKeysWithPad()
    controller.disconnect()
    midi.unplug(KEYS_A.id, at(1))
    midi.plug(KEYS_A, at(2))
    expect(controller.state()).toEqual({ kind: 'choosing' })
    expect(midi.openCount(KEYS_A.id)).toBe(1)
    midi.noteOn(KEYS_A.id, 60, 90, at(3))
    expect(notes).toEqual([])
  })

  it('leaves an open still in flight without effect once it settles', async () => {
    const { midi, controller } = createControllerRig({ devices: [KEYS_A, PAD_B] })
    await controller.connect()
    midi.holdNextOpen(PAD_B.id)
    const opening = controller.select(PAD_B.id)
    controller.disconnect()
    expect(controller.state()).toEqual({ kind: 'choosing' })
    midi.releaseHeldOpen(PAD_B.id)
    await opening
    expect(controller.state()).toEqual({ kind: 'choosing' })
  })

  it('lets the player pick a device again afterwards', async () => {
    const { midi, controller, notes, at } = await connectedToKeysWithPad()
    controller.disconnect()
    await controller.select(KEYS_A.id)
    expect(controller.state()).toEqual({ kind: 'connected', device: KEYS_A })
    midi.noteOn(KEYS_A.id, 60, 90, at(1))
    expect(notes).toHaveLength(1)
  })

  it('throws when nothing is selected', async () => {
    const { controller } = createControllerRig({ devices: [KEYS_A, PAD_B] })
    expect(() => controller.disconnect()).toThrow(MidiControllerError)
    await controller.connect()
    expect(controller.state()).toEqual({ kind: 'choosing' })
    expect(() => controller.disconnect()).toThrow(MidiControllerError)
  })
})
