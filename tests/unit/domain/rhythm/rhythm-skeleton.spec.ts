// @test-link [[module_rhythm_skeleton_allocator]]
import { describe, expect, it } from 'vitest'

import {
  V1_BAR1_FORMS,
  V1_BEAT_CELL_CATALOGS,
  enumerateGestureDerivations,
  enumerateV1Bar1Productions,
  enumerateV1RecurrenceVariants,
} from '@/domain/rhythm/rhythm-skeleton'

const terminal = (cell: { readonly kind: string; readonly durationTicks: number }) =>
  `${cell.kind === 'note' ? 'N' : 'R'}${cell.durationTicks}`

describe('rhythm-mvp-v1 nominal grammar', () => {
  it('owns every ordered beat-cell catalog entry exactly', () => {
    expect(
      Object.fromEntries(
        Object.entries(V1_BEAT_CELL_CATALOGS).map(([density, catalog]) => [
          density,
          catalog.map((beat) => beat.map(terminal).join(' ')),
        ]),
      ),
    ).toEqual({
      Quarter: ['N4', 'R4'],
      Eighth: ['N2 N2', 'N2 R2', 'R2 N2', 'R2 R2'],
      Sixteenth: [
        'N1 N1 N1 N1',
        'N1 N1 N1 R1',
        'R1 N1 N1 N1',
        'N1 R1 N1 R1',
        'R1 N1 R1 N1',
        'N1 N1 R1 R1',
        'R1 R1 N1 N1',
        'R1 R1 R1 R1',
      ],
      Mixed: [
        'N4',
        'R4',
        'N2 N2',
        'N2 R2',
        'R2 N2',
        'R2 R2',
        'N2 N1 N1',
        'N2 N1 R1',
        'N2 R1 N1',
        'R2 N1 N1',
        'N1 N1 N2',
        'N1 R1 N2',
        'R1 N1 N2',
        'N1 N1 R2',
      ],
    })
  })

  it('enumerates all five Bar1 productions in canonical form then lexicographic catalog order', () => {
    expect(V1_BAR1_FORMS).toEqual(['xxxx', 'xxxy', 'xxyy', 'xyxy', 'xyyx'])
    const productions = [...enumerateV1Bar1Productions('Eighth')]
    expect(productions.map((production) => production.provenance.form)).toEqual([
      ...Array.from({ length: 4 }, () => 'xxxx'),
      ...Array.from({ length: 12 }, () => 'xxxy'),
      ...Array.from({ length: 12 }, () => 'xxyy'),
      ...Array.from({ length: 12 }, () => 'xyxy'),
      ...Array.from({ length: 12 }, () => 'xyyx'),
    ])
    expect(
      productions.slice(4, 7).map((production) => production.provenance.catalogIndices),
    ).toEqual([
      [0, 1],
      [0, 2],
      [0, 3],
    ])
  })

  it('uses the earliest attacked beat and enumerates exact then every target-cell substitution', () => {
    const production = enumerateV1Bar1Productions('Eighth').next().value!
    const variants = [
      ...enumerateV1RecurrenceVariants(production, {
        grammarVersion: 'rhythm-mvp-v1',
        noteDensity: 'Eighth',
        silenceDensity: 'Sparse',
      }),
    ]
    expect(variants.map((variant) => variant.recurrence.kind)).toEqual([
      'exact',
      'substitute',
      'substitute',
    ])
    expect(variants.map((variant) => variant.recurrence.substitution?.targetCellOffset)).toEqual([
      undefined,
      0,
      1,
    ])
    for (const variant of variants) {
      expect(variant.recurrence.sourceBeat).toBe(0)
      expect(variant.recurrence.targetBeat).toBe(0)
    }
  })

  it('enumerates no merge then each eligible adjacent-note merge in chronological order', () => {
    const derivations = [
      ...enumerateGestureDerivations({
        grammarVersion: 'rhythm-mvp-v1',
        noteDensity: 'Eighth',
        silenceDensity: 'Sparse',
      }),
    ]
    const seed = derivations.find(
      (derivation) =>
        derivation.recurrence.kind === 'exact' &&
        derivation.merge.kind === 'none' &&
        derivations.filter(
          (other) =>
            JSON.stringify(other.provenance) === JSON.stringify(derivation.provenance) &&
            JSON.stringify(other.recurrence) === JSON.stringify(derivation.recurrence),
        ).length > 1,
    )
    expect(seed).toBeDefined()
    const plans = derivations
      .filter(
        (derivation) =>
          JSON.stringify(derivation.provenance) === JSON.stringify(seed!.provenance) &&
          JSON.stringify(derivation.recurrence) === JSON.stringify(seed!.recurrence),
      )
      .map((derivation) => derivation.merge)
    const eligible = seed!.bars.flatMap((bar) => {
      const cells = bar.events.flatMap((event) => event.sourceCells)
      return cells.flatMap((cell, index) =>
        cell.kind === 'note' && cells[index + 1]?.kind === 'note'
          ? [[cell.address.barIndex, cell.address.beatIndex, cell.address.cellIndex]]
          : [],
      )
    })
    expect(plans[0]).toEqual({ kind: 'none' })
    expect(
      plans.slice(1).map((plan) => [plan.left.barIndex, plan.left.beatIndex, plan.left.cellIndex]),
    ).toEqual(eligible)
  })
})
