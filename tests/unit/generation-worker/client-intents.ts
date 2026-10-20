/**
 * Real, cheap-to-search generation intents for the generation worker client's tests, told apart
 * by their request id and seed.
 */

import {
  makeGenerationControls,
  type GenerationControls,
} from '@/domain/controls/generation-controls'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { makeSeed } from '@/domain/random/seed'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'

const CHEAP_CONTROLS: GenerationControls = makeGenerationControls({
  tempo: 90,
  tonalCenter: 'C',
  collection: 'Major',
  harmonicMotion: 'Gentle diatonic',
  tension: 'Settled',
  noteDensity: 'Quarter',
  rhythmicVariety: 'Strict',
  syncopation: 'Straight',
  silenceDensity: 'Sparse',
  contour: 'Arch',
  register: 'Middle',
  leapiness: 'Shaped',
  arpeggioChaos: 'Predictable',
  instrumentProfileId: 'c-keyboard',
})

/** Intent: build one real cheap-to-search GenerationIntent, distinguished by requestId/seed. */
export function buildIntent(requestId: string, seed: number): GenerationIntent {
  return createGenerationIntent({
    requestId: makeRequestId(requestId),
    seed: makeSeed(seed),
    controls: CHEAP_CONTROLS,
    figureLevels: NEUTRAL_FIGURE_LEVELS,
  })
}
