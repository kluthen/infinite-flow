import { describe, expect, it } from 'vitest'
import {
  INITIAL_MOTION_STATE,
  LEAPINESS_LIMITS,
  advanceMotion,
  motionSettled,
  reachBound,
  recovers,
  type MotionNote,
  type MotionResult,
  type MotionState,
} from '@/domain/pitch/pitch-motion'

/** Build a motion note with sensible chord-tone/harmony/bar defaults. */
function note(midi: number, overrides: Partial<MotionNote> = {}): MotionNote {
  return { midi, chordTone: true, harmonyIndex: 0, barIndex: 0, ...overrides }
}

/** Fold advanceMotion over a sequence of notes, stopping at the first rejection. */
function advanceAll(
  limits: (typeof LEAPINESS_LIMITS)['Smooth'],
  notes: readonly MotionNote[],
): MotionResult {
  let state: MotionState = INITIAL_MOTION_STATE
  let last: MotionResult = { kind: 'accepted', state }
  for (const candidate of notes) {
    last = advanceMotion(limits, state, candidate)
    if (last.kind === 'rejected') return last
    state = last.state
  }
  return last
}

// @test-link [[module_pitch_planner]]
describe('pitch-motion', () => {
  // @test-link [[rule_leapiness_interval_budget]]
  describe('LEAPINESS_LIMITS', () => {
    it('matches the settled budgets exactly for every level', () => {
      expect(LEAPINESS_LIMITS).toEqual({
        Smooth: {
          maxInterval: 4,
          leaps: 0,
          largeLeaps: 0,
          phraseRuns: 1,
          measureRuns: 1,
          deferral: false,
        },
        Shaped: {
          maxInterval: 7,
          leaps: 2,
          largeLeaps: 1,
          phraseRuns: 1,
          measureRuns: 1,
          deferral: false,
        },
        Leaping: {
          maxInterval: 10,
          leaps: 4,
          largeLeaps: 2,
          phraseRuns: 1,
          measureRuns: 1,
          deferral: true,
        },
        Angular: {
          maxInterval: 12,
          leaps: 6,
          largeLeaps: 3,
          phraseRuns: 2,
          measureRuns: 1,
          deferral: true,
        },
      })
    })

    it('caps every level at exactly one recognized run per bar', () => {
      for (const level of Object.values(LEAPINESS_LIMITS)) expect(level.measureRuns).toBe(1)
    })

    it('permits deferral only for Leaping and Angular', () => {
      expect(LEAPINESS_LIMITS.Smooth.deferral).toBe(false)
      expect(LEAPINESS_LIMITS.Shaped.deferral).toBe(false)
      expect(LEAPINESS_LIMITS.Leaping.deferral).toBe(true)
      expect(LEAPINESS_LIMITS.Angular.deferral).toBe(true)
    })
  })

  // @test-link [[module_pitch_planner]]
  describe('INITIAL_MOTION_STATE', () => {
    it('starts with no prior note, no chain, zero counters, and no debt', () => {
      expect(INITIAL_MOTION_STATE).toEqual({
        chainDirection: 0,
        chainNotes: [],
        leaps: 0,
        largeLeaps: 0,
        runs: 0,
        runsPerBar: [0, 0, 0, 0],
      })
      expect('debt' in INITIAL_MOTION_STATE).toBe(false)
      expect(Object.isFrozen(INITIAL_MOTION_STATE)).toBe(true)
    })
  })

  // @test-link [[rule_leap_recovery]]
  describe('recovers', () => {
    it('accepts a 1-4 semitone move opposite the debt direction', () => {
      expect(recovers(-1, 1)).toBe(true)
      expect(recovers(-4, 1)).toBe(true)
      expect(recovers(4, -1)).toBe(true)
    })

    it('rejects a same-direction move', () => {
      expect(recovers(3, 1)).toBe(false)
    })

    it('rejects an opposite-direction move outside 1-4 semitones', () => {
      expect(recovers(-5, 1)).toBe(false)
      expect(recovers(0, 1)).toBe(false)
    })
  })

  // @test-link [[rule_leapiness_interval_budget]]
  describe('advanceMotion interval classes and budgets', () => {
    it('accepts a step and a skip within Smooth without touching the leap counters', () => {
      const result = advanceAll(LEAPINESS_LIMITS.Smooth, [note(60), note(61), note(64)])
      expect(result.kind).toBe('accepted')
      if (result.kind === 'accepted') {
        expect(result.state.leaps).toBe(0)
        expect(result.state.largeLeaps).toBe(0)
      }
    })

    it('rejects an interval above the level cap as interval_cap_exceeded', () => {
      const result = advanceAll(LEAPINESS_LIMITS.Smooth, [note(60), note(65)])
      expect(result).toEqual({ kind: 'rejected', reason: 'interval_cap_exceeded' })
    })

    it.each<[keyof typeof LEAPINESS_LIMITS, number]>([
      ['Smooth', 4],
      ['Shaped', 7],
      ['Leaping', 10],
      ['Angular', 12],
    ])(
      'accepts an interval exactly at the %s cap (%i semitones), the boundary the prior test rejects one above',
      (level, cap) => {
        const result = advanceAll(LEAPINESS_LIMITS[level], [note(60), note(60 + cap)])
        expect(result.kind).toBe('accepted')
      },
    )

    it('counts a leap of 5 or 6 semitones toward the leap budget only, never the large-leap budget', () => {
      const five = advanceAll(LEAPINESS_LIMITS.Shaped, [note(60), note(65)])
      expect(five.kind).toBe('accepted')
      if (five.kind === 'accepted') {
        expect(five.state.leaps).toBe(1)
        expect(five.state.largeLeaps).toBe(0)
      }

      const six = advanceAll(LEAPINESS_LIMITS.Shaped, [note(60), note(66)])
      expect(six.kind).toBe('accepted')
      if (six.kind === 'accepted') {
        expect(six.state.leaps).toBe(1)
        expect(six.state.largeLeaps).toBe(0)
      }
    })

    it('counts a large leap (7-12 semitones) toward both the leap and large-leap budgets', () => {
      const result = advanceAll(LEAPINESS_LIMITS.Angular, [note(60), note(67)])
      expect(result.kind).toBe('accepted')
      if (result.kind === 'accepted') {
        expect(result.state.leaps).toBe(1)
        expect(result.state.largeLeaps).toBe(1)
      }
    })

    it('rejects a leap once the phrase leap budget is exhausted', () => {
      const state: MotionState = { ...INITIAL_MOTION_STATE, prior: note(60), leaps: 2 }
      const result = advanceMotion(LEAPINESS_LIMITS.Shaped, state, note(65))
      expect(result).toEqual({ kind: 'rejected', reason: 'leap_budget_exceeded' })
    })

    it('rejects a large leap once the phrase large-leap budget is exhausted, distinct from the leap budget', () => {
      const state: MotionState = {
        ...INITIAL_MOTION_STATE,
        prior: note(60),
        leaps: 1,
        largeLeaps: 1,
      }
      const result = advanceMotion(LEAPINESS_LIMITS.Shaped, state, note(67))
      expect(result).toEqual({ kind: 'rejected', reason: 'large_leap_budget_exceeded' })
    })
  })

  // @test-link [[rule_leapiness_arpeggio_run_limits]]
  describe('arpeggio runs', () => {
    it('recognizes three chord tones of one harmony joined by two same-direction wide intervals', () => {
      const result = advanceAll(LEAPINESS_LIMITS.Smooth, [note(60), note(64), note(67)])
      expect(result.kind).toBe('accepted')
      if (result.kind === 'accepted') {
        expect(result.state.runs).toBe(1)
        expect(result.state.runsPerBar).toEqual([1, 0, 0, 0])
      }
    })

    it('never opens a chain below the 3-semitone wide threshold, so same-direction steps never budget as a run', () => {
      // Four same-direction 2-semitone steps would be three same-direction wide intervals if the
      // chain threshold were as low as a step; it must stay a plain scale and be fully accepted.
      const result = advanceAll(LEAPINESS_LIMITS.Smooth, [note(60), note(62), note(64), note(66)])
      expect(result.kind).toBe('accepted')
      if (result.kind === 'accepted') {
        expect(result.state.runs).toBe(0)
        expect(result.state.chainDirection).toBe(0)
      }
    })

    it('rejects two same-direction wide intervals that do not form a recognized run', () => {
      const result = advanceAll(LEAPINESS_LIMITS.Angular, [
        note(60, { chordTone: true }),
        note(64, { chordTone: false }),
        note(67, { chordTone: true }),
      ])
      expect(result).toEqual({ kind: 'rejected', reason: 'unrecognized_wide_chain' })
    })

    it('rejects a chain that reaches three same-direction wide intervals', () => {
      const result = advanceAll(LEAPINESS_LIMITS.Angular, [note(60), note(64), note(67), note(71)])
      expect(result).toEqual({ kind: 'rejected', reason: 'wide_chain_too_long' })
    })

    it('rejects a second recognized run once the phrase run budget is spent', () => {
      const result = advanceAll(LEAPINESS_LIMITS.Shaped, [
        note(60, { barIndex: 0 }),
        note(64, { barIndex: 0 }),
        note(67, { barIndex: 0 }),
        note(66, { barIndex: 1 }),
        note(70, { barIndex: 1 }),
        note(73, { barIndex: 1 }),
      ])
      expect(result).toEqual({ kind: 'rejected', reason: 'arpeggio_run_budget_exceeded' })
    })

    it('rejects a second recognized run in the same bar even when the phrase budget allows it', () => {
      const result = advanceAll(LEAPINESS_LIMITS.Angular, [
        note(60, { barIndex: 0 }),
        note(64, { barIndex: 0 }),
        note(67, { barIndex: 0 }),
        note(66, { barIndex: 0 }),
        note(70, { barIndex: 0 }),
        note(73, { barIndex: 0 }),
      ])
      expect(result).toEqual({ kind: 'rejected', reason: 'arpeggio_run_budget_exceeded' })
    })
  })

  // @test-link [[rule_leap_recovery]]
  describe('recovery debt', () => {
    it('opens a debt only from a large leap and clears it on an opposite-direction 1-4 semitone repay', () => {
      const result = advanceAll(LEAPINESS_LIMITS.Shaped, [note(60), note(67), note(65)])
      expect(result.kind).toBe('accepted')
      if (result.kind === 'accepted') {
        expect(motionSettled(result.state)).toBe(true)
      }
    })

    it('rejects a same-direction follow-up to a large leap as unrecovered', () => {
      const result = advanceAll(LEAPINESS_LIMITS.Shaped, [note(60), note(67), note(69)])
      expect(result).toEqual({ kind: 'rejected', reason: 'unrecovered_large_leap' })
    })

    it('does not defer a large leap for Smooth or Shaped, rejecting it inside a completing run', () => {
      const result = advanceAll(LEAPINESS_LIMITS.Shaped, [
        note(60, { chordTone: true, harmonyIndex: 0 }),
        note(67, { chordTone: true, harmonyIndex: 0 }),
        note(71, { chordTone: true, harmonyIndex: 0 }),
      ])
      expect(result).toEqual({ kind: 'rejected', reason: 'unrecovered_large_leap' })
    })

    it('defers a large leap for Leaping/Angular behind a recognized run, due on the interval after it', () => {
      const deferred = advanceAll(LEAPINESS_LIMITS.Angular, [
        note(60, { chordTone: true, harmonyIndex: 0 }),
        note(68, { chordTone: true, harmonyIndex: 0 }),
        note(72, { chordTone: true, harmonyIndex: 0 }),
        note(69, { chordTone: false, harmonyIndex: 0 }),
      ])
      expect(deferred.kind).toBe('accepted')
      if (deferred.kind === 'accepted') expect(motionSettled(deferred.state)).toBe(true)

      const stillOwed = advanceAll(LEAPINESS_LIMITS.Angular, [
        note(60, { chordTone: true, harmonyIndex: 0 }),
        note(68, { chordTone: true, harmonyIndex: 0 }),
        note(72, { chordTone: true, harmonyIndex: 0 }),
      ])
      expect(stillOwed.kind).toBe('accepted')
      if (stillOwed.kind === 'accepted') expect(motionSettled(stillOwed.state)).toBe(false)
    })
  })

  // @test-link [[rule_leap_recovery]]
  describe('motionSettled', () => {
    it('is true only when no recovery debt is pending', () => {
      expect(motionSettled(INITIAL_MOTION_STATE)).toBe(true)
      expect(
        motionSettled({ ...INITIAL_MOTION_STATE, debt: { direction: 1, mode: 'due_next' } }),
      ).toBe(false)
    })
  })

  // @test-link [[rule_leapiness_interval_budget]]
  describe('reachBound', () => {
    it('is zero for zero remaining intervals', () => {
      expect(reachBound(LEAPINESS_LIMITS.Angular, 0, 5, 5)).toBe(0)
    })

    it('spends the remaining leap budget at the interval cap and the rest at a skip', () => {
      expect(reachBound(LEAPINESS_LIMITS.Leaping, 1, 4, 1)).toBe(10)
      expect(reachBound(LEAPINESS_LIMITS.Angular, 4, 2, 1)).toBe(30)
      expect(reachBound(LEAPINESS_LIMITS.Smooth, 3, 0, 0)).toBe(10)
    })

    it('is monotonically non-decreasing as more intervals remain', () => {
      const small = reachBound(LEAPINESS_LIMITS.Shaped, 2, 2, 1)
      const large = reachBound(LEAPINESS_LIMITS.Shaped, 5, 2, 1)
      expect(large).toBeGreaterThanOrEqual(small)
    })
  })
})
