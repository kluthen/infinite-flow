/**
 * Regression coverage for the signed-off tension-binding correction (`bindingAt` in
 * `src/domain/pitch/pitch-policy.ts`, `bindingStructureHolds` in
 * `src/domain/pitch/validation/figure-rules.ts`): a rest may now separate two attacks of a tension
 * figure's group (preparation, members, target) as long as each attack still starts within the
 * upstream requirement's maximum resolution delay of the one before. Before the fix, the binding
 * search required those attacks to be strictly contiguous (no rest in between), which starved six
 * settings of the fixed default pitch context of any legal binding and left them resolving to
 * `no_legal_pitch_plan`. Each case here builds the exact settings/seed the harness in
 * `tests/perf/generation-latency.perf.ts` (`buildControls`) uses, asserts `generatePhrase` now
 * succeeds, that the independent whole-result validator accepts the result, that the selected
 * tension binding actually resolved a figure (not the empty `none` binding), and that a rest
 * genuinely separates two of that figure's attacks.
 */

import { describe, expect, it } from 'vitest'

import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { createGenerationIntent } from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { createCanonicalRhythmDomainMemo } from '@/domain/generation/orchestration/canonical-rhythm-domain'
import { validateGenerationResult } from '@/domain/validation/generation-result-validator'
import { soundingSpans } from '@/domain/pitch/pitch-harmony'
import { makeSeed } from '@/domain/random/seed'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'

/** One of the six settings that moved from `no_legal_pitch_plan` to success under the fix. */
interface RegressionCase {
  readonly noteDensity: 'Eighth' | 'Sixteenth'
  readonly rhythmicVariety: 'Slightly varied' | 'Heavily varied'
  readonly silenceDensity: 'Breath-heavy'
  readonly syncopation: 'Straight' | 'Occasional offbeats' | 'Active displacement'
  readonly tension: 'Build' | 'Edge'
}

const REGRESSION_CASES: readonly RegressionCase[] = [
  {
    noteDensity: 'Eighth',
    rhythmicVariety: 'Slightly varied',
    silenceDensity: 'Breath-heavy',
    syncopation: 'Straight',
    tension: 'Edge',
  },
  {
    noteDensity: 'Eighth',
    rhythmicVariety: 'Slightly varied',
    silenceDensity: 'Breath-heavy',
    syncopation: 'Occasional offbeats',
    tension: 'Build',
  },
  {
    noteDensity: 'Eighth',
    rhythmicVariety: 'Slightly varied',
    silenceDensity: 'Breath-heavy',
    syncopation: 'Occasional offbeats',
    tension: 'Edge',
  },
  {
    noteDensity: 'Eighth',
    rhythmicVariety: 'Slightly varied',
    silenceDensity: 'Breath-heavy',
    syncopation: 'Active displacement',
    tension: 'Build',
  },
  {
    noteDensity: 'Eighth',
    rhythmicVariety: 'Slightly varied',
    silenceDensity: 'Breath-heavy',
    syncopation: 'Active displacement',
    tension: 'Edge',
  },
  {
    // Replaces the retired `Mixed` density: the densest, most-varied surviving setting, matching
    // the worst-case grammar expansion moved here by ISS-004 (feasibility review §6).
    noteDensity: 'Sixteenth',
    rhythmicVariety: 'Heavily varied',
    silenceDensity: 'Breath-heavy',
    syncopation: 'Occasional offbeats',
    tension: 'Edge',
  },
]

/** Intent: the fixed default pitch context every regression case shares, per `buildControls`. */
function buildIntent(testCase: RegressionCase) {
  const controls = makeGenerationControls({
    tempo: 90,
    tonalCenter: 'C',
    collection: 'Major',
    harmonicMotion: 'Gentle diatonic',
    tension: testCase.tension,
    noteDensity: testCase.noteDensity,
    rhythmicVariety: testCase.rhythmicVariety,
    syncopation: testCase.syncopation,
    silenceDensity: testCase.silenceDensity,
    contour: 'Arch',
    register: 'Middle',
    leapiness: 'Shaped',
    arpeggioChaos: 'Predictable',
    instrumentProfileId: 'bb-tenor',
  })
  return createGenerationIntent({
    requestId: makeRequestId(
      `binding-regression-${testCase.noteDensity}-${testCase.rhythmicVariety}-${testCase.silenceDensity}-${testCase.syncopation}-${testCase.tension}`,
    ),
    seed: makeSeed(1),
    controls,
    figureLevels: NEUTRAL_FIGURE_LEVELS,
  })
}

const CASE_TIMEOUT_MS = 60_000

// @test-link [[service_generation_orchestration]]
// @test-link [[mechanic_pitch_search_policy]]
describe('tension-binding correction regressions (previously no_legal_pitch_plan)', () => {
  it.each(
    REGRESSION_CASES.map((testCase) => ({
      testCase,
      label: `${testCase.noteDensity}/${testCase.silenceDensity}/${testCase.syncopation}/${testCase.tension}`,
    })),
  )(
    '$label now generates successfully with a resolved, rest-crossing figure binding',
    ({ testCase }) => {
      const intent = buildIntent(testCase)
      const memo = createCanonicalRhythmDomainMemo()
      const outcome = generatePhrase(intent, { rhythmDomainMemo: memo })

      expect(outcome.kind).toBe('generation_success')
      if (outcome.kind !== 'generation_success') return

      const validated = validateGenerationResult({
        intent,
        request: outcome.request,
        result: outcome.result,
        provenance: outcome.provenance,
      })
      expect(validated.kind).toBe('valid_generation_result')

      const binding = outcome.provenance.tensionBinding
      expect(binding.attackIndices.length).toBeGreaterThan(0)
      expect(binding.figureKind).toBeDefined()
      expect(binding.targetAttackIndex).toBeDefined()

      // Reconstruct the figure's full attack group (preparation, members, target) from the
      // provenance rhythm, matching how `bindingAt`/`bindingStructureHolds` see it, and confirm a
      // rest genuinely separates at least two of its attacks (the behavior the fix now permits).
      const spans = soundingSpans(outcome.provenance.rhythm)
      const preparationIndex =
        binding.figureKind === 'diatonic_passing_or_neighbor'
          ? binding.attackIndices[0]! - 1
          : undefined
      const groupIndices = [
        ...(preparationIndex !== undefined ? [preparationIndex] : []),
        ...binding.attackIndices,
        binding.targetAttackIndex!,
      ]
      const groupSpans = groupIndices.map((index) => spans[index]!)
      const hasRestGap = groupSpans.some(
        (span, index) => index > 0 && span.start > groupSpans[index - 1]!.end,
      )
      expect(hasRestGap).toBe(true)
    },
    CASE_TIMEOUT_MS,
  )
})
