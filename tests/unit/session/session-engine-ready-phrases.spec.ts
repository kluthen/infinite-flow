/**
 * The session engine with ready phrases in its start: each ready phrase whose intent it
 * re-derives identically at its place is decided at once with no generation request, its
 * deadline, wake-up and tempo as without it and any mutation landing reported first; the first
 * that differs is refused with every later one and requested as without pre-generation; after the
 * last ready phrase the session looks one phrase ahead as before; an invalid ready list throws.
 */

import { describe, expect, it } from 'vitest'

import { mutationFlagFor } from '@/components/workspace/workspace-session-runner'
import { makeSeed } from '@/domain/random/seed'
import type { PregenerationResult } from '@/session/session-pregeneration'
import type { ReadyPhrase } from '@/session/session-ready-phrases'
import { phraseAttemptSeed } from '@/session/session-seed-plan'
import { measureSeconds } from '@/session/session-timing'
import {
  SessionEngineError,
  type SessionSettings,
  type SuccessfulOutcome,
} from '@/session/session-types'
import { mutationPhrase, type SettingsMutationFlag } from '@/session/settings-mutation'
import {
  planSeams,
  planStart,
  plannedReadyPhrases,
  realResult,
  runPlan,
} from './pregeneration-harness'
import { createPregenerationPlan } from '@/session/session-pregeneration'
import {
  DEFAULT_SESSION_SEED,
  SessionDriver,
  failureOutcome,
  fakeViewport,
  kinds,
  sessionSettings,
  withoutRequestIds,
} from './session-harness'

/** The tempo of most sessions here: a 4 s measure, so phrase 2's carry-in rung goes first. */
const SLOW = 60

/** Intent: the moment phrase N (1 or more) starts sounding in a session started at 0. */
function soundingAt(phraseNumber: number, tempo = SLOW): number {
  return measureSeconds(tempo) * (1 + 4 * (phraseNumber - 1))
}

/** Intent: the phrase record a spent ready phrase is decided as, with no settings change. */
function spent(ready: ReadyPhrase): unknown {
  return {
    phraseNumber: ready.phraseNumber,
    origin: ready.rung === 4 ? 'standalone' : 'carry-in',
    intent: ready.intent,
    outcome: ready.outcome,
  }
}

/** Intent: the ready phrases a plan makes for a session's settings and mutation flag. */
function readyFor(
  settings: SessionSettings,
  mutation?: SettingsMutationFlag,
): readonly ReadyPhrase[] {
  return plannedReadyPhrases(
    planSeams(),
    planStart({ settings, ...(mutation === undefined ? {} : { mutation }) }),
  )
}

