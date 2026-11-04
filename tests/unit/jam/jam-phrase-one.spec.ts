/**
 * A fresh Jam from the doodle to phrase 1, on the fake clock with the held-generation double
 * (jam-phrase-one-rig.ts): the real capture, the real ladder and a real session engine started
 * without phrase 1. A one-measure doodle (four quarter notes from the count-in's end) ends by
 * silence at barline 1; measure 1 is the generation measure, phrase 1's deadline barline 4. Here,
 * the ladder against the clock: an instant generator, a slow one, and every rung failing.
 */
import { describe, expect, it } from 'vitest'

import { jamPhraseOneSeed } from '@/session/session-seed-plan'
import { cutoverAt, nextPhraseDeadline } from '@/session/session-timing'
import { DEFAULT_SESSION_SEED, type GenerationRequestOutput } from '../session/session-harness'
import { attemptsOf, handover, ONE_MEASURE } from './jam-phrase-one-fixtures'
import {
  engineOutputs,
  phraseOneRequests,
  rigBarline,
  runJam,
  type GenerationPlan,
} from './jam-phrase-one-rig'

/** Intent: barline `k` of a run, 0 at the count-in's end. */
const barline = rigBarline

// @test-link [[rule_two_measures_before_jam_phrase_one]]
describe('phrase 1 from an instant generator', () => {
  // @test-link [[rule_two_measures_before_jam_phrase_one]]
  // @test-link [[rule_jam_runs_as_session_from_phrase_one]]
  it.each([60, 120, 180])(
    'is shown at the generation measure end and sounds one measure later, at %i BPM',
    (tempo) => {
      const run = runJam({ tempo, doodle: ONE_MEASURE, until: 10 + 12 * (240 / tempo) })
      const shown = run.capture.find((output) => output.kind === 'phrase-one-shown')
      expect(shown).toMatchObject({ shownAt: barline(run, 2), soundsAt: barline(run, 3) })
      expect(handover(run).soundsAt).toBe(barline(run, 3))
      expect(attemptsOf(run)).toEqual([[0, expect.closeTo(barline(run, 1) + 0.038, 9)]])
      expect(engineOutputs(run, 'phrase-ready')[0]?.output.phrase).toMatchObject({
        phraseNumber: 1,
        origin: 'carry-in',
      })
    },
  )

  // @test-link [[module_session_look_ahead_timing]]
  it("asks phrase 2 once phrase 1 is handed over, due at the start of phrase 1's last measure", () => {
    const run = runJam({ tempo: 120, doodle: ONE_MEASURE, until: 20 })
    const phraseTwo = run.requests.filter((entry) => entry.request.phraseNumber === 2)
    expect(phraseTwo).toHaveLength(1)
    const soundsAt = barline(run, 3)
    expect(phraseTwo[0]!.request.deadline).toBe(nextPhraseDeadline(soundsAt, 120))
    expect(phraseTwo[0]!.request.deadline).toBe(barline(run, 6))
    expect(phraseTwo[0]!.at).toBe(handover(run).at)
  })
})

/**
 * Intent: a slow double at 120 BPM: every rung 1 attempt fails after 1 s, rung 2 runs on for 2 s,
 * rung 3 answers after 0.3 s.
 */
function slow(request: GenerationRequestOutput): GenerationPlan {
  if (request.phraseNumber !== 1) return { after: 0, answer: 'real' }
  if (request.retry < 4) return { after: 1, answer: 'search_limit_exceeded' }
  return request.retry === 4 ? { after: 2, answer: 'real' } : { after: 0.3, answer: 'real' }
}

