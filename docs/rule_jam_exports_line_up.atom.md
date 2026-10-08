---
id: rule_jam_exports_line_up
status: DRAFT
priority: 1
tags: [v3, release-v3.2, session, jam, export, midi]
dependents: []
version: 0.1
human_name: A Jam's Two MIDI Files Line Up
parents:
  - [[rule_jam_exports_open_with_doodle]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls within the vision since version 0.8 (2026-10-08, spec D246).
type: RULE
layer: BUSINESS
---

# A Jam's Two MIDI Files Line Up

## INTENT
Keep the generated and played files of a Jam aligned when opened together.

## THE RULE / LOGIC
The doodle section starts at time zero in both files and is as many measures long as the doodle; phrase 1 follows at the next barline, and the waiting measures between them are not written. A raw note running past the section's end stops there. In a Jam on a held doodle, the played-notes file keeps the section, with no notes in it.

## TECHNICAL INTERFACE
The two MIDI exports share the doodle section's position and length.

## EXPECTATION
- In both MIDI files of a Jam the doodle section starts at time zero and phrase 1 starts at the same time.
- A Jam on a held doodle writes an empty doodle section in the played-notes file.
