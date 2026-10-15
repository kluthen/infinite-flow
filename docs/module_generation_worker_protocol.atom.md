---
id: module_generation_worker_protocol
status: REVIEW
human_name: Generation Worker Protocol
type: MODULE
version: 0.8
dependents:
  - [[module_phrase_replay_key]]
  - [[service_headless_phrase_replay]]
layer: ARCHITECTURE
priority: 1
tags: generation
parents:
  - [[entity_concert_event_timeline]]
  - [[entity_my_instrument]]
---

# Generation Worker Protocol

## INTENT

Define the message envelope exchanged across the generation worker boundary and parse every message crossing it from untrusted input in either direction, so the worker thread and the main thread never trust a raw postMessage payload without validating its shape first.

## THE RULE / LOGIC
A GenerationWorkerRequest wraps an outer generation intent for the outbound message to the worker, optionally carrying the carry-in of the phrase before; a GenerationWorkerResponse wraps either a successful GenerationOutcome or a typed failure for the inbound message back. Parsing a request from an untrusted value rebuilds the intent from its owning fields, a built-in instrument's profile resolved from its id and compared, my instrument's read from the record as data: parsed by the domain's profile parser with its tags checked, then derived again by makeMyInstrumentProfile from its own written range, transposition and name, which applies every rule of my instrument but the bound its clef sets on the written range (the profile carries no clef), and compared field for field, so a profile no my instrument can have (a span under two octaves, register windows set by hand, letter steps off the interval table, a range sounding outside MIDI, another id) is refused; it parses a present carry-in field by field, its final harmony being either a harmony record or null, and checks it against the rebuilt intent, and throws a typed error on the first invalid field rather than guessing. Parsing a GenerationOutcome from an untrusted value validates its discriminant first, then parses only the fields that discriminant requires, including the retained request with its carry-in and the provenance and diagnostics payloads it carries; parsing a full response composes this with the response envelope's own fields.

The worker entry point listens for exactly two inbound message types and parses each through this protocol before acting on it. A `generate` request is answered with exactly one parsed, well-formed response message unless the main-thread client terminates the worker first, which is how it cancels a request: a terminated worker answers none of its outstanding requests, and the client posts the other ones again, with their original ids, to the fresh worker that replaces it. The entry point invokes the pure request handler for each generate request, and the handler itself performs no parsing and no direct message-channel access, calling only the orchestration entry point and shaping its outcome into the response payload. A prewarm message `{ type: 'prewarm', intent }` carries an outer generation intent of the same shape, parsed the same way as a generate request's, and no id; it is never answered.

On a prewarm the worker builds that intent's rhythm domain into the shared canonical rhythm-domain memo in interruptible slices of about 8 ms, each covering one or more whole gesture units, yielding between slices through a private MessageChannel, so a generate request that arrives meanwhile is served after at most about one slice. A newer prewarm replaces an unfinished one, whose unfinished work is discarded. A prewarm of a setting already in the memo, or of an intent whose harmony has no plan, builds nothing and still discards an unfinished prewarm. A build step that throws fails that prewarm for good: its partial work is discarded, no memo entry is written, and the exception is rethrown out of the slice so the worker reports it as an uncaught error instead of swallowing it; a later prewarm starts a fresh build. A generate request for the rhythm setting being prewarmed finishes the remaining work synchronously and uses it. A memo entry left by a completed prewarm is identical to the one an on-demand build of the same setting produces.

## TECHNICAL INTERFACE
Callers parse an unknown inbound value into a validated worker-bound message, either a GenerationWorkerRequest (`type: 'generate'`, with an id) or a prewarm message (`type: 'prewarm'`, no id), or an unknown inbound value into a validated GenerationWorkerResponse, each throwing GenerationWorkerProtocolError on the first structurally or semantically invalid field. The worker script itself exposes no callable interface beyond its message-event listener; the pure handler accepts one parsed GenerationWorkerRequest and a phrase-generation dependency and returns one GenerationWorkerResponse. The main-thread client's prewarm(intent) posts a prewarm message fire-and-forget, consuming no request id and awaiting nothing, and does nothing once the worker is unusable, whose failure the next generate call reports. The intent rebuild the request parser uses is exported on its own as rebuildGenerationWorkerIntent, shared with the phrase replay key decoder: it validates an untrusted intent record's owning fields (request id, seed, written tonal center, controls, musical profile, my instrument's profile when the controls name `my-instrument`, checked by parseMyInstrumentProfile, and an optional carry-in) and rebuilds the full intent with no default for a missing or invalid field, throwing on the first invalid one; the request parser adds the unknown-field rejection and the field-for-field equality check against the received record.

## EXPECTATION
A request, prewarm, or response message that round-trips through this protocol's own construction and parsing always parses back to an equal value. Any message missing a required field, carrying a wrong discriminant, or otherwise malformed always throws GenerationWorkerProtocolError instead of producing a partially-parsed or best-effort result. The worker posts exactly one response message per generate request received, unless it is terminated first, and none per prewarm message. A generate request that arrives while a prewarm is building is served after at most about one slice of prewarm work. A phrase generated after a completed, replaced, or interrupted prewarm is identical to the phrase generated for the same request with no prewarm at all. A carry-in whose final harmony is null round-trips through a request unchanged. My instrument's profile crosses the worker as data, unchanged, in generate, prewarm and carry-in messages, and every note generated with it lies in its concert range; a malformed my-instrument profile is refused with GenerationWorkerProtocolError, and a built-in whose profile data was altered, or that carries my instrument's profile, is still refused. The worker applies no clef bound: a bass-clef my instrument written below C2, valid in its clef, crosses the worker and generates.