// @test-link [[rule_jam_phrase_one_failure_ladder]]
describe('phrase 1 from a slow generator', () => {
  // @test-link [[rule_jam_phrase_one_failure_ladder]]
  // @test-link [[rule_jam_phrase_one_deadline]]
  it('climbs the rungs in order and extends the wait by whole measures', () => {
    const run = runJam({ tempo: 120, doodle: ONE_MEASURE, until: 30, generate: slow })
    const start = barline(run, 1) + 0.038
    const deadline = barline(run, 4)
    expect(attemptsOf(run)).toEqual([
      [0, expect.closeTo(start, 9)],
      [1, expect.closeTo(start + 1, 9)],
      [2, expect.closeTo(start + 2, 9)],
      [3, expect.closeTo(start + 3, 9)],
      [4, expect.closeTo(start + 4, 9)],
      [5, expect.closeTo(cutoverAt(deadline), 9)],
    ])
    const steps = phraseOneRequests(run).map(({ request }) => request.step)
    expect(steps).toEqual([
      'carry-in',
      'carry-in',
      'carry-in',
      'carry-in',
      'standalone',
      'standalone',
    ])
    const rungTwo = phraseOneRequests(run)[4]!.request.attemptId
    expect(engineOutputs(run, 'cancel-generation').map((entry) => entry.output.attemptId)).toEqual([
      rungTwo,
    ])
    // Ready at the cutover plus 0.3 s, inside measure 3: shown at barline 4, two measures late.
    const shown = run.capture.find((output) => output.kind === 'phrase-one-shown')
    expect(shown).toMatchObject({ shownAt: barline(run, 4), soundsAt: barline(run, 5) })
    expect(engineOutputs(run, 'phrase-ready')[0]?.output.phrase).toMatchObject({
      phraseNumber: 1,
      origin: 'standalone',
    })
  })

  // @test-link [[rule_jam_phrase_one_failure_ladder]]
  it.each([60, 120, 180])(
    'starts no rung 1 or 2 attempt with less than the reserve left, at %i BPM',
    (tempo) => {
      const run = runJam({
        tempo,
        doodle: ONE_MEASURE,
        until: 10 + 14 * (240 / tempo),
        generate: (request) =>
          request.phraseNumber === 1 && request.retry < 5
            ? { after: 0.45, answer: 'search_limit_exceeded' }
            : { after: 0.1, answer: 'real' },
      })
      const cutover = cutoverAt(barline(run, 4))
      const requests = phraseOneRequests(run)
      expect(requests.at(-1)?.request.retry).toBe(5)
      for (const { at, request } of requests.slice(0, -1)) {
        expect(request.retry).toBeLessThan(5)
        expect(at).toBeLessThan(cutover)
      }
      expect(handover(run).soundsAt).toBeLessThanOrEqual(barline(run, 5))
    },
  )

  // @test-link [[rule_jam_phrase_one_failure_ladder]]
  // @test-link [[rule_session_generation_failure_ladder]]
  it('skips the retries after a search that covered every candidate, and a skip shifts no seed', () => {
    const run = runJam({
      tempo: 120,
      doodle: ONE_MEASURE,
      until: 30,
      generate: (request) =>
        request.phraseNumber === 1 && request.retry === 0
          ? { after: 0.2, answer: 'no_legal_pitch_plan' }
          : { after: 0.1, answer: 'real' },
    })
    expect(attemptsOf(run).map(([index]) => index)).toEqual([0, 4])
    expect(phraseOneRequests(run).map(({ request }) => request.intent.seed)).toEqual([
      jamPhraseOneSeed(DEFAULT_SESSION_SEED, 0),
      jamPhraseOneSeed(DEFAULT_SESSION_SEED, 4),
    ])
    expect(phraseOneRequests(run)[1]!.request.intent.steering).toBeDefined()
    expect(phraseOneRequests(run)[1]!.request.intent.carryIn).toBeUndefined()
  })
})

// @test-link [[rule_jam_ends_when_phrase_one_never_comes]]
describe('every rung failing', () => {
  // @test-link [[rule_jam_ends_when_phrase_one_never_comes]]
  // @test-link [[rule_count_in_ending_returns_to_idle]]
  it('ends the Jam at the deadline as a count-in end, the engine reporting no phrase 1', () => {
    const run = runJam({
      tempo: 120,
      doodle: ONE_MEASURE,
      until: 40,
      generate: () => ({ after: 0.2, answer: 'search_limit_exceeded' }),
    })
    expect(attemptsOf(run).map(([index]) => index)).toEqual([0, 1, 2, 3, 4, 5])
    expect(engineOutputs(run, 'ended').map((entry) => entry.output)).toEqual([
      {
        kind: 'ended',
        at: barline(run, 4),
        cause: 'no-phrase-one',
        phase: 'count-in',
        soundedPhraseCount: 0,
      },
    ])
    expect(engineOutputs(run, 'phrase-ready')).toEqual([])
    expect(run.capture.some((output) => output.kind === 'phrase-one-shown')).toBe(false)
  })

  // @test-link [[rule_dropped_attempt_cancelled]]
  it('cancels the attempt still running at the deadline', () => {
    const run = runJam({
      tempo: 120,
      doodle: ONE_MEASURE,
      until: 40,
      generate: () => ({ after: 30, answer: 'real' }),
    })
    const requests = phraseOneRequests(run)
    expect(requests.map(({ request }) => request.retry)).toEqual([0, 5])
    const cancelled = engineOutputs(run, 'cancel-generation').map((entry) => entry.output.attemptId)
    expect(cancelled).toEqual(requests.map(({ request }) => request.attemptId))
    expect(engineOutputs(run, 'ended')[0]?.output).toMatchObject({ cause: 'no-phrase-one' })
  })
})
