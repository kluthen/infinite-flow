/**
 * A fresh Jam from the doodle to phrase 1, on the fake clock with the held-generation double
 * (jam-phrase-one-rig.ts): the real capture, the real ladder and a real session engine started
 * without phrase 1. A one-measure doodle (four quarter notes from the count-in's end) ends by
 * silence at barline 1; measure 1 is the generation measure, phrase 1's deadline barline 4.
 */
import { describe, expect, it } from 'vitest'

import { makeSeed } from '@/domain/random/seed'
import { lockedBarsOfOutcome } from '@/session/rhythm-lock-session'
import { jamPhraseOneSeed } from '@/session/session-seed-plan'
import { cutoverAt, nextPhraseDeadline } from '@/session/session-timing'
import {
  DEFAULT_SESSION_SEED,
  sessionSettings,
  type GenerationRequestOutput,
} from '../session/session-harness'
import {
  engineOutputs,
  phraseOneRequests,
  rigBarline,
  runJam,
  type BeatNote,
  type GenerationPlan,
  type JamRun,
} from './jam-phrase-one-rig'

/** A one-measure doodle: C, D, E, F, a quarter note each, from the count-in's end. */
const ONE_MEASURE: readonly BeatNote[] = [
  [60, 0, 1],
  [62, 1, 1],
  [64, 2, 1],
  [65, 3, 1],
]

/** Intent: barline `k` of a run, 0 at the count-in's end. */
const barline = rigBarline

/** Intent: the hand-over the ladder made, failing when none was made. */
function handover(run: JamRun) {
  const events = run.ladder.flatMap((output) =>
    output.kind === 'session-event' && output.event.kind === 'phrase-one' ? [output.event] : [],
  )
  expect(events).toHaveLength(1)
  return events[0]!
}

/** Intent: phrase 1's attempts as their seed-plan index (the request's retry) and start time. */
function attemptsOf(run: JamRun): [number, number][] {
  return phraseOneRequests(run).map(({ at, request }) => [request.retry, at])
}

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

/** Intent: Jam's settings at 120 BPM with its rhythm lock on, a strict lock. */
function lockedSettings() {
  return { ...sessionSettings({ tempo: 120 }), rhythmLockOn: true }
}

// @test-link [[rule_locked_rhythm_is_phrase_one]]
describe("with Jam's rhythm lock on", () => {
  // @test-link [[rule_locked_rhythm_is_phrase_one]]
  // @test-link [[rule_every_jam_phrase_carries_doodle]]
  it("asks phrase 1 nearest the doodle (lock pending, with the block), then holds phrase 1's rhythm", () => {
    const run = runJam({ tempo: 120, doodle: ONE_MEASURE, until: 20, settings: lockedSettings() })
    const [phraseOne] = phraseOneRequests(run)
    expect(phraseOne!.request.intent.rhythmLock).toEqual({
      state: { kind: 'pending' },
      allowedChanges: [],
      tenserPhrase: false,
    })
    expect(phraseOne!.request.intent.steering).toBeDefined()
    const decided = engineOutputs(run, 'phrase-ready')[0]!.output.phrase
    const phraseTwo = run.requests.find(({ request }) => request.phraseNumber === 2)!
    expect(phraseTwo.request.intent.rhythmLock?.state).toEqual({
      kind: 'locked',
      bars: lockedBarsOfOutcome(decided.outcome),
    })
  })

  // @test-link [[rule_locked_rhythm_is_phrase_one]]
  it("holds a rung 3 phrase 1's own rhythm, asked with no block and no lock group", () => {
    const run = runJam({
      tempo: 120,
      doodle: ONE_MEASURE,
      until: 20,
      settings: lockedSettings(),
      generate: (request) =>
        request.phraseNumber === 1 && request.retry < 5
          ? { after: 0.1, answer: 'search_limit_exceeded' }
          : { after: 0.1, answer: 'real' },
    })
    const standalone = phraseOneRequests(run).at(-1)!.request
    expect(standalone.retry).toBe(5)
    expect(standalone.intent.rhythmLock).toBeUndefined()
    expect(standalone.intent.steering).toBeUndefined()
    const decided = engineOutputs(run, 'phrase-ready')[0]!.output.phrase
    expect(decided.intent).toBe(standalone.intent)
    const phraseTwo = run.requests.find(({ request }) => request.phraseNumber === 2)!
    expect(phraseTwo.request.intent.rhythmLock?.state).toEqual({
      kind: 'locked',
      bars: lockedBarsOfOutcome(decided.outcome),
    })
  })
})

// @test-link [[rule_jam_phrase_one_joins_doodle]]
describe('a doodle whose last note gives no join', () => {
  // @test-link [[rule_jam_phrase_one_joins_doodle]]
  // @test-link [[rule_jam_phrase_one_failure_ladder]]
  it('starts at rung 2: the block, no join, with its own seed', () => {
    const run = runJam({
      tempo: 120,
      doodle: [...ONE_MEASURE.slice(0, 3), [110, 3, 1]],
      until: 20,
    })
    const [first] = phraseOneRequests(run)
    expect(first!.request.retry).toBe(4)
    expect(first!.request.step).toBe('standalone')
    expect(first!.request.intent.carryIn).toBeUndefined()
    expect(first!.request.intent.steering).toBeDefined()
    expect(first!.request.intent.seed).toBe(jamPhraseOneSeed(DEFAULT_SESSION_SEED, 4))
  })
})

/** A one-measure doodle of sixteenth notes, which reads as Sixteenth. */
const SIXTEENTHS: readonly BeatNote[] = Array.from({ length: 16 }, (_, index) => [
  60 + (index % 5),
  index / 4,
  1 / 4,
])

// @test-link [[rule_session_density_only_steps_down]]
describe('the narrow-window step-down', () => {
  // @test-link [[rule_session_density_only_steps_down]]
  // @test-link [[rule_doodle_sixteenth_on_narrow_screens]]
  it('applies from phrase 1: a Sixteenth read from the doodle generates as Eighth below the width', () => {
    const run = runJam({ tempo: 120, doodle: SIXTEENTHS, until: 20, below: () => true })
    const [first] = phraseOneRequests(run)
    const attempt = run.ladder.find(
      (output) => output.kind === 'session-event' && output.event.kind === 'phrase-one-attempt',
    )
    expect(
      attempt?.kind === 'session-event' &&
        attempt.event.kind === 'phrase-one-attempt' &&
        attempt.event.settings.controls.noteDensity,
    ).toBe('Sixteenth')
    expect(first!.request.intent.controls.noteDensity).toBe('Eighth')
  })
})
