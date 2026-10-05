---
id: module_generation_request_envelope
status: REVIEW
human_name: Generation Request Envelope
layer: ARCHITECTURE
tags: generation
dependents: []
type: MODULE
priority: 1
version: 0.2
parents:
  - [[entity_concert_event_timeline]]
---

# Generation Request Envelope

## INTENT
Define the branded request-identity and meter value objects a resolved GenerationRequest carries, and parse both from untrusted wire input, so a request crossing the worker boundary can be identified and its meter validated without trusting the sender.

## THE RULE / LOGIC
A RequestId is a branded string identity distinct from any other string in the system; making one mints a fresh identity, and parsing one from untrusted input accepts only a well-formed value and otherwise throws a typed GenerationRequestError naming the field. A Meter is a fixed beats-per-bar/beat-unit pair; the only meter this system currently supports is four-four, exposed as a shared constant, and parsing a meter from untrusted input accepts only a value structurally and numerically equal to four-four, throwing the same typed error for anything else -- there is no partial or approximate meter support. Parsing a full GenerationRequest from untrusted input composes these two parses with parsing of every other resolved-request field, including an optional carry-in whose window must be the resolved window, and throws on the first field that fails rather than collecting multiple errors or guessing a default. A request without a carry-in has no carry-in field at all.

## TECHNICAL INTERFACE
Callers mint a fresh RequestId with no input, or parse one from an unknown value and receive either a valid RequestId or a thrown GenerationRequestError. Callers read the shared four-four Meter constant directly, or parse a meter from an unknown value with the same throw-on-invalid contract. A composed entry point parses an entire untrusted value into a fully resolved GenerationRequest, throwing on the first invalid field.

## EXPECTATION
Every minted RequestId is distinct from every other minted RequestId. Parsing a well-formed request identity or a four-four meter always succeeds and round-trips to an equal value; parsing anything else — wrong shape, wrong beat count, wrong unit — always throws GenerationRequestError rather than coercing or silently substituting a default.
