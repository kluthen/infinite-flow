import { describe, expect, it } from 'vitest'
import { makeHarmonyCandidateDomain } from '@/domain/harmony/harmony-planner'
import type {
  AbstractTensionRequirement,
  HarmonyCandidate,
  TensionFigureKind,
} from '@/domain/harmony/harmony-types'
import { soundingSpans } from '@/domain/pitch/pitch-harmony'
import { makeTensionBindingDomain } from '@/domain/pitch/pitch-policy'
import type { ConcreteTensionBinding } from '@/domain/pitch/pitch-types'
import { validatePitchMidis } from '@/domain/pitch/validation/pitch-phrase-validator'
import type { PitchValidationContext } from '@/domain/pitch/validation/pitch-validation-types'
import { makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'
import type { RhythmBar, RhythmCandidate } from '@/domain/rhythm/rhythm-types'
import { bar } from './validation-fixtures'

/** The first Static C-major Settled harmony candidate: one tonic event spanning all 16 beats. */
function baseHarmony(): HarmonyCandidate {
  const domain = makeHarmonyCandidateDomain({
    tonalCenter: 'C',
    collection: 'Major',
    harmonicMotion: 'Static',
    tensionArc: 'Settled',
    profile: 'Neutral',
  })
  if (domain.kind !== 'harmony_candidate_domain') throw new Error('fixture harmony missing')
  const candidate = domain.candidates[0]
  if (!candidate) throw new Error('fixture harmony candidate missing')
  return candidate
}

/** The first Quarter/Sparse/Straight rhythm candidate, used only for its non-`bars` metadata. */
function baseRhythm(): RhythmCandidate {
  const domain = makeRhythmCandidateDomain({
    noteDensity: 'Quarter',
    silenceDensity: 'Sparse',
    syncopation: 'Straight',
    tensionArc: 'Settled',
  })
  if (domain.kind !== 'rhythm_candidate_domain') throw new Error('fixture rhythm missing')
  const rhythm = domain.candidates().next().value
  if (!rhythm) throw new Error('fixture rhythm missing')
  return rhythm
}

const ALL_KINDS: readonly TensionFigureKind[] = [
  'diatonic_passing_or_neighbor',
  'appoggiatura',
  'two_note_diatonic_approach',
]

const DELAYS: readonly AbstractTensionRequirement['maximumResolutionDelay'][] = [
  'next_beat_or_bar',
  'next_strong_sounding_onset',
]

/**
 * A small table of hand-built four-bar rhythms with rests at different spots relative to the
 * beat-or-bar (grid 4) and strong-sounding-onset (grid 8) resolution deadlines.
 */
const RHYTHM_TABLE: readonly (readonly [string, readonly RhythmBar[]])[] = [
  ['plain quarters, no rests', [0, 1, 2, 3].map((index) => bar(index as 0 | 1 | 2 | 3, 'q q q q'))],
  [
    // Bar 0: q(0-4) q(4-8) r:q(8-12) q(12-16). A rest lands the following attack exactly on the
    // next-beat-or-bar deadline (tick 12) of the attack before it.
    'a rest landing an attack exactly on the beat-or-bar deadline',
    [bar(0, 'q q r:q q'), bar(1, 'q q q q'), bar(2, 'q q q q'), bar(3, 'q q q q')],
  ],
  [
    // Bar 0: q(0-4) q(4-8) r:q(8-12) r:e(12-14) e(14-16). The attack at tick 14 misses the
    // beat-or-bar deadline (tick 12) after the tick-8 attack but is inside the strong-onset one
    // (tick 16), so this rhythm tells the two grids apart.
    'a rest inside the strong-onset grid but past the beat-or-bar grid',
    [bar(0, 'q q r:q r:e e'), bar(1, 'q q q q'), bar(2, 'q q q q'), bar(3, 'q q q q')],
  ],
  [
    // Bar 0: q(0-4) r:h(4-12) e(12-14) e(14-16). A long rest separates the first two attacks, with
    // no rest at all between the last two.
    'a long rest between the first two attacks, tight thereafter',
    [bar(0, 'q r:h e e'), bar(1, 'q q q q'), bar(2, 'q q q q'), bar(3, 'q q q q')],
  ],
  [
    // Bar 0: r:q(0-4) q(4-8) r:e(8-10) e(10-12) r:q(12-16). Bar 1: q(16-20) q q q. Bar 2: q e r:e q
    // q (mirrors an existing rejected-approach fixture). Rests surround every attack pair.
    'rests before, between, and after a run of close attacks, crossing a bar line',
    [bar(0, 'r:q q r:e e r:q'), bar(1, 'q q q q'), bar(2, 'q e r:e q q'), bar(3, 'q q q q')],
  ],
]

interface Mismatch {
  readonly rhythmLabel: string
  readonly delay: AbstractTensionRequirement['maximumResolutionDelay']
  readonly figureKind: TensionFigureKind
  readonly start: number
  readonly plannerOffered: boolean
  readonly validatorAccepted: boolean
}

/** True when the domain offers exactly this figure binding. */
function plannerOffers(
  harmony: HarmonyCandidate,
  rhythm: RhythmCandidate,
  figureKind: TensionFigureKind,
  attackIndices: readonly number[],
  targetAttackIndex: number,
): boolean {
  const domain = makeTensionBindingDomain(harmony, rhythm)
  if (domain.kind !== 'tension_binding_domain') return false
  return domain.bindings.some(
    (binding) =>
      binding.figureKind === figureKind &&
      binding.targetAttackIndex === targetAttackIndex &&
      binding.attackIndices.length === attackIndices.length &&
      binding.attackIndices.every((index, position) => index === attackIndices[position]),
  )
}

/** True when the validator's structure check does not report `tension_binding_invalid`. */
function validatorAccepts(
  harmony: HarmonyCandidate,
  rhythm: RhythmCandidate,
  figureKind: TensionFigureKind,
  attackIndices: readonly number[],
  targetAttackIndex: number,
): boolean {
  const binding: ConcreteTensionBinding = {
    identity: 'agreement-fixture',
    bindingIndex: 1,
    figureKind,
    attackIndices,
    targetAttackIndex,
  }
  const context: PitchValidationContext = {
    request: {
      activeConcertRange: { kind: 'ActiveConcertRange', minMidi: 0, maxMidi: 127 },
      registerWindow: { minMidi: 0, maxMidi: 127 },
    } as PitchValidationContext['request'],
    policy: {
      profile: 'Neutral',
      collection: 'Major',
      tonalCenter: 'C',
      contour: 'Wandering',
      leapiness: 'Leaping',
    },
    harmony: {
      identity: harmony.identity,
      events: harmony.events,
      endpoint: harmony.endpoint,
      tensionRequirement: harmony.tensionRequirement,
    },
    rhythm: { bars: rhythm.bars },
    tensionBinding: binding,
  }
  const attackCount = soundingSpans(rhythm).length
  const midis = Array.from({ length: attackCount }, () => 60)
  const result = validatePitchMidis(context, midis)
  const failures = result.kind === 'valid_pitch_phrase' ? [] : result.failures
  return !failures.some((failure) => failure.code === 'tension_binding_invalid')
}

// @test-link [[mechanic_pitch_search_policy]]
// @test-link [[module_pitch_domain_validation]]
describe('planner/validator agreement: tension binding structure', () => {
  it('agrees, for every rhythm, delay grid, figure kind, and start attack, on which bindings are structurally legal', () => {
    const base = baseHarmony()
    const rhythmBase = baseRhythm()
    const mismatches: Mismatch[] = []

    for (const [rhythmLabel, bars] of RHYTHM_TABLE) {
      const rhythm: RhythmCandidate = { ...rhythmBase, bars }
      const attackCount = soundingSpans(rhythm).length
      for (const delay of DELAYS) {
        const harmony: HarmonyCandidate = {
          ...base,
          tensionRequirement: {
            ...base.tensionRequirement,
            maximumResolutionDelay: delay,
            permittedFigureKinds: ALL_KINDS,
            requiredFigureCount: 0,
            allowedBars: [0, 1, 2],
          },
        }
        for (const figureKind of ALL_KINDS) {
          const figureLength = figureKind === 'two_note_diatonic_approach' ? 2 : 1
          for (let start = 0; start + figureLength < attackCount; start += 1) {
            const attackIndices = Array.from({ length: figureLength }, (_, i) => start + i)
            const targetAttackIndex = start + figureLength
            const plannerOffered = plannerOffers(
              harmony,
              rhythm,
              figureKind,
              attackIndices,
              targetAttackIndex,
            )
            const validatorAccepted = validatorAccepts(
              harmony,
              rhythm,
              figureKind,
              attackIndices,
              targetAttackIndex,
            )
            if (plannerOffered !== validatorAccepted)
              mismatches.push({
                rhythmLabel,
                delay,
                figureKind,
                start,
                plannerOffered,
                validatorAccepted,
              })
          }
        }
      }
    }

    expect(mismatches).toEqual([])
  })
})
