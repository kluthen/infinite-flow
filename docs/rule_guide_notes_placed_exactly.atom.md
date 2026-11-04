---
id: rule_guide_notes_placed_exactly
status: DRAFT
type: RULE
priority: 1
tags: [v3, release-v3.2, session, audio]
human_name: Guide Notes Fall Exactly on the Audio Clock
layer: BUSINESS
version: 0.1
parents:
  - [[req_guide_playback]]
dependents: []
---

# Guide Notes Fall Exactly on the Audio Clock

## INTENT
Keep each guide in time with the click and the backing, whatever the rhythm.

## THE RULE / LOGIC
Each guide note starts and ends exactly where its position on the sheet falls on the audio clock, through the session's tempo map, on a beat, off a beat or inside a triplet; every length the generator writes plays, the shortest, a sixteenth-note triplet at 240 BPM, about 42 ms.

## TECHNICAL INTERFACE
Each guide note's start and end are the audio times of its sheet positions through the session's tempo map.

## EXPECTATION
- A guide note on a beat starts with that beat's click.
- A guide note off a beat or inside a triplet starts and ends at its exact time.
- A sixteenth-note triplet at 240 BPM, about 42 ms, plays.
