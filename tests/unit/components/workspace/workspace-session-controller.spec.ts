/**
 * The session controller's start, count-in, Stop and failure paths, on the fake audio clock at
 * 240 BPM from 5 s: the count-in starts at 5.1 s, its beats click every 0.25 s, and phrase 1 starts
 * sounding at 6.1 s; phrase N starts at 6.1 + 4 (N - 1) s.
 */
import { describe, expect, it, vi } from 'vitest'

import { UNSUPPORTED_RHYTHM_SETTINGS } from '@/domain/controls/unsupported-rhythm-settings'
import type { SessionStartBlocker } from '@/session/session-start-conditions'
import {
  controllerRig,
  flush,
  outputsOf,
  playTo,
  RIG_FIXED_PARTS,
  type ControllerRig,
} from './session-controller-rig'

const START_AT = 5.1
const BEAT = 0.25
const COUNT_IN_ENDS_AT = 6.1

/** Intent: the time phrase `n` starts sounding. */
function phraseStart(n: number): number {
  return COUNT_IN_ENDS_AT + (n - 1) * 4
}

/** One sample of a start condition that does not hold. */
interface BlockerSample {
  readonly name: string
  readonly blocker: SessionStartBlocker
  readonly apply: (rig: ControllerRig) => void
}

const BLOCKER_SAMPLES: readonly BlockerSample[] = [
  { name: 'no phrase', blocker: 'no_phrase', apply: (rig) => (rig.idle.result = null) },
  {
    name: 'a phrase not engraved yet',
    blocker: 'no_phrase',
    apply: (rig) => (rig.idle.resultEngraved = false),
  },
  {
    name: 'a generation running',
    blocker: 'generation_running',
    apply: (rig) => (rig.idle.operation = 'generating'),
  },
  {
    name: 'fit retries running',
    blocker: 'generation_running',
    apply: (rig) => (rig.idle.retriesRunning = true),
  },
  {
    name: 'a notation error',
    blocker: 'notation_error',
    apply: (rig) => (rig.idle.notationError = new Error('engraving failed')),
  },
  {
    name: 'a generation failure banner',
    blocker: 'generation_failure',
    apply: (rig) => (rig.idle.generationError = new Error('generation failed')),
  },
  {
    name: 'an unsupported rhythm combination',
    blocker: 'rhythm_unsupported',
    apply: (rig) =>
      (rig.idle.controls = { ...rig.idle.controls, ...UNSUPPORTED_RHYTHM_SETTINGS[0] }),
  },
  {
    name: 'a portrait-shaped window below bp-desktop',
    blocker: 'orientation_notice',
    apply: (rig) =>
      rig.browser.windowShape.resize({ widthPx: 800, smallHeightPx: 1200, remPx: 16 }),
  },
  {
    name: 'the room notice',
    blocker: 'room_notice',
    apply: (rig) => (rig.idle.roomNotice = 'no_room'),
  },
]

/** Intent: what a session left behind once it ended, for comparing two runs. */
function endState(rig: ControllerRig): unknown {
  return {
    phase: rig.controller.state.phase,
    countIn: rig.controller.state.countIn,
    struggling: rig.controller.state.strugglingNotice,
    tempo: rig.controller.state.sessionTempo,
    lastEnd: rig.controller.state.lastEnd,
    records: rig.controller.state.lastHistory?.phraseCount,
    running: rig.transport.isRunning(),
    wakeHeld: rig.browser.wakeLock.isHeld(),
    orientationHeld: rig.browser.orientationLock.isHeld(),
    timerRunning: rig.timers.map((timer) => timer.running()),
  }
}

