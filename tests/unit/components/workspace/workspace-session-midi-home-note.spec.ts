/**
 * The home note while session mode is held: with Jam's Idle note routing as the held mode's note
 * route, the home note of Jam's key at its exact concert pitch (in C5.2's octave, the lower of two
 * equally near, for each built-in instrument and a player-made one) starts a fresh Jam, its octave
 * neighbours and every other note nothing; phrase 1's starting note starts no session meanwhile.
 * On the fake audio clock at 240 BPM from 5 s.
 */
import { describe, expect, it, vi } from 'vitest'

import type { PitchClass } from '@/domain/controls/generation-controls'
import { makeMyInstrument } from '@/domain/profile/my-instrument'
import { createJamIdleNotes, jamHomeNote, type JamInstrument } from '@/jam/jam-idle-notes'
import { controllerRig, playTo, type ControllerRig } from './session-controller-rig'
import { connectKeys, press } from './session-controller-midi'
import { startFresh } from './session-controller-fresh-start'

/** A home-note case: the instrument, the key, and the concert pitch the home note sounds at. */
interface HomeNoteCase {
  readonly name: string
  readonly instrument: JamInstrument
  readonly key: PitchClass
}

const HORN = makeMyInstrument({
  template: 'c-keyboard',
  name: 'My horn in F',
  clef: 'treble',
  writtenRange: { minMidi: 52, maxMidi: 88 },
  transposition: { octaves: 0, semitones: 7, direction: 'lower' },
})

const HOME_NOTE_CASES: readonly HomeNoteCase[] = [
  {
    name: 'the keyboard',
    instrument: { instrumentProfileId: 'c-keyboard', myInstrument: null },
    key: 'G',
  },
  {
    name: 'the tenor',
    instrument: { instrumentProfileId: 'bb-tenor', myInstrument: null },
    key: 'G',
  },
  {
    name: 'the alto',
    instrument: { instrumentProfileId: 'eb-alto', myInstrument: null },
    key: 'G',
  },
  {
    name: 'my instrument',
    instrument: { instrumentProfileId: 'my-instrument', myInstrument: HORN },
    key: 'D',
  },
  {
    name: 'the keyboard, two octaves equally near',
    instrument: { instrumentProfileId: 'c-keyboard', myInstrument: null },
    key: 'F#',
  },
]

// @test-link [[rule_jam_starting_note_is_home_note]]
// @test-link [[rule_midi_starting_note]]
describe('session controller: the home note while session mode is held', () => {
  /** Intent: a connected rig holding session mode, routing notes through Jam's Idle notes. */
  async function holdingRig(testCase: HomeNoteCase): Promise<{
    readonly rig: ControllerRig
    readonly start: ReturnType<typeof vi.fn>
  }> {
    const rig = controllerRig()
    await connectKeys(rig)
    rig.sessionModeHeld.value = true
    const notes = createJamIdleNotes({
      writtenKey: () => testCase.key,
      collection: () => 'Major',
      instrument: () => testCase.instrument,
      canStart: () => true,
      pageAwaitsClick: () => false,
    })
    const start = vi.fn(() => {
      startFresh(rig)
    })
    rig.heldModeNotes.value = { meaningOf: notes.meaningOf, start }
    return { rig, start }
  }

  // @test-link [[rule_jam_starting_note_is_home_note]]
  it.each(HOME_NOTE_CASES)('starts a fresh Jam on the home note for $name', async (testCase) => {
    const { rig, start } = await holdingRig(testCase)
    const home = jamHomeNote(testCase.key, 'Major', testCase.instrument).concertPitch
    press(rig, home + 12)
    press(rig, home - 12)
    expect(start).not.toHaveBeenCalled()
    press(rig, home)
    expect(start).toHaveBeenCalledTimes(1)
    expect(rig.controller.state.phase).toBe('count-in')
    await playTo(rig, 50)
    expect(rig.controller.state.phase).toBe('count-in')
  })

  // @test-link [[rule_midi_starting_note]]
  it("starts nothing on phrase 1's starting note while session mode is held", async () => {
    const { rig, start } = await holdingRig(HOME_NOTE_CASES[0]!)
    const home = jamHomeNote('G', 'Major', HOME_NOTE_CASES[0]!.instrument).concertPitch
    for (let pitch = home - 24; pitch <= home + 24; pitch += 1) {
      if (pitch !== home) press(rig, pitch)
    }
    expect(start).not.toHaveBeenCalled()
    expect(rig.controller.state.phase).toBe('idle')
  })
})
