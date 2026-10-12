// @vitest-environment node
/**
 * Measurement M4, phrase 2 joining phrase 1 at 240 BPM after pre-generation (`npm run test:sweep`
 * only): every case of the deadline sweep, at 240 BPM, first plays the Idle phase (the
 * pre-generation plan run to completion with the real generator, no deadline, at no cost), then
 * the session as the deadline sweep plays it, its start carrying the ready phrases and every
 * attempt at its measured cost (pregeneration-sweep-measured.ts). Each note density prints one
 * `SWEEP-M4` line, and the total one more: the cases, how many have a carry-in phrase 2 and their
 * share (v2: 0 %, phrase 2 at 240 BPM always standalone), the cases per number of ready phrases,
 * the ready phrases refused and the shortfalls. Every phrase after the first must still be ready
 * strictly before its deadline with no repeat, and no ready phrase may be refused. The result
 * depends on the machine: run it idle.
 */

import { afterAll, describe, expect, it } from 'vitest'

import { OutcomeCache, sweepCases } from '../unit/session/deadline-sweep'
import { PregenerationTally, pregeneratedCase } from './pregeneration-sweep-measured'

/** The note densities, one `SWEEP-M4` line each, in the deadline sweep's spec order. */
const DENSITIES = ['Quarter', 'Eighth', 'Sixteenth'] as const

/** The counts over every case, printed once every density has run. */
const total = new PregenerationTally()

afterAll(() => {
  console.log(total.line('total'))
})

// @test-link [[req_idle_pregeneration]]
describe('M4: phrase 2 at 240 BPM after pre-generation at Idle, every supported setting and seed', () => {
  // @test-link [[req_idle_pregeneration]]
  it.each(DENSITIES)(
    'pre-generates at Idle, then meets every deadline with no repeat, %s note density',
    async (density) => {
      const outcomes = new OutcomeCache()
      const tally = new PregenerationTally()
      const shortfalls: string[] = []
      let refused = 0
      for (const sweepCase of sweepCases()) {
        if (sweepCase.rhythm.noteDensity !== density) continue
        const result = await pregeneratedCase(sweepCase, outcomes)
        tally.add(result)
        total.add(result)
        shortfalls.push(...result.shortfalls)
        refused += result.refused
      }
      console.log(tally.line(density))
      expect(shortfalls).toEqual([])
      expect(refused).toBe(0)
    },
  )
})
