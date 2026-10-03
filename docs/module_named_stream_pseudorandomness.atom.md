---
id: module_named_stream_pseudorandomness
status: REVIEW
priority: 1
parents:
  - [[module_generation_request_construction]]
  - [[rule_seeded_phrase_reproduction]]
  - [[service_generation_orchestration]]
dependents:
  - [[module_phrase_replay_key]]
  - [[module_register_window_resolution_primitives]]
type: MODULE
layer: ARCHITECTURE
human_name: Named-Stream Pseudorandomness
version: 0.2
tags: seed
notes: Revised 2026-10-03 in the v2 chunk 24 post-task sync (previous version 0.1) as plain technical alignment: adds the indexed streams, a second closed versioned registry derived per (seed, label, index), used by the settings mutation and its gaps. Status unchanged.
---

# Named-Stream Pseudorandomness

## INTENT
Give every stage of generation an independent, non-interfering source of randomness that is fully reproducible from the seed the business layer already guarantees, without exposing the mechanism used to derive that reproducibility.

## THE RULE / LOGIC
A seed is a distinct 32-bit unsigned identity with a stable, documented string encoding, and every generation result retains that seed for reproduction. A small, documented deterministic 32-bit pseudorandom generator derives independent named streams by mixing the seed with a stream label drawn from a closed, versioned registry of labels (at minimum harmony, rhythm, pitch, register resolution, and tie-breaking), so that each consuming stage draws from its own non-interfering sequence and one stage's consumption cannot shift another stage's results. The unsigned interpretation of the seed and the label encoding used to derive each stream are fixed and versioned; cross-runtime reproduction (e.g. a different JavaScript engine) is protected by versioned golden fixtures rather than left to incidental platform agreement.

Beside the named streams, a second closed registry, versioned on its own, holds indexed labels for streams drawn once per numbered event of a session (at present the settings mutation and the settings-mutation gap). Each indexed stream is derived from the seed, the label and a non-negative whole-number index, mixed the same way a named stream's label is, so the stream for the k-th event is known without replaying the ones before, and no other stream's consumption shifts it. Because each registry has its own version, a change to either derivation never shifts the other's streams.

## TECHNICAL INTERFACE
Orchestration and the generation-request boundary supply a 32-bit unsigned seed (freshly generated on Regenerate, retained otherwise) to this module and request a named stream by label from the closed registry; the module returns a deterministic sequence for that label that no other label's consumption affects. The seed's documented string encoding is exposed for retention on the generation result. The session's settings mutation requests an indexed stream with `deriveIndexedStream(seed, label, index)` from `src/domain/random/streams.ts`, where `label` comes from `INDEXED_STREAM_LABELS` (`settings-mutation`, `settings-mutation-gap`) under `INDEXED_STREAM_REGISTRY_VERSION`; an index that is negative or not a whole number throws `IndexedStreamError`.

## EXPECTATION
The same complete request and the same seed reproduce the same named stream for every label, and therefore the same result, satisfying the business-layer determinism guarantee. Consuming an additional value from one named stream never changes the sequence produced by any other named stream. A cross-runtime reproduction mismatch is caught by the versioned golden fixtures rather than passing silently.
