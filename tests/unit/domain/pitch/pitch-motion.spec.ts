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
import type { Collection, PitchClass } from '@/domain/controls/generation-controls'
import { makeHarmonyCollection } from '@/domain/harmony/collection'
import { chordTones, type CollectionDegree } from '@/domain/harmony/harmony-types'
import { noteFacts } from '@/domain/pitch/pitch-advance'
import { compilePitchSearchContext } from '@/domain/pitch/pitch-context'
import { seventhChordEvent } from '../harmony/seventh-chord-fixtures'
import { boundSeventhInput, PLAN_KINDS, type SeventhInputOptions } from './seventh-chord-inputs'

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

/** A hand-built seventh-chord plan and the degree of the event whose inner attacks a test reads. */
interface SeventhChordAt {
  readonly options: SeventhInputOptions
  readonly degree: CollectionDegree
}

/** Static Cmaj7 in C major, static Em7 in E minor, and the G7 of a C-major active plan. */
const CMAJ7: SeventhChordAt = {
  options: { kind: PLAN_KINDS.find(({ name }) => name === 'tonal static')! },
  degree: 1,
}
const EM7: SeventhChordAt = {
  options: {
    kind: { name: 'E static', tonalCenter: 'E', collection: 'Minor', harmonicMotion: 'Static' },
  },
  degree: 1,
}
const G7: SeventhChordAt = {
  options: { kind: PLAN_KINDS.find(({ name }) => name === 'tonal active')!, harmonyIndex: 4 },
  degree: 5,
}

/**
 * The motion notes the pitch search builds for MIDI values on consecutive inner attacks of the
 * plan's last event on the chosen degree, in seventh form unless `triad` is set.
 */
function searchNotes(
  { options, degree }: SeventhChordAt,
  midis: readonly number[],
  triad = false,
): MotionNote[] {
  const input = boundSeventhInput({ ...options, ...(triad ? { sevenths: () => false } : {}) })
  const context = compilePitchSearchContext(input)
  const harmonyIndex = input.harmony.events.map(({ triad }) => triad.degree).lastIndexOf(degree)
  const attacks = context.attacks.filter(
    (attack) => attack.harmonyIndex === harmonyIndex && attack.attackIndex > 0 && !attack.isFinal,
  )
  if (attacks.length < midis.length) throw new Error('fixture event has too few inner attacks')
  return midis.map((midi, index) => {
    const attack = attacks[index]!
    const { chordTone } = noteFacts(context, attack, midi)
    return { midi, chordTone, harmonyIndex: attack.harmonyIndex, barIndex: attack.barIndex }
  })
}

/** Every collection the property reads seventh chords from: each one gives seven of them. */
const SEVENTH_COLLECTIONS: readonly (readonly [PitchClass, Collection])[] = [
  ['C', 'Major'],
  ['A', 'Minor'],
  ['D', 'Dorian'],
]

/** The MIDI values from 48 to 84 that are chord tones of a degree's seventh chord, rising. */
function chordToneMidis(tonalCenter: PitchClass, collection: Collection, degree: CollectionDegree) {
  const harmonyCollection = makeHarmonyCollection(tonalCenter, collection)
  const tones = chordTones(seventhChordEvent(degree, 0, 16, harmonyCollection)) as readonly number[]
  return Array.from({ length: 37 }, (_, index) => 48 + index).filter((midi) =>
    tones.includes(midi % 12),
  )
}

/**
 * Every chain of three and of four chord tones moving one way, each interval wide (3 semitones or
 * more) and within the level's cap.
 */
function oneWayWideChains(tones: readonly number[], cap: number, direction: 1 | -1) {
  const chains: number[][] = []
  const extend = (chain: number[]) => {
    if (chain.length >= 3) chains.push(chain)
    if (chain.length === 4) return
    for (const next of tones) {
      const step = (next - chain.at(-1)!) * direction
      if (step >= 3 && step <= cap) extend([...chain, next])
    }
  }
  for (const start of tones) extend([start])
  return chains
}

/** A one-way wide chain over a seventh chord, with the level whose cap bounds it. */
interface SeventhChordChain {
  readonly level: string
  readonly limits: (typeof LEAPINESS_LIMITS)['Smooth']
  readonly direction: 1 | -1
  readonly chain: readonly number[]
}

/** Every degree's seventh-chord tones in each collection the property reads. */
function seventhChordToneSets(): (readonly number[])[] {
  return SEVENTH_COLLECTIONS.flatMap(([tonalCenter, collection]) =>
    ([1, 2, 3, 4, 5, 6, 7] as const).map((degree) =>
      chordToneMidis(tonalCenter, collection, degree),
    ),
  )
}

