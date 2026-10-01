/**
 * The MIDI controller losing and getting back its device: the selected port reporting disconnected
 * is "lost" (away, selection kept, held notes ended at the unplug time); the same port coming back
 * reattaches with no player action; any other device plugging or unplugging only changes the list.
 */
import { describe, expect, it } from 'vitest'

import { makeConcertPitch } from '@/domain/events/concert-pitch'

import { createControllerRig, KEYS_A, KEYS_A2, PAD_B } from './midi-controller-rig'

const C4 = makeConcertPitch(60)
const E4 = makeConcertPitch(64)

/** Intent: let every pending promise callback run. */
function settled(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Intent: run `act` and return the rejections left unhandled meanwhile. While a listener of the
 * test's own is on the process, Vitest treats an unhandled rejection as handled by the test
 * instead of failing the run; the listener is removed afterwards.
 */
async function unhandledRejectionsDuring(act: () => Promise<void>): Promise<unknown[]> {
  const reasons: unknown[] = []
  const record = (reason: unknown) => reasons.push(reason)
  process.on('unhandledRejection', record)
  try {
    await act()
  } finally {
    process.off('unhandledRejection', record)
  }
  return reasons
}

/** Intent: a rig connected to KEYS_A, with PAD_B also present when `withPad` is set. */
async function connectedToKeys(withPad = false, reopensOnReplug = true) {
  const devices = withPad ? [KEYS_A, PAD_B] : [KEYS_A]
  const rig = createControllerRig({ devices, reopensOnReplug })
  await rig.controller.connect()
  if (withPad) await rig.controller.select(KEYS_A.id)
  return rig
}

// @test-link [[rule_controller_attached_definition]]
describe('MidiController: the selected port reporting disconnected is lost', () => {
  it('is away with the same device, and lists it no more', async () => {
    const { midi, controller, at } = await connectedToKeys()
    midi.unplug(KEYS_A.id, at(3))
    expect(controller.state()).toEqual({ kind: 'away', device: KEYS_A })
    expect(controller.devices()).toEqual([])
  })

  it('ends every held note at the unplug time, on the audio clock', async () => {
    const { midi, controller, notes, at } = await connectedToKeys()
    midi.noteOn(KEYS_A.id, 60, 90, at(1))
    midi.noteOn(KEYS_A.id, 64, 80, at(1.5))
    notes.length = 0
    midi.unplug(KEYS_A.id, at(2.25))
    expect(notes).toEqual([
      { kind: 'ended', note: { pitch: C4, velocity: 90, onsetAt: 1, releaseAt: 2.25 } },
      { kind: 'ended', note: { pitch: E4, velocity: 80, onsetAt: 1.5, releaseAt: 2.25 } },
    ])
    expect(controller.releaseHeld(3)).toEqual([])
  })
})

// @test-link [[rule_same_controller_reattaches]]
describe('MidiController: the same controller reattaches by itself', () => {
  it('reconnects the same port when it comes back, with no second pick and no new open', async () => {
    const { midi, controller, changes, at } = await connectedToKeys()
    midi.unplug(KEYS_A.id, at(3))
    midi.plug(KEYS_A, at(4))
    expect(controller.state()).toEqual({ kind: 'connected', device: KEYS_A })
    expect(midi.openCount(KEYS_A.id)).toBe(1)
    expect(midi.requestCount()).toBe(1)
    expect(changes.map((change) => change.state.kind).slice(-2)).toEqual(['away', 'connected'])
  })

  it('reads notes from the reattached port again', async () => {
    const { midi, notes, at } = await connectedToKeys()
    midi.unplug(KEYS_A.id, at(3))
    midi.plug(KEYS_A, at(4))
    midi.noteOn(KEYS_A.id, 60, 70, at(5))
    expect(notes).toEqual([{ kind: 'played', note: { pitch: C4, velocity: 70, onsetAt: 5 } }])
  })

  it('opens a replugged port that the browser left pending, then is connected', async () => {
    const { midi, controller, at } = await connectedToKeys(false, false)
    midi.unplug(KEYS_A.id, at(3))
    midi.plug(KEYS_A, at(4))
    await settled()
    expect(midi.openCount(KEYS_A.id)).toBe(2)
    expect(midi.connectionOf(KEYS_A.id)).toBe('open')
    expect(controller.state()).toEqual({ kind: 'connected', device: KEYS_A })
  })

  // @test-link [[rule_same_controller_reattaches]]
  // @test-link [[rule_controller_attached_definition]]
  it('is away when the reopen fails, surfaces the failure, and opens on the next replug', async () => {
    const { midi, controller, at } = await connectedToKeys(false, false)
    const failure = new Error('port busy')
    midi.unplug(KEYS_A.id, at(3))
    midi.failNextOpen(KEYS_A.id, failure)
    const surfaced = await unhandledRejectionsDuring(async () => {
      midi.plug(KEYS_A, at(4))
      await settled()
    })
    expect(surfaced).toEqual([failure])
    expect(controller.state()).toEqual({ kind: 'away', device: KEYS_A })
    midi.unplug(KEYS_A.id, at(5))
    midi.plug(KEYS_A, at(6))
    await settled()
    expect(midi.openCount(KEYS_A.id)).toBe(3)
    expect(controller.state()).toEqual({ kind: 'connected', device: KEYS_A })
  })

  it('does not pick up a different device plugged in while the selected one is away', async () => {
    const { midi, controller, at } = await connectedToKeys()
    midi.unplug(KEYS_A.id, at(3))
    midi.plug(KEYS_A2, at(4))
    expect(controller.state()).toEqual({ kind: 'away', device: KEYS_A })
    expect(controller.devices()).toEqual([KEYS_A2])
    expect(midi.openCount(KEYS_A2.id)).toBe(0)
    expect(midi.isListening(KEYS_A2.id)).toBe(false)
  })

  it('stays connected when a different device is unplugged or plugged in', async () => {
    const { midi, controller, at } = await connectedToKeys(true)
    midi.unplug(PAD_B.id, at(3))
    expect(controller.state()).toEqual({ kind: 'connected', device: KEYS_A })
    expect(controller.devices()).toEqual([KEYS_A])
    midi.plug(PAD_B, at(4))
    expect(controller.state()).toEqual({ kind: 'connected', device: KEYS_A })
    expect(controller.devices()).toEqual([KEYS_A, PAD_B])
    expect(midi.openCount(PAD_B.id)).toBe(0)
  })
})

// @test-link [[req_midi_controller_input]]
describe('MidiController: devices coming and going with nothing selected', () => {
  it('follows the present devices while choosing, down to no-device and back', async () => {
    const { midi, controller, at } = createControllerRig({ devices: [KEYS_A, PAD_B] })
    await controller.connect()
    midi.unplug(KEYS_A.id, at(1))
    expect(controller.state()).toEqual({ kind: 'choosing' })
    expect(controller.devices()).toEqual([PAD_B])
    midi.unplug(PAD_B.id, at(2))
    expect(controller.state()).toEqual({ kind: 'no-device' })
    expect(controller.devices()).toEqual([])
    midi.plug(KEYS_A, at(3))
    expect(controller.state()).toEqual({ kind: 'choosing' })
    expect(controller.devices()).toEqual([KEYS_A])
    expect(midi.openCount(KEYS_A.id)).toBe(0)
  })
})
