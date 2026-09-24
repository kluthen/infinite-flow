import { makeHarmonyCollection } from '@/domain/harmony/collection'
import type {
  AbstractTensionRequirement,
  CollectionDegree,
  HarmonyEndpoint,
  HarmonyEvent,
} from '@/domain/harmony/harmony-types'
import type { ConcreteTensionBinding } from '@/domain/pitch/pitch-types'
import type { PitchValidationContext } from '@/domain/pitch/validation/pitch-validation-types'
import type { RhythmBar, RhythmEvent } from '@/domain/rhythm/rhythm-types'

const C_MAJOR = makeHarmonyCollection('C', 'Major')
const TOKEN_TICKS: Record<string, number> = { s: 1, e: 2, q: 4, h: 8, w: 16 }

/**
 * Build one bar from tokens such as `q q e e r:q ~:h`: `r:` marks a rest and `~:` a tie
 * continuation of the previous note.
 */
export function bar(barIndex: 0 | 1 | 2 | 3, spec: string): RhythmBar {
  let tick = 0
  const events = spec.split(' ').map((token): RhythmEvent => {
    const [prefix, size] = token.includes(':') ? token.split(':') : ['', token]
    const durationTicks = TOKEN_TICKS[size!]!
    const event: RhythmEvent = {
      kind: prefix === 'r' ? 'rest' : 'note',
      startTick: tick,
      durationTicks,
      nominalDurationTicks: durationTicks,
      sourceCells: [],
      ...(prefix === '~' ? { tieContinuation: true } : {}),
    }
    tick += durationTicks
    return event
  })
  return { barIndex, events }
}

export const QUARTERS: readonly RhythmBar[] = [0, 1, 2, 3].map((index) =>
  bar(index as 0 | 1 | 2 | 3, 'q q q q'),
)

/** One C-major harmony event; `beat` counts absolute beats from the start of the phrase. */
export function chord(degree: CollectionDegree, beat: number, beats: number): HarmonyEvent {
  return {
    barIndex: Math.floor(beat / 4) as 0 | 1 | 2 | 3,
    startBeat: (beat % 4) as 0 | 2,
    durationBeats: beats,
    triad: C_MAJOR.triads[degree - 1]!,
    role: 'tonic',
    templateId: 'fixture',
    barRoles: [],
  }
}

export const TONIC_EACH_BAR: readonly HarmonyEvent[] = [0, 4, 8, 12].map((beat) =>
  chord(1, beat, 4),
)

export const SETTLED: AbstractTensionRequirement = {
  arc: 'Settled',
  allowedBars: [0, 1, 2],
  maximumResolutionDelay: 'next_strong_sounding_onset',
  permittedFigureKinds: [
    'diatonic_passing_or_neighbor',
    'appoggiatura',
    'two_note_diatonic_approach',
  ],
  requiredFigureCount: 0,
  maximumFigureCount: 1,
  resolutionPreference: 'ordinary',
  mustResolveBeforeFinalSoundingEvent: true,
}

export const NO_FIGURE: ConcreteTensionBinding = {
  identity: 'none',
  bindingIndex: 0,
  attackIndices: [],
}

/** A bound figure with members `attackIndices` resolving on the attack right after them. */
export function figure(
  figureKind: NonNullable<ConcreteTensionBinding['figureKind']>,
  attackIndices: readonly number[],
): ConcreteTensionBinding {
  return {
    identity: `fixture/${figureKind}`,
    bindingIndex: 1,
    figureKind,
    attackIndices,
    targetAttackIndex: attackIndices.at(-1)! + 1,
  }
}

interface ContextOverrides {
  readonly profile?: 'Neutral' | 'Jazz'
  readonly contour?: 'Rising' | 'Falling' | 'Arch' | 'Wandering'
  readonly leapiness?: 'Smooth' | 'Shaped' | 'Leaping' | 'Angular'
  readonly bars?: readonly RhythmBar[]
  readonly events?: readonly HarmonyEvent[]
  readonly endpoint?: HarmonyEndpoint['kind']
  readonly requirement?: Partial<AbstractTensionRequirement>
  readonly binding?: ConcreteTensionBinding
  readonly window?: readonly [number, number]
}

/** C major, quarter notes, tonic every bar, static open endpoint, no bound figure. */
// @test-link [[module_pitch_domain_validation]]
export function context(overrides: ContextOverrides = {}): PitchValidationContext {
  const [minMidi, maxMidi] = overrides.window ?? [55, 79]
  return {
    request: {
      activeConcertRange: { kind: 'ActiveConcertRange', minMidi: 48, maxMidi: 84 },
      registerWindow: { minMidi, maxMidi },
    } as PitchValidationContext['request'],
    policy: {
      profile: overrides.profile ?? 'Neutral',
      collection: 'Major',
      tonalCenter: 'C',
      contour: overrides.contour ?? 'Wandering',
      leapiness: overrides.leapiness ?? 'Leaping',
    },
    harmony: {
      identity: 'fixture-harmony',
      events: overrides.events ?? TONIC_EACH_BAR,
      endpoint: { kind: overrides.endpoint ?? 'tonal_static_degree_five', degree: 5 },
      tensionRequirement: { ...SETTLED, ...overrides.requirement },
    },
    rhythm: { bars: overrides.bars ?? QUARTERS },
    tensionBinding: overrides.binding ?? NO_FIGURE,
  }
}

/**
 * A valid Wandering phrase over quarter notes: every non-chord tone is a diatonic passing tone or
 * neighbor, checkpoints are 60/67/60/64, and the final G is collection degree 5.
 */
export const BASELINE = [60, 62, 64, 65, 67, 65, 64, 62, 60, 62, 64, 62, 64, 65, 67, 67] as const

/** Copy of the baseline with the given attack indices replaced. */
export function withMidis(changes: Record<number, number>, base: readonly number[] = BASELINE) {
  return base.map((midi, index) => changes[index] ?? midi)
}
