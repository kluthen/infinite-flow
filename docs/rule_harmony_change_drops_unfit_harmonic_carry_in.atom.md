---
id: rule_harmony_change_drops_unfit_harmonic_carry_in
status: DRAFT
dependents:
  - [[entity_phrase_carry_in]]
  - [[service_session_engine]]
human_name: Unfit Harmony Drops Harmonic Carry-In
parents:
  - [[rule_join_carry_in_limited]]
  - [[rule_session_change_applies_at_phrase_boundary]]
notes: Captured 2026-10-03 before code in v2 chunk 24 (pre-code capture) from the coding leader plan, as an extension of the key-change rule. Proposed by the coding leader and accepted by the owner on 2026-10-03 (D181).
type: RULE
layer: BUSINESS
version: 0.1
priority: 1
tags: [v2, release-v2.1, session, phrase-join]
---

# Unfit Harmony Drops Harmonic Carry-In

## INTENT

Keep carry-in consistent with harmony settings that changed during a session.

## THE RULE / LOGIC

When a setting change applies at a phrase boundary during a session and the previous phrase's final harmony event no longer fits the new harmony settings, because those settings never end a phrase on that chord with that endpoint class, the harmonic part of carry-in (the final harmony event and its endpoint class) is dropped for the next phrase, as it is after a key or collection change. This rule drops only the harmonic part.

## TECHNICAL INTERFACE

The next phrase's generation receives carry-in without its harmonic part when the carried chord no longer fits the harmony settings in effect.

## EXPECTATION

- After a setting change under which the new harmony settings never end a phrase on the previous phrase's final chord with its endpoint class, the next phrase is generated without that chord or endpoint class.
- When the final harmony still fits the new harmony settings, and neither the key nor the collection changed, the harmonic part is kept.
