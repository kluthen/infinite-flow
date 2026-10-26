// @vitest-environment node
/**
 * The Jam sweep's own tests (measurement tooling, run by `npm run test:sweep`): the figure helpers
 * on hand-made attempt records (rung shares, the nearest-rank 95th percentile, the standalone
 * reserve count, the orderings share), the extended wait and the baseline ladder's deadline on a
 * scripted generator, and real runs on cases of different note densities: a Jam with no steering
 * block, the lock off and a warm domain plays v3.1's measured session phrase for phrase; session
 * mode with the lock off is today's run; a cold domain gives the same phrase 1 at another time;
 * the lock on yields a census of every phrase against phrase 1.
 */

import { describe, expect, it } from 'vitest'

import { RHYTHM_CHANGE_KINDS } from '@/domain/generation/request-rhythm-lock'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { STANDALONE_RESERVE_SECONDS } from '@/session/session-timing'
import {
  OutcomeCache,
  caseSettings,
  phraseOneIntent,
  sweepCases,
  type SweepCase,
  type TimedSession,
} from '../unit/session/deadline-sweep'
import { loadDoodleSet } from '../unit/jam/doodle-set'
import { failureOutcome } from '../unit/session/session-harness'
import { measuredSession } from './deadline-sweep-measured'
import {
  NO_ORDERINGS_NOTE,
  attemptTimings,
  rungShares,
  standaloneFigures,
  type AttemptRecord,
} from './jam-sweep-figures'
import {
  BASELINE_LADDER,
  extendedWaitMeasures,
  jamPhraseOneIntent,
  phraseOneDeadlineSeconds,
  type GeneratedAttempt,
  type LadderInput,
} from './jam-sweep-ladder'
import { evenlySpaced } from './jam-sweep-population'
import { runJamCase, type JamRunConfig } from './jam-sweep'

/** Intent: a hand-made standalone attempt record. */
function attempt(seconds: number, extra: Partial<AttemptRecord> = {}): AttemptRecord {
  return {
    phraseNumber: 2,
    kind: 'standalone',
    seconds,
    chargedSeconds: seconds + 0.1,
    failureCode: null,
    ...extra,
  }
}

describe('Jam sweep figures on hand-made attempts', () => {
  it('shares phrase 1 by rung, never came included', () => {
    const shares = rungShares(['standalone', 'block', null, 'standalone', 'join-and-block'])
    expect(shares.standalone).toEqual({ count: 2, total: 5, share: 0.4 })
    expect(shares.block.count).toBe(1)
    expect(shares.joinAndBlock.count).toBe(1)
    expect(shares.neverCame).toEqual({ count: 1, total: 5, share: 0.2 })
    expect(rungShares([]).neverCame.share).toBeNull()
  })

  it('takes the 95th percentile by nearest rank and the slowest', () => {
    const timings = attemptTimings(Array.from({ length: 20 }, (_, index) => attempt(index + 1)))
    expect(timings).toMatchObject({ count: 20, p95Seconds: 19, slowestSeconds: 20 })
    expect(attemptTimings([]).p95Seconds).toBeNull()
  })

  it('reports no orderings share with a note when no attempt reports ordering time', () => {
    const none = attemptTimings([attempt(1), attempt(3)])
    expect(none.orderingsShare).toBeNull()
    expect(none.orderingsNote).toBe(NO_ORDERINGS_NOTE)
    const some = attemptTimings([attempt(1, { orderingSeconds: 0.5 }), attempt(3)])
    expect(some.orderingsShare).toBe(0.125)
    expect(some.orderingsNote).toBeUndefined()
  })

  it('counts the standalone attempts charged past the reserve, and only standalone ones', () => {
    const figures = standaloneFigures([
      attempt(0.5),
      { ...attempt(0), chargedSeconds: STANDALONE_RESERVE_SECONDS },
      attempt(1.2),
      attempt(2, { kind: 'carry-in' }),
      attempt(0.2, { phraseNumber: 1 }),
    ])
    expect(figures).toMatchObject({ count: 4, slowestSeconds: 1.2, overReserve: 1 })
    expect(figures.slowestChargedSeconds).toBeCloseTo(1.3)
  })
})

