/**
 * The click forced on from the count-in until phrase 1 sounds, whatever `Click` says: a session
 * started with the click forced hears every beat with the click off, until the end its caller
 * sets, after which `Click` governs again; a session started without it hears only its count-in.
 */

import { describe, expect, it } from 'vitest'

import { audibleClicksOf } from './fake-audio'
import { BEAT, beat, transportRig } from './transport-rig'

/** Intent: the beats (counted from the session's start) of the clicks heard, in order. */
function heardBeats(startAt: number, ats: readonly number[]): readonly number[] {
  return ats.map((at) => Math.round((at - startAt) / BEAT))
}

// @test-link [[rule_jam_click_runs_until_phrase_one]]
describe('the click forced on until phrase 1', () => {
  // @test-link [[rule_jam_click_runs_until_phrase_one]]
  it('sounds every beat from the count-in on with Click off while no end is set', () => {
    const { rig, transport } = transportRig()
    transport.unlock()
    transport.setClickOn(false)
    const { startAt } = transport.start({ tempo: 120, clickForced: true })
    rig.advanceTo(beat(startAt, 15) + 0.01)
    const heard = audibleClicksOf(rig.events()).map((click) => click.at)
    expect(heardBeats(startAt, heard)).toEqual([...Array(16).keys()])
  })

  // @test-link [[rule_jam_click_runs_until_phrase_one]]
  // @test-link [[rule_click_track]]
  it('lets Click govern again from the end its caller sets', () => {
    const { rig, transport } = transportRig()
    transport.unlock()
    transport.setClickOn(false)
    const { startAt } = transport.start({ tempo: 120, clickForced: true })
    rig.advanceTo(beat(startAt, 6))
    transport.forceClickUntil(beat(startAt, 12))
    rig.advanceTo(beat(startAt, 20))
    const heard = audibleClicksOf(rig.events()).map((click) => click.at)
    expect(heardBeats(startAt, heard)).toEqual([...Array(12).keys()])
  })

  // @test-link [[rule_count_in_always_clicks]]
  it('forces nothing past the count-in in a session started without it', () => {
    const { rig, transport } = transportRig()
    transport.unlock()
    transport.setClickOn(false)
    const { startAt } = transport.start({ tempo: 120 })
    rig.advanceTo(beat(startAt, 10))
    const heard = audibleClicksOf(rig.events()).map((click) => click.at)
    expect(heardBeats(startAt, heard)).toEqual([0, 1, 2, 3])
  })
})
