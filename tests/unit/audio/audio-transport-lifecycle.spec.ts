/**
 * The audio transport's session lifecycle on the fake audio clock and output: stop fades the
 * session's own bus, silencing what was planned past it, and the next session starts on a fresh
 * bus, count-in first; a browser interruption ends a running session and says so; and the same
 * script always gives the same calls.
 */

import { describe, expect, it, vi } from 'vitest'

import { STOP_FADE_SECONDS } from '@/audio/audio-transport'
import type { FakeAudioEvent } from './fake-audio'
import { beat, transportRig } from './transport-rig'

// @test-link [[rule_stop_ends_session]]
describe('stopping', () => {
  it('fades the session bus once, silencing sound planned past the stop', () => {
    const { rig, transport } = transportRig()
    transport.unlock()
    expect(() => transport.stop()).toThrow()
    const { startAt } = transport.start({ tempo: 120 })
    rig.advance(3)
    const stopAt = rig.now()
    expect(transport.stop()).toEqual({ fadeEndsAt: stopAt + STOP_FADE_SECONDS })
    expect(transport.isRunning()).toBe(false)
    expect(rig.timerRunning()).toBe(false)
    expect(() => transport.stop()).toThrow()
    const fades = rig.events().filter((event) => event.kind === 'fade')
    expect(fades).toEqual([
      { kind: 'fade', bus: 1, at: stopAt, duration: STOP_FADE_SECONDS, scheduledAt: stopAt },
    ])
    expect(rig.clicks().some((click) => click.at > stopAt)).toBe(true)
    const audible = rig.audibleClicks()
    expect(audible.map((click) => click.at)).toEqual(
      [0, 1, 2, 3, 4, 5].map((k) => beat(startAt, k)),
    )
    const planned = rig.clicks().length
    rig.advance(1)
    expect(rig.clicks()).toHaveLength(planned)
  })

  it('fades a stop during the count-in the same way, and nothing sounds after it', () => {
    const { rig, transport } = transportRig()
    transport.unlock()
    const { startAt, countInEndsAt } = transport.start({ tempo: 120 })
    rig.advanceTo(beat(startAt, 1.8))
    const stopAt = rig.now()
    expect(stopAt).toBeLessThan(countInEndsAt)
    // Beat 2 is already planned inside the look-ahead window: only the fade can silence it.
    expect(rig.clicks().some((click) => click.at > stopAt)).toBe(true)
    expect(transport.stop()).toEqual({ fadeEndsAt: stopAt + STOP_FADE_SECONDS })
    expect(rig.events().filter((event) => event.kind === 'fade')).toEqual([
      { kind: 'fade', bus: 1, at: stopAt, duration: STOP_FADE_SECONDS, scheduledAt: stopAt },
    ])
    rig.advance(3)
    const audible = rig.audibleClicks()
    expect(audible.map((click) => click.at)).toEqual([0, 1].map((k) => beat(startAt, k)))
    expect(audible.every((click) => click.route === 'count-in')).toBe(true)
  })

  it('starts the next session on a fresh bus, count-in first', () => {
    const { rig, transport } = transportRig()
    transport.unlock()
    transport.start({ tempo: 120 })
    rig.advance(3)
    transport.stop()
    rig.advance(1)
    const { startAt } = transport.start({ tempo: 120 })
    expect(rig.events().filter((event) => event.kind === 'open-bus')).toHaveLength(2)
    rig.advanceTo(beat(startAt, 5.5))
    const second = rig.audibleClicks().filter((click) => click.bus === 2)
    expect(second.map((click) => click.at)).toEqual([0, 1, 2, 3, 4, 5].map((k) => beat(startAt, k)))
    expect(second.map((click) => click.route)).toEqual([
      'count-in',
      'count-in',
      'count-in',
      'count-in',
      'click',
      'click',
    ])
  })
})

// @test-link [[rule_session_never_pauses]]
describe('an interruption of the audio output', () => {
  it('halts the running session and tells the listeners', () => {
    const { rig, transport } = transportRig()
    const listener = vi.fn()
    transport.onInterrupted(listener)
    transport.unlock()
    rig.interrupt()
    expect(listener).not.toHaveBeenCalled()
    transport.start({ tempo: 120 })
    rig.advance(1)
    rig.interrupt()
    expect(listener).toHaveBeenCalledTimes(1)
    expect(transport.isRunning()).toBe(false)
    expect(rig.timerRunning()).toBe(false)
    const planned = rig.clicks().length
    rig.advance(1)
    expect(rig.clicks()).toHaveLength(planned)
    transport.start({ tempo: 120 })
    expect(transport.isRunning()).toBe(true)
  })
})

/** Intent: one fixed script of starts, mix changes and stops, returning every call it made. */
function scriptedEvents(): readonly FakeAudioEvent[] {
  const { rig, transport } = transportRig()
  transport.setClickVolume(0.5)
  transport.unlock()
  transport.start({ tempo: 90 })
  rig.advance(2.37)
  transport.setClickOn(false)
  rig.advance(4.1)
  transport.setBackingVolume(0.3)
  transport.stop()
  rig.advance(0.6)
  transport.start({ tempo: 200 })
  rig.advance(3.3)
  transport.stop()
  return rig.events()
}

// @test-link [[rule_playhead_follows_audio_clock]]
describe('determinism', () => {
  it('gives identical calls for the same script', () => {
    const first = scriptedEvents()
    expect(first.length).toBeGreaterThan(20)
    expect(scriptedEvents()).toEqual(first)
  })
})
