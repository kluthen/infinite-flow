---
id: rule_look_ahead_deadline
status: REVIEW
type: RULE
layer: BUSINESS
priority: 1
tags: [v2, release-v2.0, session, look-ahead, changes-in-v3.2]
parents:
  - [[req_rolling_practice_session]]
dependents:
  - [[module_session_look_ahead_timing]]
  - [[module_session_rolling_display]]
  - [[rule_look_ahead_phrase_must_fit_staff]]
  - [[rule_session_generation_failure_ladder]]
  - [[service_session_engine]]
  - [[service_session_runner]]
version: 0.4
human_name: One-Phrase Look-Ahead Deadline
---

# One-Phrase Look-Ahead Deadline

## INTENT
Always have the next phrase ready before the player needs to read it.

## THE RULE / LOGIC
During a session the app always looks one phrase ahead. As soon as phrase N starts sounding, phrase N+1 is due, and it must be generated and engraved before its deadline: the start of phrase N's last measure. That leaves at least one measure of read-ahead visible on screen at all times. Phrase 2 is due by the end of the one-measure count-in. From v3.0, a phrase pre-generated at Idle for its place (phrase 2 to phrase 5 at most) is taken as soon as its look-ahead opens, phrase 2 at Start, and is not generated again; any other phrase is requested then, phrase 2 during the count-in, and generated under its deadline. In a Jam that begins with a doodle not yet played, phrase 1 has a deadline of its own, three measures after the generation measure begins (rule_jam_phrase_one_deadline); phrase 2 is requested when phrase 1 is handed over to the session, at the barline where phrase 1 is shown, one measure before it sounds, and its deadline is still the start of phrase 1's last measure, which gives it the read-in measure and three measures more.

## TECHNICAL INTERFACE
While a phrase sounds, the next phrase, unless it was pre-generated at Idle and taken, is requested in the background; either way it becomes available as read-ahead before the current phrase's last measure starts.

## EXPECTATION
- Across every seed and supported settings combination, at 60, 120 and 240 BPM, every phrase after the first is generated and engraved before its deadline, except when the session generation failure ladder finds no valid phrase by then, in which case the previous phrase is repeated as that phrase, decided at the deadline.
- At least one measure of read-ahead is visible throughout a session.
- A phrase pre-generated at Idle for its place is taken when its look-ahead opens, with no new generation request, and is ready before its deadline.
- In a Jam begun with a doodle not yet played, phrase 2 is requested at the barline where phrase 1 is shown and is ready before the start of phrase 1's last measure.
