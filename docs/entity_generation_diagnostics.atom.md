---
id: entity_generation_diagnostics
status: REVIEW
layer: ARCHITECTURE
tags: generation
parents:
  - [[user_story_controlled_phrase_generation]]
version: 1.0
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

## TECHNICAL INTERFACE
Internal generation boundaries may publish an immutable versioned diagnostic value only to internal diagnostic handling. GenerationResult neither accepts nor contains diagnostics.

## EXPECTATION
Consuming or changing diagnostics cannot alter a phrase, success/failure classification, candidate ordering, validation outcome, or GenerationResult shape. Published diagnostic values cannot be mutated.
