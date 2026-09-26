import { describe, expect, it } from 'vitest'

import {
  RHYTHMIC_VARIETIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  TENSION_ARCS,
} from '@/domain/controls/generation-controls'
import { quickRejectRhythmCandidate } from '@/domain/rhythm/rhythm-invariants'
import { normalizeRhythmExpansionInput } from '@/domain/rhythm/rhythm-planner'
import { gestureCannotReachShare } from '@/domain/rhythm/rhythm-variety'
import { validateRhythmCandidate } from '@/domain/rhythm/rhythm-validator'

import {
  enumerateRawRhythmCandidates,
  sameDurationSet,
  sourceCellDurations,
} from './rhythm-prefilter-oracle'
import type { NoteDensity } from '@/domain/controls/generation-controls'

const NOTE_DENSITY: NoteDensity = 'Sixteenth'

const settings = RHYTHMIC_VARIETIES.flatMap((rhythmicVariety) =>
  SILENCE_DENSITIES.flatMap((silenceDensity) =>
    SYNCOPATIONS.flatMap((syncopation) =>
      TENSION_ARCS.map((tensionArc) => ({
        rhythmicVariety,
        silenceDensity,
        syncopation,
        tensionArc,
      })),
    ),
  ),
)

/**
 * ISS-004 feasibility review §3/§9: the prefilter soundness suite is per (density, rhythmic
 * variety level), asserting `quickRejectRhythmCandidate` (per-candidate) and
 * `gestureCannotReachShare` (per-gesture, an over-approximating quick reject one step earlier in
 * the enumeration) are both sound subsets of `validateRhythmCandidate` -- neither ever discards a
 * candidate the full validator would accept, and every gesture the gesture-level prune discards
 * produces only candidates the validator reports `rhythmic_variety_violation` for. The retired
 * Mixed density's coverage-based prune (`coversMixedDurationClasses`) is gone; `rhythmic_variety_violation`
 * (`varietyViolated`/`gestureCannotReachShare`, rhythm-variety.ts) is its ISS-004 replacement.
 */
// @test-link [[module_rhythm_domain_validation]]
// @test-link [[api_rhythm_domain_expansion]]
// @test-link [[module_rhythm_variety_grammar]]
describe(`rhythm enumeration prefilter soundness — ${NOTE_DENSITY} note density`, () => {
  let rejectedTotal = 0
  let rawTotal = 0

  it.each(settings)(
    'prefilter and gesture-prune are sound for variety=$rhythmicVariety silence=$silenceDensity syncopation=$syncopation tension=$tensionArc',
    ({ rhythmicVariety, silenceDensity, syncopation, tensionArc }) => {
      const input = normalizeRhythmExpansionInput({
        noteDensity: NOTE_DENSITY,
        rhythmicVariety,
        silenceDensity,
        syncopation,
        tensionArc,
      })
      const violations: string[] = []

      for (const { gesture, candidate } of enumerateRawRhythmCandidates(input)) {
        rawTotal += 1

        // Gesture-prune lemma: transforms never change a source cell's duration and answer bars
        // copy the gesture's cells, so every candidate derived from a gesture carries exactly the
        // gesture's set of source-cell durations.
        const gestureDurations = sourceCellDurations(gesture.bars)
        const candidateDurations = sourceCellDurations(candidate.bars)
        if (!sameDurationSet(gestureDurations, candidateDurations))
          violations.push(
            `source-cell duration set mismatch: gesture=[${[...gestureDurations]}] candidate=[${[...candidateDurations]}]`,
          )

        const gestureCannotReach = gestureCannotReachShare(
          gesture.bars,
          input.noteDensity,
          input.rhythmicVariety,
        )

        if (quickRejectRhythmCandidate(candidate)) {
          rejectedTotal += 1
          const failures = validateRhythmCandidate(candidate)
          // Prefilter subset of validator: a rejected candidate must also be one the validator
          // would have rejected, so skipping it never changes the surviving candidate set.
          if (failures.length === 0)
            violations.push('quickRejectRhythmCandidate rejected a candidate the validator accepts')
          if (gestureCannotReach && !failures.includes('rhythmic_variety_violation'))
            violations.push(
              'candidate from a share-unreachable gesture was not reported rhythmic_variety_violation',
            )
        } else if (gestureCannotReach) {
          // Per the lemma this branch is unreachable: a share-unreachable gesture's candidates
          // always trip quickRejectRhythmCandidate's own dominance check. Assert it explicitly.
          const failures = validateRhythmCandidate(candidate)
          if (!failures.includes('rhythmic_variety_violation'))
            violations.push(
              'candidate from a share-unreachable gesture was neither rejected nor flagged by the validator',
            )
        }
      }

      expect(violations).toEqual([])
    },
    20_000,
  )

  it('rejects at least one raw candidate for this density, so the subset check is non-vacuous', () => {
    expect(rawTotal).toBeGreaterThan(0)
    expect(rejectedTotal).toBeGreaterThan(0)
  })
})
