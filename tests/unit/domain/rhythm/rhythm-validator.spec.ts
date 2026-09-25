import { describe, expect, it } from 'vitest'

import { validateRhythmCandidateDomain } from '@/domain/rhythm/rhythm-domain-validator'
import { normalizedRhythmIdentity } from '@/domain/rhythm/rhythm-identity'
import { isNoLegalRhythmPlan, makeRhythmCandidateDomain } from '@/domain/rhythm/rhythm-planner'
import { validateRhythmCandidate } from '@/domain/rhythm/rhythm-validator'
import type {
  BoundaryTransformDescriptor,
  InteriorRestTransformDescriptor,
  RhythmCandidate,
  RhythmCandidateDomain,
  RhythmExpansionInput,
  RhythmTransformDescriptor,
  UnindexedRhythmCandidate,
} from '@/domain/rhythm/rhythm-types'

type Mutable<T> = { -readonly [Key in keyof T]: Mutable<T[Key]> }

const baseInput = {
  grammarVersion: 'rhythm-mvp-v1',
  noteDensity: 'Eighth',
  silenceDensity: 'Sparse',
  syncopation: 'Straight',
  tensionArc: 'Settled',
} as const

const candidateCodes = [
  'invalid_measure_count',
  'invalid_measure_tiling',
  'invalid_phrase_duration',
  'non_positive_duration',
  'invalid_nominal_provenance',
  'density_attack_band_violation',
  'mixed_duration_class_coverage_violation',
  'silence_budget_violation',
  'silence_shape_violation',
  'all_rest_measure',
  'rest_duration_limit_violation',
  'syncopation_count_violation',
  'syncopation_type_violation',
  'transform_algebra_violation',
  'transform_overlap_violation',
  'attack_count_changed',
  'rest_total_changed',
  'metrical_anchor_missing',
  'first_note_off_downbeat',
  'active_anchor_ratio_violation',
  'invalid_tie_chain',
  'recurrence_witness_invalid',
  'answer_transform_count_violation',
  'answer_similarity_violation',
  'answer_variation_missing',
  'transform_order_violation',
  'candidate_identity_mismatch',
] as const

function generatedCandidate(
  overrides: Partial<RhythmExpansionInput> = {},
  predicate: (candidate: RhythmCandidate) => boolean = () => true,
): RhythmCandidate {
  const result = makeRhythmCandidateDomain({ ...baseInput, ...overrides })
  if (isNoLegalRhythmPlan(result))
    throw new Error(`Unexpected empty domain: ${result.codes.join(', ')}`)
  const candidate = [...result.candidates()].find(predicate)
  if (!candidate) throw new Error('No generated candidate matched the fixture predicate')
  return candidate
}

/** Clone public generator output so each audit case makes one deliberate malformed change. */
function mutableCandidate(
  overrides: Partial<RhythmExpansionInput> = {},
  predicate?: (candidate: RhythmCandidate) => boolean,
): Mutable<UnindexedRhythmCandidate> {
  const candidate = structuredClone(
    generatedCandidate(overrides, predicate),
  ) as Mutable<RhythmCandidate>
  delete (candidate as Partial<Mutable<RhythmCandidate>>).candidateIndex
  delete (candidate as Partial<Mutable<RhythmCandidate>>).identity
  return candidate
}

function firstEvent(candidate: Mutable<UnindexedRhythmCandidate>, kind: 'note' | 'rest') {
  const event = candidate.bars.flatMap((bar) => bar.events).find((item) => item.kind === kind)
  if (!event) throw new Error(`Fixture has no ${kind} event`)
  return event
}

function answerOnly(descriptor: RhythmTransformDescriptor): boolean {
  return descriptor.roles.length === 1 && descriptor.roles[0] === 'answer'
}

