/**
 * The Step 7 whole-window search ledger: a versioned, wall-clock-independent fuel allowance and
 * an immutable running-spend ledger that a window search consults before every unit of search
 * work (a visited harmony/rhythm pair, an attempted concrete tension binding, a pitch-search
 * `advance` call) and exhausts as a typed failure rather than looping unbounded.
 */

import { deepFreeze } from '../../events/deep-freeze'
import type { GenerationSearchPolicy, GenerationSearchPolicyVersion } from './orchestration-types'

/** Engineering policy default: the v1 whole-window search fuel allowance. */
// @spec-link [[mechanic_pitch_search_policy]]
export const DEFAULT_WINDOW_SEARCH_FUEL = 250_000

/** Typed failure for a rejected search policy construction or ledger operation. */
// @spec-link [[mechanic_pitch_search_policy]]
export class GenerationSearchPolicyError extends Error {
  readonly kind = 'GenerationSearchPolicyError' as const

  constructor(message: string) {
    super(message)
    this.name = 'GenerationSearchPolicyError'
  }
}

/** Intent: reject a fuel allowance that is not a strictly positive integer. */
function assertPositiveIntegerFuel(windowFuel: number): void {
  if (!Number.isInteger(windowFuel) || windowFuel <= 0) {
    throw new GenerationSearchPolicyError(
      `windowFuel must be a positive integer, got ${windowFuel}.`,
    )
  }
}

/**
 * Engineering policy default: the whole-window search fuel allowance of a generation with carry-in.
 * Set with a margin above every successful carry-in attempt measured: on 2026-10-07 the full
 * deadline sweep's 3,366 distinct successful carry-in attempts used at most 131,137 units (99.9th
 * percentile 73,646, 99th percentile 11,276), and 160,000 is 22% above that maximum. The allowance
 * counts search steps, not time, so it does not by itself bound how long an attempt takes.
 */
// @spec-link [[mechanic_pitch_search_policy]]
export const CARRY_IN_WINDOW_SEARCH_FUEL = 160_000

/**
 * Intent: construct an immutable, deep-frozen search policy from an optional fuel override,
 * defaulting to DEFAULT_WINDOW_SEARCH_FUEL, under an optional version, defaulting to v1. Rejects a
 * non-positive or non-integer allowance as a typed GenerationSearchPolicyError rather than
 * clamping or coercing.
 */
// @spec-link [[mechanic_pitch_search_policy]]
export function makeGenerationSearchPolicy(
  windowFuel: number = DEFAULT_WINDOW_SEARCH_FUEL,
  version: GenerationSearchPolicyVersion = 'generation-search-v1',
): GenerationSearchPolicy {
  assertPositiveIntegerFuel(windowFuel)
  return deepFreeze({ version, windowFuel })
}

/** The v1 search policy singleton, built once at module load from the documented default. */
// @spec-link [[mechanic_pitch_search_policy]]
export const GENERATION_SEARCH_POLICY_V1: GenerationSearchPolicy = makeGenerationSearchPolicy(
  DEFAULT_WINDOW_SEARCH_FUEL,
)

/**
 * The carry-in search policy singleton, built once at module load: every generation with carry-in
 * searches under it, so a carry-in attempt that cannot succeed stops sooner and climbs the failure
 * ladder instead of using up the look-ahead deadline.
 */
// @spec-link [[mechanic_pitch_search_policy]]
// @spec-link [[rule_session_generation_failure_ladder]]
export const GENERATION_SEARCH_POLICY_CARRY_IN_V1: GenerationSearchPolicy =
  makeGenerationSearchPolicy(CARRY_IN_WINDOW_SEARCH_FUEL, 'generation-search-carry-in-v1')

/**
 * The immutable running-spend record for one window search: the ledger's policy version, its
 * fixed allowance, and the fuel units spent so far. Never carries a clock or a mutable counter;
 * every spend produces a new frozen value.
 */
// @spec-link [[mechanic_pitch_search_policy]]
export interface FuelLedger {
  readonly version: GenerationSearchPolicyVersion
  readonly allowance: number
  readonly used: number
}

/** Intent: open a fresh, immutable, zero-spent ledger for one window search under a policy. */
// @spec-link [[mechanic_pitch_search_policy]]
export function openFuelLedger(policy: GenerationSearchPolicy): FuelLedger {
  return deepFreeze({ version: policy.version, allowance: policy.windowFuel, used: 0 })
}

/** Intent: compute the fuel units still available to spend on a ledger. */
// @spec-link [[mechanic_pitch_search_policy]]
export function remainingFuel(ledger: FuelLedger): number {
  return ledger.allowance - ledger.used
}

/**
 * Intent: spend fuel units against a ledger, returning a new immutable, deep-frozen ledger with
 * the increased spend; the original ledger is left unchanged. Rejects a non-negative-integer
 * spend amount, and rejects a spend that would exceed the ledger's allowance, each as a typed
 * GenerationSearchPolicyError — an overspend attempt is a caller bug, never silently clamped.
 */
// @spec-link [[mechanic_pitch_search_policy]]
export function spendFuel(ledger: FuelLedger, units: number): FuelLedger {
  if (!Number.isInteger(units) || units < 0) {
    throw new GenerationSearchPolicyError(
      `Fuel units spent must be a non-negative integer, got ${units}.`,
    )
  }
  const used = ledger.used + units
  if (used > ledger.allowance) {
    throw new GenerationSearchPolicyError(
      `Spending ${units} fuel units would exceed the ledger allowance of ${ledger.allowance} ` +
        `(already used ${ledger.used}).`,
    )
  }
  return deepFreeze({ version: ledger.version, allowance: ledger.allowance, used })
}
