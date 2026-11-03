---
id: rule_doodle_silence_density_reading
status: DRAFT
type: RULE
layer: BUSINESS
human_name: Silence Density Read From the Doodle
version: 0.2
priority: 1
tags: [v3, release-v3.2, jam, rhythm]
parents:
  - [[rule_doodle_sets_jam_controls]]
dependents:
  - [[module_doodle_controls]]
---

# Silence Density Read From the Doodle

## INTENT
Give a Jam as much room to breathe as the doodle leaves.

## THE RULE / LOGIC
R is the number of sixteenths of the rests in the doodle's M measures. A silence, a stretch where no note sounds, holds a rest only where a whole rest of the doodle's note density value (a quarter, an eighth or a sixteenth; a quarter when the doodle does not show its note density) fits in it on that grid; the rest runs from the first such grid point to the silence's end. A shorter silence, and the part of a silence before that point, are part of the note before them, as a short, detached note is, and count nothing. Scaled to a phrase's four measures, R is compared with the midpoints between the bands of 4 to 8, 12 to 20 and 24 to 32 silent sixteenths a phrase holds at each value. Silence density is Sparse when 4 × R ≤ 10 × M; Conversational when 4 × R ≤ 22 × M; else Breath-heavy. A doodle of fewer than 2 notes does not show it.

## TECHNICAL INTERFACE
Silence density is computed from the sixteenths of the doodle's rests.

## EXPECTATION
- A doodle reads Sparse, Conversational or Breath-heavy by its rests' sixteenths per four measures, at the thresholds stated.
- A silence too short to hold a whole rest of the doodle's note density value counts nothing.
- A doodle of fewer than two notes takes Sparse.
