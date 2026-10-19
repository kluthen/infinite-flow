---
id: module_phrase_replay_key
status: REVIEW
layer: ARCHITECTURE
human_name: Phrase Replay Key
version: 0.6
priority: 1
tags: generation,replay,seed,debugging
parents:
  - [[entity_my_instrument]]
  - [[entity_phrase_carry_in]]
  - [[module_figure_levels]]
  - [[module_generation_worker_protocol]]
  - [[module_named_stream_pseudorandomness]]
  - [[rule_figure_draws_reproducible]]
  - [[rule_seeded_phrase_reproduction]]
  - [[rule_session_history_keeps_timeline_and_inputs]]
dependents:
  - [[service_headless_phrase_replay]]
type: MODULE
---

# Phrase Replay Key

## INTENT
Give every accepted phrase one self-contained, versioned text key holding exactly the inputs that reproduce it, its figure levels and My instrument's profile included, make that key visible in the developer console when the phrase is accepted, and turn a key of any supported version back into the exact generation request, so the phrase can be replayed outside the app from the key alone.

## THE RULE / LOGIC
A replay key is a version prefix followed by the unpadded base64url encoding of the UTF-8 JSON of a tuple. Three versions decode; only the newest is written.

Version 3, `ifk3.`, is written for every phrase, whatever its instrument. It holds what version 2 holds except the musical profile and its customized flag, plus the seven figure levels stored by figure id, each figure id paired with its level id (module_figure_levels): the request id; the seed; the 14 generation controls; the figure levels; the phrase number; the carry-in, or null; and, for My instrument only, its owning profile fields as version 2 stores them, a built-in instrument being named by its id in the controls, as in version 1. Its tuple always has seven entries, in this order, permanent once a key is emitted: (0) the request id, a string; (1) the seed, an unsigned 32-bit integer; (2) the 14 generation controls in the codec's fixed control order, the tonal-center slot holding the written tonal center; (3) the figure levels, a JSON object holding exactly the seven figure ids as keys, written in the figures' fixed order, each mapped to its level id; (4) the phrase number; (5) the carry-in, or null; (6) My instrument's owning profile fields `[displayName, minMidi, maxMidi, chromatic, diatonic]`, or JSON `null` for a built-in instrument, the built-in marker, the controls naming the built-in by its id. No musical profile's or preset's name is stored: a preset can be renamed, changed, deleted or retuned, and the key keeps what the phrase was made with. A new version rather than an extension of version 2, so that an app that knows only versions 1 and 2 refuses a version 3 key instead of replaying a different phrase without saying so.

Version 1, `ifk1.`, a 7-tuple (the request id; the seed as an unsigned 32-bit integer; the 14 generation controls in a fixed key order the codec owns, whose tonal-center slot holds the written tonal center; the musical profile; whether that profile is custom; the phrase number; the carry-in, or null), for a built-in instrument, and version 2, `ifk2.`, an 8-tuple of those seven entries then My instrument's owning profile fields (its display name, its concert range as lowest and highest MIDI note, and its chromatic and diatonic transposition counts), for My instrument, are decoded only: their musical profile becomes that profile's figure levels through levelsForProfile, Neutral's or Jazz's, whatever its customized flag, since being customized never changed the figures. Every `ifk1.` key written by v2.0, and every `ifk1.` and `ifk2.` key written by v3.0, still decodes to the same phrase and replays to it byte for byte, which two recorded corpora check; a generator change that would replay one differently is a defect. A carried final harmony may be null in any version.

In every version the key stores only owning inputs: the instrument profile of a built-in, the register intent, the concert tonal center, the measure count and the meter are rebuilt from them, never stored. My instrument's profile id is not stored, the controls already naming `my-instrument`, nor its register windows, derived from the concert range; its template, clef, written range as entered and input kind are never stored, so two phrases that differ only by My instrument's clef have the same key. A key holds no played notes, no app version or commit, and nothing beyond the generation intent's owning fields and the phrase number; the tempo control is stored as one of the 14 controls, though tempo never affects generation. A key is replayed by the generator as it is now.

The request id is kept because it appears in the generation result, which a byte-identical replay needs. The generation worker envelope's per-client message id is not kept: it never affects the outcome, and replay always uses id 1. The phrase number is replay context, not a generation input: it is 1 for a workspace phrase and the session phrase number for a session phrase, and serves only to derive the phrase's carry-out. When a carry-in is present, the phrase number equals the carry-in's own phrase number plus one.

