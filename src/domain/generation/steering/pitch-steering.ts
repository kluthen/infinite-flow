/**
 * The pitch half of the steering module: how the steering block's melodic moves order the pitch
 * search's candidates. For each note of a phrase it picks the block's next move, cycled in order,
 * and scores a candidate by how far its move from the note before differs from that move, at the
 * block's strength. The pitch rank reads the score as one more term below all of its ranks, so it
 * only orders candidates the rules already allow, within each rank, and never adds or removes one.
 * It reads no doodle, no drift and no Jam: only the block's moves and strength.
 */

import type { MelodicMove, SteeringBlock, SteeringStrength } from '../steering-block'

/** A strength that steers the pitch order: by direction and size, or by direction alone. */
// @spec-link [[rule_jam_drift_positions]]
export type PitchSteeringStrength = Exclude<SteeringStrength, 'none'>

/** What steers one note of a phrase: the block's move for that note, and its strength. */
// @spec-link [[rule_jam_melody_follows_doodle_moves]]
export interface PitchSteeringTerm {
  readonly move: MelodicMove
  readonly strength: PitchSteeringStrength
}

/** The widest step and the widest skip, in half steps; anything wider is a leap. */
const WIDEST_STEP = 2
const WIDEST_SKIP = 4

/**
 * Intent: the melodic move from one pitch to the next: the same note, or up or down by a step (1
 * or 2 half steps), a skip (3 or 4) or a leap (5 or more).
 */
// @spec-link [[rule_jam_melody_follows_doodle_moves]]
export function melodicMoveBetween(fromMidi: number, toMidi: number): MelodicMove {
  const interval = toMidi - fromMidi
  if (interval === 0) return { direction: 'same' }
  const width = Math.abs(interval)
  return {
    direction: interval > 0 ? 'up' : 'down',
    size: width <= WIDEST_STEP ? 'step' : width <= WIDEST_SKIP ? 'skip' : 'leap',
  }
}

/**
 * Intent: the term steering the note at `attackIndex`: the block's next move, cycled in order,
 * counting the moves the phrase makes. A joined phrase's first note is reached by a move from the
 * carried pitch, so the list starts there; an unjoined phrase's first note is reached by none, so
 * the list starts at its second note. No term without a block, at strength none, with an empty
 * list, or at a note no move reaches.
 */
// @spec-link [[rule_jam_melody_follows_doodle_moves]]
// @spec-link [[rule_jam_drift_positions]]
export function pitchSteeringTerm(
  block: SteeringBlock | undefined,
  attackIndex: number,
  joined: boolean,
): PitchSteeringTerm | undefined {
  if (block === undefined || block.strength === 'none' || block.moves.length === 0) return undefined
  const moveIndex = joined ? attackIndex : attackIndex - 1
  if (moveIndex < 0) return undefined
  return { move: block.moves[moveIndex % block.moves.length]!, strength: block.strength }
}

/**
 * Intent: how far a candidate's move from the note before differs from the steering move, lower
 * first. Direction only: 0 when the direction agrees (up, down or the same note), else 1. Size and
 * direction: 0 when both agree, 1 when only the direction does, else 2.
 */
// @spec-link [[rule_jam_melody_follows_doodle_moves]]
// @spec-link [[rule_doodle_only_orders_candidates]]
export function moveDisagreement(term: PitchSteeringTerm, priorMidi: number, midi: number): number {
  const move = melodicMoveBetween(priorMidi, midi)
  if (move.direction !== term.move.direction) return term.strength === 'direction' ? 1 : 2
  if (term.strength === 'direction' || move.direction === 'same') return 0
  return term.move.direction !== 'same' && move.size === term.move.size ? 0 : 1
}
