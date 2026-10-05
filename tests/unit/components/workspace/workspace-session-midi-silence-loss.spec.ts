/**
 * The session's MIDI timers and the controller's comings and goings: with a controller, more than
 * 30 s without a played note ends the session (counted from the starting note, or from the first
 * note of a session started by a click); a controller lost mid-session shows a 30-second countdown
 * that ends the session unless the same device comes back, which restarts the silence timer from
 * the reattachment. A session started without its controller never gains it, and the device
 * reattaches once the session ends. On the fake audio clock at 240 BPM from 5 s: the count-in runs
 * from 5.1 s to 6.1 s.
 */
import { describe, expect, it } from 'vitest'

import {
  placeAcknowledgementWindows,
  type WindowedExpectedNote,
} from '@/domain/acknowledgement/acknowledgement-window'
import { controllerRig, playTo, type ControllerRig } from './session-controller-rig'
import {
  connectKeys,
  expectedNotesOf,
  KEYS,
  lift,
  press,
  replugKeys,
  rigStartingNote,
  unplugKeys,
} from './session-controller-midi'

/** Intent: a session started by its starting note, pressed and released at 5 s. */
async function startedByTheStartingNote(): Promise<ControllerRig> {
  const rig = controllerRig()
  await connectKeys(rig)
  const pitch = rigStartingNote(rig).concertPitch
  press(rig, pitch)
  lift(rig, pitch)
  expect(rig.controller.state.phase).toBe('count-in')
  return rig
}

/** Intent: tap one note (not the starting note's pitch) now. */
function tap(rig: ControllerRig): void {
  const pitch = rigStartingNote(rig).concertPitch + 1
  press(rig, pitch)
  lift(rig, pitch)
}

/**
 * Intent: in phrase 1, the first note whose window stays open at least 150 ms after its onset (room
 * to replug inside it), with the note after it.
 */
function noteWithAnOpenWindow(rig: ControllerRig): {
  readonly due: WindowedExpectedNote
  readonly next: WindowedExpectedNote
} {
  const notes = placeAcknowledgementWindows(
    expectedNotesOf(rig, 1, rig.phraseOne.outcome.result.timeline),
  )
  const index = notes.findIndex((note) => note.window.closesAtSeconds >= note.onsetSeconds + 0.15)
  const due = notes[index]
  const next = notes[index + 1]
  if (due === undefined || next === undefined) {
    throw new Error("the rig's phrase 1 has no note with an open window followed by another")
  }
  return { due, next }
}

// @test-link [[rule_silence_timeout_ends_session]]
// @test-link [[module_session_silence_timeout]]
describe('session controller: the silence timeout', () => {
  it('ends a session after more than 30 s from the starting note, not at 30 s', async () => {
    const rig = await startedByTheStartingNote()
    await playTo(rig, 35)
    expect(rig.controller.state.phase).toBe('running')

    await playTo(rig, 35.05)

    expect(rig.controller.state.phase).toBe('idle')
    expect(rig.controller.state.lastEnd?.cause).toBe('silence-timeout')
  })

  it('counts again from each played note', async () => {
    const rig = await startedByTheStartingNote()
    await playTo(rig, 20)
    tap(rig)
    await playTo(rig, 50)
    expect(rig.controller.state.phase).toBe('running')

    await playTo(rig, 50.05)

    expect(rig.controller.state.lastEnd?.cause).toBe('silence-timeout')
  })

  it('never times out a click-started session before its first note, then counts from it', async () => {
    const rig = controllerRig()
    await connectKeys(rig)
    rig.controller.start()
    await playTo(rig, 40)
    expect(rig.controller.state.phase).toBe('running')

    tap(rig)
    await playTo(rig, 70)
    expect(rig.controller.state.phase).toBe('running')
    await playTo(rig, 70.05)

    expect(rig.controller.state.lastEnd?.cause).toBe('silence-timeout')
  })

  // @test-link [[rule_controllerless_session_never_gains_controller]]
  it('never times out a session without a controller', async () => {
    const rig = controllerRig()
    rig.controller.start()

    await playTo(rig, 40)

    expect(rig.controller.state.phase).toBe('running')
    rig.controller.stop()
  })
})

