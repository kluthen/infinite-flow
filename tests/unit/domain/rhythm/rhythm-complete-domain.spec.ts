import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'

import { isNoLegalRhythmPlan, makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'

function candidates(input: Parameters<typeof makeRhythmCandidateDomain>[0]) {
  const result = makeRhythmCandidateDomain(input)
  if (isNoLegalRhythmPlan(result)) throw new Error(result.codes.join(', '))
  return [...result.candidates()]
}

// @test-link [[api_rhythm_domain_expansion]]
describe('rhythm-mvp-v2 complete derivation domain', () => {
  // @test-link [[entity_rhythm_candidate_domain]]
  it('retains canonical bar-form, recurrence, and merge derivations rather than one representative', () => {
    const domain = candidates({
      grammarVersion: 'rhythm-mvp-v2',
      noteDensity: 'Eighth',
      rhythmicVariety: 'Slightly varied',
      silenceDensity: 'Sparse',
      syncopation: 'Straight',
      tensionArc: 'Settled',
    })
    expect(domain.length).toBeGreaterThan(5)
    expect(new Set(domain.map((candidate) => candidate.recurrence.kind))).toEqual(
      new Set(['exact', 'substitute']),
    )
    expect(new Set(domain.map((candidate) => candidate.identity)).size).toBe(domain.length)
    expect(domain.map((candidate) => candidate.candidateIndex)).toEqual(
      domain.map((_, index) => index),
    )
  })

  it.each([
    ['Straight', 0],
    ['Occasional offbeats', 1],
  ] as const)(
    'retains %s descriptor coverage in surviving candidates',
    (syncopation, minimum) => {
      const domain = candidates({
        grammarVersion: 'rhythm-mvp-v2',
        noteDensity: syncopation === 'Straight' ? 'Sixteenth' : 'Eighth',
        rhythmicVariety: syncopation === 'Straight' ? 'Slightly varied' : 'Heavily varied',
        silenceDensity: 'Sparse',
        syncopation,
        tensionArc: 'Build',
      })
      expect(
        domain.every(
          (candidate) =>
            candidate.transforms.filter((item) => item.roles.includes('syncopation')).length >=
            minimum,
        ),
      ).toBe(true)
    },
    30_000,
  )

  it('retains Occasional selectors compatible with the answer-ending policy', () => {
    const result = makeRhythmCandidateDomain({
      grammarVersion: 'rhythm-mvp-v2',
      noteDensity: 'Eighth',
      rhythmicVariety: 'Slightly varied',
      silenceDensity: 'Sparse',
      syncopation: 'Occasional offbeats',
      tensionArc: 'Build',
    })
    if (isNoLegalRhythmPlan(result)) throw new Error(result.codes.join(', '))
    expect(
      new Set(
        [...result.candidates()].flatMap((candidate) =>
          candidate.transforms
            .filter((descriptor) => descriptor.roles.includes('syncopation'))
            .map((descriptor) => descriptor.barIndex),
        ),
      ),
    ).toEqual(new Set([0, 1, 2, 3]))
  })

  it('supplies all four phrase bars to Active templates and retains both documented shapes', () => {
    const result = makeRhythmCandidateDomain({
      grammarVersion: 'rhythm-mvp-v2',
      noteDensity: 'Eighth',
      rhythmicVariety: 'Slightly varied',
      silenceDensity: 'Sparse',
      syncopation: 'Active displacement',
      tensionArc: 'Build',
    })
    if (isNoLegalRhythmPlan(result)) throw new Error(result.codes.join(', '))
    const shapes = new Set(
      [...result.candidates()].map((candidate) =>
        candidate.transforms
          .filter((descriptor) => descriptor.roles.includes('syncopation'))
          .slice(0, 4)
          .map((descriptor) => descriptor.case)
          .join(','),
      ),
    )
    expect(
      [...shapes].some((shape) =>
        /^tied_sustain,(note_to_note|interior_rest),tied_sustain,(note_to_note|interior_rest)$/.test(
          shape,
        ),
      ),
    ).toBe(true)
    expect(
      [...shapes].some((shape) =>
        /^(note_to_note|interior_rest),tied_sustain,(note_to_note|interior_rest),tied_sustain$/.test(
          shape,
        ),
      ),
    ).toBe(true)
    for (const candidate of result.candidates()) {
      const syncopated = candidate.transforms.filter((descriptor) =>
        descriptor.roles.includes('syncopation'),
      )
      expect(syncopated.some((descriptor) => descriptor.case === 'tied_sustain')).toBe(true)
      expect(
        syncopated.some((descriptor) => {
          if (descriptor.case === 'tied_sustain') return false
          const attackTick =
            descriptor.case === 'interior_rest'
              ? descriptor.transformedBoundaries[1]
              : descriptor.transformedBoundaries[0]
          return attackTick !== undefined && attackTick % 4 !== 0
        }),
      ).toBe(true)
      for (const bar of candidate.bars) {
        const anchors = bar.events.filter(
          (event) =>
            event.kind === 'note' &&
            !event.tieContinuation &&
            (event.startTick === 0 || event.startTick === 8),
        ).length
        expect(anchors).toBeGreaterThanOrEqual(
          syncopated.filter((descriptor) => descriptor.barIndex === bar.barIndex).length,
        )
      }
    }
  })

  it('does not accept the provisional all-one manifest as a complete-domain fixture', () => {
    const domain = candidates({
      grammarVersion: 'rhythm-mvp-v2',
      noteDensity: 'Eighth',
      rhythmicVariety: 'Slightly varied',
      silenceDensity: 'Sparse',
      syncopation: 'Straight',
      tensionArc: 'Settled',
    })
    const payload = domain.map((candidate) => candidate.identity).join('\n') + '\n'
    const provisionalAllOne = {
      count: 1,
      sha256: createHash('sha256').update(`${domain[0]!.identity}\n`, 'utf8').digest('hex'),
    }
    expect({
      count: domain.length,
      sha256: createHash('sha256').update(payload, 'utf8').digest('hex'),
    }).not.toEqual(provisionalAllOne)
  })
})
