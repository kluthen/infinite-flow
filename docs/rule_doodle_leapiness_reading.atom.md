---
id: rule_doodle_leapiness_reading
status: DRAFT
dependents: []
layer: BUSINESS
version: 0.1
human_name: Leapiness Read From the Doodle
tags: [v3, release-v3.2, jam, melody, leaps]
type: RULE
priority: 1
parents:
  - [[rule_doodle_sets_jam_controls]]
---

# Leapiness Read From the Doodle

## INTENT
Give a Jam moves as wide as the doodle's.

## THE RULE / LOGIC
Over the moves between neighbouring notes of the doodle, in half steps: w is the widest move, L the number of moves of 5 or more, and K the number of 7 or more, the counts compared scaled to four measures. With M measures, leapiness is Smooth when w ≤ 4; Shaped when w ≤ 7, 4 × L ≤ 2 × M and 4 × K ≤ M; Leaping when w ≤ 10, 4 × L ≤ 4 × M and 4 × K ≤ 2 × M; else Angular. A doodle of fewer than 2 notes does not show it.

## TECHNICAL INTERFACE
Leapiness is computed from the sizes of the doodle's moves.

## EXPECTATION
- A doodle reads Smooth, Shaped, Leaping or Angular by its widest move and its counts of moves of 5 and 7 half steps or more, as stated.
- A doodle of fewer than two notes takes Shaped.
