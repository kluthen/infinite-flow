/**
 * Rhythm validation, provenance side: the answer-transform count per tension arc, the replayed
 * transform algebra, tied recurrence provenance, malformed v1 catalog provenance, and the
 * ending-signature and interior-rest overlap audits, all on real generated candidates.
 */
import { describe, expect, it } from 'vitest'

import { validateRhythmCandidate } from '@/domain/rhythm/rhythm-validator'
import type {
  BoundaryTransformDescriptor,
  InteriorRestTransformDescriptor,
  UnindexedRhythmCandidate,
} from '@/domain/rhythm/rhythm-types'
import { generatedCandidate, mutableCandidate, type Mutable } from './rhythm-validator-fixture'

// @test-link [[module_rhythm_domain_validation]]
describe('rhythm validation', () => {
  it('accepts one or two answer transforms for Build and Edge, but exactly one for Settled and Lift', () => {
    for (const tensionArc of ['Build', 'Edge'] as const)
      for (const answerCount of [1, 2])
        expect(
          validateRhythmCandidate(
            generatedCandidate(
              { tensionArc, silenceDensity: answerCount === 2 ? 'Conversational' : 'Sparse' },
              (candidate) =>
                candidate.transforms.filter((descriptor) => descriptor.roles.includes('answer'))
                  .length === answerCount,
            ),
          ),
        ).toEqual([])

    for (const tensionArc of ['Settled', 'Lift'] as const) {
      const candidate = mutableCandidate({ tensionArc })
      candidate.transforms = []
      expect(validateRhythmCandidate(candidate)).toContain('answer_transform_count_violation')
    }
  })

  it('replays source-address transform algebra instead of trusting plausible descriptor metadata', () => {
    const candidate = mutableCandidate(
      { syncopation: 'Active displacement', tensionArc: 'Build' },
      (item) => item.transforms.some((descriptor) => descriptor.case === 'note_to_note'),
    )
    const descriptor = candidate.transforms.find((item) => item.case === 'note_to_note')!
    const bar = candidate.bars[descriptor.barIndex]!
    const contains = (
      event: (typeof bar.events)[number],
      address: (typeof descriptor.affectedAddresses)[number],
    ) =>
      event.sourceCells.some(
        (cell) =>
          cell.address.barIndex === address.barIndex &&
          cell.address.beatIndex === address.beatIndex &&
          cell.address.cellIndex === address.cellIndex,
      )
    const left = bar.events.find((event) => contains(event, descriptor.affectedAddresses[0]))!
    const right = bar.events.find((event) => contains(event, descriptor.affectedAddresses[1]))!
    left.durationTicks += 1
    right.startTick += 1
    right.durationTicks -= 1

    expect(validateRhythmCandidate(candidate)).toContain('transform_algebra_violation')
  })

  it('accepts legal tied recurrence provenance represented once across its segments', () => {
    const candidate = generatedCandidate(
      { syncopation: 'Active displacement', tensionArc: 'Build' },
      (item) =>
        item.transforms.some(
          (descriptor) =>
            descriptor.case === 'tied_sustain' &&
            (descriptor.barIndex === item.recurrence.sourceBar ||
              descriptor.barIndex === item.recurrence.targetBar) &&
            descriptor.strongTick === (item.recurrence.sourceBeat + 1) * 4,
        ),
    )
    const addresses = candidate.bars.flatMap((bar) =>
      bar.events.flatMap((event) => event.sourceCells.map((cell) => JSON.stringify(cell.address))),
    )

    expect(new Set(addresses).size).toBe(addresses.length)
    expect(validateRhythmCandidate(candidate)).toEqual([])
  })

  it('independently rejects malformed v1 catalog provenance, coordinates, order, and duplicates', () => {
    const malformed: Array<{
      readonly name: string
      readonly mutate: (candidate: Mutable<UnindexedRhythmCandidate>) => void
    }> = [
      {
        name: 'catalog index content',
        mutate: (candidate) => {
          candidate.bars[0]!.events[0]!.sourceCells[0]!.catalog.catalogIndex = 3
        },
      },
      {
        name: 'duplicate address',
        mutate: (candidate) => {
          const cells = candidate.bars[0]!.events.flatMap((event) => event.sourceCells)
          cells[1]!.address = structuredClone(cells[0]!.address)
        },
      },
      {
        name: 'containing bar',
        mutate: (candidate) => {
          candidate.bars[0]!.events[0]!.sourceCells[0]!.address.barIndex = 1
        },
      },
      {
        name: 'actual beat location',
        mutate: (candidate) => {
          candidate.bars[0]!.events[0]!.sourceCells[0]!.address.beatIndex = 3
        },
      },
      {
        name: 'source-cell order',
        mutate: (candidate) => {
          const event = candidate.bars[0]!.events.find((item) => item.sourceCells.length > 1)!
          event.sourceCells.reverse()
        },
      },
      {
        name: 'terminal kind and duration',
        mutate: (candidate) => {
          const source = candidate.bars[0]!.events[0]!.sourceCells[0]!
          source.kind = source.kind === 'note' ? 'rest' : 'note'
          source.durationTicks += 1
        },
      },
    ]

    for (const fixture of malformed) {
      const candidate = mutableCandidate({}, (item) =>
        item.bars[0]!.events.some((event) => event.sourceCells.length > 1),
      )
      fixture.mutate(candidate)
      expect(validateRhythmCandidate(candidate), fixture.name).toContain(
        'invalid_nominal_provenance',
      )
    }
  })

  it('uses only ending signatures, and audits an overlap at the interior-rest attacked note', () => {
    const ending = mutableCandidate()
    ending.bars[3]!.events = structuredClone(ending.bars[1]!.events)
    const early = ending.bars[3]!.events.findIndex(
      (event, index, events) =>
        index + 1 < events.length && event.kind === 'note' && events[index + 1]!.kind === 'note',
    )
    ending.bars[3]!.events[early]!.durationTicks += 1
    ending.bars[3]!.events[early + 1]!.startTick += 1
    ending.bars[3]!.events[early + 1]!.durationTicks -= 1
    expect(validateRhythmCandidate(ending)).toContain('answer_variation_missing')

    const variedEnding = mutableCandidate()
    const finalNote = [...variedEnding.bars[3]!.events]
      .reverse()
      .find((event) => event.kind === 'note')!
    finalNote.durationTicks += 1
    const followingRest =
      variedEnding.bars[3]!.events[variedEnding.bars[3]!.events.indexOf(finalNote) + 1]
    if (followingRest) {
      followingRest.startTick += 1
      followingRest.durationTicks -= 1
    }
    expect(validateRhythmCandidate(variedEnding)).not.toContain('answer_variation_missing')

    const overlap = mutableCandidate()
    const original = overlap.transforms[0]!
    const bar = overlap.bars[original.barIndex]!
    const interior: Mutable<InteriorRestTransformDescriptor> = {
      grammarVersion: original.grammarVersion,
      case: 'interior_rest' as const,
      barIndex: original.barIndex,
      boundaryTick: original.boundaryTick,
      delta: original.delta,
      transformedBoundaries: [...original.transformedBoundaries],
      affectedAddresses: [
        original.affectedAddresses[0],
        original.affectedAddresses[1],
        bar.events.flatMap((event) => event.sourceCells)[2]!.address,
      ],
      roles: [...original.roles],
    }
    const attacked = interior.affectedAddresses[2]
    const another = bar.events
      .flatMap((event) => event.sourceCells)
      .find(
        (cell) =>
          cell.address.beatIndex !== attacked.beatIndex ||
          cell.address.cellIndex !== attacked.cellIndex,
      )!.address
    const noteToNote: Mutable<BoundaryTransformDescriptor<'note_to_note'>> = {
      grammarVersion: interior.grammarVersion,
      case: 'note_to_note',
      barIndex: interior.barIndex,
      boundaryTick: interior.boundaryTick,
      delta: interior.delta,
      transformedBoundaries: [...interior.transformedBoundaries],
      affectedAddresses: [attacked, another],
      roles: [...interior.roles],
    }
    overlap.transforms.push(interior, noteToNote)
    expect(validateRhythmCandidate(overlap)).toContain('transform_overlap_violation')
  })
})
