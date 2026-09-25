import { describe, expect, it } from 'vitest'

import { makeActiveConcertRange } from '@/domain/profile/active-concert-range'
import { registerWindowContainsPitch } from '@/domain/profile/register-window'
import {
  REGISTER_WINDOW_ALGORITHM_V1,
  RegisterWindowDerivationError,
  deriveRegisterWindowCandidates,
  type RegisterWindowPolicy,
} from '@/domain/profile/register-window-derivation'

const POLICY: RegisterWindowPolicy = {
  algorithm: REGISTER_WINDOW_ALGORITHM_V1,
  minimumSpan: 12,
  widthNumerator: 1,
  widthDenominator: 2,
}

// Literal expected windows, transcribed directly from the adopted-profile table rather than
// computed with the derivation formula under test — a formula-derived expectation would prove
// nothing.
const ADOPTED_PROFILE_CASES = [
  {
    name: 'C MIDI keyboard (48-72)',
    activeRange: { minMidi: 48, maxMidi: 72 },
    expectedLow: { minMidi: 48, maxMidi: 60 },
    expectedMiddle: { minMidi: 54, maxMidi: 66 },
    expectedHigh: { minMidi: 60, maxMidi: 72 },
  },
  {
    name: 'B-flat tenor saxophone (46-70)',
    activeRange: { minMidi: 46, maxMidi: 70 },
    expectedLow: { minMidi: 46, maxMidi: 58 },
    expectedMiddle: { minMidi: 52, maxMidi: 64 },
    expectedHigh: { minMidi: 58, maxMidi: 70 },
  },
  {
    name: 'E-flat alto saxophone (51-75)',
    activeRange: { minMidi: 51, maxMidi: 75 },
    expectedLow: { minMidi: 51, maxMidi: 63 },
    expectedMiddle: { minMidi: 57, maxMidi: 69 },
    expectedHigh: { minMidi: 63, maxMidi: 75 },
  },
] as const

// @test-link [[module_register_window_resolution_primitives]]
describe('deriveRegisterWindowCandidates: adopted profile literal expectations', () => {
  it.each(ADOPTED_PROFILE_CASES)(
    '$name derives the exact documented Low/Middle/High windows',
    ({ activeRange, expectedLow, expectedMiddle, expectedHigh }) => {
      const range = makeActiveConcertRange(activeRange.minMidi, activeRange.maxMidi)

      const candidates = deriveRegisterWindowCandidates(range, POLICY)

      expect(candidates[0]?.window.minMidi).toBe(expectedLow.minMidi)
      expect(candidates[0]?.window.maxMidi).toBe(expectedLow.maxMidi)
      expect(candidates[1]?.window.minMidi).toBe(expectedMiddle.minMidi)
      expect(candidates[1]?.window.maxMidi).toBe(expectedMiddle.maxMidi)
      expect(candidates[2]?.window.minMidi).toBe(expectedHigh.minMidi)
      expect(candidates[2]?.window.maxMidi).toBe(expectedHigh.maxMidi)
    },
  )

  it.each(ADOPTED_PROFILE_CASES)(
    '$name: every window is contained in the active range',
    ({ activeRange }) => {
      const range = makeActiveConcertRange(activeRange.minMidi, activeRange.maxMidi)
      const candidates = deriveRegisterWindowCandidates(range, POLICY)

      for (const candidate of candidates) {
        expect(candidate.window.minMidi).toBeGreaterThanOrEqual(range.minMidi)
        expect(candidate.window.maxMidi).toBeLessThanOrEqual(range.maxMidi)
      }
    },
  )

  it.each(ADOPTED_PROFILE_CASES)('$name: adjacent windows intersect', ({ activeRange }) => {
    const range = makeActiveConcertRange(activeRange.minMidi, activeRange.maxMidi)
    const candidates = deriveRegisterWindowCandidates(range, POLICY)
    const [low, middle, high] = candidates

    expect(low!.window.maxMidi).toBeGreaterThanOrEqual(middle!.window.minMidi)
    expect(middle!.window.maxMidi).toBeGreaterThanOrEqual(high!.window.minMidi)
  })

  it.each(ADOPTED_PROFILE_CASES)(
    '$name: every window spans exactly 13 pitches',
    ({ activeRange }) => {
      const range = makeActiveConcertRange(activeRange.minMidi, activeRange.maxMidi)
      const candidates = deriveRegisterWindowCandidates(range, POLICY)

      for (const candidate of candidates) {
        expect(candidate.window.maxMidi - candidate.window.minMidi + 1).toBe(13)
      }
    },
  )

  it.each(ADOPTED_PROFILE_CASES)(
    '$name: adjacent windows overlap by exactly 7 positions',
    ({ activeRange }) => {
      const range = makeActiveConcertRange(activeRange.minMidi, activeRange.maxMidi)
      const candidates = deriveRegisterWindowCandidates(range, POLICY)
      const [low, middle, high] = candidates

      const lowMiddleOverlap = low!.window.maxMidi - middle!.window.minMidi + 1
      const middleHighOverlap = middle!.window.maxMidi - high!.window.minMidi + 1

      expect(lowMiddleOverlap).toBe(7)
      expect(middleHighOverlap).toBe(7)
    },
  )
})

