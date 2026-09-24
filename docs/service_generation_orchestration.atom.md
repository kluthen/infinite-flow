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
The orchestration boundary accepts outer GenerationIntent and resolves one concrete GenerationRequest before core planning, including one profile-derived active range and exactly one contained whole-phrase Low, Middle, or High window. It builds a separate immutable bound planner input by composing the resolved request, pitch policy, selected harmony and rhythm candidates, concrete tension binding, and versioned search policy. It preserves eager harmony and lazy rhythm-domain APIs, while it may materialize one frozen rhythm-ranking cache for an operation. It iterates harmony, then rhythm, then tension binding, then pitch depth-first search without replacement; every candidate is independently validated before success. Varying evaluates every canonical Low, Middle, and High window fully with independent ledgers and selects only among already validated successes. Deterministic wall-clock-independent versioned fuel distinguishes natural exhaustion from search_limit_exceeded. GenerationResult remains unchanged; separate immutable internal versioned diagnostics cannot influence orchestration, planning, validation, ranking, or result.

## TECHNICAL INTERFACE
Consumers submit GenerationIntent and receive the unchanged immutable GenerationResult or an explicit generation failure. Core planning receives only a narrow resolved GenerationRequest and a separate immutable bound planner input; harmony remains eager, rhythm remains lazy except for an optional frozen per-operation ranking cache, and diagnostics remain internal.

## EXPECTATION
Every successful operation returns one unchanged-shape immutable concert-pitch GenerationResult satisfying the independently reconstructed resolved request and selected-profile range/window constraints. No core planner receives unresolved Varying or outer intent. Varying selection compares only fully evaluated and independently validated successful windows, and execution timing or diagnostics cannot change a result or classify natural exhaustion as search_limit_exceeded.
