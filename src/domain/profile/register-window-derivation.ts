/**
 * Deterministic derivation of the three canonical register-window candidates (Low, Middle, High)
 * from an instrument's active concert range and its register-window policy parameters. Fixed as
 * the versioned algorithm `overlapping-three-window-v1`: pure integer arithmetic only, no
 * floating-point drift, so identical inputs always produce identical windows.
 */

import { type ActiveConcertRange } from './active-concert-range'
import { CANONICAL_REGISTER_INDEX, CANONICAL_REGISTER_ORDER, type RegisterId } from './register-id'
import { type RegisterWindow, makeRegisterWindow } from './register-window'
import { deepFreeze } from '../events/deep-freeze'

/** The versioned window-derivation algorithm identifier this module implements. */
// @spec-link [[module_register_window_resolution_primitives]]
export const REGISTER_WINDOW_ALGORITHM_V1 = 'overlapping-three-window-v1' as const

/** The register-window policy parameters a profile declares for the v1 derivation algorithm. */
// @spec-link [[module_register_window_resolution_primitives]]
export interface RegisterWindowPolicy {
  readonly algorithm: typeof REGISTER_WINDOW_ALGORITHM_V1
  readonly minimumSpan: number
  readonly widthNumerator: number
  readonly widthDenominator: number
}

/** Typed failure for an invalid attempt to derive register-window candidates. */
// @spec-link [[module_register_window_resolution_primitives]]
export class RegisterWindowDerivationError extends Error {
  readonly kind = 'RegisterWindowDerivationError' as const

  constructor(message: string) {
    super(message)
    this.name = 'RegisterWindowDerivationError'
  }
}

/** One canonical register-window candidate: a stable identity, index, and resolved window. */
// @spec-link [[module_register_window_resolution_primitives]]
export interface RegisterWindowCandidate {
  readonly id: RegisterId
  readonly canonicalIndex: number
  readonly window: RegisterWindow
}

/** Intent: integer ceiling division, never falling back to floating-point `/`. */
function ceilDiv(numerator: number, denominator: number): number {
  return Math.floor((numerator + denominator - 1) / denominator)
}

/** Intent: integer floor division, never falling back to floating-point `/`. */
function floorDiv(numerator: number, denominator: number): number {
  return Math.floor(numerator / denominator)
}

/** Intent: reject any policy whose algorithm is not the supported v1 identifier. */
function assertSupportedAlgorithm(policy: RegisterWindowPolicy): void {
  if (policy.algorithm !== REGISTER_WINDOW_ALGORITHM_V1) {
    throw new RegisterWindowDerivationError(
      `Unrecognized register-window algorithm "${String(policy.algorithm)}"; expected "${REGISTER_WINDOW_ALGORITHM_V1}".`,
    )
  }
}

/**
 * Intent: derive the three canonical register-window candidates (Low, Middle, High) for an
 * active concert range under the overlapping-three-window-v1 policy, using pure integer
 * arithmetic: W = hi - lo, S = max(minimumSpan, ceil(W * widthNumerator / widthDenominator)),
 * Low = [lo, lo+S], Middle = [lo+floor((W-S)/2), lo+floor((W-S)/2)+S], High = [hi-S, hi]. Returns
 * candidates in the fixed canonical order [Low, Middle, High] with their stable canonical
 * indices, each carrying a validated, immutable RegisterWindow. Deterministic: the same inputs
 * always produce the same output. Rejects an unrecognized algorithm identifier loudly.
 */
// @spec-link [[module_register_window_resolution_primitives]]
export function deriveRegisterWindowCandidates(
  activeRange: ActiveConcertRange,
  policy: RegisterWindowPolicy,
): readonly RegisterWindowCandidate[] {
  assertSupportedAlgorithm(policy)

  const lo = activeRange.minMidi
  const hi = activeRange.maxMidi
  const width = hi - lo
  const span = Math.max(
    policy.minimumSpan,
    ceilDiv(width * policy.widthNumerator, policy.widthDenominator),
  )
  const middleOffset = floorDiv(width - span, 2)

  const windowsById: Record<RegisterId, RegisterWindow> = {
    Low: makeRegisterWindow(lo, lo + span),
    Middle: makeRegisterWindow(lo + middleOffset, lo + middleOffset + span),
    High: makeRegisterWindow(hi - span, hi),
  }

  return deepFreeze(
    CANONICAL_REGISTER_ORDER.map((id) =>
      deepFreeze({ id, canonicalIndex: CANONICAL_REGISTER_INDEX[id], window: windowsById[id] }),
    ),
  )
}
