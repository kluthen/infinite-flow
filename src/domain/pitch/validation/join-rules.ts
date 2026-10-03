/**
 * Independent validation facts of a join made with carry-in, reconstructed only from the carry-in
 * value, the request and the phrase's own sounding attacks (never from planner state).
 *
 * The carried pitch is the note before the phrase's first attack: interval, chain and recovery
 * rules judge the join exactly as they judge two consecutive notes of one phrase. A tense carried
 * pitch must be resolved by the first attack. And a phrase generated with carry-in may end owing
 * a large leap's recovery or a tense note's resolution that its own next phrase can settle.
 */

import { carriedPitchIsTense, carriedPitchOnCarriedChord } from '../../generation/carry-in/carry-in'
import {
  owedRecoveryCanSettle,
  phraseEndingDebtAllowance,
  resolvesOnto,
  tenseNoteCanSettle,
  type PhraseEndingDebtAllowance,
} from '../../generation/carry-in/phrase-ending-debt'
import { collectionStep } from './phrase-facts'
import type { PhraseFacts, PitchValidationFailure, SoundingFact } from './pitch-validation-types'

/** The facts the interval, chain and recovery rules read about one sounding note. */
export interface MotionFact {
  readonly midi: number
  readonly chordTone: boolean
  /** Compared by identity only: notes under one unchanged harmony event share it. */
  readonly harmony: object
  readonly barIndex: number
}

/** The harmony identity of the carried note: the phrase before's final event, never this phrase's. */
const BEFORE_JOIN_HARMONY: object = Object.freeze({ beforeJoin: true })

/** The carried pitch as the note before the first attack, with its leap state. */
export interface JoinLead {
  readonly note: MotionFact
  /** Direction of a chain of skips or leaps arriving at the carried pitch; 0 when none is open. */
  readonly chainDirection: -1 | 0 | 1
  /** Direction of the large leap whose recovery the carried pitch still owes, if any. */
  readonly owedLeapDirection?: -1 | 1
}

/**
 * Intent: the carried pitch as the note before the first attack; undefined without carry-in. With
 * the carried harmony dropped the pitch is a tone of no chord, and its leap state still applies.
 */
// @spec-link [[rule_join_interval_obeys_phrase_rules]]
// @spec-link [[rule_key_change_drops_harmonic_carry_in]]
export function joinLead(facts: PhraseFacts): JoinLead | undefined {
  const carryIn = facts.context.request.carryIn
  if (carryIn === undefined) return undefined
  const { midi, arrivingInterval, recovery } = carryIn.lastPitch
  const chainOpen = arrivingInterval !== null && Math.abs(arrivingInterval) >= 3
  return {
    note: {
      midi,
      chordTone: carriedPitchOnCarriedChord(carryIn),
      harmony: BEFORE_JOIN_HARMONY,
      barIndex: -1,
    },
    chainDirection: chainOpen ? (Math.sign(arrivingInterval) as -1 | 1) : 0,
    ...(recovery.kind === 'owed' ? { owedLeapDirection: recovery.leapDirection } : {}),
  }
}

/** Intent: what the phrase's final note may still owe, decided by whether it has a carry-in. */
export function endingAllowance(facts: PhraseFacts): PhraseEndingDebtAllowance {
  return phraseEndingDebtAllowance(facts.context.request.carryIn !== undefined)
}

/**
 * Intent: true when a large leap in `leapDirection` whose recovery falls due after the final note
 * may stay owed: the phrase may end owing a recovery and its next phrase can repay it.
 */
// @spec-link [[rule_leap_recovery]]
export function finalRecoveryMayStayOwed(
  facts: PhraseFacts,
  finalMidi: number,
  leapDirection: -1 | 1,
): boolean {
  return (
    endingAllowance(facts).leapRecovery &&
    owedRecoveryCanSettle(
      finalMidi,
      leapDirection,
      facts.collectionPitchClasses,
      facts.context.request.registerWindow,
    )
  )
}

/**
 * Intent: true when `attack` is the final note and a tense ending the phrase may owe: a scale
 * tone outside its chord, prepared by a step from the note before, that the next phrase's first
 * note can resolve inside the window.
 */
// @spec-link [[rule_join_tense_note_resolution]]
// @spec-link [[rule_open_phrase_ending]]
export function isOwedTenseEnding(facts: PhraseFacts, attack: SoundingFact): boolean {
  const before = facts.attacks[attack.index - 1]
  return (
    endingAllowance(facts).tenseNote &&
    attack.index === facts.attacks.length - 1 &&
    !attack.chordTone &&
    attack.inCollection &&
    before !== undefined &&
    collectionStep(before, attack) &&
    tenseNoteCanSettle(
      attack.midi,
      facts.collectionPitchClasses,
      facts.context.request.registerWindow,
    )
  )
}

/**
 * Intent: a tense carried pitch (outside the carried chord) must be resolved by the first attack:
 * a step onto a tone of the chord sounding there. Reported at attack 0 otherwise. A carry-in whose
 * harmony was dropped carries no tense pitch, so nothing is owed.
 */
// @spec-link [[rule_join_tense_note_resolution]]
// @spec-link [[rule_key_change_drops_harmonic_carry_in]]
export function carriedTensionFailures(facts: PhraseFacts): readonly PitchValidationFailure[] {
  const carryIn = facts.context.request.carryIn
  const first = facts.attacks[0]
  if (carryIn === undefined || first === undefined || !carriedPitchIsTense(carryIn)) return []
  const { midi } = carryIn.lastPitch
  const resolved = resolvesOnto(
    midi,
    first.midi,
    first.harmony.triad.pitchClasses as readonly number[],
    facts.collectionPitchClasses,
  )
  return resolved ? [] : [{ code: 'carried_tension_unresolved', attackIndex: 0 }]
}