// @test-link [[module_session_ready_phrases]]
// @test-link [[rule_pregenerated_phrase_matches_session]]
describe('a session spending ready phrases', () => {
  // @test-link [[module_session_ready_phrases]]
  // @test-link [[rule_start_never_waits_for_pregeneration]]
  it('decides each matching ready phrase at once with no request, its tempo fixed at its deadline', () => {
    const settings = sessionSettings({ tempo: SLOW })
    const ready = readyFor(settings)
    expect(ready).toHaveLength(4)
    const driver = new SessionDriver({ settings, readyPhrases: ready })
    expect(driver.startOutputs).toEqual([
      { kind: 'phrase-ready', phrase: spent(ready[0]!) },
      { kind: 'wake-at', at: measureSeconds(SLOW) },
    ])
    expect(driver.tick(measureSeconds(SLOW))).toEqual([
      { kind: 'phrase-tempo', phraseNumber: 2, tempo: SLOW },
    ])
    driver.countInOver(soundingAt(1))
    for (let phraseNumber = 2; phraseNumber <= 4; phraseNumber += 1) {
      const at = soundingAt(phraseNumber)
      const outputs = driver.sounding(at, phraseNumber)
      expect(kinds(outputs)).toEqual(['phrase-sounding', 'phrase-ready', 'wake-at'])
      expect(outputs[1]).toEqual({ kind: 'phrase-ready', phrase: spent(ready[phraseNumber - 1]!) })
      expect(outputs[2]).toEqual({ kind: 'wake-at', at: at + 3 * measureSeconds(SLOW) })
      expect(driver.tick(at + 3 * measureSeconds(SLOW))).toEqual([
        { kind: 'phrase-tempo', phraseNumber: phraseNumber + 1, tempo: SLOW },
      ])
    }
    expect(driver.requests()).toEqual([])
    driver.sounding(soundingAt(5), 5)
    expect(driver.requests()).toHaveLength(1)
    expect(driver.lastRequest()).toMatchObject({ phraseNumber: 6, retry: 0, step: 'carry-in' })
    expect(driver.lastRequest().intent.seed).toBe(phraseAttemptSeed(DEFAULT_SESSION_SEED, 6, 0))
    expect(driver.lastRequest().intent.requestId).toBe('session-1')
  })

  // @test-link [[module_session_ready_phrases]]
  // @test-link [[rule_pregenerated_phrase_matches_session]]
  it("spends phrase 2's carry-in at 240 BPM, where the session alone requests it standalone first", () => {
    const settings = sessionSettings({ tempo: 240 })
    const ready = readyFor(settings)
    expect(ready[0]).toMatchObject({ phraseNumber: 2, rung: 0 })
    const driver = new SessionDriver({ settings, readyPhrases: ready })
    expect(kinds(driver.startOutputs)).toEqual(['phrase-ready', 'wake-at'])
    expect(driver.startOutputs[0]).toMatchObject({
      phrase: { phraseNumber: 2, origin: 'carry-in' },
    })
  })

  // @test-link [[module_session_ready_phrases]]
  it('spends a ready phrase from the standalone rung as a standalone phrase', () => {
    const settings = sessionSettings({ tempo: SLOW })
    const cutoff: PregenerationResult = {
      kind: 'generation-failure',
      code: 'search_limit_exceeded',
    }
    const { plan } = runPlan(
      createPregenerationPlan(planSeams(), planStart({ settings }), []),
      (attempt) =>
        attempt.phraseNumber === 2 && attempt.step === 'carry-in' ? cutoff : realResult(attempt),
    )
    expect(plan.readyPhrases[0]).toMatchObject({ phraseNumber: 2, rung: 4 })
    const driver = new SessionDriver({ settings, readyPhrases: plan.readyPhrases })
    expect(driver.startOutputs[0]).toEqual({
      kind: 'phrase-ready',
      phrase: spent(plan.readyPhrases[0]!),
    })
    expect(driver.startOutputs[0]).toMatchObject({ phrase: { origin: 'standalone' } })
  })

  // @test-link [[module_session_ready_phrases]]
  // @test-link [[rule_mutation_lands_on_scheduled_phrase]]
  it('reports a mutation landing on a spent phrase first, then the phrase', () => {
    const settings = sessionSettings({ tempo: SLOW })
    const mutation = mutationFlagFor(true, DEFAULT_SESSION_SEED)
    if (mutation.kind !== 'on') throw new Error('Vary settings is on.')
    const landing = mutationPhrase(mutation.seed, 1)
    const ready = readyFor(settings, mutation)
    const driver = new SessionDriver({ settings, mutation, readyPhrases: ready })
    driver.tick(measureSeconds(SLOW))
    driver.countInOver(soundingAt(1))
    for (let phraseNumber = 2; phraseNumber < landing - 1; phraseNumber += 1) {
      driver.sounding(soundingAt(phraseNumber), phraseNumber)
      driver.tick(soundingAt(phraseNumber) + 3 * measureSeconds(SLOW))
    }
    const outputs = driver.sounding(soundingAt(landing - 1), landing - 1)
    expect(kinds(outputs)).toEqual([
      'phrase-sounding',
      'settings-changed',
      'phrase-ready',
      'wake-at',
    ])
    expect(outputs[1]).toMatchObject({ phraseNumber: landing, cause: 'mutation' })
    expect(outputs[2]).toMatchObject({
      phrase: { phraseNumber: landing, intent: ready[landing - 2]!.intent },
    })
    expect(driver.requests()).toEqual([])
  })
})

