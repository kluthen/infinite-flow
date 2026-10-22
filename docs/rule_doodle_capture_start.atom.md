---
id: rule_doodle_capture_start
status: DRAFT
dependents:
  - [[module_doodle_quantizer]]
version: 0.1
human_name: Where the Doodle Starts
parents:
  - [[req_jam]]
type: RULE
layer: BUSINESS
priority: 1
tags: [v3, release-v3.2, session, jam, midi]
---

# Where the Doodle Starts

## INTENT
Decide fairly which played notes belong to the doodle, even when the player is slightly early.

## THE RULE / LOGIC
Played notes are filtered, then snapped, then counted. The filter for very short notes applies first: a very short note never starts, extends, ends or shapes a doodle. A note belongs to the doodle by its snapped start: a note played a little early onto the first beat after the count-in is a doodle note, while one that snaps before that beat belongs to the count-in. The doodle's first measure is the measure holding its first note; it may begin with rests, so a doodle that starts on beat 2 simply starts there.

## TECHNICAL INTERFACE
Doodle capture reads played notes through the very-short-note filter and the sixteenth-note grid.

## EXPECTATION
- A note snapping onto or after the first beat after the count-in is a doodle note; one snapping before it is not.
- A very short note never starts, extends, ends or shapes a doodle.
