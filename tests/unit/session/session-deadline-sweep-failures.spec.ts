// @vitest-environment node
/**
 * The look-ahead deadline sweep with injected generation failures: over a deterministic slice of
 * the sweep's cases (see deadline-sweep.ts) at 60, 120 and 240 BPM, on the fake clock with every
 * attempt costing its modelled time, a failed attempt or a rejected request on a phrase's first
 * try is recovered by the next carry-in retry, carry-in attempts failing to the end of their rungs
 * give way to the standalone retry, attempts failing until the deadline give way to a repeat
 * decided at the deadline, and two consecutive repeats show the struggling notice until a newly
 * generated phrase starts sounding. Carry-in attempts too slow for the deadline, or that never
 * answer, are cut over to the standalone attempt at the cutover time and cancelled, the generator
 * restarting before the standalone attempt starts; a standalone attempt that never answers is
 * cancelled at the deadline, where the phrase before repeats. In every run the session keeps
 * running to its planned end with every phrase slot filled by its deadline.
 */

import { describe, expect, it } from 'vitest'

import { WORKER_RESPAWN_SECONDS, cutoverAt } from '@/session/session-timing'
import { SEEDS } from '../domain/generation/carry-in/carry-in-matrix'
import { settingKey } from '../domain/generation/orchestration/cold-generation-golden/cold-generation-golden-fixture'
import {
  ATTEMPT_COST_SECONDS,
  NON_RHYTHM_DIMENSIONS,
  OutcomeCache,
  SWEEP_TEMPOS,
  noticeChanges,
  phraseSlots,
  runTimedSession,
  sessionBreaks,
  soundingAt,
  supportedRhythmSettings,
  sweepCases,
  type AttemptCost,
  type AttemptScript,
  type GeneratorRecord,
  type SweepCase,
  type TimedSession,
} from './deadline-sweep'
import { phraseProductions, type PhraseProduction } from './deadline-sweep-productions'

/** Every this-many-th case of the sweep is in the injected-failure slice. */
const SLICE_STEP = 24

/** The injected-failure slice: every `SLICE_STEP`-th sweep case from the first. */
const SLICE: readonly SweepCase[] = sweepCases().filter((_, index) => index % SLICE_STEP === 0)

/** The real outcomes the slice generates, shared across its scripts and tempos. */
const outcomes = new OutcomeCache()

/** Intent: phrase 3's first attempt finds no phrase and phrase 4's first request is rejected. */
const ONE_FAILURE_EACH: AttemptScript = (request) => {
  if (request.retry !== 0) return 'generate'
  if (request.phraseNumber === 3) return 'fail'
  return request.phraseNumber === 4 ? 'crash' : 'generate'
}

/** Intent: every carry-in attempt of phrase 3 fails; its standalone retry generates. */
const CARRY_IN_EXHAUSTED: AttemptScript = (request) =>
  request.phraseNumber === 3 && request.step === 'carry-in' ? 'fail' : 'generate'

/** Intent: every attempt of phrase 2 fails, so nothing valid exists at its deadline. */
const NOTHING_BY_PHRASE_TWO_DEADLINE: AttemptScript = (request) =>
  request.phraseNumber === 2 ? 'fail' : 'generate'

/** Intent: every attempt of phrases 3 and 4 fails or is rejected: two repeats in a row. */
const TWO_REPEATS_IN_A_ROW: AttemptScript = (request) => {
  if (request.phraseNumber === 3) return 'fail'
  return request.phraseNumber === 4 ? 'crash' : 'generate'
}

/** Intent: every attempt generates; only the cost model says which ones are slow. */
const GENERATE_EVERY_ATTEMPT: AttemptScript = () => 'generate'

/** An attempt this slow never answers within a swept session: only a cancellation ends it. */
const NEVER_ANSWERS_SECONDS = 1_000_000

/** How long each of phrase 3's failing carry-in attempts takes in `SLOW_CARRY_IN`, in seconds. */
const SLOW_CARRY_IN_SECONDS = 2.5

/** Intent: the flat modelled cost, except for the attempts `slow` gives a cost of their own. */
function costExcept(
  slow: (request: Parameters<AttemptCost>[1]) => number | undefined,
): AttemptCost {
  return (_, request) => slow(request) ?? ATTEMPT_COST_SECONDS
}

/** Intent: every carry-in attempt of phrase 3 fails after `SLOW_CARRY_IN_SECONDS`. */
const SLOW_CARRY_IN = {
  script: CARRY_IN_EXHAUSTED,
  cost: costExcept((request) =>
    request.phraseNumber === 3 && request.step === 'carry-in' ? SLOW_CARRY_IN_SECONDS : undefined,
  ),
}

