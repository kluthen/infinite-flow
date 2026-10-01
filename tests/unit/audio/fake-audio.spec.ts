/**
 * The shared audio recorder the fake rig and the workspace harness's real mode both use: it passes
 * every call on to the output it wraps, then records it stamped with that output's clock.
 */
import { describe, expect, it, vi } from 'vitest'

import type { AudioOutput, SessionBus } from '@/audio/audio-ports'
import { midiTimestampToAudioTime } from '@/midi/midi-clock-mapping'
import {
  audibleBackingOf,
  audibleClicksOf,
  createFakeAudioRig,
  FAKE_PERFORMANCE_OFFSET_MS,
  recordAudioOutput,
} from './fake-audio'

/** Intent: an inner output made of spies, whose clock the test sets through `clock.t`. */
function spyOutput() {
  const clock = { t: 3 }
  const bus = {
    scheduleClick: vi.fn(),
    scheduleBackingNote: vi.fn(),
    fadeOut: vi.fn(),
  } satisfies SessionBus
  const inner = {
    now: vi.fn(() => clock.t),
    outputLatency: vi.fn(() => 0.02),
    anchor: vi.fn(() => ({ audioTime: clock.t, performanceTimeMs: 90_000 + clock.t * 1000 })),
    setGain: vi.fn(),
    openSessionBus: vi.fn(() => bus),
    onInterrupted: vi.fn(),
  } satisfies AudioOutput
  return { clock, bus, inner }
}

// @test-link [[rule_playhead_follows_audio_clock]]
describe('recordAudioOutput', () => {
  // @test-link [[rule_playhead_follows_audio_clock]]
  it('passes every call on and records it at the inner clock time', () => {
    const { clock, bus, inner } = spyOutput()
    const recorded = recordAudioOutput(inner)

    recorded.output.setGain('click-volume', 0.5, 3)
    clock.t = 3.25
    const opened = recorded.output.openSessionBus()
    opened.scheduleClick({ at: 3.5, accent: true, route: 'count-in' })
    clock.t = 3.4
    opened.fadeOut(3.4, 0.1)

    expect(inner.setGain).toHaveBeenCalledWith('click-volume', 0.5, 3)
    expect(bus.scheduleClick).toHaveBeenCalledWith({ at: 3.5, accent: true, route: 'count-in' })
    expect(bus.fadeOut).toHaveBeenCalledWith(3.4, 0.1)
    expect(recorded.output.now()).toBe(3.4)
    expect(recorded.output.outputLatency()).toBe(0.02)
    expect(recorded.output.anchor()).toEqual({ audioTime: 3.4, performanceTimeMs: 93_400 })
    expect(recorded.events()).toEqual([
      { kind: 'gain', gain: 'click-volume', value: 0.5, at: 3, scheduledAt: 3 },
      { kind: 'open-bus', bus: 1, scheduledAt: 3.25 },
      {
        kind: 'click',
        bus: 1,
        at: 3.5,
        accent: true,
        route: 'count-in',
        scheduledAt: 3.25,
      },
      { kind: 'fade', bus: 1, at: 3.4, duration: 0.1, scheduledAt: 3.4 },
    ])
  })

  // @test-link [[rule_playhead_follows_audio_clock]]
  it('records nothing for a call the inner output rejects', () => {
    const { inner } = spyOutput()
    inner.setGain.mockImplementation(() => {
      throw new Error('rejected')
    })
    const recorded = recordAudioOutput(inner)

    expect(() => recorded.output.setGain('click-enable', Number.NaN, 3)).toThrow('rejected')
    expect(recorded.events()).toEqual([])
  })

  // @test-link [[rule_count_in_always_clicks]]
  it('feeds audibleClicksOf the same way the fake rig does', () => {
    const { inner } = spyOutput()
    const recorded = recordAudioOutput(inner)
    for (const gain of ['click-enable', 'click-volume'] as const) {
      recorded.output.setGain(gain, gain === 'click-enable' ? 0 : 0.4, 3)
    }
    const opened = recorded.output.openSessionBus()
    opened.scheduleClick({ at: 3.5, accent: true, route: 'count-in' })
    opened.scheduleClick({ at: 4, accent: false, route: 'click' })

    expect(audibleClicksOf(recorded.events()).map(({ at, gain }) => ({ at, gain }))).toEqual([
      { at: 3.5, gain: 0.4 },
    ])
  })

  // @test-link [[req_session_backing_track]]
  // @test-link [[req_session_audio_mix]]
  it('records backing notes and feeds audibleBackingOf the backing gains and fades', () => {
    const { clock, bus, inner } = spyOutput()
    const recorded = recordAudioOutput(inner)
    recorded.output.setGain('backing-enable', 1, 3)
    recorded.output.setGain('backing-volume', 0.5, 3)
    recorded.output.setGain('backing-enable', 0, 4)
    recorded.output.setGain('backing-enable', 1, 5)
    recorded.output.setGain('backing-volume', 0, 6)
    const opened = recorded.output.openSessionBus()
    const note = (at: number) => ({ voice: 'bass', pitch: 40, at, until: at + 0.5 }) as const
    clock.t = 3.2
    for (const at of [3.5, 4.5, 5.5, 6.5]) opened.scheduleBackingNote(note(at))
    const faded = recorded.output.openSessionBus()
    faded.scheduleBackingNote(note(3.5))
    faded.scheduleBackingNote(note(5.5))
    faded.fadeOut(5, 0.1)

    expect(bus.scheduleBackingNote).toHaveBeenCalledWith(note(3.5))
    expect(recorded.events()).toContainEqual({
      kind: 'backing',
      bus: 1,
      ...note(3.5),
      scheduledAt: 3.2,
    })
    expect(
      audibleBackingOf(recorded.events()).map(({ bus: n, at, gain }) => [n, at, gain]),
    ).toEqual([
      [1, 3.5, 0.5],
      [1, 5.5, 0.5],
      [2, 3.5, 0.5],
    ])
  })
})

