---
id: rule_doodle_sixteenth_on_narrow_screens
status: DRAFT
version: 0.1
priority: 1
human_name: A Doodle's Sixteenth Generates as Eighth on Narrow Screens
tags: [v3, release-v3.2, jam, rhythm, layout]
type: RULE
layer: BUSINESS
parents:
  - [[rule_doodle_sets_jam_controls]]
dependents: []
---

# A Doodle's Sixteenth Generates as Eighth on Narrow Screens

## INTENT
Keep a Jam readable on a narrow screen without misreporting what the doodle showed.

## THE RULE / LOGIC
Below the tablet-landscape layout's width, a Sixteenth note density read from a doodle generates as Eighth, as a chosen Sixteenth does in session mode; what the doodle showed is still read as Sixteenth. In a fresh Jam the session generates phrase 1 itself, so this step-down can apply from phrase 1.

## TECHNICAL INTERFACE
Below the tablet-landscape width, a Sixteenth read from the doodle is requested as Eighth.

## EXPECTATION
- Below the tablet-landscape width, a Jam whose doodle reads Sixteenth generates its phrases with Eighth, and the reading still says Sixteenth.
