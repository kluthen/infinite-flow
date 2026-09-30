/**
 * The Web Audio output against a recording fake context: the four mix gains and their wiring, how
 * a gain change is scheduled, the audio clock readings, the interruption notice, that nothing
 * ever suspends or closes the context, and how the one real context is opened.
 */

import { afterEach, describe, expect, it, vi } from 'vitest'

import { createWebAudioOutput, openWebAudioOutput } from '@/audio/web-audio-output'
import {
  createFakeWebAudioContext,
  mixNode,
  pathToDestination,
  type FakeWebAudioContext,
} from './fake-web-audio-context'

// @test-link [[req_session_audio_mix]]
describe('the mix gains', () => {
  // @test-link [[req_session_audio_mix]]
  it('wires each enable gain into its volume gain, and each volume gain into the speakers', () => {
    const fake = createFakeWebAudioContext()
    const output = createWebAudioOutput(fake.port)
    const clickEnable = mixNode(output, fake, 'click-enable')
    const clickVolume = mixNode(output, fake, 'click-volume')
    const backingEnable = mixNode(output, fake, 'backing-enable')
    const backingVolume = mixNode(output, fake, 'backing-volume')

    expect(fake.gains).toHaveLength(4)
    expect(pathToDestination(clickEnable, fake.destination)).toEqual([
      clickEnable,
      clickVolume,
      fake.destination,
    ])
    expect(pathToDestination(backingEnable, fake.destination)).toEqual([
      backingEnable,
      backingVolume,
      fake.destination,
    ])
  })

  // @test-link [[req_session_audio_mix]]
  it('starts all four gains at 1', () => {
    const fake = createFakeWebAudioContext()
    createWebAudioOutput(fake.port)
    expect(fake.gains.map((node) => node.gain.value)).toEqual([1, 1, 1, 1])
  })

  // @test-link [[req_session_audio_mix]]
  it('sets a gain by cancelling what was planned from that time, then setting the value', () => {
    const fake = createFakeWebAudioContext()
    const output = createWebAudioOutput(fake.port)
    const clickVolume = mixNode(output, fake, 'click-volume')

    output.setGain('click-volume', 0.4, 3.5)

    expect(clickVolume.gain.calls).toEqual([
      ['cancelScheduledValues', 3.5],
      ['setValueAtTime', 0.4, 3.5],
    ])
    const others = fake.gains.filter((node) => node !== clickVolume)
    expect(others.flatMap((node) => node.gain.calls)).toEqual([])
  })

  // @test-link [[req_session_audio_mix]]
  it('throws on a gain value or time that is not a finite number', () => {
    const output = createWebAudioOutput(createFakeWebAudioContext().port)
    expect(() => output.setGain('backing-enable', Number.NaN, 1)).toThrow(/finite/)
    expect(() => output.setGain('backing-enable', 1, Number.POSITIVE_INFINITY)).toThrow(/finite/)
  })
})

// @test-link [[rule_playhead_follows_audio_clock]]
describe('the audio clock', () => {
  // @test-link [[rule_playhead_follows_audio_clock]]
  it("reads the time and the output latency from the audio context's own clock", () => {
    const fake = createFakeWebAudioContext()
    const output = createWebAudioOutput(fake.port)
    fake.setCurrentTime(12.5)
    fake.setOutputLatency(0.035)
    expect(output.now()).toBe(12.5)
    expect(output.outputLatency()).toBe(0.035)
  })

  // @test-link [[rule_playhead_follows_audio_clock]]
  it('throws when the browser reports no finite output latency', () => {
    const fake = createFakeWebAudioContext()
    const output = createWebAudioOutput(fake.port)
    fake.setOutputLatency(Number.NaN)
    expect(() => output.outputLatency()).toThrow(/output latency/)
  })

  // @test-link [[rule_playhead_follows_audio_clock]]
  it('tells every listener when the browser stops a running clock, and only then', () => {
    const fake = createFakeWebAudioContext('suspended')
    const output = createWebAudioOutput(fake.port)
    const first = vi.fn()
    const second = vi.fn()
    output.onInterrupted(first)
    output.onInterrupted(second)

    fake.changeState('suspended')
    fake.changeState('running')
    expect(first).not.toHaveBeenCalled()

    fake.changeState('suspended')
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)

    fake.changeState('closed')
    expect(first).toHaveBeenCalledTimes(1)
  })

  // @test-link [[rule_playhead_follows_audio_clock]]
  it('counts a context that was already running when the output was made', () => {
    const fake = createFakeWebAudioContext('running')
    const output = createWebAudioOutput(fake.port)
    const listener = vi.fn()
    output.onInterrupted(listener)
    fake.changeState('interrupted')
    expect(listener).toHaveBeenCalledTimes(1)
  })
})

// @test-link [[rule_session_never_pauses]]
describe('the clock never stops', () => {
  // @test-link [[rule_session_never_pauses]]
  it('never reaches for suspend or close on the audio context, and offers no pause', () => {
    const fake = createFakeWebAudioContext()
    const output = createWebAudioOutput(fake.port)
    output.onInterrupted(() => undefined)
    output.setGain('click-enable', 0, 1)
    output.setGain('backing-enable', 0, 1)
    const bus = output.openSessionBus()
    bus.scheduleClick({ at: 2, accent: true, route: 'count-in' })
    bus.fadeOut(2.5, 0.1)
    fake.oscillators.forEach((oscillator) => oscillator.end())
    output.now()
    output.outputLatency()
    fake.changeState('suspended')

    expect(fake.accessedMembers).not.toContain('suspend')
    expect(fake.accessedMembers).not.toContain('close')
    expect(Object.keys(output).filter((name) => /suspend|close|pause/i.test(name))).toEqual([])
  })
})

// @test-link [[rule_audio_unlocked_by_player_click]]
describe('opening the one audio context', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  /** Intent: stub the browser's audio context constructor to hand back `fake`, recording options. */
  function stubContext(fake: FakeWebAudioContext): unknown[] {
    const options: unknown[] = []
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor(contextOptions: unknown) {
          options.push(contextOptions)
          return fake.port
        }
      },
    )
    return options
  }

  // @test-link [[rule_audio_unlocked_by_player_click]]
  it('asks for an interactive-latency context and resumes it when the browser holds it suspended', () => {
    const fake = createFakeWebAudioContext('suspended')
    const options = stubContext(fake)
    const output = openWebAudioOutput()
    expect(options).toEqual([{ latencyHint: 'interactive' }])
    expect(fake.resumeCalls()).toBe(1)
    expect(output.now()).toBe(0)
  })

  // @test-link [[rule_audio_unlocked_by_player_click]]
  it('does not resume a context that is already running', () => {
    const fake = createFakeWebAudioContext('running')
    stubContext(fake)
    openWebAudioOutput()
    expect(fake.resumeCalls()).toBe(0)
  })
})
