/**
 * The look-ahead scheduler on the fake audio clock: on every wake-up it hands its source the next
 * slice of audio time up to a fixed window ahead of the clock, so every click is planned before
 * it is due and never further ahead than the window; halting stops it for good.
 */

import { describe, expect, it } from 'vitest'

import { clicksBetween, createClickPlan } from '@/audio/click-track'
import type { WakeTimer } from '@/audio/audio-ports'
import {
  createLookAheadScheduler,
  LOOK_AHEAD_SECONDS,
  type LookAheadScheduler,
} from '@/audio/look-ahead-scheduler'
import { createFakeAudioRig, type FakeAudioRig } from './fake-audio'

/** A scheduler on a fake rig, plus every wake-up listener it handed the timer. */
interface SchedulerRig {
  readonly rig: FakeAudioRig
  readonly scheduler: LookAheadScheduler
  readonly wakeListeners: (() => void)[]
}

/**
 * Intent: a rig at `startTime` and a scheduler on its clock and timer. The timer is wrapped to
 * keep the listeners it was started with, so a test can deliver a wake-up that arrives after
 * `halt`, as a timer message already in flight would.
 */
function schedulerOn(startTime: number): SchedulerRig {
  const rig = createFakeAudioRig({ startTime })
  const wakeListeners: (() => void)[] = []
  const timer: WakeTimer = {
    start: (onWake) => {
      wakeListeners.push(onWake)
      rig.timer.start(onWake)
    },
    stop: () => rig.timer.stop(),
  }
  const scheduler = createLookAheadScheduler({
    clock: rig.output,
    timer,
    lookAheadSeconds: LOOK_AHEAD_SECONDS,
  })
  return { rig, scheduler, wakeListeners }
}

// @test-link [[rule_playhead_follows_audio_clock]]
describe('look-ahead scheduler', () => {
  it('plans every click ahead of its time and never beyond the window', () => {
    const { rig, scheduler } = schedulerOn(12.3)
    const plan = createClickPlan(12.4, 120)
    const bus = rig.output.openSessionBus()
    scheduler.run((from, to) => clicksBetween(plan, from, to).forEach(bus.scheduleClick))
    rig.advance(18.45)
    const clicks = rig.clicks()
    expect(clicks).toHaveLength(38)
    expect(clicks[0]?.at).toBeCloseTo(12.4, 9)
    expect(clicks[0]?.scheduledAt).toBe(12.3)
    for (const click of clicks) {
      expect(click.at - click.scheduledAt).toBeGreaterThan(0)
      expect(click.at - click.scheduledAt).toBeLessThanOrEqual(LOOK_AHEAD_SECONDS + 1e-9)
    }
  })

  it('hands its source contiguous windows ending a window ahead of the clock', () => {
    const { rig, scheduler } = schedulerOn(0)
    const windows: [number, number][] = []
    scheduler.run((from, to) => windows.push([from, to]))
    rig.advance(1)
    expect(windows[0]).toEqual([0, LOOK_AHEAD_SECONDS])
    for (let i = 1; i < windows.length; i += 1) {
      expect(windows[i]?.[0]).toBe(windows[i - 1]?.[1])
    }
    expect(windows.at(-1)?.[1]).toBeCloseTo(1 + LOOK_AHEAD_SECONDS, 9)
  })

  it('stops scheduling on halt, even when a late wake-up arrives', () => {
    const { rig, scheduler, wakeListeners } = schedulerOn(0)
    let calls = 0
    scheduler.run(() => {
      calls += 1
    })
    rig.advance(0.1)
    expect(calls).toBe(5)
    scheduler.halt()
    expect(scheduler.isRunning()).toBe(false)
    expect(rig.timerRunning()).toBe(false)
    rig.advance(1)
    wakeListeners.forEach((wake) => wake())
    expect(calls).toBe(5)
  })

  it('throws on a second run and on a halt when not running', () => {
    const { scheduler } = schedulerOn(0)
    expect(() => scheduler.halt()).toThrow()
    scheduler.run(() => undefined)
    expect(scheduler.isRunning()).toBe(true)
    expect(() => scheduler.run(() => undefined)).toThrow()
    scheduler.halt()
    scheduler.run(() => undefined)
    expect(scheduler.isRunning()).toBe(true)
  })
})
