/**
 * The pitch half of the steering module, unit by unit: how a pair of pitches is read as a melodic
 * move, which of the block's moves steers each note of a phrase, how far a candidate is from that
 * move at each strength, and where the term sits in the pitch rank: below every existing rank, so
 * it orders candidates only within a rank and never moves one across.
 */

import { describe, expect, it } from 'vitest'

import type { ArpeggioChaos } from '@/domain/controls/generation-controls'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import {
  makeSteeringBlock,
  type MelodicMove,
  type SteeringBlock,
  type SteeringStrength,
} from '@/domain/generation/steering-block'
import {
  melodicMoveBetween,
  moveDisagreement,
  pitchSteeringTerm,
  type PitchSteeringTerm,
} from '@/domain/generation/steering/pitch-steering'
import { advance, initialPitchSearchState } from '@/domain/pitch/pitch-advance'
import { compilePitchSearchContext } from '@/domain/pitch/pitch-context'
import { orderCandidates, pitchRank } from '@/domain/pitch/pitch-ranking'
import { pitchTieKey } from '@/domain/pitch/pitch-tie-key'
import type { PitchAttack, PitchCandidate } from '@/domain/pitch/pitch-types'
import { handAttack, pitchFixtureInput } from './favored-fixtures'

const UP_STEP: MelodicMove = { direction: 'up', size: 'step' }
const UP_LEAP: MelodicMove = { direction: 'up', size: 'leap' }
const DOWN_SKIP: MelodicMove = { direction: 'down', size: 'skip' }
const SAME: MelodicMove = { direction: 'same' }

/** A steering block holding the moves at the strength, its target rhythm empty and unbounded. */
function block(moves: readonly MelodicMove[], strength: SteeringStrength): SteeringBlock {
  return makeSteeringBlock({
    targetRhythm: { measures: [[], [], [], []], band: 'unbounded' },
    moves,
    strength,
  })
}

/** A chord-tone or non-chord candidate at a MIDI value. */
function candidate(role: PitchCandidate['role'], midi: number): PitchCandidate {
  return {
    identity: `${role}/${midi}`,
    role,
    midi: makeConcertPitch(midi),
    pitchClass: midi % 12,
    octaveIndex: Math.floor(midi / 12),
    obligationIdentity: `${role}:${midi}`,
    enumerationIndex: 0,
  }
}

/** The MIDI values of an ordering, first tried first. */
function midisOf(entries: readonly { readonly candidate: PitchCandidate }[]): readonly number[] {
  return entries.map((entry) => entry.candidate.midi)
}

/** Intent: compare two rank tuples written as comma-joined numbers, lexicographically. */
function compareRanks(a: string, b: string): number {
  const left = a.split(',').map(Number)
  const right = b.split(',').map(Number)
  for (let index = 0; index < left.length; index += 1)
    if (left[index] !== right[index]) return left[index]! - right[index]!
  return 0
}

/** The candidates of one attack ordered with or without a steering term, prior note 64. */
function ordered(
  chaos: ArpeggioChaos,
  candidates: readonly PitchCandidate[],
  steering?: PitchSteeringTerm,
  attack: PitchAttack = handAttack(),
): readonly number[] {
  return midisOf(
    orderCandidates({
      chaos,
      seed: 7,
      attack,
      candidates,
      priorMidi: 64,
      key: pitchTieKey,
      ...(steering === undefined ? {} : { steering }),
    }),
  )
}

