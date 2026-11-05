---
id: rule_melody_guide_notes
status: DRAFT
version: 0.1
tags: [v3, release-v3.2, session, audio]
parents:
  - [[req_guide_playback]]
human_name: The Melody Guide Plays the Phrase as Written
type: RULE
priority: 1
dependents: []
layer: BUSINESS
---

# The Melody Guide Plays the Phrase as Written

## INTENT
Let the player hear exactly the notes they are reading.

## THE RULE / LOGIC
The melody guide plays every note of the phrase as written, at concert pitch, the pitch the instrument sounds; a tied note sounds once, held for its whole tied length, across a barline too; a rest starts no note.

## TECHNICAL INTERFACE
For each phrase, the melody guide sounds one note per written note start, at concert pitch, lasting the note's whole tied length.

## EXPECTATION
- Every written note of the phrase sounds in the melody guide, at concert pitch.
- A tied note, across a barline too, sounds once, for its whole tied length.
- A rest starts no melody guide note.
