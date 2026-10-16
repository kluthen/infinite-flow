---
id: rule_kept_session_holds_no_acknowledgements
status: REVIEW
human_name: Kept Sessions Hold No Acknowledgement
parents:
  - [[rule_kept_session_content]]
  - [[rule_no_grading_or_mismatch_signal]]
dependents:
  - [[entity_kept_session_record]]
tags: [v3, release-v3.0, storage, non-scoring]
type: RULE
layer: BUSINESS
version: 0.1
priority: 1
---

# Kept Sessions Hold No Acknowledgement

## INTENT
Make counting the player's hits impossible by construction in anything the app keeps.

## THE RULE / LOGIC
From v3.0, a kept session never holds which expected notes were acknowledged. Without that record, nothing kept can be used to count hits, grade or score the player, in any view, at any time.

## TECHNICAL INTERFACE
The kept-session record has no field for acknowledgements.

## EXPECTATION
- No kept session holds any acknowledgement.
