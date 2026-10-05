/**
 * The starting note: at Idle with a controller attached, phrase 1's first note at its exact pitch
 * starts the session exactly as the Start click does, and `startingNote` names it exactly when
 * playing it would start one. Any other note, any blocked start, the connection sheet open, or no
 * controller attached: nothing happens and nothing is named. On the fake audio clock from 5 s.
 */
import { describe, expect, it } from 'vitest'

import { NotationError } from '@/notation/notation-error'
import { controllerRig, type ControllerRig } from './session-controller-rig'
import {
  connectKeys,
  KEYS,
  lift,
  press,
  replugKeys,
  rigStartingNote,
  unplugKeys,
} from './session-controller-midi'

/** Intent: whether nothing at all started: Idle, no audio, no runner, no lock asked for. */
function expectNothingStarted(rig: ControllerRig): void {
  expect(rig.controller.state.phase).toBe('idle')
  expect(rig.transport.isRunning()).toBe(false)
  expect(rig.runnerInputs).toEqual([])
  expect(rig.browser.wakeLock.isHeld()).toBe(false)
  expect(rig.controller.state.sessionHasController).toBeNull()
}

/** A start blocker the Idle state can show, set by hand. */
interface BlockerSample {
  readonly name: string
  readonly block: (rig: ControllerRig) => void
}

const BLOCKERS: readonly BlockerSample[] = [
  {
    name: 'a generation running',
    block: (rig) => {
      rig.idle.operation = 'generating'
    },
  },
  {
    name: 'a notation error',
    block: (rig) => {
      rig.idle.notationError = new NotationError('notation_engraving_failed', 'x', {})
    },
  },
  {
    name: 'the room notice',
    block: (rig) => {
      rig.idle.roomNotice = 'no_room'
    },
  },
]

// @test-link [[rule_midi_starting_note]]
// @test-link [[rule_starting_note_only_starts_count_in]]
// @test-link [[module_session_starting_note]]
describe('session controller: the starting note starts the session', () => {
  // @test-link [[rule_starting_note_named]]
  it('names the starting note only once a controller is attached at Ready', async () => {
    const rig = controllerRig()
    expect(rig.controller.state.startingNote).toBeNull()
    await connectKeys(rig)
    expect(rig.controller.state.startingNote).toEqual(rigStartingNote(rig))
    rig.controller.dispose()
  })

  it('starts the count-in exactly as Start does when the starting note is played', async () => {
    const rig = controllerRig()
    await connectKeys(rig)
    const starting = rigStartingNote(rig)

    press(rig, starting.concertPitch)

    expect(rig.controller.state.phase).toBe('count-in')
    expect(rig.transport.isRunning()).toBe(true)
    expect(rig.browser.wakeLock.isHeld()).toBe(true)
    expect(rig.runnerInputs).toHaveLength(1)
    expect(rig.controller.state.countIn).not.toBeNull()
    expect(rig.controller.state.sessionHasController).toBe(true)
    expect(rig.controller.state.startingNote).toBeNull()
    lift(rig, starting.concertPitch)
    rig.controller.dispose()
  })

  it('starts nothing on another pitch, or on the starting pitch an octave off', async () => {
    const rig = controllerRig()
    await connectKeys(rig)
    const pitch = rigStartingNote(rig).concertPitch
    const before = rig.controller.state.startingNote

    for (const other of [pitch + 1, pitch - 1, pitch + 12, pitch - 12]) {
      press(rig, other)
      lift(rig, other)
    }

    expectNothingStarted(rig)
    expect(rig.controller.state.startingNote).toBe(before)
    rig.controller.dispose()
  })

  it('does nothing when a note ends at Idle', async () => {
    const rig = controllerRig()
    await connectKeys(rig)
    const pitch = rigStartingNote(rig).concertPitch
    rig.sheetOpen.value = true
    press(rig, pitch)
    rig.sheetOpen.value = false

    lift(rig, pitch)

    expectNothingStarted(rig)
    rig.controller.dispose()
  })

  it('names nothing and starts nothing while the connection sheet is open', async () => {
    const rig = controllerRig()
    await connectKeys(rig)
    const pitch = rigStartingNote(rig).concertPitch
    rig.sheetOpen.value = true
    expect(rig.controller.state.startingNote).toBeNull()

    press(rig, pitch)

    expectNothingStarted(rig)
    lift(rig, pitch)
    rig.sheetOpen.value = false
    expect(rig.controller.state.startingNote).toEqual(rigStartingNote(rig))
    rig.controller.dispose()
  })

  // @test-link [[rule_midi_never_blocks_session]]
  it.each(BLOCKERS)('names nothing and starts nothing with $name', async ({ block }) => {
    const rig = controllerRig()
    await connectKeys(rig)
    const pitch = rigStartingNote(rig).concertPitch
    block(rig)
    expect(rig.controller.state.canStart).toBe(false)
    expect(rig.controller.state.startingNote).toBeNull()

    expect(() => press(rig, pitch)).not.toThrow()

    expectNothingStarted(rig)
    rig.controller.dispose()
  })

  it('names nothing with no MIDI access, no device, or the selected controller away', async () => {
    const rig = controllerRig()
    expect(rig.controller.state.startingNote).toBeNull()
    rig.transport.unlock()
    await rig.midi.connect()
    expect(rig.midi.state()).toEqual({ kind: 'no-device' })
    expect(rig.controller.state.startingNote).toBeNull()
    rig.midiAccess.plug(KEYS, 0)
    await rig.midi.select(KEYS.id)
    expect(rig.controller.state.startingNote).not.toBeNull()

    unplugKeys(rig)

    expect(rig.midi.state()).toEqual({ kind: 'away', device: KEYS })
    expect(rig.controller.state.startingNote).toBeNull()
    replugKeys(rig)
    expect(rig.controller.state.startingNote).toEqual(rigStartingNote(rig))
    rig.controller.dispose()
  })

  it('no longer listens to the controller once disposed', async () => {
    const rig = controllerRig()
    await connectKeys(rig)
    const pitch = rigStartingNote(rig).concertPitch
    rig.controller.dispose()

    expect(() => press(rig, pitch)).not.toThrow()

    expectNothingStarted(rig)
  })
})
