/**
 * The harmony of a phrase generated with carry-in starts from the carried chord: the carried chord
 * must be a chord the same harmony settings end a phrase on, and every candidate the next phrase
 * may use opens on the collection's tonic, so the join moves from a degree-5 open arrival or a
 * tonic-area ending to a tonic opening.
 */

import { describe, expect, it } from 'vitest'

import { makeHarmonyCandidateDomain } from '@/domain/harmony/harmony-planner'
import {
  candidatesFollowingCarriedHarmony,
  harmonyJoinFollows,
  HarmonyJoinError,
  type CarriedHarmony,
} from '@/domain/harmony/harmony-join'
import type {
  HarmonyCandidate,
  HarmonyCandidateDomain,
  HarmonyPlannerInput,
} from '@/domain/harmony/harmony-types'
import { COLLECTIONS, HARMONIC_MOTIONS, TENSION_ARCS } from '@/domain/controls/generation-controls'

/** Intent: the structural domain for one harmony setting, which must not be empty. */
function domainFor(input: Partial<HarmonyPlannerInput>): HarmonyCandidateDomain {
  const domain = makeHarmonyCandidateDomain({
    tonalCenter: 'C',
    collection: 'Major',
    harmonicMotion: 'Gentle diatonic',
    tensionArc: 'Lift',
    profile: 'Neutral',
    ...input,
  })
  if (domain.kind !== 'harmony_candidate_domain') throw new Error('Expected a harmony domain.')
  return domain
}

/** Intent: the carried harmony a phrase planned from `candidate` hands forward. */
function carriedFrom(candidate: HarmonyCandidate): CarriedHarmony {
  const final = candidate.events.at(-1)!
  return { triad: final.triad, role: final.role, endpoint: candidate.endpoint }
}

// @test-link [[rule_join_carry_in_limited]]
// @test-link [[module_harmony_candidate_domain]]
describe('harmony starting from the carried chord', () => {
  it('keeps every candidate, in order, after a chord the same settings end on', () => {
    for (const collection of COLLECTIONS)
      for (const harmonicMotion of HARMONIC_MOTIONS)
        for (const tensionArc of TENSION_ARCS) {
          const domain = domainFor({ collection, harmonicMotion, tensionArc })
          for (const candidate of domain.candidates) {
            const carried = carriedFrom(candidate)
            expect(candidatesFollowingCarriedHarmony(domain, carried)).toEqual(domain.candidates)
            for (const next of domain.candidates) {
              expect(harmonyJoinFollows(carried, next)).toBe(true)
              expect(next.events[0]!.triad.degree).toBe(1)
            }
          }
        }
  })

  it('refuses a carried chord the receiving settings never end a phrase on', () => {
    const gentle = domainFor({})
    const carried = carriedFrom(gentle.candidates[0]!)
    expect(() =>
      candidatesFollowingCarriedHarmony(domainFor({ tonalCenter: 'D' }), carried),
    ).toThrow(HarmonyJoinError)
    expect(() =>
      candidatesFollowingCarriedHarmony(domainFor({ harmonicMotion: 'Static' }), carried),
    ).toThrow(HarmonyJoinError)
  })

  it('does not follow the carried chord with a candidate that opens away from the tonic', () => {
    const domain = domainFor({})
    const candidate = domain.candidates[0]!
    const second = domain.collection.triads[1]!
    const awayFromTonic: HarmonyCandidate = {
      ...candidate,
      events: [{ ...candidate.events[0]!, triad: second }, ...candidate.events.slice(1)],
    }
    expect(harmonyJoinFollows(carriedFrom(candidate), awayFromTonic)).toBe(false)
  })
})
