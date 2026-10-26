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
  - [[entity_session_option_records]]
type: RULE
version: 0.4
tags: [v3, release-v3.0, storage, player-controls, changes-in-v3.2]
---

# Saved Settings Load One by One

## INTENT
Keep every valid saved choice when one saved value no longer makes sense.

## THE RULE / LOGIC
From v3.0, each saved setting is checked on its own when the app loads. A saved value that is unknown or no longer valid falls back to that one setting's default, and every other saved setting is still restored. No notice is shown: the control simply shows the default. A saved preset selection loads as Custom based on that preset when, after loading, the settings that preset holds are not all its values, or the saved key and mode lie outside its key and mode restriction. A saved selection of a preset that no longer exists loads as Custom with no base. Each value keeps what it loaded with, and loading never moves the key or mode. From v3.2 the defaults are, in session mode, the rhythm lock off, every allowed rhythm change off and all six of Vary settings' allowed groups on; for Jam's settings, their first values: the key and mode and the tempo from session mode's (the tempo kept inside 60 to 180 BPM), drift Near, the lock and every allowed rhythm change off, Gentle diatonic, Lift and Embellishments Rarely. Settings saved before v3.2 load with these defaults for what they lack.

## TECHNICAL INTERFACE
Loading validates each saved setting separately and replaces only an invalid one with its default, before the settings are used.

## EXPECTATION
- A saved value that is unknown or invalid loads as that setting's default.
- Every other saved setting still loads with its saved value.
- No notice is shown for a value that fell back to its default.
- A saved preset selection whose loaded settings are not all that preset's, or whose saved key and mode lie outside its restriction, loads as Custom based on that preset.
- A saved selection of a preset that no longer exists loads as Custom with no base.
- Loading never moves the key or mode.
- Settings saved before v3.2 load with v3.2's new settings at their defaults, and Jam's at their first values.