// @test-link [[service_workspace_session_flow]]
// @test-link [[rule_session_start_conditions]]
describe('session controller: start', () => {
  // @test-link [[rule_audio_unlocked_by_player_click]]
  // @test-link [[rule_screen_wake_lock_during_session]]
  // @test-link [[rule_landscape_lock_during_session]]
  it('unlocks audio, asks for both locks, starts the transport and queues phrase 1, in order, synchronously', () => {
    const rig = controllerRig()
    const unlock = vi.spyOn(rig.transport, 'unlock')
    const request = vi.spyOn(rig.browser.wakeLock, 'request')
    const lock = vi.spyOn(rig.browser.orientationLock, 'lock')
    const start = vi.spyOn(rig.transport, 'start')
    const queueBacking = vi.spyOn(rig.transport, 'queueBacking')
    expect(rig.controller.state.canStart).toBe(true)

    rig.controller.start()

    const order = [unlock, request, lock, start, queueBacking].map(
      (spy) => spy.mock.invocationCallOrder[0] ?? Number.NaN,
    )
    expect(order).toEqual([...order].sort((a, b) => a - b))
    expect(start).toHaveBeenCalledExactlyOnceWith({ tempo: 240 })
    expect(queueBacking).toHaveBeenCalledExactlyOnceWith(
      1,
      rig.phraseOne.outcome.provenance.harmony.events,
    )
    expect(rig.controller.state.phase).toBe('count-in')
    expect(rig.controller.state.sessionTempo).toBe(240)
    expect(rig.controller.state.canStart).toBe(false)
    expect(rig.controller.state.startBlocker).toBe('session_active')
  })

  // @test-link [[rule_session_settings_locked]]
  it('starts the runner from the count-in start, the current settings and the Idle phrase', () => {
    const rig = controllerRig()

    rig.controller.start()

    expect(rig.runnerInputs).toHaveLength(1)
    const { start } = rig.runnerInputs[0]!
    expect(start.at).toBe(START_AT)
    expect(start.settings).toEqual(rig.settings)
    expect(start.phraseOne).toEqual({
      intent: rig.phraseOne.intent,
      outcome: rig.phraseOne.outcome,
    })
  })

  for (const sample of BLOCKER_SAMPLES) {
    // @test-link [[rule_session_start_conditions]]
    it(`throws and touches nothing when blocked by ${sample.name}`, () => {
      const rig = controllerRig()
      const unlock = vi.spyOn(rig.transport, 'unlock')
      sample.apply(rig)

      expect(rig.controller.state.startBlocker).toBe(sample.blocker)
      expect(rig.controller.state.canStart).toBe(false)
      expect(() => rig.controller.start()).toThrow(/cannot start/)
      expect(unlock).not.toHaveBeenCalled()
      expect(rig.browser.wakeLock.requests()).toBe(0)
      expect(rig.browser.orientationLock.requests()).toBe(0)
      expect(rig.runnerInputs).toHaveLength(0)
    })
  }

  // @test-link [[rule_session_start_conditions]]
  it('throws on a second start while a session runs', () => {
    const rig = controllerRig()
    rig.controller.start()

    expect(() => rig.controller.start()).toThrow(/cannot start: session_active/)
    expect(rig.runnerInputs).toHaveLength(1)
  })
})

// @test-link [[rule_count_in_shown_on_screen]]
describe('session controller: the count-in', () => {
  // @test-link [[rule_count_in_shown_on_screen]]
  it('steps the display beat by beat on the audio clock, then empties it as phrase 1 sounds', async () => {
    const rig = controllerRig()
    rig.controller.start()
    expect(rig.controller.state.countIn?.beats).toEqual(['muted', 'muted', 'muted', 'muted'])

    const shown: unknown[] = []
    for (let k = 0; k < 4; k += 1) {
      await playTo(rig, START_AT + k * BEAT - 0.01)
      shown.push(rig.controller.state.countIn?.beats)
      await playTo(rig, START_AT + k * BEAT)
      shown.push(rig.controller.state.countIn?.beats)
    }

    expect(shown).toEqual([
      ['muted', 'muted', 'muted', 'muted'],
      ['current', 'muted', 'muted', 'muted'],
      ['current', 'muted', 'muted', 'muted'],
      ['past', 'current', 'muted', 'muted'],
      ['past', 'current', 'muted', 'muted'],
      ['past', 'past', 'current', 'muted'],
      ['past', 'past', 'current', 'muted'],
      ['past', 'past', 'past', 'current'],
    ])
    expect(rig.controller.state.phase).toBe('count-in')
    expect(rig.events).toEqual([])

    await playTo(rig, COUNT_IN_ENDS_AT)
    expect(rig.controller.state.countIn).toBeNull()
    expect(rig.controller.state.phase).toBe('running')
    expect(rig.events).toEqual([
      { kind: 'count-in-over', at: COUNT_IN_ENDS_AT },
      { kind: 'tick', at: COUNT_IN_ENDS_AT },
    ])
    expect(outputsOf(rig, 'phrase-sounding').map((o) => o.phrase.phraseNumber)).toEqual([1])
  })
})

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

