/**
 * A fresh Jam from Start to Session running through the workspace's session controller, on the
 * controller rig (fake audio clock, fake MIDI, scripted generations): Jam's code runs its capture
 * and phrase 1's ladder on the session's wake-ups; phrase 1 is handed over to the workspace, which
 * gives the session its display and phrase steps; phrase 1's backing starts at the time handed
 * over, after one, two or three measures of wait; the silence timer arms only from phrase 1 on.
 * At 240 BPM: a 1 s measure.
 */
import { describe, expect, it } from 'vitest'

import { BUILT_IN_INSTRUMENT_CLEF } from '@/domain/profile/instrument-clef'
import { startFreshJam, type FreshJam } from '@/jam/fresh-jam'
import type { JamPhase } from '@/jam/jam-phase'
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

/** What the cue row would show at one moment: the controller's count-in or the Jam's phase. */
type CueSnapshot = 'count-in' | JamPhase['state']

/** Intent: play to `target`, logging each change of what the cue row reads. */
async function cueTo(run: RigJam, target: AudioTime, log: CueSnapshot[]): Promise<void> {
  while (run.rig.audioRig.now() < target) {
    await playTo(run.rig, Math.min(target, run.rig.audioRig.now() + 0.05))
    const cue: CueSnapshot =
      run.rig.controller.state.countIn !== null ? 'count-in' : run.jam.view.value.phase.state
    if (log.at(-1) !== cue) log.push(cue)
  }
}

/** Intent: when phrase 1 sounds, as the transport took it from the hand-over. */
function phraseOneStart(run: RigJam): AudioTime {
  return run.rig.transport.phraseStartsAt(1)
}

// @test-link [[req_jam]]
// @test-link [[module_session_start_without_phrase_one]]
describe('a fresh Jam through the workspace', () => {
  // @test-link [[rule_jam_runs_as_session_from_phrase_one]]
  it('reaches Session running: phrase 1 enters the session staff and phrase 2 is readied after it', async () => {
    const run = await startJam()
    await playOneMeasure(run)
    await playTo(run.rig, run.countInEndsAt + 4.5)
    const { state } = run.rig.controller
    expect(state.phase).toBe('running')
    expect(state.lastEnd).toBeNull()
    expect(state.sessionStaff?.top?.phraseNumber).toBe(1)
    expect(state.latestReady).toBeGreaterThanOrEqual(2)
    expect(run.jam.view.value.phase).toEqual({ state: 'phrase-one' })
  })

  // @test-link [[rule_count_in_shown_on_screen]]
  // @test-link [[rule_jam_live_view_never_shows_doodle]]
  it('shows the count-in, the capture, the writing measure, then the read-in counted in', async () => {
    const run = await startJam()
    const log: CueSnapshot[] = []
    await cueTo(run, run.countInEndsAt - 0.1, log)
    await playOneMeasure(run)
    await cueTo(run, run.countInEndsAt + 4.5, log)
    expect(log).toEqual([
      'count-in',
      'capture',
      'tentative-generation-measure',
      'count-in',
      'phrase-one',
    ])
  })

  // @test-link [[rule_doodle_sets_jam_controls]]
  it('fills the readings as phrase 1 enters, and not before', async () => {
    const run = await startJam()
    await playOneMeasure(run)
    await playTo(run.rig, run.countInEndsAt + 1.9)
    expect(run.jam.view.value.readings).toBeNull()
    expect(run.rig.controller.state.sessionStaff).toBeNull()
    await playTo(run.rig, run.countInEndsAt + 2.3)
    expect(run.rig.controller.state.sessionStaff?.top?.phraseNumber).toBe(1)
    expect(run.jam.view.value.readings).not.toBeNull()
  })

  // @test-link [[rule_jam_no_backing_before_phrase_one]]
  // @test-link [[rule_jam_phrase_one_deadline]]
  it.each([1, 2, 3])(
    "starts phrase 1's backing at the time handed over after %i measure(s) of wait",
    async (waitMeasures) => {
      const run = await startJam()
      if (waitMeasures > 1) run.rig.holdGenerations()
      await playOneMeasure(run)
      // The doodle, measure 0, ends by silence at barline 1; the generation measure is measure 1.
      const generationAt = run.countInEndsAt + 1
      await playTo(run.rig, generationAt + waitMeasures - 0.5)
      run.rig.releaseGenerations()
      await playTo(run.rig, generationAt + waitMeasures + 1.5)
      const soundsAt = phraseOneStart(run)
      expect(soundsAt).toBeCloseTo(generationAt + waitMeasures + 1, 6)
      const backing = run.rig.audioRig.backingNotes()
      expect(backing.length).toBeGreaterThan(0)
      expect(Math.min(...backing.map((note) => note.at))).toBeCloseTo(soundsAt, 6)
      expect(run.rig.controller.state.phase).toBe('running')
    },
  )

  // @test-link [[rule_jam_silence_timer_from_phrase_one]]
  it('arms no silence timer on a note before phrase 1, and arms it on the first note from it', async () => {
    const run = await startJam()
    await playOneMeasure(run)
    await playTo(run.rig, run.countInEndsAt + 2.6)
    press(run.rig, 67)
    await playTo(run.rig, run.countInEndsAt + 2.7)
    lift(run.rig, 67)
    const soundsAt = phraseOneStart(run)
    expect(soundsAt).toBeCloseTo(run.countInEndsAt + 3, 6)
    await playTo(run.rig, run.countInEndsAt + 2.6 + 31)
    expect(run.rig.controller.state.phase).toBe('running')
    const firstAt = press(run.rig, 69)
    await playTo(run.rig, firstAt + 0.1)
    lift(run.rig, 69)
    await playTo(run.rig, firstAt + 29.9)
    expect(run.rig.controller.state.phase).toBe('running')
    await playTo(run.rig, firstAt + 30.6)
    expect(run.rig.controller.state.phase).toBe('idle')
    expect(run.rig.controller.state.lastEnd?.cause).toBe('silence-timeout')
  })
})
