---
id: entity_steering_block
status: DRAFT
layer: ARCHITECTURE
priority: 1
human_name: The Steering Block in the Generation Request
tags: [v3, release-v3.2, jam, generation]
dependents: []
type: ENTITY
version: 0.1
parents:
  - [[rule_jam_and_lock_off_reproduce_earlier_phrases]]
  - [[rule_jam_steering_block]]
  - [[rule_quantized_doodle_is_generation_input]]
---

# The Steering Block in the Generation Request

## INTENT
Carry what a doodle steers into the generator as plain, validated data with no pitch, so the generator never hears of a doodle, a drift or Jam.

## THE RULE / LOGIC
The steering block is one immutable value with two parts. A target rhythm: note starts per measure, in ticks, over the four measures of a phrase, with a band (how far a candidate may be and still count as near). A list of melodic moves, in order, each a direction (up, down or the same note) and a size (step, skip or leap), with one strength for the list (size and direction, direction only, or none). It holds no pitch, no doodle, no drift and no tempo. It travels as one optional field of the outer generation intent and of the resolved core request, across the generation worker boundary, where it is re-validated from untrusted input and rebuilt; an unknown band, move or strength is refused with the worker's typed protocol error. A request without it is exactly the request it was before v3.2. Every ordering it drives is computed inside generation from it, so the generator stays a pure function of its request and seed.

## TECHNICAL INTERFACE
src/domain/generation/steering-block.ts (new; not built yet): the steering block type, its validating constructor and its parser; an optional `steering` field on GenerationIntent (src/domain/generation/generation-intent.ts) and on the resolved GenerationRequest (src/domain/generation/generation-request.ts), carried by request-resolution.ts, accepted by the worker's inbound parser and by parseGenerationRequest's allowed keys, every other extra field still refused. The prewarm and cancellation paths carry it with the intent.

## EXPECTATION
- A steering block holds no pitch.
- A request with a steering block round-trips through the worker unchanged; one with an unknown band, move or strength is refused with the typed protocol error.
- A request built without a steering block is deep-equal to v3.1's and generates v3.1's phrase.
