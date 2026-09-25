import { describe, expect, it } from 'vitest'

import { makeBar } from '@/domain/rhythm/rhythm-skeleton'
import {
  applyTransformSet,
  enumerateAnswerTransformLists,
  enumerateSyncopationTemplates,
} from '@/domain/rhythm/syncopation'
import type {
  NominalCell,
  RhythmBar,
  RhythmTransformDescriptor,
} from '@/domain/rhythm/rhythm-types'

const cell = (
  kind: 'note' | 'rest',
  durationTicks: number,
  index: number,
  barIndex: 0 | 1 | 2 | 3,
): NominalCell => ({
  kind,
  durationTicks,
  address: {
    grammarVersion: 'rhythm-mvp-v1',
    barIndex,
    beatIndex: Math.floor(index / 2),
    cellIndex: index % 2,
  },
  catalog: { grammarVersion: 'rhythm-mvp-v1', density: 'Eighth', catalogIndex: 0 },
})

const answerBar = (kinds: readonly ('note' | 'rest')[], barIndex: 2 | 3 = 2): RhythmBar =>
  makeBar(
    barIndex,
    kinds.map((kind, index) => cell(kind, 4, index, barIndex)),
  )

const mergedBar = (barIndex: 0 | 1 | 2 | 3): RhythmBar => {
  const first = cell('note', 4, 0, barIndex)
  const second = cell('note', 4, 1, barIndex)
  return {
    barIndex,
    events: [
      {
        kind: 'note',
        startTick: 0,
        durationTicks: 8,
        nominalDurationTicks: 8,
        sourceCells: [first, second],
      },
      {
        kind: 'note',
        startTick: 8,
        durationTicks: 4,
        nominalDurationTicks: 4,
        sourceCells: [cell('note', 4, 2, barIndex)],
      },
      {
        kind: 'note',
        startTick: 12,
        durationTicks: 4,
        nominalDurationTicks: 4,
        sourceCells: [cell('note', 4, 3, barIndex)],
      },
    ],
  }
}

