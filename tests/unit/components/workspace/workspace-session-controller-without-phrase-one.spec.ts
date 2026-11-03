/**
 * A session started without phrase 1 (a fresh Jam's way in): Start draws exactly one session seed,
 * queues no backing and forces the click on whatever `Click` says; the count-in shows and nothing
 * is requested; no played note arms the silence timer before phrase 1; the played notes reach the
 * caller's port; and every end before phrase 1 (Stop, a hidden tab, the caller's own causes, a
 * lost controller at once) is a count-in end that keeps nothing. On the fake audio clock at 240 BPM
 * from 5 s.
 */
import { describe, expect, it } from 'vitest'

import type { SessionEndCause } from '@/session/session-types'
import { audibleBackingOf, audibleClicksOf } from '../../audio/fake-audio'
import { startFresh, type FreshStart } from './session-controller-fresh-start'
import { controllerRig, playTo, type ControllerRig } from './session-controller-rig'
import { connectKeys, lift, press, unplugKeys } from './session-controller-midi'

/** The beat length at the rig's 240 BPM. */
const BEAT = 0.25

/** Intent: a rig with the controller connected and a session started without phrase 1. */
async function connectedFreshStart(): Promise<{ rig: ControllerRig; fresh: FreshStart }> {
  const rig = controllerRig()
  await connectKeys(rig)
  return { rig, fresh: startFresh(rig) }
}

/** Intent: expect a count-in end for `cause` that kept nothing and opened no review. */
function expectCountInEndKeepingNothing(rig: ControllerRig, cause: SessionEndCause): void {
  expect(rig.controller.state.phase).toBe('idle')
  expect(rig.controller.state.lastEnd).toEqual({ cause, phase: 'count-in', soundedPhraseCount: 0 })
  expect(rig.controller.state.review).toBeNull()
  expect(rig.controller.state.mostRecent).toBeNull()
  expect(rig.sessionSaves).toEqual([])
  expect(rig.controller.state.controllerLost).toBeNull()
}

// @test-link [[module_session_start_without_phrase_one]]
describe('session controller: a start without phrase 1', () => {
  // @test-link [[module_session_seed_plan]]
  // @test-link [[module_session_start_without_phrase_one]]
  it('draws exactly one session seed, at Start, and none during the count-in or after', async () => {
    const { rig } = await connectedFreshStart()
    expect(rig.sessionSeedsDrawn).toHaveLength(1)
    expect(rig.controller.state.lastHistory).toBeNull()
    await playTo(rig, 40)
    expect(rig.sessionSeedsDrawn).toHaveLength(1)
  })

  // @test-link [[rule_jam_click_runs_until_phrase_one]]
  // @test-link [[rule_jam_no_backing_before_phrase_one]]
  it('sounds the click every beat from the count-in with Click off, and schedules no backing', async () => {
    const rig = controllerRig()
    await connectKeys(rig)
    rig.transport.setClickOn(false)
    startFresh(rig)
    await playTo(rig, 9)
    const startAt = rig.runnerInputsWithoutPhraseOne[0]!.start.at
    const heard = audibleClicksOf(rig.audioRig.events())
      .map((click) => click.at)
      .filter((at) => at <= 9)
    const beats = Math.floor((9 - startAt) / BEAT) + 1
    expect(heard).toHaveLength(beats)
    heard.forEach((at, k) => expect(at).toBeCloseTo(startAt + k * BEAT, 9))
    expect(rig.audioRig.events().filter((event) => event.kind === 'backing')).toEqual([])
    expect(audibleBackingOf(rig.audioRig.events())).toEqual([])
  })

  // @test-link [[rule_count_in_shown_on_screen]]
  // @test-link [[module_session_start_without_phrase_one]]
  it('shows the count-in, requests nothing and stays before phrase 1 after the count-in', async () => {
    const { rig, fresh } = await connectedFreshStart()
    expect(rig.controller.state.phase).toBe('count-in')
    expect(rig.controller.state.countIn).not.toBeNull()
    await playTo(rig, 20)
    expect(rig.controller.state.countIn).toBeNull()
    expect(rig.controller.state.phase).toBe('count-in')
    expect(fresh.outputs).toEqual([])
    expect(rig.events.map((event) => event.kind)).not.toContain('count-in-over')
  })

  // @test-link [[rule_jam_silence_timer_from_phrase_one]]
  it('arms no silence timer for any note before phrase 1, and hands every note to its caller', async () => {
    const { rig, fresh } = await connectedFreshStart()
    press(rig, 60)
    lift(rig, 60)
    await playTo(rig, 10)
    press(rig, 62)
    lift(rig, 62)
    await playTo(rig, 80)
    expect(rig.controller.state.phase).toBe('count-in')
    expect(fresh.notes.map((event) => [event.kind, event.note.pitch])).toEqual([
      ['played', 60],
      ['ended', 60],
      ['played', 62],
      ['ended', 62],
    ])
  })

  // @test-link [[rule_jam_controller_loss_before_phrase_one]]
  it('ends at once on a lost controller, as a count-in end, with no countdown', async () => {
    const { rig } = await connectedFreshStart()
    await playTo(rig, 8)
    unplugKeys(rig)
    expectCountInEndKeepingNothing(rig, 'controller-lost')
  })

  // @test-link [[rule_jam_ending_before_phrase_one]]
  it('ends on Stop as a count-in end, keeping nothing', async () => {
    const { rig } = await connectedFreshStart()
    await playTo(rig, 7)
    rig.controller.stop()
    expectCountInEndKeepingNothing(rig, 'stop')
  })

  // @test-link [[rule_jam_ending_before_phrase_one]]
  it('ends when the tab is hidden, as a count-in end, keeping nothing', async () => {
    const { rig } = await connectedFreshStart()
    await playTo(rig, 7)
    rig.browser.pageVisibility.setHidden(true)
    expectCountInEndKeepingNothing(rig, 'hidden-tab')
  })

  // @test-link [[rule_jam_without_doodle_note_ends]]
  // @test-link [[rule_jam_ending_before_phrase_one]]
  it.each<SessionEndCause>(['no-note-played', 'no-phrase-one', 'staff-not-shown'])(
    "ends for its caller's cause %s as a count-in end, keeping nothing",
    async (cause) => {
      const { rig, fresh } = await connectedFreshStart()
      await playTo(rig, 36)
      fresh.session.end(cause)
      expectCountInEndKeepingNothing(rig, cause)
      expect(fresh.outputs.at(-1)).toMatchObject({ kind: 'ended', cause, phase: 'count-in' })
    },
  )
})
