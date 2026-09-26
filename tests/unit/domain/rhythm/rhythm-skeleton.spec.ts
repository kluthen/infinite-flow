import { describe, expect, it } from 'vitest'

import {
  V1_BAR1_FORMS,
  enumerateGestureDerivations,
  enumerateV1Bar1Productions,
  enumerateV1RecurrenceVariants,
} from '@/domain/rhythm/rhythm-skeleton'
import { beatCellCatalog } from '@/domain/rhythm/rhythm-variety'
import type { SingleMergePlan } from '@/domain/rhythm/rhythm-types'

const terminal = (cell: { readonly kind: string; readonly durationTicks: number }) =>
  `${cell.kind === 'note' ? 'N' : 'R'}${cell.durationTicks}`

// @test-link [[module_rhythm_skeleton_allocator]]
describe('rhythm-mvp-v2 nominal grammar', () => {
  // @test-link [[module_rhythm_variety_grammar]]
  it('owns every ordered beat-cell catalog entry exactly for Strict (the unaugmented base catalog)', () => {
    expect(
      Object.fromEntries(
        (['Quarter', 'Eighth', 'Sixteenth'] as const).map((density) => [
          density,
          beatCellCatalog(density, 'Strict').map((beat) => beat.map(terminal).join(' ')),
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
    })
  })

  // @test-link [[module_rhythm_variety_grammar]]
  it('appends the extra Slightly varied and Heavily varied beat cells after the base catalog', () => {
    expect(
      beatCellCatalog('Eighth', 'Slightly varied').map((beat) => beat.map(terminal).join(' ')),
    ).toEqual(['N2 N2', 'N2 R2', 'R2 N2', 'R2 R2', 'N4', 'N3 N1'])
    expect(
      beatCellCatalog('Eighth', 'Heavily varied').map((beat) => beat.map(terminal).join(' ')),
    ).toEqual(['N2 N2', 'N2 R2', 'R2 N2', 'R2 R2', 'N4', 'N3 N1', 'N2 N1 N1', 'N1 N1 N2'])
    // Quarter's `Slightly varied` catalog is byte-identical to `Strict` (no extra cells at that
    // density, ISS-004 feasibility review §1/§7).
    expect(beatCellCatalog('Quarter', 'Slightly varied')).toEqual(
      beatCellCatalog('Quarter', 'Strict'),
    )
  })

  // @test-link [[rule_phrase_starts_on_downbeat]]
  it('enumerates all five Bar1 productions in canonical form then lexicographic catalog order', () => {
    expect(V1_BAR1_FORMS).toEqual(['xxxx', 'xxxy', 'xxyy', 'xyxy', 'xyyx'])
    const productions = [...enumerateV1Bar1Productions('Eighth', 'Strict')]
    // Beat 0 always renders the "x" catalog entry (see formIndices), so only the note-starting
    // Eighth entries (index 0 "N2 N2" and index 1 "N2 R2") are eligible x values; the rest-starting
    // entries (index 2 "R2 N2" and index 3 "R2 R2") stay available as "y" for beats 1-3.
    expect(productions.map((production) => production.provenance.form)).toEqual([
      ...Array.from({ length: 2 }, () => 'xxxx'),
      ...Array.from({ length: 6 }, () => 'xxxy'),
      ...Array.from({ length: 6 }, () => 'xxyy'),
      ...Array.from({ length: 6 }, () => 'xyxy'),
      ...Array.from({ length: 6 }, () => 'xyyx'),
    ])
    expect(
      productions.slice(2, 5).map((production) => production.provenance.catalogIndices),
    ).toEqual([
      [0, 1],
      [0, 2],
      [0, 3],
    ])
  })

  it('uses the earliest attacked beat and enumerates exact then every target-cell substitution', () => {
    const production = enumerateV1Bar1Productions('Eighth', 'Strict').next().value!
    const variants = [
      ...enumerateV1RecurrenceVariants(production, {
        grammarVersion: 'rhythm-mvp-v2',
        noteDensity: 'Eighth',
        rhythmicVariety: 'Strict',
        silenceDensity: 'Sparse',
      }),
    ]
    expect(variants.map((variant) => variant.recurrence.kind)).toEqual([
      'exact',
      'substitute',
      'substitute',
    ])
    expect(
      variants.map((variant) =>
        variant.recurrence.kind === 'substitute'
          ? variant.recurrence.substitution.targetCellOffset
          : undefined,
      ),
    ).toEqual([undefined, 0, 1])
    for (const variant of variants) {
      expect(variant.recurrence.sourceBeat).toBe(0)
      expect(variant.recurrence.targetBeat).toBe(0)
    }
  })

  it('enumerates no merge then each eligible adjacent-note merge in chronological order', () => {
    const derivations = [
      ...enumerateGestureDerivations({
        grammarVersion: 'rhythm-mvp-v2',
        noteDensity: 'Eighth',
        rhythmicVariety: 'Strict',
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
    // A same-beat merge is only a candidate once one side already has duration > densityTicks
    // (rhythm-mvp-v2's mergePlans, rhythm-skeleton.ts); at Eighth density every base cell is
    // exactly q=2 ticks, so only cross-beat adjacent note pairs are eligible here.
    const eligible = seed!.bars.flatMap((bar) => {
      const cells = bar.events.flatMap((event) => event.sourceCells)
      return cells.flatMap((cell, index) => {
        const next = cells[index + 1]
        if (cell.kind !== 'note' || next?.kind !== 'note') return []
        if (cell.address.beatIndex === next.address.beatIndex) return []
        return [[cell.address.barIndex, cell.address.beatIndex, cell.address.cellIndex]]
      })
    })
    expect(plans[0]).toEqual({ kind: 'none' })
    expect(
      plans
        .slice(1)
        .filter((plan): plan is SingleMergePlan => plan.kind === 'merge')
        .map((plan) => [plan.left.barIndex, plan.left.beatIndex, plan.left.cellIndex]),
    ).toEqual(eligible)
  })

  // @test-link [[module_rhythm_skeleton_allocator]]
  it('accepts a Breath-heavy gesture with more than one rest event in a bar, as long as every bar has a rest', () => {
    const derivations = enumerateGestureDerivations({
      grammarVersion: 'rhythm-mvp-v2',
      noteDensity: 'Eighth',
      rhythmicVariety: 'Strict',
      silenceDensity: 'Breath-heavy',
    })
    const multiRestBar = [...derivations].find((derivation) => {
      const restCountsPerBar = derivation.bars.map(
        (bar) => bar.events.filter((event) => event.kind === 'rest').length,
      )
      return (
        restCountsPerBar.some((count) => count >= 2) &&
        restCountsPerBar.every((count) => count >= 1)
      )
    })
    expect(multiRestBar).toBeDefined()
    const restedBar = multiRestBar!.bars.find(
      (bar) => bar.events.filter((event) => event.kind === 'rest').length >= 2,
    )!
    expect(restedBar.events.filter((event) => event.kind === 'rest').length).toBeGreaterThanOrEqual(
      2,
    )
  })
})
