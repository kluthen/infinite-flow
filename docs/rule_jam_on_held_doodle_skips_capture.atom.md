---
id: rule_jam_on_held_doodle_skips_capture
status: DRAFT
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls within the vision since version 0.8 (2026-10-08, spec D246).
layer: BUSINESS
version: 0.1
priority: 1
human_name: A Jam on a Held Doodle Skips the Capture
parents:
  - [[rule_jam_again_on_this_doodle]]
dependents: []
type: RULE
tags: [v3, release-v3.2, session, jam]
---

# A Jam on a Held Doodle Skips the Capture

## INTENT
Start a repeat Jam straight on the phrase already prepared.

## THE RULE / LOGIC
Start with a held doodle runs a Jam that skips the capture: the count-in, then phrase 1, as in any session. The 30-second wait for a first doodle note does not apply, and there are no generation or read-in measures. The Jam's review and its kept session carry the held doodle as their doodle. Its raw notes belong to the session they were played in, so this Jam's played-notes lane and played-notes export hold none of them.

## TECHNICAL INTERFACE
A Jam on a held doodle starts as a session with a phrase on screen.

## EXPECTATION
- A Jam started with a held doodle plays the count-in, then phrase 1, with no capture.
- Its played-notes lane and export hold none of the doodle's raw notes.
