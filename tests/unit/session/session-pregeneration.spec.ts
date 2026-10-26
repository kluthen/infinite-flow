/**
 * The session pre-generation plan: it builds phrases 2 to 5 one attempt at a time with the seeds
 * the session seed plan gives each phrase and rung, drawing no seed; it climbs each phrase's
 * failure ladder with no deadline, the standalone rung only after every carry-in rung failed or
 * straight after an exhausted carry-in search; it stops at a phrase whose standalone attempt fails
 * and at four ready phrases; it resumes after the last phrase of an existing ready list; it
 * re-validates a ready list against the window read now; it carries Vary settings and the
 * tension-arc cycle step from phrase to phrase; and its attempts carry the rhythm lock group the
 * session's requests carry, none while the lock is off.
 */

import { describe, expect, it } from 'vitest'

import { mutationFlagFor } from '@/components/workspace/workspace-session-runner'
import { RHYTHM_CHANGE_KINDS, type RhythmChangeKind } from '@/domain/generation/request-rhythm-lock'
import { makeSeed, type Seed } from '@/domain/random/seed'
import { mutationContextAtStart } from '@/session/session-mutation-step'
import {
  createPregenerationPlan,
  revalidatedReadyPhrases,
  type PregenerationAttempt,
  type PregenerationResult,
} from '@/session/session-pregeneration'
import { phraseAttemptSeed } from '@/session/session-seed-plan'
import { measureSeconds } from '@/session/session-timing'
import { SessionEngineError, type SessionSettings } from '@/session/session-types'
import { mutationPhrase } from '@/session/settings-mutation'
import { steppedTensionArc } from '@/session/tension-arc-cycle'
import {
  planSeams,
  planStart,
  plannedReadyPhrases,
  realResult,
  runPlan,
} from './pregeneration-harness'
import { barsOf, expectedGroup, expectedTenser, lockSettings } from './rhythm-lock-sessions'
import {
  DEFAULT_SESSION_SEED,
  SessionDriver,
  sessionSettings,
  withoutRequestIds,
} from './session-harness'

/** Intent: an answer failing every carry-in rung of one phrase with this code, real otherwise. */
function failingCarryIn(
  phraseNumber: number,
  failure: PregenerationResult,
): (attempt: PregenerationAttempt) => PregenerationResult {
  return (attempt) =>
    attempt.phraseNumber === phraseNumber && attempt.step === 'carry-in'
      ? failure
      : realResult(attempt)
}

/** Intent: the real successful outcome of an attempt that succeeded. */
function realOutcome(attempt: PregenerationAttempt): unknown {
  const result = realResult(attempt)
  return result.kind === 'fits' ? result.outcome : undefined
}

/** A search allowance cutoff, a failure every rung retries. */
const CUTOFF: PregenerationResult = { kind: 'generation-failure', code: 'search_limit_exceeded' }

