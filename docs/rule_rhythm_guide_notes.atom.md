---
id: rule_rhythm_guide_notes
status: DRAFT
type: RULE
version: 0.1
priority: 1
tags: [v3, release-v3.2, session, audio]
dependents: []
human_name: The Rhythm Guide Plays the Rhythm on the Chords' Roots
layer: BUSINESS
parents:
  - [[req_guide_playback]]
---

# The Rhythm Guide Plays the Rhythm on the Chords' Roots

## INTENT
Let the player hear the phrase's rhythm on its own, anchored in the harmony.

## THE RULE / LOGIC
The rhythm guide plays the melody guide's starts and lengths, each note on the root of the chord in effect at its start (the harmony event whose span holds it), always in the octave from middle C, C4 to B4 (MIDI 60 to 71); a note held across a chord change keeps the root it started on.

## TECHNICAL INTERFACE
Each rhythm guide note has a melody guide note's start and length, and the pitch of the root of the harmony event holding its start, between MIDI 60 and 71.

## EXPECTATION
- Every rhythm guide note starts and lasts as its melody guide note does.
- Its pitch is the root of the chord in effect at its start, between C4 and B4 (MIDI 60 to 71).
- A note held across a chord change keeps the root it started on.
