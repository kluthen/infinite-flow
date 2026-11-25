---
id: rule_contrasting_part_lane
status: REVIEW
version: 0.1
priority: 1
human_name: The Contrasting Part's Lane
parents:
  - [[req_contrasting_part]]
type: RULE
layer: BUSINESS
tags: [v4, release-v4.0, session, audio, accompaniment]
dependents: []
---

# The Contrasting Part's Lane

## INTENT
Keep the counter-melody apart from the lead, on the side where there is room.

## THE RULE / LOGIC
The contrasting part plays above the lead's register window when the phrase uses its instrument's Low or Middle window, from 3 to 15 half steps above the window's top. It plays below the window when the phrase uses the High window, from 15 to 3 half steps below the window's bottom, and never below MIDI 48 (C3). With the Register setting on Varying, the window the phrase resolved to decides. Since the lead stays inside its window, the contrasting part never crosses the lead.

## TECHNICAL INTERFACE
The lane is read from the phrase's resolved register window.

## EXPECTATION
- Over a Low or Middle window, every contrasting note is 3 to 15 half steps above the window's top.
- Over a High window, every contrasting note is 3 to 15 half steps below the window's bottom and at or above MIDI 48.
- No contrasting note is inside the lead's window.
