---
id: req_last_session_review
status: DRAFT
version: 0.2
priority: 1
human_name: Last-Session Review
parents:
  - [[req_rolling_practice_session]]
layer: BUSINESS
tags: [v2, release-v2.0, review]
dependents:
  - [[req_session_export]]
  - [[rule_new_session_discards_review]]
  - [[rule_review_played_notes_toggle]]
type: REQUIREMENT
---

# Last-Session Review

## INTENT
Let the player look back over the session they just played.

## THE RULE / LOGIC
When a session that sounded at least one phrase ends, its review opens. Every phrase that started sounding during the session appears, in order, engraved exactly as it was displayed (written pitch, key signature, chord symbols), each with its phrase number and the tempo it played at; a look-ahead phrase only ever shown as read-ahead, and never sounded, is not among them. The generated notes are always shown. Only the most recently completed session's review exists; no other session can be reviewed. The review has no favorites and no per-phrase action: nothing in it edits, cuts or splices generated material. There is no cap on session length, and the review stays responsive however long the session ran. From the review the player can export the session, change settings, connect a controller or start a new session.

## TECHNICAL INTERFACE
The review lists the session's phrases, engraved as displayed, with phrase numbers and tempos, plus export actions and a way to start a new session.

## EXPECTATION
- The review shows every phrase that started sounding during the session, in order, each engraved exactly as displayed, with its phrase number and tempo; a phrase only ever shown as read-ahead does not appear.
- Only the last completed session can be reviewed; the review has no favorites and no per-phrase action.
- The review stays responsive for a session of any length.