// @test-link [[module_session_pregeneration_plan]]
// @test-link [[req_idle_pregeneration]]
describe('the pre-generation plan', () => {
  // @test-link [[module_session_pregeneration_plan]]
  // @test-link [[module_session_seed_plan]]
  it('plans phrases 2 to 5 with their planned rung seeds, drawing no seed', () => {
    const seams = planSeams()
    const { plan, attempts } = runPlan(createPregenerationPlan(seams, planStart(), []))
    expect(plan.readyPhrases.map((ready) => ready.phraseNumber)).toEqual([2, 3, 4, 5])
    expect(plan.stopped).toBe('four-ready')
    expect(plan.attempt).toBeUndefined()
    expect(attempts[0]).toMatchObject({ phraseNumber: 2, rung: 0, step: 'carry-in' })
    for (const attempt of attempts) {
      expect(attempt.phraseNumber).toBeLessThanOrEqual(5)
      expect(attempt.intent.seed).toBe(
        phraseAttemptSeed(DEFAULT_SESSION_SEED, attempt.phraseNumber, attempt.rung),
      )
    }
    for (const ready of plan.readyPhrases) {
      const last = attempts.filter((attempt) => attempt.phraseNumber === ready.phraseNumber).at(-1)
      expect(ready.rung).toBe(last?.rung)
      expect(ready.intent).toBe(last?.intent)
      expect(ready.outcome).toEqual(realOutcome(last!))
    }
    expect(seams.providers.seedsHandedOut).toEqual([])
  })

  // @test-link [[module_session_pregeneration_plan]]
  // @test-link [[rule_session_generation_failure_ladder]]
  it('climbs every carry-in rung before the standalone one with no deadline, even at 240 BPM', () => {
    const start = planStart({ settings: sessionSettings({ tempo: 240 }) })
    const { plan, attempts } = runPlan(
      createPregenerationPlan(planSeams(), start, []),
      failingCarryIn(2, CUTOFF),
    )
    const phraseTwo = attempts.filter((attempt) => attempt.phraseNumber === 2)
    expect(phraseTwo.map(({ rung, step }) => ({ rung, step }))).toEqual([
      { rung: 0, step: 'carry-in' },
      { rung: 1, step: 'carry-in' },
      { rung: 2, step: 'carry-in' },
      { rung: 3, step: 'carry-in' },
      { rung: 4, step: 'standalone' },
    ])
    expect(phraseTwo.map((attempt) => attempt.intent.requestId)).toEqual(
      [1, 2, 3, 4, 5].map((count) => `session-${count}`),
    )
    expect(plan.readyPhrases[0]).toMatchObject({ phraseNumber: 2, rung: 4 })
  })

  // @test-link [[module_session_pregeneration_plan]]
  // @test-link [[rule_session_generation_failure_ladder]]
  it('goes straight to the standalone rung after an exhausted carry-in search', () => {
    const exhausted: PregenerationResult = {
      kind: 'generation-failure',
      code: 'no_legal_pitch_plan',
    }
    const { attempts } = runPlan(
      createPregenerationPlan(planSeams(), planStart(), []),
      failingCarryIn(2, exhausted),
    )
    const phraseTwo = attempts.filter((attempt) => attempt.phraseNumber === 2)
    expect(phraseTwo.map((attempt) => attempt.rung)).toEqual([0, 4])
    expect(phraseTwo[1]!.intent.requestId).toBe('session-5')
    expect(phraseTwo[1]!.intent.seed).toBe(phraseAttemptSeed(DEFAULT_SESSION_SEED, 2, 4))
  })

  // @test-link [[module_session_pregeneration_plan]]
  it.each([
    { label: 'a crash', failure: { kind: 'crash' } },
    { label: 'a phrase that does not fit', failure: { kind: 'not-fitting' } },
  ] as const)('climbs to the next carry-in rung after $label', ({ failure }) => {
    const plan = createPregenerationPlan(planSeams(), planStart(), [])
    const next = plan.after(failure)
    expect(next.attempt).toMatchObject({ phraseNumber: 2, rung: 1, step: 'carry-in' })
    expect(next.attempt?.intent.requestId).toBe('session-2')
  })

  // @test-link [[module_session_pregeneration_plan]]
  // @test-link [[rule_session_generation_failure_ladder]]
  it('stops at a phrase whose standalone attempt fails, deciding no repeat', () => {
    const { plan, attempts } = runPlan(
      createPregenerationPlan(planSeams(), planStart(), []),
      (attempt) => (attempt.phraseNumber === 3 ? CUTOFF : realResult(attempt)),
    )
    expect(plan.stopped).toBe('ladder-exhausted')
    expect(plan.attempt).toBeUndefined()
    expect(plan.readyPhrases.map((ready) => ready.phraseNumber)).toEqual([2])
    const phraseThree = attempts.filter((attempt) => attempt.phraseNumber === 3)
    expect(phraseThree.map((attempt) => attempt.rung)).toEqual([0, 1, 2, 3, 4])
    expect(attempts.at(-1)?.phraseNumber).toBe(3)
    expect(() => plan.after(CUTOFF)).toThrow(SessionEngineError)
  })
})

// @test-link [[module_session_pregeneration_plan]]
describe('resuming the pre-generation plan', () => {
  // @test-link [[module_session_pregeneration_plan]]
  it('resumes after the last phrase of an existing ready list, drawing no request id for it', () => {
    const start = planStart()
    const full = runPlan(createPregenerationPlan(planSeams(), start, []))
    const seams = planSeams()
    const resumed = createPregenerationPlan(seams, start, full.plan.readyPhrases.slice(0, 2))
    expect(resumed.readyPhrases).toEqual(full.plan.readyPhrases.slice(0, 2))
    const firstOfFour = full.attempts.find((attempt) => attempt.phraseNumber === 4)
    expect(firstOfFour, 'the full plan asked for phrase 4').toBeDefined()
    expect(resumed.attempt).toMatchObject({ phraseNumber: 4, rung: firstOfFour!.rung })
    expect(withoutRequestIds(resumed.attempt!.intent)).toEqual(
      withoutRequestIds(firstOfFour!.intent),
    )
    expect(resumed.attempt!.intent.requestId).toBe('session-1')
    const finished = runPlan(resumed).plan
    expect(finished.readyPhrases.map((ready) => withoutRequestIds(ready.intent))).toEqual(
      full.plan.readyPhrases.map((ready) => withoutRequestIds(ready.intent)),
    )
  })

  // @test-link [[module_session_pregeneration_plan]]
  it('has nothing left to plan when resumed from four ready phrases', () => {
    const start = planStart()
    const ready = plannedReadyPhrases(planSeams(), start)
    const resumed = createPregenerationPlan(planSeams(), start, ready)
    expect(resumed.stopped).toBe('four-ready')
    expect(resumed.attempt).toBeUndefined()
  })

  // @test-link [[module_session_pregeneration_plan]]
  it('refuses to resume from a ready list that no longer re-derives', () => {
    const start = planStart({ settings: sessionSettings({ tempo: 60, noteDensity: 'Sixteenth' }) })
    const ready = plannedReadyPhrases(planSeams(false), start)
    expect(() => createPregenerationPlan(planSeams(true), start, ready)).toThrow(SessionEngineError)
  })
})

