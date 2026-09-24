import type {
  ArpeggioChaos,
  Collection,
  Contour,
  Leapiness,
  MusicalProfile,
  PitchClass,
} from '../controls/generation-controls'
import { deepFreeze } from '../events/deep-freeze'
import type { HarmonyCandidate, TensionFigureKind } from '../harmony/harmony-types'
import type { RhythmCandidate } from '../rhythm/rhythm-types'
import { harmonyEventIndexAt, soundingSpans, type SoundingSpan } from './pitch-harmony'
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

/** True when each attack starts where the previous one's tie-inclusive span ends. */
function contiguous(sequence: readonly BindingAttack[]): boolean {
  return sequence.every(
    (attack, index) => index === 0 || sequence[index - 1]!.span.end === attack.span.start,
  )
}

/** True when a figure starts on a strong onset: beat 1 or beat 3 of its bar. */
function isStrong(attack: BindingAttack): boolean {
  return attack.span.startTick === 0 || attack.span.startTick === 8
}

/**
 * The concrete binding of one figure kind whose members start at `start`, or undefined when the
 * rhythm and harmony cannot host it there. Members and target sound back to back under one harmony
 * event; an appoggiatura needs a strong onset and a preceding note to leap from, so never starts on
 * attack 0; a passing/neighbor tone needs a contiguous preparation under the same harmony event.
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
  if (!contiguous(sequence)) return undefined
  if (sequence.some((attack) => attack.harmonyIndex !== first.harmonyIndex)) return undefined
  if (figureKind === 'appoggiatura' && (start === 0 || !isStrong(first))) return undefined
  if (figureKind === 'diatonic_passing_or_neighbor') {
    const preparation = attacks[start - 1]
    if (!preparation || !contiguous([preparation, first])) return undefined
    if (preparation.harmonyIndex !== first.harmonyIndex) return undefined
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
// @spec-link [[mechanic_pitch_search_policy]]
export function bindTensionRequirement(
  harmony: HarmonyCandidate,
  rhythm: RhythmCandidate,
): ConcreteTensionBinding | undefined {
  const result = makeTensionBindingDomain(harmony, rhythm)
  return result.kind === 'tension_binding_domain' ? result.bindings[0] : undefined
}
