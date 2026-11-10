---
id: rule_vary_settings_never_moves_seventh_chords_level
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.1
priority: 1
tags: [v3, release-v3.3, session, player-controls, chords]
parents:
  - [[req_seventh_chords_level]]
dependents: []
human_name: Vary Settings Never Moves the Seventh Chords Level
---

# Vary Settings Never Moves the Seventh Chords Level

## INTENT
Keep seventh chords opt-in: a player who keeps Off never hears one they did not choose.

## THE RULE / LOGIC
Vary settings never moves the Seventh chords level, and the level belongs to none of Vary settings' allowed groups: the level is a choice of sound, not a practice variation. A player who keeps the level at Off and turns Vary settings on never hears a seventh chord. Nothing changes the session's level while the session runs.

## TECHNICAL INTERFACE
The settings mutation has no step for the Seventh chords level.

## EXPECTATION
- No mutation ever changes the Seventh chords level.
- None of Vary settings' allowed groups holds the level.