// @test-link [[service_workspace_session_flow]]
describe('session controller: failures and disposal', () => {
  // @test-link [[service_workspace_session_flow]]
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

  // @test-link [[service_workspace_session_flow]]
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

  // @test-link [[service_workspace_session_flow]]
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

  // @test-link [[service_workspace_session_flow]]
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

// @test-link [[service_workspace_session_flow]]
// @test-link [[rule_screen_wake_lock_during_session]]
// @test-link [[rule_landscape_lock_during_session]]
describe('session controller: a start that fails part-way', () => {
  /** Intent: assert the failed start left nothing behind: Idle, silent, both locks given back. */
  function expectNothingHeld(rig: ControllerRig): void {
    expect(endState(rig)).toMatchObject({
      phase: 'idle',
      countIn: null,
      tempo: null,
      lastEnd: null,
      running: false,
      wakeHeld: false,
      orientationHeld: false,
    })
    expect(rig.controller.state.heldLayout).toBeNull()
    expect(rig.timers.every((timer) => !timer.running())).toBe(true)
    expect(rig.browser.wakeLock.releases()).toBe(rig.browser.wakeLock.requests())
    expect(rig.browser.orientationLock.releases()).toBe(rig.browser.orientationLock.requests())
    expect(rig.controller.state.canStart).toBe(true)
  }

  // @test-link [[service_workspace_session_flow]]
  // @test-link [[rule_screen_wake_lock_during_session]]
  // @test-link [[rule_landscape_lock_during_session]]
  it("undoes the start and throws on when phrase 1's backing fails to queue; a later start works", async () => {
    const rig = controllerRig()
    const failure = new Error('queueBacking exploded')
    vi.spyOn(rig.transport, 'queueBacking').mockImplementationOnce(() => {
      throw failure
    })

    expect(() => rig.controller.start()).toThrow(failure)

    expectNothingHeld(rig)
    expect(rig.browser.wakeLock.releases()).toBe(1)
    expect(rig.browser.orientationLock.releases()).toBe(1)
    expect(rig.audioRig.events().filter((e) => e.kind === 'fade')).toHaveLength(1)
    rig.controller.start()
    await playTo(rig, COUNT_IN_ENDS_AT)
    expect(rig.controller.state.phase).toBe('running')
    rig.controller.stop()
    expect(rig.controller.state.lastEnd?.phase).toBe('running')
  })

  // @test-link [[service_workspace_session_flow]]
  it('undoes the start, ending its runner, when the end watchers fail to start; a later start works', async () => {
    let measures = 0
    const failure = new Error('fixed parts exploded')
    const rig = controllerRig(undefined, () => {
      measures += 1
      if (measures === 1) throw failure
      return Promise.resolve(RIG_FIXED_PARTS)
    })

    expect(() => rig.controller.start()).toThrow(failure)

    expectNothingHeld(rig)
    expect(rig.events).toEqual([{ kind: 'end', at: START_AT, cause: 'stop' }])
    const outputsAtFailure = rig.outputs.length
    await playTo(rig, 5.05)
    expect(rig.outputs.length).toBe(outputsAtFailure)
    rig.controller.start()
    await playTo(rig, COUNT_IN_ENDS_AT + 0.1)
    expect(rig.controller.state.phase).toBe('running')
    rig.controller.stop()
  })
})
