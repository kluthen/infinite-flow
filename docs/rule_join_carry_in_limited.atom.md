---
id: rule_join_carry_in_limited
status: DRAFT
version: 0.1
tags: [v2, release-v2.0, session, phrase-join]
parents:
  - [[req_rolling_practice_session]]
dependents:
  - [[entity_phrase_carry_in]]
  - [[rule_join_inherits_leap_recovery]]
  - [[rule_join_interval_obeys_phrase_rules]]
  - [[rule_join_tense_note_resolution]]
  - [[rule_key_change_drops_harmonic_carry_in]]
  - [[rule_no_carry_in_output_matches_v1]]
  - [[rule_varying_register_once_per_session]]
type: RULE
layer: BUSINESS
priority: 1
human_name: Limited Forward Carry-In Across Phrase Joins
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

Nothing else is visible across the join. In particular, each phrase's own tension arc (its build and release within its own four measures) is planned independently of carry-in and of every other phrase. No stage of generating a later phrase ever revises anything about an earlier phrase.

## TECHNICAL INTERFACE
Generating a session phrase after the first takes the carry-in of the phrase before it, alongside the usual complete request and seed.

## EXPECTATION
- A session phrase's generation depends on the previous phrase only through those four carry-in items.
- A phrase already generated or shown never changes because of a later phrase.
