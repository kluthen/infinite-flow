---
id: req_kept_session_review
status: DRAFT
version: 0.1
priority: 1
tags: [v3, release-v3.0, storage, review]
notes: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed v3 revision of the vision is confirmed.
dependents:
  - [[req_favorite_phrases]]
  - [[rule_session_comment]]
layer: BUSINESS
human_name: Review of Any Kept Session
parents:
  - [[req_kept_sessions]]
type: REQUIREMENT
---

# Review of Any Kept Session

## INTENT
Let the player reread and take out any session they kept, not only the one they just played.

## THE RULE / LOGIC
From v3.0, opening a kept session shows the same review the last session has, for that session: its phrases engraved exactly as displayed, each with its phrase number and tempo; the Played notes lane when that session's played notes were kept; and the export actions, including the favorites-only scope. The review of any kept session lets the player mark favorites and write the session's comment. These are functions of the review on every device, the phone included; on a phone they stay the plain baseline of those functions.

## TECHNICAL INTERFACE
Each kept session opens in the review, with its notation, its Played notes lane when its played notes were kept, its favorites, its comment and its exports.

## EXPECTATION
- Every kept session opens in the review, engraved as displayed, with phrase numbers and tempos.
- The Played notes lane is available exactly when that session's played notes were kept.
- The review of a kept session is reachable on every device, the phone included.
