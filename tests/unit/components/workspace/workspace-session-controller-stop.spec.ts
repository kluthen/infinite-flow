/**
 * The session controller's Stop, failure and disposal paths, on the fake audio clock at 240 BPM
 * from 5 s: the count-in starts at 5.1 s, and phrase 1 starts sounding at 6.1 s; phrase N starts at
 * 6.1 + 4 (N - 1) s. Stop ends a session in its count-in or while it runs, whatever the locks did;
 * a runner programming error or a failing scheduled event ends it and throws on; dispose ends it
 * and releases the controller's timer and window listener.
 */
import { describe, expect, it } from 'vitest'

import { controllerRig, flush, playTo } from './session-controller-rig'
import { endState, phraseStart } from './session-controller-timeline'

// @test-link [[rule_stop_ends_session]]
describe('session controller: Stop', () => {
  // @test-link [[rule_stop_ends_session]]
  // @test-link [[rule_count_in_ending_returns_to_idle]]
  it('ends a session in its count-in: end sent, audio stopped, locks released, nothing sounded', async () => {
    const rig = controllerRig()
    rig.controller.start()
    await playTo(rig, 5.5)

    rig.controller.stop()

    expect(rig.events.at(-1)).toEqual({ kind: 'end', at: 5.5, cause: 'stop' })
    expect(endState(rig)).toEqual({
      phase: 'idle',
      countIn: null,
      struggling: false,
      tempo: null,
      lastEnd: { cause: 'stop', phase: 'count-in', soundedPhraseCount: 0 },
      records: 0,
      running: false,
      wakeHeld: false,
      orientationHeld: false,
      timerRunning: [false],
    })
    expect(rig.browser.wakeLock.releases()).toBe(1)
    expect(rig.browser.orientationLock.releases()).toBe(1)
    expect(rig.audioRig.events().filter((e) => e.kind === 'fade')).toHaveLength(1)
    expect(rig.controller.state.canStart).toBe(true)
  })

  // @test-link [[rule_stop_ends_session]]
  // @test-link [[rule_phrase_one_is_idle_phrase]]
  it('ends a running session with its sounded phrases recorded and fires nothing after', async () => {
    const rig = controllerRig()
    rig.controller.start()
    await playTo(rig, phraseStart(3) + 0.5)

    rig.controller.stop()
    const eventsAtEnd = rig.events.length
    const outputsAtEnd = rig.outputs.length
    await playTo(rig, phraseStart(6))

    expect(rig.events.length).toBe(eventsAtEnd)
    expect(rig.outputs.length).toBe(outputsAtEnd)
    expect(rig.events.at(-1)).toEqual({ kind: 'end', at: phraseStart(3) + 0.5, cause: 'stop' })
    expect(rig.outputs.at(-1)).toEqual({
      kind: 'ended',
      at: phraseStart(3) + 0.5,
      cause: 'stop',
      phase: 'running',
      soundedPhraseCount: 3,
    })
    expect(endState(rig)).toMatchObject({
      phase: 'idle',
      lastEnd: { cause: 'stop', phase: 'running', soundedPhraseCount: 3 },
      records: 3,
      running: false,
      wakeHeld: false,
      orientationHeld: false,
      timerRunning: [false],
    })
    expect(rig.controller.state.lastHistory?.phrases().map((r) => r.phraseNumber)).toEqual([
      1, 2, 3,
    ])
    expect(rig.controller.state.startBlocker).toBe('review_showing')
  })

  // @test-link [[req_last_session_review]]
  it('allows a start again once the Review is closed', async () => {
    const rig = controllerRig()
    rig.controller.start()
    await playTo(rig, phraseStart(1) + 0.5)
    rig.controller.stop()
    expect(rig.controller.state.canStart).toBe(false)

    rig.controller.closeReview()

    expect(rig.controller.state.canStart).toBe(true)
  })

  // @test-link [[rule_screen_wake_lock_during_session]]
  // @test-link [[rule_landscape_lock_during_session]]
  it('runs and ends the same whether the locks are granted, refused or unsupported', async () => {
    const granted = controllerRig()
    const refused = controllerRig()
    refused.browser.wakeLock.setBehaviour('refuse')
    refused.browser.orientationLock.setBehaviour('unsupported')

    for (const rig of [granted, refused]) {
      rig.controller.start()
      await flush()
      await playTo(rig, phraseStart(2) + 1)
      rig.controller.stop()
    }

    expect(refused.outputs).toEqual(granted.outputs)
    expect(refused.events).toEqual(granted.events)
    expect(endState(refused)).toEqual(endState(granted))
    expect(refused.browser.wakeLock.log()).toEqual(['request', 'refuse', 'release'])
    expect(refused.browser.orientationLock.log()).toEqual(['request', 'unsupported', 'release'])
  })

  // @test-link [[rule_stop_ends_session]]
  it('throws on a Stop with no session running, before or after one', async () => {
    const rig = controllerRig()
    expect(() => rig.controller.stop()).toThrow(/no session/)

    rig.controller.start()
    rig.controller.stop()

    expect(() => rig.controller.stop()).toThrow(/no session/)
    expect(rig.events.filter((event) => event.kind === 'end')).toHaveLength(1)
    await flush()
  })
})

