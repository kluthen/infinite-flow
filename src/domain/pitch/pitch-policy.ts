import type {
  ArpeggioChaos,
  Collection,
  Contour,
  Leapiness,
  MusicalProfile,
  PitchClass,
} from '../controls/generation-controls'
import { deepFreeze } from '../events/deep-freeze'
import type {
  AbstractTensionRequirement,
  HarmonyCandidate,
  TensionFigureKind,
} from '../harmony/harmony-types'
import type { RhythmCandidate } from '../rhythm/rhythm-types'
import {
  harmonyEventIndexAt,
  soundingSpans,
  TICKS_PER_BAR,
  TICKS_PER_BEAT,
  type SoundingSpan,
} from './pitch-harmony'
import type {
  ConcreteTensionBinding,
  NoLegalTensionBinding,
  PitchPolicy,
  TensionBindingDomain,
  TensionBindingResult,
} from './pitch-types'

/** Default pitch-search fuel, counted in `advance` calls; versioned with `pitch-search-v1`. */
// @spec-link [[mechanic_pitch_search_policy]]
export const DEFAULT_PITCH_SEARCH_FUEL = 20_000

/** Freeze a versioned pitch policy, filling the default search fuel when none is given. */
// @spec-link [[mechanic_pitch_search_policy]]
export function makePitchPolicy(input: {
  readonly profile: MusicalProfile
  readonly collection: Collection
  readonly tonalCenter: PitchClass
  readonly contour: Contour
  readonly leapiness: Leapiness
  readonly arpeggioChaos: ArpeggioChaos
  readonly searchFuel?: number
}): PitchPolicy {
  return deepFreeze({
    version: 'pitch-search-v1' as const,
    ...input,
    searchFuel: input.searchFuel ?? DEFAULT_PITCH_SEARCH_FUEL,
  })
}

/** One sounding attack with its phrase index and the harmony event sounding at its onset. */
interface BindingAttack {
  readonly index: number
  readonly span: SoundingSpan
  readonly harmonyIndex: number
}

/**
 * Sounding attacks exactly as the planner indexes them: tie-inclusive spans, each with the harmony
 * event found by absolute beat. An attack in a harmony gap throws rather than skipping bindings.
 */
function bindingAttacks(
  harmony: HarmonyCandidate,
  rhythm: RhythmCandidate,
): readonly BindingAttack[] {
  return soundingSpans(rhythm).map((span, index) => ({
    index,
    span,
    harmonyIndex: harmonyEventIndexAt(harmony, span.start),
  }))
}

/** Ticks between strong onsets (beat 1 and beat 3 of a bar). */
const TICKS_PER_STRONG_ONSET = TICKS_PER_BAR / 2

/**
 * The latest absolute tick at which the attack after one ending at `end` may start under the
 * requirement's maximum resolution delay: the first beat boundary after `end` for `next_beat_or_bar`
 * (the next bar's downbeat when `end` falls in the bar's last beat), or the first strong onset after
 * `end` for `next_strong_sounding_onset`. Rests may fill the gap; an attack starting at `end` is
 * always in time.
 */
function resolutionDeadline(
  delay: AbstractTensionRequirement['maximumResolutionDelay'],
  end: number,
): number {
  const grid = delay === 'next_beat_or_bar' ? TICKS_PER_BEAT : TICKS_PER_STRONG_ONSET
  return Math.floor(end / grid) * grid + grid
}

/**
 * True when every attack after the first starts no later than the resolution deadline of the
 * attack before it. Rests between them are allowed; the delay bound is not.
 */
function withinResolutionDelay(
  delay: AbstractTensionRequirement['maximumResolutionDelay'],
  sequence: readonly BindingAttack[],
): boolean {
  return sequence.every(
    (attack, index) =>
      index === 0 || attack.span.start <= resolutionDeadline(delay, sequence[index - 1]!.span.end),
  )
}

/** True when a figure starts on a strong onset: beat 1 or beat 3 of its bar. */
function isStrong(attack: BindingAttack): boolean {
  return attack.span.startTick === 0 || attack.span.startTick === 8
}

