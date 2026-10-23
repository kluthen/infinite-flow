/**
 * Inputs for the rhythm lock's search tests: a cheap real intent on the lock test's rhythm
 * controls (see ../../rhythm/rhythm-lock-fixture.ts), with or without the lock group, and the one
 * window search input the orchestrator would build for it, the lock's order included when the
 * request holds locked bars.
 */

import { makeGenerationControls, type TensionArc } from '@/domain/controls/generation-controls'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { resolveCoreRequests } from '@/domain/generation/orchestration/request-resolution'
import { GENERATION_SEARCH_POLICY_V1 } from '@/domain/generation/orchestration/search-ledger'
import type { WindowSearchInput } from '@/domain/generation/orchestration/window-search'
import type { RequestRhythmLock } from '@/domain/generation/request-rhythm-lock'
import type { RegisterChoice } from '@/domain/profile/register-intent'
import { makeSeed } from '@/domain/random/seed'
import { makeRhythmLockOrder } from '@/domain/rhythm/rhythm-lock-order'

import { LOCK_TEST_RHYTHM_CONTROLS, lockTestDomain } from '../../rhythm/rhythm-lock-fixture'
import { computeRankedDomains } from './generation-orchestrator-fixture'

/** Intent: a cheap real intent on the lock test's rhythm controls, with the lock group if given. */
export function lockTestIntent(options: {
  readonly tension: TensionArc
  readonly seed: number
  readonly rhythmLock?: RequestRhythmLock
  readonly register?: RegisterChoice
}): GenerationIntent {
  const controls = makeGenerationControls({
    tempo: 90,
    tonalCenter: 'C',
    collection: 'Major',
    harmonicMotion: 'Gentle diatonic',
    tension: options.tension,
    ...LOCK_TEST_RHYTHM_CONTROLS,
    contour: 'Arch',
    register: options.register ?? 'Middle',
    leapiness: 'Shaped',
    arpeggioChaos: 'Predictable',
    instrumentProfileId: 'c-keyboard',
  })
  return createGenerationIntent({
    requestId: makeRequestId(`rhythm-lock-${options.tension}-${options.seed}`),
    seed: makeSeed(options.seed),
    controls,
    figureLevels: NEUTRAL_FIGURE_LEVELS,
    ...(options.rhythmLock === undefined ? {} : { rhythmLock: options.rhythmLock }),
  })
}

/** Intent: the first window search input of an intent, as the orchestrator builds it. */
export function lockTestWindowInput(intent: GenerationIntent): WindowSearchInput {
  const { rankedHarmony, rankedRhythm } = computeRankedDomains(intent)
  const request = resolveCoreRequests(intent)[0]!
  const state = intent.rhythmLock?.state
  const base = {
    intent,
    request,
    rankedHarmony,
    rankedRhythm,
    searchPolicy: GENERATION_SEARCH_POLICY_V1,
  }
  if (state?.kind !== 'locked') return base
  const rhythmLockOrder = makeRhythmLockOrder({
    domain: lockTestDomain(intent.controls.tension),
    seeded: rankedRhythm.candidates,
    lockedBars: state.bars,
  })
  return { ...base, rhythmLockOrder }
}
