---
id: req_guide_playback
status: DRAFT
human_name: The Guide Playback
type: REQUIREMENT
layer: BUSINESS
tags: [v3, release-v3.2, session, audio]
parents:
  - [[req_rolling_practice_session]]
dependents:
  - [[module_guide_playback_layers]]
  - [[rule_guide_changes_only_sound]]
  - [[rule_guide_fixed_voices]]
  - [[rule_guide_never_exported]]
  - [[rule_guide_note_rings_out]]
  - [[rule_guide_notes_placed_exactly]]
  - [[rule_guide_plays_from_phrase_one]]
  - [[rule_guide_same_pitch_reattack]]
  - [[rule_guide_sound_from_oscillators]]
  - [[rule_guide_switch_takes_effect]]
  - [[rule_melody_guide_notes]]
  - [[rule_rhythm_guide_notes]]
version: 0.1
priority: 1
---

# The Guide Playback

## INTENT
Let a player who cannot yet read a phrase at sight hear what they are reading while they play it.

## THE RULE / LOGIC
Beside the backing, two optional sounds play the phrase on the sheet during a session, in both modes: the melody guide plays its notes, the rhythm guide plays its rhythm on the chords' roots. Each is switched on or off on its own, both are off by default, and with both on they sound together on the same starts. They are listening aids only: nothing compares the player's playing with them.

## TECHNICAL INTERFACE
The audio mix holds a Melody guide switch and a Rhythm guide switch, each with its own volume, both off by default, operable in both modes.

## EXPECTATION
- Each guide can be on while the other is off, and with both on they sound together on the same starts.
- Both guides are off until the player turns one on.
- Nothing in the session or the review compares the player's playing with a guide.
