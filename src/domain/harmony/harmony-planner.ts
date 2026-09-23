import {
  COLLECTIONS,
  HARMONIC_MOTIONS,
  MUSICAL_PROFILES,
  PITCH_CLASSES,
  TENSION_ARCS,
} from '../controls/generation-controls'
import { deepFreeze } from '../events/deep-freeze'
import { makeHarmonyCollection } from './collection'
import type {
  AbstractTensionRequirement,
  BarRole,
  CollectionDegree,
  HarmonyCandidate,
  HarmonyEndpoint,
  HarmonyEvent,
  HarmonyPlanResult,
  HarmonyPlannerInput,
  HarmonyRole,
  NoLegalHarmonyPlan,
} from './harmony-types'
import { HarmonyPlannerInputError } from './harmony-types'

export { HarmonyPlannerInputError } from './harmony-types'
export type {
  HarmonyCandidateDomain,
  HarmonyPlannerInput,
  NoLegalHarmonyPlan,
} from './harmony-types'

type BarIndex = 0 | 1 | 2 | 3

interface ChordSlot {
  readonly degree: CollectionDegree
  readonly role: HarmonyRole
}

type BarPlan = readonly ChordSlot[]

const TONIC: ChordSlot = { degree: 1, role: 'tonic' }
const OPEN_ARRIVAL: ChordSlot = { degree: 5, role: 'open_arrival' }

function tonalRole(degree: CollectionDegree): HarmonyRole {
  if (degree === 1) return 'tonic'
  if (degree === 3 || degree === 6) return 'tonic_prolongation'
  if (degree === 2 || degree === 4) return 'predominant'
  return 'open_arrival'
}

function tonalSlot(degree: CollectionDegree): ChordSlot {
  return { degree, role: tonalRole(degree) }
}

function modalColorSlot(degree: CollectionDegree): ChordSlot {
  return { degree, role: 'modal_color' }
}

function validateInput(input: HarmonyPlannerInput): HarmonyPlannerInput {
  if (!PITCH_CLASSES.includes(input.tonalCenter)) {
    throw new HarmonyPlannerInputError(
      `Unsupported tonal center ${JSON.stringify(input.tonalCenter)}.`,
    )
  }
  if (!COLLECTIONS.includes(input.collection)) {
    throw new HarmonyPlannerInputError(
      `Unsupported collection ${JSON.stringify(input.collection)}.`,
    )
  }
  if (!HARMONIC_MOTIONS.includes(input.harmonicMotion)) {
    throw new HarmonyPlannerInputError(
      `Unsupported harmonic motion ${JSON.stringify(input.harmonicMotion)}.`,
    )
  }
  if (!TENSION_ARCS.includes(input.tensionArc)) {
    throw new HarmonyPlannerInputError(
      `Unsupported tension arc ${JSON.stringify(input.tensionArc)}.`,
    )
  }
  if (!MUSICAL_PROFILES.includes(input.profile)) {
    throw new HarmonyPlannerInputError(
      `Unsupported musical profile ${JSON.stringify(input.profile)}.`,
    )
  }
  return deepFreeze({ ...input })
}

function tensionRequirement(arc: HarmonyPlannerInput['tensionArc']): AbstractTensionRequirement {
  const common = {
    mustResolveBeforeFinalSoundingEvent: true as const,
    maximumFigureCount: 1 as const,
  }
  switch (arc) {
    case 'Settled':
      return deepFreeze({
        ...common,
        arc,
        allowedBars: [0, 1, 2] as const,
        maximumResolutionDelay: 'next_strong_sounding_onset' as const,
        permittedFigureKinds: ['diatonic_passing_or_neighbor', 'appoggiatura'] as const,
        requiredFigureCount: 0 as const,
        resolutionPreference: 'ordinary' as const,
      })
    case 'Lift':
      return deepFreeze({
        ...common,
        arc,
        allowedBars: [1, 2] as const,
        maximumResolutionDelay: 'next_beat_or_bar' as const,
        permittedFigureKinds: ['diatonic_passing_or_neighbor', 'appoggiatura'] as const,
        requiredFigureCount: 0 as const,
        resolutionPreference: 'ordinary' as const,
      })
    case 'Build':
      return deepFreeze({
        ...common,
        arc,
        allowedBars: [1, 2] as const,
        maximumResolutionDelay: 'next_beat_or_bar' as const,
        permittedFigureKinds: ['two_note_diatonic_approach'] as const,
        requiredFigureCount: 1 as const,
        resolutionPreference: 'ordinary' as const,
      })
    case 'Edge':
      return deepFreeze({
        ...common,
        arc,
        allowedBars: [2] as const,
        maximumResolutionDelay: 'next_beat_or_bar' as const,
        permittedFigureKinds: ['diatonic_passing_or_neighbor', 'appoggiatura'] as const,
        requiredFigureCount: 1 as const,
        resolutionPreference: 'latest_legal_before_final' as const,
      })
  }
}

