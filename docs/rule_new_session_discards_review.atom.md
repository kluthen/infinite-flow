---
id: rule_new_session_discards_review
status: DRAFT
priority: 1
human_name: New Session Discards the Review Without Asking
parents:
  - [[req_last_session_review]]
dependents: []
layer: BUSINESS
version: 0.1
tags: [v2, release-v2.0, review, session-start]
type: RULE
---

# New Session Discards the Review Without Asking

## INTENT
Keep the next session one action away.

## THE RULE / LOGIC
Starting a new session from the review discards that review without asking for confirmation, so the next session is always one action away. Closing or reloading the page discards everything without asking.

## TECHNICAL INTERFACE
No confirmation dialog guards discarding the review or the page's state.

## EXPECTATION
- Starting a new session from the review discards it without any confirmation.
- Closing or reloading the page discards everything without asking.
