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
  - [[module_session_seed_plan]]
type: MODULE
layer: ARCHITECTURE
human_name: Seeded Tie Keys and Pseudorandom Streams
version: 0.4
tags: seed
---

# Seeded Tie Keys and Pseudorandom Streams

## INTENT
Give every seeded choice in generation a reproducible, non-interfering order derived from the seed the business layer already guarantees, without exposing the mechanism used to derive that reproducibility.

## THE RULE / LOGIC
A seed is a distinct 32-bit unsigned identity with a stable, documented string encoding, and every generation result retains that seed for reproduction. The generation stages do not draw from random streams: each one orders its candidates by a seeded tie key, the project's FNV-1a 32-bit hash of a versioned domain string (`infinite-flow/harmony-tie/v1`, `infinite-flow/rhythm-tie/v1`, `infinite-flow/pitch-tie/v1`, or the register tie-key domain), the seed, and the candidate's stable identity, together with whatever else that stage's key names (the rhythm grammar version, the pitch decision identity, or the generation-affecting register intent). A tie key depends only on its own inputs, so no stage's choices can shift another stage's results, and a new version of one domain string changes only that stage's order. Every hash step is forced to an unsigned 32-bit value, and the seed's encoding is fixed; cross-runtime reproduction (e.g. a different JavaScript engine) is protected by versioned golden fixtures rather than left to incidental platform agreement.

The favored figure draw (module_favored_figure_draw) is a seeded hash of the same kind, with a versioned domain string of its own, `infinite-flow/figure-draw/v1`, over the seed, the note's identity and the figure id: it decides whether a Favored or Strongly favored figure is tried first at a note, reads nothing any stage chooses, and draws from no stream. A candidate the pitch search tries first as a drawn figure takes its pitch tie key over the candidate's identity and the figure.

The module also holds a closed, versioned registry of named-stream labels (harmony, rhythm, pitch, register resolution, tie-breaking), each stream derived by mixing the seed with its label, but no generation stage draws from a named stream at present. A second closed registry, versioned on its own, holds indexed labels for streams drawn once per numbered event of a session (at present the settings mutation and the settings-mutation gap). Each indexed stream is derived from the seed, the label and a non-negative whole-number index, so the stream for the k-th event is known without replaying the ones before, and no other stream's consumption shifts it. Because each registry has its own version, a change to either derivation never shifts the other's streams.

## TECHNICAL INTERFACE
Orchestration and the generation-request boundary supply a 32-bit unsigned seed (freshly generated on Regenerate, retained otherwise); the seed's documented string encoding is exposed for retention on the generation result. The tie keys are `harmonyTieKey` and `rhythmTieKey` in `src/domain/generation/orchestration/candidate-ranking.ts`, `pitchTieKey` in `src/domain/pitch/pitch-tie-key.ts` and `registerTieKey` in `src/domain/profile/register-tie-key.ts`; the favored figure draw is `isFigureDrawn` in `src/domain/pitch/figure-draw.ts`, under `FIGURE_DRAW_DOMAIN`; all hash with `fnv1a32` from `src/domain/random/hash32.ts`. `deriveNamedStream(seed, label)` in `src/domain/random/streams.ts`, with `label` from `STREAM_LABELS` under `STREAM_REGISTRY_VERSION`, has no caller outside that file and its unit tests. The session's settings mutation requests an indexed stream with `deriveIndexedStream(seed, label, index)` from the same file, where `label` comes from `INDEXED_STREAM_LABELS` (`settings-mutation`, `settings-mutation-gap`) under `INDEXED_STREAM_REGISTRY_VERSION`; an index that is negative or not a whole number throws `IndexedStreamError`.

## EXPECTATION
The same complete request and the same seed give the same tie keys, and therefore the same candidate orders and the same result, satisfying the business-layer determinism guarantee. A stage's tie keys depend only on its own domain string, the seed and its candidates, so no other stage's choices change them. The same seed, label and index always give the same indexed stream, and consuming one indexed stream never changes another. A cross-runtime reproduction mismatch is caught by the versioned golden fixtures rather than passing silently.
