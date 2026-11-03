// @vitest-environment node
/**
 * The steering block's rhythm order in generation (master spec C5.9, C7.1, C8), over the doodle
 * set: each doodle's block, built as Jam builds it at each drift position, is put in a request on
 * the doodle's rhythm controls. The walk stays v3.1's, harmony-major, so the chord plan the search
 * settles on is the one it settles on without a block (the first any rhythm makes a phrase with);
 * with that chord plan, the chosen rhythm lies in the band whenever a rhythm in the band makes a
 * phrase with it, and Free keeps v3.1's phrase. With the rhythm lock on and nothing locked yet
 * (a Jam's phrase 1) the chosen rhythm is the nearest the doodle among those making a phrase with
 * that chord plan, whatever the band. A candidate is compared with the doodle as heard (a rest
 * start right after another rest dropped), read here on its own.
 */
import { describe, expect, it } from 'vitest'

import { makeGenerationControls } from '@/domain/controls/generation-controls'
import { NEUTRAL_FIGURE_LEVELS } from '@/domain/figures/figure-levels'
import {
  createGenerationIntent,
  type GenerationIntent,
} from '@/domain/generation/generation-intent'
import { makeRequestId } from '@/domain/generation/generation-request'
import { SHARED_CANONICAL_RHYTHM_DOMAIN_MEMO } from '@/domain/generation/orchestration/canonical-rhythm-domain'
import {
  generatePhrase,
  rhythmDomainInputOf,
} from '@/domain/generation/orchestration/generation-orchestrator'
import type { GenerationOutcome } from '@/domain/generation/orchestration/orchestration-types'
import { resolveCoreRequests } from '@/domain/generation/orchestration/request-resolution'
import { GENERATION_SEARCH_POLICY_V1 } from '@/domain/generation/orchestration/search-ledger'
import { searchWindow } from '@/domain/generation/orchestration/window-search'
import type { RequestRhythmLock } from '@/domain/generation/request-rhythm-lock'
import type {
  SteeringBand,
  SteeringBlock,
  SteeringTargetRhythm,
} from '@/domain/generation/steering-block'
import type { HarmonyCandidate } from '@/domain/harmony/harmony-types'
import { C_KEYBOARD_PROFILE } from '@/domain/profile/instrument-profiles'
import { deriveRegisterWindowCandidates } from '@/domain/profile/register-window-derivation'
import { makeSeed } from '@/domain/random/seed'
import { rhythmStarts, type MeasureStarts } from '@/domain/rhythm/rhythm-bars'
import { measureBand, rhythmDistance } from '@/domain/rhythm/rhythm-distance'
import { isNoLegalRhythmPlan } from '@/domain/rhythm/rhythm-planner'
import type { RhythmCandidate } from '@/domain/rhythm/rhythm-types'
import { readDoodleControls } from '@/jam/doodle-controls'
import { buildSteeringBlock, type JamDrift } from '@/jam/steering-block-builder'

import { loadDoodleSet, type DoodleFixture } from '../../../jam/doodle-set'
import { lockPending } from '../../rhythm/rhythm-lock-fixture'

type Success = Extract<GenerationOutcome, { kind: 'generation_success' }>

/** Generating the whole set at every position takes some seconds; a loaded machine far longer. */
const SET_TIMEOUT_MS = 180_000

const SEEDS = [3, 8] as const
const DOODLES = loadDoodleSet()
const WINDOWS = deriveRegisterWindowCandidates(
  C_KEYBOARD_PROFILE.concertRange,
  C_KEYBOARD_PROFILE.registerWindows,
)

