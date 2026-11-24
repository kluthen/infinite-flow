---
id: req_highlighting_part
status: DRAFT
priority: 1
human_name: The Highlighting Part
tags: [v4, release-v4.0, session, audio, accompaniment]
parents:
  - [[req_accompaniment_parts]]
dependents:
  - [[rule_highlighting_part_doubled_notes]]
  - [[rule_highlighting_part_floor]]
  - [[rule_highlighting_part_pitch]]
type: REQUIREMENT
layer: BUSINESS
version: 0.1
---

# The Highlighting Part

## INTENT
Make the lead's important notes sound fuller by doubling them below.

## THE RULE / LOGIC
The highlighting part is a second line that plays along with the lead's important notes, each a third or a sixth below the lead note it doubles (parallel thirds and sixths), so those notes sound fuller. Each of its notes starts exactly when the lead note it doubles starts and lasts exactly as long, so it sounds only while a lead note sounds. Which lead notes it doubles, and at which of the two intervals, follow the part's own rules.

## TECHNICAL INTERFACE
Switched on, the highlighting part sounds in a running session under its own switch and volume.

## EXPECTATION
- Every note of the highlighting part has exactly the start and the length of the lead note it doubles.
- It never sounds while the lead rests.
- Each of its notes is a third or a sixth below the lead note it doubles.
