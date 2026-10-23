/**
 * Shared inputs for the rhythm lock's tests: one small real rhythm domain that holds rhythms written
 * alike under different identities, rhythms that sound alike but are tied differently, and (at
 * Build) rhythms missing at Lift (Quarter, Slightly varied, Occasional offbeats, Sparse); locked
 * bars taken from a candidate; and a tie variant of a candidate's bars.
 */

import type { TensionArc } from '@/domain/controls/generation-controls'
import { rankMaterializedRhythmCandidates } from '@/domain/generation/orchestration/candidate-ranking'
import {
  makeRequestRhythmLock,
  type LockedRhythmMeasure,
  type RequestRhythmLock,
} from '@/domain/generation/request-rhythm-lock'
import type { Seed } from '@/domain/random/seed'
import { rhythmBarKey } from '@/domain/rhythm/rhythm-bars'
import { isNoLegalRhythmPlan, makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'
import type { RhythmCandidate, RhythmExpansionInput } from '@/domain/rhythm/rhythm-types'

/** The rhythm controls of the lock tests, apart from the tension. */
export const LOCK_TEST_RHYTHM_CONTROLS = Object.freeze({
  noteDensity: 'Quarter',
  rhythmicVariety: 'Slightly varied',
  syncopation: 'Occasional offbeats',
  silenceDensity: 'Sparse',
} as const)

/** Intent: the whole domain of the lock test controls at one tension, in domain order, frozen. */
export function lockTestDomain(tensionArc: TensionArc): readonly RhythmCandidate[] {
  const input: RhythmExpansionInput = { ...LOCK_TEST_RHYTHM_CONTROLS, tensionArc }
  const result = makeRhythmCandidateDomain(input)
  if (isNoLegalRhythmPlan(result)) throw new Error('Fixture setup: the lock domain has no plan.')
  return Object.freeze([...result.candidates()])
}

/** Intent: a domain's seeded order for one seed, as the orchestrator ranks it. */
export function seededOrder(
  domain: readonly RhythmCandidate[],
  seed: Seed,
): readonly RhythmCandidate[] {
  return rankMaterializedRhythmCandidates(domain[0]!.grammarVersion, domain, seed).candidates
}

/** Intent: a candidate's bars as the request's locked bars. */
export function lockedBarsOf(candidate: RhythmCandidate): readonly LockedRhythmMeasure[] {
  return candidate.bars.map((bar) =>
    bar.events.map((event) => ({
      kind: event.kind,
      startTick: event.startTick,
      durationTicks: event.durationTicks,
      tieContinuation: event.tieContinuation === true,
    })),
  )
}

/** Intent: the request's rhythm lock group, on with these bars and no allowed change. */
export function lockOn(bars: readonly LockedRhythmMeasure[]): RequestRhythmLock {
  return makeRequestRhythmLock({
    state: { kind: 'locked', bars },
    allowedChanges: [],
    tenserPhrase: false,
  })
}

/** Intent: the request's rhythm lock group, on with nothing locked yet. */
export function lockPending(): RequestRhythmLock {
  return makeRequestRhythmLock({
    state: { kind: 'pending' },
    allowedChanges: [],
    tenserPhrase: false,
  })
}

/**
 * Intent: the first candidate's bars with one note of two ticks or more split into two tied
 * notes, written in no candidate of the domain: the same starts (a tie continuation starts
 * nothing), so at distance 0, but other bars. Throws when the domain offers none.
 */
export function tieVariantOutsideDomain(domain: readonly RhythmCandidate[]): {
  readonly source: RhythmCandidate
  readonly bars: readonly LockedRhythmMeasure[]
} {
  const keys = new Set(domain.map((candidate) => rhythmBarKey(candidate.bars)))
  for (const source of domain) {
    const bars = lockedBarsOf(source)
    for (const [measureIndex, measure] of bars.entries()) {
      for (const [eventIndex, event] of measure.entries()) {
        if (event.kind !== 'note' || event.durationTicks < 2) continue
        const head = { ...event, durationTicks: 1 }
        const tail = {
          kind: 'note' as const,
          startTick: event.startTick + 1,
          durationTicks: event.durationTicks - 1,
          tieContinuation: true,
        }
        const split = [
          ...measure.slice(0, eventIndex),
          head,
          tail,
          ...measure.slice(eventIndex + 1),
        ]
        const variant = bars.map((other, index) => (index === measureIndex ? split : other))
        if (!keys.has(rhythmBarKey(variant.map((events) => ({ events })))))
          return { source, bars: variant }
      }
    }
  }
  throw new Error('Fixture setup: no tie variant outside the domain.')
}
