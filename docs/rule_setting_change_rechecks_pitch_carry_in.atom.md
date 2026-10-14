---
id: rule_setting_change_rechecks_pitch_carry_in
status: STABLE
dependents:
  - [[module_session_carry_in_after_change]]
  - [[service_session_engine]]
type: RULE
layer: BUSINESS
human_name: Setting Change Re-Checks the Pitch Carry-In
tags: [v2, release-v2.0, part-v2.1, session, phrase-join]
version: 0.2
priority: 1
parents:
  - [[rule_join_carry_in_limited]]
  - [[rule_session_change_applies_at_phrase_boundary]]
  - [[rule_session_generation_failure_ladder]]
---

# Setting Change Re-Checks the Pitch Carry-In

## INTENT

Never carry a pitch into the next phrase that the changed settings can no longer accept.

## THE RULE / LOGIC
After a setting change applies at a phrase boundary during a session, or the multi-phrase tension arc steps the tension between two phrases, the pitch part of carry-in (the last sounding pitch with its leap state) is re-checked against the settings the next phrase is generated under before that phrase is generated: the pitch must lie inside the active range and register window, and a leap recovery it still owes must be settleable within the collection. If the re-check fails, the pitch part is dropped too, which leaves no carry-in: the phrase is generated standalone, its register window pinned to the session's register window as it stands after the change, in the same shape as the failure ladder's standalone retry. As for any standalone phrase, the join into it is not smoothed.

## TECHNICAL INTERFACE
After a setting change or a multi-phrase tension arc step, the next phrase's request carries the pitch part only if it passes the re-check against the settings that phrase is generated under; otherwise the request is standalone with the session's current register window pinned.

## EXPECTATION
- After a setting change or across a multi-phrase tension arc step, a carried pitch that lies inside the active range and register window the next phrase is generated under, and whose owed leap recovery can still be settled in its collection, still applies to the next phrase.
- Otherwise the next phrase is generated standalone, in the session's register window after the change.
- A phrase generated standalone after a failed re-check is a normal generated phrase, and the phrase after it carries in from it as usual.
