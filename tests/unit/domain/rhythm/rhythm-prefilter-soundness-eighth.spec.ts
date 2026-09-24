import { describe, expect, it } from 'vitest'

import {
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  TENSION_ARCS,
} from '@/domain/controls/generation-controls'
import {
  coversMixedDurationClasses,
  quickRejectRhythmCandidate,
} from '@/domain/rhythm/rhythm-invariants'
import { normalizeRhythmExpansionInput } from '@/domain/rhythm/rhythm-planner'
import { validateRhythmCandidate } from '@/domain/rhythm/rhythm-validator'

import {
  enumerateRawRhythmCandidates,
  sameDurationSet,
  sourceCellDurations,
} from './rhythm-prefilter-oracle'
import type { NoteDensity } from '@/domain/controls/generation-controls'

const NOTE_DENSITY: NoteDensity = 'Eighth'

const settings = SILENCE_DENSITIES.flatMap((silenceDensity) =>
  SYNCOPATIONS.flatMap((syncopation) =>
    TENSION_ARCS.map((tensionArc) => ({ silenceDensity, syncopation, tensionArc })),
  ),
)

// @test-link [[module_rhythm_domain_validation]]
// @test-link [[api_rhythm_domain_expansion]]
describe(`rhythm enumeration prefilter soundness — ${NOTE_DENSITY} note density`, () => {
  let rejectedTotal = 0
  let rawTotal = 0

  it.each(settings)(
    'prefilter and gesture-prune are sound for silence=$silenceDensity syncopation=$syncopation tension=$tensionArc',
    ({ silenceDensity, syncopation, tensionArc }) => {
      const input = normalizeRhythmExpansionInput({
        grammarVersion: 'rhythm-mvp-v1',
        noteDensity: NOTE_DENSITY,
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

        const gestureFailsMixedCoverage =
          input.noteDensity === 'Mixed' && !coversMixedDurationClasses(gesture.bars)

        if (quickRejectRhythmCandidate(candidate)) {
          rejectedTotal += 1
          const failures = validateRhythmCandidate(candidate)
          // Prefilter subset of validator: a rejected candidate must also be one the validator
          // would have rejected, so skipping it never changes the surviving candidate set.
          if (failures.length === 0)
            violations.push('quickRejectRhythmCandidate rejected a candidate the validator accepts')
          if (
            gestureFailsMixedCoverage &&
            !failures.includes('mixed_duration_class_coverage_violation')
          )
            violations.push(
              'candidate from a Mixed-coverage-failing gesture was not reported mixed_duration_class_coverage_violation',
            )
        } else if (gestureFailsMixedCoverage) {
          // Per the lemma this branch is unreachable: a coverage-failing gesture's candidates
          // always trip quickRejectRhythmCandidate's own coverage check. Assert it explicitly.
          const failures = validateRhythmCandidate(candidate)
          if (!failures.includes('mixed_duration_class_coverage_violation'))
            violations.push(
              'candidate from a Mixed-coverage-failing gesture was neither rejected nor flagged by the validator',
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
