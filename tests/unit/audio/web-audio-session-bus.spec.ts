/**
 * A session's Web Audio bus against a recording fake context: which path each click route takes to
 * the speakers, the synthesized click's pitch, envelope and lifetime, and the fade-out on stop that
 * silences one session's bus without touching the next one.
 */

import { describe, expect, it } from 'vitest'

import { createWebAudioOutput } from '@/audio/web-audio-output'
import {
  createFakeWebAudioContext,
  envelopeOf,
  mixNode,
  pathToDestination,
} from './fake-web-audio-context'

/** Intent: a fresh output on a fake context, with its two click-side mix gains found. */
function setUp() {
  const fake = createFakeWebAudioContext()
  const output = createWebAudioOutput(fake.port)
  const clickEnable = mixNode(output, fake, 'click-enable')
  const clickVolume = mixNode(output, fake, 'click-volume')
  return { fake, output, clickEnable, clickVolume }
}

// @test-link [[rule_count_in_always_clicks]]
describe('click routes', () => {
  // @test-link [[rule_count_in_always_clicks]]
  it('sends a count-in click through the click volume but around the click on/off gate', () => {
    const { fake, output, clickEnable, clickVolume } = setUp()
    output.setGain('click-enable', 0, 0)
    output.openSessionBus().scheduleClick({ at: 2, accent: true, route: 'count-in' })

    const path = pathToDestination(fake.oscillators[0]!, fake.destination)
    expect(path).toHaveLength(5)
    expect(path.slice(3)).toEqual([clickVolume, fake.destination])
    expect(path).not.toContain(clickEnable)
  })

  // @test-link [[rule_count_in_always_clicks]]
  // @test-link [[rule_click_track]]
  it('sends a click-track click through the click on/off gate, then the click volume', () => {
    const { fake, output, clickEnable, clickVolume } = setUp()
    output.openSessionBus().scheduleClick({ at: 2, accent: false, route: 'click' })

    const path = pathToDestination(fake.oscillators[0]!, fake.destination)
    expect(path).toHaveLength(6)
    expect(path.slice(3)).toEqual([clickEnable, clickVolume, fake.destination])
  })

  // @test-link [[rule_count_in_always_clicks]]
  it('opens each bus with its two fade gains at 1', () => {
    const { fake, output } = setUp()
    output.openSessionBus()
    expect(fake.gains.slice(4).map((node) => node.gain.value)).toEqual([1, 1])
  })
})

// @test-link [[rule_click_track]]
describe('the synthesized click', () => {
  // @test-link [[rule_click_track]]
  it('sounds an accented click as a 1500 Hz sine peaking at full level', () => {
    const { fake, output } = setUp()
    output.openSessionBus().scheduleClick({ at: 2, accent: true, route: 'click' })

    const oscillator = fake.oscillators[0]!
    const envelope = envelopeOf(fake, oscillator)
    expect(oscillator.type).toBe('sine')
    expect(oscillator.frequency.calls).toEqual([['setValueAtTime', 1500, 2]])
    expect(envelope.gain.calls).toEqual([
      ['setValueAtTime', 0, 2],
      ['linearRampToValueAtTime', 1, 2 + 0.002],
      ['exponentialRampToValueAtTime', 0.0001, 2 + 0.05],
    ])
  })

  // @test-link [[rule_click_track]]
  it('sounds an unaccented click as a 1000 Hz sine peaking at 0.6', () => {
    const { fake, output } = setUp()
    output.openSessionBus().scheduleClick({ at: 3, accent: false, route: 'count-in' })

    const oscillator = fake.oscillators[0]!
    const envelope = envelopeOf(fake, oscillator)
    expect(oscillator.frequency.calls).toEqual([['setValueAtTime', 1000, 3]])
    expect(envelope.gain.calls).toEqual([
      ['setValueAtTime', 0, 3],
      ['linearRampToValueAtTime', 0.6, 3 + 0.002],
      ['exponentialRampToValueAtTime', 0.0001, 3 + 0.05],
    ])
  })

  // @test-link [[rule_click_track]]
  it('starts the click at its time, stops it 60 ms later and unhooks it once it has ended', () => {
    const { fake, output } = setUp()
    output.openSessionBus().scheduleClick({ at: 4, accent: false, route: 'click' })

    const oscillator = fake.oscillators[0]!
    const envelope = envelopeOf(fake, oscillator)
    const fadeNode = envelope.outputs[0]!
    expect(oscillator.startedAt()).toBe(4)
    expect(oscillator.stoppedAt()).toBe(4 + 0.06)
    expect(oscillator.disconnected()).toBe(false)

    oscillator.end()
    expect(oscillator.disconnected()).toBe(true)
    expect(envelope.disconnected()).toBe(true)
    expect(fadeNode.disconnected()).toBe(false)
  })

  // @test-link [[rule_click_track]]
  it('throws on a click time that is not a finite number', () => {
    const { output } = setUp()
    const bus = output.openSessionBus()
    expect(() => bus.scheduleClick({ at: Number.NaN, accent: false, route: 'click' })).toThrow(
      /finite/,
    )
  })
})

// @test-link [[rule_stop_ends_session]]
describe('fading a session out', () => {
  // @test-link [[rule_stop_ends_session]]
  it("ramps both of the bus's fade gains from 1 to silence over the duration", () => {
    const { fake, output } = setUp()
    output.openSessionBus().fadeOut(5, 0.1)

    const fades = fake.gains.slice(4)
    expect(fades).toHaveLength(2)
    for (const fade of fades) {
      expect(fade.gain.calls).toEqual([
        ['cancelScheduledValues', 5],
        ['setValueAtTime', 1, 5],
        ['linearRampToValueAtTime', 0, 5 + 0.1],
      ])
    }
  })

  // @test-link [[rule_stop_ends_session]]
  it('gives a later session fresh fade gains that an earlier fade-out leaves alone', () => {
    const { fake, output } = setUp()
    const first = output.openSessionBus()
    first.scheduleClick({ at: 1, accent: true, route: 'count-in' })
    first.fadeOut(1.5, 0.1)

    const firstFades = fake.gains.slice(4, 6)
    const gainsBefore = fake.gains.length
    const second = output.openSessionBus()
    const secondFades = fake.gains.slice(gainsBefore, gainsBefore + 2)
    second.scheduleClick({ at: 2, accent: true, route: 'count-in' })

    expect(secondFades).toHaveLength(2)
    expect(secondFades.flatMap((node) => node.gain.calls)).toEqual([])
    const secondPath = pathToDestination(fake.oscillators[1]!, fake.destination)
    expect(secondFades).toContain(secondPath[2])
    expect(firstFades).not.toContain(secondPath[2])
  })

  // @test-link [[rule_stop_ends_session]]
  it('throws on a fade time or duration that is not a finite, non-negative number', () => {
    const { output } = setUp()
    const bus = output.openSessionBus()
    expect(() => bus.fadeOut(Number.NaN, 0.1)).toThrow(/finite/)
    expect(() => bus.fadeOut(1, -0.1)).toThrow(/duration/)
  })
})
