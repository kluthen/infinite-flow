/**
 * The audio transport on the fake audio clock and output: nothing opens the audio output before
 * the player's click unlocks it; a session plays a one-measure count-in plus a quarter-note click
 * planned ahead on the audio clock; the count-in always sounds, at the current click volume,
 * whatever the click switch says; and the mix controls only ever set gains, never the clock.
 */

import { describe, expect, it } from 'vitest'

import { START_DELAY_SECONDS } from '@/audio/audio-transport'
import { FAKE_PERFORMANCE_OFFSET_MS } from './fake-audio'
import {
  beat,
  nonClickEvents,
  RIG_START,
  themeDesign,
  transportRig,
  type TransportRig,
} from './transport-rig'

// @test-link [[rule_audio_unlocked_by_player_click]]
describe('unlocking the audio', () => {
  it('opens the output only on unlock, and only once', () => {
    const { rig, transport, readMixDesign } = transportRig()
    transport.setClickVolume(0.5)
    expect(rig.openOutputCalls()).toBe(0)
    expect(transport.isUnlocked()).toBe(false)
    expect(() => transport.start({ tempo: 120 })).toThrow()
    expect(() => transport.now()).toThrow()
    expect(() => transport.outputLatency()).toThrow()
    expect(() => transport.clockAnchor()).toThrow('audio transport: the audio is not unlocked yet')
    expect(rig.events()).toEqual([])
    transport.unlock()
    transport.unlock()
    expect(rig.openOutputCalls()).toBe(1)
    expect(transport.isUnlocked()).toBe(true)
    expect(readMixDesign).toHaveBeenCalledTimes(1)
  })

  it('applies the whole mix, earlier changes included, at unlock', () => {
    const { rig, transport } = transportRig()
    transport.setClickVolume(0.5)
    transport.setBackingOn(false)
    transport.unlock()
    expect(rig.events()).toEqual([
      { kind: 'gain', gain: 'click-enable', value: 1, at: RIG_START, scheduledAt: RIG_START },
      { kind: 'gain', gain: 'click-volume', value: 0.5, at: RIG_START, scheduledAt: RIG_START },
      { kind: 'gain', gain: 'backing-enable', value: 0, at: RIG_START, scheduledAt: RIG_START },
      { kind: 'gain', gain: 'backing-volume', value: 0.8, at: RIG_START, scheduledAt: RIG_START },
    ])
  })

  it('reads the clock and the output latency from the output once unlocked', () => {
    const { rig, transport } = transportRig(0.03)
    transport.unlock()
    expect(transport.now()).toBe(RIG_START)
    expect(transport.outputLatency()).toBe(0.03)
    rig.setOutputLatency(0.05)
    rig.advance(1)
    expect(transport.now()).toBe(RIG_START + 1)
    expect(transport.outputLatency()).toBe(0.05)
  })

  // @test-link [[rule_played_onset_latency_compensation]]
  it("reads the clock anchor from the output's clock once unlocked", () => {
    const { rig, transport } = transportRig()
    transport.unlock()
    expect(transport.clockAnchor()).toEqual({
      audioTime: RIG_START,
      performanceTimeMs: RIG_START * 1000 + FAKE_PERFORMANCE_OFFSET_MS,
    })
    rig.advance(2)
    expect(transport.clockAnchor()).toEqual(rig.output.anchor())
    expect(transport.clockAnchor().audioTime).toBe(RIG_START + 2)
  })
})

// @test-link [[rule_count_in_always_clicks]]
describe('a count-in plus eight bars at 120 BPM', () => {
  it('sounds every beat on time, beat 1 accented, and ends the count-in a measure in', () => {
    const { rig, transport } = transportRig()
    transport.unlock()
    const timeline = transport.start({ tempo: 120 })
    expect(timeline.startAt).toBe(RIG_START + START_DELAY_SECONDS)
    expect(timeline.countInEndsAt).toBeCloseTo(timeline.startAt + 2, 9)
    expect(() => transport.start({ tempo: 120 })).toThrow()
    rig.advanceTo(beat(timeline.startAt, 35.5))
    const audible = rig.audibleClicks()
    expect(audible).toHaveLength(36)
    audible.forEach((click, k) => {
      expect(click.at).toBeCloseTo(beat(timeline.startAt, k), 9)
      expect(click.accent).toBe(k % 4 === 0)
      expect(click.route).toBe(k < 4 ? 'count-in' : 'click')
      expect(click.gain).toBe(0.8)
    })
  })

  it('still sounds the count-in, and only it, with the click off from the start', () => {
    const { rig, transport } = transportRig()
    transport.setClickOn(false)
    transport.setClickVolume(0.6)
    transport.unlock()
    const { startAt } = transport.start({ tempo: 120 })
    rig.advanceTo(beat(startAt, 35.5))
    expect(rig.clicks()).toHaveLength(36)
    const audible = rig.audibleClicks()
    expect(audible.map((click) => click.at)).toEqual([0, 1, 2, 3].map((k) => beat(startAt, k)))
    expect(audible.every((click) => click.gain === 0.6)).toBe(true)
  })

  it('keeps the whole count-in when the click is turned off during it', () => {
    const { rig, transport } = transportRig()
    transport.unlock()
    const { startAt } = transport.start({ tempo: 120 })
    rig.advanceTo(beat(startAt, 1.2))
    transport.setClickOn(false)
    rig.advanceTo(beat(startAt, 35.5))
    const audible = rig.audibleClicks()
    expect(audible).toHaveLength(4)
    expect(audible.every((click) => click.route === 'count-in')).toBe(true)
  })

  it('plays the rest of the count-in at a volume changed during it', () => {
    const { rig, transport } = transportRig()
    transport.unlock()
    const { startAt } = transport.start({ tempo: 120 })
    rig.advanceTo(beat(startAt, 1.2))
    transport.setClickVolume(0.4)
    rig.advanceTo(beat(startAt, 7.5))
    const gains = rig.audibleClicks().map((click) => click.gain)
    expect(gains).toEqual([0.8, 0.8, 0.4, 0.4, 0.4, 0.4, 0.4, 0.4])
  })
})

