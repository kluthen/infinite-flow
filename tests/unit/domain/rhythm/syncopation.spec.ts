import { describe, expect, it } from 'vitest'

import { applyTransform } from '@/domain/rhythm/syncopation'
import type { RhythmBar, RhythmTransformDescriptor } from '@/domain/rhythm/rhythm-types'

const bar: RhythmBar = {
  barIndex: 0,
  events: [
    {
      kind: 'note',
      startTick: 0,
      durationTicks: 4,
      nominalDurationTicks: 4,
      sourceCells: [
        {
          kind: 'note',
          durationTicks: 4,
          address: { grammarVersion: 'rhythm-mvp-v1', barIndex: 0, beatIndex: 0, cellIndex: 0 },
          catalog: { grammarVersion: 'rhythm-mvp-v1', density: 'Quarter', catalogIndex: 0 },
        },
      ],
    },
    {
      kind: 'rest',
      startTick: 4,
      durationTicks: 4,
      nominalDurationTicks: 4,
      sourceCells: [
        {
          kind: 'rest',
          durationTicks: 4,
          address: { grammarVersion: 'rhythm-mvp-v1', barIndex: 0, beatIndex: 1, cellIndex: 0 },
          catalog: { grammarVersion: 'rhythm-mvp-v1', density: 'Quarter', catalogIndex: 1 },
        },
      ],
    },
    {
      kind: 'note',
      startTick: 8,
      durationTicks: 8,
      nominalDurationTicks: 4,
      sourceCells: [
        {
          kind: 'note',
          durationTicks: 4,
          address: { grammarVersion: 'rhythm-mvp-v1', barIndex: 0, beatIndex: 2, cellIndex: 0 },
          catalog: { grammarVersion: 'rhythm-mvp-v1', density: 'Quarter', catalogIndex: 0 },
        },
        {
          kind: 'note',
          durationTicks: 4,
          address: { grammarVersion: 'rhythm-mvp-v1', barIndex: 0, beatIndex: 3, cellIndex: 0 },
          catalog: { grammarVersion: 'rhythm-mvp-v1', density: 'Quarter', catalogIndex: 0 },
        },
      ],
    },
  ],
}

// @test-link [[mechanic_syncopation_translation]]
describe('syncopation algebra', () => {
  it('translates an interior rest by the same signed delta without changing its span', () => {
    const descriptor: RhythmTransformDescriptor = {
      grammarVersion: 'rhythm-mvp-v1',
      case: 'interior_rest',
      barIndex: 0,
      boundaryTick: 4,
      delta: 2,
      transformedBoundaries: [6, 10],
      affectedAddresses: [
        { grammarVersion: 'rhythm-mvp-v1', barIndex: 0, beatIndex: 0, cellIndex: 0 },
        { grammarVersion: 'rhythm-mvp-v1', barIndex: 0, beatIndex: 1, cellIndex: 0 },
        { grammarVersion: 'rhythm-mvp-v1', barIndex: 0, beatIndex: 2, cellIndex: 0 },
      ],
      roles: ['syncopation'],
    }
    const result = applyTransform(bar, descriptor)
    expect(result.ok).toBe(true)
    if (result.ok)
      expect(
        result.bar.events.map(({ startTick, durationTicks }) => [startTick, durationTicks]),
      ).toEqual([
        [0, 6],
        [6, 4],
        [10, 6],
      ])
  })
})