function tonalPlans(
  motion: HarmonyPlannerInput['harmonicMotion'],
): readonly { id: string; bars: readonly BarPlan[] }[] {
  if (motion === 'Static')
    return [{ id: 'tonal-static-1', bars: [[TONIC], [TONIC], [TONIC], [TONIC]] }]
  if (motion === 'Gentle diatonic') {
    return [
      ...[2, 4].map((degree) => ({
        id: 'tonal-gentle-1',
        bars: [[TONIC], [TONIC], [tonalSlot(degree as CollectionDegree)], [OPEN_ARRIVAL]],
      })),
      ...[3, 6].map((degree) => ({
        id: 'tonal-gentle-2',
        bars: [[TONIC], [tonalSlot(degree as CollectionDegree)], [TONIC], [OPEN_ARRIVAL]],
      })),
      ...[3, 6].flatMap((middle) =>
        [2, 4].map((late) => ({
          id: 'tonal-gentle-3',
          bars: [
            [TONIC],
            [tonalSlot(middle as CollectionDegree)],
            [tonalSlot(late as CollectionDegree)],
            [OPEN_ARRIVAL],
          ],
        })),
      ),
    ]
  }
  return [
    ...[3, 6].flatMap((middle) =>
      [2, 4].map((late) => ({
        id: 'tonal-active-1',
        bars: [
          [TONIC],
          [tonalSlot(middle as CollectionDegree)],
          [tonalSlot(late as CollectionDegree)],
          [OPEN_ARRIVAL],
        ],
      })),
    ),
    ...[2, 4].map((degree) => ({
      id: 'tonal-active-2',
      bars: [[TONIC], [tonalSlot(degree as CollectionDegree)], [OPEN_ARRIVAL], [OPEN_ARRIVAL]],
    })),
    ...[3, 6].flatMap((middle) =>
      [2, 4].flatMap((late) => [
        {
          id: 'tonal-active-3-unsplit',
          bars: [
            [TONIC],
            [tonalSlot(middle as CollectionDegree)],
            [tonalSlot(late as CollectionDegree)],
            [OPEN_ARRIVAL],
          ],
        },
        {
          id: 'tonal-active-3-split',
          bars: [
            [TONIC],
            [tonalSlot(middle as CollectionDegree)],
            [tonalSlot(late as CollectionDegree), OPEN_ARRIVAL],
            [OPEN_ARRIVAL],
          ],
        },
      ]),
    ),
    ...[3, 6].flatMap((middle) =>
      [2, 4].flatMap((late) => [
        {
          id: 'tonal-active-4-unsplit',
          bars: [
            [TONIC],
            [tonalSlot(middle as CollectionDegree)],
            [tonalSlot(late as CollectionDegree)],
            [OPEN_ARRIVAL],
          ],
        },
        {
          id: 'tonal-active-4-split',
          bars: [
            [TONIC],
            [tonalSlot(middle as CollectionDegree), tonalSlot(late as CollectionDegree)],
            [OPEN_ARRIVAL],
            [OPEN_ARRIVAL],
          ],
        },
      ]),
    ),
  ]
}

function modalPlans(
  input: HarmonyPlannerInput,
): readonly { id: string; bars: readonly BarPlan[] }[] {
  const collection = makeHarmonyCollection(input.tonalCenter, input.collection)
  const colorDegrees: Record<
    Exclude<HarmonyPlannerInput['collection'], 'Major' | 'Minor'>,
    CollectionDegree
  > = {
    Ionian: 4,
    Dorian: 6,
    Phrygian: 2,
    Lydian: 4,
    Mixolydian: 7,
    Aeolian: 6,
    Locrian: 5,
  }
  const colorPitchClass =
    collection.pitchClasses[
      colorDegrees[
        input.collection as Exclude<HarmonyPlannerInput['collection'], 'Major' | 'Minor'>
      ] - 1
    ]!
  const colors = collection.triads
    .filter((triad) => triad.degree !== 1 && triad.pitchClasses.includes(colorPitchClass))
    .map((triad) => modalColorSlot(triad.degree))
  if (input.harmonicMotion === 'Static')
    return [{ id: 'modal-static-1', bars: [[TONIC], [TONIC], [TONIC], [TONIC]] }]
  if (input.harmonicMotion === 'Gentle diatonic') {
    return [
      ...colors.map((color) => ({
        id: 'modal-gentle-1',
        bars: [[TONIC], [TONIC], [color], [TONIC]],
      })),
      ...colors.map((color) => ({
        id: 'modal-gentle-2',
        bars: [[TONIC], [color], [TONIC], [TONIC]],
      })),
    ]
  }
  const pairs = colors.flatMap((first) =>
    colors.filter((second) => second.degree !== first.degree).map((second) => ({ first, second })),
  )
  return [
    ...pairs.map(({ first, second }) => ({
      id: 'modal-active-1',
      bars: [[TONIC], [first], [second], [TONIC]],
    })),
    ...pairs.flatMap(({ first, second }) => [
      { id: 'modal-active-2-unsplit', bars: [[TONIC], [first], [second], [TONIC]] },
      { id: 'modal-active-2-split', bars: [[TONIC], [first], [second, first], [TONIC]] },
    ]),
    ...pairs.flatMap(({ first, second }) => [
      { id: 'modal-active-3-unsplit', bars: [[TONIC], [first], [second], [TONIC]] },
      { id: 'modal-active-3-split', bars: [[TONIC], [first, second], [first], [TONIC]] },
    ]),
  ]
}

