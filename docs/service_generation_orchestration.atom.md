---
id: service_generation_orchestration
status: REVIEW
priority: 1
tags: generation,orchestration,immutable-boundary
dependents:
  - [[module_named_stream_pseudorandomness]]
  - [[module_register_intent_boundary]]
human_name: Generation Orchestration
type: SERVICE
version: 0.1
parents:
  - [[entity_concert_event_timeline]]
layer: ARCHITECTURE
---

# Generation Orchestration

## INTENT
Orchestrate one requested phrase generation from outer intent through a resolved core request.

## THE RULE / LOGIC
The orchestration boundary consumes one or more already-resolved GenerationRequest values, each carrying one profile-derived active concert range and exactly one contained whole-phrase register window, and for each resolved window composes an immutable bound planner input from the resolved request, pitch policy, an already-ranked harmony and rhythm candidate order, concrete tension binding, and versioned search policy. Per window, it searches harmony, then rhythm, then tension binding, then pitch depth-first without replacement, under a deterministic wall-clock-independent versioned fuel ledger that distinguishes natural exhaustion from search_limit_exceeded; every candidate tension binding and planned phrase is independently validated before being accepted as that window's success. For Varying, it evaluates every canonical Low, Middle, and High window fully, with an independent fuel ledger per window, before a window is selected among already-validated successes; a request that is not Varying evaluates its own single window. Separate immutable internal versioned diagnostics accumulate across windows but cannot influence which window succeeds or what it selects.

## TECHNICAL INTERFACE
Consumers submit one or more already-resolved GenerationRequest values, one per window to evaluate, and receive back either the selected window's typed outcome (its chosen harmony, rhythm, tension binding, and pitch plan plus provenance) or an explicit generation failure code, plus the accumulated internal diagnostics. Core window search receives only the resolved request for its own window, an already-ranked harmony and rhythm candidate order, and a fuel ledger; it does not parse wire input, assemble a final timeline, or independently re-validate its own output beyond the planner and tension-binding checks it already performs inline.

## EXPECTATION
Every successful window returns one internally consistent chosen harmony, rhythm, tension binding, and pitch plan satisfying that window's own resolved request and selected-profile range/window constraints. No window search receives unresolved Varying or outer intent, only its own single resolved request. Selecting among Varying's evaluated windows compares only fully evaluated and independently validated successful windows, and execution timing or diagnostics cannot change which window is chosen or classify natural exhaustion as search_limit_exceeded.
