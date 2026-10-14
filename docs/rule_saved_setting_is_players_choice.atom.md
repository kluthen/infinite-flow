---
id: rule_saved_setting_is_players_choice
status: DRAFT
tags: [v3, release-v3.0, storage, player-controls]
type: RULE
layer: BUSINESS
parents:
  - [[rule_settings_saved_on_change]]
dependents: []
version: 0.1
priority: 1
human_name: Saved Setting Is the Player's Choice
---

# Saved Setting Is the Player's Choice

## INTENT
Save what the player chose, never what the app did with it.

## THE RULE / LOGIC
From v3.0, a saved setting holds the value the player chose, not a value a phrase or a session derived from it. Below the tablet-landscape layout's width, a chosen Sixteenth note density is saved and comes back as Sixteenth, even though phrases there are generated with Eighth. The tempo a Rising-tempo session reached belongs to that session and is never saved; the tempo control keeps the tempo the player chose. A setting the app varied by itself during a session is never saved in place of the player's choice.

## TECHNICAL INTERFACE
The saved value of each setting is the control's chosen value, never the resolved value a phrase was generated with.

## EXPECTATION
- Below the tablet-landscape layout's width, a chosen Sixteenth reloads as Sixteenth.
- After a Rising-tempo session, a reload shows the tempo the player chose, not the tempo the session reached.
- No setting changed by the app during a session is saved.
