import type { ArpeggioChaos } from '../controls/generation-controls'
import { deepFreeze } from '../events/deep-freeze'
import type { PitchAttack, PitchCandidate } from './pitch-types'
import { compareUnsignedPitchTie, type PitchTieKeyFactory } from './pitch-tie-key'

/**
 * Musical rank tuple, lexicographic and lower first:
 * 1. chord-tone priority on beat 1 and at a harmony change;
 * 2. chord tones before every non-chord candidate, so chaos can never interleave the two groups;
 * 3. arpeggio chaos, applied only to chord tones: Predictable prefers the nearest tone, Chaotic the
 *    farthest, Varied leaves chord tones to the seeded tie key.
 */
// @spec-link [[rule_arpeggio_chaos_respects_constraints]]
export function pitchRank(
  chaos: ArpeggioChaos,
  attack: Pick<PitchAttack, 'isBeatOne' | 'isFirstUnderHarmonyChange'>,
  candidate: Pick<PitchCandidate, 'role' | 'midi'>,
  priorMidi: number | undefined,
): readonly number[] {
  const chord = candidate.role === 'chord_tone'
  const priority = (attack.isBeatOne || attack.isFirstUnderHarmonyChange) && !chord ? 1 : 0
  const distance = priorMidi === undefined ? 0 : Math.abs(candidate.midi - priorMidi)
  const chaosKey = !chord
    ? 0
    : chaos === 'Predictable'
      ? distance
      : chaos === 'Chaotic'
        ? -distance
        : 0
  return deepFreeze([priority, chord ? 0 : 1, chaosKey])
}

/** Lexicographic comparison of two rank tuples of equal length. */
function compareRank(a: readonly number[], b: readonly number[]): number {
  for (let index = 0; index < a.length; index += 1)
    if (a[index] !== b[index]) return a[index]! - b[index]!
  return 0
}

/**
 * Order one attack's candidates for depth-first search: musical rank first, then the unsigned
 * seeded tie key, then MIDI, then enumeration index. Pure and seed-derived; no mutable PRNG.
 */
// @spec-link [[rule_arpeggio_chaos_respects_constraints]]
export function orderCandidates(input: {
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
      compareRank(a.rank, b.rank) ||
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
