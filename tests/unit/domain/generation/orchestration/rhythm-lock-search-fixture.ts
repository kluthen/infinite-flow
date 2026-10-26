/**
 * Inputs for the rhythm lock's search tests: a cheap real intent on the lock test's rhythm
 * controls (see ../../rhythm/rhythm-lock-fixture.ts) or on given ones, with or without the lock
 * group, and the one window search input the orchestrator would build for it, the lock's order
 * (with its rhythm change draw) included when the request holds locked bars.
 */

import {
  makeGenerationControls,
  type GenerationControls,
  type TensionArc,
} from '@/domain/controls/generation-controls'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { SHARED_CANONICAL_RHYTHM_DOMAIN_MEMO } from '@/domain/generation/orchestration/canonical-rhythm-domain'
import { rhythmDomainInputOf } from '@/domain/generation/orchestration/generation-orchestrator'
import { resolveCoreRequests } from '@/domain/generation/orchestration/request-resolution'
import { GENERATION_SEARCH_POLICY_V1 } from '@/domain/generation/orchestration/search-ledger'
import type { WindowSearchInput } from '@/domain/generation/orchestration/window-search'
import type { RequestRhythmLock } from '@/domain/generation/request-rhythm-lock'
import type { RegisterChoice } from '@/domain/profile/register-intent'
import { makeSeed } from '@/domain/random/seed'
import { drawRhythmChange } from '@/domain/rhythm/rhythm-change-draw'
import { makeRhythmLockOrder } from '@/domain/rhythm/rhythm-lock-order'
import { isNoLegalRhythmPlan } from '@/domain/rhythm/rhythm-planner'

import { LOCK_TEST_RHYTHM_CONTROLS } from '../../rhythm/rhythm-lock-fixture'
import { computeRankedDomains } from './generation-orchestrator-fixture'

/** The four rhythm controls an intent's rhythm domain depends on, apart from the tension. */
export type LockTestRhythmControls = Pick<
  GenerationControls,
  'noteDensity' | 'rhythmicVariety' | 'syncopation' | 'silenceDensity'
>

/**
 * Intent: a cheap real intent on the lock test's rhythm controls, or the given ones, with the
 * lock group if given.
 */
export function lockTestIntent(options: {
  readonly tension: TensionArc
  readonly seed: number
  readonly rhythmLock?: RequestRhythmLock
  readonly register?: RegisterChoice
  readonly rhythmControls?: LockTestRhythmControls
}): GenerationIntent {
  const controls = makeGenerationControls({
    tempo: 90,
    tonalCenter: 'C',
    collection: 'Major',
    harmonicMotion: 'Gentle diatonic',
    tension: options.tension,
    ...(options.rhythmControls ?? LOCK_TEST_RHYTHM_CONTROLS),
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

/**
 * Intent: the first window search input of an intent, as the orchestrator builds it: the lock's
 * order over the canonical domain, with the phrase's rhythm change draw when one is made.
 */
export function lockTestWindowInput(intent: GenerationIntent): WindowSearchInput {
  const { rankedHarmony, rankedRhythm } = computeRankedDomains(intent)
  const request = resolveCoreRequests(intent)[0]!
  const lock = intent.rhythmLock
  const base = {
    intent,
    request,
    rankedHarmony,
    rankedRhythm,
    searchPolicy: GENERATION_SEARCH_POLICY_V1,
  }
  if (lock?.state.kind !== 'locked') return base
  const canonical = SHARED_CANONICAL_RHYTHM_DOMAIN_MEMO.lookup(rhythmDomainInputOf(intent))
  if (isNoLegalRhythmPlan(canonical)) throw new Error('Fixture setup: the domain has no plan.')
  const lockedBars = lock.state.bars
  const domain = canonical.candidates
  const seeded = rankedRhythm.candidates
  const change = drawRhythmChange({
    domain,
    seeded,
    lockedBars,
    allowedChanges: lock.allowedChanges,
    seed: intent.seed,
    tenserPhrase: lock.tenserPhrase,
  })
  const rhythmLockOrder = makeRhythmLockOrder({
    domain,
    seeded,
    lockedBars,
    ...(change === undefined ? {} : { change }),
  })
  return { ...base, rhythmLockOrder }
}
