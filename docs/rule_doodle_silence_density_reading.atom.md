---
id: rule_doodle_silence_density_reading
status: DRAFT
type: RULE
layer: BUSINESS
human_name: Silence Density Read From the Doodle
version: 0.1
priority: 1
tags: [v3, release-v3.2, jam, rhythm]
parents:
  - [[rule_doodle_sets_jam_controls]]
dependents: []
---

# Silence Density Read From the Doodle

## INTENT
Give a Jam as much room to breathe as the doodle leaves.

## THE RULE / LOGIC
R is the number of sixteenths of the doodle's M measures during which no note sounds; scaled to a phrase's four measures, it is compared with the midpoints between the bands of 4 to 8, 12 to 20 and 24 to 32 silent sixteenths a phrase holds at each value. Silence density is Sparse when 4 × R ≤ 10 × M; Conversational when 4 × R ≤ 22 × M; else Breath-heavy. A doodle of fewer than 2 notes does not show it.

## TECHNICAL INTERFACE
Silence density is computed from the doodle's silent sixteenths.

## EXPECTATION
- A doodle reads Sparse, Conversational or Breath-heavy by its silent sixteenths per four measures, at the thresholds stated.
- A doodle of fewer than two notes takes Sparse.
