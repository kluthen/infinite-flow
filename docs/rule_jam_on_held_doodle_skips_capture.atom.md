---
id: rule_jam_on_held_doodle_skips_capture
status: DRAFT
layer: BUSINESS
version: 0.2
priority: 1
human_name: A Jam on a Kept Doodle Skips the Capture
parents:
  - [[rule_jam_again_on_this_doodle]]
dependents: []
type: RULE
tags: [v3, release-v3.2, session, jam]
---

# A Jam on a Kept Doodle Skips the Capture

## INTENT
Start a repeat Jam straight on the phrase already prepared.

## THE RULE / LOGIC
Start with a kept doodle runs a Jam that skips the capture: the count-in, then phrase 1, as in session mode. The 30-second wait for a first doodle note does not apply, and there are no generation or read-in measures. The Jam's review and its kept session carry the kept doodle as their doodle. Its raw notes belong to the session they were played in, so this Jam's played-notes lane and played-notes export hold none of them.

## TECHNICAL INTERFACE
A Jam on a kept doodle starts as a session with a phrase on screen.

## EXPECTATION
- A Jam started with a kept doodle plays the count-in, then phrase 1, with no capture.
- Its played-notes lane and export hold none of the doodle's raw notes.
