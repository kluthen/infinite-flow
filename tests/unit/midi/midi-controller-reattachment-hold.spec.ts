/**
 * The MIDI controller holding back the reattachment of its away device, for a session started
 * while the selected controller is away: while held, the same port coming back stays `away` and is
 * never read, the selection is kept; released, it reattaches as a replug would.
 */
import { describe, expect, it } from 'vitest'

import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { MidiControllerError } from '@/midi/midi-controller-state'

import { createControllerRig, KEYS_A, KEYS_A2 } from './midi-controller-rig'

const C4 = makeConcertPitch(60)

/** Intent: let every pending promise callback run. */
function settled(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/** Intent: a rig connected to KEYS_A, then KEYS_A unplugged, so the controller is away. */
async function awayFromKeys(reopensOnReplug = true) {
  const rig = createControllerRig({ devices: [KEYS_A], reopensOnReplug })
  await rig.controller.connect()
  rig.midi.unplug(KEYS_A.id, rig.at(1))
  return rig
}

// @test-link [[rule_start_while_controller_away]]
// @test-link [[rule_controllerless_session_never_gains_controller]]
describe('MidiController: holding the reattachment of an away controller', () => {
  it('throws when the controller is not away', async () => {
    const { controller } = createControllerRig({ devices: [KEYS_A] })
    expect(() => controller.holdReattachment()).toThrow(MidiControllerError)
    await controller.connect()
    expect(controller.state().kind).toBe('connected')
    expect(() => controller.holdReattachment()).toThrow(MidiControllerError)
  })

  it('throws on a second hold, and on a release with no hold', async () => {
    const { controller } = await awayFromKeys()
    expect(() => controller.releaseReattachment()).toThrow(MidiControllerError)
    controller.holdReattachment()
    expect(() => controller.holdReattachment()).toThrow(MidiControllerError)
    controller.releaseReattachment()
    expect(() => controller.releaseReattachment()).toThrow(MidiControllerError)
  })

  it('stays away when the same port comes back, lists it, and reports none of its notes', async () => {
    const { midi, controller, notes, at } = await awayFromKeys()
    controller.holdReattachment()
    midi.plug(KEYS_A, at(2))
    midi.noteOn(KEYS_A.id, 60, 70, at(3))
    expect(controller.state()).toEqual({ kind: 'away', device: KEYS_A })
    expect(controller.devices()).toEqual([KEYS_A])
    expect(notes).toEqual([])
  })

  it('does not reopen a port the browser left closed while held', async () => {
    const { midi, controller, at } = await awayFromKeys(false)
    controller.holdReattachment()
    midi.plug(KEYS_A, at(2))
    await settled()
    expect(midi.openCount(KEYS_A.id)).toBe(1)
    expect(controller.state()).toEqual({ kind: 'away', device: KEYS_A })
  })

  it('only lists a different device plugged in while held', async () => {
    const { midi, controller, at } = await awayFromKeys()
    controller.holdReattachment()
    midi.plug(KEYS_A2, at(2))
    expect(controller.state()).toEqual({ kind: 'away', device: KEYS_A })
    expect(controller.devices()).toEqual([KEYS_A2])
    expect(midi.openCount(KEYS_A2.id)).toBe(0)
    expect(midi.isListening(KEYS_A2.id)).toBe(false)
  })

  it('refuses a selection while held, keeping the away one', async () => {
    const { midi, controller, at } = await awayFromKeys()
    controller.holdReattachment()
    midi.plug(KEYS_A2, at(2))
    await expect(controller.select(KEYS_A2.id)).rejects.toThrow(MidiControllerError)
    expect(controller.state()).toEqual({ kind: 'away', device: KEYS_A })
    expect(midi.openCount(KEYS_A2.id)).toBe(0)
  })

  it('ends the hold with a Disconnect, which clears the selection', async () => {
    const { midi, controller, at } = await awayFromKeys()
    controller.holdReattachment()
    controller.disconnect()
    expect(() => controller.releaseReattachment()).toThrow(MidiControllerError)
    midi.plug(KEYS_A, at(2))
    expect(controller.state()).toEqual({ kind: 'choosing' })
  })
})

// @test-link [[rule_start_while_controller_away]]
// @test-link [[rule_same_controller_reattaches]]
describe('MidiController: releasing the reattachment hold', () => {
  it('reattaches the port present at the release, and reads its notes again', async () => {
    const { midi, controller, notes, changes, at } = await awayFromKeys()
    controller.holdReattachment()
    midi.plug(KEYS_A, at(2))
    controller.releaseReattachment()
    expect(controller.state()).toEqual({ kind: 'connected', device: KEYS_A })
    expect(changes.at(-1)?.state).toEqual({ kind: 'connected', device: KEYS_A })
    midi.noteOn(KEYS_A.id, 60, 70, at(3))
    expect(notes).toEqual([{ kind: 'played', note: { pitch: C4, velocity: 70, onsetAt: 3 } }])
  })

  it('reopens at the release a present port the browser left closed', async () => {
    const { midi, controller, at } = await awayFromKeys(false)
    controller.holdReattachment()
    midi.plug(KEYS_A, at(2))
    controller.releaseReattachment()
    await settled()
    expect(midi.openCount(KEYS_A.id)).toBe(2)
    expect(controller.state()).toEqual({ kind: 'connected', device: KEYS_A })
  })

  it('stays away with the port absent at the release, then reattaches on its replug', async () => {
    const { midi, controller, at } = await awayFromKeys()
    controller.holdReattachment()
    controller.releaseReattachment()
    expect(controller.state()).toEqual({ kind: 'away', device: KEYS_A })
    midi.plug(KEYS_A, at(2))
    expect(controller.state()).toEqual({ kind: 'connected', device: KEYS_A })
  })
})
