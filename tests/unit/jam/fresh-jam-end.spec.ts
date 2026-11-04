/**
 * A fresh Jam's end through the workspace's one end path, on the controller rig (fake audio
 * clock, fake MIDI, scripted generations): once phrase 1 has sounded, the review opens with the
 * Jam's part (the doodle, its barlines and raw notes, the count-in's first beat, the suggestion with
 * no decline, the controls taken from the doodle) and session mode's Idle is asked for nothing;
 * before phrase 1, the Jam ends as a count-in end: no review, nothing saved, the most recent
 * session as it was. A session started with phrase 1 has no Jam part. At 240 BPM: a 1 s measure.
 */
import { describe, expect, it } from 'vitest'

import { BUILT_IN_INSTRUMENT_CLEF } from '@/domain/profile/instrument-clef'
import { startFreshJam, type FreshJam } from '@/jam/fresh-jam'
import type { AudioTime } from '@/session/session-types'
import {
  controllerRig,
  playTo,
  type ControllerRig,
} from '../components/workspace/session-controller-rig'
import { connectKeys, lift, press } from '../components/workspace/session-controller-midi'

/** A started fresh Jam on a connected rig. */
interface RigJam {
  readonly rig: ControllerRig
  readonly jam: FreshJam
  readonly countInEndsAt: AudioTime
}

/** Intent: a connected rig with a fresh Jam started under the rig's settings. */
async function startJam(): Promise<RigJam> {
  const rig = controllerRig()
  await connectKeys(rig)
  const jam = startFreshJam({
    startWithoutPhraseOne: rig.controller.startWithoutPhraseOne,
    jam: { settings: rig.settings, drift: 'Near' },
    clef: BUILT_IN_INSTRUMENT_CLEF,
  })
  return { rig, jam, countInEndsAt: jam.session.timeline.countInEndsAt }
}

/** Intent: a one-measure doodle of four quarter notes from the count-in's end, played live. */
async function playOneMeasure(run: RigJam): Promise<void> {
  for (const [index, pitch] of [60, 62, 64, 65].entries()) {
    await playTo(run.rig, run.countInEndsAt + index * 0.25 + 0.01)
    press(run.rig, pitch)
    await playTo(run.rig, run.countInEndsAt + index * 0.25 + 0.2)
    lift(run.rig, pitch)
  }
}

// @test-link [[module_jam_session_end]]
describe("a fresh Jam's end through the workspace", () => {
  // @test-link [[module_jam_session_end]]
  // @test-link [[rule_raw_doodle_notes_are_played_notes]]
  it("opens the review with the Jam's part once phrase 1 has sounded, asking session mode for nothing", async () => {
    const run = await startJam()
    await playOneMeasure(run)
    await playTo(run.rig, run.countInEndsAt + 4.5)
    const readings = run.jam.view.value.readings
    expect(readings).not.toBeNull()
    run.rig.controller.stop()
    const { review, mostRecent } = run.rig.controller.state
    const jam = review?.jam
    expect(review?.showing).toBe(true)
    expect(jam?.doodle.doodle.measureCount).toBe(1)
    expect(jam?.doodle.captureTempo).toBe(run.rig.settings.controls.tempo)
    expect(jam?.doodle.firstBarlineAt).toBeCloseTo(run.countInEndsAt, 6)
    expect(jam?.doodle.endBarlineAt).toBeCloseTo(run.countInEndsAt + 1, 6)
    expect(jam?.doodle.playedNotes.map((note) => note.pitch)).toEqual([60, 62, 64, 65])
    expect(jam?.countInStartAt).toBe(run.jam.session.timeline.startAt)
    expect(jam?.suggestion).toEqual(run.rig.controller.state.lastHistory?.suggestion())
    expect(jam?.suggestion).not.toBeNull()
    expect(jam?.suggestionDeclined).toBe(false)
    expect(jam?.doodleControls).toEqual(readings)
    expect(mostRecent?.kind === 'held' ? mostRecent.session.jam : undefined).toEqual(jam)
    expect(run.rig.freshPhraseRequests).toHaveLength(0)
    expect(run.jam.view.value.phase).toEqual({ state: 'ended' })
  })

  // @test-link [[rule_jam_ending_before_phrase_one]]
  it('ends as a count-in end before phrase 1: no review, nothing saved, the most recent as it was', async () => {
    const run = await startJam()
    await playOneMeasure(run)
    await playTo(run.rig, run.countInEndsAt + 1.5)
    run.rig.controller.stop()
    const { state } = run.rig.controller
    expect(state.lastEnd).toEqual({ cause: 'stop', phase: 'count-in', soundedPhraseCount: 0 })
    expect(state.review).toBeNull()
    expect(state.mostRecent).toBeNull()
    expect(run.rig.sessionSaves).toHaveLength(0)
    expect(run.rig.freshPhraseRequests).toHaveLength(0)
    expect(run.jam.view.value).toEqual({ phase: { state: 'ended' }, readings: null })
  })

  // @test-link [[rule_jam_without_doodle_note_ends]]
  it('ends for no doodle note 30 s after the count-in, with no review', async () => {
    const run = await startJam()
    await playTo(run.rig, run.countInEndsAt + 30.5)
    const { state } = run.rig.controller
    expect(state.phase).toBe('idle')
    expect(state.lastEnd?.cause).toBe('no-note-played')
    expect(state.review).toBeNull()
  })
})
