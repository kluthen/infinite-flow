import type { ConcertPitch } from '../events/concert-pitch'
import { carriedPitchIsTense } from '../generation/carry-in/carry-in'
import { phraseEndingDebtAllowance } from '../generation/carry-in/phrase-ending-debt'
import { deepFreeze } from '../events/deep-freeze'
import {
  buildCandidateDomains,
  makeCandidateDomainMemo,
  makeFreeDomainStore,
  type CandidateDomainMemo,
  type FreeDomainStore,
} from './pitch-candidates'
import { compileContourPlan, type ContourPlan } from './pitch-contour'
import {
  collectionPitchClasses,
  harmonyEventIndexAt,
  harmonyIdentityAtTick,
  soundingSpans,
  type SoundingSpan,
} from './pitch-harmony'
import { LEAPINESS_LIMITS, reachBound } from './pitch-motion'
import type {
  BoundPitchPlannerInput,
  PitchAttack,
  PitchCandidate,
  PitchSearchContext,
} from './pitch-types'

/** One compiled contour plan beside the policy facts and checkpoint values it was compiled from. */
interface ContourPlanEntry {
  readonly contour: BoundPitchPlannerInput['policy']['contour']
  readonly leapiness: BoundPitchPlannerInput['policy']['leapiness']
  readonly checkpointDomains: readonly (readonly ConcertPitch[])[]
  readonly plan: ContourPlan
}

/**
 * What every harmony/rhythm pair searched under one request shares for one collection and
 * chromatic capability: the collection pitch classes, the store of free attacks' candidate
 * domains, and the phrase facts of each pair, by rhythm then harmony object.
 */
interface RequestFacts {
  readonly tonalCenter: BoundPitchPlannerInput['policy']['tonalCenter']
  readonly collectionName: BoundPitchPlannerInput['policy']['collection']
  readonly store: FreeDomainStore
  readonly phrases: WeakMap<object, WeakMap<object, PhraseFacts>>
}

/**
 * What every binding of one harmony/rhythm pair shares: the attacks, the collection pitch
 * classes, the memo of free attacks' candidate domains, and the contour plans compiled so far.
 */
interface PhraseFacts {
  readonly attacks: readonly PitchAttack[]
  readonly collection: readonly number[]
  readonly domains: CandidateDomainMemo
  readonly contourPlans: ContourPlanEntry[]
}

/**
 * Request facts by request object. Keys are frozen, so what they determine cannot change, and an
 * entry lives only as long as its request.
 */
const requestFactsByRequest = new WeakMap<object, RequestFacts>()

/**
 * The attack index of each bar's contour checkpoint: its first fresh attack on tick 0 or 8, or,
 * when that bar's anchors are only tie continuations, its first fresh attack at any tick. A bar
 * with no fresh attack has no checkpoint, which leaves the contour plan impossible.
 */
// @spec-link [[module_pitch_search_context]]
function checkpointIndices(spans: readonly SoundingSpan[]): ReadonlyMap<number, number> {
  const anchored = new Map<number, number>()
  const first = new Map<number, number>()
  spans.forEach((span, index) => {
    if (!first.has(span.barIndex)) first.set(span.barIndex, index)
    if ((span.startTick === 0 || span.startTick === 8) && !anchored.has(span.barIndex))
      anchored.set(span.barIndex, index)
  })
  return new Map([...first].map(([bar, index]) => [bar, anchored.get(bar) ?? index]))
}

/** Rebuild chronological sounding attacks with tie-inclusive spans and absolute-beat harmony. */
// @spec-link [[module_pitch_search_context]]
export function compileAttacks(input: BoundPitchPlannerInput): readonly PitchAttack[] {
  const spans = soundingSpans(input.rhythm)
  const harmonyIndices = spans.map((span) => harmonyEventIndexAt(input.harmony, span.start))
  const checkpointOf = checkpointIndices(spans)
  return deepFreeze(
    spans.map((span, index): PitchAttack => {
      const harmonyIndex = harmonyIndices[index]!
      return {
        attackIndex: index,
        identity: `${span.barIndex}:${span.startTick}`,
        barIndex: span.barIndex,
        startTick: span.startTick,
        durationTicks: span.end - span.start,
        start: span.start,
        end: span.end,
        chordPitchClasses: input.harmony.events[harmonyIndex]!.triad.pitchClasses,
        harmonyIndex,
        harmonyIdentity: harmonyIdentityAtTick(input.harmony, span.start),
        isCheckpoint: checkpointOf.get(span.barIndex) === index,
        isBeatOne: span.startTick === 0,
        isFirstUnderHarmonyChange: index === 0 || harmonyIndices[index - 1] !== harmonyIndex,
        isFinal: index === spans.length - 1,
      }
    }),
  )
}