function endpoint(input: HarmonyPlannerInput): HarmonyEndpoint {
  if (input.collection !== 'Major' && input.collection !== 'Minor')
    return { kind: 'modal_non_tonic_chord_tone', degree: 5 }
  return input.harmonicMotion === 'Static'
    ? { kind: 'tonal_static_degree_five', degree: 5 }
    : { kind: 'tonal_degree_five_chord_tone', degree: 5 }
}

function serializeEvents(
  templateId: string,
  bars: readonly BarPlan[],
  input: HarmonyPlannerInput,
): readonly HarmonyEvent[] {
  const collection = makeHarmonyCollection(input.tonalCenter, input.collection)
  const events: HarmonyEvent[] = []
  for (const [barNumber, bar] of bars.entries()) {
    const barIndex = barNumber as BarIndex
    for (const [slotIndex, slot] of bar.entries()) {
      const startBeat = (slotIndex * 2) as 0 | 2
      const barRole: BarRole = { barIndex, role: slot.role, degree: slot.degree }
      const previous = events.at(-1)
      if (
        previous?.triad.degree === slot.degree &&
        previous.durationBeats ===
          4 * barIndex + startBeat - (4 * previous.barIndex + previous.startBeat)
      ) {
        events[events.length - 1] = deepFreeze({
          ...previous,
          durationBeats: previous.durationBeats + (bar.length === 1 ? 4 : 2),
          barRoles: [...previous.barRoles, barRole],
        })
      } else {
        events.push(
          deepFreeze({
            barIndex,
            startBeat,
            durationBeats: bar.length === 1 ? 4 : 2,
            triad: collection.triads[slot.degree - 1]!,
            role: slot.role,
            templateId,
            barRoles: [barRole],
          }),
        )
      }
    }
  }
  return deepFreeze(events)
}

function makeCandidate(
  index: number,
  templateId: string,
  bars: readonly BarPlan[],
  input: HarmonyPlannerInput,
): HarmonyCandidate {
  const requirement = tensionRequirement(input.tensionArc)
  const degreeSequence = bars.flatMap((bar) => bar.map((slot) => slot.degree))
  const events = serializeEvents(templateId, bars, input)
  const identity = JSON.stringify({
    version: 'harmony-domain-v1',
    collection: input.collection,
    tonalCenter: input.tonalCenter,
    motion: input.harmonicMotion,
    templateId,
    degrees: degreeSequence,
    boundaries: events.map((event) => [event.barIndex, event.startBeat, event.durationBeats]),
    tensionRequirement: requirement,
  })
  return deepFreeze({
    candidateIndex: index,
    identity,
    templateId,
    degreeSequence,
    events,
    endpoint: endpoint(input),
    tensionRequirement: requirement,
  })
}

export function isNoLegalHarmonyPlan(
  result: HarmonyPlanResult | { readonly kind: string },
): result is NoLegalHarmonyPlan {
  return result.kind === 'no_legal_harmony_plan'
}

/** Expand the complete seed-free, rhythm-free structural harmony domain in policy order. */
// @spec-link [[module_harmony_candidate_domain]]
export function makeHarmonyCandidateDomain(input: HarmonyPlannerInput): HarmonyPlanResult {
  const normalized = validateInput(input)
  const plans =
    normalized.collection === 'Major' || normalized.collection === 'Minor'
      ? tonalPlans(normalized.harmonicMotion)
      : modalPlans(normalized)
  if (plans.length === 0) return deepFreeze({ kind: 'no_legal_harmony_plan', input: normalized })
  const candidates = plans.map((plan, index) =>
    makeCandidate(index, plan.id, plan.bars, normalized),
  )
  return deepFreeze({
    kind: 'harmony_candidate_domain',
    collection: makeHarmonyCollection(normalized.tonalCenter, normalized.collection),
    candidates,
  })
}
