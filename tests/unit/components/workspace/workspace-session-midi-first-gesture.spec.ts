/**
 * The starting note after a load: with the remembered controller reattached and the audio still
 * locked, the starting note starts nothing until the page's first click, tap or key press, and the
 * starting-note line says so; after it, the starting note makes the audio context and starts the
 * count-in, and any other note makes nothing. Once the audio is unlocked (a Connect controller or
 * a Start click, each a click itself), the line never waits. On the fake audio clock from 5 s.
 */
import { describe, expect, it } from 'vitest'

import { controllerRig, type ControllerRig } from './session-controller-rig'
import { connectKeys, KEYS, lift, press, rigStartingNote } from './session-controller-midi'

/** Intent: KEYS reattached at load, as remembered, MIDI access already allowed; audio locked. */
async function reattachKeys(rig: ControllerRig): Promise<void> {
  rig.midiAccess.setPermission('granted')
  rig.midiAccess.plug(KEYS, rig.audioRig.performanceTimeAt(rig.audioRig.now()))
  await rig.midi.reselect(KEYS)
  expect(rig.midi.state()).toEqual({ kind: 'connected', device: KEYS })
  expect(rig.transport.isUnlocked()).toBe(false)
}

// @test-link [[rule_starting_note_waits_for_first_gesture]]
// @test-link [[rule_midi_starting_note]]
describe("session controller: the starting note waits for the page's first click", () => {
  it('before it, names the note, asks for the click, and the note starts nothing', async () => {
    const rig = controllerRig()
    await reattachKeys(rig)
    const starting = rigStartingNote(rig)
    expect(rig.controller.state.startingNote).toEqual(starting)
    expect(rig.controller.state.startingNoteAwaitsClick).toBe(true)

    press(rig, starting.concertPitch)
    lift(rig, starting.concertPitch)

    expect(rig.controller.state.phase).toBe('idle')
    expect(rig.transport.isUnlocked()).toBe(false)
    expect(rig.runnerInputs).toEqual([])
    rig.controller.dispose()
  })

  // @test-link [[specification_browser_only_operation_verification]]
  it('after it, the starting note makes the audio and starts the count-in', async () => {
    const rig = controllerRig()
    await reattachKeys(rig)
    const starting = rigStartingNote(rig)

    rig.browser.pageActivation.activate()
    expect(rig.controller.state.startingNoteAwaitsClick).toBe(false)
    expect(rig.transport.isUnlocked()).toBe(false)
    press(rig, starting.concertPitch)

    expect(rig.transport.isUnlocked()).toBe(true)
    expect(rig.controller.state.phase).toBe('count-in')
    expect(rig.transport.isRunning()).toBe(true)
    expect(rig.controller.state.sessionHasController).toBe(true)
    lift(rig, starting.concertPitch)
    rig.controller.dispose()
  })

  // @test-link [[specification_browser_only_operation_verification]]
  it('after it, any other note makes no audio and starts nothing', async () => {
    const rig = controllerRig()
    await reattachKeys(rig)
    rig.browser.pageActivation.activate()

    const other = rigStartingNote(rig).concertPitch + 1
    press(rig, other)
    lift(rig, other)

    expect(rig.transport.isUnlocked()).toBe(false)
    expect(rig.controller.state.phase).toBe('idle')
    rig.controller.dispose()
  })

  it('never waits once the audio is unlocked by the Connect controller click', async () => {
    const rig = controllerRig()
    await connectKeys(rig)

    expect(rig.controller.state.startingNoteAwaitsClick).toBe(false)
    rig.controller.dispose()
  })

  it('does not wait while no starting note is named', () => {
    const rig = controllerRig()
    expect(rig.controller.state.startingNote).toBeNull()
    expect(rig.controller.state.startingNoteAwaitsClick).toBe(false)
    rig.controller.dispose()
  })
})
