/**
 * A fresh Jam from the doodle to phrase 1, on the fake clock with the held-generation double
 * (jam-phrase-one-rig.ts), as in jam-phrase-one.spec.ts: an attempt whose candidate end a later
 * doodle note voids, and phrase 1's seeds.
 */
import { describe, expect, it } from 'vitest'

import { makeSeed } from '@/domain/random/seed'
import { jamPhraseOneSeed } from '@/session/session-seed-plan'
import { DEFAULT_SESSION_SEED } from '../session/session-harness'
import { handover, ONE_MEASURE } from './jam-phrase-one-fixtures'
import {
  engineOutputs,
  phraseOneRequests,
  rigBarline,
  runJam,
  type BeatNote,
  type JamRun,
} from './jam-phrase-one-rig'

/** Intent: barline `k` of a run, 0 at the count-in's end. */
const barline = rigBarline

/** The one-measure doodle, then a note on beat 2 of the tentative measure, which voids it. */
const VOIDED: readonly BeatNote[] = [...ONE_MEASURE, [67, 5, 1]]

// @test-link [[rule_jam_phrase_one_failure_ladder]]
describe('an attempt started at a candidate end that a doodle note voids', () => {
  // @test-link [[rule_dropped_attempt_cancelled]]
  // @test-link [[module_session_seed_plan]]
  it('is cancelled on the worker, and the next one, on the longer doodle, keeps its seed', () => {
    const run = runJam({
      tempo: 120,
      doodle: VOIDED,
      until: 30,
      generate: (request) => ({ after: request.phraseNumber === 1 ? 1 : 0, answer: 'real' }),
    })
    const [first, second, ...rest] = phraseOneRequests(run)
    expect(rest).toEqual([])
    expect(first!.at).toBeCloseTo(barline(run, 1) + 0.038, 9)
    expect(second!.at).toBeCloseTo(barline(run, 2) + 0.038, 9)
    expect([first!.request.retry, second!.request.retry]).toEqual([0, 0])
    expect(second!.request.intent.seed).toBe(first!.request.intent.seed)
    expect(second!.request.intent.seed).toBe(jamPhraseOneSeed(DEFAULT_SESSION_SEED, 0))
    expect(second!.request.intent.steering).not.toEqual(first!.request.intent.steering)
    expect(engineOutputs(run, 'cancel-generation').map((entry) => entry.output.attemptId)).toEqual([
      first!.request.attemptId,
    ])
    expect(handover(run)).toMatchObject({
      attemptId: second!.request.attemptId,
      soundsAt: barline(run, 4),
    })
  })

  // @test-link [[rule_jam_phrase_one_failure_ladder]]
  it('drops phrase 1 that was ready from it: the later one is shown', () => {
    const run = runJam({ tempo: 120, doodle: VOIDED, until: 30 })
    const requests = phraseOneRequests(run)
    expect(requests.map(({ request }) => request.retry)).toEqual([0, 0])
    expect(engineOutputs(run, 'cancel-generation')).toEqual([])
    expect(handover(run).attemptId).toBe(requests[1]!.request.attemptId)
    expect(engineOutputs(run, 'phrase-ready')[0]?.output.phrase.intent).toBe(
      requests[1]!.request.intent,
    )
  })
})

// @test-link [[module_session_seed_plan]]
describe("phrase 1's seeds", () => {
  /** Intent: a run whose every phrase 1 attempt fails, so all six are asked for. */
  function everyAttempt(sessionSeed = DEFAULT_SESSION_SEED): JamRun {
    return runJam({
      tempo: 120,
      doodle: ONE_MEASURE,
      until: 40,
      sessionSeed,
      generate: () => ({ after: 0.2, answer: 'search_limit_exceeded' }),
    })
  }

  // @test-link [[module_session_seed_plan]]
  it('gives each attempt the seed its label derives from the session seed drawn at Start', () => {
    const seeds = phraseOneRequests(everyAttempt()).map(({ request }) => request.intent.seed)
    expect(seeds).toEqual([0, 1, 2, 3, 4, 5].map((r) => jamPhraseOneSeed(DEFAULT_SESSION_SEED, r)))
  })

  // @test-link [[module_session_seed_plan]]
  it('gives the same seeds, phrase 1 and phrase 2 alike, in two runs from one session seed and doodle', () => {
    const seedsOf = (run: JamRun) => run.requests.map(({ request }) => request.intent.seed)
    const twice = () =>
      runJam({
        tempo: 120,
        doodle: ONE_MEASURE,
        until: 24,
        generate: (request) =>
          request.phraseNumber === 1 && request.retry < 2
            ? { after: 0.2, answer: 'search_limit_exceeded' }
            : { after: 0.1, answer: 'real' },
      })
    const [one, two] = [twice(), twice()]
    expect(seedsOf(one)).toEqual(seedsOf(two))
    expect(one.requests.map(({ request }) => request.phraseNumber)).toEqual([1, 1, 1, 2])
    expect(handover(one).soundsAt).toBe(handover(two).soundsAt)
  })

  // @test-link [[module_session_seed_plan]]
  it('takes other seeds from another session seed', () => {
    const other = phraseOneRequests(everyAttempt(makeSeed(DEFAULT_SESSION_SEED ^ 1))).map(
      ({ request }) => request.intent.seed,
    )
    expect(other[0]).not.toBe(jamPhraseOneSeed(DEFAULT_SESSION_SEED, 0))
  })
})

// @test-link [[rule_jam_phrase_one_failure_ladder]]
describe('a result at the very moment a doodle note voids its candidate end', () => {
  // @test-link [[rule_jam_phrase_one_failure_ladder]]
  it('is dropped with it, and phrase 1 comes from the longer doodle', () => {
    // The note on beat 1 of measure 1 counts 38 ms after it, when rung 1's first answer comes.
    const run = runJam({
      tempo: 120,
      doodle: VOIDED,
      until: 30,
      generate: (request) => ({ after: request.phraseNumber === 1 ? 0.5 : 0, answer: 'real' }),
    })
    const requests = phraseOneRequests(run)
    expect(requests.map(({ request }) => request.retry)).toEqual([0, 0])
    expect(handover(run)).toMatchObject({
      attemptId: requests[1]!.request.attemptId,
      soundsAt: barline(run, 4),
    })
  })
})
