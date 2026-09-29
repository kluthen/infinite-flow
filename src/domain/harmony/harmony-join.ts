/**
 * The harmonic side of a join between two session phrases. The phrase before hands forward its
 * final harmony event (the chord and its role) and the endpoint class of its harmony candidate;
 * the next phrase's harmony starts from that chord. The structural candidate domain itself is
 * unchanged by a join: every template opens on the collection's tonic (degree 1), so the degree-5
 * open arrival or the tonic-area ending of the phrase before always moves to a tonic opening (a
 * V-to-I, or a tonic-to-tonic restatement for static and modal harmony).
 */

import type {
  DiatonicTriad,
  HarmonyCandidate,
  HarmonyCandidateDomain,
  HarmonyEndpoint,
  HarmonyRole,
} from './harmony-types'

/** The final harmony event of the phrase before a join, reduced to its chord, role and endpoint. */
// @spec-link [[entity_phrase_carry_in]]
export interface CarriedHarmony {
  readonly triad: DiatonicTriad
  readonly role: HarmonyRole
  readonly endpoint: HarmonyEndpoint
}

/** Typed failure for a carried chord that the receiving phrase's harmony settings cannot produce. */
// @spec-link [[entity_phrase_carry_in]]
export class HarmonyJoinError extends Error {
  readonly kind = 'HarmonyJoinError' as const

  constructor(message: string) {
    super(message)
    this.name = 'HarmonyJoinError'
  }
}

/** Intent: true when two triads are the same chord: same degree, pitch classes and quality. */
function sameTriad(left: DiatonicTriad, right: DiatonicTriad): boolean {
  return (
    left.degree === right.degree &&
    left.quality === right.quality &&
    left.pitchClasses.every((pitchClass, index) => pitchClass === right.pitchClasses[index])
  )
}

/**
 * Intent: true when some candidate of the domain ends on exactly the carried chord and role and
 * has the carried endpoint class, i.e. the carried chord is one these harmony settings end on.
 */
// @spec-link [[entity_phrase_carry_in]]
export function carriedHarmonyEndsDomain(
  domain: HarmonyCandidateDomain,
  carried: CarriedHarmony,
): boolean {
  return domain.candidates.some((candidate) => {
    const final = candidate.events.at(-1)!
    return (
      sameTriad(final.triad, carried.triad) &&
      final.role === carried.role &&
      candidate.endpoint.kind === carried.endpoint.kind &&
      candidate.endpoint.degree === carried.endpoint.degree
    )
  })
}

/**
 * Intent: true when `candidate` may follow the carried chord: the carried chord is a phrase ending
 * (the degree-5 open arrival, or the degree-1 tonic area of static and modal harmony) and the
 * candidate opens on the collection's tonic (degree 1), giving V to I or a tonic restatement.
 */
// @spec-link [[entity_phrase_carry_in]]
export function harmonyJoinFollows(carried: CarriedHarmony, candidate: HarmonyCandidate): boolean {
  const opening = candidate.events[0]
  const endsPhrase = carried.triad.degree === 5 || carried.triad.degree === 1
  return endsPhrase && opening !== undefined && opening.triad.degree === 1
}

/**
 * Intent: the harmony candidates, in their domain order, that a phrase generated with carry-in may
 * use after the carried chord. Refuses a carried chord these settings never end a phrase on,
 * since it cannot have come from a phrase of the same session.
 */
// @spec-link [[entity_phrase_carry_in]]
// @spec-link [[rule_join_carry_in_limited]]
export function candidatesFollowingCarriedHarmony(
  domain: HarmonyCandidateDomain,
  carried: CarriedHarmony,
): readonly HarmonyCandidate[] {
  if (!carriedHarmonyEndsDomain(domain, carried))
    throw new HarmonyJoinError(
      `The carried chord (degree ${carried.triad.degree}, ${carried.role}, ${carried.endpoint.kind}) ` +
        'is not one these harmony settings end a phrase on.',
    )
  return domain.candidates.filter((candidate) => harmonyJoinFollows(carried, candidate))
}
