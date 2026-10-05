---
id: module_phrase_replay_key
status: DRAFT
layer: ARCHITECTURE
notes: Captured 2026-10-01 before code (branch replay-key, pre-code architecture capture). Owner decisions, recorded as rationale - the key excludes the app version and commit, so a later generator change may replay a key differently, which is accepted; the key is a debugging basis for the generator. Revised 2026-10-03 before code in v2 chunk 24 (pre-code architecture capture) for the settings-mutation engine (previous version 0.1) - the carry-in final harmony may be null, the key stays ifk1. and every older key still decodes. Status stays DRAFT.
human_name: Phrase Replay Key
version: 0.2
priority: 1
tags: generation,replay,seed,debugging
parents:
  - [[entity_phrase_carry_in]]
  - [[module_generation_worker_protocol]]
  - [[module_named_stream_pseudorandomness]]
  - [[rule_seeded_phrase_reproduction]]
  - [[rule_session_history_keeps_timeline_and_inputs]]
dependents:
  - [[service_headless_phrase_replay]]
type: MODULE
---

# Phrase Replay Key

## INTENT

Give every accepted phrase one self-contained, versioned text key holding exactly the inputs that reproduce it, make that key visible in the developer console when the phrase is accepted, and turn a key back into the exact generation request, so the phrase can be replayed outside the app from the key alone.

## THE RULE / LOGIC

A replay key is the prefix `ifk1.` followed by the unpadded base64url encoding of the UTF-8 JSON of a fixed-length 7-tuple: the request id; the seed as an unsigned 32-bit integer; the 14 generation controls in a fixed key order the codec owns, whose tonal-center slot holds the written tonal center (the form the generation intent's input takes); the musical profile; whether that profile is custom; the phrase number; and the carry-in, or null. A carried final harmony may itself be null, after a setting change dropped it; the format and its `ifk1.` prefix stay unchanged, since every older key, whose carry-in always holds a harmony, still decodes exactly as before. The key stores only these owning inputs: the instrument profile, register intent, concert tonal center, measure count and meter are rebuilt from them, never stored. It holds no played notes and nothing beyond the generation intent's own owning fields and the phrase number; the tempo control is stored as one of the 14 controls, though tempo never affects generation. It holds no app version or commit either, so a later generator change may replay an older key differently.

The request id is kept because it appears in the generation result, which a byte-identical replay needs. The generation worker envelope's per-client message id is not kept: it never affects the outcome, and replay always uses id 1. The phrase number is replay context, not a generation input: it is 1 for a workspace phrase and the session phrase number for a session phrase, and serves only to derive the phrase's carry-out. When a carry-in is present, the phrase number equals the carry-in's own phrase number plus one, the carry-in's number being that of the phrase that produced it.

Decoding checks the prefix and version first and rejects an unsupported version; a malformed base64url, JSON or tuple shape throws a typed PhraseReplayKeyError. The owning fields are then validated and the full generation intent rebuilt by the same validation the generation worker protocol uses to parse a generation intent, shared rather than duplicated: there is no parallel schema and no default for a missing or invalid field.

The key is emitted once per accepted phrase as one console line `[Infinite Flow] phrase replay key · <context> · <seed in seed1- form> · <key>`, production builds included, where the context names the phrase: a workspace phrase, or a session phrase with its number and whether it was generated with a carry-in or standalone. A workspace phrase is accepted when a fit-run attempt ends published, drawn or kept as a retryable notation error, for a Generate, Regenerate, Retry, profile-switch or room-notice replacement run. A session phrase is accepted when it is readied with a carry-in or standalone origin, a look-ahead phrase readied but never sounded included. Discarded fit attempts (too wide, no room, stale), failed session attempts and repeat phrases emit nothing: a repeat generates nothing new, and the phrase it repeats already emitted its key. The console sink is injected at the composition root, the production sink being console.info; the key is never sent over a network or stored.

## TECHNICAL INTERFACE

`src/generation-worker/phrase-replay-key.ts` holds the key format's shared constants, the PhraseReplayKeyError typed failure and the encoder: it encodes a generation intent and a phrase number (the carry-in travelling inside the intent) into a key string, and renders and announces the single console line. `src/generation-worker/phrase-replay-key-decode.ts` holds the decoder, kept apart so the app's entry chunk carries only the encoder and never the protocol's intent validation: it decodes a key string into its key version, the validated generation intent (carry-in included) and the phrase number, throwing PhraseReplayKeyError on a malformed or unsupported key. The generation worker protocol's worker-bound side, `src/generation-worker/generation-worker-inbound.ts`, exports rebuildGenerationWorkerIntent, the generation-intent validation and rebuild its request parser already uses, with unchanged behaviour, for the decoder to share. The workspace session composition takes a replay-key sink as a dependency, console.info in production.

## EXPECTATION

Encoding then decoding returns an equal generation intent, phrase number and carry-in. A key with another prefix, an unsupported version, a malformed encoding or a wrong tuple shape throws PhraseReplayKeyError; a key whose fields fail generation-intent validation, or whose phrase number is not its carry-in's number plus one, is rejected and never repaired or defaulted. Every accepted phrase emits exactly one key line; a discarded attempt, a failed session attempt or a repeat phrase emits none. A key never holds played notes, an app version or the worker message id. A key whose carry-in has a null final harmony encodes and decodes back to an equal intent under the same `ifk1.` prefix, and every key encoded before this change still decodes to the same intent.