/** Intent: every carry-in attempt of one phrase never answers; everything else generates. */
function carryInNeverAnswers(phraseNumber: number): AttemptCost {
  return costExcept((request) =>
    request.phraseNumber === phraseNumber && request.step === 'carry-in'
      ? NEVER_ANSWERS_SECONDS
      : undefined,
  )
}

/** Intent: phrase 3's carry-in attempts fail, and its standalone attempt never answers. */
const STANDALONE_NEVER_ANSWERS = {
  script: CARRY_IN_EXHAUSTED,
  cost: costExcept((request) =>
    request.phraseNumber === 3 && request.step === 'standalone' ? NEVER_ANSWERS_SECONDS : undefined,
  ),
}

/**
 * Intent: run every slice case at one tempo under a script and a cost model (the flat modelled
 * cost by default), failing on any session break.
 */
async function runSlice(
  tempo: number,
  script: AttemptScript,
  cost?: AttemptCost,
): Promise<readonly TimedSession[]> {
  const runs: TimedSession[] = []
  const breaks: string[] = []
  for (const sweepCase of SLICE) {
    const run = await runTimedSession(sweepCase, tempo, outcomes, script, cost)
    breaks.push(...sessionBreaks(sweepCase, run))
    runs.push(run)
  }
  expect(breaks).toEqual([])
  return runs
}

/** Intent: the origin each phrase slot after phrase 1 was decided with, in order. */
function origins(run: TimedSession): readonly (string | undefined)[] {
  return phraseSlots(run).map((slot) => slot.decided?.origin)
}

/**
 * The origin phrase 2 is generated with when its attempts succeed, per tempo. Its deadline is one
 * measure after the start: 4 s at 60 BPM and 2 s at 120 BPM leave time for carry-in, but 1 s at
 * 240 BPM is within the standalone reserve (1.075 s), so there its standalone attempt goes first.
 */
const PHRASE_TWO_ORIGIN: Readonly<Record<number, string>> = {
  60: 'carry-in',
  120: 'carry-in',
  240: 'standalone',
}

/** Intent: what the generator did with each attempt for one phrase, in request order. */
function generationsOf(run: TimedSession, phraseNumber: number): readonly GeneratorRecord[] {
  return run.generations.filter((record) => record.phraseNumber === phraseNumber)
}

/** Intent: the attempt ids the engine cancelled in a run, with the time of each cancellation. */
function cancellations(run: TimedSession): readonly { attemptId: number; at: number }[] {
  return run.outputs.flatMap(({ at, output }) =>
    output.kind === 'cancel-generation' ? [{ attemptId: output.attemptId, at }] : [],
  )
}

/**
 * Intent: check that a phrase's last carry-in attempt was cut over at the phrase's cutover time:
 * cancelled there, the standalone attempt requested at once, started once the worker restarted,
 * and its phrase ready one modelled attempt later, before the deadline.
 */
function expectCutOver(run: TimedSession, phraseNumber: number): void {
  const slot = phraseSlots(run)[phraseNumber - 2]!
  const cutover = cutoverAt(slot.deadline)
  const records = generationsOf(run, phraseNumber)
  const carryIn = records.filter((record) => record.step === 'carry-in').at(-1)!
  const standalone = records.find((record) => record.step === 'standalone')!
  expect(cancellations(run)).toContainEqual({ attemptId: carryIn.attemptId, at: cutover })
  expect(carryIn).toMatchObject({ cancelledAt: cutover, answeredAt: undefined })
  expect(standalone.requestedAt).toBe(cutover)
  expect(standalone.startedAt).toBeCloseTo(cutover + WORKER_RESPAWN_SECONDS, 9)
  expect(slot.decided?.origin).toBe('standalone')
  expect(slot.decided?.at).toBeCloseTo(standalone.startedAt! + ATTEMPT_COST_SECONDS, 9)
  expect(slot.decided!.at).toBeLessThan(slot.deadline)
}

/** A sweep run takes far longer than vitest's default per-test timeout. */
const SLICE_TIMEOUT_MS = 120_000

/** Where a case holds each control or flag outside its rhythm setting. */
const VALUE_OF: Readonly<Record<keyof typeof NON_RHYTHM_DIMENSIONS, (c: SweepCase) => unknown>> = {
  tonalCenter: (c) => c.controls.tonalCenter,
  collection: (c) => c.controls.collection,
  harmonicMotion: (c) => c.controls.harmonicMotion,
  contour: (c) => c.controls.contour,
  register: (c) => c.controls.register,
  leapiness: (c) => c.controls.leapiness,
  arpeggioChaos: (c) => c.controls.arpeggioChaos,
  instrumentProfileId: (c) => c.controls.instrumentProfileId,
  musicalProfile: (c) => c.musicalProfile,
  varySettings: (c) => c.varySettings,
  tensionAcrossPhrases: (c) => c.tensionAcrossPhrases,
}