/**
 * True when a chord tone on the final attack leaves the phrase open: a chord tone of a degree-5
 * harmony (tonal gentle/active), collection degree 5 (tonal static), or a non-tonic chord tone
 * (modal).
 */
// @spec-link [[module_pitch_search_context]]
export function isOpenEndpointMidi(
  input: BoundPitchPlannerInput,
  attack: PitchAttack,
  midi: number,
  collection: readonly number[],
): boolean {
  const pitchClass = ((midi % 12) + 12) % 12
  if (!attack.isFinal || !attack.chordPitchClasses.includes(pitchClass)) return false
  const endpoint = input.harmony.endpoint
  if (endpoint.kind === 'tonal_static_degree_five') return pitchClass === collection[4]
  if (endpoint.kind === 'modal_non_tonic_chord_tone') return pitchClass !== collection[0]
  return input.harmony.events[attack.harmonyIndex]!.triad.degree === endpoint.degree
}

/**
 * The carried pitch when it is a tense note: a pitch outside the carried final chord, which the
 * new phrase's first attack must resolve. A carry-in whose harmony was dropped owes no resolution.
 */
// @spec-link [[rule_key_change_drops_harmonic_carry_in]]
function carriedTenseMidi(input: BoundPitchPlannerInput): number | undefined {
  const carryIn = input.request.carryIn
  if (carryIn === undefined || !carriedPitchIsTense(carryIn)) return undefined
  return carryIn.lastPitch.midi
}

/** Distinct MIDI values of one candidate domain, in first-seen canonical order. */
function distinctMidis(domain: readonly PitchCandidate[]): readonly ConcertPitch[] {
  return [...new Set(domain.map((candidate) => candidate.midi))]
}

/** True when the request facts were compiled for this input's collection and capability. */
function requestFactsFit(facts: RequestFacts, input: BoundPitchPlannerInput): boolean {
  return (
    facts.tonalCenter === input.policy.tonalCenter &&
    facts.collectionName === input.policy.collection &&
    facts.store.allowsChromaticApproach === input.policy.capabilities.allowsChromaticApproach
  )
}

/** Compile the request facts of one input's request, collection and capability. */
function compileRequestFacts(input: BoundPitchPlannerInput): RequestFacts {
  return {
    tonalCenter: input.policy.tonalCenter,
    collectionName: input.policy.collection,
    store: makeFreeDomainStore(input, collectionPitchClasses(input.policy)),
    phrases: new WeakMap(),
  }
}

/** Compile the phrase facts of one input's harmony/rhythm pair on top of its request facts. */
function compilePhraseFacts(input: BoundPitchPlannerInput, store: FreeDomainStore): PhraseFacts {
  const attacks = compileAttacks(input)
  return {
    attacks,
    collection: store.collection,
    domains: makeCandidateDomainMemo(attacks, store),
    contourPlans: [],
  }
}

/**
 * The phrase facts for an input, reused across the bindings of one harmony/rhythm pair and, for
 * free attacks' domains, across every pair searched under one request: looked up by the frozen
 * request, rhythm and harmony objects, and compiled afresh (and kept) when missing or made for
 * another collection or capability. Unfrozen inputs never share.
 */
