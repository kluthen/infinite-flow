import { describe, expect, it } from 'vitest'
import { makeHarmonyCandidateDomain } from '@/domain/harmony/harmony-planner'
import type { AbstractTensionRequirement, HarmonyCandidate } from '@/domain/harmony/harmony-types'
import { makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'
import type { RhythmCandidate } from '@/domain/rhythm/rhythm-types'
import { makeTensionBindingDomain } from '@/domain/pitch/pitch-policy'
import {
  PitchPlannerInputError,
  type ConcreteTensionBinding,
  type TensionBindingDomain,
} from '@/domain/pitch/pitch-types'
import { bar } from './validation/validation-fixtures'

/** The first Static C-major Settled harmony candidate: one tonic event spanning all 16 beats. */
function settledHarmony(): HarmonyCandidate {
  const domain = makeHarmonyCandidateDomain({
    tonalCenter: 'C',
    collection: 'Major',
    harmonicMotion: 'Static',
    tensionArc: 'Settled',
  })
  if (domain.kind !== 'harmony_candidate_domain') throw new Error('fixture harmony missing')
  const candidate = domain.candidates[0]
  if (!candidate) throw new Error('fixture harmony candidate missing')
  return candidate
}

/**
 * The first Quarter/Sparse/Straight rhythm. Its sounding attacks are bar 0 ticks 0/4/8/12
 * (attacks 0-3), bar 1 ticks 4/8/12 (4-6), bar 2 ticks 0/4/8/12 (7-10), bar 3 ticks 0/4/8 (11-13).
 */
function quarterRhythm(): RhythmCandidate {
  const domain = makeRhythmCandidateDomain({
    noteDensity: 'Quarter',
    rhythmicVariety: 'Slightly varied',
    silenceDensity: 'Sparse',
    syncopation: 'Straight',
    tensionArc: 'Settled',
  })
  if (domain.kind !== 'rhythm_candidate_domain') throw new Error('fixture rhythm missing')
  const rhythm = domain.candidates().next().value
  if (!rhythm) throw new Error('fixture rhythm missing')
  return rhythm
}

/** The binding domain, failing the test when the requirement produced no binding at all. */
function bindingDomain(harmony: HarmonyCandidate, rhythm: RhythmCandidate): TensionBindingDomain {
  const result = makeTensionBindingDomain(harmony, rhythm)
  if (result.kind !== 'tension_binding_domain') throw new Error('fixture binding domain missing')
  return result
}

/** `[kind, member attacks, target attack]` of every figure binding, in binding-index order. */
function figureShapes(domain: TensionBindingDomain) {
  return domain.bindings
    .filter((binding) => binding.figureKind !== undefined)
    .map((binding) => [binding.figureKind, binding.attackIndices, binding.targetAttackIndex])
}

/** settledHarmony(), its tension requirement overridden for one rest-timing scenario. */
function harmonyWithRequirement(overrides: Partial<AbstractTensionRequirement>): HarmonyCandidate {
  const base = settledHarmony()
  return { ...base, tensionRequirement: { ...base.tensionRequirement, ...overrides } }
}

/** quarterRhythm() with bar 0 replaced by hand-built ticks; bars 1-3 stay plain quarters. */
function rhythmWithBar0(spec: string): RhythmCandidate {
  const base = quarterRhythm()
  return {
    ...base,
    bars: [bar(0, spec), bar(1, 'q q q q'), bar(2, 'q q q q'), bar(3, 'q q q q')],
  }
}

/** True when the domain offers exactly this figure binding. */
function hasBinding(
  domain: TensionBindingDomain,
  figureKind: NonNullable<ConcreteTensionBinding['figureKind']>,
  attackIndices: readonly number[],
  targetAttackIndex: number,
): boolean {
  return domain.bindings.some(
    (binding) =>
      binding.figureKind === figureKind &&
      binding.targetAttackIndex === targetAttackIndex &&
      binding.attackIndices.length === attackIndices.length &&
      binding.attackIndices.every((index, position) => index === attackIndices[position]),
  )
}

// @test-link [[mechanic_pitch_search_policy]]
describe('tension binding domain', () => {
  it('never offers an appoggiatura on the first sounding attack, which has no leap to enter it', () => {
    const shapes = figureShapes(bindingDomain(settledHarmony(), quarterRhythm()))
    const appoggiaturas = shapes.filter(([kind]) => kind === 'appoggiatura')
    expect(appoggiaturas.length).toBeGreaterThan(0)
    expect(appoggiaturas.every(([, members]) => (members as number[])[0] !== 0)).toBe(true)
  })

  it('binds every figure across the whole phrase with stable indices, not only bar 0', () => {
    const domain = bindingDomain(settledHarmony(), quarterRhythm())
    expect(domain.bindings.map((binding) => binding.bindingIndex)).toEqual(
      domain.bindings.map((_, index) => index),
    )
    expect(domain.bindings[0]).toMatchObject({ bindingIndex: 0, attackIndices: [] })
    // One tonic event spans all four bars, so absolute-beat lookup finds it in bars 1 and 2 too.
    // [3] -> 4 and [4] -> 5 cross the rest on bar 1 beat 1: attack 4 starts at tick 20, before
    // the next strong onset (tick 24) after attack 3 ends, and a rest may separate a preparation.
    expect(figureShapes(domain)).toEqual([
      ['diatonic_passing_or_neighbor', [1], 2],
      ['diatonic_passing_or_neighbor', [2], 3],
      ['diatonic_passing_or_neighbor', [3], 4],
      ['diatonic_passing_or_neighbor', [4], 5],
      ['diatonic_passing_or_neighbor', [5], 6],
      ['diatonic_passing_or_neighbor', [6], 7],
      ['diatonic_passing_or_neighbor', [7], 8],
      ['diatonic_passing_or_neighbor', [8], 9],
      ['diatonic_passing_or_neighbor', [9], 10],
      ['diatonic_passing_or_neighbor', [10], 11],
      ['appoggiatura', [2], 3],
      ['appoggiatura', [5], 6],
      ['appoggiatura', [7], 8],
      ['appoggiatura', [9], 10],
    ])
    expect(makeTensionBindingDomain(settledHarmony(), quarterRhythm())).toEqual(domain)
  })

  it('treats a tied attack as sounding until its last continuation when checking contiguity', () => {
    const source = quarterRhythm()
    // Bar 0 becomes: attack 0 at tick 0, attack 1 at tick 4 tied through tick 12, attack 2 at 12.
    const tied: RhythmCandidate = {
      ...source,
      bars: source.bars.map((bar) =>
        bar.barIndex !== 0
          ? bar
          : {
              ...bar,
              events: bar.events.map((event) =>
                event.startTick === 8 ? { ...event, tieContinuation: true } : event,
              ),
            },
      ),
    }
    const shapes = figureShapes(bindingDomain(settledHarmony(), tied))
    // Attack 1 (ticks 4-12 with its tie) leads straight into attack 2 at tick 12.
    expect(shapes).toContainEqual(['diatonic_passing_or_neighbor', [1], 2])
  })

  it('throws when an attack lies in a gap that no harmony event covers', () => {
    const harmony = settledHarmony()
    const gapped: HarmonyCandidate = {
      ...harmony,
      events: harmony.events.map((event) => ({ ...event, durationBeats: 8 })),
    }
    expect(() => makeTensionBindingDomain(gapped, quarterRhythm())).toThrow(PitchPlannerInputError)
  })
})

// @test-link [[mechanic_pitch_search_policy]]
describe('tension binding domain: rests around the resolution delay', () => {
  it('offers a binding whose target rest lands exactly on the resolution deadline', () => {
    // Bar 0: q(0-4) q(4-8) r:q(8-12) q(12-16). Member ends at tick 8; next_beat_or_bar deadline is
    // tick 12, and the target starts right at tick 12, so the rest before it is still in time.
    const harmony = harmonyWithRequirement({
      maximumResolutionDelay: 'next_beat_or_bar',
      permittedFigureKinds: ['diatonic_passing_or_neighbor'],
      requiredFigureCount: 0,
    })
    const rhythm = rhythmWithBar0('q q r:q q')
    const domain = bindingDomain(harmony, rhythm)
    expect(hasBinding(domain, 'diatonic_passing_or_neighbor', [1], 2)).toBe(true)
  })

  it('omits a binding whose target rest pushes it past the next-beat-or-bar deadline', () => {
    // Bar 0: q(0-4) q(4-8) r:q(8-12) r:e(12-14) e(14-16). Member ends at tick 8; deadline is tick
    // 12, but the target only starts at tick 14, one rest too late.
    const harmony = harmonyWithRequirement({
      maximumResolutionDelay: 'next_beat_or_bar',
      permittedFigureKinds: ['diatonic_passing_or_neighbor'],
      requiredFigureCount: 0,
    })
    const rhythm = rhythmWithBar0('q q r:q r:e e')
    const domain = bindingDomain(harmony, rhythm)
    expect(hasBinding(domain, 'diatonic_passing_or_neighbor', [1], 2)).toBe(false)
  })

  it('offers that same late target under the wider next-strong-sounding-onset (Settled) grid', () => {
    // Same rhythm as above: member ends at tick 8. The next strong onset after tick 8 is tick 16,
    // so the target at tick 14 is in time under Settled even though it misses the beat-or-bar grid.
    const harmony = harmonyWithRequirement({
      maximumResolutionDelay: 'next_strong_sounding_onset',
      permittedFigureKinds: ['diatonic_passing_or_neighbor'],
      requiredFigureCount: 0,
    })
    const rhythm = rhythmWithBar0('q q r:q r:e e')
    const domain = bindingDomain(harmony, rhythm)
    expect(hasBinding(domain, 'diatonic_passing_or_neighbor', [1], 2)).toBe(true)
  })

  it('offers a passing/neighbor binding whose preparation is separated by a rest', () => {
    // Bar 0: q(0-4, preparation) r:h(4-12) e(12-14, member) e(14-16, target). The preparation link
    // has no delay bound at all, so the half-bar rest before the member does not block the binding.
    const harmony = harmonyWithRequirement({
      maximumResolutionDelay: 'next_beat_or_bar',
      permittedFigureKinds: ['diatonic_passing_or_neighbor'],
      requiredFigureCount: 0,
    })
    const rhythm = rhythmWithBar0('q r:h e e')
    const domain = bindingDomain(harmony, rhythm)
    expect(hasBinding(domain, 'diatonic_passing_or_neighbor', [1], 2)).toBe(true)
  })

  it('offers a Build two-note diatonic approach with rests before, inside, and before its target', () => {
    // Bar 0: r:q(0-4) q(4-8, approach 0) r:e(8-10) e(10-12, approach 1) r:q(12-16). Bar 1: q(16-20,
    // target). approach0->approach1 deadline is tick 12 (approach1 starts at 10, in time); approach1
    // ->target deadline is tick 16 (target starts exactly at 16, on the boundary).
    const harmony = harmonyWithRequirement({
      maximumResolutionDelay: 'next_beat_or_bar',
      permittedFigureKinds: ['two_note_diatonic_approach'],
      requiredFigureCount: 1,
    })
    const rhythm = rhythmWithBar0('r:q q r:e e r:q')
    const domain = bindingDomain(harmony, rhythm)
    expect(domain.kind).toBe('tension_binding_domain')
    expect(hasBinding(domain, 'two_note_diatonic_approach', [0, 1], 2)).toBe(true)
  })
})
