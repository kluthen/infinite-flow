/**
 * The session controller's start, count-in and start-failure paths, on the fake audio clock at
 * 240 BPM from 5 s: the count-in starts at 5.1 s, its beats click every 0.25 s, and phrase 1 starts
 * sounding at 6.1 s. Stop, runner failures and disposal live in
 * `workspace-session-controller-stop.spec.ts`.
 */
import { describe, expect, it, vi } from 'vitest'

import { UNSUPPORTED_RHYTHM_SETTINGS } from '@/domain/controls/unsupported-rhythm-settings'
import type { SessionStartBlocker } from '@/session/session-start-conditions'
import {
  controllerRig,
  outputsOf,
  playTo,
  RIG_FIXED_PARTS,
  type ControllerRig,
} from './session-controller-rig'
import { BEAT, COUNT_IN_ENDS_AT, endState, START_AT } from './session-controller-timeline'

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

// @test-link [[service_session_controller]]
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
      240,
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

// @test-link [[service_session_controller]]
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

  // @test-link [[service_session_controller]]
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

  // @test-link [[service_session_controller]]
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
