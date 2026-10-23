---
id: service_generation_window_search
status: REVIEW
human_name: Generation Window Search
layer: ARCHITECTURE
priority: 1
parents:
  - [[entity_concert_event_timeline]]
  - [[rule_rhythm_lock_strict]]
tags: generation,orchestration,window-search,immutable-boundary
type: SERVICE
version: 0.2
dependents: []
---

# Generation Window Search

## INTENT
Search one already-resolved window's harmony, rhythm, tension-binding, and pitch candidate space depth-first, without replacement, for the first independently validated result.

## THE RULE / LOGIC
Core window search walks the already-ranked harmony and rhythm candidates pair by pair, in one of two orders. For a request without the rhythm lock's locked bars it is harmony-major, as it always was: each harmony candidate is paired with every rhythm candidate, in rhythm order, before the next harmony candidate. For a request holding locked bars it is rhythm-major: each rhythm candidate, in the lock's order (module_rhythm_lock_order), is paired with every harmony candidate, in harmony order, before the next rhythm candidate, so a locked rhythm is tried with every chord plan before any other rhythm. Either way, each pair's concrete tension binding domain is then walked in stable order, composing an immutable bound planner input and planning a pitch phrase for each binding. Every unit of search work -- a visited harmony/rhythm pair, an attempted concrete tension binding, and every pitch-search step folded into a plan's own fuel used -- is metered against one FuelLedger opened under the caller's GenerationSearchPolicy, whichever the order; the ledger distinguishes natural exhaustion of the whole candidate space from a fuel cutoff. The first accepted pitch plan is assembled into a result and independently validated before the search stops, either as window_success on a valid result or window_result_validation_failed with its failure codes otherwise; it is never retried either way. Exhausting every pair and binding without a resolving plan stops the search with window_exhausted, and running out of fuel first stops it with window_search_limit_exceeded. Diagnostics (register, outcome, ledger version, fuel allowance/used, pairs visited, bindings attempted, and the resolved harmony/rhythm/binding identity when one was reached) are collected only as a side observation local to the one search call, frozen, and never consulted by the algorithm itself.

## TECHNICAL INTERFACE
Callers supply one WindowSearchInput -- an already-resolved GenerationRequest for the window, its already-ranked harmony and rhythm candidate order, and a GenerationSearchPolicy -- plus optional injectable WindowSearchDeps (the pitch planner and result validator, defaulted to the production implementations), and receive one WindowSearchReport: a typed WindowOutcome (window_success, window_result_validation_failed, window_search_limit_exceeded, or window_exhausted) paired with that search's own frozen WindowDiagnostics.

## EXPECTATION
A window_success outcome carries one internally consistent chosen harmony, rhythm, tension binding, and pitch plan that has passed independent result validation. No harmony/rhythm pair or concrete tension binding is attempted twice within one search call, and the search's own diagnostics can never change which outcome is returned. Natural exhaustion of the candidate space and a fuel cutoff are always distinguished, never conflated. Without locked bars in the request, the pairs are visited in the order they were before the rhythm lock existed; with them, a rhythm is paired with every harmony candidate before the next rhythm is tried, under the same fuel allowance.
