/**
 * The MIDI controller's remembered controller: the one remembered from an earlier visit, reselected
 * at load with one access request only when the browser already allows MIDI access (a request that
 * cannot prompt), matched on the input port's id only, and attached as a device that comes back
 * within a page; then, for the rest of the page, the last device that counted as connected, until
 * the player's Disconnect forgets it.
 */
import { describe, expect, it } from 'vitest'

import { MidiControllerError, type MidiDevice } from '@/midi/midi-controller-state'

import { createControllerRig, KEYS_A, KEYS_A2, PAD_B } from './midi-controller-rig'

/** Intent: let every pending promise callback run. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

describe('MidiController: reselect() at load', () => {
  // @test-link [[rule_last_controller_remembered]]
  // @test-link [[entity_remembered_controller_record]]
  it('with MIDI access already allowed and the device present, attaches it with one request', async () => {
    const { midi, controller, changes } = createControllerRig({ devices: [PAD_B, KEYS_A] })
    midi.setPermission('granted')

    await controller.reselect(KEYS_A)

    expect(midi.requestCount()).toBe(1)
    expect(controller.state()).toEqual({ kind: 'connected', device: KEYS_A })
    expect(midi.isListening(PAD_B.id)).toBe(false)
    expect(controller.change().remembered).toEqual(KEYS_A)
    expect(controller.change().reselectedAtLoad).toBe(true)
    expect(changes.map((c) => c.state.kind)).toEqual([
      'not-requested',
      'requesting',
      'opening',
      'connected',
    ])
  })

  // @test-link [[rule_last_controller_remembered]]
  // @test-link [[rule_controller_connects_between_sessions]]
  it('with MIDI access not already allowed, requests nothing and keeps the remembered device for the sheet', async () => {
    for (const permission of ['prompt', 'denied', 'unknown'] as const) {
      const { midi, controller } = createControllerRig({ devices: [KEYS_A] })
      midi.setPermission(permission)

      await controller.reselect(KEYS_A)

      expect(midi.requestCount(), permission).toBe(0)
      expect(controller.state(), permission).toEqual({ kind: 'not-requested' })
      expect(controller.change().remembered, permission).toEqual(KEYS_A)
      expect(controller.change().reselectedAtLoad, permission).toBe(false)
    }
  })

  // @test-link [[rule_last_controller_remembered]]
  // @test-link [[rule_same_controller_reattaches]]
  it('with the device not plugged in, keeps it selected and away, and attaches it when it appears', async () => {
    const { midi, controller, audio } = createControllerRig({ devices: [PAD_B] })
    midi.setPermission('granted')

    await controller.reselect(KEYS_A)
    expect(controller.state()).toEqual({ kind: 'away', device: KEYS_A })

    midi.plug(KEYS_A, audio.performanceTimeAt(1))
    await flush()
    expect(controller.state()).toEqual({ kind: 'connected', device: KEYS_A })
    expect(midi.requestCount()).toBe(1)
  })

  // @test-link [[entity_remembered_controller_record]]
  // @test-link [[rule_same_controller_reattaches]]
  it('never picks up a different device, even one with the same name and manufacturer', async () => {
    const { midi, controller, audio } = createControllerRig()
    midi.setPermission('granted')

    await controller.reselect(KEYS_A)
    midi.plug(KEYS_A2, audio.performanceTimeAt(1))
    midi.plug(PAD_B, audio.performanceTimeAt(1))
    await flush()

    expect(controller.state()).toEqual({ kind: 'away', device: KEYS_A })
    expect(midi.isListening(KEYS_A2.id)).toBe(false)
    expect(midi.openCount(KEYS_A2.id)).toBe(0)
  })

  // @test-link [[rule_last_controller_remembered]]
  it('a refused request at load leaves Connect controller to the player, with no reselection', async () => {
    const { midi, controller } = createControllerRig({ devices: [KEYS_A] })
    midi.setPermission('granted')
    midi.denyNextRequest()

    await controller.reselect(KEYS_A)

    expect(controller.state()).toEqual({ kind: 'not-requested' })
    expect(controller.change().reselectedAtLoad).toBe(false)
  })

  // @test-link [[rule_last_controller_remembered]]
  it('a broken request at load surfaces, the controller back to not-requested', async () => {
    const { midi, controller } = createControllerRig({ devices: [KEYS_A] })
    midi.setPermission('granted')
    midi.failNextRequest(new Error('broken'))

    await expect(controller.reselect(KEYS_A)).rejects.toThrow('broken')
    expect(controller.state()).toEqual({ kind: 'not-requested' })
    expect(controller.change().reselectedAtLoad).toBe(false)
  })

  // @test-link [[rule_controller_connects_between_sessions]]
  it('a refusal of the load request a Connect controller click adopted is a refusal for the click', async () => {
    const { midi, controller } = createControllerRig({ devices: [KEYS_A] })
    midi.setPermission('granted')
    midi.holdNextRequest()
    midi.denyNextRequest()
    const loading = controller.reselect(KEYS_A)
    await flush()
    const connecting = controller.connect()
    midi.releaseHeldRequest()
    await Promise.all([loading, connecting])

    expect(controller.state()).toEqual({ kind: 'denied' })
  })

  it('in a browser without Web MIDI, requests nothing and stays unsupported', async () => {
    const { midi, controller } = createControllerRig({ supported: false })
    await controller.reselect(KEYS_A)
    expect(midi.requestCount()).toBe(0)
    expect(controller.state()).toEqual({ kind: 'unsupported' })
  })

  // @test-link [[rule_controller_connects_between_sessions]]
  it('a Connect controller click while the load request is in flight adopts it: one request', async () => {
    const { midi, controller } = createControllerRig({ devices: [KEYS_A] })
    midi.setPermission('granted')
    midi.holdNextRequest()
    const loading = controller.reselect(KEYS_A)
    await flush()
    expect(controller.state()).toEqual({ kind: 'requesting' })

    const connecting = controller.connect()
    midi.releaseHeldRequest()
    await Promise.all([loading, connecting])

    expect(midi.requestCount()).toBe(1)
    expect(controller.state()).toEqual({ kind: 'connected', device: KEYS_A })
  })

  // @test-link [[rule_last_controller_remembered]]
  it('is a load step only: called after a request, or twice, it throws', async () => {
    const connected = createControllerRig({ devices: [KEYS_A] })
    await connected.controller.connect()
    await expect(connected.controller.reselect(KEYS_A)).rejects.toThrow(MidiControllerError)

    const twice = createControllerRig({ devices: [KEYS_A] })
    await twice.controller.reselect(KEYS_A)
    await expect(twice.controller.reselect(KEYS_A)).rejects.toThrow(MidiControllerError)
  })

  // @test-link [[rule_disconnect_forgets_controller]]
  it('Disconnect of the away remembered device forgets it: its coming back attaches nothing', async () => {
    const { midi, controller, audio } = createControllerRig()
    midi.setPermission('granted')
    await controller.reselect(KEYS_A)

    controller.disconnect()
    expect(controller.state()).toEqual({ kind: 'no-device' })
    expect(controller.change().remembered).toBeNull()
    midi.plug(KEYS_A, audio.performanceTimeAt(1))
    await flush()
    expect(controller.state()).toEqual({ kind: 'choosing' })
  })
})

describe('MidiController: the remembered controller through the page', () => {
  // @test-link [[rule_last_controller_remembered]]
  it('is none until a device counts as connected, then that device', async () => {
    const { midi, controller } = createControllerRig({ devices: [KEYS_A] })
    expect(controller.change().remembered).toBeNull()
    midi.holdNextOpen(KEYS_A.id)
    const connecting = controller.connect()
    await flush()
    expect(controller.state().kind).toBe('opening')
    expect(controller.change().remembered).toBeNull()

    midi.releaseHeldOpen(KEYS_A.id)
    await connecting
    expect(controller.change().remembered).toEqual(KEYS_A)
  })

  // @test-link [[rule_last_controller_remembered]]
  // @test-link [[rule_disconnect_forgets_controller]]
  it('is replaced by a newly connected device, kept through an unplug, forgotten by Disconnect', async () => {
    const { midi, controller, audio, changes } = createControllerRig({ devices: [KEYS_A, PAD_B] })
    await controller.connect()
    await controller.select(KEYS_A.id)
    await controller.select(PAD_B.id)
    expect(controller.change().remembered).toEqual(PAD_B)

    midi.unplug(PAD_B.id, audio.performanceTimeAt(1))
    expect(controller.change().remembered).toEqual(PAD_B)

    controller.disconnect()
    expect(controller.change().remembered).toBeNull()
    expect(changes.at(-1)?.remembered).toBeNull()
  })

  // @test-link [[rule_last_controller_remembered]]
  it('is chosen directly by Connect controller among several inputs, with no picker', async () => {
    const { midi, controller } = createControllerRig({ devices: [PAD_B, KEYS_A] })
    await controller.reselect(KEYS_A)
    expect(midi.requestCount()).toBe(0)

    await controller.connect()

    expect(controller.state()).toEqual({ kind: 'connected', device: KEYS_A })
  })

  // @test-link [[rule_controller_connects_between_sessions]]
  it('without a remembered device among the inputs, Connect controller picks as in v2', async () => {
    const remembered: MidiDevice = { id: 'gone', name: 'Old', manufacturer: 'Acme' }
    const one = createControllerRig({ devices: [PAD_B] })
    await one.controller.reselect(remembered)
    await one.controller.connect()
    expect(one.controller.state()).toEqual({ kind: 'connected', device: PAD_B })

    const two = createControllerRig({ devices: [PAD_B, KEYS_A] })
    await two.controller.reselect(remembered)
    await two.controller.connect()
    expect(two.controller.state()).toEqual({ kind: 'choosing' })
  })
})
