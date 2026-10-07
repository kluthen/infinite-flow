---
id: rule_most_recent_session_kept
status: DRAFT
parents:
  - [[req_kept_sessions]]
notes: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed v3 revision of the vision is confirmed.
dependents: []
layer: BUSINESS
version: 0.1
type: RULE
priority: 1
human_name: Most Recent Session Kept Automatically
tags: [v3, release-v3.0, storage, review]
---

# Most Recent Session Kept Automatically

## INTENT
Keep the session the player just played without them having to ask.

## THE RULE / LOGIC
From v3.0, a session that sounded at least one phrase is saved when it ends and its review opens, and it survives a reload. When a new session is saved this way, the previous most recent session is deleted unless it is pinned. A session that ends during its count-in produces no review and changes nothing that is kept.

## TECHNICAL INTERFACE
Each session end that opens a review saves that session as the most recent one and removes the previous one unless it is pinned.

## EXPECTATION
- The most recent session survives a reload and opens in its review.
- Saving a new session deletes the previous session if it is not pinned, and keeps every pinned session.
- A session ended during its count-in changes nothing that is kept.
