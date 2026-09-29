---
id: rule_look_ahead_deadline
status: DRAFT
type: RULE
layer: BUSINESS
priority: 1
tags: [v2, release-v2.0, session, look-ahead]
parents:
  - [[req_rolling_practice_session]]
dependents:
  - [[rule_look_ahead_phrase_must_fit_staff]]
  - [[rule_session_generation_failure_ladder]]
version: 0.1
human_name: One-Phrase Look-Ahead Deadline
---

# One-Phrase Look-Ahead Deadline

## INTENT
Always have the next phrase ready before the player needs to read it.

## THE RULE / LOGIC
During a session the app always looks one phrase ahead. As soon as phrase N starts sounding, phrase N+1 is requested, and it must be generated and engraved before its deadline: the start of phrase N's last measure. That leaves at least one measure of read-ahead visible on screen at all times. Phrase 2 is generated during the one-measure count-in and is ready before the count-in ends.

## TECHNICAL INTERFACE
While a phrase sounds, the next phrase is requested in the background and becomes available as read-ahead before the current phrase's last measure starts.

## EXPECTATION
- Across every seed and supported settings combination, at 60, 120 and 240 BPM, every phrase after the first is generated and engraved before its deadline.
- At least one measure of read-ahead is visible throughout a session.
