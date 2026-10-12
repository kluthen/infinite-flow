---
id: req_last_session_review
status: STABLE
version: 0.6
priority: 1
human_name: Last-Session Review
parents:
  - [[req_rolling_practice_session]]
layer: BUSINESS
tags: [v2, release-v2.0, review]
dependents:
  - [[module_review_export_pipeline]]
  - [[req_session_export]]
  - [[rule_new_session_discards_review]]
  - [[rule_review_played_notes_toggle]]
  - [[service_session_end]]
  - [[service_workspace_session_flow]]
type: REQUIREMENT
notes: Revised 2026-10-12 to version 0.6 (previous version 0.5) with the explicit confirmation of the product owner, given on 2026-10-12 ("1. ok, major", relayed to documentalist; spec D295; master spec Part A v1.10, section 10; change set docs/release/v3.0-intent-change-set.md, part I1), together with the CONTRACT 4.0 MAJOR bump; stays STABLE. The review stays reachable until the next session starts, or until the player deletes its session, after a confirmation: directly, by deleting the my instrument it was played with, or by saving a change to that instrument's range or transposition. Every other clause is unchanged, engraved exactly as it was displayed included: each phrase keeps the clef it was played in, a name or clef change keeps the session, and a range or transposition change erases the session rather than redrawing it. The revised wording holds for the running code, where no session can yet be deleted; the deletion clauses hold trivially until v3.0 build plan chunks 12 and 20c build them, and the tests linked to this atom still back it. Earlier: Revised 2026-10-07 to version 0.5 with the explicit confirmation of the product owner, given on 2026-10-07, of contract change set part A (docs/release/v3.0-intent-change-set.md, A1), together with the CONTRACT 2.0 MAJOR bump; stays STABLE. Narrowed to what holds in both v2.0 and v3.0: the guarantees that only the last completed session can be reviewed and that the review has no favorites are removed; nothing in the review edits, cuts or splices generated material still holds. The v3.0 behaviour lives in the DRAFT atoms req_kept_session_review, req_kept_session_list and req_favorite_phrases. The no-favorites check in tests/e2e/review/review-opens.spec.ts no longer backs this atom. Earlier: status REVIEW to STABLE on 2026-10-07 with the product owner's approval, together with the matching CONTRACT 1.5 MINOR bump. Backed by the v2.0 gate tests linked to it, among them tests/e2e/review/review-opens.spec.ts (the phrases that sounded, in order with number and tempo, never the read-ahead one; a 2 000-phrase Review), tests/e2e/review/review-long.spec.ts and tests/e2e/review/review-navigation.spec.ts (leaving and reopening the Review).
---

# Last-Session Review

## INTENT
Let the player look back over the session they just played.

## THE RULE / LOGIC
When a session that sounded at least one phrase ends, its review opens. Every phrase that started sounding during the session appears, in order, engraved exactly as it was displayed (written pitch, key signature, chord symbols), each with its phrase number and the tempo it played at; a look-ahead phrase only ever shown as read-ahead, and never sounded, is not among them. The generated notes are always shown. Nothing in the review edits, cuts or splices generated material. There is no cap on session length, and the review stays responsive however long the session ran. From the review the player can export the session, change settings, the tempo and the audio mix, and connect a controller, its transposition check included. No session starts while the review shows: the player leaves it first, and it stays reachable until the next session starts, or until the player deletes its session.

## TECHNICAL INTERFACE
The review lists the session's phrases, engraved as displayed, with phrase numbers and tempos, plus export actions and a way to leave it; once left, a way to reach it again stays available until the next session starts or the player deletes the session.

## EXPECTATION
- The review shows every phrase that started sounding during the session, in order, each engraved exactly as displayed, with its phrase number and tempo; a phrase only ever shown as read-ahead does not appear.
- Nothing in the review edits, cuts or splices generated material.
- The review stays responsive for a session of any length.
- While the review shows, no session starts; the player leaves it first, and can reach it again until the next session starts or the player, after a confirmation, deletes the session (directly, by deleting the my instrument it was played with, or by changing that instrument's range or transposition).
