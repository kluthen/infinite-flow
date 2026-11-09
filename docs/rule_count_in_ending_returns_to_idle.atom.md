---
id: rule_count_in_ending_returns_to_idle
status: REVIEW
version: 0.2
priority: 1
human_name: Session Ended During the Count-In Returns to Idle
dependents:
  - [[module_session_staff_engraving_outcomes]]
  - [[service_session_end]]
  - [[service_session_engine]]
  - [[service_workspace_session_flow]]
tags: [v2, release-v2.0, session, session-end]
parents:
  - [[rule_stop_ends_session]]
type: RULE
layer: BUSINESS
---

# Session Ended During the Count-In Returns to Idle

## INTENT
Return straight to Idle when a session ends before any phrase has sounded.

## THE RULE / LOGIC
A session ended during the count-in, before phrase 1 starts sounding (by Stop, a hidden tab or the staff no longer being shown), has nothing to review: no phrase started sounding, so its history holds no phrase. The app goes straight back to Idle with phrase 1 still on screen as the Idle phrase, and no review opens. The previous session's review is not restored either: starting this session already discarded it, and it stays discarded.

A Jam that ends before its phrase 1 sounds ends the same way. In a Jam that begins with a doodle not yet played, that is any end from its count-in until phrase 1 sounds, through the capture, the generation measure, an extended wait and the read-in measure, and its causes are, besides Stop, a hidden tab and the staff no longer being shown, a lost controller, no doodle note within 30 seconds after the count-in, and no phrase 1 by its deadline (rule_jam_ending_before_phrase_one). Its doodle is not kept, and Jam mode's Idle shows no phrase. A Jam on a kept doodle that ends this way keeps that doodle, and Idle shows the same phrase 1 again.

## TECHNICAL INTERFACE
Ending during the count-in, or in a Jam before its phrase 1 sounds, leads to Idle, not to the review.

## EXPECTATION
- A session ended during the count-in, by Stop, a hidden tab or the staff no longer being shown, goes back to Idle with phrase 1 still on screen.
- No review opens, and the previous session's review is not restored.
- A Jam ended before its phrase 1 sounds goes back to Idle with no review and nothing kept; a fresh Jam's doodle is not kept, and a Jam on a kept doodle keeps it, with the same phrase 1 shown again.
