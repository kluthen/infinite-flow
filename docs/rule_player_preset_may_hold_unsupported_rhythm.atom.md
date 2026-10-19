---
id: rule_player_preset_may_hold_unsupported_rhythm
status: DRAFT
tags: [v3, release-v3.1, player-controls, presets, rhythm]
type: RULE
layer: BUSINESS
version: 0.1
priority: 1
human_name: A Player Preset May Hold an Unsupported Rhythm Combination
parents:
  - [[rule_preset_contents]]
  - [[rule_unsupported_rhythm_settings_block_generation]]
dependents: []
---

# A Player Preset May Hold an Unsupported Rhythm Combination

## INTENT
Let a player preset keep exactly the settings the player saved, even a rhythm mix the generator cannot play, without hiding why nothing is generated.

## THE RULE / LOGIC
A player preset holds the settings of the moment it was saved, so it may hold an unsupported rhythm combination: a mix of note density, silence density and syncopation for which no four-measure rhythm exists at its rhythmic variety. Choosing such a preset sets its values as choosing any preset does, and then shows the existing unsupported-rhythm alert, exactly as choosing that combination by hand would.

## TECHNICAL INTERFACE
Choosing a player preset applies its values unchanged and then runs the usual unsupported-rhythm check on them.

## EXPECTATION
- A player preset can be saved while the current rhythm combination is unsupported, and keeps that combination.
- Choosing it sets its values unchanged and shows the unsupported-rhythm alert.
