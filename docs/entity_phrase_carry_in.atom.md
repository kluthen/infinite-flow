---
id: entity_phrase_carry_in
status: REVIEW
version: 0.6
parents:
  - [[rule_harmony_change_drops_unfit_harmonic_carry_in]]
  - [[rule_jam_phrase_one_joins_doodle]]
  - [[rule_join_carry_in_limited]]
  - [[rule_key_change_drops_harmonic_carry_in]]
dependents:
  - [[module_phrase_replay_key]]
  - [[module_session_carry_in_after_change]]
type: ENTITY
layer: ARCHITECTURE
human_name: Phrase Carry-In
priority: 1
tags: [v2, release-v2.0, session, phrase-join]
---

# Phrase Carry-In

## INTENT
Hold, as one typed immutable value, everything that crosses a join into the next generated phrase, from the phrase before it or, for a Jam's phrase 1, from the doodle, so the join can be smoothed and nothing else can reach the phrase.

## THE RULE / LOGIC
A carry-in has an origin: a phrase, or no phrase.

A carry-in from a phrase holds exactly four items and nothing else: the last sounding concert pitch of the phrase that just ended, with its leap state at that point (the signed interval that arrived at it, or none when the phrase sounded one note, and whether a large leap's recovery is still owed, with that leap's direction); the phrase's resolved register window; its final harmony event, reduced to the chord (collection degree, pitch classes and quality) and its harmonic role, together with the endpoint class that chord belongs to, or no harmony at all (null), which happens only when a setting change applied during a session dropped the harmonic part; and the phrase's ordinal position in the session. Tempo, seeds, settings and the rest of the phrase are not part of it. A carry-in from a phrase is only ever made valid: the pitch lies inside the carried window, the leap state is self-consistent (an owed recovery needs an arriving interval of at least a skip in the owed leap's direction), when a chord is carried, a carried pitch outside it is a tense note and must have been reached by a step, and the ordinal is a positive whole number. It is derived from a successfully generated phrase and the ordinal it was given. It keeps exactly the fields and the form it had before v3.2, in a request, across the worker boundary, in a replay key and in a kept session, so every request, key and kept record made before keeps reading as it did.

A carry-in from no phrase is the doodle's join into a Jam's phrase 1. It holds only the doodle's last concert pitch, reached by no interval and owing no leap recovery, and the register window; no chord and no ordinal. Its only check of its own is that the pitch lies inside the window. A generation intent, and the resolved request built from it, accept a carry-in from no phrase only when they also hold a steering block.

Against the request that receives it, whatever its origin, the carried window must be one of the windows that request's register choice offers (for Varying, one of the windows Varying offers, which in a session is the one resolved for the session's first phrase; for a fixed register, exactly that register's window), a carried chord must be one the request's own harmony settings end a phrase on, with the same endpoint class, and whatever the carried pitch still owes must be settleable by the next phrase's first note inside the carried window: when a chord is carried, a tense note must be a scale tone of the request's collection one step from a tone of its tonic triad, and an owed recovery must be able to land on a tonic-triad tone one to four semitones back against the leap. Without a carried harmony, every tense-note check is skipped, and the other checks apply unchanged. A generation request may carry at most one carry-in; a request without one is exactly a first-release request. The carry-in travels inside the outer generation intent and the resolved core request, across the generation worker boundary, and is re-validated there from untrusted input like every other request field.

## TECHNICAL INTERFACE
Callers make a carry-in from its items, its final harmony typed `finalHarmony: CarriedHarmony | null`, or derive one from a successful generation outcome and its ordinal, receiving a deep-frozen value or a typed CarryInError naming the offending item; `makeCarryIn` keeps every refusal for a carry-in from a phrase and checks only the pitch against the window for one from no phrase. An untrusted wire value parses into a carry-in with the same throw-on-invalid contract (`parseCarryIn`). Making a generation intent with a carry-in checks the carry-in against that intent and throws on any mismatch; `makeCarryInGenerationIntent` refuses a carry-in from no phrase without a steering block. `carriedMotionState` (src/domain/pitch/pitch-carry-in.ts) reads a carry-in from no phrase as the note before beat 1, reached by no interval. Two of the checks against a receiving intent are exported from `src/domain/generation/carry-in/carry-in-fit.ts` as predicates, `carriedHarmonyFits(harmony, receiver)` (the receiver's harmony settings end a phrase on the carried chord with its endpoint class) and `carriedDebtProblem(carryIn, receiver)` (why what the carried pitch owes cannot be settled inside the carried window, or null when it can), so the session's carry-in adaptation after a setting change, `adaptCarryIn`, uses the very checks the intent's own carry-in check uses and the two never disagree. `CarryIn` is `PhraseCarryIn | NoPhraseCarryIn` (src/domain/generation/carry-in/carry-in.ts), told apart by `isPhraseCarryIn`. A carry-in from a phrase has v3.1's four keys, `{ lastPitch, registerWindow, finalHarmony, phraseNumber }`, and no origin key; a carry-in from no phrase is `{ origin: 'none', lastPitch: { midi, arrivingInterval: null, recovery: { kind: 'settled' } }, registerWindow, finalHarmony: null }`, so every reader of the pitch, the window and the harmony reads both. `parseCarryIn` reads either origin; `parsePhraseCarryIn` reads a carry-in from a phrase only, in v3.1's exact form, and the `ifk1.` to `ifk3.` replay key decoders and the kept-session codec read carry-ins through it, so a carry-in from no phrase is refused there as before v3.2. `requireConsistentPhraseNumber` (src/generation-worker/phrase-replay-key.ts) requires phrase number 1 with a carry-in from no phrase, and the `ifk3.` encoder refuses an intent holding one with a PhraseReplayKeyError, the key having no form for it. The session's carry-in adaptation keeps a carry-in's origin. Nothing makes a carry-in from no phrase until Jam's engine does.

## EXPECTATION
Every carry-in from a phrase holds exactly the four items and no other field, in the form it had before v3.2; a malformed or inconsistent carry-in is refused loudly at construction, at intent construction and at the worker boundary, never repaired; a carry-in round-trips unchanged through the worker protocol; and a request without a carry-in serializes exactly as before carry-in existed. A carry-in with `finalHarmony: null` is accepted, skips the tense-note checks, and round-trips unchanged too. A carry-in from no phrase holds only the pitch and the window, is accepted with the pitch inside the window and refused outside it, and is refused by an intent without a steering block; a carry-in from a phrase with ordinal 0 is still refused.
