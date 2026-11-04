---
id: rule_guide_same_pitch_reattack
status: DRAFT
human_name: A Guide Re-Attacks a Ringing Pitch Cleanly
type: RULE
layer: BUSINESS
version: 0.1
priority: 1
tags: [v3, release-v3.2, session, audio]
parents:
  - [[req_guide_playback]]
dependents: []
---

# A Guide Re-Attacks a Ringing Pitch Cleanly

## INTENT
Make a repeated pitch heard as a new note.

## THE RULE / LOGIC
When a guide note starts on the pitch of that guide's note still ringing, the ringing note fades out quickly at the new start, so the new note is heard as new and the two never sound on one pitch together.

## TECHNICAL INTERFACE
When a guide starts a note on the pitch of its own still-ringing note, the ringing note fades out quickly at the new start.

## EXPECTATION
- A repeated pitch in a guide is heard as a new note.
- Two notes of one guide never sound on one pitch together.
