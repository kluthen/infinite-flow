---
id: service_generation_orchestration
status: DRAFT
priority: 1
tags: generation,orchestration,immutable-boundary
dependents: []
human_name: Generation Orchestration
type: SERVICE
version: 0.1
parents:
  - [[req_four_measure_phrase]]
  - [[rule_instrument_profile_range]]
layer: ARCHITECTURE
---

# Generation Orchestration

## INTENT
Orchestrate one requested phrase generation from outer intent through a resolved core request.

## THE RULE / LOGIC
The orchestration boundary accepts a GenerationIntent that may retain player-facing register intent. It resolves a concrete GenerationRequest before core planning, including one profile-derived active range and one whole-phrase register window. It invokes the planning and validation flow against that resolved request and returns either an immutable valid concert-pitch result or an explicit failure. Core planning never receives unresolved outer intent, and orchestration does not mutate a returned result.

## TECHNICAL INTERFACE
Consumers submit GenerationIntent and receive an immutable generation result or an explicit generation failure. Core planning receives only GenerationRequest with resolved profile-derived constraints.

## EXPECTATION
A successful operation returns one immutable concert-pitch phrase that satisfies the resolved request and selected-profile range constraints. A failed operation returns an explicit failure rather than an invalid or partial phrase, and no returned result can be mutated by orchestration.
