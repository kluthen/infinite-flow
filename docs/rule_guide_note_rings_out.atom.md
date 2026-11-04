---
id: rule_guide_note_rings_out
status: DRAFT
type: RULE
priority: 1
human_name: A Guide Note Rings Out Over Its Release
layer: BUSINESS
version: 0.1
tags: [v3, release-v3.2, session, audio]
parents:
  - [[req_guide_playback]]
dependents: []
---

# A Guide Note Rings Out Over Its Release

## INTENT
Make each guide note sound whole: a clear start, held to its written end, and a soft ending.

## THE RULE / LOGIC
A guide note rises from silence within at most 5 ms and at most half the note, holds to its written end, then fades out over its release, which starts there; each note has its own sound, so no note is cut to make room for the next, and a note followed by a rest rings on into it with its release unchanged.

## TECHNICAL INTERFACE
Each guide note has its own envelope: a rise of at most 5 ms and at most half the note, a hold to its written end, then its release.

## EXPECTATION
- A guide note's rise takes at most 5 ms and at most half the note.
- A guide note holds to its written end, then fades out over its release.
- The next note never cuts a ringing note short.
- A note followed by a rest rings on into it with its release unchanged.
