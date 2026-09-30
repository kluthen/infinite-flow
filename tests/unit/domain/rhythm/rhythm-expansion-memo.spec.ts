import { describe, expect, it } from 'vitest'

import {
  answerStageBars,
  createExpansionMemo,
  descriptorOrder,
  disjointFromList,
  listAddressKeys,
  rejectsBeforeAssembly,
  syncStageBars,
} from '@/domain/rhythm/rhythm-expansion-memo'
import { quickRejectRhythmCandidate } from '@/domain/rhythm/rhythm-invariants'
import type { RhythmTransformDescriptor } from '@/domain/rhythm/rhythm-types'
import { varietyViolated } from '@/domain/rhythm/rhythm-variety'
import { enumerateSyncopationTemplates } from '@/domain/rhythm/syncopation'

import { applyByBar, listPhrases } from './rhythm-expansion-fixture'

/** Reference: the planner's per-candidate overlap test over the assembled transform list. */
function referenceDisjoint(descriptors: readonly RhythmTransformDescriptor[]): boolean {
  const seen = new Set<string>()
  for (const descriptor of descriptors)
    for (const address of descriptor.affectedAddresses) {
      const key = `${address.barIndex}:${address.beatIndex}:${address.cellIndex}`
      if (seen.has(key)) return false
      seen.add(key)
    }
  return true
}

/** Settings with every syncopation level, each with a gesture sampling stride. */
const SETTINGS = [
  ['Eighth', 'Heavily varied', 'Sparse', 'Active displacement', 'Build', 6],
  ['Sixteenth', 'Heavily varied', 'Sparse', 'Active displacement', 'Edge', 20],
  ['Sixteenth', 'Heavily varied', 'Sparse', 'Straight', 'Build', 20],
  ['Quarter', 'Heavily varied', 'Sparse', 'Occasional offbeats', 'Build', 1],
  ['Eighth', 'Heavily varied', 'Conversational', 'Occasional offbeats', 'Edge', 6],
] as const

// @test-link [[api_rhythm_domain_expansion]]
// @test-link [[module_rhythm_domain_validation]]
describe('rhythm expansion memo checks against the per-candidate originals', () => {
  it.each(SETTINGS)(
    'match overlap, application, and quick reject for %s / %s / %s / %s / %s',
    (noteDensity, rhythmicVariety, silenceDensity, syncopation, tensionArc, gestureStride) => {
      const memo = createExpansionMemo()
      const counts = { templates: 0, overlaps: 0, rejected: 0, kept: 0 }
      for (const phrase of listPhrases(
        { noteDensity, rhythmicVariety, silenceDensity, syncopation, tensionArc },
        gestureStride,
      )) {
        const { input, answerOnly, duals, phraseBeforeSync } = phrase
        expect(answerStageBars(memo, phrase.answerBase, answerOnly)?.slice()).toEqual(
          phraseBeforeSync?.slice(2),
        )
        if (!phraseBeforeSync) continue
        const listKeys = listAddressKeys(memo, [answerOnly, duals])
        for (const template of enumerateSyncopationTemplates(
          phraseBeforeSync,
          noteDensity,
          syncopation,
          duals,
        )) {
          counts.templates += 1
          const syncStage = [...duals, ...template].sort(descriptorOrder)
          const transforms = [...answerOnly, ...syncStage]
          const disjoint = referenceDisjoint(transforms)
          expect(disjointFromList(memo, listKeys, template)).toBe(disjoint)
          if (!disjoint) {
            counts.overlaps += 1
            continue
          }
          const expectedBars = applyByBar(phraseBeforeSync, syncStage)
          const bars = syncStageBars(memo, phraseBeforeSync, duals, template)
          expect(bars?.slice()).toEqual(expectedBars?.slice())
          if (!bars || !expectedBars) continue
          const candidate = {
            grammarVersion: input.grammarVersion,
            input,
            bars: expectedBars,
            recurrence: phrase.gesture.recurrence,
            transforms,
          }
          const early = rejectsBeforeAssembly(memo, syncopation, bars, [...duals, ...template])
          const rejected = early || varietyViolated(candidate)
          expect(rejected).toBe(quickRejectRhythmCandidate(candidate))
          counts[rejected ? 'rejected' : 'kept'] += 1
        }
      }
      expect(counts.templates).toBeGreaterThan(0)
      expect(counts.rejected).toBeGreaterThan(0)
      expect(counts.kept).toBeGreaterThan(0)
    },
    60_000,
  )
})
