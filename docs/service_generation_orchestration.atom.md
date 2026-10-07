---
id: service_generation_orchestration
status: DRAFT
priority: 1
tags: generation,orchestration,immutable-boundary
dependents:
  - [[module_named_stream_pseudorandomness]]
  - [[module_register_intent_boundary]]
  - [[service_headless_phrase_replay]]
human_name: Generation Orchestration
type: SERVICE
version: 0.4
parents:
  - [[entity_concert_event_timeline]]
layer: ARCHITECTURE
notes: Revised 2026-10-07 before code (previous version 0.3, pre-code architecture capture) for the owner-approved failure ladder version 0.3 and its search allowance (spec D200-D202): orchestration picks the search policy from the intent, generation-search-carry-in-v1 (160,000 units per window) with a carry-in and generation-search-v1 (250,000, unchanged) without; only an explicit options.searchPolicy overrides it. Status DRAFT until the code lands.
---

# Generation Orchestration

## INTENT
Orchestrate one requested phrase generation from one or more already-resolved GenerationRequest windows through building each window's ranked candidate domains, running its core window search, and selecting the final outcome across all evaluated windows.

## THE RULE / LOGIC
The orchestration boundary consumes one or more already-resolved GenerationRequest values, each carrying one profile-derived active concert range and exactly one contained whole-phrase register window. For each resolved window it builds an already-ranked harmony candidate order and an already-ranked rhythm candidate order, then delegates that window's own harmony/rhythm/tension-binding/pitch depth-first search -- and that search's own fuel ledger and independent result validation -- to core window search, treating its typed outcome as final for that window. For Varying without a carry-in, it evaluates every canonical Low, Middle, and High window fully, each under its own independently opened window search, before selecting a window among already-validated successes; any other request -- a fixed register, or any request carrying a carry-in, whose one window is the carried window -- evaluates its own single window and that window's outcome is the orchestration's outcome. With a carry-in, the harmony candidates are those that may follow the carried chord (all of them open on the collection's tonic), in their unchanged ranked order. Separate immutable internal versioned diagnostics accumulate across windows but cannot influence which window succeeds or what it selects. It picks the search policy every window of one generation searches under from the intent alone: an intent with a carry-in searches under the carry-in policy, version label generation-search-carry-in-v1, with 160,000 fuel units per window, and every intent without carry-in searches under the first release's policy, generation-search-v1, with 250,000 fuel units per window, so its output for a given request and seed stays byte-identical to the first release. Only a search policy the caller supplies explicitly overrides that choice. Because the choice depends only on the intent, replaying a decoded intent derives the same policy and reproduces the same outcome.

## TECHNICAL INTERFACE
Consumers submit one or more already-resolved GenerationRequest values, one per window to evaluate, and receive back either the selected window's typed outcome (its chosen harmony, rhythm, tension binding, and pitch plan plus provenance) or an explicit generation failure code, plus the accumulated internal diagnostics. Building each window's ranked harmony/rhythm domains and running its core window search are delegated collaborators; orchestration itself does not parse wire input, assemble a final timeline, or re-implement the per-window fuel-metered search or its independent validation. The entry point is `generatePhrase` in `src/domain/generation/orchestration/generation-orchestrator.ts`; its optional `options.searchPolicy` is the only override of the policy picked from the intent.

## EXPECTATION
Every successful window returns one internally consistent chosen harmony, rhythm, tension binding, and pitch plan satisfying that window's own resolved request and selected-profile range/window constraints, as already guaranteed by core window search. No window search receives unresolved Varying or outer intent, only its own single resolved request. Selecting among Varying's evaluated windows compares only fully evaluated and independently validated successful windows, and execution timing or diagnostics cannot change which window is chosen or classify natural exhaustion as search_limit_exceeded. Without an explicit search policy, a generation with carry-in searches under generation-search-carry-in-v1 and a generation without carry-in under generation-search-v1, unchanged from the first release, on every run and every replay of the same intent.
