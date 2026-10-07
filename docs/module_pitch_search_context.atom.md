---
id: module_pitch_search_context
status: REVIEW
priority: 1
tags: pitch,search-context
parents:
  - [[entity_pitch_candidate_domain]]
dependents: []
human_name: Pitch Search Context
version: 0.3
type: MODULE
layer: ARCHITECTURE
notes: Revised 2026-10-07 in the CONTRACT 1.8 post-task sync (previous version 0.2): the technical interface no longer claims the module holds no state across calls; it now states the per-request weak-map memo added for the ISS-009 speed-up (leader-confirmed as intended, output byte-identical). Status unchanged.
---

# Pitch Search Context

## INTENT
Compile every static fact one pitch search needs from a bound planner input exactly once, so every search transition reads only this immutable snapshot instead of recomputing shared facts.

## THE RULE / LOGIC
From the bound input's rhythm and harmony, the module rebuilds chronological sounding attacks (tie-inclusive spans, each attack's absolute-beat harmony index and identity, and its checkpoint/beat-one/harmony-change/final flags) using the shared attack-timeline rebuild, then derives each bar's contour checkpoint attack index: its first fresh attack at tick 0 or 8, or, when a bar's anchors are only tie continuations, its first fresh attack at any tick; a bar with no fresh attack at all has no checkpoint, which leaves the contour plan impossible. It derives the collection's pitch classes, the canonical per-attack candidate domain for every attack, each checkpoint's distinct candidate MIDI values, and the final attack's allowed MIDI values: the open endpoints -- a chord tone of a degree-5 harmony under a tonal-gentle/active endpoint, a collection-degree-5 chord tone under a tonal-static endpoint, or a non-tonic chord tone under a modal endpoint -- plus, only when the request carries a carry-in, the tense scale tones the next phrase's first note could resolve. It records which debts the final note may still owe (none without carry-in) and a carried pitch that is a tense note for the first attack to resolve. It resolves the selected policy's leapiness limits and compiles the whole-phrase contour plan from the checkpoint domains, the final allowed MIDI values, and a reach function bounded by those leapiness limits. The compiled context is immutable and never recomputed once compiled for one input.

## TECHNICAL INTERFACE
Callers supply one immutable bound planner input and receive one immutable compiled search context, plus a standalone open-endpoint check that takes one attack, one candidate MIDI value, and the collection's pitch classes. The module performs no search of its own. It memoizes the facts it derives for one request (each rhythm/harmony pair's attacks and contour plans, and the free attacks' candidate domains) in a weak map keyed by the frozen request object, shared across the bindings and pairs searched under that one request and released with the request; unfrozen inputs are never shared. A context built from the memo is identical to one built fresh, so no state is observable across calls.

## EXPECTATION
Compiling the same bound input twice yields two contexts with identical attacks, candidate domains, checkpoint indices and domains, contour plan, and open-endpoint MIDI values. A bar whose only anchors are tie continuations still resolves to a checkpoint at its first fresh attack rather than having none, and a bar with no fresh attack at all has no checkpoint, leaving the compiled contour plan impossible.
