/**
 * The Idle pre-generation queue's orchestrator, over a hand-driven Idle state and generate seam:
 * it runs phrases 2 to 5 one background attempt at a time while every start condition holds, each
 * with its own abort signal in the background slot; it yields to the player through the slot; it
 * stops while a start condition fails (a review showing) and resumes after the last ready phrase;
 * it climbs the failure ladder on failures and crashes, and stops for good on a programming error;
 * Start's take aborts the attempt in flight and gives the ready prefix that fits; the disabled
 * policy never runs; dispose aborts.
 */
import { describe, expect, it } from 'vitest'

import {
  GenerationWorkerCrashError,
  GenerationWorkerTransportError,
} from '@/generation-worker/generation-worker-client'
import { failureOutcome, realOutcomeFor } from '../../session/session-harness'
import {
  answer,
  answerAll,
  flush,
  inFlight,
  pregenerationRig,
  takenNumbers,
  type PregenerationRig,
} from './pregeneration-rig'

/** Intent: the phrase and carry-in source of the attempt in flight. */
function inFlightPlace(rig: PregenerationRig): { phrase: number | undefined; standalone: boolean } {
  const { carryIn } = inFlight(rig).intent
  return { phrase: carryIn?.phraseNumber, standalone: carryIn === undefined }
}

// @test-link [[module_idle_pregeneration_queue]]
describe('Idle pre-generation queue: running', () => {
  // @test-link [[module_idle_pregeneration_queue]]
  // @test-link [[module_session_ready_phrases]]
  it('runs phrases 2 to 5 one background attempt at a time, each with its own signal, then stops', async () => {
    const rig = pregenerationRig()
    await flush()

    for (let phrase = 2; phrase <= 5; phrase += 1) {
      expect(rig.calls.filter((call) => !call.settled)).toHaveLength(1)
      expect(inFlightPlace(rig).phrase).toBe(phrase - 1)
      expect(rig.idle.operation).toBe('idle')
      await answer(rig)
    }

    expect(rig.calls).toHaveLength(4)
    expect(new Set(rig.calls.map((call) => call.signal)).size).toBe(4)
    expect(rig.calls.every((call) => call.signal instanceof AbortSignal)).toBe(true)
    expect(rig.planner.plans.map((plan) => plan.viewport.layout)).toEqual(
      Array(4).fill('one-system'),
    )
    expect(takenNumbers(rig)).toEqual([2, 3, 4, 5])
    expect(rig.failures).toEqual([])
  })

  // @test-link [[module_idle_pregeneration_queue]]
  it('never runs a background attempt under the disabled policy, and Start takes nothing', async () => {
    const rig = pregenerationRig({ policy: 'disabled' })
    rig.blocker.value = 'review_showing'
    await flush()
    rig.blocker.value = null
    await flush()

    expect(rig.calls).toEqual([])
    expect(takenNumbers(rig)).toEqual([])
  })

  // @test-link [[module_idle_pregeneration_queue]]
  it('runs nothing while a start condition fails, and starts once they all hold', async () => {
    const rig = pregenerationRig({ blocker: 'no_phrase' })
    await flush()
    expect(rig.calls).toEqual([])

    rig.blocker.value = null
    await flush()

    expect(inFlightPlace(rig).phrase).toBe(1)
  })

  // @test-link [[module_idle_pregeneration_queue]]
  it('stops while a review shows, keeping the ready phrases, and resumes after the last one', async () => {
    const rig = pregenerationRig()
    await answer(rig)
    const phraseThree = inFlight(rig)

    rig.blocker.value = 'review_showing'
    await flush()
    expect(phraseThree.signal.aborted).toBe(true)
    expect(rig.calls.filter((call) => !call.settled)).toEqual([])

    rig.blocker.value = null
    await flush()
    expect(inFlightPlace(rig).phrase).toBe(2)
    await answerAll(rig)
    expect(takenNumbers(rig)).toEqual([2, 3, 4, 5])
  })

  // @test-link [[module_idle_pregeneration_queue]]
  // @test-link [[module_session_pregeneration_plan]]
  it('climbs the ladder on a worker crash, a failed generation and a phrase that does not fit', async () => {
    const rig = pregenerationRig()
    await flush()
    inFlight(rig).reject(new GenerationWorkerCrashError('RangeError', 'boom'))
    await flush()
    inFlight(rig).reject(new GenerationWorkerTransportError('worker gone'))
    await flush()
    rig.planner.queue({ kind: 'notes_too_wide' })
    await answer(rig)
    inFlight(rig).resolve(failureOutcome('no_legal_pitch_plan'))
    await flush()

    expect(inFlightPlace(rig).standalone).toBe(true)
    expect(rig.calls.slice(0, 4).every((call) => call.intent.carryIn?.phraseNumber === 1)).toBe(
      true,
    )
    expect(new Set(rig.calls.map((call) => call.intent.seed)).size).toBe(5)
    await answer(rig)
    expect(inFlightPlace(rig).phrase).toBe(2)
    expect(rig.failures).toEqual([])
  })

  // @test-link [[module_idle_pregeneration_queue]]
  // @test-link [[module_session_pregeneration_plan]]
  it('stops at a phrase whose ladder is exhausted and does not retry it when the conditions return', async () => {
    const rig = pregenerationRig()
    await flush()
    for (let attempt = 0; attempt < 5; attempt += 1) {
      inFlight(rig).resolve(failureOutcome())
      await flush()
    }
    expect(rig.calls).toHaveLength(5)
    expect(rig.calls.some((call) => !call.settled)).toBe(false)

    rig.blocker.value = 'generation_running'
    await flush()
    rig.blocker.value = null
    await flush()

    expect(rig.calls).toHaveLength(5)
    expect(takenNumbers(rig)).toEqual([])
  })

  // @test-link [[module_idle_pregeneration_queue]]
  it('reports any other rejection and stops, taking nothing, until the queue key changes', async () => {
    const rig = pregenerationRig()
    await answer(rig)
    const defect = new TypeError('a programming error')

    inFlight(rig).reject(defect)
    await flush()
    rig.blocker.value = 'review_showing'
    await flush()
    rig.blocker.value = null
    await flush()

    expect(rig.failures).toEqual([defect])
    expect(rig.calls).toHaveLength(2)
    expect(takenNumbers(rig)).toEqual([])
    rig.tensionAcrossPhrases.value = true
    await flush()
    expect(inFlight(rig).intent.carryIn?.phraseNumber).toBe(1)
  })

  // @test-link [[module_idle_pregeneration_queue]]
  it('aborts the attempt in flight at dispose and never runs again', async () => {
    const rig = pregenerationRig()
    await flush()
    const call = inFlight(rig)

    rig.queue.dispose()
    rig.blocker.value = 'review_showing'
    await flush()
    rig.blocker.value = null
    await flush()

    expect(call.signal.aborted).toBe(true)
    expect(rig.calls).toHaveLength(1)
    expect(() => rig.queue.dispose()).toThrow(/disposed twice/)
    expect(() => rig.queue.take('one-system')).toThrow(/disposed/)
  })
})

