/**
 * Shared builders for the carry-in tests: real boundary-constructed intents, real generated
 * phrases, the carry-in each one hands forward, and the attack facts a join is judged on.
 */

import {
  makeGenerationControls,
  type GenerationControls,
  type MusicalProfile,
} from '@/domain/controls/generation-controls'
import type { Measure } from '@/domain/events/measure'
import { deriveCarryIn } from '@/domain/generation/carry-in/carry-in-derivation'
import type { CarryIn } from '@/domain/generation/carry-in/carry-in'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import { makeSeed } from '@/domain/random/seed'

/** A successful generation outcome. */
export type SuccessOutcome = Extract<GenerationOutcome, { kind: 'generation_success' }>

/** The default, cheap-to-search control set the focused carry-in tests start from. */
export const BASE_CONTROLS: GenerationControls = makeGenerationControls({
  tempo: 90,
  tonalCenter: 'C',
  collection: 'Major',
  harmonicMotion: 'Gentle diatonic',
  tension: 'Settled',
  noteDensity: 'Quarter',
  rhythmicVariety: 'Slightly varied',
  syncopation: 'Straight',
  silenceDensity: 'Sparse',
  contour: 'Wandering',
  register: 'Middle',
  leapiness: 'Leaping',
  arpeggioChaos: 'Predictable',
  instrumentProfileId: 'c-keyboard',
})

/** Intent: build one real intent for written controls, a seed and an optional carry-in. */
export function buildIntent(options: {
  readonly controls?: Partial<GenerationControls>
  readonly musicalProfile?: MusicalProfile
  readonly seed: number
  readonly carryIn?: CarryIn
  readonly label?: string
}): GenerationIntent {
  const controls = makeGenerationControls({ ...BASE_CONTROLS, ...options.controls })
  const label = options.label ?? 'carry-in'
  return createGenerationIntent({
    requestId: makeRequestId(`${label}-${options.seed}`),
    seed: makeSeed(options.seed),
    controls,
    musicalProfile: { musicalProfile: options.musicalProfile ?? 'Neutral', isCustom: true },
    ...(options.carryIn === undefined ? {} : { carryIn: options.carryIn }),
  })
}

/** Intent: generate a phrase that must succeed, failing the test loudly otherwise. */
export function generateSuccess(intent: GenerationIntent): SuccessOutcome {
  const outcome = generatePhrase(intent)
  if (outcome.kind !== 'generation_success')
    throw new Error(`Expected a successful phrase, got ${outcome.code}.`)
  return outcome
}

/** Intent: the carry-in a successful phrase hands forward as the given session ordinal. */
export function carryInAfter(
  intent: GenerationIntent,
  outcome: SuccessOutcome,
  phraseNumber: number,
): CarryIn {
  return deriveCarryIn({ intent, outcome, phraseNumber })
}

/** Intent: every chronological attack (non-tie-continuation note) MIDI pitch of a timeline. */
export function attackMidis(measures: readonly Measure[]): readonly number[] {
  const midis: number[] = []
  for (const measure of measures)
    for (const event of measure.events)
      if (event.kind === 'note' && !event.tieContinuation) midis.push(event.pitch)
  return midis
}
