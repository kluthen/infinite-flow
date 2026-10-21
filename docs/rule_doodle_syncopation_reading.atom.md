---
id: rule_doodle_syncopation_reading
status: DRAFT
dependents: []
layer: BUSINESS
priority: 1
human_name: Syncopation Read From the Doodle
parents:
  - [[rule_doodle_sets_jam_controls]]
type: RULE
version: 0.1
tags: [v3, release-v3.2, jam, rhythm]
---

# Syncopation Read From the Doodle

## INTENT
Give a Jam as many offbeat accents as the doodle has.

## THE RULE / LOGIC
A measure of the doodle is syncopated when it holds a note starting off the note density's grid (under Quarter at a position not divisible by 4, under Eighth at an odd position, under Sixteenth never), or a note starting off a beat and still sounding at the next beat. With M measures: Straight when no measure is syncopated; Occasional offbeats when at least one is and 2 × (syncopated measures) ≤ M; else Active displacement. A doodle of fewer than 2 notes does not show it.

## TECHNICAL INTERFACE
Syncopation is computed per measure of the doodle.

## EXPECTATION
- A doodle with no syncopated measure reads Straight; one with syncopated measures in at most half its measures reads Occasional offbeats; any other reads Active displacement.
- A doodle of fewer than two notes takes Straight.