// @test-link [[service_session_controller]]
describe('session controller: failures and disposal', () => {
  // @test-link [[service_session_controller]]
  it('ends the session on a runner programming error and throws that error on', () => {
    const rig = controllerRig()
    rig.controller.start()
    const failure = new Error('fit check exploded')

    expect(() => rig.runnerInputs[0]!.onError(failure)).toThrow(failure)

    expect(rig.controller.state.phase).toBe('idle')
    expect(rig.controller.state.lastEnd).toEqual({
      cause: 'stop',
      phase: 'count-in',
      soundedPhraseCount: 0,
    })
    expect(rig.transport.isRunning()).toBe(false)
    expect(() => rig.runnerInputs[0]!.onError(failure)).toThrow(failure)
    expect(rig.events.filter((event) => event.kind === 'end')).toHaveLength(1)
  })

  // @test-link [[service_session_controller]]
  it('throws a late error from an earlier session on without ending the next one', () => {
    const rig = controllerRig()
    rig.controller.start()
    rig.controller.stop()
    rig.controller.start()
    const late = new Error('late failure')

    expect(() => rig.runnerInputs[0]!.onError(late)).toThrow(late)

    expect(rig.controller.state.phase).toBe('count-in')
    expect(rig.transport.isRunning()).toBe(true)
    rig.controller.stop()
  })

  // @test-link [[service_session_controller]]
  it('ends the session and throws from the wake-up when a scheduled event fails', async () => {
    const rig = controllerRig()
    rig.controller.start()
    await playTo(rig, 6)
    rig.breakDispatchOf('count-in-over')

    expect(() => rig.audioRig.advanceTo(6.2)).toThrow(/count-in-over broken/)

    expect(endState(rig)).toMatchObject({
      phase: 'idle',
      lastEnd: { cause: 'stop', phase: 'count-in', soundedPhraseCount: 0 },
      running: false,
      wakeHeld: false,
      timerRunning: [false],
    })
  })

  // @test-link [[rule_stop_ends_session]]
  it('ends a running session on dispose and stops reading the window', async () => {
    const rig = controllerRig()
    expect(rig.browser.windowShape.listenerCount()).toBe(1)
    rig.controller.start()
    await playTo(rig, 5.3)

    rig.controller.dispose()

    expect(rig.controller.state.lastEnd).toEqual({
      cause: 'stop',
      phase: 'count-in',
      soundedPhraseCount: 0,
    })
    expect(rig.browser.wakeLock.isHeld()).toBe(false)
    expect(rig.browser.windowShape.listenerCount()).toBe(0)
    expect(() => rig.controller.start()).toThrow(/disposed/)
  })

  // @test-link [[service_session_controller]]
  it('disposes its wake-up timer on dispose, with a session running or not, and none if never started', async () => {
    const running = controllerRig()
    running.controller.start()
    await playTo(running, 5.3)
    const ended = controllerRig()
    ended.controller.start()
    ended.controller.stop()
    ended.controller.start()
    ended.controller.stop()
    const unused = controllerRig()

    for (const rig of [running, ended, unused]) rig.controller.dispose()

    expect(running.timers.map((timer) => timer.disposals())).toEqual([1])
    expect(ended.timers.map((timer) => timer.disposals())).toEqual([1])
    expect(unused.timers).toEqual([])
  })
})
