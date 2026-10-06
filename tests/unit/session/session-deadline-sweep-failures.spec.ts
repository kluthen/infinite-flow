// @vitest-environment node
/**
 * The look-ahead deadline sweep with injected generation failures: over a deterministic slice of
 * the sweep's cases (see deadline-sweep.ts) at 60, 120 and 240 BPM, on the fake clock with every
 * attempt costing its modelled time, a failed attempt or a rejected request on a phrase's first
 * try is recovered by the next carry-in retry, carry-in attempts failing to the end of their rungs
 * give way to the standalone retry, attempts failing until the deadline give way to a repeat
 * decided at the deadline, and two consecutive repeats show the struggling notice until a newly
 * generated phrase starts sounding. In every run the session keeps running to its planned end with
 * every phrase slot filled by its deadline.
 */

import { describe, expect, it } from 'vitest'

import { SEEDS } from '../domain/generation/carry-in/carry-in-matrix'
import { settingKey } from '../domain/generation/orchestration/cold-generation-golden/cold-generation-golden-fixture'
import {
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
  type AttemptScript,
  type SweepCase,
  type TimedSession,
} from './deadline-sweep'

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

/** Intent: run every slice case at one tempo under a script, failing on any session break. */
async function runSlice(tempo: number, script: AttemptScript): Promise<readonly TimedSession[]> {
  const runs: TimedSession[] = []
  const breaks: string[] = []
  for (const sweepCase of SLICE) {
    const run = await runTimedSession(sweepCase, tempo, outcomes, script)
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

// @test-link [[rule_look_ahead_deadline]]
describe('look-ahead deadline sweep cases', () => {
  // @test-link [[rule_look_ahead_deadline]]
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
        expect(origins(run)).toEqual(['carry-in', 'carry-in', 'carry-in', 'carry-in', 'carry-in'])
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
  it.each(SWEEP_TEMPOS)(
    'shows the struggling notice at the second repeat in a row until a generated phrase sounds at %i BPM',
    async (tempo) => {
      for (const run of await runSlice(tempo, TWO_REPEATS_IN_A_ROW)) {
        const slots = phraseSlots(run)
        expect(origins(run).slice(0, 4)).toEqual(['carry-in', 'repeat', 'repeat', 'carry-in'])
        expect(noticeChanges(run)).toEqual([
          { visible: true, at: slots[2]!.deadline },
          { visible: false, at: soundingAt(5, tempo) },
        ])
      }
    },
    SLICE_TIMEOUT_MS,
  )
})
