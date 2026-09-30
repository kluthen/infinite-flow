/**
 * The session's clock-free timing: phrase 1 is the Idle phrase, phrase 2 is requested at start
 * with its deadline at the count-in's end, phrase N+1 is requested when phrase N starts sounding
 * with its deadline at the start of N's last measure, and tempo only ever sets those times.
 */

import { describe, expect, it } from 'vitest'

import { deriveCarryIn } from '@/domain/generation/carry-in/carry-in-derivation'
import type { SessionOutput } from '@/session/session-types'
import {
  SessionDriver,
  kinds,
  phraseOneFor,
  sessionSettings,
  withoutTempo,
} from './session-harness'

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
// @test-link [[service_session_engine]]
describe('look-ahead deadlines', () => {
  // @test-link [[rule_look_ahead_deadline]]
  it.each([60, 120, 240])('places every deadline on the measure grid at %i BPM', (tempo) => {
    const m = measureAt(tempo)
    const t0 = 10
    const settings = sessionSettings({ tempo })
    const driver = new SessionDriver({ at: t0, settings, phraseOne: phraseOneFor(settings) })
    expect(driver.startOutputs).toEqual([
      expect.objectContaining({ kind: 'request-generation', phraseNumber: 2, deadline: t0 + m }),
      { kind: 'wake-at', at: t0 + m },
    ])
    driver.accept(t0 + 0.1 * m)
    expect(kinds(driver.countInOver(t0 + m))).toEqual(['phrase-sounding'])

    const phraseTwoAt = t0 + 5 * m
    const atPhraseTwo = driver.sounding(phraseTwoAt, 2)
    expect(atPhraseTwo).toEqual([
      expect.objectContaining({ kind: 'phrase-sounding', at: phraseTwoAt }),
      expect.objectContaining({
        kind: 'request-generation',
        phraseNumber: 3,
        deadline: phraseTwoAt + 3 * m,
      }),
      { kind: 'wake-at', at: phraseTwoAt + 3 * m },
    ])
    driver.accept(phraseTwoAt + 0.1 * m)

    const phraseThreeAt = phraseTwoAt + 4 * m
    driver.sounding(phraseThreeAt, 3)
    expect(driver.lastRequest()).toMatchObject({ phraseNumber: 4, deadline: phraseThreeAt + 3 * m })
    expect(driver.all('wake-at').map((wake) => wake.at)).toEqual([
      t0 + m,
      phraseTwoAt + 3 * m,
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
// @test-link [[service_session_engine]]
describe('tempo only sets the times', () => {
  // @test-link [[rule_tempo_never_affects_generation]]
  it('builds identical request intents at 60, 120 and 240 BPM, tempo aside', () => {
    const runs = [60, 120, 240].map((tempo) => runScriptAt(tempo))
    const reference = runs[0]!.map((request) => withoutTempo(request.intent))
    expect(reference).toHaveLength(6)
    for (const run of runs) {
      expect(run.map((request) => withoutTempo(request.intent))).toEqual(reference)
      expect(run.map(({ phraseNumber, step, retry }) => ({ phraseNumber, step, retry }))).toEqual(
        runs[0]!.map(({ phraseNumber, step, retry }) => ({ phraseNumber, step, retry })),
      )
    }
    expect(runs.map((run) => run[0]!.intent.controls.tempo)).toEqual([60, 120, 240])
  })
})
