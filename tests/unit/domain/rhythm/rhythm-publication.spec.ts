import { describe, expect, it } from 'vitest'

import { SYNCOPATIONS } from '@/domain/controls/generation-controls'
import {
  createRhythmIdentityFragments,
  fragmentRhythmIdentity,
} from '@/domain/rhythm/rhythm-identity-fragments'
import { normalizedRhythmIdentity } from '@/domain/rhythm/rhythm-identity'
import { isNoLegalRhythmPlan, makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'
import {
  answerTransformLists,
  enumerateAnswerTransformLists,
  enumerateSyncopationTemplates,
  syncopationTemplateLists,
} from '@/domain/rhythm/syncopation'
import type {
  RhythmCandidate,
  RhythmCandidateDomain,
  RhythmExpansionInput,
} from '@/domain/rhythm/rhythm-types'

/**
 * Settings whose domains mix every syncopation level, both answer-list shapes (Build/Edge pairs and
 * single lists) and the heaviest domains (the Sixteenth / Heavily varied / Sparse ones), where bars
 * are shared most across candidates.
 */
const SETTINGS: readonly string[] = [
  'Sixteenth|Heavily varied|Sparse|Active displacement|Build',
  'Sixteenth|Heavily varied|Sparse|Straight|Build',
  'Sixteenth|Heavily varied|Sparse|Occasional offbeats|Edge',
  'Eighth|Slightly varied|Conversational|Active displacement|Settled',
  'Quarter|Heavily varied|Sparse|Occasional offbeats|Lift',
]

/** The expansion input of a `density|variety|silence|syncopation|tension` key. */
function inputOf(key: string): RhythmExpansionInput {
  const [noteDensity, rhythmicVariety, silenceDensity, syncopation, tensionArc] = key.split('|')
  return {
    noteDensity,
    rhythmicVariety,
    silenceDensity,
    syncopation,
    tensionArc,
  } as RhythmExpansionInput
}

/** The published domain of a setting; every listed setting has one. */
function domainOf(key: string): RhythmCandidateDomain {
  const result = makeRhythmCandidateDomain(inputOf(key))
  if (isNoLegalRhythmPlan(result)) throw new Error(`no rhythm plan for ${key}`)
  return result
}

/**
 * Paths of every object or function reachable from `root` (through all own properties, as
 * `deepFreeze` walks them) that is not frozen. `seen` is shared across calls so a part shared by
 * many candidates is walked once.
 */
function unfrozenPaths(root: unknown, seen: WeakSet<object>, path: string): string[] {
  const unfrozen: string[] = []
  const pending: [unknown, string][] = [[root, path]]
  while (pending.length > 0) {
    const [value, at] = pending.pop()!
    if (value === null || (typeof value !== 'object' && typeof value !== 'function')) continue
    if (seen.has(value)) continue
    seen.add(value)
    if (!Object.isFrozen(value)) unfrozen.push(at)
    for (const key of Object.getOwnPropertyNames(value))
      pending.push([(value as Record<string, unknown>)[key], `${at}.${key}`])
  }
  return unfrozen
}

// @test-link [[entity_rhythm_candidate_domain]]
describe('published rhythm candidates: fragment-built identity', () => {
  it.each(SETTINGS)(
    'every candidate identity of %s is the JSON.stringify reference identity',
    (key) => {
      const fragments = createRhythmIdentityFragments()
      let count = 0
      const mismatches: number[] = []
      for (const candidate of domainOf(key).candidates()) {
        count += 1
        const reference = normalizedRhythmIdentity(candidate)
        if (
          candidate.identity !== reference ||
          fragmentRhythmIdentity(fragments, candidate) !== reference
        )
          mismatches.push(candidate.candidateIndex)
      }
      expect(count).toBeGreaterThan(0)
      expect(mismatches).toEqual([])
    },
    120_000,
  )

  it('refuses a candidate missing a structural field instead of omitting its key', () => {
    const [candidate] = domainOf(SETTINGS[4]!).candidates()
    const withoutRecurrence = { ...candidate!, recurrence: undefined }
    expect(normalizedRhythmIdentity(candidate!)).toContain('"recurrence":')
    expect(() =>
      fragmentRhythmIdentity(
        createRhythmIdentityFragments(),
        withoutRecurrence as unknown as RhythmCandidate,
      ),
    ).toThrow(TypeError)
  })
})

// @test-link [[entity_rhythm_candidate_domain]]
describe('published rhythm candidates: deep immutability', () => {
  it.each(SETTINGS)(
    'the domain of %s and every candidate it publishes are deeply frozen',
    (key) => {
      const domain = domainOf(key)
      const seen = new WeakSet<object>()
      const unfrozen: string[] = []
      // The first drain resumes the planner's probe; the second derives afresh. Both publish.
      for (const replay of ['resumed', 'fresh'])
        for (const candidate of domain.candidates())
          unfrozen.push(...unfrozenPaths(candidate, seen, `${replay}[${candidate.candidateIndex}]`))
      unfrozen.push(...unfrozenPaths(domain, seen, 'domain'))
      expect(unfrozen.slice(0, 5)).toEqual([])
    },
    120_000,
  )
})

// @test-link [[mechanic_syncopation_enumeration]]
describe('public syncopation enumerators stay immutable', () => {
  it('yield the planner-internal lists, in order, each deeply frozen', () => {
    const { noteDensity } = inputOf(SETTINGS[1]!)
    let lists = 0
    let templates = 0
    for (const candidate of domainOf(SETTINGS[1]!).candidates()) {
      if (candidate.candidateIndex >= 20) break
      const answerBars = [candidate.bars[2]!, candidate.bars[3]!] as const
      for (const syncopation of SYNCOPATIONS) {
        const published = [
          ...enumerateAnswerTransformLists(answerBars, noteDensity, 'Build', syncopation),
        ]
        expect(published).toEqual([
          ...answerTransformLists(answerBars, noteDensity, 'Build', syncopation),
        ])
        expect(published.flatMap((list) => unfrozenPaths(list, new WeakSet(), 'list'))).toEqual([])
        lists += published.length
        const templateLists = [
          ...enumerateSyncopationTemplates(candidate.bars, noteDensity, syncopation),
        ]
        expect(templateLists).toEqual([
          ...syncopationTemplateLists(candidate.bars, noteDensity, syncopation, [], new WeakMap()),
        ])
        expect(
          templateLists.flatMap((template) => unfrozenPaths(template, new WeakSet(), 'template')),
        ).toEqual([])
        templates += templateLists.length
      }
    }
    expect(lists).toBeGreaterThan(0)
    expect(templates).toBeGreaterThan(20)
  })
})
