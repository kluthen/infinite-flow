import { describe, expect, it } from 'vitest'
import {
  HARMONIC_MOTIONS,
  NOTE_DENSITIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  TENSION_ARCS,
  type HarmonicMotion,
  type NoteDensity,
  type SilenceDensity,
  type Syncopation,
  type TensionArc,
} from '@/domain/controls/generation-controls'
import {
  isUnsupportedRhythmSetting,
  UNSUPPORTED_RHYTHM_SETTINGS,
} from '@/domain/controls/unsupported-rhythm-settings'
import { makeHarmonyCandidateDomain } from '@/domain/harmony/harmony-planner'
import type { HarmonyCandidate } from '@/domain/harmony/harmony-types'
import { makeTensionBindingDomain } from '@/domain/pitch/pitch-policy'
import { makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'
import type { RhythmCandidate } from '@/domain/rhythm/rhythm-types'

interface SupportedRhythmSetting {
  readonly noteDensity: NoteDensity
  readonly silenceDensity: SilenceDensity
  readonly syncopation: Syncopation
}

/** Every note density + silence density + syncopation combination the rhythm grammar supports. */
const SUPPORTED_RHYTHM_SETTINGS: readonly SupportedRhythmSetting[] = NOTE_DENSITIES.flatMap(
  (noteDensity) =>
    SILENCE_DENSITIES.flatMap((silenceDensity) =>
      SYNCOPATIONS.flatMap((syncopation) => {
        const setting = { noteDensity, silenceDensity, syncopation }
        return isUnsupportedRhythmSetting(setting) ? [] : [setting]
      }),
    ),
)

/** Every candidate for one harmonic motion under one tension arc, built once and reused. */
function harmonyCandidatesFor(
  harmonicMotion: HarmonicMotion,
  tensionArc: TensionArc,
): readonly HarmonyCandidate[] {
  const domain = makeHarmonyCandidateDomain({
    tonalCenter: 'C',
    collection: 'Major',
    harmonicMotion,
    tensionArc,
    profile: 'Neutral',
  })
  if (domain.kind !== 'harmony_candidate_domain')
    throw new Error(`no legal harmony plan for ${harmonicMotion}/${tensionArc}`)
  return domain.candidates
}

/** Every candidate for one supported rhythm setting under one tension arc, materialized once. */
function rhythmCandidatesFor(
  setting: SupportedRhythmSetting,
  tensionArc: TensionArc,
): readonly RhythmCandidate[] {
  const domain = makeRhythmCandidateDomain({ ...setting, tensionArc })
  if (domain.kind !== 'rhythm_candidate_domain')
    throw new Error(
      `no legal rhythm plan for ${setting.noteDensity}/${setting.silenceDensity}/${setting.syncopation}/${tensionArc}`,
    )
  return [...domain.candidates()]
}

/** True once any harmony/rhythm candidate pair yields at least one concrete binding. */
function hasBindablePair(
  harmonyCandidates: readonly HarmonyCandidate[],
  rhythmCandidates: readonly RhythmCandidate[],
): boolean {
  return harmonyCandidates.some((harmony) =>
    rhythmCandidates.some((rhythm) => {
      const result = makeTensionBindingDomain(harmony, rhythm)
      return result.kind === 'tension_binding_domain' && result.bindings.length > 0
    }),
  )
}

/**
 * Feasibility sweep guarding the rest-tolerant binding correction in `makeTensionBindingDomain` /
 * `bindingAt` (rests are now allowed within the requirement's resolution delay and between a
 * passing/neighbor tone's preparation and its figure): for every supported rhythm setting ×
 * tension arc × harmonic motion, it proves at least one (harmony, rhythm) candidate pair produces
 * a bindable tension-binding domain. Before the correction, 14 such cells had none; this test
 * fails the same way if the fix regresses.
 */
// @test-link [[mechanic_pitch_search_policy]]
// @test-link [[rule_tension_resolution_delay_permits_rests]]
describe('tension binding feasibility sweep', () => {
  it('covers every supported rhythm setting crossed with every harmonic motion, per tension arc', () => {
    const expectedSupportedSettingCount =
      NOTE_DENSITIES.length * SILENCE_DENSITIES.length * SYNCOPATIONS.length -
      UNSUPPORTED_RHYTHM_SETTINGS.length
    expect(SUPPORTED_RHYTHM_SETTINGS.length).toBe(expectedSupportedSettingCount)
    expect(SUPPORTED_RHYTHM_SETTINGS.length).toBe(30)
    expect(HARMONIC_MOTIONS.length).toBe(3)
  })

  it.each(TENSION_ARCS)(
    '%s: every supported rhythm setting has a bindable harmony/rhythm pair for every harmonic motion',
    (tensionArc) => {
      const harmonyCandidatesByMotion = new Map<HarmonicMotion, readonly HarmonyCandidate[]>()
      const infeasible: string[] = []
      let checked = 0

      for (const setting of SUPPORTED_RHYTHM_SETTINGS) {
        const rhythmCandidates = rhythmCandidatesFor(setting, tensionArc)
        for (const harmonicMotion of HARMONIC_MOTIONS) {
          let harmonyCandidates = harmonyCandidatesByMotion.get(harmonicMotion)
          if (!harmonyCandidates) {
            harmonyCandidates = harmonyCandidatesFor(harmonicMotion, tensionArc)
            harmonyCandidatesByMotion.set(harmonicMotion, harmonyCandidates)
          }
          checked += 1
          if (!hasBindablePair(harmonyCandidates, rhythmCandidates))
            infeasible.push(
              `${setting.noteDensity}|${setting.silenceDensity}|${setting.syncopation}|${tensionArc}|${harmonicMotion}`,
            )
        }
      }

      expect(checked).toBe(SUPPORTED_RHYTHM_SETTINGS.length * HARMONIC_MOTIONS.length)
      expect(infeasible).toEqual([])
    },
    120_000,
  )
})
