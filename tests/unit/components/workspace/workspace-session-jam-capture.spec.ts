/**
 * A fresh Jam's capture driving a session started without phrase 1, as Jam's code will (chunk 21
 * wires it on screen): every played note goes from the session's port into the capture, the
 * capture is advanced on the audio clock, its no-note end ends the session and its doodle goes to
 * the session's history. With no doodle note 30 s after the count-in the Jam ends; every end during
 * the capture is a count-in end that keeps nothing, the silence timer never armed; the history
 * keeps the doodle with its raw notes. On the fake audio clock at 240 BPM (a 1 s measure).
 */
import { describe, expect, it } from 'vitest'

import type { SessionWithoutPhraseOne } from '@/components/workspace/workspace-session-controller-types'
import { BUILT_IN_INSTRUMENT_CLEF } from '@/domain/profile/instrument-clef'
import { createJamCapture, type JamCapture, type JamCaptureOutput } from '@/jam/jam-capture'
import type { SessionEndCause } from '@/session/session-types'
import { controllerRig, playTo, RIG_TEMPO, type ControllerRig } from './session-controller-rig'
import { connectKeys, lift, press, unplugKeys } from './session-controller-midi'

/** A fresh Jam on the rig: its session handle, its capture and every output the capture gave. */
interface FreshJam {
  readonly rig: ControllerRig
  readonly session: SessionWithoutPhraseOne
  readonly jam: JamCapture
  readonly outputs: JamCaptureOutput[]
}

/** Intent: act on the capture's outputs as Jam's code does: its end, its doodle to the history. */
function follow(fresh: { session: SessionWithoutPhraseOne; outputs: JamCaptureOutput[] }) {
  return (outputs: readonly JamCaptureOutput[]): void => {
    for (const output of outputs) {
      fresh.outputs.push(output)
      if (output.kind === 'no-note-played') fresh.session.end('no-note-played')
      if (output.kind === 'doodle-ended') fresh.session.recordDoodle(output.end)
    }
  }
}

/** Intent: a connected rig with a fresh Jam started, its notes routed into its capture. */
async function freshJam(): Promise<FreshJam> {
  const rig = controllerRig()
  await connectKeys(rig)
  const outputs: JamCaptureOutput[] = []
  const routed: { fresh: FreshJam | null } = { fresh: null }
  const session = rig.controller.startWithoutPhraseOne({
    settings: rig.settings,
    clef: BUILT_IN_INSTRUMENT_CLEF,
    playedNotes: (event) => {
      if (routed.fresh !== null) follow(routed.fresh)(routed.fresh.jam.note(event))
    },
    checkFit: () => Promise.resolve(true),
    outputs: () => undefined,
  })
  const jam = createJamCapture({ startAt: session.timeline.startAt, tempo: RIG_TEMPO })
  routed.fresh = { rig, session, jam, outputs }
  return routed.fresh
}

/** Intent: play the rig on to `target`, advancing the capture as it goes; it stops once ended. */
async function jamTo(fresh: FreshJam, target: number): Promise<void> {
  const { rig, jam } = fresh
  const act = follow(fresh)
  while (rig.audioRig.now() < target) {
    await playTo(rig, Math.min(target, rig.audioRig.now() + 0.05))
    if (rig.controller.state.phase === 'idle') jam.end()
    act(jam.advance(rig.audioRig.now()))
  }
}

/** Intent: expect a count-in end for `cause` that kept nothing and opened no review. */
function expectCountInEndKeepingNothing(rig: ControllerRig, cause: SessionEndCause): void {
  expect(rig.controller.state.phase).toBe('idle')
  expect(rig.controller.state.lastEnd).toEqual({ cause, phase: 'count-in', soundedPhraseCount: 0 })
  expect(rig.controller.state.review).toBeNull()
  expect(rig.controller.state.mostRecent).toBeNull()
  expect(rig.sessionSaves).toEqual([])
}

