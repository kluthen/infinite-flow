---
id: rule_no_export_carries_seventh_chords_level
status: REVIEW
type: RULE
layer: BUSINESS
version: 0.1
priority: 1
human_name: No Export Carries the Seventh Chords Level
tags: [v3, release-v3.3, export, chords]
dependents: []
parents:
  - [[req_seventh_chords_level]]
---

# No Export Carries the Seventh Chords Level

## INTENT
Export the chords a phrase holds, never the setting that allowed them.

## THE RULE / LOGIC
An exported file holds the chords its phrases hold, seventh chords included, and never the Seventh chords level they were generated with, as no export carries a preset.

## TECHNICAL INTERFACE
The MusicXML and MIDI exports read the phrases' harmony, never the level.

## EXPECTATION
- No MusicXML or MIDI file holds the Seventh chords level.
