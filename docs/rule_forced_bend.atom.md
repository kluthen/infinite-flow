---
id: rule_forced_bend
status: DRAFT
layer: BUSINESS
priority: 1
human_name: A Forced Bend Instead of a Failed Phrase
tags: [v3, release-v3.2, session, rhythm, rhythm-lock, error-handling]
parents:
  - [[req_rhythm_lock]]
dependents:
  - [[module_ranked_candidate_ordering]]
  - [[module_rhythm_lock_order]]
  - [[module_session_rhythm_lock]]
type: RULE
version: 0.1
---

# A Forced Bend Instead of a Failed Phrase

## INTENT
Never let the lock make a phrase fail.

## THE RULE / LOGIC
When the locked bars are not among the phrase's rhythm candidates, as after a tension step down from Build to Lift, or no phrase can be found with them on the attempt being made, the phrase takes the nearest rhythm among its candidates that makes a phrase, by total edits, then seeded order; a rhythm that sounds the same but is written with other ties comes first. This forced bend is recorded in the session history only, and the next phrase tries the locked rhythm again. It is not a player option: it cannot be turned off, and it happens with no allowed change too. Every attempt of the failure handling, the standalone attempt included, keeps the lock.

## TECHNICAL INTERFACE
The search falls back to the nearest rhythm by total edits when the locked bars cannot make a phrase.

## EXPECTATION
- A phrase whose candidates lack the locked bars, or cannot use them, takes the nearest rhythm that makes a phrase, and the next phrase tries the locked rhythm again.
- The lock never causes a failed phrase.
