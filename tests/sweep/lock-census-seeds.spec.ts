// @vitest-environment node
/**
 * The lock census runner's seeds and case labels (measurement tooling, lock-census-sweep.ts): a
 * preset group plays each case with its own phrase-1 and session seeds, derived from the case
 * index, clear of every other case's and of the sweep's, retries at Idle included; the sweep group
 * keeps the sweep's cases; the figures name the seed scheme; and a case's label names the Tension
 * across phrases it is played with.
 */

import { describe, expect, it } from 'vitest'

import { SEEDS } from '../unit/domain/generation/carry-in/carry-in-matrix'
import { IDLE_GENERATIONS, sweepCases } from '../unit/session/deadline-sweep'
import {
  SWEEP_GROUP,
  lockGroupCases,
  perCaseSeeds,
  seedScheme,
  settingGroups,
  withTensionAcrossPhrases,
} from './lock-census-sweep'

describe('lock census runner: the preset groups seed each case on its own', () => {
  const CASES = sweepCases()
  const PRESET = settingGroups('builtin')[0]!

  /** Intent: the seeds phrase 1 may be generated with from a first seed, retries included. */
  function phraseOneTries(seed: number): number[] {
    return Array.from({ length: IDLE_GENERATIONS }, (_, offset) => seed + offset)
  }

  it('derives the seeds from the case index', () => {
    expect(perCaseSeeds(0)).toEqual({ seed: 1_000, firstSessionSeed: 500_000 })
    expect(perCaseSeeds(3)).toEqual({ seed: 1_030, firstSessionSeed: 500_300 })
  })

  it('never shares a phrase-1 seed, retries included, between cases or with the sweep', () => {
    const sweepTries = new Set(SEEDS.flatMap(phraseOneTries))
    const tries = CASES.flatMap(({ index }) => phraseOneTries(perCaseSeeds(index).seed))
    expect(new Set(tries).size).toBe(tries.length)
    expect(tries.filter((seed) => sweepTries.has(seed))).toEqual([])
  })

  it('never shares a session seed, nor the hundred after it, with another case or the sweep', () => {
    const blocks = [
      ...CASES.map((sweepCase) => Math.floor(sweepCase.firstSessionSeed / 100)),
      ...CASES.map(({ index }) => Math.floor(perCaseSeeds(index).firstSessionSeed / 100)),
    ]
    expect(new Set(blocks).size).toBe(blocks.length)
    expect(CASES.every(({ index }) => perCaseSeeds(index).firstSessionSeed % 100 === 0)).toBe(true)
  })

  it('reseeds and relabels the cases of a preset group, never the sweep group', () => {
    const picked = [CASES[0]!, CASES[3]!]
    expect(lockGroupCases(SWEEP_GROUP, picked)).toEqual(picked)
    const reseeded = lockGroupCases(PRESET, picked)
    expect(reseeded.map(({ seed, firstSessionSeed }) => [seed, firstSessionSeed])).toEqual([
      [1_000, 500_000],
      [1_030, 500_300],
    ])
    expect(reseeded[1]!.label).toBe(
      PRESET.apply(picked[1]!).label.replace(`seed ${picked[1]!.seed} `, 'seed 1030 '),
    )
    expect(reseeded[1]!.label).toContain(' seed 1030 ')
  })

  it('names the seed scheme of a run', () => {
    expect(seedScheme('sweep')).toBe('sweep (7, 13)')
    const perCase = 'per case: phrase 1 1000 + 10 × case index, session 500000 + 100 × case index'
    expect(seedScheme('builtin')).toBe(perCase)
    expect(seedScheme('both')).toBe(`sweep (7, 13) for the sweep cases; ${perCase} for the presets`)
  })

  it('labels a case with the Tension across phrases it is played with', () => {
    const arcOn = CASES.find((sweepCase) => sweepCase.tensionAcrossPhrases)!
    const arcOff = CASES.find((sweepCase) => !sweepCase.tensionAcrossPhrases)!
    expect(arcOn.label).toMatch(/ (vary|fixed) arc$/)
    expect(arcOff.label).toMatch(/ (vary|fixed)$/)
    const off = withTensionAcrossPhrases(arcOn, false)
    expect(off.tensionAcrossPhrases).toBe(false)
    expect(off.label).toBe(arcOn.label.replace(/ arc$/, ''))
    expect(withTensionAcrossPhrases(arcOn, true)).toEqual(arcOn)
    const preset = PRESET.apply(arcOff)
    const on = withTensionAcrossPhrases(preset, true)
    expect(on.label).toBe(preset.label.replace(/ (vary|fixed) as /, ' $1 arc as '))
  })
})