/**
 * Every one-way wide chain over every degree's seventh chord in each collection the property
 * reads, at each level and in both directions.
 */
function seventhChordChains(): SeventhChordChain[] {
  const cases: SeventhChordChain[] = []
  for (const tones of seventhChordToneSets())
    for (const [level, limits] of Object.entries(LEAPINESS_LIMITS))
      for (const direction of [1, -1] as const)
        for (const chain of oneWayWideChains(tones, limits.maxInterval, direction))
          cases.push({ level, limits, direction, chain })
  return cases
}

// @test-link [[module_pitch_search_transition]]
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

  // @test-link [[module_pitch_search_transition]]
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

  // @test-link [[rule_seventh_is_chord_tone]]
  // @test-link [[rule_leapiness_arpeggio_run_limits]]
  describe('runs through the seventh, read through the search note facts', () => {
    it('recognizes E G B over Cmaj7 and B D F over G7 as runs, and neither over the triad', () => {
      for (const [chord, midis] of [
        [CMAJ7, [64, 67, 71]],
        [G7, [59, 62, 65]],
      ] as const) {
        const result = advanceAll(LEAPINESS_LIMITS.Smooth, searchNotes(chord, midis))
        expect(result.kind).toBe('accepted')
        if (result.kind === 'accepted') expect(result.state.runs).toBe(1)
        const overTriad = searchNotes(chord, midis, true)
        expect(advanceAll(LEAPINESS_LIMITS.Smooth, overTriad)).toEqual({
          kind: 'rejected',
          reason: 'unrecognized_wide_chain',
        })
      }
    })

    it('never passes C E G B over Cmaj7 nor E G B D over Em7 in one direction, at any level', () => {
      for (const [chord, midis] of [
        [CMAJ7, [60, 64, 67, 71]],
        [EM7, [64, 67, 71, 74]],
      ] as const)
        for (const limits of Object.values(LEAPINESS_LIMITS))
          expect(advanceAll(limits, searchNotes(chord, midis))).toEqual({
            kind: 'rejected',
            reason: 'wide_chain_too_long',
          })
    })

    // @test-link [[rule_leap_recovery]]
    it('defers a large leap inside a run through the seventh at Leaping and Angular only', () => {
      for (const [chord, run, recovery] of [
        [CMAJ7, [60, 67, 71], 69],
        [G7, [55, 62, 65], 64],
      ] as const) {
        for (const level of ['Leaping', 'Angular'] as const) {
          const owed = advanceAll(LEAPINESS_LIMITS[level], searchNotes(chord, run))
          expect(owed.kind === 'accepted' && owed.state.debt).toEqual({
            direction: 1,
            mode: 'due_next',
          })
          const repaid = advanceAll(LEAPINESS_LIMITS[level], searchNotes(chord, [...run, recovery]))
          expect(repaid.kind === 'accepted' && motionSettled(repaid.state)).toBe(true)
        }
        expect(advanceAll(LEAPINESS_LIMITS.Shaped, searchNotes(chord, run))).toEqual({
          kind: 'rejected',
          reason: 'unrecovered_large_leap',
        })
        expect(advanceAll(LEAPINESS_LIMITS.Smooth, searchNotes(chord, run))).toEqual({
          kind: 'rejected',
          reason: 'interval_cap_exceeded',
        })
      }
    })

    it('keeps every run three notes and defers only at Leaping and Angular, over every seventh chord (property)', () => {
      let runs = 0
      let deferred = 0
      for (const { level, limits, direction, chain } of seventhChordChains()) {
        const result = advanceAll(
          limits,
          chain.map((midi) => note(midi)),
        )
        if (chain.length === 4) {
          expect(result.kind).toBe('rejected')
          continue
        }
        if (result.kind === 'accepted') {
          runs += 1
          expect(result.state.runs).toBe(1)
          expect(result.state.chainNotes).toHaveLength(3)
        }
        const firstLeap = Math.abs(chain[1]! - chain[0]!)
        const secondLeap = Math.abs(chain[2]! - chain[1]!)
        if (firstLeap < 7 || secondLeap >= 7) continue
        const defers = level === 'Leaping' || level === 'Angular'
        expect(result.kind === 'accepted' && result.state.debt).toEqual(
          defers ? { direction, mode: 'due_next' } : false,
        )
        if (defers) deferred += 1
      }
      expect(runs).toBeGreaterThan(0)
      expect(deferred).toBeGreaterThan(0)
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