// @test-link [[module_rhythm_domain_validation]]
describe('rhythm validation', () => {
  it('returns stable ordered failures and never repairs malformed candidates', () => {
    const candidate: UnindexedRhythmCandidate = {
      grammarVersion: 'rhythm-mvp-v1',
      input: baseInput,
      bars: [],
      recurrence: {
        kind: 'exact' as const,
        grammarVersion: 'rhythm-mvp-v1',
        sourceBar: 0 as const,
        sourceBeat: 0,
        sourceCellAddresses: [],
        targetBar: 1 as const,
        targetBeat: 0,
      },
      transforms: [],
    }
    expect(validateRhythmCandidate(candidate)).toEqual([
      'invalid_measure_count',
      'invalid_phrase_duration',
      'silence_budget_violation',
      'silence_shape_violation',
      'recurrence_witness_invalid',
      'answer_transform_count_violation',
      'answer_similarity_violation',
      'answer_variation_missing',
    ])
    expect(candidate.bars).toEqual([])
  })

  // @test-link [[rule_preserve_metrical_anchor]]
  it('audits every candidate-level stable code from independently generated valid output', () => {
    const cases: ReadonlyArray<{
      readonly name: string
      readonly candidate: () => Mutable<UnindexedRhythmCandidate> | Mutable<RhythmCandidate>
      readonly mutate: (
        candidate: Mutable<UnindexedRhythmCandidate> | Mutable<RhythmCandidate>,
      ) => void
      readonly expected: readonly (typeof candidateCodes)[number][]
    }> = [
      {
        name: 'measure count',
        candidate: () => mutableCandidate(),
        mutate: (candidate) => candidate.bars.pop(),
        // Losing bar 4 also lowers rests and removes the final answer comparison target.
        expected: [
          'invalid_measure_count',
          'invalid_phrase_duration',
          'silence_budget_violation',
          'transform_algebra_violation',
          'answer_similarity_violation',
          'answer_variation_missing',
        ],
      },
      {
        name: 'measure tiling',
        candidate: () => mutableCandidate(),
        mutate: (candidate) => {
          candidate.bars[0]!.events[0]!.startTick = 1
        },
        // Displacing bar 0's first event off tick 0 also breaks the phrase-opening downbeat.
        expected: ['invalid_measure_tiling', 'first_note_off_downbeat'],
      },
      {
        name: 'phrase duration',
        candidate: () => mutableCandidate(),
        mutate: (candidate) => {
          candidate.bars[0]!.events.find((event) => event.kind === 'note')!.durationTicks += 1
        },
        expected: ['invalid_measure_tiling', 'invalid_phrase_duration'],
      },
      {
        name: 'positive duration',
        candidate: () => mutableCandidate(),
        mutate: (candidate) => {
          candidate.bars[0]!.events[0]!.durationTicks = 0
        },
        expected: ['invalid_measure_tiling', 'invalid_phrase_duration', 'non_positive_duration'],
      },
      {
        name: 'nominal provenance',
        candidate: () => mutableCandidate(),
        mutate: (candidate) => {
          candidate.bars[0]!.events[0]!.sourceCells[0]!.catalog.density = 'Quarter'
        },
        expected: ['invalid_nominal_provenance'],
      },
      {
        name: 'density attack band',
        candidate: () => mutableCandidate(),
        mutate: (candidate) => {
          candidate.input.noteDensity = 'Quarter'
        },
        expected: ['invalid_nominal_provenance', 'density_attack_band_violation'],
      },
      {
        name: 'mixed duration coverage',
        candidate: () => mutableCandidate(),
        mutate: (candidate) => {
          candidate.input.noteDensity = 'Mixed'
        },
        expected: ['invalid_nominal_provenance', 'mixed_duration_class_coverage_violation'],
      },
      {
        name: 'silence budget and shape',
        candidate: () => mutableCandidate(),
        mutate: (candidate) => {
          candidate.input.silenceDensity = 'Breath-heavy'
        },
        expected: ['silence_budget_violation', 'silence_shape_violation'],
      },
      {
        name: 'all-rest measure',
        candidate: () => mutableCandidate(),
        mutate: (candidate) => {
          for (const event of candidate.bars[0]!.events) event.kind = 'rest'
        },
        // Turning bar 0's events all to rests also removes its downbeat attack.
        expected: [
          'density_attack_band_violation',
          'silence_budget_violation',
          'all_rest_measure',
          'rest_total_changed',
          'metrical_anchor_missing',
          'first_note_off_downbeat',
        ],
      },
      {
        name: 'rest duration limit',
        candidate: () => mutableCandidate(),
        mutate: (candidate) => {
          firstEvent(candidate, 'rest').durationTicks = 9
        },
        expected: [
          'invalid_measure_tiling',
          'invalid_phrase_duration',
          'silence_budget_violation',
          'rest_duration_limit_violation',
          'rest_total_changed',
        ],
      },
      {
        name: 'syncopation count',
        candidate: () => mutableCandidate(),
        mutate: (candidate) => {
          candidate.input.syncopation = 'Occasional offbeats'
        },
        expected: ['syncopation_count_violation'],
      },
      {
        name: 'syncopation type',
        candidate: () => mutableCandidate({ syncopation: 'Occasional offbeats' }),
        mutate: (candidate) => {
          candidate.transforms.find((descriptor) =>
            descriptor.roles.includes('syncopation'),
          )!.case = 'note_to_note'
        },
        // Reclassifying the only tied-sustain descriptor also leaves its rendered continuation reattacked.
        expected: ['syncopation_type_violation', 'attack_count_changed'],
      },
      {
        name: 'transform algebra',
        candidate: () => mutableCandidate(),
        mutate: (candidate) => {
          candidate.transforms[0]!.grammarVersion = 'wrong-version' as 'rhythm-mvp-v1'
        },
        expected: ['transform_algebra_violation'],
      },
      {
        name: 'transform overlap',
        candidate: () =>
          mutableCandidate(
            { tensionArc: 'Build', silenceDensity: 'Conversational' },
            (item) => item.transforms.filter(answerOnly).length === 2,
          ),
        mutate: (candidate) => {
          candidate.transforms[1]!.affectedAddresses = candidate.transforms[0]!.affectedAddresses
        },
        expected: [
          'transform_algebra_violation',
          'transform_overlap_violation',
          'attack_count_changed',
        ],
      },
      {
        name: 'attack preservation without reattack',
        candidate: () => mutableCandidate(),
        mutate: (candidate) => {
          const notes = candidate.bars[0]!.events.filter((event) => event.kind === 'note')
          notes[0]!.tieChainId = 'audit-tie'
          notes[1]!.tieChainId = 'audit-tie'
          notes[1]!.tieContinuation = true
        },
        expected: ['attack_count_changed'],
      },
      {
        name: 'rest total preservation',
        candidate: () =>
          mutableCandidate({}, (item) =>
            item.bars[0]!.events.some((event) =>
              event.sourceCells.some(
                (cell) =>
                  cell.kind === 'rest' && cell.address.beatIndex !== item.recurrence.sourceBeat,
              ),
            ),
          ),
        mutate: (candidate) => {
          const restSource = candidate.bars[0]!.events.flatMap((event) => event.sourceCells).find(
            (cell) =>
              cell.kind === 'rest' && cell.address.beatIndex !== candidate.recurrence.sourceBeat,
          )!
          restSource.durationTicks += 1
        },
        expected: ['invalid_nominal_provenance', 'rest_total_changed'],
      },
      {
        name: 'metrical anchor',
        candidate: () =>
          mutableCandidate({}, (item) => {
            const restTicks = item.bars
              .flatMap((bar) => bar.events)
              .filter((event) => event.kind === 'rest')
              .reduce((total, event) => total + event.durationTicks, 0)
            const anchorTicks = item.bars[0]!.events.filter(
              (event) => event.kind === 'note' && (event.startTick === 0 || event.startTick === 8),
            ).reduce((total, event) => total + event.durationTicks, 0)
            return restTicks + anchorTicks <= 8
          }),
        mutate: (candidate) => {
          for (const event of candidate.bars[0]!.events)
            if (event.kind === 'note' && (event.startTick === 0 || event.startTick === 8))
              event.kind = 'rest'
        },
        // Clearing every anchor note also clears bar 0's own downbeat attack at tick 0.
        expected: ['rest_total_changed', 'metrical_anchor_missing', 'first_note_off_downbeat'],
      },
      {
        name: 'Active anchor ratio',
        candidate: () => mutableCandidate({ syncopation: 'Occasional offbeats' }),
        mutate: (candidate) => {
          candidate.input.syncopation = 'Active displacement'
        },
        expected: ['syncopation_count_violation', 'active_anchor_ratio_violation'],
      },
      {
        name: 'tie chain',
        candidate: () => mutableCandidate(),
        mutate: (candidate) => {
          firstEvent(candidate, 'note').tieContinuation = true
        },
        // Bar 0's first note is also the phrase's downbeat attack, so tying it off also
        // removes the fresh downbeat note attack.
        expected: ['attack_count_changed', 'first_note_off_downbeat', 'invalid_tie_chain'],
      },
      {
        name: 'exact recurrence witness',
        candidate: () => mutableCandidate(),
        mutate: (candidate) => {
          candidate.recurrence.sourceCellAddresses = []
        },
        expected: ['recurrence_witness_invalid'],
      },
      {
        name: 'substitution recurrence witness',
        candidate: () => mutableCandidate({}, (item) => item.recurrence.kind === 'substitute'),
        mutate: (candidate) => {
          if (candidate.recurrence.kind === 'substitute')
            candidate.recurrence.substitution.before.durationTicks += 1
        },
        expected: ['recurrence_witness_invalid'],
      },
      {
        name: 'answer transform count',
        candidate: () => mutableCandidate(),
        mutate: (candidate) => {
          candidate.transforms = []
        },
        expected: ['attack_count_changed', 'answer_transform_count_violation'],
      },
      {
        name: 'answer similarity',
        candidate: () => mutableCandidate(),
        mutate: (candidate) => {
          for (const event of candidate.bars.slice(2).flatMap((bar) => bar.events))
            if (event.kind === 'note') event.startTick = 15
        },
        expected: [
          'invalid_measure_tiling',
          'metrical_anchor_missing',
          'answer_similarity_violation',
        ],
      },
      {
        name: 'answer variation',
        candidate: () => mutableCandidate(),
        mutate: (candidate) => {
          candidate.bars[3]!.events = structuredClone(candidate.bars[1]!.events)
        },
        expected: [
          'invalid_nominal_provenance',
          'transform_algebra_violation',
          'answer_variation_missing',
        ],
      },
      {
        name: 'transform order',
        candidate: () =>
          mutableCandidate(
            { tensionArc: 'Build', silenceDensity: 'Conversational' },
            (item) => item.transforms.filter(answerOnly).length === 2,
          ),
        mutate: (candidate) => {
          ;[candidate.transforms[0], candidate.transforms[1]] = [
            candidate.transforms[1]!,
            candidate.transforms[0]!,
          ]
        },
        expected: ['transform_order_violation'],
      },
      {
        name: 'identity mismatch',
        candidate: () => structuredClone(generatedCandidate()) as Mutable<RhythmCandidate>,
        mutate: (candidate) => {
          ;(candidate as Mutable<RhythmCandidate>).identity = 'incorrect'
        },
        expected: ['candidate_identity_mismatch'],
      },
    ]

    const exercised = new Set<(typeof candidateCodes)[number]>()
    for (const testCase of cases) {
      const candidate = testCase.candidate()
      testCase.mutate(candidate)
      const actual = validateRhythmCandidate(candidate)
      actual.forEach((code) => exercised.add(code as (typeof candidateCodes)[number]))
      expect(actual, testCase.name).toEqual(testCase.expected)
    }
    expect([...exercised].sort()).toEqual([...candidateCodes].sort())
  })

  // @test-link [[rule_phrase_starts_on_downbeat]]
  it('rejects a phrase whose bar 0 opens on a rest, a late note attack, or a tie continuation', () => {
    const restOpening = mutableCandidate()
    restOpening.bars[0]!.events[0]!.kind = 'rest'
    expect(validateRhythmCandidate(restOpening)).toContain('first_note_off_downbeat')

    const lateOpening = mutableCandidate()
    lateOpening.bars[0]!.events[0]!.startTick = 2
    expect(validateRhythmCandidate(lateOpening)).toContain('first_note_off_downbeat')

    const tiedOpening = mutableCandidate()
    tiedOpening.bars[0]!.events[0]!.tieContinuation = true
    expect(validateRhythmCandidate(tiedOpening)).toContain('first_note_off_downbeat')

    const onTime = mutableCandidate()
    expect(validateRhythmCandidate(onTime)).not.toContain('first_note_off_downbeat')
  })

  it('reports independently constructed domain duplicate, index, identity, and replay failures', () => {
    const raw = mutableCandidate()
    const candidate = { ...raw, candidateIndex: 2, identity: 'duplicate' } as RhythmCandidate
    let calls = 0
    const domain: RhythmCandidateDomain = {
      kind: 'rhythm_candidate_domain',
      grammarVersion: 'rhythm-mvp-v1',
      input: raw.input,
      candidates: function* () {
        calls += 1
        yield candidate
        yield candidate
        if (calls > 1) yield { ...candidate, candidateIndex: 3 }
      },
    }
    expect(validateRhythmCandidateDomain(domain)).toEqual([
      'candidate_index_invalid',
      'candidate_identity_duplicate',
      'candidate_identity_mismatch',
      'domain_replay_mismatch',
    ])
    expect(normalizedRhythmIdentity(raw)).not.toBe('duplicate')
  })

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
