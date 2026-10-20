/**
 * The figure levels cross the generation worker boundary inside the intent posted to the worker,
 * for a generate request and a prewarm message alike, and are re-validated from untrusted
 * structured-clone input: required and well formed. The intent holds no musical profile: levels no
 * profile gives cross unchanged, and a wire intent holding a profile is refused as an unknown
 * field.
 */

import { describe, expect, it } from 'vitest'

import { makeGenerationControls } from '@/domain/controls/generation-controls'
import {
  JAZZ_FIGURE_LEVELS,
  NEUTRAL_FIGURE_LEVELS,
  type FigureLevels,
  levelsForProfile,
} from '@/domain/figures/figure-levels'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { makeSeed } from '@/domain/random/seed'
import {
  parseGenerationWorkerPrewarm,
  parseGenerationWorkerRequest,
} from '@/generation-worker/generation-worker-inbound'
import { GenerationWorkerProtocolError } from '@/generation-worker/generation-worker-protocol'

/** Intent: one real cheap-to-search intent for the given musical profile. */
function intentFor(musicalProfile: 'Neutral' | 'Jazz'): GenerationIntent {
  return createGenerationIntent({
    requestId: makeRequestId(`figure-levels-${musicalProfile}`),
    seed: makeSeed(3),
    controls: makeGenerationControls({
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
    }),
    figureLevels: levelsForProfile(musicalProfile),
  })
}

/** Intent: one real intent built from levels no musical profile gives. */
function intentWithOwnLevels(): GenerationIntent {
  const levels: FigureLevels = {
    ...NEUTRAL_FIGURE_LEVELS,
    appoggiatura: 'favored',
    diatonicEnclosure: 'stronglyFavored',
  }
  const { requestId, seed, controls, writtenTonalCenter } = intentFor('Neutral')
  return createGenerationIntent({
    requestId,
    seed,
    controls: { ...controls, tonalCenter: writtenTonalCenter },
    figureLevels: levels,
  })
}

/** Intent: a structured clone of a Neutral intent with its figure levels replaced by `levels`. */
function neutralWireIntentWith(levels: unknown): Record<string, unknown> {
  return { ...structuredClone(intentFor('Neutral')), figureLevels: levels }
}

/** Intent: a structured clone of a Neutral intent with no figure levels field at all. */
function neutralWireIntentWithoutLevels(): Record<string, unknown> {
  const { figureLevels, ...rest } = structuredClone(intentFor('Neutral'))
  void figureLevels
  return rest
}

const { appoggiatura, ...missingFigure } = NEUTRAL_FIGURE_LEVELS
void appoggiatura

const REFUSED: readonly { readonly name: string; readonly intent: () => unknown }[] = [
  { name: 'levels missing a figure', intent: () => neutralWireIntentWith(missingFigure) },
  {
    name: 'levels naming an unknown figure',
    intent: () => neutralWireIntentWith({ ...NEUTRAL_FIGURE_LEVELS, blueNote: 'off' }),
  },
  {
    name: 'levels holding an unknown level',
    intent: () => neutralWireIntentWith({ ...NEUTRAL_FIGURE_LEVELS, passingTone: 'often' }),
  },
  { name: 'levels that are not an object', intent: () => neutralWireIntentWith('asToday') },
  { name: 'the levels field absent', intent: neutralWireIntentWithoutLevels },
  {
    name: 'a musical profile field',
    intent: () => ({
      ...structuredClone(intentFor('Neutral')),
      musicalProfile: { musicalProfile: 'Neutral', isCustom: false },
    }),
  },
]

// @test-link [[module_generation_worker_protocol]]
describe('generation worker protocol with figure levels', () => {
  it.each(['Neutral', 'Jazz'] as const)(
    'round-trips a %s intent with its levels in a request and a prewarm',
    (musicalProfile) => {
      const intent = intentFor(musicalProfile)
      const request = parseGenerationWorkerRequest(
        structuredClone({ type: 'generate', id: 5, intent }),
      )
      const prewarm = parseGenerationWorkerPrewarm(structuredClone({ type: 'prewarm', intent }))
      const levels = musicalProfile === 'Neutral' ? NEUTRAL_FIGURE_LEVELS : JAZZ_FIGURE_LEVELS
      for (const parsed of [request.intent, prewarm.intent]) {
        expect(parsed).toStrictEqual(intent)
        expect(parsed.figureLevels).toStrictEqual(levels)
      }
    },
  )

  it('round-trips an intent whose levels no musical profile gives, holding no profile', () => {
    const intent = intentWithOwnLevels()
    expect(Object.keys(intent)).not.toContain('musicalProfile')
    const request = parseGenerationWorkerRequest(
      structuredClone({ type: 'generate', id: 9, intent }),
    )
    const prewarm = parseGenerationWorkerPrewarm(structuredClone({ type: 'prewarm', intent }))
    for (const parsed of [request.intent, prewarm.intent]) {
      expect(parsed).toStrictEqual(intent)
      expect(parsed.figureLevels.diatonicEnclosure).toBe('stronglyFavored')
    }
  })

  it.each(REFUSED)('refuses a request whose intent has $name', ({ intent }) => {
    expect(() =>
      parseGenerationWorkerRequest({ type: 'generate', id: 6, intent: intent() }),
    ).toThrow(GenerationWorkerProtocolError)
  })

  it.each(REFUSED)('refuses a prewarm whose intent has $name', ({ intent }) => {
    expect(() => parseGenerationWorkerPrewarm({ type: 'prewarm', intent: intent() })).toThrow(
      GenerationWorkerProtocolError,
    )
  })

  it('names the figure levels field and the cause of a malformed value', () => {
    expect(() =>
      parseGenerationWorkerRequest({
        type: 'generate',
        id: 7,
        intent: neutralWireIntentWith(missingFigure),
      }),
    ).toThrow(/GenerationWorkerRequest\.intent\.figureLevels.*missing the figure "appoggiatura"/u)
    expect(() =>
      parseGenerationWorkerRequest({
        type: 'generate',
        id: 8,
        intent: neutralWireIntentWithoutLevels(),
      }),
    ).toThrow(/GenerationWorkerRequest\.intent\.figureLevels is missing/u)
    expect(() =>
      parseGenerationWorkerRequest({
        type: 'generate',
        id: 10,
        intent: neutralWireIntentWith({ ...NEUTRAL_FIGURE_LEVELS, blueNote: 'off' }),
      }),
    ).toThrow(/GenerationWorkerRequest\.intent\.figureLevels.*unknown figure "blueNote"/u)
    expect(() =>
      parseGenerationWorkerRequest({
        type: 'generate',
        id: 11,
        intent: neutralWireIntentWith({ ...NEUTRAL_FIGURE_LEVELS, passingTone: 'often' }),
      }),
    ).toThrow(/GenerationWorkerRequest\.intent\.figureLevels.*unknown level "often"/u)
  })

  it('refuses an intent holding a musical profile as an unknown field', () => {
    const intent = { ...structuredClone(intentFor('Jazz')), musicalProfile: 'Jazz' }
    expect(() => parseGenerationWorkerRequest({ type: 'generate', id: 12, intent })).toThrow(
      /GenerationWorkerRequest\.intent has unknown field "musicalProfile"/u,
    )
  })
})
