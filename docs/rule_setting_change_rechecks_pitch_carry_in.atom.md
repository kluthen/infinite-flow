---
id: rule_setting_change_rechecks_pitch_carry_in
status: DRAFT
dependents:
  - [[module_session_carry_in_after_change]]
  - [[service_session_engine]]
type: RULE
layer: BUSINESS
human_name: Setting Change Re-Checks the Pitch Carry-In
tags: [v2, release-v2.1, session, phrase-join]
version: 0.1
priority: 1
parents:
  - [[rule_join_carry_in_limited]]
  - [[rule_session_change_applies_at_phrase_boundary]]
  - [[rule_session_generation_failure_ladder]]
notes: Captured 2026-10-03 before code in v2 chunk 24 (pre-code capture) from the coding leader plan. The standalone phrase it falls back to is the failure ladder standalone shape.
---

# Setting Change Re-Checks the Pitch Carry-In

## INTENT

Never carry a pitch into the next phrase that the changed settings can no longer accept.

## THE RULE / LOGIC

After a setting change applies at a phrase boundary during a session, the pitch part of carry-in (the last sounding pitch with its leap state) is re-checked before the next phrase is generated: the pitch must lie inside the new active range and register window, and a leap recovery it still owes must be settleable within the new collection. If the re-check fails, the pitch part is dropped too, which leaves no carry-in: the phrase is generated standalone, its register window pinned to the session's register window as it stands after the change, in the same shape as the failure ladder's standalone retry. As for any standalone phrase, the join into it is not smoothed.

## TECHNICAL INTERFACE

After a setting change, the next phrase's request carries the pitch part only if it passes the re-check against the new settings; otherwise the request is standalone with the session's current register window pinned.

## EXPECTATION

- After a setting change, a carried pitch that lies inside the new range and register window, and whose owed leap recovery can still be settled in the new collection, still applies to the next phrase.
- Otherwise the next phrase is generated standalone, in the session's register window after the change.
- A phrase generated standalone after a failed re-check is a normal generated phrase, and the phrase after it carries in from it as usual.