// @test-link [[module_pitch_steering]]
describe('the pitch steering term', () => {
  // @test-link [[rule_jam_melody_follows_doodle_moves]]
  it('reads a move as the same note, a step of 1-2, a skip of 3-4 or a leap of 5 or more half steps', () => {
    expect(melodicMoveBetween(60, 60)).toEqual(SAME)
    expect(melodicMoveBetween(60, 61)).toEqual({ direction: 'up', size: 'step' })
    expect(melodicMoveBetween(60, 62)).toEqual({ direction: 'up', size: 'step' })
    expect(melodicMoveBetween(60, 63)).toEqual({ direction: 'up', size: 'skip' })
    expect(melodicMoveBetween(60, 64)).toEqual({ direction: 'up', size: 'skip' })
    expect(melodicMoveBetween(60, 65)).toEqual({ direction: 'up', size: 'leap' })
    expect(melodicMoveBetween(60, 72)).toEqual({ direction: 'up', size: 'leap' })
    expect(melodicMoveBetween(60, 58)).toEqual({ direction: 'down', size: 'step' })
    expect(melodicMoveBetween(60, 57)).toEqual({ direction: 'down', size: 'skip' })
    expect(melodicMoveBetween(60, 55)).toEqual({ direction: 'down', size: 'leap' })
  })

  // @test-link [[rule_jam_melody_follows_doodle_moves]]
  // @test-link [[rule_jam_drift_positions]]
  it('gives no term without a block, at strength none, with no move, or at a first note with nothing before it', () => {
    expect(pitchSteeringTerm(undefined, 3, false)).toBeUndefined()
    expect(pitchSteeringTerm(block([UP_STEP], 'none'), 3, false)).toBeUndefined()
    expect(pitchSteeringTerm(block([], 'direction'), 3, false)).toBeUndefined()
    expect(pitchSteeringTerm(block([UP_STEP], 'direction'), 0, false)).toBeUndefined()
  })

  // @test-link [[rule_jam_melody_follows_doodle_moves]]
  it('steers each note of the phrase by the next move of the list, cycled, from the first move into it', () => {
    const steering = block([UP_STEP, DOWN_SKIP, SAME], 'size-and-direction')
    const unjoined = [1, 2, 3, 4, 5, 6, 7].map(
      (attackIndex) => pitchSteeringTerm(steering, attackIndex, false)?.move,
    )
    expect(unjoined).toEqual([UP_STEP, DOWN_SKIP, SAME, UP_STEP, DOWN_SKIP, SAME, UP_STEP])
    // A joined phrase's first note is reached by a move, so the list starts there.
    const joined = [0, 1, 2, 3].map(
      (attackIndex) => pitchSteeringTerm(steering, attackIndex, true)?.move,
    )
    expect(joined).toEqual([UP_STEP, DOWN_SKIP, SAME, UP_STEP])
    expect(pitchSteeringTerm(steering, 1, false)?.strength).toBe('size-and-direction')
  })

  // @test-link [[rule_jam_melody_follows_doodle_moves]]
  // @test-link [[rule_jam_drift_positions]]
  it('puts the move direction first at direction only, and direction and size first at size and direction', () => {
    const direction: PitchSteeringTerm = { move: UP_STEP, strength: 'direction' }
    expect(moveDisagreement(direction, 60, 62)).toBe(0)
    expect(moveDisagreement(direction, 60, 67)).toBe(0)
    expect(moveDisagreement(direction, 60, 60)).toBe(1)
    expect(moveDisagreement(direction, 60, 59)).toBe(1)
    const sized: PitchSteeringTerm = { move: UP_STEP, strength: 'size-and-direction' }
    expect(moveDisagreement(sized, 60, 62)).toBe(0)
    expect(moveDisagreement(sized, 60, 67)).toBe(1)
    expect(moveDisagreement(sized, 60, 59)).toBe(2)
    expect(moveDisagreement(sized, 60, 60)).toBe(2)
    const same: PitchSteeringTerm = { move: SAME, strength: 'size-and-direction' }
    expect(moveDisagreement(same, 60, 60)).toBe(0)
    expect(moveDisagreement(same, 60, 61)).toBe(2)
  })
})

