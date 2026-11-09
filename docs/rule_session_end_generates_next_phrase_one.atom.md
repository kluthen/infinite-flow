---
id: rule_session_end_generates_next_phrase_one
status: REVIEW
priority: 1
tags: [v2, release-v2.0, session, session-end, review]
parents:
  - [[req_rolling_practice_session]]
type: RULE
version: 0.4
human_name: Session End Generates the Next Phrase 1
dependents:
  - [[module_idle_fit_round]]
  - [[module_idle_fresh_run]]
  - [[module_idle_layout_gate]]
  - [[module_jam_session_end]]
  - [[module_session_rolling_display]]
  - [[module_session_staff_engraving_outcomes]]
  - [[rule_mutation_reverts_at_session_end]]
  - [[service_session_end]]
  - [[service_workspace_session_flow]]
layer: BUSINESS
---

# Session End Generates the Next Phrase 1

## INTENT
Have every session after the first start on new material the player has not read yet.

## THE RULE / LOGIC
At every end of a session played in session mode once phrase 1 has started sounding, whatever ended the session, the ended session's phrases leave the staff, since they are all in the review, and the app generates a fresh phrase from the current settings, with a fresh seed and no carry-in, exactly as regenerating by hand at Idle would, including the up-to-three fresh-seed retries that replace a phrase whose notes do not fit the staff. That phrase is the one the player finds on the staff at Idle on leaving the review. The next session's phrase 1 is the phrase on screen at Idle when that session starts: this fresh phrase, unless it has been replaced since by any of the ways that replace a phrase at Idle. Neither the ended session's last phrase nor its phrase 1 is offered again: a player who wants endless new material should not start a session on a phrase already read. If the staff has no room at that moment, nothing is generated until the notice that the staff needs more room clears, as at Idle. Like any generation at Idle, it may also end with a generation failure being reported, or, when the rhythm settings are a combination that blocks generation at the note density the window now gives, with no phrase at all. A session ended during its count-in is not concerned: it opens no review, and its phrase 1 stays on screen as the Idle phrase.

A Jam's end once phrase 1 has started sounding generates no phrase from session mode's settings: the ended Jam's phrases leave the staff, since they are all in the review, session mode's Idle stays as it was left before the Jam, its phrase on screen included, and on leaving the review the player finds Jam mode's Idle, whose phrase 1 is written from the ended Jam's doodle, kept at that end, with a fresh seed and as Jam's settings stand, whether the Jam was a fresh one or played on the kept doodle. A Jam on the kept doodle that ends before its phrase 1 sounds opens no review and leaves the same phrase 1 at Jam mode's Idle; a fresh Jam ended then keeps no doodle, and Jam mode's Idle shows no phrase.

## TECHNICAL INTERFACE
Once a session played in session mode that sounded at least one phrase ends, the staff drops the ended session's phrases and holds a freshly generated phrase (or, as at Idle, the room notice, a generation failure, or no phrase), found at Idle once the player leaves the review. A Jam's end generates no phrase from session mode's settings: session mode's Idle stays as it was, and Jam mode's Idle is found on leaving the review, holding phrase 1 written again from the kept doodle with a fresh seed.

## EXPECTATION
- At every end of a session played in session mode once phrase 1 has started sounding, the ended session's phrases leave the staff and a fresh phrase is generated from the current settings, with a fresh seed and no carry-in, with the same too-dense retries as an Idle regeneration.
- That phrase is neither the ended session's last phrase nor its phrase 1, and it is on the staff at Idle when the player leaves the review, unless replaced since as at Idle.
- With no room for the staff at that moment, nothing is generated until the room notice clears.
- A session ended during its count-in generates nothing: its phrase 1 stays on screen.
- A Jam's end once phrase 1 has started sounding generates no phrase: session mode's phrase on screen is as it was before the Jam, and leaving the review shows Jam mode's Idle with phrase 1 written from the ended Jam's doodle, now kept, with a fresh seed.
- A Jam on the kept doodle ended during its count-in leaves the same phrase 1 at Jam mode's Idle; a fresh Jam ended before phrase 1 leaves Jam mode's Idle with no phrase.
