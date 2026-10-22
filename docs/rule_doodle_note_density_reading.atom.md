---
id: rule_doodle_note_density_reading
status: DRAFT
type: RULE
human_name: Note Density Read From the Doodle
parents:
  - [[rule_doodle_sets_jam_controls]]
dependents: []
layer: BUSINESS
version: 0.1
priority: 1
tags: [v3, release-v3.2, jam, rhythm]
---

# Note Density Read From the Doodle

## INTENT
Give a Jam the finest note values the doodle really uses.

## THE RULE / LOGIC
The doodle's note density is the finest grid that at least a quarter of its note starts need. A note's position is its start in sixteenths from the start of its measure, 0 to 15. With n notes: Sixteenth when 4 × (starts at an odd position) ≥ n; else Eighth when 4 × (starts at a position not divisible by 4) ≥ n; else Quarter. A doodle of fewer than 2 notes does not show it. The value rhythmic variety and syncopation read is 4 sixteenths for Quarter, 2 for Eighth and 1 for Sixteenth.

## TECHNICAL INTERFACE
Note density is computed from the positions of the doodle's note starts.

## EXPECTATION
- A doodle with at least a quarter of its starts on odd sixteenths reads Sixteenth; else, with at least a quarter off the beats, Eighth; else Quarter.
- A doodle of fewer than two notes takes Quarter.