// @test-link [[module_register_window_resolution_primitives]]
describe('deriveRegisterWindowCandidates: canonical candidate identity and order', () => {
  it('returns candidates in canonical order Low, Middle, High with indices 0, 1, 2', () => {
    const range = makeActiveConcertRange(48, 72)
    const candidates = deriveRegisterWindowCandidates(range, POLICY)

    expect(candidates.map((candidate) => candidate.id)).toEqual(['Low', 'Middle', 'High'])
    expect(candidates.map((candidate) => candidate.canonicalIndex)).toEqual([0, 1, 2])
  })
})

// @test-link [[module_register_window_resolution_primitives]]
describe('deriveRegisterWindowCandidates: boundary MIDI edges', () => {
  it.each(ADOPTED_PROFILE_CASES)(
    '$name: pitches exactly at each window edge are inside, one semitone beyond is outside',
    ({ activeRange }) => {
      const range = makeActiveConcertRange(activeRange.minMidi, activeRange.maxMidi)
      const candidates = deriveRegisterWindowCandidates(range, POLICY)

      for (const candidate of candidates) {
        const { window } = candidate
        expect(registerWindowContainsPitch(window, window.minMidi)).toBe(true)
        expect(registerWindowContainsPitch(window, window.maxMidi)).toBe(true)
        expect(registerWindowContainsPitch(window, window.minMidi - 1)).toBe(false)
        expect(registerWindowContainsPitch(window, window.maxMidi + 1)).toBe(false)
      }
    },
  )
})

// @test-link [[module_register_window_resolution_primitives]]
describe('deriveRegisterWindowCandidates: determinism', () => {
  it('produces equal values on repeated calls with the same inputs', () => {
    const range = makeActiveConcertRange(46, 70)

    const first = deriveRegisterWindowCandidates(range, POLICY)
    const second = deriveRegisterWindowCandidates(range, POLICY)

    expect(first).toEqual(second)
  })
})

// @test-link [[module_register_window_resolution_primitives]]
describe('deriveRegisterWindowCandidates: immutability', () => {
  it('returns a frozen candidate list and frozen candidates and windows', () => {
    const range = makeActiveConcertRange(48, 72)
    const candidates = deriveRegisterWindowCandidates(range, POLICY)

    expect(() => {
      // @ts-expect-error the candidate list is readonly
      candidates.push(candidates[0])
    }).toThrow()
    expect(() => {
      // @ts-expect-error a candidate is readonly
      candidates[0].id = 'High'
    }).toThrow()
    expect(() => {
      // @ts-expect-error a window is readonly
      candidates[0]!.window.minMidi = 0
    }).toThrow()
  })
})

// @test-link [[module_register_window_resolution_primitives]]
describe('deriveRegisterWindowCandidates: formula generalizes beyond the adopted S=12 floor', () => {
  it('derives a wider synthetic profile (W=36, S=18) rather than hardcoding S=12', () => {
    // Synthetic property check only: not an adopted profile. lo=40, hi=76 => W=36,
    // S = max(12, ceil(36/2)) = 18, offset = floor((36-18)/2) = 9.
    const range = makeActiveConcertRange(40, 76)

    const candidates = deriveRegisterWindowCandidates(range, POLICY)
    const [low, middle, high] = candidates

    expect(low!.window).toMatchObject({ minMidi: 40, maxMidi: 58 })
    expect(middle!.window).toMatchObject({ minMidi: 49, maxMidi: 67 })
    expect(high!.window).toMatchObject({ minMidi: 58, maxMidi: 76 })
  })
})

// @test-link [[module_register_window_resolution_primitives]]
describe('deriveRegisterWindowCandidates: policy validation', () => {
  it('rejects an unrecognized algorithm string', () => {
    const range = makeActiveConcertRange(48, 72)
    const badPolicy = {
      ...POLICY,
      algorithm: 'some-other-algorithm',
    } as unknown as RegisterWindowPolicy

    expect(() => deriveRegisterWindowCandidates(range, badPolicy)).toThrow(
      RegisterWindowDerivationError,
    )
  })
})
