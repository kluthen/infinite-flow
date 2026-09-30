import { describe, expect, it } from 'vitest'

import {
  RHYTHMIC_VARIETIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  TENSION_ARCS,
} from '@/domain/controls/generation-controls'
import { isNoLegalRhythmPlan, makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'
import { validateRhythmCandidate } from '@/domain/rhythm/rhythm-validator'
import type { NoteDensity } from '@/domain/controls/generation-controls'

const NOTE_DENSITY: NoteDensity = 'Eighth'

/**
 * Candidates this density's 108 settings yield, per the checked-in identity manifest
 * (fixtures/rhythm-mvp-v2-manifest.json); the three density files together check all 51,312.
 */
const EXPECTED_TOTAL = 19_494

/** Every rhythm setting of this note density: 3 varieties x 3 silences x 3 syncopations x 4 arcs. */
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
 * The published domain must contain only candidates the full validator accepts, whatever cheaper
 * checks the planner's fast path runs instead of it. This drains every domain of the density
 * completely and validates each candidate independently, so it stays the guard that the fast path
 * yields exactly valid candidates even when the planner no longer calls the validator itself.
 */
// @test-link [[api_rhythm_domain_expansion]]
// @test-link [[module_rhythm_domain_validation]]
describe(`rhythm domain exhaustive validation — ${NOTE_DENSITY} note density`, () => {
  let checkedTotal = 0

  it.each(settings)(
    'every candidate validates for variety=$rhythmicVariety silence=$silenceDensity syncopation=$syncopation tension=$tensionArc',
    ({ rhythmicVariety, silenceDensity, syncopation, tensionArc }) => {
      const result = makeRhythmCandidateDomain({
        noteDensity: NOTE_DENSITY,
        rhythmicVariety,
        silenceDensity,
        syncopation,
        tensionArc,
      })
      if (isNoLegalRhythmPlan(result)) return
      const rejected: string[] = []
      for (const candidate of result.candidates()) {
        checkedTotal += 1
        const failures = validateRhythmCandidate(candidate)
        if (failures.length > 0)
          rejected.push(`candidate ${candidate.candidateIndex}: ${failures.join(', ')}`)
      }
      expect(rejected).toEqual([])
    },
    600_000,
  )

  it('checked every candidate of the density, so the per-setting checks are not vacuous', () => {
    expect(checkedTotal).toBe(EXPECTED_TOTAL)
  })
})
