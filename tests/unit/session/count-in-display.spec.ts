/**
 * The on-screen count-in, on the audio clock: four beats, all muted before the first click; the
 * beat that clicks is current and the earlier ones past; the row empties once the count-in is
 * over; and each state names the audio time it next changes at.
 */

import { describe, expect, it } from 'vitest'

import { countInDisplayAt, type CountInDisplay } from '@/session/count-in-display'

const START_AT = 10
const EPSILON = 1e-6

/** Intent: when count-in beat `k` (0-based) clicks, by independent arithmetic. */
function beatTime(tempo: number, k: number): number {
  return START_AT + (k * 60) / tempo
}

/** Intent: the display while the count-in runs, failing the test when it is over. */
function running(display: CountInDisplay): Extract<CountInDisplay, { over: false }> {
  if (display.over) throw new Error('expected the count-in to be running')
  return display
}

// @test-link [[rule_count_in_shown_on_screen]]
describe('the count-in shown on screen', () => {
  for (const tempo of [120, 90]) {
    // @test-link [[rule_count_in_shown_on_screen]]
    it(`shows four muted beats before the first click at ${tempo} BPM`, () => {
      const display = running(countInDisplayAt(START_AT, tempo, START_AT - EPSILON))
      expect(display.beats).toEqual(['muted', 'muted', 'muted', 'muted'])
      expect(display.nextChangeAt).toBeCloseTo(beatTime(tempo, 0), 9)
    })

    // @test-link [[rule_count_in_shown_on_screen]]
    it(`marks the clicking beat current and earlier beats past at ${tempo} BPM`, () => {
      const expected = [
        ['current', 'muted', 'muted', 'muted'],
        ['past', 'current', 'muted', 'muted'],
        ['past', 'past', 'current', 'muted'],
        ['past', 'past', 'past', 'current'],
      ]
      for (let k = 0; k < 4; k += 1) {
        for (const now of [beatTime(tempo, k), beatTime(tempo, k) + EPSILON]) {
          const display = running(countInDisplayAt(START_AT, tempo, now))
          expect(display.beats).toEqual(expected[k])
          expect(display.nextChangeAt).toBeCloseTo(beatTime(tempo, k + 1), 9)
        }
        if (k > 0) {
          const before = running(countInDisplayAt(START_AT, tempo, beatTime(tempo, k) - EPSILON))
          expect(before.beats).toEqual(expected[k - 1])
          expect(before.nextChangeAt).toBeCloseTo(beatTime(tempo, k), 9)
        }
      }
    })

    // @test-link [[rule_count_in_shown_on_screen]]
    it(`empties the row when the count-in is over at ${tempo} BPM`, () => {
      const countInEnd = beatTime(tempo, 4)
      const lastBeat = running(countInDisplayAt(START_AT, tempo, countInEnd - EPSILON))
      expect(lastBeat.beats).toEqual(['past', 'past', 'past', 'current'])
      expect(lastBeat.nextChangeAt).toBeCloseTo(countInEnd, 9)
      expect(countInDisplayAt(START_AT, tempo, countInEnd)).toEqual({ over: true })
      expect(countInDisplayAt(START_AT, tempo, countInEnd + EPSILON)).toEqual({ over: true })
    })
  }

  // @test-link [[rule_count_in_shown_on_screen]]
  it('rejects a tempo that is not a finite positive number', () => {
    expect(() => countInDisplayAt(START_AT, 0, START_AT)).toThrow(/tempo/u)
  })
})
