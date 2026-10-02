/**
 * Played notes in a session with a controller: a note matching an expected note is acknowledged
 * (on screen and in the history); a wrong note changes no state at all; every finished note is
 * recorded, latency-compensated (zero for USB), in the phrase its onset falls in, the starting note
 * in none; notes still held at the end are released then. A session without a controller reads no
 * note. On the fake audio clock at 240 BPM from 5 s: the count-in runs from 5.1 s to 6.1 s, phrase
 * 1 sounds from 6.1 s, phrase 2 from 10.1 s.
 */
import { describe, expect, it } from 'vitest'

import type { ExpectedNote } from '@/domain/acknowledgement/expected-note'
import { controllerRig, outputsOf, playTo, type ControllerRig } from './session-controller-rig'
import {
  connectKeys,
  expectedNotesOf,
  lift,
  press,
  rigStartingNote,
  VELOCITY,
} from './session-controller-midi'

/** Intent: phrase 1's expected notes in a session started now. */
function phraseOneNotes(rig: ControllerRig): readonly ExpectedNote[] {
  return expectedNotesOf(rig, 1, rig.phraseOne.outcome.result.timeline)
}

/** Intent: an expected note at `index`, which the phrase must have. */
function noteAt(notes: readonly ExpectedNote[], index: number): ExpectedNote {
  const note = notes[index]
  if (note === undefined) throw new Error(`the phrase has no expected note ${index}`)
  return note
}

/** Intent: a session started by its starting note, pressed and released at 5 s. */
async function startedByTheStartingNote(): Promise<ControllerRig> {
  const rig = controllerRig()
  await connectKeys(rig)
  const pitch = rigStartingNote(rig).concertPitch
  press(rig, pitch)
  await playTo(rig, 5.05)
  lift(rig, pitch)
  return rig
}

// @test-link [[rule_acknowledgement_highlights_expected_note_only]]
// @test-link [[rule_session_history_records_played_notes]]
describe('session controller: played notes in a session with a controller', () => {
  // @test-link [[rule_played_onset_latency_compensation]]
  it('acknowledges a matching note and records it in its phrase, the starting note in none', async () => {
    const rig = await startedByTheStartingNote()
    const first = noteAt(phraseOneNotes(rig), 0)
    expect(rig.controller.state.acknowledged).toEqual([])

    await playTo(rig, first.onsetSeconds)
    const onsetAt = press(rig, first.pitch)
    await playTo(rig, first.onsetSeconds + 0.1)
    const releaseAt = lift(rig, first.pitch)

    expect(rig.controller.state.acknowledged).toEqual([first.identity])
    await playTo(rig, 7)
    rig.controller.stop()
    const [phraseOne] = rig.controller.state.lastHistory?.phrases() ?? []
    expect(phraseOne?.acknowledgements).toEqual([first.identity])
    expect(phraseOne?.playedNotes).toEqual([
      { pitch: first.pitch, velocity: VELOCITY, onsetAt, releaseAt },
    ])
  })

  // @test-link [[rule_no_grading_or_mismatch_signal]]
  it('changes no state on a wrong note, and records it with no acknowledgement', async () => {
    const rig = await startedByTheStartingNote()
    const first = noteAt(phraseOneNotes(rig), 0)
    await playTo(rig, first.onsetSeconds)
    press(rig, first.pitch)
    lift(rig, first.pitch)
    const acknowledged = rig.controller.state.acknowledged

    const second = noteAt(phraseOneNotes(rig), 1)
    await playTo(rig, second.onsetSeconds)
    const wrongPitch = second.pitch + 1
    const onsetAt = press(rig, wrongPitch)
    const releaseAt = lift(rig, wrongPitch)

    expect(rig.controller.state.acknowledged).toBe(acknowledged)
    rig.controller.stop()
    const [phraseOne] = rig.controller.state.lastHistory?.phrases() ?? []
    expect(phraseOne?.acknowledgements).toEqual([first.identity])
    expect(phraseOne?.playedNotes).toContainEqual({
      pitch: wrongPitch,
      velocity: VELOCITY,
      onsetAt,
      releaseAt,
    })
  })

  it('acknowledges the notes of each readied phrase, in that phrase', async () => {
    const rig = await startedByTheStartingNote()
    await playTo(rig, 10)
    const [ready] = outputsOf(rig, 'phrase-ready')
    if (ready === undefined) throw new Error('phrase 2 was never readied')
    const first = noteAt(expectedNotesOf(rig, 2, ready.phrase.outcome.result.timeline), 0)

    await playTo(rig, first.onsetSeconds)
    press(rig, first.pitch)
    lift(rig, first.pitch)

    expect(rig.controller.state.acknowledged).toEqual([first.identity])
    await playTo(rig, first.onsetSeconds + 0.1)
    rig.controller.stop()
    const phrases = rig.controller.state.lastHistory?.phrases() ?? []
    expect(phrases.map((phrase) => phrase.acknowledgements)).toEqual([[], [first.identity]])
  })

  it('releases and records the notes still held at the end, then clears the MIDI state', async () => {
    const rig = await startedByTheStartingNote()
    const first = noteAt(phraseOneNotes(rig), 0)
    await playTo(rig, first.onsetSeconds)
    const onsetAt = press(rig, first.pitch)
    await playTo(rig, 7.2)

    rig.controller.stop()

    const [phraseOne] = rig.controller.state.lastHistory?.phrases() ?? []
    expect(phraseOne?.playedNotes).toEqual([
      { pitch: first.pitch, velocity: VELOCITY, onsetAt, releaseAt: 7.2 },
    ])
    expect(rig.controller.state.acknowledged).toEqual([])
    expect(rig.controller.state.controllerLost).toBeNull()
    expect(rig.controller.state.sessionHasController).toBeNull()
  })
})

// @test-link [[rule_controllerless_session_never_gains_controller]]
describe('session controller: a session without a controller', () => {
  it('reads no controller and acknowledges nothing', async () => {
    const rig = controllerRig()
    rig.controller.start()
    expect(rig.controller.state.sessionHasController).toBe(false)
    await playTo(rig, 7)
    expect(rig.controller.state.acknowledged).toEqual([])
    expect(rig.controller.state.controllerLost).toBeNull()
    rig.controller.stop()
    expect(rig.controller.state.sessionHasController).toBeNull()
  })
})
