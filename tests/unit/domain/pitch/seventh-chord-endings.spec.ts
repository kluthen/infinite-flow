/**
 * The phrase's two ends read each chord as its triad (the first option of spec §D12): no phrase
 * generated without a join ends on its final chord's seventh, a joined phrase may end on it only as
 * a tense note (never as a chord tone that passes the final check on the tense note's MIDI), and
 * the first note after a tense carried note lands on a tone of the tonic triad, never on the tonic
 * chord's seventh. A recovery owed across the join is never repaid on the tonic chord's seventh,
 * and is still repaid on any other note 1 to 4 semitones back. Property tests run over hand-built
 * seventh-chord plans of each plan kind.
 */

import { describe, expect, it } from 'vitest'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { JAZZ_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import {
  makeCarryIn,
  type CarryIn,
  type LeapDirection,
} from '@/domain/generation/carry-in/carry-in'
import { makeHarmonyCollection } from '@/domain/harmony/collection'
import { advance, initialPitchSearchState } from '@/domain/pitch/pitch-advance'
import { compilePitchSearchContext, isOpenEndpointMidi } from '@/domain/pitch/pitch-context'
import { planPitchPhrase } from '@/domain/pitch/pitch-planner'
import type {
  BoundPitchPlannerInput,
  PitchPhrase,
  PitchSearchState,
} from '@/domain/pitch/pitch-types'
import { makeRegisterWindow } from '@/domain/profile/register-window'
import {
  boundSeventhInput,
  harmonyCandidates,
  PLAN_KINDS,
  pc,
  seventhInput,
  TONAL_GENTLE,
  type PlanKind,
} from './seventh-chord-inputs'

const C_MAJOR = makeHarmonyCollection('C', 'Major')
const C_TONIC_TRIAD = [0, 4, 7]
const SEEDS = [1, 2, 3]
const RHYTHMS = 4

/** A carry-in whose chord was dropped: the phrase may end owing, and the first note owes nothing. */
function plainCarryIn(): CarryIn {
  return makeCarryIn({
    lastPitch: {
      midi: makeConcertPitch(60),
      arrivingInterval: null,
      recovery: { kind: 'settled' },
    },
    registerWindow: makeRegisterWindow(48, 72),
    finalHarmony: null,
    phraseNumber: 1,
  })
}

/** A carry-in over a carried G (or G7) whose last pitch `midi`, reached by a step, is tense. */
function tenseCarryIn(midi: number, seventh: boolean): CarryIn {
  return makeCarryIn({
    lastPitch: {
      midi: makeConcertPitch(midi),
      arrivingInterval: -2,
      recovery: { kind: 'settled' },
    },
    registerWindow: makeRegisterWindow(48, 72),
    finalHarmony: {
      triad: C_MAJOR.triads[4]!,
      ...(seventh ? { seventh: { pitchClass: 5, quality: 'dominant-seventh' as const } } : {}),
      role: 'open_arrival',
      endpoint: { kind: 'tonal_degree_five_chord_tone', degree: 5 },
    },
    phraseNumber: 1,
  })
}

/**
 * A carry-in with no carried chord whose last pitch `midi` was reached by a leap of
 * `arrivingInterval` semitones and still owes its recovery: a move back of 1 to 4 semitones.
 */
function owedCarryIn(midi: number, arrivingInterval: number): CarryIn {
  return makeCarryIn({
    lastPitch: {
      midi: makeConcertPitch(midi),
      arrivingInterval,
      recovery: { kind: 'owed', leapDirection: Math.sign(arrivingInterval) as LeapDirection },
    },
    registerWindow: makeRegisterWindow(48, 72),
    finalHarmony: null,
    phraseNumber: 1,
  })
}

/** A carry-in with no carried chord whose last pitch `midi`, reached by a step, owes nothing. */
function settledCarryIn(midi: number): CarryIn {
  return makeCarryIn({
    lastPitch: {
      midi: makeConcertPitch(midi),
      arrivingInterval: -2,
      recovery: { kind: 'settled' },
    },
    registerWindow: makeRegisterWindow(48, 72),
    finalHarmony: null,
    phraseNumber: 1,
  })
}

/** The first attack's candidate at `midi` with `role`. */
function firstCandidate(input: BoundPitchPlannerInput, midi: number, role: string) {
  const candidate = compilePitchSearchContext(input).candidateDomains[0]!.find(
    (c) => c.role === role && c.midi === midi,
  )
  if (!candidate) throw new Error(`no first ${role} at ${midi}`)
  return candidate
}

/** The result of trying `midi` with `role` as the first note of `input`. */
function tryFirst(input: BoundPitchPlannerInput, midi: number, role = 'chord_tone') {
  const context = compilePitchSearchContext(input)
  return advance(context, initialPitchSearchState(context), firstCandidate(input, midi, role))
}

/**
 * Every generated phrase of a plan kind over the fixture's harmonies, rhythms and seeds, under
 * Varied chaos (Predictable mostly repeats one chord tone on these short static rhythms).
 */
function generated(kind: PlanKind, carryIn?: CarryIn) {
  const phrases: { input: BoundPitchPlannerInput; phrase: PitchPhrase }[] = []
  let tried = 0
  const harmonies = Math.min(harmonyCandidates(kind).length, 2)
  for (let harmonyIndex = 0; harmonyIndex < harmonies; harmonyIndex += 1)
    for (let rhythmIndex = 0; rhythmIndex < RHYTHMS; rhythmIndex += 1)
      for (const seed of SEEDS) {
        const input = seventhInput({
          kind,
          harmonyIndex,
          rhythmIndex,
          seed,
          chaos: 'Varied',
          ...(carryIn === undefined ? {} : { carryIn }),
        })
        if (!input) continue
        tried += 1
        const result = planPitchPhrase(input)
        if (result.kind === 'pitch_plan') phrases.push({ input, phrase: result.phrase })
      }
  expect(phrases.length).toBeGreaterThanOrEqual(tried / 2)
  return phrases
}

/** The seventh of the event sounding under a phrase's final note. */
function finalSeventh(input: BoundPitchPlannerInput, phrase: PitchPhrase): number {
  const final = phrase.assignments.at(-1)!
  return input.harmony.events[final.attack.harmonyIndex]!.seventh!.pitchClass
}

// @test-link [[rule_open_phrase_ending]]
// @test-link [[rule_join_reads_carried_chord_as_triad]]
describe('pitch-context: the open ending reads the final chord as its triad', () => {
  it("never counts the final chord's seventh as an open endpoint, in any plan kind", () => {
    for (const kind of PLAN_KINDS) {
      const input = boundSeventhInput({ kind })
      const context = compilePitchSearchContext(input)
      const final = context.attacks.at(-1)!
      const seventh = input.harmony.events[final.harmonyIndex]!.seventh!.pitchClass
      /** True when `midi` on the final attack leaves the phrase open. */
      const open = (midi: number) =>
        isOpenEndpointMidi(input, final, midi, context.collectionPitchClasses)
      const sevenths = Array.from({ length: 25 }, (_, index) => 48 + index).filter(
        (midi) => pc(midi) === seventh,
      )
      expect(sevenths.some(open)).toBe(false)
      expect(context.finalMidis.some((midi) => pc(midi) === seventh)).toBe(false)
      expect(context.finalMidis.length).toBeGreaterThan(0)
      expect(context.finalMidis.every((midi) => final.triadPitchClasses.includes(pc(midi)))).toBe(
        true,
      )
    }
  })

  it('never ends a tonal static plan on scale degree 5 when it is only the final seventh', () => {
    // A hand-built final Am7 (A C E G) under a static plan: G is scale degree 5, but its seventh.
    const input = boundSeventhInput({ kind: PLAN_KINDS[2]! })
    const context = compilePitchSearchContext(input)
    const final = context.attacks.at(-1)!
    const am7 = { ...final, chordPitchClasses: [9, 0, 4, 7], triadPitchClasses: [9, 0, 4] }
    const collection = context.collectionPitchClasses
    expect(isOpenEndpointMidi(input, final, 67, collection)).toBe(true)
    expect(isOpenEndpointMidi(input, am7, 67, collection)).toBe(false)
  })

  it("never ends a phrase generated without a join on its final chord's seventh", () => {
    for (const kind of PLAN_KINDS)
      for (const { input, phrase } of generated(kind)) {
        const final = phrase.assignments.at(-1)!
        expect(pc(final.candidate.midi)).not.toBe(finalSeventh(input, phrase))
        expect(final.attack.triadPitchClasses).toContain(pc(final.candidate.midi))
      }
  })
})

/** The state after replaying every assignment but the last through `advance`. */
function stateBeforeFinal(input: BoundPitchPlannerInput, phrase: PitchPhrase): PitchSearchState {
  const context = compilePitchSearchContext(input)
  let state = initialPitchSearchState(context)
  for (const { candidate } of phrase.assignments.slice(0, -1)) {
    const result = advance(context, state, candidate)
    if (result.kind !== 'accepted') throw new Error(`replay rejected: ${result.reason}`)
    state = result.nextState
  }
  return state
}

// @test-link [[rule_join_tense_note_resolution]]
// @test-link [[rule_join_reads_carried_chord_as_triad]]
describe('pitch-advance: a joined phrase ends on the seventh only as a tense note', () => {
  it("offers the final chord's seventh as a tense ending with carry-in", () => {
    const input = boundSeventhInput({ carryIn: plainCarryIn() })
    const context = compilePitchSearchContext(input)
    const final = context.attacks.at(-1)!
    const seventh = input.harmony.events[final.harmonyIndex]!.seventh!.pitchClass
    const tense = context.candidateDomains[final.attackIndex]!.filter(
      (c) => c.role === 'passing_or_neighbor' && c.pitchClass === seventh,
    )
    expect(tense.length).toBeGreaterThan(0)
    expect(tense.every((c) => context.finalMidis.includes(c.midi))).toBe(true)
  })

  it('rejects the seventh as a chord tone on the final attack, and accepts it only as owed', () => {
    let accepted = 0
    for (const kind of [TONAL_GENTLE, PLAN_KINDS[3]!])
      for (const { input, phrase } of generated(kind, plainCarryIn())) {
        const context = compilePitchSearchContext(input)
        const final = context.attacks.at(-1)!
        const seventh = finalSeventh(input, phrase)
        const state = stateBeforeFinal(input, phrase)
        for (const candidate of context.candidateDomains[final.attackIndex]!) {
          if (candidate.pitchClass !== seventh) continue
          const result = advance(context, state, candidate)
          if (candidate.role === 'chord_tone') {
            expect(result).toEqual({ kind: 'rejected', reason: 'open_endpoint_violation' })
            continue
          }
          if (result.kind !== 'accepted') continue
          accepted += 1
          expect(result.nextState.figure.free?.midi).toBe(candidate.midi)
        }
      }
    expect(accepted).toBeGreaterThan(0)
  })

  it('ends a joined phrase on the seventh only through a tense ending', () => {
    for (const kind of PLAN_KINDS)
      for (const { input, phrase } of generated(kind, plainCarryIn())) {
        const final = phrase.assignments.at(-1)!
        if (pc(final.candidate.midi) !== finalSeventh(input, phrase)) continue
        expect(final.candidate.role).toBe('passing_or_neighbor')
      }
  })
})

// @test-link [[rule_join_tense_note_resolution]]
// @test-link [[rule_join_reads_carried_chord_as_triad]]
describe('pitch-advance: the first note after a tense carried note lands on the tonic triad', () => {
  it("rejects a landing on the tonic chord's seventh, by a step from the carried note", () => {
    // A over a carried G steps down to G or up to B; B is Cmaj7's seventh, not a triad tone.
    const input = boundSeventhInput({ carryIn: tenseCarryIn(69, false) })
    const context = compilePitchSearchContext(input)
    const state = initialPitchSearchState(context)
    const first = context.candidateDomains[0]!
    const b = first.find((c) => c.role === 'chord_tone' && c.midi === 71)!
    const g = first.find((c) => c.role === 'chord_tone' && c.midi === 67)!
    expect(advance(context, state, b)).toEqual({
      kind: 'rejected',
      reason: 'carried_tension_unresolved',
    })
    const landing = advance(context, state, g)
    expect(landing.kind === 'rejected' && landing.reason).not.toBe('carried_tension_unresolved')
  })

  it('lands every phrase after a tense carried note on a tonic-triad tone', () => {
    for (const carryIn of [tenseCarryIn(69, false), tenseCarryIn(65, true)])
      for (const { phrase } of generated(TONAL_GENTLE, carryIn))
        expect(C_TONIC_TRIAD).toContain(pc(phrase.assignments[0]!.candidate.midi))
  })
})

// @test-link [[rule_join_reads_carried_chord_as_triad]]
// @test-link [[rule_join_inherits_leap_recovery]]
describe("pitch-advance: a recovery owed across the join is never repaid on the tonic chord's seventh", () => {
  it('rejects the seventh as the first note when the carried pitch owes a recovery', () => {
    // A3 reached by a leap down owes a move up: B3 is Cmaj7's seventh, C4 a triad tone.
    expect(tryFirst(boundSeventhInput({ carryIn: owedCarryIn(57, -5) }), 59)).toEqual({
      kind: 'rejected',
      reason: 'carried_recovery_on_seventh',
    })
    // C5 reached by a leap up owes a move down: B4 is the seventh.
    expect(tryFirst(boundSeventhInput({ carryIn: owedCarryIn(72, 5) }), 71)).toEqual({
      kind: 'rejected',
      reason: 'carried_recovery_on_seventh',
    })
  })

  it('still repays the recovery on a triad tone 1 to 4 semitones back', () => {
    expect(tryFirst(boundSeventhInput({ carryIn: owedCarryIn(57, -5) }), 60).kind).toBe('accepted')
  })

  it("still repays the recovery on a figure's decorating note 1 to 4 semitones back", () => {
    // Under Jazz levels the first attack offers chromatic approaches: B-flat4 approaches B4.
    const input = boundSeventhInput({
      carryIn: owedCarryIn(72, 5),
      figureLevels: JAZZ_FIGURE_LEVELS,
    })
    expect(tryFirst(input, 70, 'chromatic_approach').kind).toBe('accepted')
    expect(tryFirst(input, 71)).toEqual({ kind: 'rejected', reason: 'carried_recovery_on_seventh' })
  })

  it('lets a first note that owes nothing be the seventh', () => {
    expect(tryFirst(boundSeventhInput({ carryIn: settledCarryIn(72) }), 71).kind).toBe('accepted')
    expect(tryFirst(boundSeventhInput(), 71).kind).toBe('accepted')
  })

  it('refuses nothing new over a triad first event', () => {
    const input = boundSeventhInput({
      carryIn: owedCarryIn(57, -5),
      sevenths: (_event, index) => index !== 0,
    })
    const context = compilePitchSearchContext(input)
    const state = initialPitchSearchState(context)
    for (const candidate of context.candidateDomains[0]!) {
      const result = advance(context, state, candidate)
      expect(result.kind === 'rejected' && result.reason).not.toBe('carried_recovery_on_seventh')
    }
  })

  it('never starts a phrase owing a recovery on the seventh of its first chord', () => {
    // In C major A3's recovery lands on C4 (a triad tone) or B3 (the seventh), never both refused.
    for (const kind of PLAN_KINDS.filter((k) => k.tonalCenter === 'C'))
      for (const { input, phrase } of generated(kind, owedCarryIn(57, -5))) {
        const first = compilePitchSearchContext(input).attacks[0]!
        const seventh = first.chordPitchClasses.find((p) => !first.triadPitchClasses.includes(p))
        expect(pc(phrase.assignments[0]!.candidate.midi)).not.toBe(seventh)
      }
  })
})
