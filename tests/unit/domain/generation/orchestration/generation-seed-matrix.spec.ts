/**
 * A deterministic end-to-end seed matrix over the real generatePhrase pipeline: every instrument
 * profile (c-keyboard, bb-tenor, eb-alto) x every register choice (Low, Middle, High, Varying) x
 * three representative control sets x two seeds, run against the production search policy and
 * window-search deps. Each cell independently re-validates the outcome with
 * validateGenerationResult, cross-checks the retained request against resolveCoreRequests, checks
 * every sounding pitch against both the request's resolved register window and the instrument's
 * active concert range, and reproduces the outcome bit-for-bit on a second call. A final matrix-
 * wide check asserts a compact per-cell fingerprint (selected register + attack MIDIs) is
 * identical across the two passes gathered while running each cell, without a hard-coded golden.
 * The three control sets deliberately avoid 'Mixed' note density and 'Active displacement'
 * syncopation (which enumerate slowly) and Edge tension paired with Static harmonic motion
 * (which has no legal tension binding), so the whole matrix stays fast.
 */

import { describe, expect, it } from 'vitest'

import {
  makeGenerationControls,
  type GenerationControls,
  type MusicalProfile,
} from '@/domain/controls/generation-controls'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeRequestId, type GenerationRequest } from '@/domain/generation/generation-request'
import { generatePhrase } from '@/domain/generation/orchestration/generation-orchestrator'
import { resolveCoreRequests } from '@/domain/generation/orchestration/request-resolution'
import { validateGenerationResult } from '@/domain/validation/generation-result-validator'
import { makeSeed, type Seed } from '@/domain/random/seed'
import type { InstrumentProfileId } from '@/domain/profile/instrument-profile'
import type { RegisterChoice } from '@/domain/profile/register-intent'
import type { Measure } from '@/domain/events/measure'

/** One representative, fast-to-search control set covering a distinct corner of the grammar. */
interface ControlSetSpec {
  readonly name: string
  readonly musicalProfile: MusicalProfile
  /** Intent: build this set's full GenerationControls for one register/instrument-profile pair. */
  readonly build: (
    register: RegisterChoice,
    instrumentProfileId: InstrumentProfileId,
  ) => GenerationControls
}

const CONTROL_SETS: readonly ControlSetSpec[] = [
  {
    name: 'A (Neutral, C Major, gentle diatonic, settled)',
    musicalProfile: 'Neutral',
    build: (register, instrumentProfileId) =>
      makeGenerationControls({
        tempo: 90,
        tonalCenter: 'C',
        collection: 'Major',
        harmonicMotion: 'Gentle diatonic',
        tension: 'Settled',
        noteDensity: 'Quarter',
        syncopation: 'Straight',
        silenceDensity: 'Sparse',
        contour: 'Arch',
        register,
        leapiness: 'Shaped',
        arpeggioChaos: 'Predictable',
        instrumentProfileId,
      }),
  },
  {
    name: 'B (Jazz, F Dorian, active diatonic, build)',
    musicalProfile: 'Jazz',
    build: (register, instrumentProfileId) =>
      makeGenerationControls({
        tempo: 90,
        tonalCenter: 'F',
        collection: 'Dorian',
        harmonicMotion: 'Active diatonic',
        tension: 'Build',
        noteDensity: 'Eighth',
        syncopation: 'Occasional offbeats',
        silenceDensity: 'Conversational',
        contour: 'Rising',
        register,
        leapiness: 'Leaping',
        arpeggioChaos: 'Varied',
        instrumentProfileId,
      }),
  },
  {
    name: 'C (Neutral, A Aeolian, static, lift, sixteenth)',
    musicalProfile: 'Neutral',
    build: (register, instrumentProfileId) =>
      makeGenerationControls({
        tempo: 90,
        tonalCenter: 'A',
        collection: 'Aeolian',
        harmonicMotion: 'Static',
        tension: 'Lift',
        noteDensity: 'Sixteenth',
        syncopation: 'Straight',
        silenceDensity: 'Breath-heavy',
        contour: 'Wandering',
        register,
        leapiness: 'Angular',
        arpeggioChaos: 'Chaotic',
        instrumentProfileId,
      }),
  },
]

const INSTRUMENT_PROFILE_IDS: readonly InstrumentProfileId[] = ['c-keyboard', 'bb-tenor', 'eb-alto']
const REGISTER_CHOICES: readonly RegisterChoice[] = ['Low', 'Middle', 'High', 'Varying']
const SEEDS: readonly Seed[] = [makeSeed(7), makeSeed(13)]

/** One matrix cell's full identity, before it is run. */
interface MatrixCell {
  readonly instrumentProfileId: InstrumentProfileId
  readonly register: RegisterChoice
  readonly set: ControlSetSpec
  readonly seed: Seed
  readonly label: string
}

