/**
 * ISS-005 byte-identity proof: confirms the pitch planner actually SELECTS a chromatic approach or
 * enclosure figure (not merely offers one as a candidate) under a Jazz musical profile, and pins
 * the resulting plan's hash. The hash (`765058683`) was recorded from the pre-refactor code, when
 * `jazzPaths` still branched on `facts.input.policy.profile !== 'Jazz'` and the figure-rules
 * out-of-collection check still branched on `facts.context.policy.profile !== 'Jazz'`. If this test
 * ever fails after the capability-flag refactor, the refactor changed generated output and must be
 * reverted rather than re-pinned.
 */

import { describe, expect, it } from 'vitest'

import {
  FOUR_FOUR_METER,
  makeGenerationRequest,
  makeRequestId,
} from '@/domain/generation/generation-request'
import { makeHarmonyCandidateDomain } from '@/domain/harmony/harmony-planner'
import { makeActiveConcertRange } from '@/domain/profile/active-concert-range'
import { makeRegisterWindow } from '@/domain/profile/register-window'
import {
  makeBoundPitchPlannerInput,
  makePitchPolicy,
  planPitchPhrase,
} from '@/domain/pitch/pitch-planner'
import { bindTensionRequirement } from '@/domain/pitch/pitch-policy'
import { fnv1a32 } from '@/domain/random/hash32'
import { makeSeed } from '@/domain/random/seed'
import { makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'

const PINNED_HASH = 765058683

/** The first Gentle-diatonic Jazz harmony candidate over its first Eighth/Conversational rhythm. */
function pinnedInput() {
  const harmony = makeHarmonyCandidateDomain({
    tonalCenter: 'C',
    collection: 'Major',
    harmonicMotion: 'Gentle diatonic',
    tensionArc: 'Settled',
    profile: 'Jazz',
  })
  if (harmony.kind !== 'harmony_candidate_domain') throw new Error('fixture harmony missing')
  const harmonyCandidate = harmony.candidates[0]
  if (!harmonyCandidate) throw new Error('fixture harmony candidate missing')

  const rhythms = makeRhythmCandidateDomain({
    noteDensity: 'Eighth',
    silenceDensity: 'Conversational',
    syncopation: 'Occasional offbeats',
    tensionArc: 'Settled',
  })
  if (rhythms.kind !== 'rhythm_candidate_domain') throw new Error('fixture rhythm missing')
  const rhythm = rhythms.candidates().next().value
  if (!rhythm) throw new Error('fixture rhythm missing')

  const binding = bindTensionRequirement(harmonyCandidate, rhythm)
  if (!binding) throw new Error('fixture binding missing')

  return makeBoundPitchPlannerInput({
    request: makeGenerationRequest({
      requestId: makeRequestId('chromatic-figure-selection'),
      seed: makeSeed(11),
      measureCount: 4,
      meter: FOUR_FOUR_METER,
      activeConcertRange: makeActiveConcertRange(48, 84),
      register: 'Middle',
      registerWindow: makeRegisterWindow(48, 84),
    }),
    policy: makePitchPolicy({
      profile: 'Jazz',
      collection: 'Major',
      tonalCenter: 'C',
      contour: 'Wandering',
      leapiness: 'Angular',
      arpeggioChaos: 'Predictable',
      searchFuel: 20_000,
    }),
    harmony: harmonyCandidate,
    rhythm,
    tensionBinding: binding,
  })
}

// @test-link [[rule_jazz_chromatic_resolution]]
// @test-link [[module_musical_profile_capabilities]]
describe('pitch planner: a pinned Jazz case actually selects a chromatic figure', () => {
  it('selects a chromatic enclosure and reproduces the pre-refactor plan hash', () => {
    const input = pinnedInput()
    const result = planPitchPhrase(input)
    expect(result.kind).toBe('pitch_plan')
    if (result.kind !== 'pitch_plan') return
    const roles = result.phrase.assignments.map((assignment) => assignment.candidate.role)
    expect(roles).toContain('chromatic_enclosure_lower')
    expect(roles).toContain('chromatic_enclosure_upper')
    expect(fnv1a32(JSON.stringify(result))).toBe(PINNED_HASH)
  })
})
