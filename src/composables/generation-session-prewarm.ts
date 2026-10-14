/**
 * The workspace session's rhythm-domain prewarm trigger, split out of use-generation-session.ts:
 * it turns "the width-resolved rhythm setting may have changed" into at most one fire-and-forget
 * prewarm post per actual change, under a fixed identity that never draws from the session's seed
 * or request-id providers.
 */

import type { GenerationControls } from '@/domain/controls/generation-controls'
import type { ProfileSelection } from '@/domain/controls/profile-selection'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request-envelope'
import { makeSeed } from '@/domain/random/seed'

/**
 * The seed every prewarm intent carries. The rhythm domain a prewarm builds is seed-independent,
 * so any fixed value works; a fixed one keeps the session's seed provider untouched, so a queued
 * seed sequence is drawn exactly as it would be with prewarm disabled.
 */
export const PREWARM_SEED = makeSeed(0)

/** The request id every prewarm intent carries; a prewarm is never answered, so it is never correlated. */
export const PREWARM_REQUEST_ID = makeRequestId('workspace-prewarm')

/** Where a prewarm intent goes: the generation worker client's fire-and-forget `prewarm`. */
export type PostPrewarm = (intent: GenerationIntent) => void

/**
 * Called with the controls a phrase would be generated with right now (note density already
 * resolved against the window's width) and the current profile selection.
 */
export type RhythmPrewarmTrigger = (
  generatedControls: GenerationControls,
  musicalProfile: ProfileSelection,
) => void

/**
 * Intent: the rhythm setting of an intent, as the dedupe key: the same five controls the worker's
 * rhythm-domain memo is keyed by (`rhythmDomainInputOf` in generation-orchestrator.ts, not imported
 * here so the page bundle never pulls in the generator; a unit test pins the two together).
 */
// @spec-link [[module_generation_prewarm]]
export function rhythmSettingKeyOf(intent: GenerationIntent): string {
  const { noteDensity, rhythmicVariety, silenceDensity, syncopation, tension } = intent.controls
  return JSON.stringify({
    noteDensity,
    rhythmicVariety,
    silenceDensity,
    syncopation,
    tensionArc: tension,
  })
}

/**
 * Intent: build a trigger that posts one prewarm whenever the rhythm setting it is given differs
 * from the last one it posted (the first call always posts), so a non-rhythm edit (tonal center,
 * tempo, contour...) and a width crossing that leaves the generated density unchanged post nothing.
 */
// @spec-link [[module_generation_prewarm]]
export function createRhythmPrewarmTrigger(post: PostPrewarm): RhythmPrewarmTrigger {
  let lastPostedKey: string | undefined
  return (generatedControls, musicalProfile) => {
    const intent = createGenerationIntent({
      requestId: PREWARM_REQUEST_ID,
      seed: PREWARM_SEED,
      controls: generatedControls,
      musicalProfile,
    })
    const key = rhythmSettingKeyOf(intent)
    if (key === lastPostedKey) return
    lastPostedKey = key
    post(intent)
  }
}