// @test-link [[module_session_pregeneration_plan]]
// @test-link [[rule_pregenerated_phrase_matches_session]]
describe('re-validating ready phrases', () => {
  const start = planStart({ settings: sessionSettings({ tempo: 60, noteDensity: 'Sixteenth' }) })

  // @test-link [[module_session_pregeneration_plan]]
  it('keeps every ready phrase while the window is as when they were made, drawing nothing', () => {
    const ready = plannedReadyPhrases(planSeams(false), start)
    expect(ready).toHaveLength(4)
    const seams = planSeams(false)
    expect(revalidatedReadyPhrases(seams, start, ready)).toEqual(ready)
    expect(seams.providers.nextRequestId()).toBe('session-1')
    expect(seams.providers.seedsHandedOut).toEqual([])
  })

  // @test-link [[module_session_pregeneration_plan]]
  it('truncates at the first ready phrase whose density a window crossing changes', () => {
    const seams = planSeams(false)
    let plan = createPregenerationPlan(seams, start, [])
    while (plan.readyPhrases.length < 2) {
      expect(plan.attempt, 'the plan asks for an attempt').toBeDefined()
      plan = plan.after(realResult(plan.attempt!))
    }
    // Phrase 4's first attempt was built wide as phrase 3 became ready; phrase 5's is built narrow.
    seams.viewport.below = true
    const ready = runPlan(plan).plan.readyPhrases
    expect(ready.map((entry) => entry.intent.controls.noteDensity)).toEqual([
      'Sixteenth',
      'Sixteenth',
      'Sixteenth',
      'Eighth',
    ])
    expect(revalidatedReadyPhrases(planSeams(false), start, ready)).toEqual(ready.slice(0, 3))
    expect(revalidatedReadyPhrases(planSeams(true), start, ready)).toEqual([])
  })
})

// @test-link [[module_session_pregeneration_plan]]
// @test-link [[req_settings_mutation_flag]]
// @test-link [[req_multi_phrase_tension_arc]]
describe('Vary settings and Tension across phrases in the plan', () => {
  // @test-link [[module_session_pregeneration_plan]]
  // @test-link [[rule_mutation_lands_on_scheduled_phrase]]
  it('lands the first mutation on its scheduled phrase and keeps it in effect after', () => {
    const base = planStart()
    const context = mutationContextAtStart(base.phraseOne, false)
    const mutation = mutationFlagFor(true, DEFAULT_SESSION_SEED, base.settings, context)
    if (mutation.kind !== 'on') throw new Error('Vary settings is on.')
    const landing = mutationPhrase(mutation.seed, 1)
    const second = mutationPhrase(mutation.seed, 2)
    const start = planStart({ mutation })
    const ready = plannedReadyPhrases(planSeams(), start)
    expect(ready).toHaveLength(4)
    const chosen = start.settings.controls
    for (const entry of ready) {
      const { controls } = entry.intent
      if (entry.phraseNumber < landing) expect(controls).toEqual(chosen)
      else if (entry.phraseNumber < second)
        expect(controls).toEqual(ready[landing - 2]!.intent.controls)
    }
    expect(ready[landing - 2]!.intent.controls).not.toEqual(chosen)
  })

  // @test-link [[module_session_pregeneration_plan]]
  it('generates each phrase with its tension-arc cycle step, the settings in effect untouched', () => {
    const start = planStart({
      settings: sessionSettings({ tempo: 60, tension: 'Lift' }),
      multiPhraseTensionArc: true,
    })
    const ready = plannedReadyPhrases(planSeams(), start)
    expect(ready).toHaveLength(4)
    for (const entry of ready)
      expect(entry.intent.controls).toEqual({
        ...start.settings.controls,
        tension: steppedTensionArc('Lift', entry.phraseNumber),
      })
  })
})

