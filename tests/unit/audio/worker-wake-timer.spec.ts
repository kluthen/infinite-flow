/**
 * The scheduler's wake-up timer, both halves: the worker-side handler that runs one interval per
 * start, driven by a hand-made fake of the worker's timer functions, and the main-thread timer
 * that talks to the worker, driven by a hand-made fake worker port.
 */

import { describe, expect, it, vi } from 'vitest'

import { WAKE_INTERVAL_SECONDS } from '@/audio/audio-ports'
import {
  createWakeTimerWorkerHandler,
  type WakeTimerCommand,
  type WakeTimerEvent,
} from '@/audio/wake-timer-protocol'
import { createWorkerWakeTimer, type WakeTimerWorkerPort } from '@/audio/worker-wake-timer'

/** Intent: a fake of the worker's interval functions and `postMessage`, recording each call. */
function fakeWorkerScope() {
  const intervals: { readonly callback: () => void; readonly intervalMs: number }[] = []
  const cleared: number[] = []
  const posted: WakeTimerEvent[] = []
  const handle = createWakeTimerWorkerHandler<number>({
    setInterval: (callback, intervalMs) => intervals.push({ callback, intervalMs }) - 1,
    clearInterval: (id) => cleared.push(id),
    post: (event) => posted.push(event),
  })
  return { handle, intervals, cleared, posted }
}

/**
 * Intent: a fake worker port recording what was posted and how often it was terminated, with a
 * way to deliver a message back.
 */
function fakeWakeTimerPort() {
  const posted: WakeTimerCommand[] = []
  const listeners: ((event: MessageEvent<WakeTimerEvent>) => void)[] = []
  let terminations = 0
  const port: WakeTimerWorkerPort = {
    postMessage: (message) => posted.push(message),
    addEventListener: (_type, listener) => listeners.push(listener),
    terminate: () => {
      terminations += 1
    },
  }
  const wake = () => {
    const event = new MessageEvent<WakeTimerEvent>('message', { data: { type: 'wake' } })
    listeners.forEach((listener) => listener(event))
  }
  return { port, posted, wake, terminations: () => terminations }
}

// @test-link [[rule_playhead_follows_audio_clock]]
describe('the wake-up worker', () => {
  // @test-link [[rule_playhead_follows_audio_clock]]
  it('runs one interval per start that posts a wake-up each time it fires', () => {
    const scope = fakeWorkerScope()
    scope.handle({ type: 'start', intervalMs: 25 })

    expect(scope.intervals.map(({ intervalMs }) => intervalMs)).toEqual([25])
    scope.intervals[0]!.callback()
    scope.intervals[0]!.callback()
    expect(scope.posted).toEqual([{ type: 'wake' }, { type: 'wake' }])
  })

  // @test-link [[rule_playhead_follows_audio_clock]]
  it('clears that interval on stop, and can start again afterwards', () => {
    const scope = fakeWorkerScope()
    scope.handle({ type: 'start', intervalMs: 25 })
    scope.handle({ type: 'stop' })
    expect(scope.cleared).toEqual([0])

    scope.handle({ type: 'start', intervalMs: 25 })
    scope.handle({ type: 'stop' })
    expect(scope.cleared).toEqual([0, 1])
  })

  // @test-link [[rule_playhead_follows_audio_clock]]
  it('throws on a second start, and on a stop with nothing started', () => {
    const scope = fakeWorkerScope()
    expect(() => scope.handle({ type: 'stop' })).toThrow(/not started/)
    scope.handle({ type: 'start', intervalMs: 25 })
    expect(() => scope.handle({ type: 'start', intervalMs: 25 })).toThrow(/already started/)
    expect(scope.intervals).toHaveLength(1)
  })

  // @test-link [[rule_playhead_follows_audio_clock]]
  it('throws on a message that is not a wake-timer command', () => {
    const scope = fakeWorkerScope()
    expect(() => scope.handle(null)).toThrow(/command/)
    expect(() => scope.handle({ type: 'pause' })).toThrow(/command/)
    expect(() => scope.handle({ type: 'start', intervalMs: 0 })).toThrow(/interval/)
    expect(() => scope.handle({ type: 'start', intervalMs: Number.NaN })).toThrow(/interval/)
    expect(scope.intervals).toEqual([])
  })
})

// @test-link [[rule_playhead_follows_audio_clock]]
describe('the main-thread wake-up timer', () => {
  // @test-link [[rule_playhead_follows_audio_clock]]
  it('starts the worker at the wake interval and calls back on each wake-up', () => {
    const { port, posted, wake } = fakeWakeTimerPort()
    const timer = createWorkerWakeTimer(port)
    const onWake = vi.fn()

    timer.start(onWake)
    expect(posted).toEqual([{ type: 'start', intervalMs: WAKE_INTERVAL_SECONDS * 1000 }])
    expect(posted).toEqual([{ type: 'start', intervalMs: 25 }])
    wake()
    wake()
    expect(onWake).toHaveBeenCalledTimes(2)
  })

  // @test-link [[rule_playhead_follows_audio_clock]]
  it('stops the worker and ignores a wake-up that arrives late, before and after a restart', () => {
    const { port, posted, wake } = fakeWakeTimerPort()
    const timer = createWorkerWakeTimer(port)
    const first = vi.fn()
    wake()

    timer.start(first)
    timer.stop()
    wake()
    expect(posted).toEqual([{ type: 'start', intervalMs: 25 }, { type: 'stop' }])
    expect(first).not.toHaveBeenCalled()

    const second = vi.fn()
    timer.start(second)
    wake()
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)
  })

  // @test-link [[rule_playhead_follows_audio_clock]]
  it('throws on a second start, and on a stop with nothing started', () => {
    const { port, posted } = fakeWakeTimerPort()
    const timer = createWorkerWakeTimer(port)
    expect(() => timer.stop()).toThrow(/not started/)
    timer.start(() => undefined)
    expect(() => timer.start(() => undefined)).toThrow(/already started/)
    expect(posted).toEqual([{ type: 'start', intervalMs: 25 }])
  })

  // @test-link [[rule_playhead_follows_audio_clock]]
  it('terminates the worker once on dispose, and throws on any use after it or while started', () => {
    const { port, posted, terminations } = fakeWakeTimerPort()
    const timer = createWorkerWakeTimer(port)
    timer.start(() => undefined)
    expect(() => timer.dispose()).toThrow(/still started/)
    timer.stop()

    timer.dispose()

    expect(terminations()).toBe(1)
    expect(() => timer.dispose()).toThrow(/disposed/)
    expect(() => timer.start(() => undefined)).toThrow(/disposed/)
    expect(terminations()).toBe(1)
    expect(posted).toEqual([{ type: 'start', intervalMs: 25 }, { type: 'stop' }])
  })
})
