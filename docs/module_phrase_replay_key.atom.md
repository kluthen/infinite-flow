---
id: module_phrase_replay_key
status: REVIEW
layer: ARCHITECTURE
human_name: Phrase Replay Key
version: 0.3
priority: 1
tags: generation,replay,seed,debugging
parents:
  - [[entity_my_instrument]]
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
Give every accepted phrase one self-contained, versioned text key holding exactly the inputs that reproduce it, My instrument's profile included when the phrase was made for it, make that key visible in the developer console when the phrase is accepted, and turn a key back into the exact generation request, so the phrase can be replayed outside the app from the key alone.

## THE RULE / LOGIC
A replay key is a version prefix followed by the unpadded base64url encoding of the UTF-8 JSON of a fixed-length tuple. There are two versions, chosen by the phrase's instrument.

Version 1, `ifk1.`, is written exactly when the phrase's instrument is one of the built-in profiles: a 7-tuple of the request id; the seed as an unsigned 32-bit integer; the 14 generation controls in a fixed key order the codec owns, whose tonal-center slot holds the written tonal center (the form the generation intent's input takes); the musical profile; whether that profile is custom; the phrase number; and the carry-in, or null. A carried final harmony may itself be null, after a setting change dropped it; every older key, whose carry-in always holds a harmony, still decodes exactly as before. A built-in phrase's key is byte-identical to the one the app wrote before version 2 existed.

Version 2, `ifk2.`, is written exactly when the phrase's instrument is My instrument, whose profile is not in the built-in table and so must travel inside the key. It is an 8-tuple: the seven entries of version 1, unchanged in order and meaning, then My instrument's owning profile fields, as the generation intent's my-instrument profile holds them: its display name, its concert range (lowest and highest MIDI note) and its transposition (the chromatic and diatonic counts). The display name is included because it is part of the profile the intent carries, so a key without it could not decode to an equal intent without making a name up, and the key never defaults a field. The profile's id is not stored, the controls already naming `my-instrument`; its register windows are not stored, being derived from the concert range by the built-in window policy. The template, the clef, the written range as the player entered it and the input kind are not part of the generator-facing profile and are never stored: two phrases that differ only by My instrument's clef have the same key.

Either way the key stores only owning inputs: the instrument profile of a built-in, the register intent, the concert tonal center, the measure count and the meter are rebuilt from them, never stored. It holds no played notes and nothing beyond the generation intent's own owning fields and the phrase number; the tempo control is stored as one of the 14 controls, though tempo never affects generation. It holds no app version or commit either, so a later generator change may replay an older key differently.

The request id is kept because it appears in the generation result, which a byte-identical replay needs. The generation worker envelope's per-client message id is not kept: it never affects the outcome, and replay always uses id 1. The phrase number is replay context, not a generation input: it is 1 for a workspace phrase and the session phrase number for a session phrase, and serves only to derive the phrase's carry-out. When a carry-in is present, the phrase number equals the carry-in's own phrase number plus one, the carry-in's number being that of the phrase that produced it.

Decoding checks the prefix and version first and rejects any version other than 1 and 2; a malformed base64url, JSON or tuple shape for its version throws a typed PhraseReplayKeyError. For a version 2 key, My instrument's full profile is rebuilt from the stored fields by the same derivation the generation worker's inbound parser uses to check a my-instrument profile, shared rather than duplicated, and taking no clef. The owning fields are then validated and the full generation intent rebuilt by the same validation the generation worker protocol uses to parse a generation intent, shared rather than duplicated: there is no parallel schema and no default for a missing or invalid field. So a version 1 key whose controls name `my-instrument` is rejected, its profile being missing; a version 2 key whose controls name a built-in is rejected, a profile being supplied for a built-in id; and a version 2 profile no My instrument can have is rejected.

The key is emitted once per accepted phrase as one console line `[Infinite Flow] phrase replay key · <context> · <seed in seed1- form> · <key>`, production builds included, where the context names the phrase: a workspace phrase, or a session phrase with its number and whether it was generated with a carry-in or standalone. A workspace phrase is accepted when a fit-run attempt ends published, drawn or kept as a retryable notation error, for a Generate, Regenerate, Retry, profile-switch or room-notice replacement run. A session phrase is accepted when it is readied with a carry-in or standalone origin, a look-ahead phrase readied but never sounded included. Discarded fit attempts (too wide, no room, stale), failed session attempts and repeat phrases emit nothing: a repeat generates nothing new, and the phrase it repeats already emitted its key. The console sink is injected at the composition root, the production sink being console.info; the key is never sent over a network or stored.

## TECHNICAL INTERFACE
`src/generation-worker/phrase-replay-key.ts` holds the key format's shared constants (both version prefixes), the PhraseReplayKeyError typed failure and the encoder: it encodes a generation intent and a phrase number (the carry-in travelling inside the intent) into a key string, `ifk1.` for a built-in instrument and `ifk2.` for My instrument, and renders and announces the single console line. `src/generation-worker/phrase-replay-key-decode.ts` holds the decoder, kept apart so the app's entry chunk carries only the encoder and never the protocol's intent validation: it decodes a key string of either version into its key version (`ifk1` or `ifk2`), the validated generation intent (carry-in and, for `ifk2`, My instrument's profile included) and the phrase number, throwing PhraseReplayKeyError on a malformed or unsupported key. The generation worker protocol's worker-bound side, `src/generation-worker/generation-worker-inbound.ts`, exports rebuildGenerationWorkerIntent, the generation-intent validation and rebuild its request parser already uses, with unchanged behaviour, for the decoder to share; the decoder rebuilds a version 2 key's profile through the same my-instrument derivation that parser uses, deriveMyInstrumentProfile, exported from that file and shared. The workspace session composition takes a replay-key sink as a dependency, console.info in production. `npm run replay:phrase` (service_headless_phrase_replay) replays keys of both versions.

## EXPECTATION
- Encoding then decoding returns an equal generation intent, phrase number and carry-in, for a built-in instrument under `ifk1.` and for My instrument under `ifk2.`, My instrument's profile included.
- A built-in phrase's key is `ifk1.`, byte-identical to the key written before version 2; every key encoded before version 2 still decodes to the same intent.
- A key with another prefix, an unsupported version, a malformed encoding or a wrong tuple shape for its version throws PhraseReplayKeyError; a key whose fields fail generation-intent validation, or whose phrase number is not its carry-in's number plus one, is rejected and never repaired or defaulted. An `ifk1.` key naming `my-instrument`, an `ifk2.` key naming a built-in, and an `ifk2.` profile no My instrument can have are rejected.
- Two phrases that differ only by My instrument's clef encode to the same key; a key holds no clef, template, written range as entered or input kind.
- Every accepted phrase emits exactly one key line; a discarded attempt, a failed session attempt or a repeat phrase emits none.
- A key never holds played notes, an app version or the worker message id.
- A key whose carry-in has a null final harmony encodes and decodes back to an equal intent.
