---
id: entity_steering_block
status: DRAFT
layer: ARCHITECTURE
priority: 1
human_name: The Steering Block in the Generation Request
tags: [v3, release-v3.2, jam, generation]
dependents: []
type: ENTITY
version: 0.2
parents:
  - [[rule_jam_and_lock_off_reproduce_earlier_phrases]]
  - [[rule_jam_steering_block]]
  - [[rule_quantized_doodle_is_generation_input]]
---

# The Steering Block in the Generation Request

## INTENT
Carry what a doodle steers into the generator as plain, validated data with no pitch, so the generator never hears of a doodle, a drift or Jam.

## THE RULE / LOGIC
The steering block is one immutable value with two parts. A target rhythm: exactly four measures, the doodle's measures already laid over the phrase, each the list of its note starts and rest starts in strictly increasing measure-relative sixteenths (0 to 15), a tie continuation being no start, so a measure may hold none; with a band (close, near, or unbounded, under which every candidate counts as near and the seeded order stands). A list of at most 63 melodic moves, in order, each up or down by a size (step, skip or leap) or the same note with no size, with one strength for the list (size and direction, direction only, or none). It holds no pitch, no doodle, no drift and no tempo. It travels as one optional field of the outer generation intent and of the resolved core request, across the generation worker boundary, where it is re-validated from untrusted input and rebuilt; an unknown band, move, start kind or strength, a start off the measure's sixteenths or out of order, or a measure count other than four, is refused with the worker's typed protocol error. A request without it is exactly the request it was before v3.2. Every ordering it drives is computed inside generation from it, so the generator stays a pure function of its request and seed.

## TECHNICAL INTERFACE
src/domain/generation/steering-block.ts: the steering block type (`SteeringBlock`, its target rhythm `SteeringTargetRhythm` of `SteeringStart`s, `SteeringBand`, `MelodicMove`, `SteeringStrength`, `MAX_STEERING_MOVES`), its validating constructor (`makeSteeringBlock`) and its parser (`parseSteeringBlock`), each refusing with `SteeringBlockError`; an optional `steering` field on GenerationIntent (src/domain/generation/generation-intent.ts) and on the resolved GenerationRequest (src/domain/generation/generation-request.ts), carried by request-resolution.ts, accepted by the worker's inbound parser and by parseGenerationRequest's allowed keys, every other extra field still refused. The prewarm and cancellation paths carry it with the intent.

## EXPECTATION
- A steering block holds no pitch.
- A request with a steering block round-trips through the worker unchanged; one with an unknown band, move or strength is refused with the typed protocol error.
- A request built without a steering block is deep-equal to v3.1's and generates v3.1's phrase.
- The target rhythm holds rest starts beside note starts, since the rhythm distance compares both.
