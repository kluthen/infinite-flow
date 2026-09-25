import { describe, expect, it } from 'vitest'
import {
  FOUR_FOUR_METER,
  makeGenerationRequest,
  makeRequestId,
} from '@/domain/generation/generation-request'
import { makeHarmonyCandidateDomain } from '@/domain/harmony/harmony-planner'
import type { HarmonyCandidate } from '@/domain/harmony/harmony-types'
import { makeActiveConcertRange } from '@/domain/profile/active-concert-range'
import { makeRegisterWindow } from '@/domain/profile/register-window'
import { makeSeed } from '@/domain/random/seed'
import { makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'
import {
  enumeratePitchCandidates,
  inspectPitchSearchState,
  makeBoundPitchPlannerInput,
  makePitchPolicy,
  makeTensionBindingDomain,
  planPitchPhrase,
  planPitchPhraseWithTieKeyFactory,
  pitchAttacks,
} from '@/domain/pitch/pitch-planner'
import { PitchPlannerInputError, type BoundPitchPlannerInput } from '@/domain/pitch/pitch-types'
import { validatePitchPhrase } from '@/domain/pitch/validation/pitch-phrase-validator'

function fixture(
  options: Partial<{
    seed: number
    profile: 'Neutral' | 'Jazz'
    density: 'Quarter' | 'Sixteenth'
    contour: 'Wandering' | 'Arch'
    leapiness: 'Smooth' | 'Shaped' | 'Leaping' | 'Angular'
    fuel: number
  }> = {},
): BoundPitchPlannerInput {
  const harmony = makeHarmonyCandidateDomain({
    tonalCenter: 'C',
    collection: 'Major',
    harmonicMotion: 'Static',
    tensionArc: 'Settled',
    profile: 'Neutral',
  })
  const rhythms = makeRhythmCandidateDomain({
    noteDensity: options.density ?? 'Quarter',
    silenceDensity: 'Sparse',
    syncopation: 'Straight',
    tensionArc: 'Settled',
  })
  if (harmony.kind !== 'harmony_candidate_domain' || rhythms.kind !== 'rhythm_candidate_domain')
    throw new Error('fixture domain missing')
  const rhythm = rhythms.candidates().next().value
  if (!rhythm) throw new Error('fixture rhythm missing')
  return makeBoundPitchPlannerInput({
    request: makeGenerationRequest({
      requestId: makeRequestId('pitch-regression'),
      seed: makeSeed(options.seed ?? 1),
      measureCount: 4,
      meter: FOUR_FOUR_METER,
      activeConcertRange: makeActiveConcertRange(48, 72),
      register: 'Middle',
      registerWindow: makeRegisterWindow(48, 72),
    }),
    policy: makePitchPolicy({
      profile: options.profile ?? 'Neutral',
      collection: 'Major',
      tonalCenter: 'C',
      contour: options.contour ?? 'Wandering',
      leapiness: options.leapiness ?? 'Angular',
      arpeggioChaos: 'Predictable',
      searchFuel: options.fuel ?? 20_000,
    }),
    harmony: harmony.candidates[0]!,
    rhythm,
    tensionBinding: { identity: 'none', bindingIndex: 0, attackIndices: [] },
  })
}

/** An all-rest bar: no fresh attack, so the bar has no contour checkpoint. */
function restBar(barIndex: 0 | 1 | 2 | 3): BoundPitchPlannerInput['rhythm']['bars'][number] {
  return {
    barIndex,
    events: [
      { kind: 'rest', startTick: 0, durationTicks: 16, nominalDurationTicks: 16, sourceCells: [] },
    ],
  }
}

/** A bar with a single fresh attack spanning the whole bar, giving it a contour checkpoint. */
function noteBar(barIndex: 0 | 1 | 2 | 3): BoundPitchPlannerInput['rhythm']['bars'][number] {
  return {
    barIndex,
    events: [
      { kind: 'note', startTick: 0, durationTicks: 16, nominalDurationTicks: 16, sourceCells: [] },
    ],
  }
}

function withBinding(
  input: BoundPitchPlannerInput,
  tensionBinding: BoundPitchPlannerInput['tensionBinding'],
): BoundPitchPlannerInput {
  return makeBoundPitchPlannerInput({ ...input, tensionBinding })
}

function expectValidPlan(input: BoundPitchPlannerInput) {
  const result = planPitchPhrase(input)
  expect(result.kind).toBe('pitch_plan')
  if (result.kind !== 'pitch_plan') throw new Error(`expected plan, received ${result.kind}`)
  expect(validatePitchPhrase(input, result.phrase).kind).toBe('valid_pitch_phrase')
  return result
}

function closestChordCandidate(input: BoundPitchPlannerInput, attackIndex: number, midi: number) {
  const candidate = enumeratePitchCandidates(input, attackIndex)
    .filter((item) => item.role === 'chord_tone')
    .sort((left, right) => Math.abs(left.midi - midi) - Math.abs(right.midi - midi))[0]
  if (!candidate) throw new Error('fixture chord candidate missing')
  return candidate
}

// @test-link [[module_pitch_planner]]
// @test-link [[module_pitch_search_inspection]]
// @test-link [[entity_pitch_candidate_domain]]
describe('pitch planner regressions', () => {
  it('discharges a selected passing-or-neighbor binding with its member position and validates it', () => {
    const base = fixture()
    const domain = makeTensionBindingDomain(base.harmony, base.rhythm)
    if (domain.kind !== 'tension_binding_domain') throw new Error('fixture binding domain missing')
    const binding = domain.bindings.find(
      (item) => item.figureKind === 'diatonic_passing_or_neighbor',
    )
    if (!binding) throw new Error('fixture passing binding missing')
    const input = withBinding(base, binding)
    const memberIndex = binding.attackIndices[0]!
    const offered = enumeratePitchCandidates(input, memberIndex).find(
      (item) => item.reservation?.bindingIdentity === binding.identity,
    )
    expect(offered).toMatchObject({ reservation: { memberPosition: 0 } })

    const plan = expectValidPlan(input)
    const selected = plan.phrase.assignments[memberIndex]!.candidate
    expect(selected).toMatchObject({
      role: 'passing_or_neighbor',
      reservation: { bindingIdentity: binding.identity, memberPosition: 0 },
    })
  })

  it('starts an enclosure after attack zero and rejects incomplete, same-side, and crossed paths', () => {
    const input = fixture({ profile: 'Jazz' })
    const attacks = pitchAttacks(input)
    const first = enumeratePitchCandidates(input, 1).find(
      (item) => item.role === 'chromatic_enclosure_upper' && item.reservation?.memberPosition === 0,
    )
    if (!first?.reservation) throw new Error('fixture enclosure missing')
    const matching = enumeratePitchCandidates(input, 2).find(
      (item) => item.reservation?.identity === first.reservation?.identity,
    )
    const sameSide = enumeratePitchCandidates(input, 2).find(
      (item) => item.role === 'chromatic_enclosure_upper',
    )
    const crossed = enumeratePitchCandidates(input, 2).find(
      (item) =>
        item.role === 'chromatic_enclosure_lower' &&
        item.reservation?.identity !== first.reservation?.identity,
    )
    const targetMidi = first.reservation.path.at(-1)
    const target = enumeratePitchCandidates(input, 3).find((item) => item.midi === targetMidi)
    if (!matching || !sameSide || !crossed || !target)
      throw new Error('fixture enclosure path missing')
    const opening = closestChordCandidate(input, 0, first.midi)
    const prefix = (second: typeof matching, complete: boolean) => [
      { attack: attacks[0]!, candidate: opening },
      { attack: attacks[1]!, candidate: first },
      { attack: attacks[2]!, candidate: second },
      ...(complete ? [{ attack: attacks[3]!, candidate: target }] : []),
    ]

    expect(inspectPitchSearchState(input, prefix(matching, false))).toBeDefined()
    expect(inspectPitchSearchState(input, prefix(matching, true))).toBeDefined()
    expect(inspectPitchSearchState(input, prefix(sameSide, false))).toBeUndefined()
    expect(inspectPitchSearchState(input, prefix(crossed, false))).toBeUndefined()
    expectValidPlan(input)
  })

  it('uses the selected candidate MIDI when a bound approach collides with a chord pitch class', () => {
    const base = fixture()
    const input = withBinding(base, {
      identity: 'approach/2-3/4',
      bindingIndex: 1,
      figureKind: 'two_note_diatonic_approach',
      attackIndices: [2, 3],
      targetAttackIndex: 4,
    })
    const collision = enumeratePitchCandidates(input, 2).find(
      (item) => item.role === 'diatonic_approach_two' && item.pitchClass === 4,
    )
    if (!collision) throw new Error('fixture pitch-class collision missing')
    const attacks = pitchAttacks(input)
    const opening = closestChordCandidate(input, 0, 67)
    const preparation = closestChordCandidate(input, 1, 60)
    const state = inspectPitchSearchState(input, [
      { attack: attacks[0]!, candidate: opening },
      { attack: attacks[1]!, candidate: preparation },
      { attack: attacks[2]!, candidate: collision },
    ])
    // The selected approach pitch is a chord pitch class, so it can complete this recognized run.
    // This distinguishes selected MIDI facts from the old domain-membership approximation.
    expect(state).toMatchObject({ motion: { runs: 1 } })
  })

  it('permits one recognized Smooth run while retaining a valid complete plan', () => {
    const input = fixture({ leapiness: 'Smooth' })
    const attacks = pitchAttacks(input)
    const prefix = [48, 52, 55].map((midi, attackIndex) => {
      const candidate = enumeratePitchCandidates(input, attackIndex).find(
        (item) => item.role === 'chord_tone' && item.midi === midi,
      )
      if (!candidate) throw new Error(`fixture run candidate ${midi} missing`)
      return { attack: attacks[attackIndex]!, candidate }
    })
    expect(inspectPitchSearchState(input, prefix)).toMatchObject({ motion: { runs: 1 } })
    expectValidPlan(input)
  })

  it('terminates dense Smooth strict-contour search as a plan rather than a search limit', () => {
    const input = fixture({ density: 'Sixteenth', contour: 'Arch', leapiness: 'Smooth' })
    const plan = expectValidPlan(input)
    expect(plan.fuelUsed).toBeLessThanOrEqual(input.policy.searchFuel)
  })

  it('uses absolute-beat harmony through bar-spanning events and rejects uncovered attacks', () => {
    const base = fixture()
    const template = base.harmony
    const spanning: HarmonyCandidate = {
      ...template,
      events: [
        { ...template.events[0]!, barIndex: 0, startBeat: 0, durationBeats: 2 },
        { ...template.events[0]!, barIndex: 0, startBeat: 2, durationBeats: 6 },
        { ...template.events[0]!, barIndex: 2, startBeat: 0, durationBeats: 8 },
      ],
    }
    const input = makeBoundPitchPlannerInput({ ...base, harmony: spanning })
    const byBar = pitchAttacks(input).map((attack) => [attack.barIndex, attack.harmonyIndex])
    expect(byBar).toContainEqual([1, 1])
    expect(byBar).toContainEqual([2, 2])
    expectValidPlan(input)

    const gapped = makeBoundPitchPlannerInput({
      ...base,
      harmony: { ...spanning, events: [spanning.events[0]!] },
    })
    expect(() => pitchAttacks(gapped)).toThrow(PitchPlannerInputError)
  })

  it('reproduces the historical bound-plan fixture only when the resulting phrase validates', () => {
    for (const leapiness of ['Smooth', 'Shaped', 'Leaping'] as const) {
      const base = fixture({ leapiness })
      const domain = makeTensionBindingDomain(base.harmony, base.rhythm)
      if (domain.kind !== 'tension_binding_domain')
        throw new Error('fixture binding domain missing')
      expectValidPlan(withBinding(base, domain.bindings[0]!))
    }
  })

  // @test-link [[rule_arpeggio_chaos_respects_constraints]]
  it('keeps planner-selected chord priority on beat one and harmony changes for every chaos setting', () => {
    const base = fixture()
    const changedHarmony = {
      ...base.harmony,
      events: [
        { ...base.harmony.events[0]!, durationBeats: 1 },
        { ...base.harmony.events[0]!, startBeat: 1, durationBeats: 15 },
      ],
    } as HarmonyCandidate
    for (const arpeggioChaos of ['Predictable', 'Varied', 'Chaotic'] as const) {
      const input = makeBoundPitchPlannerInput({
        ...base,
        harmony: changedHarmony,
        policy: makePitchPolicy({ ...base.policy, arpeggioChaos }),
      })
      const plan = expectValidPlan(input)
      for (const assignment of plan.phrase.assignments) {
        if (assignment.attack.isBeatOne || assignment.attack.isFirstUnderHarmonyChange)
          expect(assignment.candidate.role).toBe('chord_tone')
      }
    }
  })

  it('uses reachable seeded equal-rank choices and deterministic MIDI fallback on tie-key collisions', () => {
    const seededFirstMidis = new Set<number>()
    for (let seed = 1; seed <= 24; seed += 1)
      seededFirstMidis.add(expectValidPlan(fixture({ seed })).phrase.assignments[0]!.candidate.midi)
    expect(seededFirstMidis.size).toBeGreaterThan(1)

    const input = fixture()
    const collision = planPitchPhraseWithTieKeyFactory(input, () => 0)
    expect(collision.kind).toBe('pitch_plan')
    if (collision.kind !== 'pitch_plan') throw new Error('collision fixture did not plan')
    expect(validatePitchPhrase(input, collision.phrase).kind).toBe('valid_pitch_phrase')
    const minimumChordMidi = Math.min(
      ...enumeratePitchCandidates(input, 0)
        .filter((candidate) => candidate.role === 'chord_tone')
        .map((candidate) => candidate.midi),
    )
    expect(collision.phrase.assignments[0]!.candidate.midi).toBe(minimumChordMidi)
  })

  // @test-link [[mechanic_pitch_search_policy]]
  it('classifies one unit below an exact successful fuel boundary as a limit, not exhaustion', () => {
    const unconstrained = fixture()
    const plan = expectValidPlan(unconstrained)
    expect(plan.fuelUsed).toBeGreaterThan(1)
    const exact = fixture({ fuel: plan.fuelUsed })
    const oneBelow = fixture({ fuel: plan.fuelUsed - 1 })
    expect(planPitchPhrase(exact)).toMatchObject({ kind: 'pitch_plan', fuelUsed: plan.fuelUsed })
    expect(planPitchPhrase(oneBelow)).toMatchObject({
      kind: 'search_limit_exceeded',
      fuelUsed: plan.fuelUsed - 1,
    })
  })

  // @test-link [[module_pitch_planner]]
  // @test-link [[module_pitch_search_inspection]]
  // @test-link [[module_pitch_search_context]]
  it('rejects an all-rest rhythm rather than returning an empty plan', () => {
    const base = fixture()
    const input = makeBoundPitchPlannerInput({
      ...base,
      rhythm: { ...base.rhythm, bars: [restBar(0), restBar(1), restBar(2), restBar(3)] },
    })
    expect(pitchAttacks(input)).toHaveLength(0)
    expect(planPitchPhrase(input)).toMatchObject({ kind: 'no_legal_pitch_plan', fuelUsed: 0 })
  })

  // @test-link [[module_pitch_planner]]
  // @test-link [[module_pitch_search_inspection]]
  // @test-link [[module_pitch_search_context]]
  it('rejects a rhythm whose bar has no fresh attack for a contour checkpoint', () => {
    const base = fixture()
    const input = makeBoundPitchPlannerInput({
      ...base,
      rhythm: { ...base.rhythm, bars: [noteBar(0), noteBar(1), restBar(2), noteBar(3)] },
    })
    expect(pitchAttacks(input)).toHaveLength(3)
    expect(planPitchPhrase(input)).toMatchObject({ kind: 'no_legal_pitch_plan' })
  })
})
