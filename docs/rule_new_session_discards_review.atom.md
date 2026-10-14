---
id: rule_new_session_discards_review
status: REVIEW
priority: 1
human_name: New Session Closes the Review Without Asking
parents:
  - [[req_last_session_review]]
dependents:
  - [[service_session_end]]
  - [[service_session_start]]
  - [[service_workspace_session_flow]]
layer: BUSINESS
version: 0.4
tags: [v2, release-v2.0, review, session-start, changes-in-v3.0]
type: RULE
---

# New Session Closes the Review Without Asking

## INTENT
Keep the most recent session's review within reach until the next session ends with a review, and close it without asking when the next session starts.

## THE RULE / LOGIC
The review of the last session opens when that session ends. Leaving it keeps it: it stays reachable again at Idle, through Review last session, until the next session ends with a review and takes its place, or until the player deletes its session. Starting that next session, which happens only after the player has left the review, closes the review without asking for confirmation and deletes nothing; a next session that ends during its count-in changes nothing kept and leaves the last session's review reachable again. A saved session is deleted when a newer session is saved at its own end, unless it is pinned. A reload no longer discards a saved session: the most recent session is kept on the device, and its review can be opened again after a reload. A session whose save failed, or that ended while saving was off, stays in memory only, as the most recent session until the next session ends with a review, and a reload discards it.

## TECHNICAL INTERFACE
Leaving the review keeps it reachable at Idle through Review last session; no confirmation dialog guards closing it when the next session starts. Deleting a kept session is a separate, confirmed action.

## EXPECTATION
- After leaving the review, the player can reach it again at Idle until the next session ends with a review or the player deletes its session.
- Starting the next session closes the review without any confirmation and deletes nothing kept.
- A next session that ends during its count-in leaves the last session's review reachable again.
- After a reload, the most recent saved session's review can be opened again; a session whose save failed, or that ended while saving was off, is gone.