/** Intent: a request on the doodle's rhythm controls, carrying the block and the lock if given. */
function intentOf(
  doodle: DoodleFixture,
  seed: number,
  extras: { readonly steering?: SteeringBlock; readonly rhythmLock?: RequestRhythmLock } = {},
): GenerationIntent {
  const readings = readDoodleControls(doodle.quantized, WINDOWS)
  const controls = makeGenerationControls({
    tempo: 90,
    tonalCenter: 'C',
    collection: 'Major',
    harmonicMotion: 'Gentle diatonic',
    tension: 'Build',
    noteDensity: readings.noteDensity.value,
    rhythmicVariety: readings.rhythmicVariety.value,
    syncopation: readings.syncopation.value,
    silenceDensity: readings.silenceDensity.value,
    contour: 'Arch',
    register: 'Middle',
    leapiness: 'Shaped',
    arpeggioChaos: 'Varied',
    instrumentProfileId: 'c-keyboard',
  })
  return createGenerationIntent({
    requestId: makeRequestId(`rhythm-steering-${doodle.name}-${seed}`),
    seed: makeSeed(seed),
    controls,
    figureLevels: NEUTRAL_FIGURE_LEVELS,
    ...extras,
  })
}

/** Intent: require a success. */
function success(outcome: GenerationOutcome, where: string): Success {
  if (outcome.kind !== 'generation_success')
    throw new Error(`Expected a phrase for ${where}: ${outcome.code}`)
  return outcome
}

/** Intent: a measure's starts as heard: a rest start right after another rest is dropped. */
function heard(measure: MeasureStarts): MeasureStarts {
  return measure.filter(
    (start, index) => start.kind === 'note' || measure[index - 1]?.kind !== 'rest',
  )
}

/** Intent: a rhythm's measures as heard. */
function heardRhythm(rhythm: RhythmCandidate): readonly MeasureStarts[] {
  return rhythmStarts(rhythm.bars).map(heard)
}

/** Intent: whether every measure of the rhythm, as heard, lies inside the target's band. */
function insideBand(rhythm: RhythmCandidate, target: SteeringTargetRhythm): boolean {
  const admitted: Readonly<Record<SteeringBand, readonly string[]>> = {
    close: ['Same', 'Close'],
    near: ['Same', 'Close', 'Near'],
    unbounded: ['Same', 'Close', 'Near', 'beyond'],
  }
  return heardRhythm(rhythm).every((measure, index) =>
    admitted[target.band].includes(measureBand(measure, target.measures[index]!)),
  )
}

/** Intent: the total edits from the rhythm, as heard, to the target. */
function editsToTarget(rhythm: RhythmCandidate, target: SteeringTargetRhythm): number {
  return rhythmDistance(heardRhythm(rhythm), target.measures)
}

/** Intent: the intent's whole rhythm domain, in domain order. */
function domainOf(intent: GenerationIntent): readonly RhythmCandidate[] {
  const domain = SHARED_CANONICAL_RHYTHM_DOMAIN_MEMO.lookup(rhythmDomainInputOf(intent))
  if (isNoLegalRhythmPlan(domain)) throw new Error('Fixture setup: the domain has no plan.')
  return domain.candidates
}

/**
 * Intent: whether some of the rhythms makes a phrase with the chord plan, searched as the window
 * would search that one chord plan with those rhythms alone.
 */
function anyMakesAPhrase(
  intent: GenerationIntent,
  harmony: HarmonyCandidate,
  rhythms: readonly RhythmCandidate[],
): boolean {
  if (rhythms.length === 0) return false
  const report = searchWindow({
    intent,
    request: resolveCoreRequests(intent)[0]!,
    rankedHarmony: [harmony],
    rankedRhythm: {
      kind: 'ranked_rhythm_cache',
      grammarVersion: rhythms[0]!.grammarVersion,
      domainSize: rhythms.length,
      candidates: rhythms,
    },
    searchPolicy: GENERATION_SEARCH_POLICY_V1,
  })
  if (report.outcome.kind === 'window_search_limit_exceeded')
    throw new Error('Fixture setup: the check ran out of fuel.')
  return report.outcome.kind === 'window_success'
}

/** One doodle and seed: the request without a block, and its phrase. */
interface Case {
  readonly doodle: DoodleFixture
  readonly seed: number
  readonly where: string
  readonly bare: Success
}

/** Intent: every doodle of the set at every seed, with its phrase generated without a block. */
function cases(): readonly Case[] {
  return DOODLES.flatMap((doodle) =>
    SEEDS.map((seed) => {
      const where = `${doodle.name} seed ${seed}`
      return { doodle, seed, where, bare: success(generatePhrase(intentOf(doodle, seed)), where) }
    }),
  )
}

const CASES = cases()

