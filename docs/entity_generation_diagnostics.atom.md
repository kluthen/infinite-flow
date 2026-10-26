---
id: entity_generation_diagnostics
status: REVIEW
layer: ARCHITECTURE
tags: generation
parents:
  - [[user_story_controlled_phrase_generation]]
version: 1.2
dependents: []
human_name: Generation Diagnostics
type: ENTITY
priority: 2
---

# Generation Diagnostics

## INTENT
Represent internal immutable versioned observations about one generation attempt without changing its result or search behavior.

## THE RULE / LOGIC
A diagnostic value records versioned observations made after a generation attempt occurs. It is immutable, internal, and separate from GenerationResult. Diagnostics are non-influential: planners, validators, ranking, tie-breaking, fuel classification, orchestration, and returned results cannot read diagnostics to change generation behavior.

A time is observed only when the caller passes a clock: the diagnostic value then also carries the seconds the orchestration spent building the request's rhythm orderings, the span that builds the rhythm lock's order with the rhythm change draw slotted in, the forced bend's order the first time the search asks for it, and any other rhythm preference the request carries. Without a clock that field is absent and the outcome is deep-equal for the same intent and seed; with one, the phrase and its provenance are the same and only the diagnostics differ. A time is never part of the provenance, the result, a replay key or a kept session. Only the measurement sweeps pass a clock; the app never does.

## TECHNICAL INTERFACE
Internal generation boundaries may publish an immutable versioned diagnostic value only to internal diagnostic handling. GenerationResult neither accepts nor contains diagnostics. The value is GenerationDiagnostics (src/domain/generation/orchestration/orchestration-types.ts). The orderings' time is the optional clock of generatePhrase's options, GenerationOrchestrationOptions.clock (src/domain/generation/orchestration/generation-orchestrator.ts), a millisecond reader on the performance.now() timeline, and the optional GenerationDiagnostics.rhythmOrderingsSeconds, present exactly when a clock is passed.

## EXPECTATION
Consuming or changing diagnostics cannot alter a phrase, success/failure classification, candidate ordering, validation outcome, or GenerationResult shape. Published diagnostic values cannot be mutated. The same intent and seed give a deep-equal outcome without a clock, and the same phrase and provenance with one.
