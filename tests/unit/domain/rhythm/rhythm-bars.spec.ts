import { describe, expect, it } from 'vitest'

import {
  barsKeyedDomainOf,
  keyRhythmCandidates,
  measureBarKey,
  measureStarts,
  rhythmBarKey,
  rhythmStarts,
} from '@/domain/rhythm/rhythm-bars'
import { isNoLegalRhythmPlan, makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'
import type { RhythmBar, RhythmCandidate } from '@/domain/rhythm/rhythm-types'

import { bar, phrase, starts } from './rhythm-bar-fixture'

/** Intent: drain one small real domain (Eighth, Strict, Conversational, Straight, Settled). */
function smallDomain(): readonly RhythmCandidate[] {
  const result = makeRhythmCandidateDomain({
    noteDensity: 'Eighth',
    rhythmicVariety: 'Strict',
    silenceDensity: 'Conversational',
    syncopation: 'Straight',
    tensionArc: 'Settled',
  })
  if (isNoLegalRhythmPlan(result)) throw new Error('the small domain has no plan')
  return Object.freeze([...result.candidates()])
}

// @test-link [[entity_rhythm_candidate_domain]]
describe('bar key', () => {
  it('writes each event as kind, start and length, marking tie continuations', () => {
    expect(measureBarKey(bar('n2 ~n2 r4 n8'))).toBe('n0.2,~n2.2,r4.4,n8.8')
  })

  it('ignores tie chain names: the same written bar gives the same key', () => {
    const left = bar('n4 n2 ~n2 n8', 0, 'left')
    const right = bar('n4 n2 ~n2 n8', 0, 'right')
    expect(left.events[1]?.tieChainId).not.toBe(right.events[1]?.tieChainId)
    expect(measureBarKey(left)).toBe(measureBarKey(right))
  })

  it('tells apart bars that differ only by a tie, a kind or a length', () => {
    const keys = ['n4 n4 n8', 'n4 ~n4 n8', 'n4 r4 n8', 'n4 n2 n2 n8'].map((spec) =>
      measureBarKey(bar(spec)),
    )
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('joins the four measure keys with a bar line', () => {
    const bars = phrase(['n16', 'n8 n8', 'r4 n12', 'n4 ~n12'])
    expect(rhythmBarKey(bars)).toBe('n0.16|n0.8,n8.8|r0.4,n4.12|n0.4,~n4.12')
  })
})

// @test-link [[entity_rhythm_candidate_domain]]
describe('start lists', () => {
  it('lists note and rest starts in order and skips tie continuations', () => {
    expect(measureStarts(bar('n2 ~n2 r4 n4 ~n4'))).toEqual(starts('n0 r4 n8'))
  })

  it('keeps adjacent rests as separate starts', () => {
    expect(measureStarts(bar('n4 r4 r4 n4'))).toEqual(starts('n0 r4 r8 n12'))
  })

  it('returns frozen lists, one per measure', () => {
    const lists = rhythmStarts(phrase(['n16', 'n8 n8', 'r4 n12', 'n4 ~n12']))
    expect(lists).toEqual([starts('n0'), starts('n0 n8'), starts('r0 n4'), starts('n0')])
    expect(Object.isFrozen(lists)).toBe(true)
    expect(lists.every((list) => Object.isFrozen(list) && list.every(Object.isFrozen))).toBe(true)
  })

  it('rejects a measure whose events are not in strictly increasing start order', () => {
    const written = bar('n8 n8')
    const reversed: RhythmBar = { ...written, events: [...written.events].reverse() }
    expect(() => measureStarts(reversed)).toThrow(/order/)
  })
})

// @test-link [[entity_rhythm_candidate_domain]]
describe('domain keyed by bars', () => {
  it('keys every candidate by its bars, groups equal bars in domain order, and is frozen', () => {
    const candidates = smallDomain()
    const keyed = keyRhythmCandidates(candidates)
    expect(keyed.keys).toEqual(candidates.map((candidate) => rhythmBarKey(candidate.bars)))
    expect(keyed.starts).toEqual(candidates.map((candidate) => rhythmStarts(candidate.bars)))
    const grouped = [...keyed.byKey.values()].flat()
    expect(grouped).toHaveLength(candidates.length)
    for (const [key, group] of keyed.byKey) {
      expect(group.every((candidate) => keyed.keys[candidate.candidateIndex] === key)).toBe(true)
      const indices = group.map((candidate) => candidate.candidateIndex)
      expect(indices).toEqual([...indices].sort((left, right) => left - right))
    }
    expect(Object.isFrozen(keyed)).toBe(true)
    expect(Object.isFrozen(keyed.keys)).toBe(true)
    expect(Object.isFrozen(keyed.starts)).toBe(true)
    expect([...keyed.byKey.values()].every(Object.isFrozen)).toBe(true)
  })

  it('leaves the candidates and their order unchanged', () => {
    const candidates = smallDomain()
    const before = JSON.stringify(candidates)
    const order = [...candidates]
    keyRhythmCandidates(candidates)
    expect(JSON.stringify(candidates)).toBe(before)
    expect(candidates.every((candidate, index) => candidate === order[index])).toBe(true)
  })

  it('rejects a list whose candidate indices are not its positions', () => {
    const candidates = smallDomain()
    expect(() => keyRhythmCandidates(candidates.slice(1))).toThrow(/candidateIndex/)
  })

  it('keys a domain once per candidate list and returns the same keyed domain after', () => {
    const candidates = smallDomain()
    const first = barsKeyedDomainOf(candidates)
    expect(barsKeyedDomainOf(candidates)).toBe(first)
    expect(barsKeyedDomainOf(Object.freeze([...candidates]))).not.toBe(first)
  })

  it('refuses to share the keyed domain of a list that could still change', () => {
    expect(() => barsKeyedDomainOf([...smallDomain()])).toThrow(/frozen/)
  })
})
