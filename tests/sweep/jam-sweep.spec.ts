// @vitest-environment node
/**
 * The Jam sweep's own tests (measurement tooling, run by `npm run test:sweep`): the figure helpers
 * on hand-made attempt records (rung shares, the nearest-rank 95th percentile, the standalone
 * reserve count, the orderings share), the extended wait and the baseline ladder's deadline on a
 * scripted generator, and real runs on cases of different note densities: a Jam with no steering
 * block, the lock off and a warm domain plays v3.1's measured session phrase for phrase; session
 * mode with the lock off is today's run; a cold domain gives the same phrase 1 at another time;
 * the lock on yields a census of every phrase against phrase 1, its record and bars agreeing, whose
 * figures the configuration's lock line prints. The double of Jam's ladder on a scripted generator
 * (its rungs, its seeds, the retries skipped, the cutover and the deadline) and on real runs
 * steered by a doodle: the handed-over session, the block on every later request, the lock census,
 * and its phrases replayed from their keys.
 */

import { describe, expect, it } from 'vitest'

import type { GenerationFailureCode } from '@/domain/generation/orchestration/orchestration-types'
import { RHYTHM_CHANGE_KINDS } from '@/domain/generation/request-rhythm-lock'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { fnv1a32 } from '@/domain/random/hash32'
import { makeSeed } from '@/domain/random/seed'
import { phraseAttemptSeed } from '@/session/session-seed-plan'
import {
  STANDALONE_RESERVE_SECONDS,
  WORKER_RESPAWN_SECONDS,
  measureSeconds,
} from '@/session/session-timing'
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
  ConfigurationTally,
  NO_ORDERINGS_NOTE,
  attemptTimings,
  configurationSummaryLines,
  rungShares,
  standaloneFigures,
  type AttemptRecord,
} from './jam-sweep-figures'
import {
  BASELINE_LADDER,
  JAM_DOUBLE_LADDER,
  doodlePhraseOne,
  extendedWaitMeasures,
  jamAttemptSeed,
  jamPhraseOneIntent,
  phraseOneDeadlineSeconds,
  type DoodlePhraseOne,
  type GeneratedAttempt,
  type LadderInput,
} from './jam-sweep-ladder'
import { evenlySpaced } from './jam-sweep-population'
import { JamReplaySampler } from './jam-sweep-replay'
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
      sessionSeed: sweepCase.firstSessionSeed,
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

/** The doodle set, and the sweep's first case, for the double's tests. */
const DOODLES = loadDoodleSet()
const FIRST_CASE = sweepCases()[0]!

/** Intent: what a doodle of the set gives phrase 1 under the first case's settings at 120 BPM. */
function doodleInput(name: string, lock: LadderInput['lock'] = { on: false }): DoodlePhraseOne {
  const doodle = DOODLES.find((each) => each.name === name)!
  return doodlePhraseOne(caseSettings(FIRST_CASE, 120), doodle.quantized, 'Near', lock)
}

/** The names of the doodles whose last note gives the first case's instrument a join, and not. */
const WITH_JOIN = DOODLES.filter((each) => doodleInput(each.name).hasJoin).map((each) => each.name)
const WITHOUT_JOIN = DOODLES.filter((each) => !doodleInput(each.name).hasJoin).map(
  (each) => each.name,
)

/**
 * Intent: a double's input on a doodle at 120 BPM over a scripted generator: each attempt charged
 * `charged(index)` seconds and failing with `fail(index)`'s code until attempt `succeedAt` (by
 * the order asked, from 1).
 */
function scriptedDouble(
  doodle: DoodlePhraseOne,
  charged: (call: number) => number,
  succeedAt: number,
  fail: (call: number) => GenerationFailureCode = () => 'search_limit_exceeded',
): LadderInput {
  const settings = caseSettings(FIRST_CASE, 120)
  const real = generatePhrase(phraseOneIntent(settings, FIRST_CASE.seed))
  let calls = 0
  return {
    baseIntent: phraseOneIntent(settings, FIRST_CASE.seed),
    intentAt: (seed, extras) => jamPhraseOneIntent(settings, seed, extras),
    firstSeed: FIRST_CASE.seed,
    steering: doodle.steering,
    lock: { on: false },
    deadlineSeconds: phraseOneDeadlineSeconds(120),
    reserveSeconds: STANDALONE_RESERVE_SECONDS,
    sessionSeed: FIRST_CASE.firstSessionSeed,
    doodle,
    generate: (): GeneratedAttempt => {
      calls += 1
      const outcome = calls >= succeedAt ? real : failureOutcome(fail(calls))
      const cost = charged(calls)
      return { outcome, seconds: cost - 0.1, chargedSeconds: cost, orderingSeconds: 0, cold: false }
    },
  }
}