/** Intent: expect the session still running before phrase 1, nothing having ended it. */
function expectRunning(rig: ControllerRig): void {
  expect(rig.controller.state.phase).toBe('count-in')
  expect(rig.controller.state.lastEnd).toBeNull()
}

// @test-link [[module_jam_capture]]
// @test-link [[module_session_start_without_phrase_one]]
describe('a fresh Jam: its capture driving a session started without phrase 1', () => {
  // @test-link [[rule_jam_without_doodle_note_ends]]
  it('ends with no doodle note 30 s after the count-in: running at 29.9 s, ended by 30.1 s', async () => {
    const fresh = await freshJam()
    const countInEndsAt = fresh.session.timeline.countInEndsAt
    await jamTo(fresh, countInEndsAt + 29.9)
    expectRunning(fresh.rig)
    await jamTo(fresh, countInEndsAt + 30.1)
    expectCountInEndKeepingNothing(fresh.rig, 'no-note-played')
    expect(fresh.outputs.map((output) => output.kind)).toEqual(['no-note-played'])
  })

  // @test-link [[rule_jam_ending_before_phrase_one]]
  // @test-link [[rule_jam_silence_timer_from_phrase_one]]
  // @test-link [[rule_jam_controller_loss_before_phrase_one]]
  it.each<[SessionEndCause, (fresh: FreshJam) => void]>([
    ['stop', (fresh) => fresh.rig.controller.stop()],
    ['hidden-tab', (fresh) => fresh.rig.browser.pageVisibility.setHidden(true)],
    ['controller-lost', (fresh) => unplugKeys(fresh.rig)],
    ['staff-not-shown', (fresh) => fresh.session.end('staff-not-shown')],
  ])(
    'ends during the capture on %s as a count-in end, keeping nothing, the silence timer never armed',
    async (cause, ending) => {
      const fresh = await freshJam()
      const countInEndsAt = fresh.session.timeline.countInEndsAt
      await jamTo(fresh, countInEndsAt + 0.1)
      press(fresh.rig, 60)
      await jamTo(fresh, countInEndsAt + 1.4)
      lift(fresh.rig, 60)
      await jamTo(fresh, countInEndsAt + 1.6)
      expect(fresh.jam.phase()).toMatchObject({ state: 'capture', doodleMeasure: 2 })
      await jamTo(fresh, countInEndsAt + 40)
      expectRunning(fresh.rig)
      ending(fresh)
      expectCountInEndKeepingNothing(fresh.rig, cause)
      expect(fresh.rig.controller.state.controllerLost).toBeNull()
    },
  )

  // @test-link [[rule_raw_doodle_notes_are_played_notes]]
  // @test-link [[rule_notes_after_doodle_belong_nowhere]]
  it('keeps the doodle in the history, its raw notes marked and in no phrase', async () => {
    const fresh = await freshJam()
    const countInEndsAt = fresh.session.timeline.countInEndsAt
    await jamTo(fresh, countInEndsAt + 0.1)
    const onset = press(fresh.rig, 60)
    await jamTo(fresh, countInEndsAt + 0.5)
    const release = lift(fresh.rig, 60)
    await jamTo(fresh, countInEndsAt + 2.5)
    press(fresh.rig, 62)
    await jamTo(fresh, countInEndsAt + 2.8)
    lift(fresh.rig, 62)
    expect(fresh.outputs.map((output) => output.kind)).toEqual(['candidate-end', 'doodle-ended'])
    fresh.rig.controller.stop()
    const history = fresh.rig.controller.state.lastHistory
    const doodle = history?.doodle()
    expect(doodle?.captureTempo).toBe(RIG_TEMPO)
    expect(doodle?.firstBarlineAt).toBeCloseTo(countInEndsAt, 9)
    expect(doodle?.endBarlineAt).toBeCloseTo(countInEndsAt + 1, 9)
    expect(doodle?.doodle.measureCount).toBe(1)
    expect(doodle?.playedNotes.map((note) => [note.pitch, note.onsetAt, note.releaseAt])).toEqual([
      [60, onset, release],
    ])
    expect(history?.phrases()).toEqual([])
  })
})
