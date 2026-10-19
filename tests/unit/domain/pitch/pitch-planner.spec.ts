import { describe, expect, it } from 'vitest'
import {
  JAZZ_FIGURE_LEVELS,
  NEUTRAL_FIGURE_LEVELS,
  type FigureLevels,
} from '@/domain/figures/figure-levels'
import {
  makeGenerationRequest,
  makeRequestId,
  FOUR_FOUR_METER,
} from '@/domain/generation/generation-request'
import { makeHarmonyCandidateDomain } from '@/domain/harmony/harmony-planner'
import { makeActiveConcertRange } from '@/domain/profile/active-concert-range'
import { makeRegisterWindow } from '@/domain/profile/register-window'
import { makeSeed } from '@/domain/random/seed'
import { makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'
import {
  bindTensionRequirement,
  contourCanComplete,
  enumeratePitchCandidates,
  inspectPitchSearchState,
  isOpenPitchEndpoint,
  makeBoundPitchPlannerInput,
  makePitchPolicy,
  makeTensionBindingDomain,
  planPitchPhrase,
  planPitchPhraseWithTieKeyFactory,
  pitchAttacks,
} from '@/domain/pitch/pitch-planner'
import { orderCandidates } from '@/domain/pitch/pitch-ranking'
import { compareUnsignedPitchTie } from '@/domain/pitch/pitch-tie-key'
import type { BoundPitchPlannerInput } from '@/domain/pitch/pitch-types'
import { validatePitchPhrase } from '@/domain/pitch/validation/pitch-phrase-validator'

/** Plain UTF-16 code-unit order of two strings, independent of the runtime's locale. */
function codeUnitOrder(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function input(seed = 1, figureLevels: FigureLevels = NEUTRAL_FIGURE_LEVELS, fuel = 20_000) {
  const harmony = makeHarmonyCandidateDomain({
    tonalCenter: 'C',
    collection: 'Major',
    harmonicMotion: 'Static',
    tensionArc: 'Settled',
  })
  if (harmony.kind !== 'harmony_candidate_domain') throw new Error('fixture harmony missing')
  const rhythms = makeRhythmCandidateDomain({
    noteDensity: 'Quarter',
    rhythmicVariety: 'Slightly varied',
    silenceDensity: 'Sparse',
    syncopation: 'Straight',
    tensionArc: 'Settled',
  })
  if (rhythms.kind !== 'rhythm_candidate_domain') throw new Error('fixture rhythm missing')
  const rhythm = rhythms.candidates().next().value
  if (!rhythm) throw new Error('fixture rhythm missing')
  const binding = bindTensionRequirement(harmony.candidates[0]!, rhythm)
  if (!binding) throw new Error('fixture binding missing')
  return makeBoundPitchPlannerInput({
    request: makeGenerationRequest({
      requestId: makeRequestId('pitch-test'),
      seed: makeSeed(seed),
      measureCount: 4,
      meter: FOUR_FOUR_METER,
      activeConcertRange: makeActiveConcertRange(48, 72),
      register: 'Middle',
      registerWindow: makeRegisterWindow(48, 72),
    }),
    policy: makePitchPolicy({
      figureLevels,
      collection: 'Major',
      tonalCenter: 'C',
      contour: 'Wandering',
      leapiness: 'Angular',
      arpeggioChaos: 'Predictable',
      searchFuel: fuel,
    }),
    harmony: harmony.candidates[0]!,
    rhythm,
    tensionBinding: binding,
  })
}

/** Chord-tone assignments for the leading attacks of `base`, one MIDI value per attack. */
function chordToneAssignments(base: BoundPitchPlannerInput, midis: readonly number[]) {
  return midis.map((midi, attackIndex) => {
    const attack = pitchAttacks(base)[attackIndex]!
    const candidate = enumeratePitchCandidates(base, attackIndex).find(
      (item) => item.role === 'chord_tone' && item.midi === midi,
    )
    if (!candidate) throw new Error(`missing chord-tone fixture MIDI ${midi}`)
    return { attack, candidate }
  })
}

/**
 * Ordinary assignments for the leading attacks of `base`: the chord tone at each MIDI value, or
 * the free passing/neighbor candidate when that MIDI value is not a chord tone.
 */
function ordinaryAssignments(base: BoundPitchPlannerInput, midis: readonly number[]) {
  return midis.map((midi, attackIndex) => {
    const attack = pitchAttacks(base)[attackIndex]!
    const domain = enumeratePitchCandidates(base, attackIndex).filter(
      (item) => item.midi === midi && !item.reservation,
    )
    const candidate =
      domain.find((item) => item.role === 'chord_tone') ??
      domain.find((item) => item.role === 'passing_or_neighbor')
    if (!candidate) throw new Error(`missing ordinary fixture MIDI ${midi}`)
    return { attack, candidate }
  })
}

/** The fixture input with a different leapiness level. */
function withLeapiness(
  base: BoundPitchPlannerInput,
  leapiness: BoundPitchPlannerInput['policy']['leapiness'],
): BoundPitchPlannerInput {
  return makeBoundPitchPlannerInput({
    ...base,
    policy: makePitchPolicy({ ...base.policy, figureLevels: NEUTRAL_FIGURE_LEVELS, leapiness }),
  })
}

// @test-link [[module_pitch_planner]]
// @test-link [[module_pitch_search_inspection]]
// @test-link [[entity_pitch_candidate_domain]]
// @test-link [[mechanic_pitch_search_policy]]
describe('pitch planner slice A', () => {
  // @test-link [[module_pitch_search_context]]
  it('checkpoints each bar on its first fresh tick-0/8 attack, else its first fresh attack', () => {
    const base = input(3)
    // Bar 2 (attacks 7-10 at ticks 0/4/8/12) keeps its anchors only as tie continuations: tick 0
    // continues bar 1's tick-12 note and tick 8 continues the tick-4 note.
    const tieAnchored = makeBoundPitchPlannerInput({
      ...base,
      rhythm: {
        ...base.rhythm,
        bars: base.rhythm.bars.map((bar) =>
          bar.barIndex !== 2
            ? bar
            : {
                ...bar,
                events: bar.events.map((event) =>
                  event.startTick === 0 || event.startTick === 8
                    ? { ...event, tieContinuation: true }
                    : event,
                ),
              },
        ),
      },
    })
    const checkpoints = (bound: BoundPitchPlannerInput) =>
      pitchAttacks(bound)
        .filter((attack) => attack.isCheckpoint)
        .map((attack) => [attack.barIndex, attack.startTick])
    // Bar 1 opens with a rest, so its tick-8 attack is the checkpoint.
    expect(checkpoints(base)).toEqual([
      [0, 0],
      [1, 8],
      [2, 0],
      [3, 0],
    ])
    expect(checkpoints(tieAnchored)).toEqual([
      [0, 0],
      [1, 8],
      [2, 4],
      [3, 0],
    ])
    expect(planPitchPhrase(tieAnchored).kind).toBe('pitch_plan')
  })

  it('enumerates the same canonical domain for different seeds', () => {
    expect(enumeratePitchCandidates(input(1), 0)).toEqual(enumeratePitchCandidates(input(99), 0))
  })

  it('keeps candidates inside both inclusive range boundaries and deep-freezes its boundary', () => {
    const candidates = enumeratePitchCandidates(input(), 0)
    expect(candidates.every((candidate) => candidate.midi >= 48 && candidate.midi <= 72)).toBe(true)
    expect(Object.isFrozen(candidates)).toBe(true)
    expect(Object.isFrozen(input())).toBe(true)
  })

  it('keeps Neutral collection-only while Jazz admits only reserved chromatic approaches', () => {
    const neutral = enumeratePitchCandidates(input(1, NEUTRAL_FIGURE_LEVELS), 0)
    const jazz = enumeratePitchCandidates(input(1, JAZZ_FIGURE_LEVELS), 0)
    expect(
      neutral.every((candidate) => [0, 2, 4, 5, 7, 9, 11].includes(candidate.pitchClass)),
    ).toBe(true)
    expect(
      jazz
        .filter((candidate) => candidate.role === 'chromatic_approach')
        .every((candidate) => candidate.reservation),
    ).toBe(true)
  })

  it('enumerates every vocabulary role only when its complete local reservation fits', () => {
    const base = input(1, NEUTRAL_FIGURE_LEVELS)
    const withBinding = (tensionBinding: typeof base.tensionBinding) =>
      makeBoundPitchPlannerInput({
        request: base.request,
        policy: base.policy,
        harmony: base.harmony,
        rhythm: base.rhythm,
        tensionBinding,
      })
    const appoggiatura = withBinding({
      identity: 'appoggiatura/2/3',
      bindingIndex: 0,
      figureKind: 'appoggiatura',
      attackIndices: [2],
      targetAttackIndex: 3,
    })
    const approach = withBinding({
      identity: 'approach/1-2/3',
      bindingIndex: 0,
      figureKind: 'two_note_diatonic_approach',
      attackIndices: [1, 2],
      targetAttackIndex: 3,
    })
    const jazz = input(1, JAZZ_FIGURE_LEVELS)

    expect(
      enumeratePitchCandidates(base, 1).some(({ role }) => role === 'passing_or_neighbor'),
    ).toBe(true)
    expect(
      enumeratePitchCandidates(appoggiatura, 2).some(({ role }) => role === 'appoggiatura'),
    ).toBe(true)
    expect(
      enumeratePitchCandidates(approach, 1).some(({ role }) => role === 'diatonic_approach_two'),
    ).toBe(true)
    expect(
      enumeratePitchCandidates(approach, 2).some(({ role }) => role === 'diatonic_approach_one'),
    ).toBe(true)
    expect(enumeratePitchCandidates(jazz, 0).map(({ role }) => role)).toEqual(
      expect.arrayContaining([
        'chord_tone',
        'chromatic_approach',
        'chromatic_enclosure_upper',
        'chromatic_enclosure_lower',
      ]),
    )
  })

  it('uses stable binding alternatives and returns a typed required no-binding failure', () => {
    const optional = makeTensionBindingDomain(input().harmony, input().rhythm)
    expect(optional.kind).toBe('tension_binding_domain')
    if (optional.kind === 'tension_binding_domain') {
      expect(optional.bindings[0]).toMatchObject({ bindingIndex: 0, attackIndices: [] })
      expect(Object.isFrozen(optional.bindings)).toBe(true)
    }

    const build = makeHarmonyCandidateDomain({
      tonalCenter: 'C',
      collection: 'Major',
      harmonicMotion: 'Static',
      tensionArc: 'Build',
    })
    if (build.kind !== 'harmony_candidate_domain') throw new Error('fixture harmony missing')
    const sourceRhythm = input().rhythm
    const rhythm = {
      ...sourceRhythm,
      bars: sourceRhythm.bars.map((bar, index) =>
        index === 0
          ? { ...bar, events: bar.events.filter((event) => event.kind === 'note').slice(0, 1) }
          : { ...bar, events: [] },
      ),
    }
    const unavailable = makeTensionBindingDomain(build.candidates[0]!, rhythm)
    expect(unavailable).toMatchObject({ kind: 'no_legal_tension_binding', requiredFigureCount: 1 })
  })

  it('treats the next strong sounding onset as a deadline, not the required resolution onset', () => {
    const result = makeTensionBindingDomain(input().harmony, input().rhythm)
    expect(result.kind).toBe('tension_binding_domain')
    if (result.kind === 'tension_binding_domain')
      expect(result.bindings).toContainEqual(
        expect.objectContaining({
          figureKind: 'appoggiatura',
          attackIndices: [2],
          targetAttackIndex: 3,
        }),
      )
  })

  it('pairs both enclosure orders across their two attacks with one reservation identity', () => {
    const jazz = input(1, JAZZ_FIGURE_LEVELS)
    const first = enumeratePitchCandidates(jazz, 0)
    const second = enumeratePitchCandidates(jazz, 1)
    for (const firstRole of ['chromatic_enclosure_upper', 'chromatic_enclosure_lower'] as const) {
      const candidate = first.find(({ role }) => role === firstRole)
      expect(candidate?.reservation).toBeDefined()
      const complement =
        firstRole === 'chromatic_enclosure_upper'
          ? 'chromatic_enclosure_lower'
          : 'chromatic_enclosure_upper'
      expect(
        second.some(
          ({ role, reservation }) =>
            role === complement && reservation?.identity === candidate?.reservation?.identity,
        ),
      ).toBe(true)
    }
  })

  it('does not let same-side or cross-order enclosure members satisfy one reservation', () => {
    const jazz = input(1, JAZZ_FIGURE_LEVELS)
    const first = enumeratePitchCandidates(jazz, 0)
    const second = enumeratePitchCandidates(jazz, 1)
    const upperFirst = first.find(({ role }) => role === 'chromatic_enclosure_upper')
    const lowerFirst = first.find(({ role }) => role === 'chromatic_enclosure_lower')
    expect(upperFirst?.reservation?.identity).not.toBe(lowerFirst?.reservation?.identity)
    expect(
      second.some(
        ({ role, reservation }) =>
          role === 'chromatic_enclosure_upper' &&
          reservation?.identity === upperFirst?.reservation?.identity,
      ),
    ).toBe(false)
    expect(
      second.some(
        ({ role, reservation }) =>
          role === 'chromatic_enclosure_lower' &&
          reservation?.identity === lowerFirst?.reservation?.identity,
      ),
    ).toBe(false)
    expect(
      second.some(
        ({ role, reservation }) =>
          role === 'chromatic_enclosure_lower' &&
          reservation?.identity === upperFirst?.reservation?.identity,
      ),
    ).toBe(true)
    expect(
      second.some(
        ({ role, reservation }) =>
          role === 'chromatic_enclosure_upper' &&
          reservation?.identity === lowerFirst?.reservation?.identity,
      ),
    ).toBe(true)
  })

  it('enumerates both directed two-note collection approaches under their own reservations', () => {
    const base = input()
    const approach = makeBoundPitchPlannerInput({
      request: base.request,
      policy: base.policy,
      harmony: base.harmony,
      rhythm: base.rhythm,
      tensionBinding: {
        identity: 'approach/1-2/3',
        bindingIndex: 0,
        figureKind: 'two_note_diatonic_approach',
        attackIndices: [1, 2],
        targetAttackIndex: 3,
      },
    })
    const first = enumeratePitchCandidates(approach, 1).filter(
      ({ role }) => role === 'diatonic_approach_two',
    )
    const second = enumeratePitchCandidates(approach, 2).filter(
      ({ role }) => role === 'diatonic_approach_one',
    )
    const reservations = new Set(first.map(({ reservation }) => reservation?.identity))
    expect(reservations.size).toBeGreaterThanOrEqual(2)
    expect(
      [...reservations].every((identity) =>
        second.some(({ reservation }) => reservation?.identity === identity),
      ),
    ).toBe(true)
  })

  it('assigns canonical indices after source role, obligation, pitch class, and octave', () => {
    const candidates = enumeratePitchCandidates(input(4, JAZZ_FIGURE_LEVELS), 0)
    expect(candidates.map(({ enumerationIndex }) => enumerationIndex)).toEqual(
      candidates.map((_, index) => index),
    )
    expect(candidates).toEqual(
      [...candidates].sort(
        (left, right) =>
          codeUnitOrder(left.role, right.role) ||
          codeUnitOrder(left.obligationIdentity, right.obligationIdentity) ||
          left.pitchClass - right.pitchClass ||
          left.octaveIndex - right.octaveIndex,
      ),
    )
    expect(candidates.every((candidate) => Object.isFrozen(candidate))).toBe(true)
  })

  it('distinguishes natural exhaustion from deterministic fuel refusal', () => {
    expect(planPitchPhrase(input(1, NEUTRAL_FIGURE_LEVELS, 1)).kind).toBe('search_limit_exceeded')
    const result = planPitchPhrase(input())
    expect(['pitch_plan', 'no_legal_pitch_plan']).toContain(result.kind)
  })

  it('repeats deterministic search results for equal immutable inputs', () => {
    const first = planPitchPhrase(input(77))
    const second = planPitchPhrase(input(77))
    expect(first).toEqual(second)
    expect(pitchAttacks(input()).every((attack, index) => attack.attackIndex === index)).toBe(true)
  })

  it('uses exactly one beat-1-preferred checkpoint per bar and forward-checks all contours', () => {
    const base = input()
    expect(
      pitchAttacks(base)
        .filter(({ isCheckpoint }) => isCheckpoint)
        .map(({ startTick }) => startTick),
    ).toEqual([0, 8, 0, 0])
    for (const [contour, values] of [
      ['Rising', [48, 52, 55, 60]],
      ['Falling', [60, 55, 52, 48]],
      ['Arch', [48, 55, 52, 48]],
      ['Wandering', [48, 55, 52, 55]],
    ] as const) {
      const configured = makeBoundPitchPlannerInput({
        ...base,
        policy: makePitchPolicy({ ...base.policy, figureLevels: NEUTRAL_FIGURE_LEVELS, contour }),
      })
      const assignments = values.map((midi, index) => {
        const attack = pitchAttacks(configured).filter(({ isCheckpoint }) => isCheckpoint)[index]!
        const candidate = enumeratePitchCandidates(configured, attack.attackIndex).find(
          (item) => item.midi === midi,
        )
        if (!candidate) throw new Error(`missing fixture MIDI ${midi}`)
        return { attack, candidate }
      })
      expect(contourCanComplete(configured, assignments)).toBe(true)
    }
  })

  // @test-link [[mechanic_pitch_tie_break_ordering]]
  it('compares tie keys unsigned and falls back to MIDI then enumeration only on an injected collision', () => {
    const low = { seed: 1, decisionIdentity: 'attack', candidateStableIdentity: 'low' }
    const high = { seed: 1, decisionIdentity: 'attack', candidateStableIdentity: 'high' }
    expect(compareUnsignedPitchTie(low, high, 70, 60, 5, 4, () => 0x80000000)).toBeGreaterThan(0)
    expect(compareUnsignedPitchTie(low, high, 60, 60, 5, 4, () => 7)).toBeGreaterThan(0)
    expect(compareUnsignedPitchTie(low, high, 60, 60, 4, 5, () => 7)).toBeLessThan(0)
  })

  it('enforces the static open degree-five endpoint through DFS and rejects a tonic closure endpoint', () => {
    const base = input(19)
    const accepted = planPitchPhrase(base)
    expect(accepted.kind).toBe('pitch_plan')
    if (accepted.kind === 'pitch_plan')
      expect(accepted.phrase.assignments.at(-1)?.candidate.pitchClass).toBe(7)

    const closed = makeBoundPitchPlannerInput({
      ...base,
      request: makeGenerationRequest({
        ...base.request,
        activeConcertRange: makeActiveConcertRange(48, 72),
        registerWindow: makeRegisterWindow(60, 61),
      }),
      harmony: { ...base.harmony, endpoint: { kind: 'tonal_degree_five_chord_tone', degree: 5 } },
    })
    expect(planPitchPhrase(closed).kind).toBe('no_legal_pitch_plan')
  })

  it('does not let a Jazz chromatic reservation consume an appoggiatura binding in DFS', () => {
    const base = input(31, JAZZ_FIGURE_LEVELS)
    const requiredAppoggiatura = makeBoundPitchPlannerInput({
      ...base,
      tensionBinding: {
        identity: 'required-appoggiatura/2/3',
        bindingIndex: 0,
        figureKind: 'appoggiatura',
        attackIndices: [2],
        targetAttackIndex: 3,
      },
    })
    const result = planPitchPhrase(requiredAppoggiatura)
    expect(result.kind).toBe('pitch_plan')
    if (result.kind === 'pitch_plan') {
      // The bound member is realized by the appoggiatura reservation itself, never an ornament.
      const member = result.phrase.assignments[2]!.candidate
      expect(member.role).toBe('appoggiatura')
      expect(member.reservation?.bindingIdentity).toBe('required-appoggiatura/2/3')
      expect(validatePitchPhrase(requiredAppoggiatura, result.phrase).kind).toBe(
        'valid_pitch_phrase',
      )
    }

    // An appoggiatura on the first attack has no approach to leap from, so search exhausts.
    const impossibleAppoggiatura = makeBoundPitchPlannerInput({
      ...base,
      tensionBinding: {
        identity: 'required-appoggiatura/0/1',
        bindingIndex: 0,
        figureKind: 'appoggiatura',
        attackIndices: [0],
        targetAttackIndex: 1,
      },
    })
    expect(planPitchPhrase(impossibleAppoggiatura).kind).toBe('no_legal_pitch_plan')
  })

  // @test-link [[rule_leap_recovery]]
  // @test-link [[rule_leapiness_arpeggio_run_limits]]
  it('defers a large leap inside a recognized run to the note after the run, which must recover', () => {
    const angular = input(47)
    const inspect = (base: BoundPitchPlannerInput, midis: readonly number[]) =>
      inspectPitchSearchState(base, ordinaryAssignments(base, midis))
    // A skip carries no recovery debt, so a later repeated note is legal.
    expect(inspect(angular, [48, 52, 52])).toBeDefined()
    // A recognized C-E-G run may not be extended by a third same-direction wide interval.
    expect(inspect(angular, [48, 52, 55])).toBeDefined()
    expect(inspect(angular, [48, 52, 55, 60])).toBeUndefined()
    // Angular defers the C-G large leap inside the C-G-C run past the run's final note...
    expect(inspect(angular, [48, 55, 60])).toBeDefined()
    // ...where the next interval must move down by 1-4 semitones: B as a neighbor back to C.
    expect(inspect(angular, [48, 55, 60, 59])).toBeDefined()
    expect(inspect(angular, [48, 55, 60, 59, 60])).toBeDefined()
    // A skip into the free tone A is no passing/neighbor entry, so it cannot recover either.
    expect(inspect(angular, [48, 55, 60, 57])).toBeUndefined()
    // Contrary by 5, a repeated pitch, or a same-direction step is not a recovery.
    expect(inspect(angular, [48, 55, 60, 55])).toBeUndefined()
    expect(inspect(angular, [48, 55, 60, 60])).toBeUndefined()
    expect(inspect(angular, [48, 55, 60, 62])).toBeUndefined()
    // Shaped cannot defer: the interval right after the large leap must recover.
    const shaped = withLeapiness(angular, 'Shaped')
    expect(inspect(shaped, [48, 55, 52])).toBeDefined()
    expect(inspect(shaped, [48, 55, 60])).toBeUndefined()
  })

  it('rejects mixed-direction members of one required approach reservation', () => {
    const base = input(53)
    const approach = makeBoundPitchPlannerInput({
      ...base,
      tensionBinding: {
        identity: 'required-approach/1-2/3',
        bindingIndex: 0,
        figureKind: 'two_note_diatonic_approach',
        attackIndices: [1, 2],
        targetAttackIndex: 3,
      },
    })
    const first = enumeratePitchCandidates(approach, 1).find(
      (candidate) => candidate.role === 'diatonic_approach_two',
    )
    const second = enumeratePitchCandidates(approach, 2).find(
      (candidate) =>
        candidate.role === 'diatonic_approach_one' &&
        candidate.reservation?.identity !== first?.reservation?.identity,
    )
    const matching = enumeratePitchCandidates(approach, 2).find(
      (candidate) => candidate.reservation?.identity === first?.reservation?.identity,
    )
    if (!first || !second || !matching) throw new Error('missing approach reservations')
    // Open on the nearest attack-0 chord tone so the prefix itself is legal.
    const opening = enumeratePitchCandidates(approach, 0)
      .filter((candidate) => candidate.role === 'chord_tone')
      .reduce((best, candidate) =>
        Math.abs(candidate.midi - first.midi) < Math.abs(best.midi - first.midi) ? candidate : best,
      )
    const attacks = pitchAttacks(approach)
    const prefix = (member: typeof first) => [
      { attack: attacks[0]!, candidate: opening },
      { attack: attacks[1]!, candidate: first },
      { attack: attacks[2]!, candidate: member },
    ]
    // Positive control: the second member of the same concrete path confirms it.
    expect(inspectPitchSearchState(approach, prefix(matching))).toBeDefined()
    expect(inspectPitchSearchState(approach, prefix(second))).toBeUndefined()
  })

  it('accepts a modal degree-five chord tone but rejects a tonic pitch over tonic harmony', () => {
    const base = input(57)
    const modal = makeBoundPitchPlannerInput({
      ...base,
      policy: makePitchPolicy({
        ...base.policy,
        figureLevels: NEUTRAL_FIGURE_LEVELS,
        collection: 'Dorian',
      }),
      harmony: { ...base.harmony, endpoint: { kind: 'modal_non_tonic_chord_tone', degree: 5 } },
    })
    const attack = pitchAttacks(modal).at(-1)!
    const chordTone = (midi: number) => {
      const candidate = enumeratePitchCandidates(modal, attack.attackIndex).find(
        (item) => item.role === 'chord_tone' && item.midi === midi,
      )
      if (!candidate) throw new Error(`missing modal endpoint MIDI ${midi}`)
      return { attack, candidate }
    }
    expect(isOpenPitchEndpoint(modal, [chordTone(55)])).toBe(true)
    expect(isOpenPitchEndpoint(modal, [chordTone(60)])).toBe(false)
  })

  // @test-link [[rule_leap_recovery]]
  it('finalizes a large-leap run with contrary recovery without overlapping a second run', () => {
    const base = input(59)
    const inspect = (midis: readonly number[]) =>
      inspectPitchSearchState(base, chordToneAssignments(base, midis))
    // A large leap recovered by a contrary skip is legal.
    expect(inspect([48, 55, 52])).toBeDefined()
    // Inside a recognized run, Angular defers the debt past the run's final note.
    expect(inspect([48, 55, 60])).toBeDefined()
    // A contrary large leap is not a recovery.
    expect(inspect([48, 55, 48])).toBeUndefined()
  })

  // @test-link [[rule_arpeggio_chaos_respects_constraints]]
  it('tries every chord tone before any non-chord tone at each step under every arpeggio chaos', () => {
    // An adversarial tie key would prefer every non-chord candidate if rank ever tied them.
    const preferNonChord = ({ candidateStableIdentity }: { candidateStableIdentity: string }) =>
      candidateStableIdentity.startsWith('chord_tone/') ? 0xffffffff : 0
    for (const arpeggioChaos of ['Predictable', 'Varied', 'Chaotic'] as const) {
      const base = input(61)
      const configured = makeBoundPitchPlannerInput({
        ...base,
        policy: makePitchPolicy({
          ...base.policy,
          figureLevels: NEUTRAL_FIGURE_LEVELS,
          arpeggioChaos,
        }),
      })
      const result = planPitchPhraseWithTieKeyFactory(configured, preferNonChord)
      expect(result.kind).toBe('pitch_plan')
      if (result.kind !== 'pitch_plan') continue
      expect(validatePitchPhrase(configured, result.phrase).kind).toBe('valid_pitch_phrase')
      // Free non-chord tones may survive backtracking (Chaotic reaches one after a C-C-C run whose
      // deferred debt no chord tone can repay), but the first-choice order at every step along the
      // plan must still put every chord tone ahead of every non-chord tone.
      result.phrase.assignments.forEach(({ attack }, index) => {
        const ordered = orderCandidates({
          chaos: arpeggioChaos,
          seed: configured.request.seed,
          attack,
          candidates: enumeratePitchCandidates(configured, attack.attackIndex),
          priorMidi: result.phrase.assignments[index - 1]?.candidate.midi,
          key: preferNonChord,
        })
        const roles = ordered.map(({ role }) => role)
        const firstNonChord = roles.findIndex((role) => role !== 'chord_tone')
        if (firstNonChord >= 0) expect(roles.lastIndexOf('chord_tone')).toBeLessThan(firstNonChord)
      })
    }
  })
})