describe('look-ahead deadline sweep cases', () => {
  it('cover every supported rhythm setting with every seed, and every other value at least once', () => {
    const cases = sweepCases()
    const settings = supportedRhythmSettings()
    expect(settings).toHaveLength(284)
    expect(cases).toHaveLength(settings.length * SEEDS.length)
    /** Intent: the seeds the cases of one rhythm setting run with, in case order. */
    const seedsOf = (key: string): readonly number[] =>
      cases.filter((c) => settingKey(c.rhythm) === key).map((c) => c.seed)
    for (const setting of settings) expect(seedsOf(settingKey(setting))).toEqual(SEEDS)
    for (const [name, values] of Object.entries(NON_RHYTHM_DIMENSIONS)) {
      const seen = new Set(cases.map(VALUE_OF[name as keyof typeof NON_RHYTHM_DIMENSIONS]))
      expect([...seen].sort(), name).toEqual([...values].sort())
    }
    const flagPairs = new Set(cases.map((c) => `${c.varySettings} ${c.tensionAcrossPhrases}`))
    expect(flagPairs.size).toBe(4)
  })
})

// @test-link [[rule_look_ahead_deadline]]
// @test-link [[rule_session_generation_failure_ladder]]
describe('look-ahead deadline sweep with injected failures, a slice of the cases at 60, 120 and 240 BPM', () => {
  it('takes every sweep case whose index is a multiple of the slice step', () => {
    expect(SLICE.length).toBe(Math.ceil(sweepCases().length / SLICE_STEP))
  })

  // @test-link [[rule_session_generation_failure_ladder]]
  it.each(SWEEP_TEMPOS)(
    'recovers a failed attempt and a rejected request with the next carry-in retry at %i BPM',
    async (tempo) => {
      for (const run of await runSlice(tempo, ONE_FAILURE_EACH)) {
        const slots = phraseSlots(run)
        expect(origins(run)).toEqual([
          PHRASE_TWO_ORIGIN[tempo],
          'carry-in',
          'carry-in',
          'carry-in',
          'carry-in',
        ])
        expect(slots[1]!.attempts).toBeGreaterThanOrEqual(2)
        expect(slots[2]!.attempts).toBeGreaterThanOrEqual(2)
        expect(noticeChanges(run)).toEqual([])
      }
    },
    SLICE_TIMEOUT_MS,
  )

  // @test-link [[rule_session_generation_failure_ladder]]
  it.each(SWEEP_TEMPOS)(
    'gives way to the standalone retry when every carry-in attempt fails at %i BPM',
    async (tempo) => {
      for (const run of await runSlice(tempo, CARRY_IN_EXHAUSTED)) {
        expect(origins(run)[1]).toBe('standalone')
        expect(phraseProductions(run)[1]).toBe('standalone-after-three-retries')
        expect(phraseSlots(run)[1]!.attempts).toBe(5)
        expect(origins(run).filter((origin) => origin === 'repeat')).toEqual([])
      }
    },
    SLICE_TIMEOUT_MS,
  )

  // @test-link [[rule_session_generation_failure_ladder]]
  it.each(SWEEP_TEMPOS)(
    'repeats phrase 1 at its deadline when every attempt of phrase 2 fails at %i BPM',
    async (tempo) => {
      for (const run of await runSlice(tempo, NOTHING_BY_PHRASE_TWO_DEADLINE)) {
        const [phraseTwo] = phraseSlots(run)
        expect(phraseTwo!.decided).toEqual({ origin: 'repeat', at: phraseTwo!.deadline })
        expect(origins(run).slice(1)).not.toContain('repeat')
        expect(noticeChanges(run)).toEqual([])
      }
    },
    SLICE_TIMEOUT_MS,
  )

  // @test-link [[rule_session_generation_failure_ladder]]
  // @test-link [[rule_struggling_generator_notice]]
  it.each(SWEEP_TEMPOS)(
    'shows the struggling notice at the second repeat in a row until a generated phrase sounds at %i BPM',
    async (tempo) => {
      for (const run of await runSlice(tempo, TWO_REPEATS_IN_A_ROW)) {
        const slots = phraseSlots(run)
        expect(origins(run).slice(0, 4)).toEqual([
          PHRASE_TWO_ORIGIN[tempo],
          'repeat',
          'repeat',
          'carry-in',
        ])
        expect(noticeChanges(run)).toEqual([
          { visible: true, at: slots[2]!.deadline },
          { visible: false, at: soundingAt(5, tempo) },
        ])
      }
    },
    SLICE_TIMEOUT_MS,
  )
})