describe('rhythm-mvp-v1 bounded transforms', () => {
  const interior = answerBar(['note', 'rest', 'note', 'note'])
  const pair = answerBar(['note', 'note', 'rest', 'note'])

  // @test-link [[mechanic_syncopation_enumeration]]
  it('enumerates Straight interior-rest translation on-grid and answer-only pair/final forms', () => {
    const lists = [...enumerateAnswerTransformLists([interior, pair], 'Eighth', 'Settled')]
    expect(lists).toHaveLength(8)
    expect(lists[0]!.map((descriptor) => descriptor.case)).toEqual(['interior_rest'])
    expect(lists[0]![0]!.roles).toEqual(['answer'])
    expect(lists.flatMap((list) => list).map((descriptor) => descriptor.case)).toEqual(
      expect.arrayContaining(['interior_rest', 'redistribute_note_pair']),
    )
    const bar3SwapTarget = answerBar(
      ['note', 'rest', 'note', 'note', 'note', 'note', 'rest', 'note'],
      3,
    )
    const swaps = [
      ...enumerateAnswerTransformLists([interior, bar3SwapTarget], 'Eighth', 'Settled'),
    ]
      .flatMap((list) => list)
      .filter((descriptor) => descriptor.case === 'swap_final_pattern')
    expect(swaps).toHaveLength(1)
    expect(swaps[0]!.barIndex).toBe(3)
    // Two beat-3 cells are eligible here. The answer swap must select the final one, not the
    // first beat-3 cell encountered by a forward scan.
    expect(swaps[0]!.sourceAddresses[1]).toMatchObject({ beatIndex: 3, cellIndex: 1 })
  })

  // @test-link [[mechanic_syncopation_translation]]
  it('applies a bar-4 final-pattern swap locally without rebuilding unrelated merges', () => {
    const mergedFirst = cell('note', 2, 0, 3)
    const mergedSecond = cell('note', 2, 1, 3)
    const left = {
      ...cell('rest', 4, 2, 3),
      address: { ...cell('rest', 4, 2, 3).address, beatIndex: 1 },
    }
    const middle = {
      ...cell('note', 4, 4, 3),
      address: { ...cell('note', 4, 4, 3).address, beatIndex: 2 },
    }
    const right = {
      ...cell('note', 4, 6, 3),
      address: { ...cell('note', 4, 6, 3).address, beatIndex: 3 },
    }
    const bar: RhythmBar = {
      barIndex: 3,
      events: [
        {
          kind: 'note',
          startTick: 0,
          durationTicks: 4,
          nominalDurationTicks: 4,
          sourceCells: [mergedFirst, mergedSecond],
        },
        {
          kind: 'rest',
          startTick: 4,
          durationTicks: 4,
          nominalDurationTicks: 4,
          sourceCells: [left],
        },
        {
          kind: 'note',
          startTick: 8,
          durationTicks: 4,
          nominalDurationTicks: 4,
          sourceCells: [middle],
        },
        {
          kind: 'note',
          startTick: 12,
          durationTicks: 4,
          nominalDurationTicks: 4,
          sourceCells: [right],
        },
      ],
    }
    const descriptor = [...enumerateAnswerTransformLists([interior, bar], 'Eighth', 'Settled')]
      .flat()
      .find((item) => item.case === 'swap_final_pattern')!
    const unrelated = JSON.stringify(bar.events[0])
    const provenance = JSON.stringify(bar.events.flatMap((event) => event.sourceCells))

    const result = applyTransformSet(bar, [descriptor])

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(JSON.stringify(result.bar.events[0])).toBe(unrelated)
      expect(JSON.stringify(result.bar.events.flatMap((event) => event.sourceCells))).toBe(
        provenance,
      )
      expect(result.bar.events).toHaveLength(bar.events.length)
      expect(result.bar.events[1]!.kind).toBe('note')
      expect(result.bar.events[3]!.kind).toBe('rest')
    }
  })

  // @test-link [[mechanic_syncopation_enumeration]]
  it('enumerates Occasional and Active displacement candidates with canonical signed deltas', () => {
    expect(
      [
        ...enumerateAnswerTransformLists(
          [pair, answerBar(['note', 'note', 'rest', 'note'], 3)],
          'Eighth',
          'Build',
          'Occasional offbeats',
        ),
      ]
        .flatMap((list) => list)
        .filter((descriptor) => descriptor.case === 'note_to_note')
        .map((descriptor) => descriptor.delta),
    ).toContain(2)
    expect(
      [
        ...enumerateAnswerTransformLists(
          [pair, answerBar(['note', 'note', 'rest', 'note'], 3)],
          'Eighth',
          'Build',
          'Active displacement',
        ),
      ]
        .flatMap((template) => template)
        .filter((descriptor) => descriptor.case === 'note_to_note')
        .map((descriptor) => descriptor.delta),
    ).toEqual(expect.arrayContaining([-2, -1, 1, 2]))
  })

  // @test-link [[mechanic_syncopation_enumeration]]
  it('orders one-answer lists before two-answer lists and coalesces dual roles', () => {
    const lists = [
      ...enumerateAnswerTransformLists(
        [pair, answerBar(['note', 'note', 'rest', 'note'], 3)],
        'Eighth',
        'Build',
        'Occasional offbeats',
      ),
    ]
    let finalSingle = -1
    for (let index = lists.length - 1; index >= 0; index -= 1) {
      if (lists[index]!.length === 1) {
        finalSingle = index
        break
      }
    }
    expect(lists.findIndex((list) => list.length === 2)).toBeGreaterThan(finalSingle)
    const dual = lists.flatMap((list) => list).find((descriptor) => descriptor.roles.length === 2)
    expect(dual?.roles).toEqual(['answer', 'syncopation'])
  })

  // @test-link [[mechanic_syncopation_enumeration]]
  it('rejects Build and Edge lists that overlap an interior-rest translation at its attacked note', () => {
    for (const tension of ['Build', 'Edge'] as const) {
      const lists = [
        ...enumerateAnswerTransformLists(
          [interior, answerBar(['note', 'note', 'rest', 'note'], 3)],
          'Eighth',
          tension,
          'Occasional offbeats',
        ),
      ]
      const interiorDescriptor = lists
        .flat()
        .find((descriptor) => descriptor.case === 'interior_rest')!
      expect(interiorDescriptor.affectedAddresses).toHaveLength(3)
      expect(
        lists.some(
          (list) =>
            list.length === 2 &&
            list.some(
              (descriptor) =>
                descriptor.case === 'interior_rest' &&
                list.some(
                  (other) =>
                    other !== descriptor &&
                    other.affectedAddresses.some(
                      (address) =>
                        address.barIndex === descriptor.affectedAddresses[2].barIndex &&
                        address.beatIndex === descriptor.affectedAddresses[2].beatIndex &&
                        address.cellIndex === descriptor.affectedAddresses[2].cellIndex,
                    ),
                ),
            ),
        ),
      ).toBe(false)
    }
  })

  // @test-link [[mechanic_syncopation_enumeration]]
  it('enumerates Straight identity and Occasional bars in canonical bar-set then selector order', () => {
    expect([...enumerateSyncopationTemplates([pair, pair], 'Eighth', 'Straight')]).toEqual([[]])
    const occasional = [
      ...enumerateSyncopationTemplates(
        [mergedBar(0), mergedBar(1), mergedBar(2), mergedBar(3)],
        'Eighth',
        'Occasional offbeats',
      ),
    ]
    const firstPair = occasional.findIndex((template) => template.length === 2)
    expect(firstPair).toBeGreaterThan(0)
    expect(occasional.slice(0, firstPair).every((template) => template.length === 1)).toBe(true)
    expect(occasional.slice(firstPair).every((template) => template.length === 2)).toBe(true)
    expect(
      occasional
        .slice(firstPair)
        .map((template) => template.map((item) => item.barIndex).join(',')),
    ).toEqual(['0,1', '0,2', '0,3', '1,2', '1,3', '2,3'])
  })

  // @test-link [[mechanic_syncopation_enumeration]]
  it('coalesces an Occasional dual-role answer into its shared-selector bar set', () => {
    const answer = [
      ...enumerateAnswerTransformLists(
        [pair, answerBar(['note', 'note', 'rest', 'note'], 3)],
        'Eighth',
        'Build',
        'Occasional offbeats',
      ),
    ]
      .flat()
      .find((descriptor) => descriptor.roles.length === 2)!
    const templates = [
      ...enumerateSyncopationTemplates(
        [mergedBar(0), mergedBar(1), pair, answerBar(['note', 'note', 'rest', 'note'], 3)],
        'Eighth',
        'Occasional offbeats',
        [answer],
      ),
    ]
    expect(templates.length).toBeGreaterThan(0)
    for (const template of templates) {
      const combined = [answer, ...template]
      expect(new Set(combined.map((descriptor) => descriptor.barIndex)).size).toBe(combined.length)
      expect(combined.length).toBeGreaterThanOrEqual(1)
      expect(combined.length).toBeLessThanOrEqual(2)
      expect(new Set(combined.map((descriptor) => descriptor.case)).size).toBe(1)
      expect(
        [...combined]
          .sort((left, right) => left.barIndex - right.barIndex)
          .map((descriptor) => descriptor.barIndex),
      ).toEqual(
        [...combined.map((descriptor) => descriptor.barIndex)].sort((left, right) => left - right),
      )
    }
  })

  // @test-link [[mechanic_syncopation_enumeration]]
  // @test-link [[mechanic_syncopation_translation]]
  it('uses both Active phrase templates, rejects overlapping descriptors, and preserves source addresses', () => {
    // A non-merged bar has no legal tie target, so neither Active template may silently substitute one.
    expect([
      ...enumerateSyncopationTemplates([pair, pair, pair, pair], 'Eighth', 'Active displacement'),
    ]).toEqual([])
    const templates = [
      ...enumerateSyncopationTemplates(
        [mergedBar(0), mergedBar(1), mergedBar(2), mergedBar(3)],
        'Eighth',
        'Active displacement',
      ),
    ]
    expect(templates).toHaveLength(8)
    expect(templates.map((template) => template.map((descriptor) => descriptor.case))).toEqual(
      expect.arrayContaining([
        ['tied_sustain', 'note_to_note', 'tied_sustain', 'note_to_note'],
        ['note_to_note', 'tied_sustain', 'note_to_note', 'tied_sustain'],
      ]),
    )
    const descriptor = [
      ...enumerateAnswerTransformLists([interior, pair], 'Eighth', 'Settled'),
    ][0]![0]!
    const original = JSON.stringify(interior)
    const result = applyTransformSet(interior, [descriptor, descriptor])
    expect(result).toEqual({ ok: false, code: 'transform_overlap_violation' })
    expect(JSON.stringify(interior)).toBe(original)
  })

  // @test-link [[mechanic_syncopation_translation]]
  it('splits only a maximal merged note at a legal strong source boundary without a reattack', () => {
    const first = cell('note', 4, 0, 2)
    const second = cell('note', 4, 1, 2)
    const merged: RhythmBar = {
      barIndex: 2,
      events: [
        {
          kind: 'note',
          startTick: 0,
          durationTicks: 8,
          nominalDurationTicks: 8,
          sourceCells: [first, second],
        },
        {
          kind: 'rest',
          startTick: 8,
          durationTicks: 8,
          nominalDurationTicks: 8,
          sourceCells: [cell('rest', 8, 2, 2)],
        },
      ],
    }
    const descriptor: RhythmTransformDescriptor = {
      grammarVersion: 'rhythm-mvp-v1',
      case: 'tied_sustain',
      barIndex: 2,
      boundaryTick: 4,
      delta: 0,
      transformedBoundaries: [4],
      sourceSpan: [first.address, second.address],
      affectedAddresses: [first.address, second.address],
      strongTick: 4,
      tieChainId: 'rhythm-mvp-v1/2/0/4/8',
      roles: ['syncopation'],
    }
    const result = applyTransformSet(merged, [descriptor])
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(
        result.bar.events.map((event) => [
          event.startTick,
          event.durationTicks,
          event.tieContinuation ?? false,
        ]),
      ).toEqual([
        [0, 4, false],
        [4, 4, true],
        [8, 8, false],
      ])
      expect(result.bar.events[0]!.tieChainId).toBe(result.bar.events[1]!.tieChainId)
      expect(result.bar.events[0]!.sourceCells).toEqual([first])
      expect(result.bar.events[1]!.sourceCells).toEqual([second])
      expect(
        new Set(
          result.bar.events
            .flatMap((event) => event.sourceCells)
            .map((source) => JSON.stringify(source.address)),
        ).size,
      ).toBe(3)
    }
  })
})
