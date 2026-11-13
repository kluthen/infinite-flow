---
id: service_generation_orchestration
status: REVIEW
priority: 1
tags: generation,orchestration,immutable-boundary
dependents:
  - [[module_named_stream_pseudorandomness]]
  - [[module_register_intent_boundary]]
  - [[service_headless_phrase_replay]]
human_name: Generation Orchestration
type: SERVICE
version: 0.7
parents:
  - [[entity_concert_event_timeline]]
  - [[rule_rhythm_lock_tries_both_forms]]
  - [[rule_seventh_chords_keep_the_chord_plan]]
  - [[rule_seventh_chords_level_never_a_quota]]
  - [[rule_seventh_chords_level_steps]]
  - [[rule_seventh_chords_off_changes_nothing]]
  - [[rule_triad_fallback_per_phrase]]
layer: ARCHITECTURE
---

# Generation Orchestration

## INTENT
Orchestrate one requested phrase generation from one or more already-resolved GenerationRequest windows through building each window's ranked candidate domains, running its core window search, and selecting the final outcome across all evaluated windows.

## THE RULE / LOGIC
The orchestration boundary consumes one or more already-resolved GenerationRequest values, each carrying one profile-derived active concert range and exactly one contained whole-phrase register window. For each resolved window it builds an already-ranked harmony candidate order and an already-ranked rhythm candidate order, then delegates that window's own harmony/rhythm/tension-binding/pitch depth-first search -- and that search's own fuel ledger and independent result validation -- to core window search, treating its typed outcome as final for that window. For Varying without a carry-in, it evaluates every canonical Low, Middle, and High window fully, each under its own independently opened window search, before selecting a window among already-validated successes; any other request -- a fixed register, or any request carrying a carry-in, whose one window is the carried window -- evaluates its own single window and that window's outcome is the orchestration's outcome. With a carry-in, the harmony candidates are those that may follow the carried chord (all of them open on the collection's tonic), in their unchanged ranked order. The window's harmony order then follows the intent's Seventh chords level. At Off it is the ranked order, object for object, and no draw is computed. Above Off, each harmony event of each candidate is drawn (module_named_stream_pseudorandomness), and each candidate with at least one drawn event is replaced, in its place, by two variants directly after each other: the candidate with its drawn events in their seventh form, its identity gaining a `|sevenths:` suffix, then the candidate as triads only, its identity and content unchanged; a candidate with no drawn event stays as it is. The variants keep each candidate's degrees, roles, templates, endpoint class and colour chords, so the plans and their order are those of Off. The window search walks this list in either of its orders, so each plan's two forms stay side by side, and under locked bars, where every plan is tried for one locked rhythm, a locked rhythm gives way only after every plan has been tried in both forms. The variants spend the same search allowance, which the level never raises, and no phrase is rejected or retried for lacking a seventh. Separate immutable internal versioned diagnostics accumulate across windows but cannot influence which window succeeds or what it selects. It picks the search policy every window of one generation searches under from the intent alone: an intent with a carry-in searches under the carry-in policy, version label generation-search-carry-in-v1, with 160,000 fuel units per window, and every intent without carry-in searches under the first release's policy, generation-search-v1, with 250,000 fuel units per window, so its output for a given request and seed stays byte-identical to the first release. Only a search policy the caller supplies explicitly overrides that choice. Because the choice depends only on the intent, replaying a decoded intent derives the same policy and reproduces the same outcome.

## TECHNICAL INTERFACE
Consumers submit one or more already-resolved GenerationRequest values, one per window to evaluate, and receive back either the selected window's typed outcome (its chosen harmony, rhythm, tension binding, and pitch plan plus provenance) or an explicit generation failure code, plus the accumulated internal diagnostics. Building each window's ranked harmony/rhythm domains and running its core window search are delegated collaborators; orchestration itself does not parse wire input, assemble a final timeline, or re-implement the per-window fuel-metered search or its independent validation. The plan variants are built in `src/domain/generation/orchestration/harmony-variants.ts` from the ranked harmony order, the intent's Seventh chords level and its seed; the result validation rebuilds the same list from the same three (service_generation_result_validation). The entry point is `generatePhrase` in `src/domain/generation/orchestration/generation-orchestrator.ts`; its optional `options.searchPolicy` is the only override of the policy picked from the intent. Its options may also carry a clock, `options.clock` (`GenerationOrchestrationOptions.clock`), read only to time the building of the request's rhythm orderings into the diagnostics' `rhythmOrderingsSeconds` (entity_generation_diagnostics); it changes nothing generated, and without it the clock is never read and that field is absent.

## EXPECTATION
Every successful window returns one internally consistent chosen harmony, rhythm, tension binding, and pitch plan satisfying that window's own resolved request and selected-profile range/window constraints, as already guaranteed by core window search. No window search receives unresolved Varying or outer intent, only its own single resolved request. Selecting among Varying's evaluated windows compares only fully evaluated and independently validated successful windows, and execution timing or diagnostics cannot change which window is chosen or classify natural exhaustion as search_limit_exceeded. Without an explicit search policy, a generation with carry-in searches under generation-search-carry-in-v1 and a generation without carry-in under generation-search-v1, unchanged from the first release, on every run and every replay of the same intent. At Off the harmony order is the ranked order, object for object, and every recorded corpus replays unchanged; above Off each plan with a drawn seventh is tried with its drawn sevenths, then as triads only, before the next plan, under the same fuel allowance, so a plan that works only as triads is still found.
