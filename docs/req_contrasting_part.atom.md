---
id: req_contrasting_part
status: DRAFT
layer: BUSINESS
priority: 1
dependents:
  - [[rule_contrasting_part_guide_tones]]
  - [[rule_contrasting_part_lane]]
  - [[rule_contrasting_part_timing]]
  - [[rule_contrasting_part_voice_leading]]
type: REQUIREMENT
version: 0.1
human_name: The Contrasting Part
tags: [v4, release-v4.0, session, audio, accompaniment]
parents:
  - [[req_accompaniment_parts]]
---

# The Contrasting Part

## INTENT
Give the player a second, independent line to hear against the lead.

## THE RULE / LOGIC
The contrasting part is a slow counter-melody: a second tune, one note for each chord of the phrase, that moves when the lead holds and holds when the lead moves. It plays in a lane of its own, apart from the lead's register window, and never crosses the lead. Its lane, its notes, how it moves from note to note and when each note starts follow the part's own rules.

## TECHNICAL INTERFACE
Switched on, the contrasting part sounds in a running session under its own switch and volume.

## EXPECTATION
- The contrasting part plays at most one note per chord of the phrase, a held note counting once.
- It never crosses the lead.