describe("Jam phrase 1: the double of Jam's ladder (C5.7, C11)", () => {
  it("derives each attempt seed from the session seed by the plan's derivation, under C11's labels", () => {
    const sessionSeed = FIRST_CASE.firstSessionSeed
    /** Intent: the seed plan's one derivation of a label, written out. */
    const derive = (label: string): number => makeSeed((sessionSeed ^ fnv1a32(label)) >>> 0)
    expect(derive('session-seed-plan-v1:phrase:2:rung:0')).toBe(
      phraseAttemptSeed(makeSeed(sessionSeed), 2, 0),
    )
    const seeds = [0, 1, 2, 3, 4, 5].map((index) => jamAttemptSeed(sessionSeed, index))
    expect(seeds).toEqual(
      [0, 1, 2, 3, 4, 5].map((index) =>
        derive(`session-seed-plan-v1:jam-phrase-one:rung:${index}`),
      ),
    )
    expect(new Set(seeds).size).toBe(6)
    expect(() => jamAttemptSeed(sessionSeed, 6)).toThrow()
  })

  it('builds rung 1 with the join and the block, rung 2 with the block alone, rung 3 with neither', () => {
    expect(WITH_JOIN.length).toBeGreaterThan(0)
    const lock = { on: true, allowedChanges: RHYTHM_CHANGE_KINDS } as const
    const doodle = doodleInput(WITH_JOIN[0]!, lock)
    const seed = makeSeed(1)
    const [joined, blocked, standalone] = (['join-and-block', 'block', 'standalone'] as const).map(
      (rung) => doodle.intentAt(rung, seed),
    )
    expect(joined!.carryIn).toMatchObject({ origin: 'none' })
    expect(joined!.steering).toEqual(doodle.steering)
    expect(joined!.rhythmLock?.state).toEqual({ kind: 'pending' })
    expect(blocked!.carryIn).toBeUndefined()
    expect(blocked!.steering).toEqual(doodle.steering)
    expect(blocked!.rhythmLock?.state).toEqual({ kind: 'pending' })
    expect(standalone!.carryIn).toBeUndefined()
    expect(standalone!.steering).toBeUndefined()
    expect(standalone!.rhythmLock).toBeUndefined()
    expect(standalone!.controls.register).toBe(doodle.settings.controls.register)
    expect(doodle.settings.rhythmLockOn).toBe(true)
  })

  it('climbs rung 1 with its retries, then rung 2, then rung 3, each attempt with its own seed', () => {
    const result = JAM_DOUBLE_LADDER.run(
      scriptedDouble(doodleInput(WITH_JOIN[0]!), () => 0.2, Number.POSITIVE_INFINITY),
    )
    expect(result.ready).toBeUndefined()
    expect(result.attempts.map((each) => [each.attempt, each.rung])).toEqual([
      [0, 'join-and-block'],
      [1, 'join-and-block'],
      [2, 'join-and-block'],
      [3, 'join-and-block'],
      [4, 'block'],
      [5, 'standalone'],
    ])
    expect(result.attempts.map((each) => each.seed)).toEqual(
      [0, 1, 2, 3, 4, 5].map((index) => jamAttemptSeed(FIRST_CASE.firstSessionSeed, index)),
    )
    expect(result.attempts.map((each) => each.startedAt)).toEqual(
      [0, 0.2, 0.4, 0.6, 0.8, 1].map((at) => expect.closeTo(at, 9)),
    )
  })

  it('skips the retries after a search that covered every candidate, and starts at rung 2 with no join', () => {
    const exhausted = JAM_DOUBLE_LADDER.run(
      scriptedDouble(
        doodleInput(WITH_JOIN[0]!),
        () => 0.2,
        3,
        () => 'no_legal_pitch_plan',
      ),
    )
    expect(exhausted.attempts.map((each) => each.attempt)).toEqual([0, 4, 5])
    expect(exhausted.ready?.rung).toBe('standalone')
    expect(WITHOUT_JOIN.length).toBeGreaterThan(0)
    const noJoin = JAM_DOUBLE_LADDER.run(
      scriptedDouble(doodleInput(WITHOUT_JOIN[0]!), () => 0.2, 1),
    )
    expect(noJoin.attempts.map((each) => each.attempt)).toEqual([4])
    expect(noJoin.ready?.rung).toBe('block')
    expect(noJoin.ready?.readyAt).toBeCloseTo(0.2)
  })

  it('cancels a rung 1 or 2 attempt still running at the cutover and asks for rung 3 after the restart', () => {
    const deadline = phraseOneDeadlineSeconds(120)
    const cutover = deadline - STANDALONE_RESERVE_SECONDS
    const slow = JAM_DOUBLE_LADDER.run(
      scriptedDouble(doodleInput(WITH_JOIN[0]!), (call) => (call === 1 ? 1 : cutover), 3),
    )
    expect(slow.attempts.map((each) => [each.attempt, each.cancelledAt])).toEqual([
      [0, undefined],
      [1, cutover],
      [5, undefined],
    ])
    expect(slow.attempts[2]!.startedAt).toBeCloseTo(cutover + WORKER_RESPAWN_SECONDS)
    const atCutover = JAM_DOUBLE_LADDER.run(
      scriptedDouble(doodleInput(WITH_JOIN[0]!), (call) => (call === 1 ? cutover : 0.3), 1),
    )
    expect(atCutover.attempts.map((each) => each.attempt)).toEqual([0, 5])
    expect(atCutover.attempts[0]!.cancelledAt).toBe(cutover)
    expect(atCutover.ready?.rung).toBe('standalone')
  })

  it('ends the Jam when rung 3 fails or comes at or after the deadline', () => {
    const deadline = phraseOneDeadlineSeconds(120)
    const cutover = deadline - STANDALONE_RESERVE_SECONDS
    const late = (call: number): number => (call === 1 ? cutover : deadline)
    const tooLate = JAM_DOUBLE_LADDER.run(scriptedDouble(doodleInput(WITH_JOIN[0]!), late, 2))
    expect(tooLate.attempts.map((each) => each.attempt)).toEqual([0, 5])
    expect(tooLate.ready).toBeUndefined()
    const failed = JAM_DOUBLE_LADDER.run(
      scriptedDouble(doodleInput(WITH_JOIN[0]!), (call) => (call === 1 ? cutover : 0.2), 99),
    )
    expect(failed.attempts.map((each) => each.attempt)).toEqual([0, 5])
    expect(failed.ready).toBeUndefined()
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
      const { kept, changesByKind, bends, relocks, mismatches } = census.counts
      const changes = Object.values(changesByKind).reduce((sum, count) => sum + count, 0)
      expect(kept + changes + bends).toBe(5)
      expect(relocks).toBe(0)
      expect(mismatches).toEqual([])
      const tally = new ConfigurationTally({
        mode: 'session',
        tempo: 120,
        lock,
        domain: 'warm',
        steering: false,
      })
      tally.add(record, 0)
      const figures = tally.figures().lockCensus!
      expect(figures.mismatches.count).toBe(0)
      expect(figures.forcedBendRate).toBe(figures.shares.bent)
      expect(figures.changesShare).toBe(figures.shares.changed)
      const line = configurationSummaryLines(tally.figures()).find((each) =>
        each.includes('] lock: '),
      )
      for (const figure of [
        'forced bends',
        'changes',
        'drew',
        'normal',
        'tenser',
        'bends one allowed change away',
        'mismatches 0',
      ])
        expect(line).toContain(figure)
    })
  },
)

