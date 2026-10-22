---
id: rule_doodle_contour_reading
status: DRAFT
type: RULE
layer: BUSINESS
human_name: Contour Read From the Doodle
tags: [v3, release-v3.2, jam, melody]
parents:
  - [[rule_doodle_sets_jam_controls]]
dependents: []
version: 0.1
priority: 1
---

# Contour Read From the Doodle

## INTENT
Give a Jam the same overall rise and fall as the doodle.

## THE RULE / LOGIC
The checkpoints are, in each half measure (positions 0 to 7 and 8 to 15, in sixteenths), the pitch of its first note start; half measures with none are skipped. Contour is Rising when the checkpoints never go down and the last is above the first; Falling when they never go up and the last is below the first; Arch when one checkpoint is the single highest and is neither the first nor the last; else Wandering. A doodle with fewer than 3 checkpoints, or with all of them equal, does not show it.

## TECHNICAL INTERFACE
Contour is computed from the first pitch of each half measure of the doodle.

## EXPECTATION
- A doodle reads Rising, Falling, Arch or Wandering by its checkpoints, as stated.
- A doodle with fewer than three checkpoints, or all equal, takes Arch.
