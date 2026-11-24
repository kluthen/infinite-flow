---
id: rule_app_writes_every_part_note
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.1
priority: 1
human_name: No Setting Chooses How a Part Plays
parents:
  - [[req_accompaniment_parts]]
dependents: []
tags: [v4, release-v4.0, session, audio, accompaniment]
---

# No Setting Chooses How a Part Plays

## INTENT
Keep the parts something to listen to, not something to configure.

## THE RULE / LOGIC
The app writes every note of every part from the phrase. No setting chooses a part's technique or its register; the player sets only each part's on/off switch and volume.

## TECHNICAL INTERFACE
The audio mix holds only an on/off switch and a volume for each part.

## EXPECTATION
- No control chooses how a part plays or where it sits in pitch.
