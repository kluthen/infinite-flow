import { describe, expect, it } from 'vitest'
import {
  JAZZ_FIGURE_LEVELS,
  NEUTRAL_FIGURE_LEVELS,
  type FigureId,
  type FigureLevels,
} from '@/domain/figures/figure-levels'
import {
  FOUR_FOUR_METER,
  makeGenerationRequest,
  makeRequestId,
} from '@/domain/generation/generation-request'
import { makeHarmonyCandidateDomain } from '@/domain/harmony/harmony-planner'
import { makeActiveConcertRange } from '@/domain/profile/active-concert-range'
import { makeRegisterWindow } from '@/domain/profile/register-window'
import { fnv1a32 } from '@/domain/random/hash32'
import { makeSeed } from '@/domain/random/seed'
import { makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'
import { deepFreeze } from '@/domain/events/deep-freeze'
import { makeConcertPitch } from '@/domain/events/concert-pitch'
import type { ArpeggioChaos, Contour, Leapiness } from '@/domain/controls/generation-controls'
import {
  advance,
  advanceSearchStep,
  indexedDomainMember,
  initialPitchSearchState,
} from '@/domain/pitch/pitch-advance'
import {
  compilePitchSearchContext,
  makeBoundPitchPlannerInput,
  makePitchPolicy,
  planPitchPhraseWithTieKeyFactory,
} from '@/domain/pitch/pitch-planner'
import { requiredMidi } from '@/domain/pitch/pitch-figures'
import { orderCandidates, pitchRank } from '@/domain/pitch/pitch-ranking'
import { searchPitchPlan } from '@/domain/pitch/pitch-search'
import {
  compareUnsignedPitchTie,
  pitchTieKey,
  type PitchTieKeyFactory,
} from '@/domain/pitch/pitch-tie-key'
import type {
  BoundPitchPlannerInput,
  PitchAssignment,
  PitchAttack,
  PitchCandidate,
  PitchPhrase,
  PitchPlanResult,
  PitchRole,
  PitchSearchState,
} from '@/domain/pitch/pitch-types'

/*
 * These specs check the performance rewrite of `orderCandidates`, `advanceSearchStep`, and
 * `searchPitchPlan` (src/domain/pitch/{pitch-ranking,pitch-advance,pitch-search}.ts) against
 * verbatim copies of their be9128b behavior, kept local to this file so nothing under src/ needs
 * to change to run this equivalence check.
 */

// ---------------------------------------------------------------------------------------------
// A small deterministic seeded PRNG (mulberry32); no external dependency.
// ---------------------------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function randomInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

function pick<T>(rng: () => number, values: readonly T[]): T {
  return values[randomInt(rng, 0, values.length - 1)]!
}

// ---------------------------------------------------------------------------------------------
// Deliverable 1: reference (be9128b) `orderCandidates`, kept verbatim in spirit: it hashes the tie
// key once per comparison via `compareUnsignedPitchTie`, instead of once per candidate.
// `pitchRank` and `compareUnsignedPitchTie` are unchanged by the performance rewrite (see the
// tracked diff), so the reference implementation reuses the production copies of those two.
// ---------------------------------------------------------------------------------------------

/** Verbatim from be9128b `pitch-ranking.ts`: lexicographic comparison of two rank tuples. */
function referenceCompareRank(a: readonly number[], b: readonly number[]): number {
  for (let index = 0; index < a.length; index += 1)
    if (a[index] !== b[index]) return a[index]! - b[index]!
  return 0
}

/** Verbatim from be9128b `pitch-ranking.ts`: hashes the tie key once per pairwise comparison. */
function referenceOrderCandidates(input: {
  readonly chaos: ArpeggioChaos
  readonly seed: number
  readonly attack: PitchAttack
  readonly candidates: readonly PitchCandidate[]
  readonly priorMidi: number | undefined
  readonly key: PitchTieKeyFactory
}): readonly PitchCandidate[] {
  const ranked = input.candidates.map((candidate) => ({
    candidate,
    rank: pitchRank(input.chaos, input.attack, candidate, input.priorMidi),
  }))
  ranked.sort(
    (a, b) =>
      referenceCompareRank(a.rank, b.rank) ||
      compareUnsignedPitchTie(
        {
          seed: input.seed,
          decisionIdentity: input.attack.identity,
          candidateStableIdentity: a.candidate.identity,
        },
        {
          seed: input.seed,
          decisionIdentity: input.attack.identity,
          candidateStableIdentity: b.candidate.identity,
        },
        a.candidate.midi,
        b.candidate.midi,
        a.candidate.enumerationIndex,
        b.candidate.enumerationIndex,
        input.key,
      ),
  )
  return ranked.map((entry) => entry.candidate)
}

// ---------------------------------------------------------------------------------------------
// Shared fixtures for both the ordering property test and the real-context equivalence checks.
// ---------------------------------------------------------------------------------------------

/** A full PitchAttack fixture; overrides isolate the fields a scenario probes. */
function attack(overrides: Partial<PitchAttack> = {}): PitchAttack {
  return {
    attackIndex: 0,
    identity: '0:0',
    barIndex: 0,
    startTick: 0,
    durationTicks: 4,
    start: 0,
    end: 4,
    chordPitchClasses: [0, 4, 7],
    harmonyIndex: 0,
    harmonyIdentity: 'fixture/0/0',
    isCheckpoint: true,
    isBeatOne: false,
    isFirstUnderHarmonyChange: false,
    isFinal: false,
    ...overrides,
  }
}

/** A chord-tone or non-chord candidate; every field but role/midi is overridable. */
function candidate(overrides: {
  readonly role: PitchRole
  readonly midi: number
  readonly identity?: string
  readonly enumerationIndex?: number
  readonly reservation?: PitchCandidate['reservation']
}): PitchCandidate {
  const midi = overrides.midi
  return {
    identity: overrides.identity ?? `${overrides.role}/${midi}`,
    role: overrides.role,
    pitchClass: ((midi % 12) + 12) % 12,
    octaveIndex: Math.floor(midi / 12),
    obligationIdentity: `${overrides.role}:${midi}`,
    enumerationIndex: overrides.enumerationIndex ?? 0,
    ...(overrides.reservation ? { reservation: overrides.reservation } : {}),
    midi: makeConcertPitch(midi),
  }
}

const ALL_ROLES: readonly PitchRole[] = [
  'chord_tone',
  'passing_or_neighbor',
  'appoggiatura',
  'diatonic_approach_one',
  'diatonic_approach_two',
  'chromatic_approach',
  'chromatic_enclosure_upper',
  'chromatic_enclosure_lower',
]

const ALL_CHAOS: readonly ArpeggioChaos[] = ['Predictable', 'Chaotic', 'Varied']

/**
 * The figures a randomized candidate names, by role, so the levels' ordering has figures to read;
 * the reference ordering ignores them. Assigned without drawing from the PRNG, so the scenarios
 * themselves are unchanged.
 */
const ROLE_FIGURES: Readonly<Partial<Record<PitchRole, readonly FigureId[]>>> = {
  passing_or_neighbor: ['passingTone', 'neighborTone'],
  chromatic_approach: ['chromaticApproach'],
  chromatic_enclosure_upper: ['chromaticEnclosure'],
}

/** No levels (the order before the levels existed), then Neutral's and Jazz's levels. */
const ORDER_LEVELS: readonly (FigureLevels | undefined)[] = [
  undefined,
  NEUTRAL_FIGURE_LEVELS,
  JAZZ_FIGURE_LEVELS,
]

/** Key factories exercised by the ordering property test, including unsigned-compare edges. */
function keyFactories(): ReadonlyArray<{
  readonly name: string
  readonly factory: PitchTieKeyFactory
}> {
  return [
    { name: 'real pitchTieKey', factory: pitchTieKey },
    { name: 'constant key', factory: () => 4242 },
    {
      // Forces a negative signed 32-bit value (bit 31 set); the comparator must still order it
      // by unsigned magnitude via `>>> 0`.
      name: 'bit31/negative key',
      factory: (subject) => fnv1a32(subject.candidateStableIdentity) | 0,
    },
    {
      // Low cardinality forces frequent collisions, exercising the MIDI/enumerationIndex tiebreak.
      name: 'low-cardinality colliding key',
      factory: (subject) => fnv1a32(subject.candidateStableIdentity) % 3,
    },
    {
      name: 'seed-and-decision-sensitive key',
      factory: (subject) =>
        (fnv1a32(`${subject.seed}|${subject.decisionIdentity}`) ^
          fnv1a32(subject.candidateStableIdentity)) >>>
        0,
    },
  ]
}

/** One randomized `orderCandidates` scenario: chaos, attack flags, a candidate set, and a key. */
function randomScenario(
  rng: () => number,
  index: number,
  keys: ReadonlyArray<{ readonly name: string; readonly factory: PitchTieKeyFactory }>,
): {
  readonly chaos: ArpeggioChaos
  readonly seed: number
  readonly attack: PitchAttack
  readonly candidates: readonly PitchCandidate[]
  readonly priorMidi: number | undefined
  readonly key: PitchTieKeyFactory
  readonly keyName: string
} {
  const chaos = pick(rng, ALL_CHAOS)
  const seed = randomInt(rng, 0, 1_000_000)
  const attackFixture = attack({
    attackIndex: index,
    identity: `attack-${randomInt(rng, 0, 6)}`,
    isBeatOne: rng() < 0.5,
    isFirstUnderHarmonyChange: rng() < 0.5,
    isFinal: rng() < 0.1,
  })
  const candidateCount = randomInt(rng, 1, 9)
  // A small MIDI pool and a small identity pool both encourage duplicate MIDIs and duplicate
  // stable identities across candidates, which is where rank/tie-key collisions live.
  const midiPool = Array.from({ length: 5 }, () => randomInt(rng, 40, 90))
  const identityPool = Array.from({ length: 4 }, (_, n) => `id-${n}`)
  const enumerationPool = Array.from({ length: 4 }, () => randomInt(rng, 0, 5))
  const candidates = Array.from({ length: candidateCount }, (_, position) => {
    const role = pick(rng, ALL_ROLES)
    const midi = pick(rng, midiPool)
    const figures = ROLE_FIGURES[role]
    return {
      ...candidate({
        role,
        midi,
        identity: `${pick(rng, identityPool)}/${position}`,
        enumerationIndex: pick(rng, enumerationPool),
      }),
      ...(figures === undefined ? {} : { figures }),
    }
  })
  const priorMidi = rng() < 0.3 ? undefined : randomInt(rng, 40, 90)
  const { name: keyName, factory: key } = pick(rng, keys)
  return { chaos, seed, attack: attackFixture, candidates, priorMidi, key, keyName }
}

/**
 * The production order of a scenario under each of ORDER_LEVELS, each checked against the
 * reference order: equal candidates in equal order, and no favored entry.
 */
function expectReferenceOrder(
  scenario: Parameters<typeof referenceOrderCandidates>[0],
  message: string,
): void {
  const reference = referenceOrderCandidates(scenario).map((entry) => [
    entry.identity,
    entry.midi,
    entry.enumerationIndex,
  ])
  for (const figureLevels of ORDER_LEVELS) {
    const production = orderCandidates({
      ...scenario,
      ...(figureLevels === undefined ? {} : { figureLevels }),
    })
    expect(production.every((entry) => entry.favored === undefined)).toBe(true)
    expect(
      production.map(({ candidate }) => [
        candidate.identity,
        candidate.midi,
        candidate.enumerationIndex,
      ]),
      message,
    ).toEqual(reference)
  }
}

// @test-link [[module_pitch_planner]]
describe('pitch-search-equivalence: orderCandidates', () => {
  // @test-link [[rule_arpeggio_chaos_respects_constraints]]
  // @test-link [[module_favored_figure_draw]]
  it('matches the be9128b reference ordering across a few thousand randomized scenarios', () => {
    const rng = mulberry32(0x5eed_5eed)
    const keys = keyFactories()
    const SCENARIO_COUNT = 3000
    for (let index = 0; index < SCENARIO_COUNT; index += 1) {
      const scenario = randomScenario(rng, index, keys)
      expectReferenceOrder(
        scenario,
        `scenario ${index} (chaos=${scenario.chaos}, key=${scenario.keyName}) diverged`,
      )
    }
  })

  // @test-link [[rule_arpeggio_chaos_respects_constraints]]
  // @test-link [[module_favored_figure_draw]]
  it('matches the be9128b reference ordering over candidates from real compiled contexts', () => {
    const inputs = [
      fixtureInput({ seed: 1 }),
      fixtureInput({ seed: 31, figureLevels: JAZZ_FIGURE_LEVELS }),
      fixtureInput({ seed: 47, leapiness: 'Angular' }),
    ]
    const keys = keyFactories()
    let scenarios = 0
    for (const input of inputs) {
      const context = compilePitchSearchContext(input)
      for (const attackFixture of context.attacks) {
        const domain = context.candidateDomains[attackFixture.attackIndex]!
        if (domain.length === 0) continue
        for (const chaos of ALL_CHAOS) {
          for (const { factory: key } of keys) {
            scenarios += 1
            const scenario = {
              chaos,
              seed: input.request.seed,
              attack: attackFixture,
              candidates: domain,
              priorMidi: attackFixture.attackIndex === 0 ? undefined : 60,
              key,
            }
            expectReferenceOrder(scenario, `attack ${attackFixture.identity} diverged`)
          }
        }
      }
    }
    expect(scenarios).toBeGreaterThan(500)
  })
})

// ---------------------------------------------------------------------------------------------
// Shared real-input fixture builders, in the style of pitch-planner.spec.ts /
// pitch-planner-regressions.spec.ts.
// ---------------------------------------------------------------------------------------------

function fixtureInput(
  options: Partial<{
    seed: number
    figureLevels: FigureLevels
    contour: Contour
    leapiness: Leapiness
    arpeggioChaos: ArpeggioChaos
    fuel: number
    withAppoggiatura: boolean
  }> = {},
): BoundPitchPlannerInput {
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
  return makeBoundPitchPlannerInput({
    request: makeGenerationRequest({
      requestId: makeRequestId('pitch-search-equivalence'),
      seed: makeSeed(options.seed ?? 1),
      measureCount: 4,
      meter: FOUR_FOUR_METER,
      activeConcertRange: makeActiveConcertRange(48, 72),
      register: 'Middle',
      registerWindow: makeRegisterWindow(48, 72),
    }),
    policy: makePitchPolicy({
      figureLevels: options.figureLevels ?? NEUTRAL_FIGURE_LEVELS,
      collection: 'Major',
      tonalCenter: 'C',
      contour: options.contour ?? 'Wandering',
      leapiness: options.leapiness ?? 'Angular',
      arpeggioChaos: options.arpeggioChaos ?? 'Predictable',
      searchFuel: options.fuel ?? 20_000,
    }),
    harmony: harmony.candidates[0]!,
    rhythm,
    tensionBinding: options.withAppoggiatura
      ? {
          identity: 'appoggiatura/2/3',
          bindingIndex: 0,
          figureKind: 'appoggiatura',
          attackIndices: [2],
          targetAttackIndex: 3,
        }
      : { identity: 'none', bindingIndex: 0, attackIndices: [] },
  })
}

// ---------------------------------------------------------------------------------------------
// Deliverable 2: `advanceSearchStep` (with `indexedDomainMember`) vs `advance` (with the linear
// `domainMember` scan), walked across real search states.
// ---------------------------------------------------------------------------------------------

/** A tampered candidate with the same identity as `source` but a different MIDI. */
function withWrongMidi(source: PitchCandidate): PitchCandidate {
  return { ...source, midi: makeConcertPitch(((source.midi + 7) % 88) + 20) }
}

/** A candidate whose identity cannot appear in any real domain. */
function outsideDomainCandidate(): PitchCandidate {
  return candidate({ role: 'chord_tone', midi: 60, identity: 'not-a-real-candidate/xyz' })
}

/**
 * Breadth-first walk of a search context's reachable states, comparing `advance` and
 * `advanceSearchStep` (through `member`) at every visited state for the whole candidate domain,
 * plus a couple of intentionally invalid proposals. Bounded so the walk stays fast.
 */
function walkAndCompare(
  context: ReturnType<typeof compilePitchSearchContext>,
  member: ReturnType<typeof indexedDomainMember>,
  maxVisitedStates: number,
  maxComparisons: number,
): number {
  const visited = new Set<string>()
  const frontier: PitchSearchState[] = [initialPitchSearchState(context)]
  let comparisons = 0
  while (frontier.length > 0 && visited.size < maxVisitedStates && comparisons < maxComparisons) {
    const state = frontier.shift()!
    if (state.nextAttackIndex >= context.attacks.length) continue
    const stateKey = JSON.stringify(state)
    if (visited.has(stateKey)) continue
    visited.add(stateKey)
    const attack = context.attacks[state.nextAttackIndex]!
    const domain = context.candidateDomains[attack.attackIndex]!
    const proposals: readonly PitchCandidate[] = [
      ...domain,
      outsideDomainCandidate(),
      ...(domain[0] ? [withWrongMidi(domain[0])] : []),
    ]
    for (const proposed of proposals) {
      if (comparisons >= maxComparisons) break
      comparisons += 1
      const viaAdvance = advance(context, state, proposed)
      const viaSearchStep = advanceSearchStep(context, state, proposed, member)
      expect(viaSearchStep.kind).toBe(viaAdvance.kind)
      if (viaAdvance.kind === 'rejected' && viaSearchStep.kind === 'rejected')
        expect(viaSearchStep.reason).toBe(viaAdvance.reason)
      if (viaAdvance.kind === 'accepted' && viaSearchStep.kind === 'accepted') {
        expect(viaSearchStep.nextState).toEqual(viaAdvance.nextState)
        if (frontier.length < maxVisitedStates * 3) frontier.push(viaAdvance.nextState)
      }
    }
  }
  return comparisons
}

// @test-link [[module_pitch_search_transition]]
describe('pitch-search-equivalence: advanceSearchStep vs advance', () => {
  it('agrees with advance on kind, reason, and nextState across real search states', () => {
    const inputs = [
      fixtureInput({ seed: 1 }),
      fixtureInput({ seed: 19 }),
      fixtureInput({ seed: 31, figureLevels: JAZZ_FIGURE_LEVELS }),
      fixtureInput({ seed: 31, figureLevels: JAZZ_FIGURE_LEVELS, withAppoggiatura: true }),
      fixtureInput({ seed: 47, leapiness: 'Shaped' }),
      fixtureInput({ seed: 59, contour: 'Arch' }),
      fixtureInput({ seed: 61, arpeggioChaos: 'Chaotic' }),
    ]
    let totalComparisons = 0
    for (const input of inputs) {
      const context = compilePitchSearchContext(input)
      const member = indexedDomainMember(context)
      totalComparisons += walkAndCompare(context, member, 60, 700)
    }
    expect(totalComparisons).toBeGreaterThan(1000)
  })

  it('resolves a proposed candidate outside the domain and a wrong-MIDI proposal the same way as advance', () => {
    const input = fixtureInput({ seed: 1 })
    const context = compilePitchSearchContext(input)
    const member = indexedDomainMember(context)
    const state = initialPitchSearchState(context)
    const domain = context.candidateDomains[0]!
    const real = domain[0]!

    const outside = outsideDomainCandidate()
    expect(advance(context, state, outside)).toEqual({
      kind: 'rejected',
      reason: 'candidate_outside_domain',
    })
    expect(advanceSearchStep(context, state, outside, member)).toEqual({
      kind: 'rejected',
      reason: 'candidate_outside_domain',
    })

    const wrongMidi = withWrongMidi(real)
    expect(advance(context, state, wrongMidi)).toEqual({
      kind: 'rejected',
      reason: 'candidate_outside_domain',
    })
    expect(advanceSearchStep(context, state, wrongMidi, member)).toEqual({
      kind: 'rejected',
      reason: 'candidate_outside_domain',
    })
  })

  it('resolves duplicate identities in the domain to the first entry, exactly like Array#find', () => {
    const input = fixtureInput({ seed: 1 })
    const context = compilePitchSearchContext(input)
    const attackIndex = 0
    const baseDomain = context.candidateDomains[attackIndex]!
    const sharedMidi = baseDomain.find((entry) => entry.role === 'chord_tone')!.midi

    // Two entries share one identity and MIDI: the first is a plain chord tone (always accepted
    // as an opening note), the second carries an appoggiatura reservation that is rejected on
    // attack 0 (no prior note to leap from). First-wins means the plain entry must be used.
    const firstEntry = candidate({
      role: 'chord_tone',
      midi: sharedMidi,
      identity: 'duplicate/shared',
      enumerationIndex: 0,
    })
    const secondEntry: PitchCandidate = {
      ...firstEntry,
      reservation: {
        identity: 'duplicate-reservation',
        figureKind: 'appoggiatura',
        attackIndices: [0],
        targetAttackIndex: 1,
        targetPitchClass: 0,
        memberPosition: 0,
        path: [sharedMidi, sharedMidi],
      },
    }
    const duplicateDomain = deepFreeze([firstEntry, secondEntry, ...baseDomain])
    const duplicateContext = {
      ...context,
      candidateDomains: context.candidateDomains.map((domain, index) =>
        index === attackIndex ? duplicateDomain : domain,
      ),
    }
    const member = indexedDomainMember(duplicateContext)
    const state = initialPitchSearchState(duplicateContext)
    const proposed = candidate({
      role: 'chord_tone',
      midi: sharedMidi,
      identity: 'duplicate/shared',
    })

    const viaAdvance = advance(duplicateContext, state, proposed)
    const viaSearchStep = advanceSearchStep(duplicateContext, state, proposed, member)
    expect(viaAdvance.kind).toBe('accepted')
    expect(viaSearchStep.kind).toBe('accepted')
    if (viaAdvance.kind === 'accepted' && viaSearchStep.kind === 'accepted')
      expect(viaSearchStep.nextState).toEqual(viaAdvance.nextState)
  })
})

// ---------------------------------------------------------------------------------------------
// Deliverable 3: `searchPitchPlan` vs a verbatim reference copy of be9128b `searchPitchPlan`,
// which uses `advance` and the reference ordering.
// ---------------------------------------------------------------------------------------------

interface ReferenceSearchBudget {
  fuel: number
  limited: boolean
  readonly dead: Set<string>
}

/** Verbatim from be9128b `pitch-search.ts`, using the reference ordering and `advance`. */
function referenceSearchPitchPlan(
  input: BoundPitchPlannerInput,
  key: PitchTieKeyFactory,
): PitchPlanResult {
  const context = compilePitchSearchContext(input)
  if (context.contourPlan.impossible)
    return deepFreeze({ kind: 'no_legal_pitch_plan', fuelUsed: 0 })
  const budget: ReferenceSearchBudget = {
    fuel: input.policy.searchFuel,
    limited: false,
    dead: new Set(),
  }
  const visit = (
    state: PitchSearchState,
    assignments: readonly PitchAssignment[],
  ): PitchPhrase | undefined => {
    if (state.nextAttackIndex === context.attacks.length)
      return deepFreeze({ kind: 'pitch_phrase', assignments: [...assignments] })
    const stateKey = JSON.stringify([
      state.nextAttackIndex,
      state.prior,
      state.motion,
      state.figure,
      state.contour,
    ])
    if (budget.dead.has(stateKey)) return undefined
    const attack = context.attacks[state.nextAttackIndex]!
    const required = requiredMidi(state.figure)
    const domain = context.candidateDomains[attack.attackIndex]!.filter(
      (candidate) => required === undefined || candidate.midi === required,
    )
    const ordered = referenceOrderCandidates({
      chaos: input.policy.arpeggioChaos,
      seed: input.request.seed,
      attack,
      candidates: domain,
      priorMidi: state.prior?.midi,
      key,
    })
    for (const candidateEntry of ordered) {
      if (budget.fuel === 0) {
        budget.limited = true
        return undefined
      }
      budget.fuel -= 1
      const result = advance(context, state, candidateEntry)
      if (result.kind === 'rejected') continue
      const phrase = visit(result.nextState, [
        ...assignments,
        { attack, candidate: candidateEntry },
      ])
      if (phrase || budget.limited) return phrase
    }
    budget.dead.add(stateKey)
    return undefined
  }
  const phrase = visit(initialPitchSearchState(context), [])
  const fuelUsed = input.policy.searchFuel - budget.fuel
  if (phrase) return deepFreeze({ kind: 'pitch_plan', phrase, fuelUsed })
  if (budget.limited) return deepFreeze({ kind: 'search_limit_exceeded', fuelUsed })
  return deepFreeze({ kind: 'no_legal_pitch_plan', fuelUsed })
}

// @test-link [[module_pitch_planner]]
// @test-link [[mechanic_pitch_search_policy]]
describe('pitch-search-equivalence: searchPitchPlan', () => {
  it('matches the be9128b reference search, including fuelUsed, over a spread of real inputs', () => {
    const inputs: BoundPitchPlannerInput[] = [
      fixtureInput({ seed: 1 }),
      fixtureInput({ seed: 19 }),
      fixtureInput({ seed: 31, figureLevels: JAZZ_FIGURE_LEVELS }),
      fixtureInput({ seed: 31, figureLevels: JAZZ_FIGURE_LEVELS, withAppoggiatura: true }),
      fixtureInput({ seed: 47, leapiness: 'Shaped' }),
      fixtureInput({ seed: 57, contour: 'Wandering' }),
      fixtureInput({ seed: 59, contour: 'Arch' }),
      fixtureInput({ seed: 61, arpeggioChaos: 'Chaotic' }),
      fixtureInput({ seed: 61, arpeggioChaos: 'Varied' }),
      fixtureInput({ seed: 77 }),
      fixtureInput({ seed: 101, arpeggioChaos: 'Chaotic', leapiness: 'Angular' }),
      // Small fuel values that must trigger `search_limit_exceeded` deterministically the same
      // way in both implementations.
      fixtureInput({ seed: 1, fuel: 3 }),
      fixtureInput({ seed: 19, fuel: 5 }),
      fixtureInput({ seed: 31, figureLevels: JAZZ_FIGURE_LEVELS, fuel: 10 }),
      fixtureInput({ seed: 47, leapiness: 'Shaped', fuel: 25 }),
      fixtureInput({ seed: 61, arpeggioChaos: 'Chaotic', fuel: 50 }),
    ]
    for (const input of inputs) {
      const reference = referenceSearchPitchPlan(input, pitchTieKey)
      const production = planPitchPhraseWithTieKeyFactory(input, pitchTieKey)
      expect(production).toEqual(reference)
      expect(production.fuelUsed).toBe(reference.fuelUsed)
      expect(production.kind).toBe(reference.kind)
    }
  })

  it('confirms search_limit_exceeded is actually exercised by at least one fixture', () => {
    const limited = planPitchPhraseWithTieKeyFactory(
      fixtureInput({ seed: 1, fuel: 3 }),
      pitchTieKey,
    )
    expect(limited.kind).toBe('search_limit_exceeded')
  })

  it('deep-freezes the production result, phrase, assignments array, and an assignment', () => {
    const input = fixtureInput({ seed: 19 })
    const result = planPitchPhraseWithTieKeyFactory(input, pitchTieKey)
    expect(Object.isFrozen(result)).toBe(true)
    expect(result.kind).toBe('pitch_plan')
    if (result.kind !== 'pitch_plan') throw new Error('fixture expected to find a pitch plan')
    expect(Object.isFrozen(result.phrase)).toBe(true)
    expect(Object.isFrozen(result.phrase.assignments)).toBe(true)
    expect(result.phrase.assignments.length).toBeGreaterThan(0)
    expect(Object.isFrozen(result.phrase.assignments[0])).toBe(true)
  })

  it('deep-freezes a search_limit_exceeded result too', () => {
    const result = searchPitchPlan(fixtureInput({ seed: 1, fuel: 3 }), pitchTieKey)
    expect(result.kind).toBe('search_limit_exceeded')
    expect(Object.isFrozen(result)).toBe(true)
  })
})