/** One lock case: the allowed changes, whether Tension across phrases runs, the session seed. */
interface PlanLockCase {
  readonly label: string
  readonly allowed: readonly RhythmChangeKind[]
  readonly arc: boolean
  readonly sessionSeed: Seed
}

/** Intent: the session seed of lock case `index`, spread over the 32 bits. */
function lockCaseSeed(index: number): Seed {
  return makeSeed(Math.imul(0x9e37_79b1, index + 1) >>> 0)
}

/** Every change allowed under the arc, none allowed without it, and one kind under the arc. */
const PLAN_LOCK_CASES: readonly PlanLockCase[] = (
  [
    { label: 'every change, arc on', allowed: RHYTHM_CHANGE_KINDS, arc: true },
    { label: 'no change, arc off', allowed: [], arc: false },
    { label: 'one kind, arc on', allowed: ['split_note'], arc: true },
  ] satisfies readonly Omit<PlanLockCase, 'sessionSeed'>[]
).map((lockCase, index) => ({ ...lockCase, sessionSeed: lockCaseSeed(index) }))

/**
 * Intent: drive a session at 60 BPM from the same start as a plan, every attempt answered at once
 * with its real outcome, until phrase 5 is decided; phrases 2 to 5 are requested in turn.
 */
function drivenToPhraseFive(
  settings: SessionSettings,
  arc: boolean,
  sessionSeed: Seed,
): SessionDriver {
  const measure = measureSeconds(60)
  const driver = new SessionDriver({ settings, sessionSeed, multiPhraseTensionArc: arc })
  driver.settle(measure / 2)
  driver.tick(measure)
  driver.countInOver(measure)
  for (let phraseNumber = 2; phraseNumber <= 4; phraseNumber += 1) {
    const at = measure * (1 + 4 * (phraseNumber - 1))
    driver.sounding(at, phraseNumber)
    driver.settle(at + measure / 2)
  }
  return driver
}

/** Intent: an attempt or a request as the comparison reads it: phrase, step and intent. */
function attemptView(attempt: {
  readonly phraseNumber: number
  readonly step: string
  readonly intent: unknown
}): unknown {
  return withoutRequestIds({
    phrase: attempt.phraseNumber,
    step: attempt.step,
    intent: attempt.intent,
  })
}

// @test-link [[module_session_pregeneration_plan]]
// @test-link [[module_session_rhythm_lock]]
// @test-link [[rule_pregenerated_phrase_matches_session]]
describe('the rhythm lock in the plan', () => {
  // @test-link [[module_session_pregeneration_plan]]
  // @test-link [[module_session_rhythm_lock]]
  // @test-link [[rule_pregenerated_phrase_matches_session]]
  it.each(PLAN_LOCK_CASES)(
    "carries phrase 1's bars, the allowed changes and the tenser flags as the session's requests ($label)",
    ({ allowed, arc, sessionSeed }) => {
      const settings = lockSettings(allowed, { tempo: 60, tension: 'Lift' })
      const start = planStart({ settings, sessionSeed, multiPhraseTensionArc: arc })
      const { plan, attempts } = runPlan(createPregenerationPlan(planSeams(), start, []))
      expect(plan.stopped).toBe('four-ready')
      const bars = barsOf(start.phraseOne.outcome)
      for (const attempt of attempts)
        expect(attempt.intent.rhythmLock, `phrase ${attempt.phraseNumber}`).toEqual(
          expectedGroup(bars, allowed, expectedTenser(arc, attempt.phraseNumber, 'Lift')),
        )
      expect(attempts.some((attempt) => attempt.intent.rhythmLock?.tenserPhrase === true)).toBe(arc)
      const driver = drivenToPhraseFive(settings, arc, sessionSeed)
      const requests = driver.requests().filter((request) => request.phraseNumber <= 5)
      expect(requests.map(attemptView)).toEqual(attempts.map(attemptView))
    },
  )

  // @test-link [[module_session_pregeneration_plan]]
  // @test-link [[module_session_rhythm_lock]]
  it('builds no attempt with a rhythm lock group while the lock is off, whatever is allowed', () => {
    const settings = {
      ...sessionSettings({ tempo: 60, tension: 'Lift' }),
      allowedRhythmChanges: RHYTHM_CHANGE_KINDS,
    }
    const start = planStart({ settings, multiPhraseTensionArc: true })
    const { plan, attempts } = runPlan(createPregenerationPlan(planSeams(), start, []))
    expect(plan.readyPhrases).toHaveLength(4)
    for (const attempt of attempts) expect(attempt.intent).not.toHaveProperty('rhythmLock')
  })
})
