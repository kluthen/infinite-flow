---
id: entity_request_rhythm_lock
status: DRAFT
layer: ARCHITECTURE
version: 0.1
priority: 1
human_name: The Rhythm Lock in the Generation Request
tags: [v3, release-v3.2, rhythm-lock, generation]
parents:
  - [[req_rhythm_lock]]
  - [[rule_allowed_rhythm_changes]]
  - [[rule_jam_and_lock_off_reproduce_earlier_phrases]]
  - [[rule_locked_rhythm_is_phrase_one]]
  - [[rule_rhythm_change_share]]
dependents: []
type: ENTITY
---

# The Rhythm Lock in the Generation Request

## INTENT
Carry the rhythm lock's state into the generator as one validated group of the request, so every ordering and draw the lock needs is computed inside generation and a phrase replays from its request alone.

## THE RULE / LOGIC
The rhythm lock group is one immutable value of three parts: the lock's state, either on with nothing locked yet (a Jam's phrase 1, chosen nearest the doodle) or on with the locked bars; the allowed rhythm changes, the kinds the player allows; and whether the phrase is a tenser one (session mode). The group's absence means the lock is off. The group serves session mode's lock and Jam's alike. It travels as one optional field of the outer generation intent and of the resolved core request, across the generation worker boundary, where it is re-validated from untrusted input and rebuilt; an unknown lock state or kind is refused with the worker's typed protocol error. A request without it is exactly the request it was before v3.2. Every ordering and draw derived from it is computed inside generation.

## TECHNICAL INTERFACE
An optional `rhythmLock` field on GenerationIntent (src/domain/generation/generation-intent.ts) and on the resolved GenerationRequest (src/domain/generation/generation-request.ts), carried by request-resolution.ts, accepted by the worker's inbound parser (GENERATION_INTENT_ALLOWED_KEYS, src/generation-worker/generation-worker-inbound.ts) and by parseGenerationRequest's allowed keys, every other extra field still refused; the prewarm and cancellation paths carry it with the intent. Not built yet; no generation stage reads it until the lock is built in the generator.

## EXPECTATION
- A request with the lock group round-trips through the worker unchanged; one with an unknown lock state or kind is refused with the typed protocol error.
- A request built without the lock group is deep-equal to v3.1's and generates v3.1's phrase.
