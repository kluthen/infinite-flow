// @vitest-environment node
/**
 * The full look-ahead deadline sweep, Sixteenth note density (`npm run test:sweep` only): every supported
 * rhythm setting with Sixteenth density, crossed with the seed matrix's seeds, runs a six-phrase session
 * through the real session runner and the real generator at 60, 120 and 240 BPM, on the fake clock
 * where every attempt costs its measured time (deadline-sweep-measured.ts). Every phrase after the
 * first must be generated, with or without carry-in, strictly before its deadline, with no repeat,
 * and the session must reach its planned end. The result depends on the machine: run it idle.
 */

import { describe, expect, it } from 'vitest'

import { OutcomeCache, SWEEP_TEMPOS, sweepCases } from '../unit/session/deadline-sweep'
import { deadlineShortfalls } from './deadline-sweep-measured'

/** The sweep cases of this note density. */
const CASES = sweepCases().filter((sweepCase) => sweepCase.rhythm.noteDensity === 'Sixteenth')

/** The real outcomes and generation times of these cases, measured once, shared by the tempos. */
const outcomes = new OutcomeCache()

// @test-link [[rule_look_ahead_deadline]]
describe('look-ahead deadline sweep, Sixteenth note density, every supported setting and seed', () => {
  // @test-link [[rule_look_ahead_deadline]]
  it.each(SWEEP_TEMPOS)(
    'generates every phrase after the first before its deadline, each attempt at its measured cost, at %i BPM',
    async (tempo) => {
      const shortfalls: string[] = []
      for (const sweepCase of CASES)
        shortfalls.push(...(await deadlineShortfalls(sweepCase, tempo, outcomes)))
      expect(shortfalls).toEqual([])
    },
  )
})
