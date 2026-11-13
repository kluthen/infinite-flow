import { beforeAll, describe, expect, it } from 'vitest'
import {
  ARPEGGIO_CHAOS_VALUES,
  CONTOURS,
  HARMONIC_MOTIONS,
  LEAPINESS_VALUES,
  MUSICAL_PROFILES,
  NOTE_DENSITIES,
  SILENCE_DENSITIES,
  SYNCOPATIONS,
  TENSION_ARCS,
} from '@/domain/controls/generation-controls'
import {
  FOUR_FOUR_METER,
  makeGenerationRequest,
  makeRequestId,
} from '@/domain/generation/generation-request'
import { levelsForProfile } from '@/domain/figures/figure-levels'
import { makeHarmonyCandidateDomain } from '@/domain/harmony/harmony-planner'
import type { HarmonyCandidate } from '@/domain/harmony/harmony-types'
import { makeActiveConcertRange } from '@/domain/profile/active-concert-range'
import { makeRegisterWindow } from '@/domain/profile/register-window'
import { makeSeed } from '@/domain/random/seed'
import { makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'
import type { RhythmCandidate } from '@/domain/rhythm/rhythm-types'
import {
  makeBoundPitchPlannerInput,
  makePitchPolicy,
  makeTensionBindingDomain,
  pitchAttacks,
  planPitchPhrase,
} from '@/domain/pitch/pitch-planner'
import type { BoundPitchPlannerInput } from '@/domain/pitch/pitch-types'
import { validatePitchPhrase } from '@/domain/pitch/validation/pitch-phrase-validator'
import type { PitchValidationFailure } from '@/domain/pitch/validation/pitch-validation-types'
import { parseChordFamilies, type ChordFamilyLevel } from '@/domain/chords/chord-families'
import type { GenerationIntent } from '@/domain/generation/generation-intent'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { makeHarmonyCollection } from '@/domain/harmony/collection'
import { chordTones } from '@/domain/harmony/harmony-types'
import { validateGenerationResult } from '@/domain/validation/generation-result-validator'
import {
  attackMidis,
  buildIntent,
  carryInAfter,
  type SuccessOutcome,
} from '../../generation/carry-in/carry-in-fixture'
import { CONTROL_SETS } from '../../generation/carry-in/carry-in-matrix'

/** Bounded slice of each iterable a case draws from, keeping the whole matrix fast and finite. */
const CANDIDATE_SAMPLE_SIZE = 2
/**
 * A subset of the 9 named collections, matching the modes distinct from plain Major/Minor/Locrian
 * so the axis-cycling below (borrowed from the 256-case harness) stays representative without
 * paying for near-duplicate cases.
 */
const COLLECTIONS_UNDER_TEST = [
  'Major',
  'Dorian',
  'Minor',
  'Lydian',
  'Phrygian',
  'Mixolydian',
] as const
/**
 * 144 of the harness's full 256 cases (9 full cycles of the 16-case leapiness x contour cross).
 * 256 cases took ~35s wall time in local measurement, well past the ~20s budget; 160+ cases
 * measured 18.5-25s with enough run-to-run jitter to occasionally miss the budget, while 144
 * consistently measured ~16s. 144 is the largest multiple of 16 that reliably fits.
 */
const CASE_COUNT = 144

interface CaseSpec {
  readonly caseIndex: number
  readonly leapiness: (typeof LEAPINESS_VALUES)[number]
  readonly contour: (typeof CONTOURS)[number]
  readonly profile: (typeof MUSICAL_PROFILES)[number]
  readonly collection: (typeof COLLECTIONS_UNDER_TEST)[number]
  readonly tensionArc: (typeof TENSION_ARCS)[number]
  readonly harmonicMotion: (typeof HARMONIC_MOTIONS)[number]
  readonly noteDensity: (typeof NOTE_DENSITIES)[number]
  readonly syncopation: (typeof SYNCOPATIONS)[number]
  readonly silenceDensity: (typeof SILENCE_DENSITIES)[number]
  readonly arpeggioChaos: (typeof ARPEGGIO_CHAOS_VALUES)[number]
  readonly seed: number
}

/**
 * A deterministic covering matrix cycling leapiness x contour x profile x collection x tension
 * arc x harmonic motion x note density x syncopation x silence density x arpeggio chaos x seed,
 * each axis at a different stride so every named control value appears repeatedly across the run
 * without paying for the full cross product. Mirrors the axis-cycling formulas of the 256-case
 * harness preserved at .pitch-matrix-harness.spec.ts.txt, truncated to the first CASE_COUNT cases.
 */
function buildCases(): readonly CaseSpec[] {
  return Array.from({ length: CASE_COUNT }, (_, caseIndex) => ({
    caseIndex,
    leapiness: LEAPINESS_VALUES[caseIndex % LEAPINESS_VALUES.length]!,
    contour: CONTOURS[Math.floor(caseIndex / 4) % CONTOURS.length]!,
    profile: MUSICAL_PROFILES[Math.floor(caseIndex / 16) % MUSICAL_PROFILES.length]!,
    collection: COLLECTIONS_UNDER_TEST[caseIndex % COLLECTIONS_UNDER_TEST.length]!,
    tensionArc: TENSION_ARCS[(caseIndex + Math.floor(caseIndex / 16)) % TENSION_ARCS.length]!,
    harmonicMotion: HARMONIC_MOTIONS[caseIndex % HARMONIC_MOTIONS.length]!,
    noteDensity: NOTE_DENSITIES[(caseIndex + Math.floor(caseIndex / 4)) % NOTE_DENSITIES.length]!,
    syncopation: SYNCOPATIONS[Math.floor(caseIndex / 3) % SYNCOPATIONS.length]!,
    silenceDensity: SILENCE_DENSITIES[Math.floor(caseIndex / 5) % SILENCE_DENSITIES.length]!,
    arpeggioChaos: ARPEGGIO_CHAOS_VALUES[Math.floor(caseIndex / 2) % ARPEGGIO_CHAOS_VALUES.length]!,
    seed: 1 + (caseIndex % 3),
  }))
}

/** One-line human-readable rendering of every control value driving a case, for failure output. */
function describeCase(spec: CaseSpec): string {
  return (
    `case=${spec.caseIndex} leapiness=${spec.leapiness} contour=${spec.contour} ` +
    `profile=${spec.profile} collection=${spec.collection} tensionArc=${spec.tensionArc} ` +
    `harmonicMotion=${spec.harmonicMotion} noteDensity=${spec.noteDensity} ` +
    `syncopation=${spec.syncopation} silenceDensity=${spec.silenceDensity} ` +
    `arpeggioChaos=${spec.arpeggioChaos} seed=${spec.seed}`
  )
}

/** First N items pulled off a rhythm candidate generator, matching the fixture's own conventions. */
function takeRhythmCandidates(
  domain: readonly RhythmCandidate[] | (() => IterableIterator<RhythmCandidate>),
): readonly RhythmCandidate[] {
  const iterator = typeof domain === 'function' ? domain() : domain[Symbol.iterator]()
  const taken: RhythmCandidate[] = []
  for (let index = 0; index < CANDIDATE_SAMPLE_SIZE; index += 1) {
    const next = iterator.next()
    if (next.done) break
    taken.push(next.value)
  }
  return taken
}

interface FailingValidation {
  readonly description: string
  readonly midis: readonly number[]
  readonly failures: readonly PitchValidationFailure[]
}

interface FailingSearchLimit {
  readonly description: string
  readonly fuelUsed: number
}

interface MatrixOutcome {
  readonly leapiness: CaseSpec['leapiness']
  readonly planned: number
  readonly noLegalPitchPlan: number
  readonly searchLimitExceeded: number
  readonly attempts: number
  readonly maxFuelUsed: number
  readonly failingValidations: readonly FailingValidation[]
  readonly failingSearchLimits: readonly FailingSearchLimit[]
  readonly missingCheckpoints: readonly string[]
  readonly noLegalPlans: readonly string[]
}

/** An all-zero outcome for a case that could not even build a harmony or rhythm domain. */
function emptyOutcome(leapiness: CaseSpec['leapiness']): MatrixOutcome {
  return {
    leapiness,
    planned: 0,
    noLegalPitchPlan: 0,
    searchLimitExceeded: 0,
    attempts: 0,
    maxFuelUsed: 0,
    failingValidations: [],
    failingSearchLimits: [],
    missingCheckpoints: [],
    noLegalPlans: [],
  }
}

/** Build every bound input reachable from one case's control values and validate each plan. */
function runCase(spec: CaseSpec): MatrixOutcome {
  let planned = 0
  let noLegalPitchPlan = 0
  let searchLimitExceeded = 0
  let attempts = 0
  let maxFuelUsed = 0
  const failingValidations: FailingValidation[] = []
  const failingSearchLimits: FailingSearchLimit[] = []
  const missingCheckpoints: string[] = []
  const noLegalPlans: string[] = []

  const harmonyResult = makeHarmonyCandidateDomain({
    tonalCenter: 'C',
    collection: spec.collection,
    harmonicMotion: spec.harmonicMotion,
    tensionArc: spec.tensionArc,
  })
  if (harmonyResult.kind !== 'harmony_candidate_domain') return emptyOutcome(spec.leapiness)

  const rhythmResult = makeRhythmCandidateDomain({
    noteDensity: spec.noteDensity,
    rhythmicVariety: 'Slightly varied',
    silenceDensity: spec.silenceDensity,
    syncopation: spec.syncopation,
    tensionArc: spec.tensionArc,
  })
  if (rhythmResult.kind !== 'rhythm_candidate_domain') return emptyOutcome(spec.leapiness)

  const request = makeGenerationRequest({
    requestId: makeRequestId(`property/${spec.caseIndex}`),
    seed: makeSeed(spec.seed),
    measureCount: 4,
    meter: FOUR_FOUR_METER,
    activeConcertRange: makeActiveConcertRange(48, 72),
    register: 'Middle',
    registerWindow: makeRegisterWindow(48, 72),
  })

  const harmonyCandidates: readonly HarmonyCandidate[] = harmonyResult.candidates.slice(
    0,
    CANDIDATE_SAMPLE_SIZE,
  )
  const rhythmCandidates = takeRhythmCandidates(rhythmResult.candidates)

  for (const harmony of harmonyCandidates) {
    for (const rhythm of rhythmCandidates) {
      const bindingResult = makeTensionBindingDomain(harmony, rhythm)
      if (bindingResult.kind !== 'tension_binding_domain') continue

      for (const tensionBinding of bindingResult.bindings.slice(0, CANDIDATE_SAMPLE_SIZE)) {
        const policy = makePitchPolicy({
          figureLevels: levelsForProfile(spec.profile),
          collection: spec.collection,
          tonalCenter: 'C',
          contour: spec.contour,
          leapiness: spec.leapiness,
          arpeggioChaos: spec.arpeggioChaos,
        })
        const boundInput: BoundPitchPlannerInput = makeBoundPitchPlannerInput({
          request,
          policy,
          harmony,
          rhythm,
          tensionBinding,
        })

        attempts += 1
        const checkpointBars = new Set(
          pitchAttacks(boundInput)
            .filter((attack) => attack.isCheckpoint)
            .map((attack) => attack.barIndex),
        )
        if (checkpointBars.size !== 4)
          missingCheckpoints.push(`${describeCase(spec)} checkpointBars=[${[...checkpointBars]}]`)
        const result = planPitchPhrase(boundInput)
        maxFuelUsed = Math.max(maxFuelUsed, result.fuelUsed)
        if (result.kind === 'no_legal_pitch_plan') {
          noLegalPitchPlan += 1
          noLegalPlans.push(describeCase(spec))
          continue
        }
        if (result.kind === 'search_limit_exceeded') {
          searchLimitExceeded += 1
          failingSearchLimits.push({
            description: `${describeCase(spec)} fuelUsed=${result.fuelUsed}`,
            fuelUsed: result.fuelUsed,
          })
          continue
        }
        planned += 1
        const validation = validatePitchPhrase(boundInput, result.phrase)
        if (validation.kind === 'valid_pitch_phrase') continue
        failingValidations.push({
          description: describeCase(spec),
          midis: result.phrase.assignments.map((assignment) => assignment.candidate.midi),
          failures: validation.failures,
        })
      }
    }
  }

  return {
    leapiness: spec.leapiness,
    planned,
    noLegalPitchPlan,
    searchLimitExceeded,
    attempts,
    maxFuelUsed,
    failingValidations,
    failingSearchLimits,
    missingCheckpoints,
    noLegalPlans,
  }
}

/** Render one validation failure as `code` or `code@attackIndex` when it names an attack. */
function formatFailure(failure: PitchValidationFailure): string {
  return failure.attackIndex === undefined ? failure.code : `${failure.code}@${failure.attackIndex}`
}

/** Per-leapiness plan / no_legal_pitch_plan / search_limit_exceeded totals plus the grand total. */
function summarizeCounts(outcomes: readonly MatrixOutcome[]): string {
  const perLeapiness = new Map<
    string,
    { planned: number; noLegalPitchPlan: number; searchLimitExceeded: number }
  >()
  let maxFuelUsed = 0
  for (const outcome of outcomes) {
    const bucket = perLeapiness.get(outcome.leapiness) ?? {
      planned: 0,
      noLegalPitchPlan: 0,
      searchLimitExceeded: 0,
    }
    bucket.planned += outcome.planned
    bucket.noLegalPitchPlan += outcome.noLegalPitchPlan
    bucket.searchLimitExceeded += outcome.searchLimitExceeded
    perLeapiness.set(outcome.leapiness, bucket)
    maxFuelUsed = Math.max(maxFuelUsed, outcome.maxFuelUsed)
  }
  const attempts = outcomes.reduce((sum, outcome) => sum + outcome.attempts, 0)
  const planned = outcomes.reduce((sum, outcome) => sum + outcome.planned, 0)
  const noLegalPitchPlan = outcomes.reduce((sum, outcome) => sum + outcome.noLegalPitchPlan, 0)
  const searchLimitExceeded = outcomes.reduce(
    (sum, outcome) => sum + outcome.searchLimitExceeded,
    0,
  )
  const perLeapinessLines = [...perLeapiness.entries()].map(
    ([leapiness, counts]) =>
      `  ${leapiness}: plan=${counts.planned}, no_legal_pitch_plan=${counts.noLegalPitchPlan}, ` +
      `search_limit_exceeded=${counts.searchLimitExceeded}`,
  )
  const noLegalLines = outcomes
    .flatMap((outcome) => outcome.noLegalPlans)
    .slice(0, 10)
    .map((description) => `\n  no_legal_pitch_plan: ${description}`)
  return (
    `Overall (of ${attempts} planner attempts): plan=${planned}, ` +
    `no_legal_pitch_plan=${noLegalPitchPlan}, search_limit_exceeded=${searchLimitExceeded}, ` +
    `maxFuelUsed=${maxFuelUsed}\n` +
    `Per leapiness:\n${perLeapinessLines.join('\n')}${noLegalLines.join('')}`
  )
}

/** Failure message for the independent-validation assertion: histogram, examples, then counts. */
function summarizeValidationFailures(outcomes: readonly MatrixOutcome[]): string {
  const failingValidations = outcomes.flatMap((outcome) => outcome.failingValidations)

  const histogram = new Map<string, number>()
  for (const failingCase of failingValidations)
    for (const failure of failingCase.failures)
      histogram.set(failure.code, (histogram.get(failure.code) ?? 0) + 1)
  const histogramLines = [...histogram.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([code, count]) => `  ${code}: ${count}`)

  const examples = failingValidations.slice(0, 10).map((failingCase, index) => {
    const failureList = failingCase.failures.map(formatFailure).join(', ')
    return (
      `  [${index + 1}] ${failingCase.description}\n` +
      `      midis: [${failingCase.midis.join(', ')}]\n` +
      `      failures: ${failureList}`
    )
  })

  return (
    `${failingValidations.length} planned phrase(s) failed independent validation.\n` +
    `Failure code histogram:\n${histogramLines.join('\n')}\n` +
    `First ${examples.length} failing example(s):\n${examples.join('\n')}\n` +
    summarizeCounts(outcomes)
  )
}

/** Failure message for the search-fuel assertion: every offending case, then the count summary. */
function summarizeSearchLimitFailures(outcomes: readonly MatrixOutcome[]): string {
  const failingSearchLimits = outcomes.flatMap((outcome) => outcome.failingSearchLimits)
  const lines = failingSearchLimits.map(
    (failingCase, index) => `  [${index + 1}] ${failingCase.description}`,
  )
  return (
    `${failingSearchLimits.length} attempt(s) hit search_limit_exceeded at the default fuel.\n` +
    `Offending case(s):\n${lines.join('\n')}\n` +
    summarizeCounts(outcomes)
  )
}

/** Failure message for the sanity assertion: which leapiness level(s) produced zero plans. */
function summarizeStarvedLeapiness(outcomes: readonly MatrixOutcome[]): string {
  const perLeapinessPlanned = new Map<string, number>()
  for (const outcome of outcomes)
    perLeapinessPlanned.set(
      outcome.leapiness,
      (perLeapinessPlanned.get(outcome.leapiness) ?? 0) + outcome.planned,
    )
  const starved = LEAPINESS_VALUES.filter((leapiness) => !perLeapinessPlanned.get(leapiness))
  return (
    `Leapiness level(s) with zero planned phrases: ${starved.join(', ') || 'none'}.\n` +
    summarizeCounts(outcomes)
  )
}

// @test-link [[module_pitch_domain_validation]]
describe('property: every planned phrase passes independent validation', () => {
  let outcomes: readonly MatrixOutcome[]

  beforeAll(() => {
    outcomes = buildCases().map(runCase)
  }, 30000)

  it(
    'holds across a representative matrix of leapiness, contour, profile, collection, ' +
      'tension arc, harmonic motion, note density, syncopation, silence density, ' +
      'arpeggio chaos, and seed',
    () => {
      const failingValidations = outcomes.flatMap((outcome) => outcome.failingValidations)
      expect(failingValidations, summarizeValidationFailures(outcomes)).toEqual([])
    },
  )

  // @test-link [[mechanic_pitch_search_policy]]
  it('never hits search_limit_exceeded at the default fuel across the matrix', () => {
    const failingSearchLimits = outcomes.flatMap((outcome) => outcome.failingSearchLimits)
    expect(failingSearchLimits, summarizeSearchLimitFailures(outcomes)).toEqual([])
  })

  // @test-link [[module_pitch_search_inspection]]
  it('gives every bar of every attempted phrase a contour checkpoint (no rhythm exemption)', () => {
    const missing = outcomes.flatMap((outcome) => outcome.missingCheckpoints)
    expect(missing, `${missing.slice(0, 10).join('\n')}\n${summarizeCounts(outcomes)}`).toEqual([])
  })

  it('produces at least one plan for every leapiness level', () => {
    const starved = LEAPINESS_VALUES.filter(
      (leapiness) =>
        !outcomes.some((outcome) => outcome.leapiness === leapiness && outcome.planned > 0),
    )
    expect(starved, summarizeStarvedLeapiness(outcomes)).toEqual([])
  })
})

/** The levels above Off the search-and-validator property runs at. */
const LEVELS_ABOVE_OFF: readonly ChordFamilyLevel[] = ['sometimes', 'favored', 'stronglyFavored']
/** The session seeds of the property's chains, added to until a joined phrase ends on a seventh. */
const CHAIN_SEEDS = [7, 13, 21] as const
/** The phrases of one chain: phrase 1 without carry-in, then each with the one before's. */
const CHAIN_LENGTH = 4

/** What the property found over every chain; the counters grow as the chains run. */
interface LevelPropertyOutcome {
  phrases: number
  joined: number
  seventhTenseEndings: number
  readonly failedGenerations: string[]
  readonly invalid: string[]
  readonly offTheChord: string[]
}

/** The phrase before in a chain, whose carry-in the next phrase receives. */
interface ChainLink {
  readonly intent: GenerationIntent
  readonly outcome: SuccessOutcome
  readonly number: number
}

/** Intent: one phrase of a chain: a control set's controls in the Middle register, at a level. */
function chainIntent(
  set: (typeof CONTROL_SETS)[number],
  level: ChordFamilyLevel,
  seed: number,
  previous: ChainLink | undefined,
): GenerationIntent {
  return buildIntent({
    controls: { ...set.controls, register: 'Middle' },
    musicalProfile: set.musicalProfile,
    seed,
    label: `level-property-${level}`,
    chordFamilies: parseChordFamilies({ 'seventh-chords': level }),
    ...(previous === undefined
      ? {}
      : { carryIn: carryInAfter(previous.intent, previous.outcome, previous.number) }),
  })
}

/** Intent: true when the phrase's final attack is its final chord's seventh. */
function endsOnSeventh(outcome: SuccessOutcome): boolean {
  const final = outcome.provenance.harmony.events.at(-1)!
  const lastAttack = attackMidis(outcome.result.timeline.measures).at(-1)!
  return final.seventh !== undefined && lastAttack % 12 === final.seventh.pitchClass
}

/** Intent: the chords of a phrase that are neither the triad nor the seventh chord on their degree. */
function chordsOffTheirDegree(
  intent: GenerationIntent,
  outcome: SuccessOutcome,
): readonly string[] {
  const collection = makeHarmonyCollection(intent.controls.tonalCenter, intent.controls.collection)
  return outcome.provenance.harmony.events.flatMap((event, index) => {
    const degree = event.triad.degree
    const seventhChord = collection.seventhChords[degree - 1]!
    const expected =
      event.seventh === undefined
        ? collection.triads[degree - 1]!.pitchClasses
        : seventhChord.pitchClasses
    const sameQuality =
      event.seventh === undefined || event.seventh.quality === seventhChord.quality
    return JSON.stringify(chordTones(event)) === JSON.stringify(expected) && sameQuality
      ? []
      : [`${intent.requestId} event ${index}`]
  })
}

/** Intent: record one generated phrase of a chain, validated independently; false when it failed. */
function recordPhrase(
  found: LevelPropertyOutcome,
  intent: GenerationIntent,
  outcome: ReturnType<typeof generatePhrase>,
  where: string,
): outcome is SuccessOutcome {
  if (outcome.kind !== 'generation_success') {
    found.failedGenerations.push(`${where}: ${outcome.code}`)
    return false
  }
  found.phrases += 1
  const verdict = validateGenerationResult({
    intent,
    request: outcome.request,
    result: outcome.result,
    provenance: outcome.provenance,
  })
  if (verdict.kind === 'invalid_generation_result')
    found.invalid.push(`${where}: ${verdict.failures.map((failure) => failure.code).join(',')}`)
  found.offTheChord.push(...chordsOffTheirDegree(intent, outcome))
  if (intent.carryIn !== undefined) {
    found.joined += 1
    if (endsOnSeventh(outcome)) found.seventhTenseEndings += 1
  }
  return true
}

/** Intent: run one session chain at one level, each phrase joined to the one before. */
function runChain(
  found: LevelPropertyOutcome,
  set: (typeof CONTROL_SETS)[number],
  level: ChordFamilyLevel,
  seed: number,
): void {
  let previous: ChainLink | undefined
  for (let number = 1; number <= CHAIN_LENGTH; number += 1) {
    const intent = chainIntent(set, level, seed + 1000 * (number - 1), previous)
    const outcome = generatePhrase(intent)
    if (!recordPhrase(found, intent, outcome, `${level} ${set.name} seed ${seed} phrase ${number}`))
      return
    previous = { intent, outcome, number }
  }
}

/** Intent: run every chain at every level above Off, validating each phrase independently. */
function runLevelChains(): LevelPropertyOutcome {
  const found: LevelPropertyOutcome = {
    phrases: 0,
    joined: 0,
    seventhTenseEndings: 0,
    failedGenerations: [],
    invalid: [],
    offTheChord: [],
  }
  for (const level of LEVELS_ABOVE_OFF)
    for (const set of CONTROL_SETS)
      for (const seed of CHAIN_SEEDS) runChain(found, set, level, seed)
  return found
}

// @test-link [[service_generation_result_validation]]
// @test-link [[rule_seventh_chords_diatonic_only]]
describe('property: every phrase searched above Off passes the result validator, joins included', () => {
  let outcome: LevelPropertyOutcome

  beforeAll(() => {
    outcome = runLevelChains()
    console.log(
      `LEVEL-PROPERTY phrases=${outcome.phrases} joined=${outcome.joined} ` +
        `seventhTenseEndings=${outcome.seventhTenseEndings} failed=${outcome.failedGenerations.length}`,
    )
  }, 120_000)

  it('validates every phrase generated at each level, with and without a carry-in', () => {
    expect(outcome.invalid).toEqual([])
    expect(
      outcome.failedGenerations.filter((failure) => failure.endsWith('result_validation_failed')),
    ).toEqual([])
    expect(outcome.joined).toBeGreaterThan(0)
  })

  it('makes every chord a triad or the seventh chord on its degree', () => {
    expect(outcome.offTheChord).toEqual([])
  })

  it("searches joined phrases that end on their final chord's seventh as a tense note", () => {
    expect(outcome.seventhTenseEndings).toBeGreaterThan(0)
  })
})
