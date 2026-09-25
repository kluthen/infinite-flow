---
id: service_generation_request_resolution
status: DRAFT
priority: 1
version: 0.1
tags: generation,orchestration,immutable-boundary
layer: ARCHITECTURE
parents:
  - [[entity_concert_event_timeline]]
dependents: []
human_name: Generation Request Resolution
type: SERVICE
---

# Generation Request Resolution

## INTENT
Resolve one outer GenerationIntent into one or more concrete, independently plannable GenerationRequests before core planning begins.

## THE RULE / LOGIC
The resolution boundary accepts outer GenerationIntent and resolves it into one concrete GenerationRequest for a fixed register, or three (Low, Middle, High) for Varying, each carrying one profile-derived active concert range and exactly one contained whole-phrase register window. Resolution rejects an intent it cannot resolve into a well-formed request with a typed resolution failure rather than passing an unresolved or partially-formed request to core planning.

## TECHNICAL INTERFACE
Callers supply one outer GenerationIntent and receive one or more resolved, independently plannable GenerationRequest values, or a typed resolution failure. Core planning never receives unresolved intent or the outer Varying register value directly.

## EXPECTATION
Every resolved GenerationRequest carries a register window fully contained in its profile-derived active concert range. An intent that cannot be resolved never silently proceeds to core planning; it returns a typed resolution failure instead.