Decoding checks the prefix and version first and rejects any version other than 1, 2 and 3 as unsupported; a malformed base64url, JSON or tuple shape for its version throws a typed PhraseReplayKeyError. A version 3 key naming a figure this version does not know, or a level it does not know, is refused with the reason, rather than replayed without it. A version 1 or 2 key whose profile slot, slot 3, names no musical profile is refused with a PhraseReplayKeyError naming that slot. My instrument's full profile is rebuilt from the stored fields by the same derivation the generation worker's inbound parser uses, shared rather than duplicated, and taking no clef. The owning fields are then validated and the full generation intent rebuilt by the same validation the generation worker protocol uses to parse a generation intent, shared rather than duplicated: there is no parallel schema and no default for a missing or invalid field. So a key whose controls name `my-instrument` without its profile, or a built-in with one, is rejected, and so is a profile no My instrument can have. A decoded intent holds the figure levels and no musical profile, whatever its key's version.

The key is emitted once per accepted phrase as one console line `[Infinite Flow] phrase replay key · <context> · <seed in seed1- form> · <key>`, production builds included, where the context names the phrase: a workspace phrase, or a session phrase with its number and whether it was generated with a carry-in or standalone. A workspace phrase is accepted when a fit-run attempt ends published, drawn or kept as a retryable notation error, for a Generate, Regenerate, Retry, profile-switch or room-notice replacement run. A session phrase is accepted when it is readied with a carry-in or standalone origin, a look-ahead phrase readied but never sounded included. Discarded fit attempts (too wide, no room, stale), failed session attempts and repeat phrases emit nothing: a repeat generates nothing new, and the phrase it repeats already emitted its key. The console sink is injected at the composition root, the production sink being console.info; the key is never sent over a network or stored.

## TECHNICAL INTERFACE
`src/generation-worker/phrase-replay-key.ts` holds the key format's shared constants (the three version prefixes and PHRASE_REPLAY_KEY_CONTROL_ORDER, the controls' fixed order), the PhraseReplayKeyError typed failure and the encoder: it encodes a generation intent and a phrase number (the carry-in travelling inside the intent) into an `ifk3.` key string, and renders and announces the single console line. `src/generation-worker/phrase-replay-key-decode.ts` holds the decoder, kept apart so the app's entry chunk carries only the encoder and never the protocol's intent validation: it decodes a key string of any of the three versions into its key version (`ifk1`, `ifk2` or `ifk3`), the validated generation intent (figure levels, carry-in and My instrument's profile included) and the phrase number, throwing PhraseReplayKeyError on a malformed or unsupported key; a version 1 or 2 key's profile goes through levelsForProfile (src/domain/figures/figure-levels.ts). The generation worker protocol's worker-bound side, `src/generation-worker/generation-worker-inbound.ts`, exports rebuildGenerationWorkerIntent, the generation-intent validation and rebuild its request parser uses, for the decoder to share, and deriveMyInstrumentProfile, the my-instrument derivation that parser uses. The workspace session composition takes a replay-key sink as a dependency, console.info in production. `npm run replay:phrase` (service_headless_phrase_replay) replays keys of all three versions.

## EXPECTATION
- Every phrase's key is `ifk3.`, for a built-in instrument and for My instrument; encoding then decoding returns an equal generation intent, figure levels, phrase number, carry-in and My instrument's profile included.
- Every `ifk1.` and `ifk2.` key decodes to an intent holding its profile's levels, a customized Jazz key to Jazz's, and replays to the same phrase, byte for byte, over both recorded corpora.
- A key with another prefix, an unsupported version such as `ifk4.`, a malformed encoding or a wrong tuple shape for its version throws PhraseReplayKeyError; an `ifk3.` key naming an unknown figure or level is refused with the reason; an `ifk1.` or `ifk2.` key naming an unknown musical profile is refused with a PhraseReplayKeyError naming slot 3; a key whose fields fail generation-intent validation, or whose phrase number is not its carry-in's number plus one, is rejected and never repaired or defaulted.
- A key whose controls name `my-instrument` without its profile, one naming a built-in with a profile, and a profile no My instrument can have are rejected.
- No key and no decoded intent holds a musical profile's or a preset's name.
- Two phrases that differ only by My instrument's clef encode to the same key; a key holds no clef, template, written range as entered or input kind.
- Every accepted phrase emits exactly one key line; a discarded attempt, a failed session attempt or a repeat phrase emits none.
- A key never holds played notes, an app version or the worker message id.
- A key whose carry-in has a null final harmony encodes and decodes back to an equal intent.