// @test-link [[module_pitch_steering]]
describe('the steering term in the pitch rank', () => {
  const term: PitchSteeringTerm = { move: UP_LEAP, strength: 'direction' }
  const plain = { isBeatOne: false, isFirstUnderHarmonyChange: false }

  // @test-link [[rule_doodle_only_orders_candidates]]
  it('leaves the rank tuple as it was without a term, and adds the term last, below every rank', () => {
    expect(pitchRank('Varied', plain, candidate('chord_tone', 67), 64)).toEqual([0, 0, 0])
    expect(pitchRank('Varied', plain, candidate('chord_tone', 67), 64, undefined, term)).toEqual([
      0, 0, 0, 0,
    ])
    expect(pitchRank('Varied', plain, candidate('chord_tone', 60), 64, undefined, term)).toEqual([
      0, 0, 0, 1,
    ])
    expect(
      pitchRank('Predictable', plain, candidate('chord_tone', 60), 64, undefined, term),
    ).toEqual([0, 0, 4, 1])
  })

  // @test-link [[rule_doodle_only_orders_candidates]]
  it('adds no term to a note with nothing before it', () => {
    expect(
      pitchRank('Varied', plain, candidate('chord_tone', 60), undefined, undefined, term),
    ).toEqual([0, 0, 0])
  })

  // @test-link [[rule_jam_melody_follows_doodle_moves]]
  // @test-link [[rule_doodle_only_orders_candidates]]
  it('orders candidates within each rank: chord tones stay before every other candidate', () => {
    const candidates = [
      candidate('chord_tone', 55),
      candidate('passing_or_neighbor', 65),
      candidate('chord_tone', 60),
      candidate('passing_or_neighbor', 62),
      candidate('chord_tone', 67),
    ]
    const down: PitchSteeringTerm = { move: DOWN_SKIP, strength: 'direction' }
    const up = ordered('Varied', candidates, term)
    expect(up.slice(0, 3).sort()).toEqual([55, 60, 67])
    expect(up[0]).toBe(67)
    expect(up.slice(3)).toEqual([65, 62])
    const downward = ordered('Varied', candidates, down)
    expect(downward.slice(0, 3).sort()).toEqual([55, 60, 67])
    expect(downward[2]).toBe(67)
    expect(downward.slice(3)).toEqual([62, 65])
  })

  // @test-link [[rule_doodle_only_orders_candidates]]
  it('keeps the arpeggio-chaos distance above the term: Predictable still tries the nearest chord tone first', () => {
    const candidates = [candidate('chord_tone', 72), candidate('chord_tone', 60)]
    expect(ordered('Predictable', candidates, term)).toEqual([60, 72])
    expect(ordered('Chaotic', candidates, { move: DOWN_SKIP, strength: 'direction' })).toEqual([
      72, 60,
    ])
  })

  // @test-link [[rule_doodle_only_orders_candidates]]
  it('keeps the chord-tone priority on beat 1 above the term', () => {
    const candidates = [candidate('passing_or_neighbor', 65), candidate('chord_tone', 60)]
    const beatOne = handAttack({ isBeatOne: true })
    expect(ordered('Varied', candidates, term, beatOne)).toEqual([60, 65])
  })

  // @test-link [[rule_doodle_only_orders_candidates]]
  it('only reorders candidates of equal rank: the ranks without the term never decrease along the order', () => {
    const chordClasses = [0, 4, 7]
    const candidates = [52, 55, 57, 59, 60, 62, 64, 65, 67, 69, 71, 72, 76].map((midi) =>
      candidate(chordClasses.includes(midi % 12) ? 'chord_tone' : 'passing_or_neighbor', midi),
    )
    const terms: readonly PitchSteeringTerm[] = [UP_STEP, UP_LEAP, DOWN_SKIP, SAME].flatMap(
      (move) =>
        (['direction', 'size-and-direction'] as const).map((strength) => ({ move, strength })),
    )
    for (const attack of [handAttack(), handAttack({ isBeatOne: true })])
      for (const chaos of ['Predictable', 'Varied', 'Chaotic'] as const)
        for (const steering of terms) {
          const ranks = orderCandidates({
            chaos,
            seed: 7,
            attack,
            candidates,
            priorMidi: 64,
            key: pitchTieKey,
            steering,
          }).map((entry) => pitchRank(chaos, attack, entry.candidate, 64).join(','))
          const sorted = [...ranks].sort((a, b) => compareRanks(a, b))
          expect(ranks).toEqual(sorted)
        }
  })
})

// @test-link [[module_pitch_steering]]
describe('the steering term in the published ranking facts', () => {
  // @test-link [[rule_jam_melody_follows_doodle_moves]]
  it('publishes the term last when the request carries a block that steers the note', () => {
    const steering = block([DOWN_SKIP], 'direction')
    const steered = compilePitchSearchContext(pitchFixtureInput({ steering }))
    const bare = compilePitchSearchContext(pitchFixtureInput())
    const first = steered.candidateDomains[0]!.find(
      (entry) => entry.role === 'chord_tone' && entry.midi === 60,
    )
    if (!first) throw new Error('no chord tone 60 at attack 0')
    const start = initialPitchSearchState(steered)
    const opening = advance(steered, start, first)
    if (opening.kind !== 'accepted') throw new Error(`60 rejected: ${opening.reason}`)
    // The first note of an unjoined phrase has nothing before it: no term.
    const bareOpening = advance(bare, initialPitchSearchState(bare), first)
    expect(bareOpening.kind === 'accepted' && bareOpening.rankingFacts).toEqual(
      opening.rankingFacts,
    )
    expect(opening.rankingFacts).toHaveLength(3)
    const next = steered.candidateDomains[1]!.find(
      (entry) => entry.role === 'chord_tone' && entry.midi === 64,
    )
    if (!next) throw new Error('no chord tone 64 at attack 1')
    const second = advance(steered, opening.nextState, next)
    if (second.kind !== 'accepted') throw new Error(`64 rejected: ${second.reason}`)
    expect(second.rankingFacts).toHaveLength(4)
    expect(second.rankingFacts[3]).toBe(1)
    const bareSecond = advance(bare, opening.nextState, next)
    expect(bareSecond.kind === 'accepted' && bareSecond.rankingFacts).toEqual(
      second.rankingFacts.slice(0, 3),
    )
  })
})
