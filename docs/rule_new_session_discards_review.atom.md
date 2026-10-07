---
id: rule_new_session_discards_review
status: REVIEW
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
tags: [v2, release-v2.0, review, session-start, changes-in-v3.0]
type: RULE
notes: v3.0 change pending (2026-10-07, v3.0 spec ingestion): the approved v3.0 scope, not yet built, changes this atom. From v3.0 the most recent session is kept and survives a reload, and any kept session can be reopened (rule_most_recent_session_kept, req_kept_session_review, req_kept_session_list), so a reload no longer discards the last review, and a new session replaces the previous unpinned one only when it is saved at its own end. Starting a session still never asks for confirmation (rule_new_session_never_asks_about_favorites). Text and status unchanged on purpose: it still describes the running v2.0 code. Revise it in the change that builds the v3.0 behaviour, per docs/release/v3.0-intent-change-set.md.
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
