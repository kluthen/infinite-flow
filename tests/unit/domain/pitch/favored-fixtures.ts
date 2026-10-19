/**
 * Shared builders for the favored-order tests (test plumbing): a static C major tonic phrase of
 * quarter notes as a bound pitch-planner input, figure levels with a few figures raised, hand-built
 * attacks and candidates, and a deterministic scan for a seed whose draws meet a condition.
 */

import { makeConcertPitch } from '@/domain/events/concert-pitch'
import { makeCarryIn, type CarryIn } from '@/domain/generation/carry-in/carry-in'
import {
  FIGURE_IDS,
  NEUTRAL_FIGURE_LEVELS,
  type FigureId,
  type FigureLevel,
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
import { makeSeed } from '@/domain/random/seed'
import { makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'
import {
  bindTensionRequirement,
  makeBoundPitchPlannerInput,
  makePitchPolicy,
} from '@/domain/pitch/pitch-planner'
import type {
  BoundPitchPlannerInput,
  ConcreteTensionBinding,
  PitchAttack,
  PitchCandidate,
  PitchRole,
} from '@/domain/pitch/pitch-types'

/** How many seeds a scan tries before failing: far more than any 1-in-4 condition needs. */
const SEED_SCAN_LIMIT = 10_000

/** The figure levels `base`, with the figures named in `raised` at their given level. */
export function levelsWith(
  raised: Partial<Record<FigureId, FigureLevel>>,
  base: FigureLevels = NEUTRAL_FIGURE_LEVELS,
): FigureLevels {
  return Object.fromEntries(
    FIGURE_IDS.map((figure) => [figure, raised[figure] ?? base[figure]]),
  ) as FigureLevels
}

/**
 * The first seed from 1 up for which `accepts` holds: a deterministic scan, so a test names the
 * draw condition it needs rather than a magic seed. Fails loudly when no seed qualifies.
 */
export function firstSeedWhere(accepts: (seed: number) => boolean): number {
  for (let seed = 1; seed <= SEED_SCAN_LIMIT; seed += 1) if (accepts(seed)) return seed
  throw new Error(`No seed up to ${SEED_SCAN_LIMIT} meets the draw condition.`)
}

/** A carry-in over the fixture's window, with no carried chord, so a joined phrase owes nothing. */
export function plainCarryIn(): CarryIn {
  return makeCarryIn({
    lastPitch: {
      midi: makeConcertPitch(60),
      arrivingInterval: null,
      recovery: { kind: 'settled' },
    },
    registerWindow: makeRegisterWindow(48, 72),
    finalHarmony: null,
    phraseNumber: 1,
  })
}

/**
 * A static C major tonic phrase of quarter notes over 48-72, as a bound pitch-planner input:
 * attack 0 at 0:0 (beat 1), 1 at 0:4, 2 at 0:8 (beat 3), 3 at 0:12, then from bar 1's beat 2 on.
 */
export function pitchFixtureInput(
  options: {
    readonly seed?: number
    readonly figureLevels?: FigureLevels
    readonly tensionBinding?: ConcreteTensionBinding
    readonly carryIn?: CarryIn
    readonly fuel?: number
  } = {},
): BoundPitchPlannerInput {
  const harmony = makeHarmonyCandidateDomain({
    tonalCenter: 'C',
    collection: 'Major',
    harmonicMotion: 'Static',
    tensionArc: 'Settled',
  })
  if (harmony.kind !== 'harmony_candidate_domain') throw new Error('fixture harmony missing')
  const tonic = harmony.candidates[0]!
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
  const binding = options.tensionBinding ?? bindTensionRequirement(tonic, rhythm)
  if (!binding) throw new Error('fixture binding missing')
  return makeBoundPitchPlannerInput({
    request: makeGenerationRequest({
      requestId: makeRequestId('favored-order'),
      seed: makeSeed(options.seed ?? 1),
      measureCount: 4,
      meter: FOUR_FOUR_METER,
      activeConcertRange: makeActiveConcertRange(48, 72),
      register: 'Middle',
      registerWindow: makeRegisterWindow(48, 72),
      ...(options.carryIn === undefined ? {} : { carryIn: options.carryIn }),
    }),
    policy: makePitchPolicy({
      figureLevels: options.figureLevels ?? NEUTRAL_FIGURE_LEVELS,
      collection: 'Major',
      tonalCenter: 'C',
      contour: 'Wandering',
      leapiness: 'Angular',
      arpeggioChaos: 'Predictable',
      searchFuel: options.fuel ?? 20_000,
    }),
    harmony: tonic,
    rhythm,
    tensionBinding: binding,
  })
}

/** A hand-built PitchAttack under C major; overrides isolate the fields a test probes. */
export function handAttack(overrides: Partial<PitchAttack> = {}): PitchAttack {
  return {
    attackIndex: 1,
    identity: '0:4',
    barIndex: 0,
    startTick: 4,
    durationTicks: 4,
    start: 4,
    end: 8,
    chordPitchClasses: [0, 4, 7],
    harmonyIndex: 0,
    harmonyIdentity: 'fixture/0/0',
    isCheckpoint: false,
    isBeatOne: false,
    isFirstUnderHarmonyChange: false,
    isFinal: false,
    ...overrides,
  }
}

/** A hand-built candidate; `figures` and `reservation` are carried only when given. */
export function handCandidate(options: {
  readonly role: PitchRole
  readonly midi: number
  readonly enumerationIndex: number
  readonly figures?: readonly FigureId[]
  readonly reservation?: PitchCandidate['reservation']
}): PitchCandidate {
  const { role, midi } = options
  return {
    identity: `${role}/${midi}`,
    role,
    midi: makeConcertPitch(midi),
    pitchClass: ((midi % 12) + 12) % 12,
    octaveIndex: Math.floor(midi / 12),
    obligationIdentity: `${role}:${midi}`,
    enumerationIndex: options.enumerationIndex,
    ...(options.reservation === undefined ? {} : { reservation: options.reservation }),
    ...(options.figures === undefined ? {} : { figures: options.figures }),
  }
}
