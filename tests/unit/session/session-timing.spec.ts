/**
 * The session's clock-free timing: phrase 1 is the Idle phrase, phrase 2 is requested at start
 * with its deadline at the count-in's end, phrase N+1 is requested when phrase N starts sounding
 * with its deadline at the start of N's last measure, and tempo only ever sets those times.
 */

import { describe, expect, it } from 'vitest'

import { deriveCarryIn } from '@/domain/generation/carry-in/carry-in-derivation'
import {
  STANDALONE_BUDGET_SECONDS,
  STANDALONE_RESERVE_SECONDS,
  WORKER_RESPAWN_SECONDS,
  cutoverAt,
  sessionLengthSeconds,
  standaloneDue,
} from '@/session/session-timing'
import type { SessionOutput } from '@/session/session-types'
import { SessionDriver, phraseOneFor, sessionSettings, withoutTempo } from './session-harness'

// @test-link [[rule_phrase_one_is_idle_phrase]]
// @test-link [[service_session_engine]]
describe('phrase 1 is the Idle phrase', () => {
  // @test-link [[rule_phrase_one_is_idle_phrase]]
  it('requests no phrase 1 and requests phrase 2 at start with the carry-in of phrase 1', () => {
    const driver = new SessionDriver({ at: 2 })
    const requests = driver.requests()
    expect(requests).toHaveLength(1)
    expect(requests[0]!.phraseNumber).toBe(2)
    expect(requests[0]!.step).toBe('carry-in')
    expect(requests[0]!.retry).toBe(0)
    expect(requests[0]!.attemptId).toBe(1)
    expect(requests[0]!.intent.carryIn).toEqual(
      deriveCarryIn({ ...driver.phraseOne, phraseNumber: 1 }),
    )
  })

  // @test-link [[rule_phrase_one_is_idle_phrase]]
  it('makes the Idle phrase, unchanged, the phrase that sounds when the count-in is over', () => {
    const driver = new SessionDriver({ at: 2 })
    driver.accept(2.5)
    const outputs = driver.countInOver(3)
    expect(outputs).toEqual([
      {
        kind: 'phrase-sounding',
        at: 3,
        phrase: {
          phraseNumber: 1,
          origin: 'idle',
          intent: driver.phraseOne.intent,
          outcome: driver.phraseOne.outcome,
        },
        tempo: driver.settings.controls.tempo,
      },
    ])
    expect(outputs[0]!.kind === 'phrase-sounding' && outputs[0]!.phrase.intent).toBe(
      driver.phraseOne.intent,
    )
  })
})

/** Intent: the measure length at a tempo, in seconds: four beats. */
function measureAt(tempo: number): number {
  return 240 / tempo
}

// @test-link [[rule_look_ahead_deadline]]
// @test-link [[module_session_look_ahead_timing]]
describe('look-ahead deadlines', () => {
  // @test-link [[rule_look_ahead_deadline]]
  it.each([60, 120, 240])('places every deadline on the measure grid at %i BPM', (tempo) => {
    const m = measureAt(tempo)
    const t0 = 10
    const settings = sessionSettings({ tempo })
    const driver = new SessionDriver({ at: t0, settings, phraseOne: phraseOneFor(settings) })
    // A carry-in request also wakes at its cutover; at 240 BPM phrase 2's one-measure deadline is
    // within the standalone reserve, so its standalone attempt is requested first, with no cutover.
    const phraseTwoCarriesIn = m > STANDALONE_RESERVE_SECONDS
    expect(driver.startOutputs).toEqual([
      expect.objectContaining({
        kind: 'request-generation',
        phraseNumber: 2,
        step: phraseTwoCarriesIn ? 'carry-in' : 'standalone',
        deadline: t0 + m,
      }),
      ...(phraseTwoCarriesIn ? [{ kind: 'wake-at', at: cutoverAt(t0 + m) }] : []),
      { kind: 'wake-at', at: t0 + m },
    ])
    driver.accept(t0 + 0.1 * m)
    expect(driver.countInOver(t0 + m)).toEqual([
      { kind: 'phrase-tempo', phraseNumber: 2, tempo },
      expect.objectContaining({ kind: 'phrase-sounding', tempo }),
    ])

    const phraseTwoAt = t0 + 5 * m
    const atPhraseTwo = driver.sounding(phraseTwoAt, 2)
    expect(atPhraseTwo).toEqual([
      expect.objectContaining({ kind: 'phrase-sounding', at: phraseTwoAt }),
      expect.objectContaining({
        kind: 'request-generation',
        phraseNumber: 3,
        deadline: phraseTwoAt + 3 * m,
      }),
      { kind: 'wake-at', at: cutoverAt(phraseTwoAt + 3 * m) },
      { kind: 'wake-at', at: phraseTwoAt + 3 * m },
    ])
    driver.accept(phraseTwoAt + 0.1 * m)

    const phraseThreeAt = phraseTwoAt + 4 * m
    driver.sounding(phraseThreeAt, 3)
    expect(driver.lastRequest()).toMatchObject({ phraseNumber: 4, deadline: phraseThreeAt + 3 * m })
    expect(driver.all('wake-at').map((wake) => wake.at)).toEqual([
      ...(phraseTwoCarriesIn ? [cutoverAt(t0 + m)] : []),
      t0 + m,
      cutoverAt(phraseTwoAt + 3 * m),
      phraseTwoAt + 3 * m,
      cutoverAt(phraseThreeAt + 3 * m),
      phraseThreeAt + 3 * m,
    ])
  })

  // @test-link [[rule_look_ahead_deadline]]
  it('gives every attempt of one phrase the same deadline', () => {
    const settings = sessionSettings({ tempo: 60 })
    const driver = new SessionDriver({ at: 0, settings, phraseOne: phraseOneFor(settings) })
    driver.fail(0.1)
    driver.crash(0.2)
    expect(driver.requests(2).map((request) => request.deadline)).toEqual([4, 4, 4])
  })
})

