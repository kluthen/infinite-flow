---
id: rule_jam_ending_before_phrase_one
status: REVIEW
type: RULE
layer: BUSINESS
version: 0.3
priority: 1
dependents:
  - [[module_jam_session_end]]
  - [[module_session_start_without_phrase_one]]
human_name: A Jam Ended Before Phrase 1 Leaves Nothing
tags: [v3, release-v3.2, session, jam, session-end]
parents:
  - [[req_jam]]
---

# A Jam Ended Before Phrase 1 Leaves Nothing

## INTENT
Treat a Jam that never reached its phrases like a session ended during its count-in.

## THE RULE / LOGIC
A Jam that ends before phrase 1 sounds, by Stop, a hidden tab, a staff that can no longer be shown, a lost controller, or no doodle note, ends as a session ended during its count-in: back to Idle, no review, nothing kept. A fresh Jam's doodle is not kept. A Jam on a kept doodle that ends this way keeps that doodle, and Idle shows the same phrase 1 again. Until phrase 1 is on screen (a fresh Jam's count-in, the capture, the generation measure, an extended wait), the staff that must stay shown is Jam's empty staff, and it is the one judged: a window change that leaves it no room, or an engraving of it that fails, ends the Jam, and Idle shows the staff's no-room notice while the staff still has no room. From the read-in measure on, phrase 1 is on screen and the session's own staff rule judges it, in the layout the session holds.

## TECHNICAL INTERFACE
A Jam end before phrase 1 returns to Idle without a review.

## EXPECTATION
- Stop, a hidden tab or a staff that can no longer be shown before phrase 1 sounds returns to Idle with no review and nothing kept.
- A fresh Jam ended this way keeps no doodle; a Jam on a kept doodle ended this way keeps it, with the same phrase 1 on screen.
- Before phrase 1 is on screen, a window change that leaves Jam's empty staff no room ends the Jam; from the read-in measure on, phrase 1 is judged by the session's staff rule in the layout the session holds.
