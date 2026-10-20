---
id: rule_saved_settings_load_tolerantly
status: STABLE
layer: BUSINESS
priority: 1
human_name: Saved Settings Load One by One
parents:
  - [[rule_settings_saved_on_change]]
dependents:
  - [[entity_my_instrument_record]]
type: RULE
version: 0.3
tags: [v3, release-v3.0, storage, player-controls, changes-in-v3.1, changes-in-v3.2]
---

# Saved Settings Load One by One

## INTENT
Keep every valid saved choice when one saved value no longer makes sense.

## THE RULE / LOGIC
From v3.0, each saved setting is checked on its own when the app loads. A saved value that is unknown or no longer valid falls back to that one setting's default, and every other saved setting is still restored. No notice is shown: the control simply shows the default. A saved preset selection loads as Custom based on that preset when, after loading, the settings that preset holds are not all its values, or the saved key and mode lie outside its key and mode restriction. A saved selection of a preset that no longer exists loads as Custom with no base. Each value keeps what it loaded with, and loading never moves the key or mode.

## TECHNICAL INTERFACE
Loading validates each saved setting separately and replaces only an invalid one with its default, before the settings are used.

## EXPECTATION
- A saved value that is unknown or invalid loads as that setting's default.
- Every other saved setting still loads with its saved value.
- No notice is shown for a value that fell back to its default.
- A saved preset selection whose loaded settings are not all that preset's, or whose saved key and mode lie outside its restriction, loads as Custom based on that preset.
- A saved selection of a preset that no longer exists loads as Custom with no base.
- Loading never moves the key or mode.