/**
 * Intent: one event script in measures, run at a tempo: a failure then a success for phrase 2, a
 * success for phrase 3, an attempt still in flight at phrase 4's deadline, then phrase 5's request.
 * Returns every request the engine made.
 */
function runScriptAt(
  tempo: number,
): readonly Extract<SessionOutput, { kind: 'request-generation' }>[] {
  const m = measureAt(tempo)
  const settings = sessionSettings({ tempo })
  const driver = new SessionDriver({ at: 0, settings, phraseOne: phraseOneFor(settings) })
  driver.fail(0.1 * m)
  driver.accept(0.2 * m)
  driver.countInOver(m)
  driver.sounding(5 * m, 2)
  driver.accept(5.1 * m)
  driver.sounding(9 * m, 3)
  driver.tick(12 * m)
  driver.sounding(13 * m, 4)
  driver.fail(13.5 * m)
  return driver.requests()
}

// @test-link [[rule_tempo_never_affects_generation]]
// @test-link [[module_session_look_ahead_timing]]
describe('tempo only sets the times', () => {
  // @test-link [[rule_tempo_never_affects_generation]]
  it('builds identical request intents at 60, 120 and 180 BPM, tempo aside', () => {
    // At 240 BPM phrase 2's standalone attempt goes first; that it then generates what it would
    // after three failed carry-in retries is covered in session-engine-cutover.spec.ts.
    const runs = [60, 120, 180].map((tempo) => runScriptAt(tempo))
    const reference = runs[0]!.map((request) => withoutTempo(request.intent))
    expect(reference).toHaveLength(6)
    for (const run of runs) {
      expect(run.map((request) => withoutTempo(request.intent))).toEqual(reference)
      expect(run.map(({ phraseNumber, step, retry }) => ({ phraseNumber, step, retry }))).toEqual(
        runs[0]!.map(({ phraseNumber, step, retry }) => ({ phraseNumber, step, retry })),
      )
    }
    expect(runs.map((run) => run[0]!.intent.controls.tempo)).toEqual([60, 120, 180])
  })
})

// @test-link [[rule_session_generation_failure_ladder]]
// @test-link [[module_session_look_ahead_timing]]
describe('the standalone reserve before each deadline', () => {
  // @test-link [[module_session_look_ahead_timing]]
  it('reserves the standalone budget plus the worker respawn cost', () => {
    expect(STANDALONE_BUDGET_SECONDS).toBe(0.95)
    expect(WORKER_RESPAWN_SECONDS).toBe(0.125)
    expect(STANDALONE_RESERVE_SECONDS).toBe(STANDALONE_BUDGET_SECONDS + WORKER_RESPAWN_SECONDS)
    expect(STANDALONE_RESERVE_SECONDS).toBeCloseTo(1.075, 12)
    expect(cutoverAt(10)).toBe(10 - STANDALONE_RESERVE_SECONDS)
  })

  // @test-link [[rule_session_generation_failure_ladder]]
  it('makes the standalone attempt due from the cutover time on, the cutover included', () => {
    const deadline = 10
    const cutover = cutoverAt(deadline)
    expect(standaloneDue(cutover - 1e-9, deadline)).toBe(false)
    expect(standaloneDue(0, deadline)).toBe(false)
    expect(standaloneDue(cutover, deadline)).toBe(true)
    expect(standaloneDue(cutover + 0.5, deadline)).toBe(true)
    expect(standaloneDue(deadline, deadline)).toBe(true)
  })

  // @test-link [[rule_session_generation_failure_ladder]]
  it("is already due at phrase 2's request at 240 BPM, and not at 60 or 120 BPM", () => {
    expect(standaloneDue(0, measureAt(240))).toBe(true)
    expect(standaloneDue(0, measureAt(120))).toBe(false)
    expect(standaloneDue(0, measureAt(60))).toBe(false)
    expect(standaloneDue(0, 3 * measureAt(240))).toBe(false)
  })
})

// @test-link [[entity_kept_session_record]]
describe("a session's length", () => {
  // @test-link [[entity_kept_session_record]]
  it("runs from phrase 1's start to the end of the last phrase at its tempo, wherever time starts", () => {
    // Four measures at 120 BPM last 8 s.
    expect(sessionLengthSeconds({ startedAt: 2.5 }, { startedAt: 22.5, tempo: 120 })).toBe(28)
    expect(sessionLengthSeconds({ startedAt: 0 }, { startedAt: 20, tempo: 120 })).toBe(28)
    // One phrase at 60 BPM: its four measures, 16 s.
    expect(sessionLengthSeconds({ startedAt: 4 }, { startedAt: 4, tempo: 60 })).toBe(16)
  })
})
