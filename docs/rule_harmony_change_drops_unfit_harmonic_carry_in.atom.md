---
id: rule_harmony_change_drops_unfit_harmonic_carry_in
status: REVIEW
dependents:
  - [[entity_phrase_carry_in]]
  - [[module_session_carry_in_after_change]]
  - [[service_session_engine]]
human_name: Unfit Harmony Drops Harmonic Carry-In
parents:
  - [[rule_join_carry_in_limited]]
  - [[rule_session_change_applies_at_phrase_boundary]]
notes: Captured 2026-10-03 before code in v2 chunk 24 (pre-code capture) from the coding leader plan, as an extension of the key-change rule. Proposed by the coding leader and accepted by the owner on 2026-10-03 (D181). Revised 2026-10-05 (previous version 0.1) to cover a multi-phrase tension arc step between two phrases as well as a setting change, as v2 chunk 29 built it; the extension was proposed in the chunk 29 post-task sync and accepted by the product owner (spec D186).
type: RULE
layer: BUSINESS
version: 0.2
priority: 1
tags: [v2, release-v2.0, part-v2.1, session, phrase-join]
---

# Unfit Harmony Drops Harmonic Carry-In

## INTENT
Keep carry-in consistent with harmony settings that differ between two consecutive session phrases.

## THE RULE / LOGIC
When the next session phrase is generated under different settings from the phrase before it, because a setting change applies at that phrase boundary or because the multi-phrase tension arc steps the tension between the two phrases, and the previous phrase's final harmony event no longer fits the settings the next phrase is generated under, because those settings never end a phrase on that chord with that endpoint class, the harmonic part of carry-in (the final harmony event and its endpoint class) is dropped for the next phrase, as it is after a key or collection change. This rule drops only the harmonic part.

## TECHNICAL INTERFACE
The next phrase's generation receives carry-in without its harmonic part when the carried chord no longer fits the settings that phrase is generated under.

## EXPECTATION
- After a setting change, or across a multi-phrase tension arc step, under which the next phrase's settings never end a phrase on the previous phrase's final chord with its endpoint class, the next phrase is generated without that chord or endpoint class.
- When the final harmony still fits the next phrase's settings, and neither the key nor the collection changed, the harmonic part is kept.