// @test-link [[rule_click_volume_never_silent]]
// @test-link [[rule_count_in_always_clicks]]
describe('the lowest click volume', () => {
  it('is above silence in the design and keeps the count-in audible', () => {
    const { range } = themeDesign()
    const { rig, transport } = transportRig()
    transport.unlock()
    transport.setClickOn(false)
    transport.setClickVolume(range.clickVolumeMin)
    expect(rig.gainAt('click-volume', rig.now())).toBeGreaterThan(0)
    const { startAt } = transport.start({ tempo: 120 })
    rig.advanceTo(beat(startAt, 7.5))
    const audible = rig.audibleClicks()
    expect(audible).toHaveLength(4)
    expect(audible.every((click) => click.gain === range.clickVolumeMin)).toBe(true)
  })

  it('rejects silence and anything below the floor', () => {
    const { range } = themeDesign()
    const { transport } = transportRig()
    expect(() => transport.setClickVolume(0)).toThrow(RangeError)
    expect(() => transport.setClickVolume(range.clickVolumeMin - 0.01)).toThrow(RangeError)
    expect(() => transport.setBackingVolume(range.volumeMax + 0.01)).toThrow(RangeError)
    expect(transport.mix().clickVolume).toBe(0.8)
  })
})

/** Intent: a running session at 120 BPM, then `seconds` of it, on a fresh rig. */
function runningFor(seconds: number, muteDuringRun: boolean): TransportRig {
  const setup = transportRig()
  const { rig, transport } = setup
  transport.unlock()
  transport.start({ tempo: 120 })
  if (!muteDuringRun) {
    rig.advance(seconds)
    return setup
  }
  rig.advance(seconds / 2)
  transport.setBackingOn(false)
  transport.setClickOn(false)
  transport.setBackingVolume(0)
  transport.setBackingVolume(0.8)
  transport.setClickOn(true)
  transport.setBackingOn(true)
  rig.advance(seconds / 2)
  return setup
}

// @test-link [[req_session_audio_mix]]
// @test-link [[rule_playhead_follows_audio_clock]]
describe('muting and unmuting', () => {
  it('only sets gains to zero and back, and never moves the clock or the clicks', () => {
    const { rig, transport } = transportRig()
    transport.unlock()
    transport.start({ tempo: 120 })
    rig.advance(3)
    expect(transport.now()).toBe(RIG_START + 3)
    const before = rig.events().length
    transport.setBackingOn(false)
    rig.advance(1)
    expect(transport.now()).toBe(RIG_START + 4)
    transport.setClickOn(false)
    transport.setBackingVolume(0)
    rig.advance(1)
    expect(transport.now()).toBe(RIG_START + 5)
    transport.setBackingVolume(0.8)
    transport.setClickOn(true)
    transport.setBackingOn(true)
    rig.advance(1)
    expect(transport.now()).toBe(RIG_START + 6)
    const gain = (name: string, value: number, at: number): object => ({
      kind: 'gain',
      gain: name,
      value,
      at,
      scheduledAt: at,
    })
    expect(nonClickEvents(rig.events().slice(before))).toEqual([
      gain('backing-enable', 0, RIG_START + 3),
      gain('click-enable', 0, RIG_START + 4),
      gain('backing-volume', 0, RIG_START + 4),
      gain('backing-volume', 0.8, RIG_START + 5),
      gain('click-enable', 1, RIG_START + 5),
      gain('backing-enable', 1, RIG_START + 5),
    ])
  })

  it('leaves every click time as it would be without the mutes', () => {
    const muted = runningFor(6, true).rig.clicks()
    const plain = runningFor(6, false).rig.clicks()
    expect(muted.map((click) => click.at)).toEqual(plain.map((click) => click.at))
    expect(muted.map((click) => click.scheduledAt)).toEqual(plain.map((click) => click.scheduledAt))
  })
})
