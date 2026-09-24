/**
 * Assembly of one resolved GenerationRequest, a chosen RhythmCandidate, and a flat list of
 * synthesized attack MIDI pitches into the final immutable GenerationResult. Walks the rhythm's
 * bars in order, turning each rest into a RestEvent and each note into a NoteEvent: a fresh
 * attack consumes the next attackMidis value, and a tie continuation repeats the most recent
 * attack's pitch rather than consuming one. No annotations are attached at this stage.
 */

import { makeConcertPitch } from '../../events/concert-pitch'
import { makeMeasure } from '../../events/measure'
import { makeNoteEvent, makeRestEvent, type MeasureEvent } from '../../events/measure-event'
import { makeConcertEventTimeline } from '../../events/timeline'
import type { RhythmBar, RhythmCandidate, RhythmEvent } from '../../rhythm/rhythm-types'
import { makeRational } from '../../time/rational'
import { makeGenerationResult, type GenerationResult } from '../generation-result'
import type { GenerationRequest } from '../generation-request'

/** Typed failure for a rejected attempt to assemble a phrase timeline from a rhythm and pitches. */
// @spec-link [[service_generation_orchestration]]
export class PhraseAssemblyError extends Error {
  readonly kind = 'PhraseAssemblyError' as const

  constructor(message: string) {
    super(message)
    this.name = 'PhraseAssemblyError'
  }
}

/** Intent: a fresh note attack is a note event whose tieContinuation is not literally true. */
function isFreshAttack(event: RhythmEvent): boolean {
  return event.kind === 'note' && event.tieContinuation !== true
}

/** Intent: count the fresh (non-tie-continuation) note attacks across every bar of a rhythm. */
function countFreshAttacks(rhythm: RhythmCandidate): number {
  return rhythm.bars.reduce((total, bar) => total + bar.events.filter(isFreshAttack).length, 0)
}

/** Mutable per-walk cursor state: the next unconsumed attack pitch index and the last attack pitch. */
interface WalkState {
  attackCursor: number
  lastAttackMidi: number | undefined
}

/** Intent: translate one rhythm event into its measure event, consuming attackMidis as it walks. */
function translateEvent(
  event: RhythmEvent,
  attackMidis: readonly number[],
  state: WalkState,
): MeasureEvent {
  const duration = makeRational(event.durationTicks, 16)

  if (event.kind === 'rest') {
    return makeRestEvent({ duration })
  }

  if (event.tieContinuation === true) {
    if (state.lastAttackMidi === undefined) {
      throw new PhraseAssemblyError(
        'A tie continuation has no preceding note attack to repeat the pitch of.',
      )
    }
    return makeNoteEvent({
      duration,
      pitch: makeConcertPitch(state.lastAttackMidi),
      tieContinuation: true,
    })
  }

  const midi = attackMidis[state.attackCursor]!
  state.attackCursor += 1
  state.lastAttackMidi = midi
  return makeNoteEvent({ duration, pitch: makeConcertPitch(midi), tieContinuation: false })
}

/** Intent: translate one rhythm bar into its tiling measure, walking events in order. */
function translateBar(bar: RhythmBar, attackMidis: readonly number[], state: WalkState) {
  const events = bar.events.map((event) => translateEvent(event, attackMidis, state))
  return makeMeasure(bar.barIndex, events)
}

/**
 * Intent: assemble the final immutable GenerationResult from a resolved request, a chosen rhythm
 * candidate, and a flat list of synthesized attack MIDI pitches, walking rhythm.bars in order.
 * Rejects an attackMidis length that does not exactly equal the rhythm's fresh note-attack count,
 * and rejects a tie continuation with no preceding attack, each as a typed PhraseAssemblyError.
 */
// @spec-link [[service_generation_orchestration]]
export function assemblePhraseResult(
  request: GenerationRequest,
  rhythm: RhythmCandidate,
  attackMidis: readonly number[],
): GenerationResult {
  const expectedAttackCount = countFreshAttacks(rhythm)
  if (attackMidis.length !== expectedAttackCount) {
    throw new PhraseAssemblyError(
      `Expected ${expectedAttackCount} fresh note attack pitches, got ${attackMidis.length}.`,
    )
  }

  const state: WalkState = { attackCursor: 0, lastAttackMidi: undefined }
  const measures = rhythm.bars.map((bar) => translateBar(bar, attackMidis, state))
  const timeline = makeConcertEventTimeline(measures)

  return makeGenerationResult({ requestId: request.requestId, seed: request.seed, timeline })
}