// @test-link [[rule_played_onset_latency_compensation]]
// @test-link [[rule_playhead_follows_audio_clock]]
describe('the fake rig clock anchor', () => {
  // @test-link [[rule_playhead_follows_audio_clock]]
  it('reads the fake clock beside a performance.now() timeline offset from it', () => {
    const rig = createFakeAudioRig({ startTime: 2 })
    expect(FAKE_PERFORMANCE_OFFSET_MS).not.toBe(0)
    expect(rig.output.anchor()).toEqual({
      audioTime: 2,
      performanceTimeMs: 2_000 + FAKE_PERFORMANCE_OFFSET_MS,
    })
    rig.advance(1.5)
    expect(rig.output.anchor()).toEqual({
      audioTime: 3.5,
      performanceTimeMs: 3_500 + FAKE_PERFORMANCE_OFFSET_MS,
    })
  })

  // @test-link [[rule_playhead_follows_audio_clock]]
  it('takes the performance.now() offset from its options', () => {
    const rig = createFakeAudioRig({ startTime: 1, performanceOffsetMs: 7_000 })
    expect(rig.output.anchor()).toEqual({ audioTime: 1, performanceTimeMs: 8_000 })
    expect(rig.performanceTimeAt(4)).toBe(11_000)
  })

  // @test-link [[rule_played_onset_latency_compensation]]
  it('maps a MIDI timestamp stamped at performanceTimeAt(t) back onto exactly t', () => {
    const rig = createFakeAudioRig({ startTime: 5 })
    const times = [0.5, 5, 5.3, 7.125, 12.9]
    for (const t of times) {
      expect(midiTimestampToAudioTime(rig.performanceTimeAt(t), rig.output.anchor())).toBeCloseTo(
        t,
        9,
      )
    }
    rig.advance(3.2)
    for (const t of times) {
      expect(midiTimestampToAudioTime(rig.performanceTimeAt(t), rig.output.anchor())).toBeCloseTo(
        t,
        9,
      )
    }
  })
})

// @test-link [[rule_playhead_follows_audio_clock]]
describe('the fake rig extra wake-up timers', () => {
  // @test-link [[rule_playhead_follows_audio_clock]]
  it('wakes each started extra timer after the transport timer on every clock step', () => {
    const rig = createFakeAudioRig()
    const order: string[] = []
    const step = (): number => Math.round(rig.now() / 0.025)
    rig.timer.start(() => order.push(`transport@${step()}`))
    const extra = rig.createExtraWakeTimer()
    extra.start(() => order.push(`extra@${step()}`))

    rig.advance(0.05)
    extra.stop()
    rig.advance(0.025)

    expect(order).toEqual(['transport@1', 'extra@1', 'transport@2', 'extra@2', 'transport@3'])
    expect(extra.running()).toBe(false)
    expect(() => extra.stop()).toThrow(/stop while not started/)
  })
})