/**
 * The concrete binding of one figure kind whose members start at `start`, or undefined when the
 * rhythm and harmony cannot host it there. Members and target are consecutive sounding attacks under
 * one harmony event; rests may separate them, but each must start within the requirement's maximum
 * resolution delay of the one before. An appoggiatura needs a strong onset and a preceding note to
 * leap from, so never starts on attack 0; a passing/neighbor tone needs a preparation, the
 * immediately preceding sounding attack under the same harmony event, which a rest may separate.
 */
function bindingAt(
  harmony: HarmonyCandidate,
  rhythm: RhythmCandidate,
  attacks: readonly BindingAttack[],
  figureKind: TensionFigureKind,
  start: number,
): Omit<ConcreteTensionBinding, 'bindingIndex'> | undefined {
  const requirement = harmony.tensionRequirement
  const figureLength = figureKind === 'two_note_diatonic_approach' ? 2 : 1
  const target = attacks[start + figureLength]
  if (!target) return undefined
  const figure = attacks.slice(start, start + figureLength)
  const first = figure[0]!
  if (!requirement.allowedBars.includes(first.span.barIndex as 0 | 1 | 2)) return undefined
  const sequence = [...figure, target]
  if (!withinResolutionDelay(requirement.maximumResolutionDelay, sequence)) return undefined
  if (sequence.some((attack) => attack.harmonyIndex !== first.harmonyIndex)) return undefined
  if (figureKind === 'appoggiatura' && (start === 0 || !isStrong(first))) return undefined
  if (figureKind === 'diatonic_passing_or_neighbor') {
    const preparation = attacks[start - 1]
    if (!preparation || preparation.harmonyIndex !== first.harmonyIndex) return undefined
  }
  if (target.index === attacks.length - 1 && requirement.mustResolveBeforeFinalSoundingEvent)
    return undefined
  return {
    identity: `${harmony.identity}/${rhythm.identity}/${figureKind}/${start}/${target.index}`,
    figureKind,
    attackIndices: figure.map((attack) => attack.index),
    targetAttackIndex: target.index,
  }
}

/**
 * Enumerate every complete concrete realization of the upstream requirement, in stable order: the
 * optional empty binding, then each permitted figure kind by first member attack. The rhythm and
 * harmony values are observed only; no onset, duration, or chord is synthesized or rewritten.
 */
// @spec-link [[mechanic_pitch_search_policy]]
export function makeTensionBindingDomain(
  harmony: HarmonyCandidate,
  rhythm: RhythmCandidate,
): TensionBindingResult {
  const attacks = bindingAttacks(harmony, rhythm)
  const requirement = harmony.tensionRequirement
  const bindings: Omit<ConcreteTensionBinding, 'bindingIndex'>[] = []
  if (requirement.requiredFigureCount === 0)
    bindings.push({ identity: `${harmony.identity}/${rhythm.identity}/none`, attackIndices: [] })
  for (const figureKind of requirement.permittedFigureKinds)
    for (const attack of attacks) {
      const binding = bindingAt(harmony, rhythm, attacks, figureKind, attack.index)
      if (binding) bindings.push(binding)
    }
  const indexed = bindings.map((binding, bindingIndex) => ({ ...binding, bindingIndex }))
  if (requirement.requiredFigureCount === 1 && indexed.length === 0)
    return deepFreeze<NoLegalTensionBinding>({
      kind: 'no_legal_tension_binding',
      harmonyIdentity: harmony.identity,
      rhythmIdentity: rhythm.identity,
      requiredFigureCount: 1,
    })
  return deepFreeze<TensionBindingDomain>({
    kind: 'tension_binding_domain',
    harmonyIdentity: harmony.identity,
    rhythmIdentity: rhythm.identity,
    bindings: indexed,
  })
}

/** Backward-compatible convenience accessor for callers that only need the first stable binding. */
// @spec-link [[rule_tension_resolution_delay_permits_rests]]
export function bindTensionRequirement(
  harmony: HarmonyCandidate,
  rhythm: RhythmCandidate,
): ConcreteTensionBinding | undefined {
  const result = makeTensionBindingDomain(harmony, rhythm)
  return result.kind === 'tension_binding_domain' ? result.bindings[0] : undefined
}
