---
id: rule_session_end_generates_next_phrase_one
status: DRAFT
priority: 1
tags: [v2, release-v2.0, session, session-end, review]
parents:
  - [[req_rolling_practice_session]]
type: RULE
version: 0.1
human_name: Session End Generates the Next Phrase 1
dependents: []
layer: BUSINESS
---

# Session End Generates the Next Phrase 1

## INTENT
Have every session after the first start on new material the player has not read yet, ready on screen while the review shows.

## THE RULE / LOGIC
At every session end once phrase 1 has started sounding, whatever ended the session, the ended session's phrases leave the staff, since they are all in the review, and the app generates a fresh phrase from the current settings, with a fresh seed and no carry-in, exactly as regenerating by hand at Idle would, including the up-to-three fresh-seed retries that replace a phrase whose notes do not fit the staff. That phrase is on screen while the review shows, ready to be the next session's phrase 1. It is not reserved: whatever replaces the phrase on screen at Idle (a Regenerate, an instrument-profile switch, or the replacement of a phrase the window's size leaves too wide) replaces it here too, and the next session's phrase 1 is always the phrase on screen when that session starts. Neither the ended session's last phrase nor its phrase 1 is offered again: a player who wants endless new material should not start a session on a phrase already read. If the staff has no room at that moment, nothing is generated until the notice that the staff needs more room clears, as at Idle. Like any generation at Idle, it may also end with a generation failure being reported, or, when the rhythm settings are a combination that blocks generation at the note density the window now gives, with no phrase at all; the conditions under which a session can start then apply as at Idle. A session ended during its count-in is not concerned: it opens no review, and its phrase 1 stays on screen as the Idle phrase.

## TECHNICAL INTERFACE
Once a session that sounded at least one phrase ends, the staff drops the ended session's phrases and shows a freshly generated phrase (or, as at Idle, the room notice, a generation failure, or no phrase) while the review shows; the Idle actions that replace the phrase on screen keep working there.

## EXPECTATION
- At every session end once phrase 1 has started sounding, the ended session's phrases leave the staff and a fresh phrase is generated from the current settings, with a fresh seed and no carry-in, with the same too-dense retries as an Idle regeneration.
- The phrase on screen while the review shows is never the ended session's last phrase nor its phrase 1.
- A Regenerate, an instrument-profile switch or a too-wide replacement made while the review shows replaces that fresh phrase, as at Idle.
- With no room for the staff at that moment, nothing is generated until the room notice clears.
- A session ended during its count-in generates nothing: its phrase 1 stays on screen.
