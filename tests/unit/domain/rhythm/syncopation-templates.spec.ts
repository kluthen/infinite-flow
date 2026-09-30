import { describe, expect, it } from 'vitest'

import type { NoteDensity, Syncopation } from '@/domain/controls/generation-controls'
import type { RhythmBar, RhythmTransformDescriptor } from '@/domain/rhythm/rhythm-types'
import {
  activeTemplateMask,
  enumerateSyncopationTemplates,
  type SyncopationSelectorMemo,
} from '@/domain/rhythm/syncopation-templates'
import {
  disjoint,
  displacementCandidates,
  roles,
  tieCandidate,
} from '@/domain/rhythm/transform-descriptors'

import { listPhrases } from './rhythm-expansion-fixture'

type Selected = RhythmTransformDescriptor | undefined

/** The pre-vector string-keyed selector memo lookup, as the enumerator used it before. */
function memoSelector(
  memo: Map<RhythmBar, Map<string, Selected>>,
  bar: RhythmBar,
  key: string,
  compute: () => Selected,
): Selected {
  let byKey = memo.get(bar)
  if (!byKey) {
    byKey = new Map()
    memo.set(bar, byKey)
  }
  if (byKey.has(key)) return byKey.get(key)
  const value = compute()
  byKey.set(key, value)
  return value
}

/** Reference: the Occasional and Active template enumeration before the per-bar selector vectors. */
function* referenceTemplates(
  bars: readonly RhythmBar[],
  density: NoteDensity,
  syncopation: Syncopation,
  coalesced: readonly RhythmTransformDescriptor[],
  memo: Map<RhythmBar, Map<string, Selected>>,
): IterableIterator<readonly RhythmTransformDescriptor[]> {
  if (syncopation === 'Straight') {
    yield []
    return
  }
  if (syncopation === 'Occasional offbeats') {
    const selectors = ['note_to_note', 'interior_rest', 'tied_sustain'] as const
    const dualByBar = new Map(
      coalesced
        .filter(
          (descriptor) =>
            descriptor.roles.length === 2 &&
            descriptor.roles[0] === 'answer' &&
            descriptor.roles[1] === 'syncopation',
        )
        .map((descriptor) => [descriptor.barIndex, descriptor] as const),
    )
    if (dualByBar.size !== coalesced.length) return
    const selectOccasional = (index: number, selector: (typeof selectors)[number]) =>
      memoSelector(memo, bars[index]!, `occ|${density}|${selector}`, () =>
        selector === 'tied_sustain'
          ? tieCandidate(bars[index]!, [8])
          : displacementCandidates(
              bars[index]!,
              density,
              selector,
              [2],
              roles(false, true),
              false,
            )[0],
      )
    for (const barSet of [
      ...bars.map((_, index) => [index]),
      ...bars.flatMap((_, left) =>
        bars.slice(left + 1).map((__, offset) => [left, left + offset + 1]),
      ),
    ])
      for (const selector of selectors) {
        const selectedBars = new Set(barSet)
        if ([...dualByBar.keys()].some((barIndex) => !selectedBars.has(barIndex))) continue
        const template = barSet.map((index) => {
          const dual = dualByBar.get(index as 0 | 1 | 2 | 3)
          if (dual)
            return dual.case === selector && (selector === 'tied_sustain' || dual.delta === 2)
              ? undefined
              : null
          return selectOccasional(index, selector)
        })
        if (
          template.every(
            (descriptor, index) =>
              descriptor !== null &&
              (descriptor !== undefined || dualByBar.has(barSet[index]! as 0 | 1 | 2 | 3)),
          )
        )
          yield template.filter(
            (descriptor): descriptor is RhythmTransformDescriptor => descriptor !== undefined,
          )
      }
    return
  }
  if (bars.length !== 4) return
  for (const pattern of [
    ['tied_sustain', 'displacement', 'tied_sustain', 'displacement'],
    ['displacement', 'tied_sustain', 'displacement', 'tied_sustain'],
  ] as const)
    for (const displacement of ['note_to_note', 'interior_rest'] as const)
      for (const delta of [-2, -1, 1, 2]) {
        const template = bars.map((bar, index) =>
          pattern[index] === 'tied_sustain'
            ? memoSelector(memo, bar, 'tie|active', () => tieCandidate(bar, [4, 8, 12]))
            : memoSelector(
                memo,
                bar,
                `act|${density}|${displacement}|${delta}`,
                () =>
                  displacementCandidates(
                    bar,
                    density,
                    displacement,
                    [delta],
                    roles(false, true),
                    false,
                  )[0],
              ),
        )
        if (
          template.every((descriptor) => descriptor !== undefined) &&
          disjoint(template as RhythmTransformDescriptor[])
        )
          yield template as RhythmTransformDescriptor[]
      }
}

