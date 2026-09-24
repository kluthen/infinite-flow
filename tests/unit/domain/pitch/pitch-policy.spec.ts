import { describe, expect, it } from 'vitest'
import { makeHarmonyCandidateDomain } from '@/domain/harmony/harmony-planner'
import type { HarmonyCandidate } from '@/domain/harmony/harmony-types'
import { makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'
import type { RhythmCandidate } from '@/domain/rhythm/rhythm-types'
import { makeTensionBindingDomain } from '@/domain/pitch/pitch-policy'
import { PitchPlannerInputError, type TensionBindingDomain } from '@/domain/pitch/pitch-types'

/** The first Static C-major Settled harmony candidate: one tonic event spanning all 16 beats. */
function settledHarmony(): HarmonyCandidate {
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

/**
 * The first Quarter/Sparse/Straight rhythm. Its sounding attacks are bar 0 ticks 0/4/8/12
 * (attacks 0-3), bar 1 ticks 4/8/12 (4-6), bar 2 ticks 0/4/8/12 (7-10), bar 3 ticks 0/4/8 (11-13).
 */
function quarterRhythm(): RhythmCandidate {
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
    expect(figureShapes(domain)).toEqual([
      ['diatonic_passing_or_neighbor', [1], 2],
      ['diatonic_passing_or_neighbor', [2], 3],
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
