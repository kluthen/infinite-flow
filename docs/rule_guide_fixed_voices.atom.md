---
id: rule_guide_fixed_voices
status: DRAFT
human_name: Each Guide Has Its Own Fixed Voice
layer: BUSINESS
version: 0.1
priority: 1
tags: [v3, release-v3.2, session, audio]
parents:
  - [[req_guide_playback]]
type: RULE
dependents: []
---

# Each Guide Has Its Own Fixed Voice

## INTENT
Let the player tell each guide apart without choosing a sound.

## THE RULE / LOGIC
Each guide has its own fixed voice, soft and neutral, imitating no instrument and not chosen by the player; the two are easy to tell apart from each other and from the backing's bass and chords.

## TECHNICAL INTERFACE
No control chooses a guide's sound; the audio mix sets only each guide's on/off switch and volume.

## EXPECTATION
- The two guides sound different from each other and from the backing's bass and chords.
- Neither guide's voice imitates an instrument.
- No setting chooses a guide's voice.
