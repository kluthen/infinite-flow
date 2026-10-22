---
id: rule_jam_exports_line_up
status: DRAFT
priority: 1
tags: [v3, release-v3.2, session, jam, export, midi]
dependents: []
version: 0.2
human_name: A Jam's Two MIDI Files Line Up
parents:
  - [[rule_jam_exports_open_with_doodle]]
type: RULE
layer: BUSINESS
---

# A Jam's Two MIDI Files Line Up

## INTENT
Keep the generated and played files of a Jam aligned when opened together.

## THE RULE / LOGIC
The doodle section starts at time zero in both files and is as many measures long as the doodle; phrase 1 follows at the next barline, and the waiting measures between them are not written. A raw note running past the section's end stops there. In a Jam on a kept doodle, the played-notes file keeps the section, with no notes in it.

## TECHNICAL INTERFACE
The two MIDI exports share the doodle section's position and length.

## EXPECTATION
- In both MIDI files of a Jam the doodle section starts at time zero and phrase 1 starts at the same time.
- A Jam on a kept doodle writes an empty doodle section in the played-notes file.
