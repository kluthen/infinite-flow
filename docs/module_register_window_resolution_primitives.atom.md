---
id: module_register_window_resolution_primitives
status: REVIEW
layer: ARCHITECTURE
priority: 1
version: 0.1
type: MODULE
human_name: Register Window Resolution Primitives
tags: register,window-derivation,determinism,versioned-contract
parents:
  - [[module_named_stream_pseudorandomness]]
  - [[module_phrase_generation_profile_policy]]
  - [[rule_instrument_profile_range]]
dependents: []
---

# Register Window Resolution Primitives

## INTENT

Fix, as a versioned engineering contract, the primitives that generate and order candidate register windows and that derive a deterministic tie-break key for selecting among them — window derivation, canonical candidate order, and key derivation — so later generation stages can rely on them without renegotiating the arithmetic or the ordering, and so a future change to any of them is a deliberate, versioned reproducibility migration rather than an incidental drift.

## THE RULE / LOGIC

Window derivation, named overlapping-three-window-v1, takes an inclusive active concert range [lo, hi]. Let W = hi - lo and S = max(12, ceil(W / 2)). Low = [lo, lo + S]. Middle = [lo + floor((W - S) / 2), lo + floor((W - S) / 2) + S]. High = [hi - S, hi]. All three windows are inclusive integer ranges, each fully contained in the active range, and adjacent windows intersect rather than partition the range into disjoint thirds. The canonical candidate order is fixed as [Low, Middle, High]; each candidate carries a stable identity (Low, Middle, or High) and a stable canonical index (0, 1, 2 respectively), and this order is part of the contract because a deterministic tie-break among candidates depends on iterating them in exactly this sequence. A deterministic register tie key is derived as a 32-bit unsigned value computed by hashing, with the project's FNV-1a 32-bit hash, the concatenation of a versioned domain string (infinite-flow/register-window/v1), the seed's documented string encoding, a canonical field-ordered serialization of the generation-affecting intent, and the candidate window's stable identity. Canonical serialization of the generation-affecting intent lists its fields in one fixed, explicit order; it never includes theme selection or other session/presentation state, so identical generation-affecting intent and seed always produce identical keys regardless of theme or session state. Adding a new generation-affecting field to the intent later is a deliberate, versioned reproducibility change, not an incidental one. These are primitives only: they fix how windows are derived, how candidates are ordered and identified, and how a deterministic key is computed per candidate. Choosing which candidate window a Varying selection resolves to requires proving complete-phrase eligibility by running the full bounded planner, which is out of scope for this module and belongs to the planning stage that performs that proof.

## TECHNICAL INTERFACE

Callers supply an inclusive active concert range and receive the three canonical candidate windows (Low, Middle, High) each with its stable identity and canonical index (0, 1, 2), derived by the overlapping-three-window-v1 formula. Callers supply a seed, a canonical field-ordered serialization of the generation-affecting intent, and a candidate window identity, and receive that candidate's deterministic 32-bit unsigned tie key, computed via the versioned domain string infinite-flow/register-window/v1 and the project's FNV-1a 32-bit hash. This module does not expose a selection or eligibility-proving operation.

## EXPECTATION

For any inclusive active range, the three derived windows are inclusive, contained in the active range, and pairwise adjacent-intersecting rather than disjoint. Candidate order and per-candidate canonical index are always [Low=0, Middle=1, High=2]. The same generation-affecting intent and the same seed always produce the same tie key for a given candidate; a theme or other session-state-only change never changes any tie key. This module never selects a window or asserts eligibility for Varying -- that remains the bounded planner's responsibility.
