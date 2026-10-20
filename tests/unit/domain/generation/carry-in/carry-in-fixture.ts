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
import { levelsForProfile, type FigureLevels } from '@/domain/figures/figure-levels'
import { deriveCarryIn } from '@/domain/generation/carry-in/carry-in-derivation'
import { makeCarryIn, type CarryIn } from '@/domain/generation/carry-in/carry-in'
import { makeCarryInGenerationIntent } from '@/domain/generation/carry-in/carry-in-intent'
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

/**
 * Intent: build one real intent for written controls, a seed and an optional carry-in, with the
 * given figure levels, or else the given profile's (Neutral's by default).
 */
export function buildIntent(options: {
  readonly controls?: Partial<GenerationControls>
  readonly musicalProfile?: MusicalProfile
  readonly figureLevels?: FigureLevels
  readonly seed: number
  readonly carryIn?: CarryIn
  readonly label?: string
}): GenerationIntent {
  const controls = makeGenerationControls({ ...BASE_CONTROLS, ...options.controls })
  const label = options.label ?? 'carry-in'
  const input = {
    requestId: makeRequestId(`${label}-${options.seed}`),
    seed: makeSeed(options.seed),
    controls,
    figureLevels: options.figureLevels ?? levelsForProfile(options.musicalProfile ?? 'Neutral'),
  }
  return options.carryIn === undefined
    ? createGenerationIntent(input)
    : makeCarryInGenerationIntent({ ...input, carryIn: options.carryIn })
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

/**
 * Intent: a real intent for phrase 2 of a session whose key and collection changed after phrase 1:
 * a C Ionian phrase 1 (seed 11) hands forward its carry-in with the harmony dropped (null), and an
 * F# Dorian intent with the given seed receives it.
 */
export function keyChangeIntent(seed: number, label = 'key-change'): GenerationIntent {
  const firstIntent = buildIntent({
    seed: 11,
    controls: { tonalCenter: 'C', collection: 'Ionian' },
    label,
  })
  const carryIn = carryInAfter(firstIntent, generateSuccess(firstIntent), 1)
  return buildIntent({
    seed,
    controls: { tonalCenter: 'F#', collection: 'Dorian' },
    label,
    carryIn: makeCarryIn({ ...carryIn, finalHarmony: null }),
  })
}

/** Intent: every chronological attack (non-tie-continuation note) MIDI pitch of a timeline. */
export function attackMidis(measures: readonly Measure[]): readonly number[] {
  const midis: number[] = []
  for (const measure of measures)
    for (const event of measure.events)
      if (event.kind === 'note' && !event.tieContinuation) midis.push(event.pitch)
  return midis
}
