/**
 * How a carried pitch enters the pitch search of the phrase after a join: as the note sounding
 * before beat 1. Only the leap state crosses: the carried pitch becomes the motion reducer's prior
 * note (so the first interval meets the interval cap and counts in the new phrase's leap budget),
 * a same-direction chain of skips or leaps arriving at it stays open, and an owed large-leap
 * recovery falls due on the first note. Tension figures stay inside one phrase: the carried pitch
 * never prepares a non-chord tone of the new phrase.
 */

import { deepFreeze } from '../events/deep-freeze'
import type { CarryIn } from '../generation/carry-in/carry-in'
import { INITIAL_MOTION_STATE, type MotionNote, type MotionState } from './pitch-motion'

/**
 * The harmony-event index and bar index given to notes of the phrase before the join. It differs
 * from every index of the new phrase, whose first harmony event always starts afresh on beat 1, so
 * a chain of skips or leaps spanning the join is never recognized as a chord-tone run.
 */
// @spec-link [[rule_join_interval_obeys_phrase_rules]]
export const BEFORE_JOIN_POSITION = -1

/** A skip: the smallest interval that opens or continues a wide chain. */
const WIDE = 3

/** Intent: true when the carried pitch is a tone of the carried final chord. */
function carriedChordTone(carryIn: CarryIn): boolean {
  const pitchClass = ((carryIn.lastPitch.midi % 12) + 12) % 12
  return (carryIn.finalHarmony.triad.pitchClasses as readonly number[]).includes(pitchClass)
}

/**
 * Intent: the motion state a phrase's pitch search starts from: the empty first-release state
 * without carry-in, or, with one, the carried pitch as prior note with its open chain and any owed
 * recovery due on the first note. The note before the carried pitch is represented only by its
 * pitch and its place before the join; whether it was a chord tone is unknown and never read,
 * because a chain holding it spans the join and so can never form a run.
 */
// @spec-link [[rule_no_carry_in_output_matches_v1]]
// @spec-link [[rule_join_inherits_leap_recovery]]
// @spec-link [[rule_join_interval_obeys_phrase_rules]]
export function carriedMotionState(carryIn: CarryIn | undefined): MotionState {
  if (carryIn === undefined) return INITIAL_MOTION_STATE
  const { midi, arrivingInterval, recovery } = carryIn.lastPitch
  const carried: MotionNote = {
    midi,
    chordTone: carriedChordTone(carryIn),
    harmonyIndex: BEFORE_JOIN_POSITION,
    barIndex: BEFORE_JOIN_POSITION,
  }
  const chainOpen = arrivingInterval !== null && Math.abs(arrivingInterval) >= WIDE
  const chain: Pick<MotionState, 'chainDirection' | 'chainNotes'> = chainOpen
    ? {
        chainDirection: Math.sign(arrivingInterval) as -1 | 1,
        chainNotes: [
          {
            midi: midi - arrivingInterval,
            chordTone: false,
            harmonyIndex: BEFORE_JOIN_POSITION,
            barIndex: BEFORE_JOIN_POSITION,
          },
          carried,
        ],
      }
    : { chainDirection: 0, chainNotes: [] }
  return deepFreeze({
    ...INITIAL_MOTION_STATE,
    prior: carried,
    ...chain,
    ...(recovery.kind === 'owed'
      ? { debt: { direction: recovery.leapDirection, mode: 'due_next' as const } }
      : {}),
  })
}