describe('Jam phrase 1: the extended wait and the baseline ladder', () => {
  it('extends the wait by whole measures past the generation measure', () => {
    expect(phraseOneDeadlineSeconds(120)).toBe(6)
    expect([0.1, 2, 2.01, 5.9].map((at) => extendedWaitMeasures(at, 120))).toEqual([0, 0, 1, 2])
  })

  /** Intent: a ladder input over a scripted generator charging fixed times, failing until `succeedAt`. */
  function scripted(charged: number, succeedAt: number): LadderInput {
    const sweepCase = sweepCases()[0]!
    const settings = caseSettings(sweepCase, 120)
    const real = generatePhrase(phraseOneIntent(settings, sweepCase.seed))
    let calls = 0
    return {
      baseIntent: phraseOneIntent(settings, sweepCase.seed),
      intentAt: (seed, extras) => jamPhraseOneIntent(settings, seed, extras),
      firstSeed: sweepCase.seed,
      steering: undefined,
      lock: { on: false },
      deadlineSeconds: phraseOneDeadlineSeconds(120),
      reserveSeconds: STANDALONE_RESERVE_SECONDS,
      generate: (): GeneratedAttempt => {
        calls += 1
        const outcome = calls >= succeedAt ? real : failureOutcome()
        const seconds = charged - 0.1
        return { outcome, seconds, chargedSeconds: charged, orderingSeconds: 0, cold: false }
      },
    }
  }

  it('stops when the next attempt would start at or after the deadline', () => {
    const result = BASELINE_LADDER.run(scripted(2, Number.POSITIVE_INFINITY))
    expect(result.ready).toBeUndefined()
    expect(result.attempts.map((each) => each.startedAt)).toEqual([0, 2, 4])
    expect(result.attempts.every((each) => each.failureCode === 'search_limit_exceeded')).toBe(true)
  })

  it('counts a phrase ready at or after the deadline as never came, one before it as came', () => {
    expect(BASELINE_LADDER.run(scripted(2, 3)).ready).toBeUndefined()
    const came = BASELINE_LADDER.run(scripted(1.9, 3))
    expect(came.ready?.rung).toBe('standalone')
    expect(came.ready?.readyAt).toBeCloseTo(5.7)
    expect(came.ready?.phraseOne.intent.seed).toBe(sweepCases()[0]!.seed + 2)
  })
})

/** The real runs' cases: the first evenly spaced case of each note density. */
const REAL_CASES: readonly SweepCase[] = [
  ...new Map(
    evenlySpaced(sweepCases(), 4).map((sweepCase) => [sweepCase.rhythm.noteDensity, sweepCase]),
  ).values(),
]

/** Intent: a run's outputs as JSON, the whole of what it did at what time. */
function outputsOf(session: TimedSession | undefined): string {
  if (session === undefined) throw new Error('The run played no session.')
  return JSON.stringify(session.outputs)
}

/** Intent: the phrase 1 a run sounded, as JSON. */
function phraseOneOf(session: TimedSession | undefined): string {
  const sounding = session?.outputs.find(
    ({ output }) => output.kind === 'phrase-sounding' && output.phrase.phraseNumber === 1,
  )
  if (sounding?.output.kind !== 'phrase-sounding') throw new Error('Phrase 1 never sounded.')
  return JSON.stringify(sounding.output.phrase)
}

describe.each(REAL_CASES.map((sweepCase) => [sweepCase.rhythm.noteDensity, sweepCase] as const))(
  'Jam sweep real runs: %s',
  (_density, sweepCase) => {
    const outcomes = new OutcomeCache()
    const base: Omit<JamRunConfig, 'mode'> = {
      sweepCase,
      tempo: 120,
      lock: { on: false },
      domain: 'warm',
    }

    it('plays, as a Jam with no block, the lock off and a warm domain, v3.1 phrases', async () => {
      expect(REAL_CASES.length).toBeGreaterThanOrEqual(2)
      const jam = await runJamCase({ ...base, mode: 'jam' }, outcomes)
      const v31 = await measuredSession(sweepCase, 120, outcomes, undefined, { phraseCount: 8 })
      expect(jam.record.phraseCount).toBe(8)
      expect(jam.record.phraseOne?.rung).toBe('standalone')
      expect(jam.record.phraseOne?.extendedWaitMeasures).toBe(0)
      expect(outputsOf(jam.session)).toBe(JSON.stringify(v31.outputs))
      expect(jam.record.shortfalls).toEqual([])
    })

    it("plays session mode with the lock off as today's measured run", async () => {
      const session = await runJamCase({ ...base, mode: 'session' }, outcomes)
      const today = await measuredSession(sweepCase, 120, outcomes)
      expect(session.record.phraseOne).toBeNull()
      expect(session.record.phraseCount).toBe(6)
      expect(outputsOf(session.session)).toBe(JSON.stringify(today.outputs))
    })

    it('gives, on a cold domain, the warm phrase 1 at its own time', async () => {
      const doodle = loadDoodleSet()[0]!
      const warm = await runJamCase({ ...base, mode: 'jam' }, outcomes)
      const cold = await runJamCase({ ...base, mode: 'jam', domain: 'cold', doodle }, outcomes)
      expect(phraseOneOf(cold.session)).toBe(phraseOneOf(warm.session))
      expect(cold.record.phraseOne?.attempts[0]?.cold).toBe(true)
      expect(warm.record.phraseOne?.attempts.some((each) => each.cold)).toBe(false)
      expect(cold.record.doodle).toBe(doodle.name)
    })

    it('classifies, with the lock on in session mode, every phrase against phrase 1', async () => {
      const lock = { on: true, allowedChanges: RHYTHM_CHANGE_KINDS } as const
      const { record } = await runJamCase({ ...base, mode: 'session', lock }, outcomes)
      const census = record.lockCensus!
      expect(census.phrases).toHaveLength(6)
      expect(census.phrases[0]!.lockClass).toEqual({ kind: 'locked' })
      const { kept, changesByKind, bends, relocks } = census.counts
      const changes = Object.values(changesByKind).reduce((sum, count) => sum + count, 0)
      expect(kept + changes + bends).toBe(5)
      expect(relocks).toBe(0)
    })
  },
)
