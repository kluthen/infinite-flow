---
id: module_session_staff_engraving_outcomes
status: REVIEW
type: MODULE
version: 0.1
priority: 1
dependents: []
layer: ARCHITECTURE
human_name: Session Staff Engraving Outcomes
tags: session,notation,display
parents:
  - [[module_session_rolling_display]]
  - [[rule_count_in_ending_returns_to_idle]]
  - [[rule_session_end_generates_next_phrase_one]]
  - [[rule_session_ends_when_staff_too_small]]
---

# Session Staff Engraving Outcomes

## INTENT
Keep the session staff's engraving outcomes away from the Idle machinery, turn any engraving failure into the end of the session, and hand the staff back to Idle when the session display is left.

## THE RULE / LOGIC
While the staff shows a session, no engraving outcome reaches the Idle machinery: the staff reports neither a successful engraving nor a notation error, only a session staff failure, for any typed notation error met while engraving the session (a layout failure, the engraver or its fonts failing to load, an engraving-library failure), which ends the session with the staff-not-shown cause. That failure passes through the same Idle layout gate as the staff's other reports and goes only to the session diverting them; with no session diverting, it is dropped. A failure never shows the notation error state and never clears the staff. Entering or leaving the session display drops any engraving still in flight, so it reports nowhere. Leaving it removes at once the units still fading out and every overlay mark, the playhead band included, from the systems that stay on screen, which remain until the Idle engraving replaces or clears them; the staff then engraves the phrase Idle then shows, in the layout the window then selects, and only that engraving reports to Idle as usual. After an end during the count-in that is phrase 1 again. After an end once phrase 1 has sounded, Idle drops phrase 1 at once for the fresh phrase it generates, so the staff, kept laid out but out of sight under the last session's review, shows no phrase until that fresh phrase is drawn, and never again a phrase of the ended session.

## TECHNICAL INTERFACE
PhraseScore takes an optional `session: SessionStaff | null` (default null); in session mode it emits only `session-staff-failed` with a NotationError, never `engraved` or `notation-error`. The Idle layout gate's `SessionStaffReports` adds `sessionStaffFailed(error)` to the staff's reports.

## EXPECTATION
No engraving outcome during a session reaches the Idle machinery. A session staff failure ends the session with the staff-not-shown cause, like Stop; a session staff failure with no session running reaches nothing. At the end the band leaves at once and the staff engraves the Idle phrase in the window's layout: phrase 1 after an end during the count-in, and after an end once phrase 1 has sounded no phrase of the ended session, only the fresh phrase Idle generates.