// @test-link [[module_session_ready_phrases]]
// @test-link [[rule_pregenerated_phrase_matches_session]]
describe('a session refusing ready phrases', () => {
  // @test-link [[module_session_ready_phrases]]
  // @test-link [[rule_session_density_only_steps_down]]
  it('refuses ready phrases a window crossing changed and runs as without pre-generation', () => {
    const settings = sessionSettings({ tempo: SLOW, noteDensity: 'Sixteenth' })
    const ready = readyFor(settings)
    expect(ready).toHaveLength(4)
    /** Intent: a narrow-window driver, with or without the ready phrases made wide. */
    const narrow = (readyPhrases?: readonly ReadyPhrase[]) =>
      new SessionDriver({
        settings,
        viewport: fakeViewport(true),
        ...(readyPhrases === undefined ? {} : { readyPhrases }),
      })
    const withReady = narrow(ready)
    const without = narrow()
    expect(withReady.startOutputs).toEqual(without.startOutputs)
    expect(withReady.lastRequest()).toMatchObject({ phraseNumber: 2, retry: 0 })
    expect(withReady.lastRequest().intent.controls.noteDensity).toBe('Eighth')
    expect(withReady.lastRequest().intent.requestId).toBe('session-1')
    for (const driver of [withReady, without]) {
      driver.settle(0.5)
      driver.tick(measureSeconds(SLOW))
      driver.countInOver(soundingAt(1))
      for (let phraseNumber = 2; phraseNumber <= 5; phraseNumber += 1) {
        driver.sounding(soundingAt(phraseNumber), phraseNumber)
        driver.settle(soundingAt(phraseNumber) + 0.5)
      }
    }
    expect(withReady.log).toEqual(without.log)
  })

  // @test-link [[module_session_ready_phrases]]
  it('refuses every ready phrase after the first that differs, even one that would match', () => {
    const settings = sessionSettings({ tempo: SLOW })
    const ready = readyFor(settings)
    const original = ready[1]!
    const tampered: ReadyPhrase = {
      ...original,
      intent: { ...original.intent, seed: makeSeed(original.intent.seed ^ 1) },
    }
    const driver = new SessionDriver({
      settings,
      readyPhrases: [ready[0]!, tampered, ready[2]!, ready[3]!],
    })
    expect(driver.requests()).toEqual([])
    driver.tick(measureSeconds(SLOW))
    driver.countInOver(soundingAt(1))
    driver.sounding(soundingAt(2), 2)
    expect(driver.requests(3)).toHaveLength(1)
    driver.settle(soundingAt(2) + 0.5)
    const decided = driver.all('phrase-ready').at(-1)!.phrase
    expect(decided.phraseNumber).toBe(3)
    expect(withoutRequestIds(decided.intent)).toEqual(withoutRequestIds(original.intent))
    expect(withoutRequestIds(decided.outcome)).toEqual(withoutRequestIds(original.outcome))
    const outputs = driver.sounding(soundingAt(3), 3)
    expect(kinds(outputs)).not.toContain('phrase-ready')
    expect(driver.requests(4)).toHaveLength(1)
  })

  // @test-link [[module_session_ready_phrases]]
  it('looks one phrase ahead as without pre-generation after the last ready phrase', () => {
    const settings = sessionSettings({ tempo: SLOW })
    const ready = readyFor(settings).slice(0, 2)
    const driver = new SessionDriver({ settings, readyPhrases: ready })
    driver.tick(measureSeconds(SLOW))
    driver.countInOver(soundingAt(1))
    driver.sounding(soundingAt(2), 2)
    driver.tick(soundingAt(2) + 3 * measureSeconds(SLOW))
    expect(driver.requests()).toEqual([])
    const outputs = driver.sounding(soundingAt(3), 3)
    expect(kinds(outputs)).toEqual(['phrase-sounding', 'request-generation', 'wake-at', 'wake-at'])
    expect(driver.lastRequest()).toMatchObject({ phraseNumber: 4, retry: 0, step: 'carry-in' })
    expect(driver.lastRequest().intent.seed).toBe(phraseAttemptSeed(DEFAULT_SESSION_SEED, 4, 0))
    expect(driver.lastRequest().intent.requestId).toBe('session-1')
  })
})

// @test-link [[module_session_ready_phrases]]
describe('an invalid ready list', () => {
  const settings = sessionSettings({ tempo: SLOW })
  const ready = readyFor(settings)
  const failed = failureOutcome() as unknown as SuccessfulOutcome

  // @test-link [[module_session_ready_phrases]]
  it.each([
    { label: 'starts after phrase 2', list: [ready[1]!] },
    { label: 'skips a phrase', list: [ready[0]!, ready[2]!] },
    { label: 'holds five phrases', list: [...ready, { ...ready[3]!, phraseNumber: 6 }] },
    { label: 'has a rung off the ladder', list: [{ ...ready[0]!, rung: 5 }] },
    { label: 'has a fractional rung', list: [{ ...ready[0]!, rung: 1.5 }] },
    { label: 'holds a failed generation', list: [{ ...ready[0]!, outcome: failed }] },
  ])('throws when the list $label', ({ list }) => {
    expect(() => new SessionDriver({ settings, readyPhrases: list })).toThrow(SessionEngineError)
  })
})