/**
 * How phrase 3 is produced when each of its carry-in attempts fails after 2.5 s, per tempo. Its
 * look-ahead lasts three measures from its request, and its cutover comes 1.075 s before the end:
 * 10.925 s in at 60 BPM, after the four carry-in attempts ended at 10 s, so the standalone attempt
 * follows the three failed retries; 4.925 s in at 120 BPM, during the second carry-in attempt, and
 * 1.925 s in at 240 BPM, during the first, which are cut over and cancelled.
 */
const SLOW_CARRY_IN_PRODUCTION: Readonly<Record<number, PhraseProduction>> = {
  60: 'standalone-after-three-retries',
  120: 'standalone-after-cutover-cancel',
  240: 'standalone-after-cutover-cancel',
}

/**
 * The phrase whose carry-in attempts never answer, per tempo: phrase 2, except at 240 BPM, where
 * phrase 2 makes no carry-in attempt (its standalone attempt goes first), so phrase 3.
 */
const NEVER_ANSWERING_PHRASE: Readonly<Record<number, number>> = { 60: 2, 120: 2, 240: 3 }

// @test-link [[rule_session_generation_failure_ladder]]
// @test-link [[rule_dropped_attempt_cancelled]]
describe('look-ahead deadline sweep with slow or silent attempts, a slice of the cases at 60, 120 and 240 BPM', () => {
  // @test-link [[rule_session_generation_failure_ladder]]
  it.each(SWEEP_TEMPOS)(
    'cuts slow carry-in attempts over to the standalone attempt in time for the deadline at %i BPM',
    async (tempo) => {
      for (const run of await runSlice(tempo, SLOW_CARRY_IN.script, SLOW_CARRY_IN.cost)) {
        const production = SLOW_CARRY_IN_PRODUCTION[tempo]!
        expect(phraseProductions(run)[1]).toBe(production)
        expect(origins(run).slice(1)).toEqual(['standalone', 'carry-in', 'carry-in', 'carry-in'])
        if (production === 'standalone-after-cutover-cancel') expectCutOver(run, 3)
        else expect(cancellations(run)).toEqual([])
      }
    },
    SLICE_TIMEOUT_MS,
  )

  // @test-link [[rule_session_generation_failure_ladder]]
  // @test-link [[rule_dropped_attempt_cancelled]]
  it.each(SWEEP_TEMPOS)(
    'cancels a carry-in attempt that never answers at the cutover and generates standalone before the deadline at %i BPM',
    async (tempo) => {
      const phraseNumber = NEVER_ANSWERING_PHRASE[tempo]!
      const cost = carryInNeverAnswers(phraseNumber)
      for (const run of await runSlice(tempo, GENERATE_EVERY_ATTEMPT, cost)) {
        expect(phraseProductions(run)[phraseNumber - 2]).toBe('standalone-after-cutover-cancel')
        expect(generationsOf(run, phraseNumber)).toHaveLength(2)
        expectCutOver(run, phraseNumber)
        expect(origins(run).slice(phraseNumber - 1)).not.toContain('repeat')
      }
    },
    SLICE_TIMEOUT_MS,
  )

  // @test-link [[rule_session_generation_failure_ladder]]
  // @test-link [[rule_dropped_attempt_cancelled]]
  it.each(SWEEP_TEMPOS)(
    'cancels a standalone attempt that never answers at the deadline, repeats, and keeps the next phrase on time at %i BPM',
    async (tempo) => {
      const { script, cost } = STANDALONE_NEVER_ANSWERS
      for (const run of await runSlice(tempo, script, cost)) {
        const [, phraseThree] = phraseSlots(run)
        const standalone = generationsOf(run, 3).at(-1)!
        const [nextFirst] = generationsOf(run, 4)
        expect(phraseThree!.decided).toEqual({ origin: 'repeat', at: phraseThree!.deadline })
        expect(standalone.step).toBe('standalone')
        expect(cancellations(run)).toEqual([
          { attemptId: standalone.attemptId, at: phraseThree!.deadline },
        ])
        expect(standalone).toMatchObject({
          cancelledAt: phraseThree!.deadline,
          answeredAt: undefined,
        })
        expect(nextFirst!.startedAt).toBe(
          Math.max(nextFirst!.requestedAt, phraseThree!.deadline + WORKER_RESPAWN_SECONDS),
        )
        expect(origins(run).slice(2)).toEqual(['carry-in', 'carry-in', 'carry-in'])
        expect(noticeChanges(run)).toEqual([])
      }
    },
    SLICE_TIMEOUT_MS,
  )
})
