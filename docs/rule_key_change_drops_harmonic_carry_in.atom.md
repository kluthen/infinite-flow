---
id: rule_key_change_drops_harmonic_carry_in
status: STABLE
version: 0.2
human_name: Key Change Drops Harmonic Carry-In
parents:
  - [[rule_join_carry_in_limited]]
  - [[rule_session_change_applies_at_phrase_boundary]]
dependents:
  - [[entity_phrase_carry_in]]
  - [[module_session_carry_in_after_change]]
  - [[service_session_engine]]
type: RULE
layer: BUSINESS
priority: 1
tags: [v2, release-v2.0, part-v2.1, session, phrase-join]
---

# Key Change Drops Harmonic Carry-In

## INTENT

Keep carry-in consistent with a key or collection that changed during a session.

## THE RULE / LOGIC

When a key or collection change applies at a phrase boundary during a session, the harmonic part of carry-in (the final harmony event and its endpoint class) is dropped for the next phrase.

## TECHNICAL INTERFACE

The next phrase's generation receives carry-in without its harmonic part after a key or collection change.

## EXPECTATION

- After a key or collection change, the next phrase is generated without the previous phrase's final harmony event or endpoint class.
