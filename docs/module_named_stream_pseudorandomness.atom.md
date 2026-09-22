---
id: module_named_stream_pseudorandomness
status: REVIEW
priority: 1
parents:
  - [[module_generation_request_construction]]
  - [[rule_seeded_phrase_reproduction]]
  - [[service_generation_orchestration]]
dependents:
  - [[service_generation_orchestration]]
type: MODULE
layer: ARCHITECTURE
human_name: Named-Stream Pseudorandomness
version: 0.1
tags: seed
---

# Named-Stream Pseudorandomness

## INTENT
Give every stage of generation an independent, non-interfering source of randomness that is fully reproducible from the seed the business layer already guarantees, without exposing the mechanism used to derive that reproducibility.

## THE RULE / LOGIC
A seed is a distinct 32-bit unsigned identity with a stable, documented string encoding, and every generation result retains that seed for reproduction. A small, documented deterministic 32-bit pseudorandom generator derives independent named streams by mixing the seed with a stream label drawn from a closed, versioned registry of labels (at minimum harmony, rhythm, pitch, register resolution, and tie-breaking), so that each consuming stage draws from its own non-interfering sequence and one stage's consumption cannot shift another stage's results. The unsigned interpretation of the seed and the label encoding used to derive each stream are fixed and versioned; cross-runtime reproduction (e.g. a different JavaScript engine) is protected by versioned golden fixtures rather than left to incidental platform agreement.

## TECHNICAL INTERFACE
Orchestration and the generation-request boundary supply a 32-bit unsigned seed (freshly generated on Regenerate, retained otherwise) to this module and request a named stream by label from the closed registry; the module returns a deterministic sequence for that label that no other label's consumption affects. The seed's documented string encoding is exposed for retention on the generation result.

## EXPECTATION
The same complete request and the same seed reproduce the same named stream for every label, and therefore the same result, satisfying the business-layer determinism guarantee. Consuming an additional value from one named stream never changes the sequence produced by any other named stream. A cross-runtime reproduction mismatch is caught by the versioned golden fixtures rather than passing silently.