/** Intent: build the full profile x register x control-set x seed matrix, in a fixed, readable order. */
function buildMatrix(): readonly MatrixCell[] {
  const cells: MatrixCell[] = []
  for (const instrumentProfileId of INSTRUMENT_PROFILE_IDS) {
    for (const register of REGISTER_CHOICES) {
      for (const set of CONTROL_SETS) {
        for (const seed of SEEDS) {
          cells.push({
            instrumentProfileId,
            register,
            set,
            seed,
            label: `${instrumentProfileId} / ${register} / ${set.name} / seed ${seed}`,
          })
        }
      }
    }
  }
  return cells
}

const MATRIX: readonly MatrixCell[] = buildMatrix()

/** Intent: build one matrix cell's real, boundary-constructed GenerationIntent. */
function buildCellIntent(cell: MatrixCell): GenerationIntent {
  const controls = cell.set.build(cell.register, cell.instrumentProfileId)
  return createGenerationIntent({
    requestId: makeRequestId(
      `seed-matrix-${cell.instrumentProfileId}-${cell.register}-${cell.set.name}-${cell.seed}`,
    ),
    seed: cell.seed,
    controls,
    musicalProfile: { musicalProfile: cell.set.musicalProfile, isCustom: true },
  })
}

/** Intent: every chronological attack (non-tie-continuation note) MIDI pitch across a timeline. */
function attackMidis(measures: readonly Measure[]): readonly number[] {
  const midis: number[] = []
  for (const measure of measures) {
    for (const event of measure.events) {
      if (event.kind === 'note' && !event.tieContinuation) midis.push(event.pitch)
    }
  }
  return midis
}

/** Intent: a compact, order-preserving fingerprint of one successful cell's resolved outcome. */
function fingerprint(
  cell: MatrixCell,
  request: GenerationRequest,
  midis: readonly number[],
): string {
  return `${cell.label} => ${request.register}:${midis.join(',')}`
}

/** Fingerprints gathered while running each cell's own two calls, compared once at the end. */
const firstPassFingerprints: string[] = []
const secondPassFingerprints: string[] = []

/**
 * Intent: run one matrix cell's real intent through generatePhrase twice, asserting every
 * documented per-cell fact against the first call and bit-for-bit reproduction against the
 * second, and recording both calls' fingerprints for the matrix-wide determinism check.
 */
function runAndAssertCell(cell: MatrixCell): void {
  const intent = buildCellIntent(cell)
  const first = generatePhrase(intent)
  const second = generatePhrase(intent)

  expect(second).toEqual(first)
  expect(first.kind).toBe('generation_success')
  if (first.kind !== 'generation_success') return

  const coreRequests = resolveCoreRequests(intent)

  if (cell.register === 'Varying') {
    expect(first.request.register).toBe(first.diagnostics.selectedRegister)
    expect(first.diagnostics.successfulRegisters).toContain(first.request.register)
  } else {
    expect(first.request.register).toBe(cell.register)
  }

  const matchingCoreRequest = coreRequests.find(
    (request) => request.register === first.request.register,
  )
  expect(matchingCoreRequest).toBeDefined()
  expect(first.request).toEqual(matchingCoreRequest)

  expect(first.result.requestId).toBe(first.request.requestId)
  expect(first.result.seed).toBe(first.request.seed)

  const revalidated = validateGenerationResult({
    intent,
    request: first.request,
    result: first.result,
    provenance: first.provenance,
  })
  expect(revalidated.kind).toBe('valid_generation_result')

  const midis = attackMidis(first.result.timeline.measures)
  expect(midis.length).toBeGreaterThan(0)

  const { registerWindow, activeConcertRange } = first.request
  expect(activeConcertRange).toEqual(intent.instrumentProfile.concertRange)
  for (const midi of midis) {
    expect(midi).toBeGreaterThanOrEqual(registerWindow.minMidi)
    expect(midi).toBeLessThanOrEqual(registerWindow.maxMidi)
    expect(midi).toBeGreaterThanOrEqual(activeConcertRange.minMidi)
    expect(midi).toBeLessThanOrEqual(activeConcertRange.maxMidi)
  }

  firstPassFingerprints.push(fingerprint(cell, first.request, midis))
  if (second.kind === 'generation_success') {
    secondPassFingerprints.push(
      fingerprint(cell, second.request, attackMidis(second.result.timeline.measures)),
    )
  }
}

// @test-link [[service_generation_orchestration]]
describe('generatePhrase seed matrix', () => {
  it.each(MATRIX.map((cell) => ({ cell, label: cell.label })))(
    '$label succeeds, validates, resolves to its core request, stays in range, and reproduces',
    ({ cell }) => {
      runAndAssertCell(cell)
    },
  )

  it('is fully deterministic across the two passes gathered while running every cell', () => {
    expect(firstPassFingerprints).toHaveLength(MATRIX.length)
    expect(secondPassFingerprints).toEqual(firstPassFingerprints)
  })
})
