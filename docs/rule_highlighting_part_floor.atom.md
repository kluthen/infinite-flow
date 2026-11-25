---
id: rule_highlighting_part_floor
status: REVIEW
type: RULE
priority: 1
human_name: The Highlighting Part Never Goes Below Its Floor
tags: [v4, release-v4.0, session, audio, accompaniment]
parents:
  - [[req_highlighting_part]]
dependents: []
layer: BUSINESS
version: 0.1
---

# The Highlighting Part Never Goes Below Its Floor

## INTENT
Keep the doubling out of the backing's low register.

## THE RULE / LOGIC
The highlighting part never plays below MIDI 48 (C3). When the chosen interval would put its note below MIDI 48, the other interval is taken if its note is at or above MIDI 48; otherwise the lead note is not doubled.

## TECHNICAL INTERFACE
The floor is MIDI 48.

## EXPECTATION
- No highlighting note is below MIDI 48.
- A lead note whose third and sixth below both fall under MIDI 48 is not doubled.
