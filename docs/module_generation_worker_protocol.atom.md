---
id: module_generation_worker_protocol
status: DRAFT
human_name: Generation Worker Protocol
type: MODULE
version: 0.2
dependents: []
layer: ARCHITECTURE
priority: 1
tags: generation
parents:
  - [[entity_concert_event_timeline]]
---

# Generation Worker Protocol

## INTENT
Define the message envelope exchanged across the generation worker boundary and parse every message crossing it from untrusted input in either direction, so the worker thread and the main thread never trust a raw postMessage payload without validating its shape first.

## THE RULE / LOGIC
A GenerationWorkerRequest wraps an outer generation intent for the outbound message to the worker, optionally carrying the carry-in of the phrase before; a GenerationWorkerResponse wraps either a successful GenerationOutcome or a typed failure for the inbound message back. Parsing a request from an untrusted value rebuilds the intent from its owning fields, parses a present carry-in field by field and checks it against the rebuilt intent, and throws a typed error on the first invalid field rather than guessing. Parsing a GenerationOutcome from an untrusted value validates its discriminant first, then parses only the fields that discriminant requires, including the retained request with its carry-in and the provenance and diagnostics payloads it carries; parsing a full response composes this with the response envelope's own fields. The worker entry point listens for exactly one inbound message type, parses it through this protocol, invokes the pure request handler, and posts back exactly one parsed, well-formed response message; the handler itself performs no parsing and no direct message-channel access, calling only the orchestration entry point and shaping its outcome into the response payload.

## TECHNICAL INTERFACE
Callers parse an unknown inbound value into a validated GenerationWorkerRequest, or an unknown inbound value into a validated GenerationWorkerResponse, each throwing GenerationWorkerProtocolError on the first structurally or semantically invalid field. The worker script itself exposes no callable interface beyond its message-event listener; the pure handler accepts one parsed GenerationWorkerRequest and a phrase-generation dependency and returns one GenerationWorkerResponse.

## EXPECTATION
A request or response message that round-trips through this protocol's own construction and parsing always parses back to an equal value. Any message missing a required field, carrying a wrong discriminant, or otherwise malformed always throws GenerationWorkerProtocolError instead of producing a partially-parsed or best-effort result. The worker posts exactly one response message per request message received.
