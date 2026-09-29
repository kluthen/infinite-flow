---
id: rule_key_change_drops_harmonic_carry_in
status: DRAFT
version: 0.1
human_name: Key Change Drops Harmonic Carry-In
parents:
  - [[rule_join_carry_in_limited]]
  - [[rule_session_change_applies_at_phrase_boundary]]
dependents: []
type: RULE
layer: BUSINESS
priority: 1
tags: [v2, release-v2.0, session, phrase-join]
---

# Key Change Drops Harmonic Carry-In

## INTENT
Keep carry-in consistent with a key or collection that changed during a session.

## THE RULE / LOGIC
When a key or collection change applies at a phrase boundary during a session, the harmonic part of carry-in (the final harmony event and its endpoint class) is dropped for the next phrase. The pitch part still applies, re-checked against the active range and the register window. A register change applied during a session re-resolves a Varying register.

## TECHNICAL INTERFACE
The next phrase's generation receives carry-in without its harmonic part after a key or collection change.

## EXPECTATION
- After a key or collection change, the next phrase is generated without the previous phrase's final harmony event or endpoint class, while its last pitch and leap state still apply within range and register window.
- After a register change, a Varying register is resolved again.
