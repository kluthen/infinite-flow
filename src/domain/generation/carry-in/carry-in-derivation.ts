/**
 * Derive the carry-in a successfully generated phrase hands forward to the next phrase of its
 * session. Reads only the phrase's own immutable outcome (result timeline, resolved request and
 * selected harmony and rhythm) plus the leapiness it was generated with, and replays the phrase's
 * notes through the same leap-state reducer the planner used, so the carried leap state is exactly
 * the state after the phrase's last sounding note.
 */

import { makeConcertPitch } from '../../events/concert-pitch'
import { LEAPINESS_LIMITS, advanceMotion, type MotionState } from '../../pitch/pitch-motion'
import { harmonyEventIndexAt, soundingSpans } from '../../pitch/pitch-harmony'
import { carriedMotionState } from '../../pitch/pitch-carry-in'
import type { GenerationIntent } from '../generation-intent'
import type { GenerationOutcome } from '../orchestration/orchestration-types'
import { CarryInError, makeCarryIn, type CarriedRecovery, type CarryIn } from './carry-in'

/** One successful phrase, the intent it was generated from, and its ordinal in the session. */
export interface CarryInSource {
  readonly intent: GenerationIntent
  readonly outcome: Extract<GenerationOutcome, { kind: 'generation_success' }>
  readonly phraseNumber: number
}

/** Intent: the attack MIDI values of a timeline, in order; ties continue an attack. */
function attackMidis(source: CarryInSource): readonly number[] {
  return source.outcome.result.timeline.measures.flatMap((measure) =>
    measure.events.flatMap((event) =>
      event.kind === 'note' && !event.tieContinuation ? [event.pitch as number] : [],
    ),
  )
}

/**
 * Intent: replay the phrase's sounding notes through the leap-state reducer, starting from the
 * state its own carry-in gave it (or the empty state), and return the state after its last note.
 * A rejection means the outcome was never a valid phrase, which is a caller bug.
 */
function finalMotionState(source: CarryInSource, midis: readonly number[]): MotionState {
  const { intent, outcome } = source
  const { harmony, rhythm } = outcome.provenance
  const limits = LEAPINESS_LIMITS[intent.controls.leapiness]
  const spans = soundingSpans(rhythm)
  if (spans.length !== midis.length)
    throw new CarryInError('The phrase timeline does not match its rhythm provenance.')
  let state = carriedMotionState(outcome.request.carryIn)
  spans.forEach((span, index) => {
    const harmonyIndex = harmonyEventIndexAt(harmony, span.start)
    const midi = midis[index]!
    const chord = harmony.events[harmonyIndex]!.triad.pitchClasses as readonly number[]
    const result = advanceMotion(limits, state, {
      midi,
      chordTone: chord.includes(((midi % 12) + 12) % 12),
      harmonyIndex,
      barIndex: span.barIndex,
    })
    if (result.kind === 'rejected')
      throw new CarryInError(
        `The phrase breaks the leap rules at attack ${index}: ${result.reason}.`,
      )
    state = result.state
  })
  return state
}

/**
 * Intent: derive the carry-in of one successful phrase: its last sounding pitch with the interval
 * that arrived at it (from the carried pitch when the phrase sounded one note) and any recovery
 * still owed, its resolved register window, its final harmony event and endpoint class, and the
 * ordinal it was given.
 */
// @spec-link [[entity_phrase_carry_in]]
// @spec-link [[rule_join_carry_in_limited]]
export function deriveCarryIn(source: CarryInSource): CarryIn {
  const midis = attackMidis(source)
  const last = midis.at(-1)
  if (last === undefined) throw new CarryInError('A phrase with no sounding note carries nothing.')
  const before = midis.at(-2) ?? source.outcome.request.carryIn?.lastPitch.midi
  const debt = finalMotionState(source, midis).debt
  const recovery: CarriedRecovery = debt
    ? { kind: 'owed', leapDirection: debt.direction }
    : { kind: 'settled' }
  const { harmony } = source.outcome.provenance
  const finalEvent = harmony.events.at(-1)!
  return makeCarryIn({
    lastPitch: {
      midi: makeConcertPitch(last),
      arrivingInterval: before === undefined ? null : last - before,
      recovery,
    },
    registerWindow: source.outcome.request.registerWindow,
    finalHarmony: { triad: finalEvent.triad, role: finalEvent.role, endpoint: harmony.endpoint },
    phraseNumber: source.phraseNumber,
  })
}
