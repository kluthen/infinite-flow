import type { ConcertPitch } from '../events/concert-pitch'
import { deepFreeze } from '../events/deep-freeze'
import { buildCandidateDomains } from './pitch-candidates'
import { compileContourPlan } from './pitch-contour'
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

/**
 * The attack index of each bar's contour checkpoint: its first fresh attack on tick 0 or 8, or,
 * when that bar's anchors are only tie continuations, its first fresh attack at any tick. A bar
 * with no fresh attack has no checkpoint, which leaves the contour plan impossible.
 */
// @spec-link [[module_pitch_planner]]
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
// @spec-link [[module_pitch_planner]]
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
// @spec-link [[module_pitch_planner]]
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

/** Distinct MIDI values of one candidate domain, in first-seen canonical order. */
function distinctMidis(domain: readonly PitchCandidate[]): readonly ConcertPitch[] {
  return [...new Set(domain.map((candidate) => candidate.midi))]
}

/**
 * Compile every static fact once: attacks, canonical candidate domains, checkpoint domains, the
 * open-endpoint MIDI values, leapiness limits, and the contour suffix table. All search
 * transitions read only this immutable snapshot.
 */
// @spec-link [[module_pitch_planner]]
export function compilePitchSearchContext(input: BoundPitchPlannerInput): PitchSearchContext {
  const attacks = compileAttacks(input)
  const collection = collectionPitchClasses(input.policy)
  const candidateDomains = buildCandidateDomains(input, attacks, collection)
  const checkpoints = attacks.filter((attack) => attack.isCheckpoint)
  const checkpointDomains = checkpoints.map((attack) =>
    distinctMidis(candidateDomains[attack.attackIndex]!),
  )
  const final = attacks.at(-1)
  const finalMidis = final
    ? distinctMidis(candidateDomains[final.attackIndex]!).filter((midi) =>
        isOpenEndpointMidi(input, final, midi, collection),
      )
    : []
  const limits = LEAPINESS_LIMITS[input.policy.leapiness]
  const contourPlan = compileContourPlan({
    contour: input.policy.contour,
    checkpointAttackIndices: checkpoints.map((attack) => attack.attackIndex),
    domains: checkpointDomains,
    finalAttackIndex: final?.attackIndex ?? 0,
    finalMidis,
    reach: (intervals) => reachBound(limits, intervals, limits.leaps, limits.phraseRuns),
  })
  return deepFreeze({
    kind: 'pitch_search_context',
    input,
    attacks,
    candidateDomains,
    checkpointAttackIndices: checkpoints.map((attack) => attack.attackIndex),
    checkpointDomains,
    collectionPitchClasses: collection,
    limits,
    contourPlan,
    finalMidis,
  })
}
