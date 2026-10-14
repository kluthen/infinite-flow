---
id: entity_phrase_carry_in
status: REVIEW
version: 0.4
parents:
  - [[rule_harmony_change_drops_unfit_harmonic_carry_in]]
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

Hold, as one typed immutable value, everything a session phrase hands forward to the phrase generated after it, so the next phrase's generation can smooth the join and nothing else about the phrase before can reach it.

## THE RULE / LOGIC

A carry-in holds exactly four items and nothing else: the last sounding concert pitch of the phrase that just ended, with its leap state at that point (the signed interval that arrived at it, or none when the phrase sounded one note, and whether a large leap's recovery is still owed, with that leap's direction); the phrase's resolved register window; its final harmony event, reduced to the chord (collection degree, pitch classes and quality) and its harmonic role, together with the endpoint class that chord belongs to, or no harmony at all (null), which happens only when a setting change applied during a session dropped the harmonic part; and the phrase's ordinal position in the session. Tempo, seeds, settings and the rest of the phrase are not part of it. A carry-in is only ever made valid: the pitch lies inside the carried window, the leap state is self-consistent (an owed recovery needs an arriving interval of at least a skip in the owed leap's direction), when a chord is carried, a carried pitch outside it is a tense note and must have been reached by a step, and the ordinal is a positive whole number. Against the request that receives it, the carried window must be one of the windows that request's register choice offers (for Varying, one of the windows Varying offers, which in a session is the one resolved for the session's first phrase; for a fixed register, exactly that register's window), a carried chord must be one the request's own harmony settings end a phrase on, with the same endpoint class, and whatever the carried pitch still owes must be settleable by the next phrase's first note inside the carried window: when a chord is carried, a tense note must be a scale tone of the request's collection one step from a tone of its tonic triad, and an owed recovery must be able to land on a tonic-triad tone one to four semitones back against the leap. A generation request may carry at most one carry-in; a request without one is exactly a first-release request. The carry-in travels inside the outer generation intent and the resolved core request, across the generation worker boundary, and is re-validated there from untrusted input like every other request field. It is derived from a successfully generated phrase and the ordinal it was given. Without a carried harmony, every tense-note check is skipped, and the other checks apply unchanged.

## TECHNICAL INTERFACE
Callers make a carry-in from its four items, its final harmony typed `finalHarmony: CarriedHarmony | null`, or derive one from a successful generation outcome and its ordinal, receiving a deep-frozen value or a typed CarryInError naming the offending item. An untrusted wire value parses into a carry-in with the same throw-on-invalid contract. Making a generation intent with a carry-in checks the carry-in against that intent and throws on any mismatch. Two of the checks against a receiving intent are exported from `src/domain/generation/carry-in/carry-in-fit.ts` as predicates, `carriedHarmonyFits(harmony, receiver)` (the receiver's harmony settings end a phrase on the carried chord with its endpoint class) and `carriedDebtProblem(carryIn, receiver)` (why what the carried pitch owes cannot be settled inside the carried window, or null when it can), so the session's carry-in adaptation after a setting change, `adaptCarryIn`, uses the very checks the intent's own carry-in check uses and the two never disagree.

## EXPECTATION

Every carry-in holds exactly the four items and no other field; a malformed or inconsistent carry-in is refused loudly at construction, at intent construction and at the worker boundary, never repaired; a carry-in round-trips unchanged through the worker protocol; and a request without a carry-in serializes exactly as before carry-in existed. A carry-in with `finalHarmony: null` is accepted, skips the tense-note checks, and round-trips unchanged too.