// @test-link [[rule_jam_rhythm_ordered_by_doodle]]
// @test-link [[rule_jam_drift_positions]]
// @test-link [[rule_doodle_only_orders_candidates]]
// @test-link [[module_rhythm_steering]]
describe('a Jam request’s rhythm, the lock off', () => {
  it(
    'lies in the band whenever a rhythm in it makes a phrase with the chord plan the search settles on',
    () => {
      let movedIntoBand = 0
      let checked = 0
      for (const { doodle, seed, where, bare } of CASES)
        for (const drift of ['Close', 'Near'] as const) {
          const steering = buildSteeringBlock(doodle.quantized, drift)
          const intent = intentOf(doodle, seed, { steering })
          const steered = success(generatePhrase(intent), `${where} ${drift}`)
          const target = steering.targetRhythm
          const harmony = steered.provenance.harmony
          expect(harmony.identity, `${where} ${drift}`).toBe(bare.provenance.harmony.identity)
          checked += 1
          if (insideBand(steered.provenance.rhythm, target)) {
            if (!insideBand(bare.provenance.rhythm, target)) movedIntoBand += 1
            continue
          }
          const domain = domainOf(intent)
          const inBand = domain.filter((rhythm) => insideBand(rhythm, target))
          expect(anyMakesAPhrase(intent, harmony, inBand), `${where} ${drift}`).toBe(false)
          // Outside the band, fewer total edits come first.
          const chosen = editsToTarget(steered.provenance.rhythm, target)
          const nearer = domain.filter((rhythm) => editsToTarget(rhythm, target) < chosen)
          expect(anyMakesAPhrase(intent, harmony, nearer), `${where} ${drift}`).toBe(false)
        }
      expect(checked).toBe(CASES.length * 2)
      // Most of the set's doodles are far from every rhythm their settings allow (only
      // approached), but some blocks bring the rhythm into the band where v3.1's was outside it.
      expect(movedIntoBand).toBeGreaterThan(0)
    },
    SET_TIMEOUT_MS,
  )

  it(
    "keeps v3.1's phrase for the seed under Free's block",
    () => {
      for (const { doodle, seed, where, bare } of CASES) {
        const steering = buildSteeringBlock(doodle.quantized, 'Free')
        const steered = success(generatePhrase(intentOf(doodle, seed, { steering })), where)
        expect(steered.result, where).toStrictEqual(bare.result)
        expect(steered.provenance.rhythm.identity, where).toBe(bare.provenance.rhythm.identity)
      }
    },
    SET_TIMEOUT_MS,
  )
})

// @test-link [[rule_jam_rhythm_ordered_by_doodle]]
// @test-link [[rule_jam_drift_positions]]
// @test-link [[module_rhythm_steering]]
describe('a Jam’s phrase 1, the lock on with nothing locked yet', () => {
  it(
    'takes the rhythm nearest the doodle among those making a phrase with that chord plan, whatever the band',
    () => {
      for (const { doodle, seed, where, bare } of CASES) {
        const rhythms = (['Close', 'Near', 'Free'] as const satisfies readonly JamDrift[]).map(
          (drift) => {
            const steering = buildSteeringBlock(doodle.quantized, drift)
            const intent = intentOf(doodle, seed, { steering, rhythmLock: lockPending() })
            const outcome = success(generatePhrase(intent), `${where} ${drift}`)
            expect(outcome.provenance.harmony.identity).toBe(bare.provenance.harmony.identity)
            expect(Object.hasOwn(outcome.provenance, 'rhythmLockOutcome')).toBe(false)
            return { intent, outcome, target: steering.targetRhythm }
          },
        )
        const [close, ...others] = rhythms
        for (const other of others)
          expect(other.outcome.provenance.rhythm.identity, where).toBe(
            close!.outcome.provenance.rhythm.identity,
          )
        const { intent, outcome, target } = close!
        const chosen = editsToTarget(outcome.provenance.rhythm, target)
        const nearer = domainOf(intent).filter((rhythm) => editsToTarget(rhythm, target) < chosen)
        expect(anyMakesAPhrase(intent, outcome.provenance.harmony, nearer), where).toBe(false)
      }
    },
    SET_TIMEOUT_MS,
  )
})
