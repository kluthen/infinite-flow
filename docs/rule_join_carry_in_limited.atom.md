---
id: rule_join_carry_in_limited
status: STABLE
version: 0.2
tags: [v2, release-v2.0, session, phrase-join]
parents:
  - [[req_rolling_practice_session]]
dependents:
  - [[entity_phrase_carry_in]]
  - [[rule_harmony_change_drops_unfit_harmonic_carry_in]]
  - [[rule_join_inherits_leap_recovery]]
  - [[rule_join_interval_obeys_phrase_rules]]
  - [[rule_join_tense_note_resolution]]
  - [[rule_key_change_drops_harmonic_carry_in]]
  - [[rule_no_carry_in_output_matches_v1]]
  - [[rule_register_change_replaces_carried_window]]
  - [[rule_setting_change_rechecks_pitch_carry_in]]
  - [[rule_varying_register_once_per_session]]
type: RULE
layer: BUSINESS
priority: 1
human_name: Limited Forward Carry-In Across Phrase Joins
notes: Revised 2026-10-05 (previous version 0.1) for the multi-phrase tension arc built in v2 chunk 29: the tension a phrase is generated with may be stepped from its own position in the session, and a step between two phrases goes through the same carry-in adaptation as a setting change, which may drop or replace parts of the carry-in but never adds to it. Proposed in the chunk 29 post-task sync and accepted by the product owner (spec D186). Promoted to STABLE 2026-10-05: the product owner accepted the version 0.2 wording as written; nothing in it depends on the real-hardware checks.
---

# Limited Forward Carry-In Across Phrase Joins

## INTENT

Smooth the join between consecutive session phrases through a small, fixed handoff that only ever flows forward.

## THE RULE / LOGIC
When one phrase of a session is followed by the next, exactly four things cross the join (the "carry-in") into the next phrase's generation:

1. the last sounding concert pitch of the phrase that just ended, together with its leap and leap-recovery state at that point;
2. its resolved register window;
3. its final harmony event (the chord and its harmonic role) and the endpoint class that chord belongs to;
4. the phrase's ordinal position in the session.

Nothing else is visible across the join. In particular, each phrase's own tension arc (its build and release within its own four measures) is planned independently of carry-in and of every other phrase; when the multi-phrase tension arc runs, the tension a phrase is generated with is stepped from its own position in the session, never from another phrase's material. Where the next phrase is generated under different settings from the phrase before it, after a setting change or a multi-phrase tension arc step, carry-in can be adapted at the join, a part dropped or the carried register window replaced, as the carry-in adaptation rules say, but nothing beyond those four items is ever added. No stage of generating a later phrase ever revises anything about an earlier phrase.

## TECHNICAL INTERFACE

Generating a session phrase after the first takes the carry-in of the phrase before it, alongside the usual complete request and seed.

## EXPECTATION
- A session phrase's generation depends on the previous phrase only through those four carry-in items, as adapted at a join where the settings differ.
- A phrase already generated or shown never changes because of a later phrase.