function phraseFactsFor(input: BoundPitchPlannerInput): PhraseFacts {
  const { harmony, rhythm, request } = input
  if (!Object.isFrozen(harmony) || !Object.isFrozen(rhythm) || !Object.isFrozen(request))
    return compilePhraseFacts(input, compileRequestFacts(input).store)
  let requestFacts = requestFactsByRequest.get(request)
  if (!requestFacts || !requestFactsFit(requestFacts, input)) {
    requestFacts = compileRequestFacts(input)
    requestFactsByRequest.set(request, requestFacts)
  }
  let byHarmony = requestFacts.phrases.get(rhythm)
  if (!byHarmony) requestFacts.phrases.set(rhythm, (byHarmony = new WeakMap()))
  const known = byHarmony.get(harmony)
  if (known) return known
  const phrase = compilePhraseFacts(input, requestFacts.store)
  byHarmony.set(harmony, phrase)
  return phrase
}

/** True when two number lists hold the same values in the same order. */
function sameNumbers(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index])
}

/**
 * The contour plan for these checkpoint values and final MIDI values, reused from the phrase facts
 * when one was compiled from equal values under the same contour and leapiness. The plan reads
 * nothing else, so a reused plan equals a fresh one.
 */
function sharedContourPlan(
  phrase: PhraseFacts,
  input: BoundPitchPlannerInput,
  checkpoints: readonly PitchAttack[],
  domains: readonly (readonly ConcertPitch[])[],
  finalMidis: readonly number[],
): ContourPlanEntry {
  const { contour, leapiness } = input.policy
  const known = phrase.contourPlans.find(
    (entry) =>
      entry.contour === contour &&
      entry.leapiness === leapiness &&
      sameNumbers(entry.plan.finalMidis, finalMidis) &&
      entry.checkpointDomains.length === domains.length &&
      entry.checkpointDomains.every((domain, index) => sameNumbers(domain, domains[index]!)),
  )
  if (known) return known
  const limits = LEAPINESS_LIMITS[leapiness]
  const plan = compileContourPlan({
    contour,
    checkpointAttackIndices: checkpoints.map((attack) => attack.attackIndex),
    domains,
    finalAttackIndex: phrase.attacks.at(-1)?.attackIndex ?? 0,
    finalMidis,
    reach: (intervals) => reachBound(limits, intervals, limits.leaps, limits.phraseRuns),
  })
  const entry = { contour, leapiness, checkpointDomains: domains, plan }
  phrase.contourPlans.push(entry)
  return entry
}

/**
 * Compile every static fact once: attacks, canonical candidate domains, checkpoint domains, the
 * MIDI values allowed on the final attack (open endpoints, and settleable tense endings when the
 * phrase may end owing), leapiness limits, the contour suffix table, what the final note may owe,
 * and a tense carried pitch the first attack must resolve. All search transitions read only this
 * immutable snapshot. What does not depend on the tension binding is shared with the other
 * bindings of the same harmony/rhythm pair, so each binding rebuilds only its own part.
 */
// @spec-link [[module_pitch_search_context]]
export function compilePitchSearchContext(input: BoundPitchPlannerInput): PitchSearchContext {
  const phrase = phraseFactsFor(input)
  const { attacks, collection } = phrase
  const candidateDomains = buildCandidateDomains(input, attacks, collection, phrase.domains)
  const checkpoints = attacks.filter((attack) => attack.isCheckpoint)
  const final = attacks.at(-1)
  const finalMidis = final
    ? distinctMidis(
        candidateDomains[final.attackIndex]!.filter(
          (candidate) =>
            (candidate.role === 'passing_or_neighbor' && candidate.reservation === undefined) ||
            isOpenEndpointMidi(input, final, candidate.midi, collection),
        ),
      )
    : []
  const { checkpointDomains, plan: contourPlan } = sharedContourPlan(
    phrase,
    input,
    checkpoints,
    checkpoints.map((attack) => distinctMidis(candidateDomains[attack.attackIndex]!)),
    finalMidis,
  )
  const tenseMidi = carriedTenseMidi(input)
  return deepFreeze({
    kind: 'pitch_search_context',
    input,
    attacks,
    candidateDomains,
    checkpointAttackIndices: contourPlan.checkpointAttackIndices,
    checkpointDomains,
    collectionPitchClasses: collection,
    limits: LEAPINESS_LIMITS[input.policy.leapiness],
    contourPlan,
    finalMidis: contourPlan.finalMidis,
    endingDebt: phraseEndingDebtAllowance(input.request.carryIn !== undefined),
    ...(tenseMidi === undefined ? {} : { carriedTenseMidi: tenseMidi }),
  })
}
