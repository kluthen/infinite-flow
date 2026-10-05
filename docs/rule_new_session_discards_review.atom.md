---
id: rule_new_session_discards_review
status: DRAFT
priority: 1
human_name: New Session Discards the Review Without Asking
parents:
  - [[req_last_session_review]]
dependents:
  - [[service_session_end]]
  - [[service_session_start]]
  - [[service_workspace_session_flow]]
layer: BUSINESS
version: 0.3
tags: [v2, release-v2.0, review, session-start]
type: RULE
---

# New Session Discards the Review Without Asking

## INTENT
Keep the last session's review available until the next session starts, and discard it then without asking.

## THE RULE / LOGIC
The review of the last session opens when that session ends. Leaving it keeps it: it stays reachable again until the next session starts or the page closes. Starting that next session, which happens only after the player has left the review, discards it without asking for confirmation. Closing or reloading the page discards everything without asking.

## TECHNICAL INTERFACE
Leaving the review keeps it reachable; no confirmation dialog guards discarding it when the next session starts, or discarding the page's state.

## EXPECTATION
- After leaving the review, the player can reach it again until the next session starts.
- Starting the next session discards the review without any confirmation.
- Closing or reloading the page discards everything without asking.
