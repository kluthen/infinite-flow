/**
 * The closed register identity vocabulary this slice resolves to, and the fixed canonical order
 * a later deterministic tie-break depends on. `Varying` is deliberately absent here — it belongs
 * to the outer register-intent boundary that a later slice owns; this module only ever produces
 * one of Low, Middle, or High.
 */

import { deepFreeze } from '../events/deep-freeze'

/** One resolved register identity. */
// @spec-link [[module_register_window_resolution_primitives]]
export type RegisterId = 'Low' | 'Middle' | 'High'

/**
 * Intent: fix the canonical candidate order as a versioned engineering contract — [Low, Middle,
 * High] — never reorder without a deliberate, versioned reproducibility migration, since a later
 * deterministic tie-break depends on iterating candidates in exactly this sequence.
 */
// @spec-link [[module_register_window_resolution_primitives]]
export const CANONICAL_REGISTER_ORDER: readonly RegisterId[] = deepFreeze(['Low', 'Middle', 'High'])

/**
 * Intent: look up a register identity's stable canonical index (Low=0, Middle=1, High=2),
 * matching CANONICAL_REGISTER_ORDER exactly.
 */
// @spec-link [[module_register_window_resolution_primitives]]
export const CANONICAL_REGISTER_INDEX: Readonly<Record<RegisterId, number>> = deepFreeze({
  Low: 0,
  Middle: 1,
  High: 2,
})
