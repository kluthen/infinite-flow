---
id: rule_accompaniment_export_tracks
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.1
priority: 1
dependents: []
human_name: How Each Part Is Written in the MIDI File
tags: [v4, release-v4.0, export, accompaniment, review]
parents:
  - [[req_accompaniment_parts]]
  - [[req_session_export]]
---

# How Each Part Is Written in the MIDI File

## INTENT
Let any MIDI program play each exported part on a fitting sound.

## THE RULE / LOGIC
Each exported part is one track of its own. The highlighting, contrasting and responding parts take the next free MIDI channels, every note at velocity 64. The drum part takes MIDI channel 10, with the General MIDI drum notes: kick 36, snare 38, closed hi-hat 42, at the groove's own velocities.

## TECHNICAL INTERFACE
Each part is its own track in the generated-notes MIDI file; the drums are on channel 10.

## EXPECTATION
- The drum track is on MIDI channel 10 and uses only notes 36, 38 and 42.
- Every note of the other part tracks has velocity 64, each part on its own channel.
