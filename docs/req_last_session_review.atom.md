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
  - [[module_kept_session_save]]
  - [[module_review_export_pipeline]]
  - [[req_session_export]]
  - [[rule_new_session_discards_review]]
  - [[rule_review_played_notes_toggle]]
  - [[service_session_end]]
  - [[service_workspace_session_flow]]
type: REQUIREMENT
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