// @test-link [[rule_pregeneration_yields_to_player]]
describe('Idle pre-generation queue: yielding to the player', () => {
  // @test-link [[rule_pregeneration_yields_to_player]]
  // @test-link [[module_idle_pregeneration_queue]]
  it('aborts the attempt in flight when the player yields, and drops its late result', async () => {
    const rig = pregenerationRig({ rejectOnAbort: false })
    await answer(rig)
    const phraseThree = inFlight(rig)

    rig.slot.yieldToPlayer()
    expect(phraseThree.signal.aborted).toBe(true)
    phraseThree.resolve(realOutcomeFor(phraseThree.intent))
    await flush()

    expect(rig.calls).toHaveLength(2)
    rig.slot.yieldToPlayer()
    rig.blocker.value = 'generation_running'
    await flush()
    rig.blocker.value = null
    await flush()
    expect(rig.calls).toHaveLength(3)
    expect(rig.calls[2]!.intent.carryIn?.phraseNumber).toBe(2)
    expect(rig.calls[2]!.intent.seed).toBe(phraseThree.intent.seed)
  })
})

// @test-link [[rule_start_never_waits_for_pregeneration]]
describe("Idle pre-generation queue: Start's take", () => {
  // @test-link [[rule_start_never_waits_for_pregeneration]]
  // @test-link [[module_session_ready_phrases]]
  it('aborts the attempt in flight and gives the ready prefix that fits the held layout', async () => {
    const rig = pregenerationRig()
    await answer(rig)
    await answer(rig)
    const phraseFour = inFlight(rig)
    rig.planner.queue({ kind: 'fits' }, { kind: 'notes_too_wide' })
    const plansBefore = rig.planner.plans.length

    const taken = rig.queue.take('split')

    expect(phraseFour.signal.aborted).toBe(true)
    expect(taken.map((ready) => ready.phraseNumber)).toEqual([2])
    expect(rig.planner.plans.slice(plansBefore).map((plan) => plan.viewport.layout)).toEqual([
      'split',
      'split',
    ])
  })

  // @test-link [[rule_start_never_waits_for_pregeneration]]
  it('keeps the queue, so a count-in that ends back at Idle reuses it and tops it up', async () => {
    const rig = pregenerationRig()
    await answer(rig)
    await answer(rig)
    expect(rig.queue.take('one-system').map((ready) => ready.phraseNumber)).toEqual([2, 3])

    rig.blocker.value = 'session_active'
    await flush()
    expect(rig.calls).toHaveLength(3)
    rig.blocker.value = null
    await flush()

    expect(inFlightPlace(rig).phrase).toBe(3)
    await answerAll(rig)
    expect(takenNumbers(rig)).toEqual([2, 3, 4, 5])
  })

  // @test-link [[rule_start_never_waits_for_pregeneration]]
  it('gives nothing before any phrase is ready, without waiting for the attempt in flight', async () => {
    const rig = pregenerationRig()
    await flush()
    const phraseTwo = inFlight(rig)

    expect(rig.queue.take('one-system')).toEqual([])
    expect(phraseTwo.signal.aborted).toBe(true)
  })
})