describe('Jam sweep real runs steered by a doodle, through the double', () => {
  const outcomes = new OutcomeCache()
  const doodle = DOODLES.find((each) => each.name === WITH_JOIN[0])!
  const base: JamRunConfig = {
    mode: 'jam',
    sweepCase: FIRST_CASE,
    tempo: 120,
    doodle,
    drift: 'Near',
    lock: { on: false },
    domain: 'warm',
  }

  it('hands phrase 1 over at its barline and plays phrases 2 to 8 carrying the block on the grid', async () => {
    const { record, session } = await runJamCase(base, outcomes)
    expect(record.phraseOne?.ladder).toBe(JAM_DOUBLE_LADDER.name)
    expect(record.phraseOne?.rung).not.toBeNull()
    expect(record.drift).toBe('Near')
    expect(record.shortfalls).toEqual([])
    expect(record.repeats).toBe(0)
    const measure = measureSeconds(120)
    const shownAt = (1 + record.phraseOne!.extendedWaitMeasures!) * measure
    expect(session!.phraseOneSoundsAt).toBeCloseTo(shownAt + measure)
    const steering = doodleInput(doodle.name).steering
    const requests = session!.outputs.flatMap(({ at, output }) =>
      output.kind === 'request-generation' ? [{ at, output }] : [],
    )
    const later = requests.filter(({ output }) => output.phraseNumber > 1)
    expect(later.length).toBeGreaterThanOrEqual(7)
    expect(later[0]!.at).toBeCloseTo(shownAt)
    for (const { output } of later) expect(output.intent.steering).toEqual(steering)
    expect(session!.errors).toEqual([])
  })

  it('classifies, with the lock on, every phrase of the Jam against phrase 1, and replays them', async () => {
    const lock = { on: true, allowedChanges: RHYTHM_CHANGE_KINDS } as const
    const run = await runJamCase({ ...base, lock }, outcomes)
    expect(run.record.lockCensus?.phrases).toHaveLength(8)
    expect(run.record.lockCensus?.counts.mismatches).toEqual([])
    const replays = new JamReplaySampler()
    const { firstSessionSeed } = FIRST_CASE
    replays.addJam(run.record, run.session, run.phraseOneInput, firstSessionSeed)
    const drifted = await runJamCase(base, outcomes)
    replays.addJam(drifted.record, drifted.session, drifted.phraseOneInput, firstSessionSeed)
    const figures = replays.replay()
    expect(figures.byKind.locked.replayed).toBe(1)
    expect(figures.byKind['drifted Near'].replayed).toBe(1)
    const made = run.record.phraseOne!.rung!
    expect(figures.byKind[made]).toMatchObject({ replayed: 2, probed: false })
    const others = (['join-and-block', 'block', 'standalone'] as const).filter((r) => r !== made)
    for (const rung of others) expect(figures.byKind[rung]).toMatchObject({ probed: true })
    expect(figures.byKind.standalone.replayed + figures.byKind.block.replayed).toBeGreaterThan(0)
    expect(figures.mismatchedKeys).toEqual([])
  })
})
