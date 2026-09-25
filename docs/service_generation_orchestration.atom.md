---
id: service_generation_orchestration
status: DRAFT
priority: 1
tags: generation,orchestration,immutable-boundary
dependents:
  - [[module_named_stream_pseudorandomness]]
  - [[module_register_intent_boundary]]
human_name: Generation Orchestration
type: SERVICE
version: 0.2
parents:
  - [[entity_concert_event_timeline]]
layer: ARCHITECTURE
---

# Generation Orchestration

## INTENT
Orchestrate one requested phrase generation from one or more already-resolved GenerationRequest windows through building each window's ranked candidate domains, running its core window search, and selecting the final outcome across all evaluated windows.

## THE RULE / LOGIC
The orchestration boundary consumes one or more already-resolved GenerationRequest values, each carrying one profile-derived active concert range and exactly one contained whole-phrase register window. For each resolved window it builds an already-ranked harmony candidate order and an already-ranked rhythm candidate order, then delegates that window's own harmony/rhythm/tension-binding/pitch depth-first search -- and that search's own fuel ledger and independent result validation -- to core window search, treating its typed outcome as final for that window. For Varying, it evaluates every canonical Low, Middle, and High window fully, each under its own independently opened window search, before selecting a window among already-validated successes; a request that is not Varying evaluates its own single window and that window's outcome is the orchestration's outcome. Separate immutable internal versioned diagnostics accumulate across windows but cannot influence which window succeeds or what it selects.

## TECHNICAL INTERFACE
Consumers submit one or more already-resolved GenerationRequest values, one per window to evaluate, and receive back either the selected window's typed outcome (its chosen harmony, rhythm, tension binding, and pitch plan plus provenance) or an explicit generation failure code, plus the accumulated internal diagnostics. Building each window's ranked harmony/rhythm domains and running its core window search are delegated collaborators; orchestration itself does not parse wire input, assemble a final timeline, or re-implement the per-window fuel-metered search or its independent validation.

## EXPECTATION
Every successful window returns one internally consistent chosen harmony, rhythm, tension binding, and pitch plan satisfying that window's own resolved request and selected-profile range/window constraints, as already guaranteed by core window search. No window search receives unresolved Varying or outer intent, only its own single resolved request. Selecting among Varying's evaluated windows compares only fully evaluated and independently validated successful windows, and execution timing or diagnostics cannot change which window is chosen or classify natural exhaustion as search_limit_exceeded.