// @test-link [[rule_controller_loss_mid_session]]
// @test-link [[rule_controller_reconnection_window]]
// @test-link [[module_session_controller_loss]]
describe('session controller: a controller lost mid-session', () => {
  it('counts down 30 s from the loss, then ends the session, the device still selected', async () => {
    const rig = await startedByTheStartingNote()
    await playTo(rig, 7)

    unplugKeys(rig)

    expect(rig.controller.state.controllerLost).toEqual({ secondsLeft: 30 })
    await playTo(rig, 8)
    expect(rig.controller.state.controllerLost).toEqual({ secondsLeft: 29 })
    await playTo(rig, 36.5)
    expect(rig.controller.state.controllerLost).toEqual({ secondsLeft: 1 })
    expect(rig.controller.state.phase).toBe('running')
    await playTo(rig, 37)
    expect(rig.controller.state.lastEnd?.cause).toBe('controller-lost')
    expect(rig.controller.state.controllerLost).toBeNull()
    expect(rig.midi.state()).toEqual({ kind: 'away', device: KEYS })
  })

  it('clears the countdown when the same device comes back, and restarts the silence timer from then', async () => {
    const rig = await startedByTheStartingNote()
    await playTo(rig, 7)
    unplugKeys(rig)
    await playTo(rig, 17)
    expect(rig.controller.state.controllerLost).toEqual({ secondsLeft: 20 })

    replugKeys(rig)

    expect(rig.midi.state()).toEqual({ kind: 'connected', device: KEYS })
    expect(rig.controller.state.controllerLost).toBeNull()
    await playTo(rig, 47)
    expect(rig.controller.state.phase).toBe('running')
    await playTo(rig, 47.05)
    expect(rig.controller.state.lastEnd?.cause).toBe('silence-timeout')
  })

  // @test-link [[rule_silence_timeout_ends_session]]
  // @test-link [[rule_controller_reconnection_window]]
  it('leaves the silence timer unarmed after the device comes back when no note was played yet', async () => {
    const rig = controllerRig()
    await connectKeys(rig)
    rig.controller.start()
    await playTo(rig, 10)
    unplugKeys(rig)
    await playTo(rig, 20)
    replugKeys(rig)
    expect(rig.controller.state.controllerLost).toBeNull()

    await playTo(rig, 90)
    expect(rig.controller.state.phase).toBe('running')

    tap(rig)
    await playTo(rig, 120)
    expect(rig.controller.state.phase).toBe('running')
    await playTo(rig, 120.05)
    expect(rig.controller.state.lastEnd?.cause).toBe('silence-timeout')
  })

  // @test-link [[rule_controller_loss_mid_session]]
  it('never acknowledges a note that fell due while the device was away, even in its open window', async () => {
    const rig = await startedByTheStartingNote()
    const { due, next } = noteWithAnOpenWindow(rig)
    await playTo(rig, due.onsetSeconds - 0.05)
    unplugKeys(rig)
    await playTo(rig, due.onsetSeconds + 0.05)
    replugKeys(rig)

    await playTo(rig, due.onsetSeconds + 0.1)
    press(rig, due.pitch)
    lift(rig, due.pitch)
    expect(rig.controller.state.acknowledged).toEqual([])

    await playTo(rig, next.onsetSeconds)
    press(rig, next.pitch)
    lift(rig, next.pitch)
    expect(rig.controller.state.acknowledged).toEqual([next.identity])
    rig.controller.stop()
    const [phraseOne] = rig.controller.state.lastHistory?.phrases() ?? []
    expect(phraseOne?.acknowledgements).toEqual([next.identity])
  })

  it('counts down through the count-in, and clears when the device comes back', async () => {
    const rig = await startedByTheStartingNote()
    await playTo(rig, 5.5)

    unplugKeys(rig)

    expect(rig.controller.state.phase).toBe('count-in')
    expect(rig.controller.state.controllerLost).toEqual({ secondsLeft: 30 })
    await playTo(rig, 6.5)
    expect(rig.controller.state.phase).toBe('running')
    expect(rig.controller.state.controllerLost).toEqual({ secondsLeft: 29 })
    replugKeys(rig)
    expect(rig.controller.state.controllerLost).toBeNull()
    rig.controller.stop()
  })
})

// @test-link [[rule_start_while_controller_away]]
// @test-link [[rule_controllerless_session_never_gains_controller]]
// @test-link [[service_session_midi]]
describe('session controller: a start while the selected controller is away', () => {
  it('runs without the controller, the device coming back ignored, then reattaches it at the end', async () => {
    const rig = controllerRig()
    await connectKeys(rig)
    unplugKeys(rig)
    rig.controller.start()
    expect(rig.controller.state.sessionHasController).toBe(false)

    replugKeys(rig)
    await playTo(rig, 5.5)
    press(rig, rigStartingNote(rig).concertPitch)

    expect(rig.midi.state()).toEqual({ kind: 'away', device: KEYS })
    expect(rig.controller.state.controllerLost).toBeNull()
    expect(rig.controller.state.acknowledged).toEqual([])
    rig.controller.stop()
    expect(rig.midi.state()).toEqual({ kind: 'connected', device: KEYS })
    expect(rig.controller.state.startingNote).toEqual(rigStartingNote(rig))
  })
})
