/**
 * Bound pitch-planner inputs over hand-built seventh-chord plans: a real harmony candidate of the
 * harmony planner with its events turned to seventh form (chunk 2's fixture builder), a real rhythm
 * candidate, and the request and policy the pitch tests share. No planner offers a seventh chord
 * yet, so these plans are reachable only from tests.
 */

import type {
  ArpeggioChaos,
  Collection,
  HarmonicMotion,
  PitchClass,
  TensionArc,
} from '@/domain/controls/generation-controls'
import { NEUTRAL_FIGURE_LEVELS, type FigureLevels } from '@/domain/figures/figure-levels'
import type { CarryIn } from '@/domain/generation/carry-in/carry-in'
import {
  FOUR_FOUR_METER,
  makeGenerationRequest,
  makeRequestId,
} from '@/domain/generation/generation-request'
import { makeHarmonyCollection } from '@/domain/harmony/collection'
import { makeHarmonyCandidateDomain } from '@/domain/harmony/harmony-planner'
import type { HarmonyCandidate, HarmonyEvent } from '@/domain/harmony/harmony-types'
import { bindTensionRequirement, makePitchPolicy } from '@/domain/pitch/pitch-policy'
import { makeBoundPitchPlannerInput, type BoundPitchPlannerInput } from '@/domain/pitch/pitch-types'
import { makeActiveConcertRange } from '@/domain/profile/active-concert-range'
import { makeRegisterWindow } from '@/domain/profile/register-window'
import { makeSeed } from '@/domain/random/seed'
import { makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'
import type { RhythmCandidate } from '@/domain/rhythm/rhythm-types'
import { withSeventh } from '../harmony/seventh-chord-fixtures'

/** One kind of harmony plan: its key, its collection and its harmonic motion. */
export interface PlanKind {
  readonly name: string
  readonly tonalCenter: PitchClass
  readonly collection: Collection
  readonly harmonicMotion: HarmonicMotion
}

/**
 * One plan of each open-ending kind: tonal plans that move (ending on the degree-5 chord), a tonal
 * static plan (ending on scale degree 5) and a modal plan (ending on the home chord).
 */
export const PLAN_KINDS: readonly PlanKind[] = [
  {
    name: 'tonal gentle',
    tonalCenter: 'C',
    collection: 'Major',
    harmonicMotion: 'Gentle diatonic',
  },
  {
    name: 'tonal active',
    tonalCenter: 'C',
    collection: 'Major',
    harmonicMotion: 'Active diatonic',
  },
  { name: 'tonal static', tonalCenter: 'C', collection: 'Major', harmonicMotion: 'Static' },
  { name: 'modal', tonalCenter: 'D', collection: 'Dorian', harmonicMotion: 'Gentle diatonic' },
]

/** The C-major gentle plan most cases start from. */
export const TONAL_GENTLE: PlanKind = PLAN_KINDS[0]!

/** What a seventh-chord input may vary; everything else is the shared fixture. */
export interface SeventhInputOptions {
  readonly kind?: PlanKind
  readonly tensionArc?: TensionArc
  /** Index of the harmony planner's candidate to take. */
  readonly harmonyIndex?: number
  /** Index of the Quarter rhythm candidate to take. */
  readonly rhythmIndex?: number
  readonly seed?: number
  readonly carryIn?: CarryIn
  readonly figureLevels?: FigureLevels
  readonly chaos?: ArpeggioChaos
  /** Which events take their seventh form; every event by default. */
  readonly sevenths?: (event: HarmonyEvent, index: number) => boolean
  readonly window?: readonly [number, number]
}

/** The harmony planner's candidates for a plan kind and tension arc. */
export function harmonyCandidates(
  kind: PlanKind,
  tensionArc: TensionArc = 'Settled',
): readonly HarmonyCandidate[] {
  const domain = makeHarmonyCandidateDomain({
    tonalCenter: kind.tonalCenter,
    collection: kind.collection,
    harmonicMotion: kind.harmonicMotion,
    tensionArc,
  })
  if (domain.kind !== 'harmony_candidate_domain') throw new Error('fixture harmony missing')
  return domain.candidates
}

/** The first `count` Quarter rhythm candidates for a tension arc. */
export function quarterRhythms(count: number, tensionArc: TensionArc = 'Settled') {
  const domain = makeRhythmCandidateDomain({
    noteDensity: 'Quarter',
    rhythmicVariety: 'Slightly varied',
    silenceDensity: 'Sparse',
    syncopation: 'Straight',
    tensionArc,
  })
  if (domain.kind !== 'rhythm_candidate_domain') throw new Error('fixture rhythm missing')
  const rhythms: RhythmCandidate[] = []
  for (const rhythm of domain.candidates()) {
    rhythms.push(rhythm)
    if (rhythms.length === count) break
  }
  return rhythms
}

/** The harmony candidate with the chosen events in seventh form. */
export function inSeventhForm(
  candidate: HarmonyCandidate,
  kind: PlanKind,
  sevenths: (event: HarmonyEvent, index: number) => boolean = () => true,
): HarmonyCandidate {
  const collection = makeHarmonyCollection(kind.tonalCenter, kind.collection)
  return {
    ...candidate,
    events: candidate.events.map((event, index) =>
      sevenths(event, index) ? withSeventh(event, collection) : event,
    ),
  }
}

/** A bound input over a hand-built seventh-chord plan, or `null` when no tension binding fits. */
export function seventhInput(options: SeventhInputOptions = {}): BoundPitchPlannerInput | null {
  const kind = options.kind ?? TONAL_GENTLE
  const tensionArc = options.tensionArc ?? 'Settled'
  const candidate = harmonyCandidates(kind, tensionArc)[options.harmonyIndex ?? 0]
  if (!candidate) throw new Error('fixture harmony candidate missing')
  const harmony = inSeventhForm(candidate, kind, options.sevenths)
  const rhythm = quarterRhythms((options.rhythmIndex ?? 0) + 1, tensionArc).at(-1)!
  const binding = bindTensionRequirement(harmony, rhythm)
  if (!binding) return null
  const [minMidi, maxMidi] = options.window ?? [48, 72]
  return makeBoundPitchPlannerInput({
    request: makeGenerationRequest({
      requestId: makeRequestId('seventh-chord-pitch-test'),
      seed: makeSeed(options.seed ?? 1),
      measureCount: 4,
      meter: FOUR_FOUR_METER,
      activeConcertRange: makeActiveConcertRange(40, 84),
      register: 'Middle',
      registerWindow: makeRegisterWindow(minMidi, maxMidi),
      ...(options.carryIn === undefined ? {} : { carryIn: options.carryIn }),
    }),
    policy: makePitchPolicy({
      figureLevels: options.figureLevels ?? NEUTRAL_FIGURE_LEVELS,
      collection: kind.collection,
      tonalCenter: kind.tonalCenter,
      contour: 'Wandering',
      leapiness: 'Angular',
      arpeggioChaos: options.chaos ?? 'Predictable',
      searchFuel: 20_000,
    }),
    harmony,
    rhythm,
    tensionBinding: binding,
  })
}

/** `seventhInput`, failing loudly when no tension binding fits. */
export function boundSeventhInput(options: SeventhInputOptions = {}): BoundPitchPlannerInput {
  const input = seventhInput(options)
  if (!input) throw new Error('fixture tension binding missing')
  return input
}

/** Pitch class of a MIDI value. */
export function pc(midi: number): number {
  return ((midi % 12) + 12) % 12
}
