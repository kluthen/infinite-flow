/**
 * The MIDI controller while the audio clock is not running (the page's audio not unlocked yet, as
 * after a load that reattached the remembered controller): a note-on is told to the unclocked-note
 * listeners before anything else, and dropped unless one of them started the clock; a note-off, or
 * a note nobody starts the clock for, is never read, so it is never held nor played.
 */
import { describe, expect, it } from 'vitest'

import type { ClockAnchor } from '@/audio/audio-ports'

import { createControllerRig, KEYS_A } from './midi-controller-rig'

/** Intent: a rig whose clock runs only once `start` is called, with KEYS_A connected. */
async function lockedRig() {
  const clock: { anchor: (() => ClockAnchor) | null } = { anchor: null }
  const rig = createControllerRig({ devices: [KEYS_A], anchor: () => clock.anchor?.() ?? null })
  await rig.controller.connect()
  return { rig, start: () => (clock.anchor = () => rig.audio.output.anchor()) }
}

// @test-link [[rule_starting_note_waits_for_first_gesture]]
// @test-link [[rule_midi_starting_note]]
describe('MidiController: a note while the audio clock is not running', () => {
  it('is told to the unclocked-note listeners, then dropped: no played note, nothing held', async () => {
    const { rig } = await lockedRig()
    const told: number[] = []
    rig.controller.onUnclockedNoteOn((pitch) => told.push(pitch))

    rig.midi.noteOn(KEYS_A.id, 60, 90, rig.at(0))
    rig.midi.noteOff(KEYS_A.id, 60, rig.at(0.1))

    expect(told).toEqual([60])
    expect(rig.notes).toEqual([])
  })

  it('is read as usual when a listener starts the clock for it', async () => {
    const { rig, start } = await lockedRig()
    rig.controller.onUnclockedNoteOn(() => start())

    rig.midi.noteOn(KEYS_A.id, 60, 90, rig.at(0))

    expect(rig.notes.map((event) => [event.kind, event.note.pitch])).toEqual([['played', 60]])
  })

  it('tells no listener once the clock runs, and a removed listener hears nothing', async () => {
    const { rig, start } = await lockedRig()
    const told: number[] = []
    const stop = rig.controller.onUnclockedNoteOn((pitch) => told.push(pitch))
    stop()
    rig.midi.noteOn(KEYS_A.id, 60, 90, rig.at(0))
    start()
    const still = rig.controller.onUnclockedNoteOn((pitch) => told.push(pitch))
    rig.midi.noteOn(KEYS_A.id, 62, 90, rig.at(0.2))
    still()

    expect(told).toEqual([])
    expect(rig.notes.map((event) => event.note.pitch)).toEqual([62])
  })
})