/** Gesture sampling stride per density, keeping each setting to a few dozen gestures. */
const STRIDE = { Quarter: 1, Eighth: 6, Sixteenth: 20 } as const

const SETTINGS = [
  ['Eighth', 'Heavily varied', 'Sparse', 'Active displacement', 'Build'],
  ['Sixteenth', 'Heavily varied', 'Sparse', 'Active displacement', 'Edge'],
  ['Quarter', 'Heavily varied', 'Sparse', 'Occasional offbeats', 'Build'],
  ['Sixteenth', 'Slightly varied', 'Conversational', 'Occasional offbeats', 'Edge'],
  ['Eighth', 'Slightly varied', 'Sparse', 'Straight', 'Build'],
] as const

// @test-link [[mechanic_syncopation_enumeration]]
describe('syncopation templates from per-bar selector vectors', () => {
  it.each(SETTINGS)(
    'yield the pre-vector catalog, template for template, for %s / %s / %s / %s / %s',
    (noteDensity, rhythmicVariety, silenceDensity, syncopation, tensionArc) => {
      const memo: SyncopationSelectorMemo = new WeakMap()
      const referenceMemo = new Map<RhythmBar, Map<string, Selected>>()
      let phrases = 0
      let templates = 0
      let emptyMasks = 0
      for (const phrase of listPhrases(
        { noteDensity, rhythmicVariety, silenceDensity, syncopation, tensionArc },
        STRIDE[noteDensity],
      )) {
        const bars = phrase.phraseBeforeSync
        if (!bars) continue
        phrases += 1
        const actual = [
          ...enumerateSyncopationTemplates(bars, noteDensity, syncopation, phrase.duals, memo),
        ]
        const expected = [
          ...referenceTemplates(bars, noteDensity, syncopation, phrase.duals, referenceMemo),
        ]
        expect(actual).toEqual(expected)
        templates += actual.length
        if (syncopation !== 'Active displacement') continue
        // A zero mask over the gesture bars alone, or over the whole phrase, means no template.
        const gestureMask = activeTemplateMask(bars.slice(0, 2), noteDensity, memo)
        const phraseMask = activeTemplateMask(bars, noteDensity, memo)
        expect(phraseMask & ~gestureMask).toBe(0)
        if (phraseMask === 0) {
          emptyMasks += 1
          expect(expected).toEqual([])
        }
        expect(expected.length).toBeLessThanOrEqual(
          phraseMask.toString(2).replaceAll('0', '').length,
        )
      }
      expect(phrases).toBeGreaterThan(0)
      expect(templates).toBeGreaterThan(0)
      if (syncopation === 'Active displacement') expect(emptyMasks).toBeGreaterThan(0)
    },
    60_000,
  )

  it('reads one bar object repeated at every position by its parity, like the reference', () => {
    const [phrase] = listPhrases(
      {
        noteDensity: 'Sixteenth',
        rhythmicVariety: 'Heavily varied',
        silenceDensity: 'Sparse',
        syncopation: 'Active displacement',
        tensionArc: 'Build',
      },
      1,
    )
    const bar = phrase!.gesture.bars[0]
    const repeated = [bar, bar, bar, bar]
    expect([
      ...enumerateSyncopationTemplates(repeated, 'Sixteenth', 'Active displacement'),
    ]).toEqual([...referenceTemplates(repeated, 'Sixteenth', 'Active displacement', [], new Map())])
  })
})
