/**
 * Rhythm validation, structure side: stable ordered failures that never repair a candidate, the
 * audit that every candidate-level stable code fires from real generated output, the bar-0
 * downbeat rule, and the candidate-domain duplicate, index, identity and replay checks.
 */
import { describe, expect, it } from 'vitest'

import { validateRhythmCandidateDomain } from '@/domain/rhythm/rhythm-domain-validator'
import { normalizedRhythmIdentity } from '@/domain/rhythm/rhythm-identity'
import { validateRhythmCandidate } from '@/domain/rhythm/rhythm-validator'
import type {
  RhythmCandidate,
  RhythmCandidateDomain,
  UnindexedRhythmCandidate,
} from '@/domain/rhythm/rhythm-types'
import {
  answerOnly,
  baseInput,
  candidateCodes,
  firstEvent,
  generatedCandidate,
  mutableCandidate,
  type Mutable,
} from './rhythm-validator-fixture'

// @test-link [[module_rhythm_domain_validation]]
describe('rhythm validation', () => {
  it('returns stable ordered failures and never repairs malformed candidates', () => {
    const candidate: UnindexedRhythmCandidate = {
      grammarVersion: 'rhythm-mvp-v2',
      input: baseInput,
      bars: [],
      recurrence: {
        kind: 'exact' as const,
        grammarVersion: 'rhythm-mvp-v2',
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
      'rhythmic_variety_violation',
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
        expected: [
          'invalid_nominal_provenance',
          'density_attack_band_violation',
          'rhythmic_variety_violation',
        ],
      },
      {
        name: 'rhythmic variety',
        // A `Slightly varied` Eighth candidate containing one of the extra beat cells (e.g. the N4
        // or N3-N1 cells `rhythm-variety.ts` appends past the base catalog) has a q=2 attack share
        // under Strict's 1.0 floor, so relabeling it Strict without changing its bars violates the
        // dominance floor.
        candidate: () =>
          mutableCandidate({}, (item) =>
            item.bars.some((bar) =>
              bar.events.some((event) => event.kind === 'note' && event.nominalDurationTicks !== 2),
            ),
          ),
        mutate: (candidate) => {
          candidate.input.rhythmicVariety = 'Strict'
        },
        expected: ['rhythmic_variety_violation'],
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
          candidate.transforms[0]!.grammarVersion = 'wrong-version' as 'rhythm-mvp-v2'
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
        // The specific candidate the predicate finds first shifted under `rhythm-mvp-v2`'s
        // enumeration order (rhythmicVariety is now part of that search), so this overlap no
        // longer happens to also change the attack count; `attack_count_changed` is still
        // exercised by the dedicated cases above.
        expected: ['transform_algebra_violation', 'transform_overlap_violation'],
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
      grammarVersion: 'rhythm-mvp-v2',
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
})
