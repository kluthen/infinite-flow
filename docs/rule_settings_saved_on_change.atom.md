---
id: rule_settings_saved_on_change
status: DRAFT
human_name: Settings Saved When the Player Changes Them
tags: [v3, release-v3.0, storage, player-controls, changes-in-v3.1, changes-in-v3.2]
parents:
  - [[req_on_device_storage]]
dependents:
  - [[module_save_policy]]
  - [[rule_first_phrase_waits_for_saved_settings]]
  - [[rule_saved_setting_is_players_choice]]
  - [[rule_saved_settings_load_tolerantly]]
layer: BUSINESS
priority: 1
type: RULE
version: 0.2
---

# Settings Saved When the Player Changes Them

## INTENT
Bring the player's settings back as they left them, without them having to save anything.

## THE RULE / LOGIC
From v3.0, each of these settings is saved on the device when the player changes it, with no save action:
- the 14 generation controls and the musical profile selection (Neutral, Jazz, or customized);
- the theme;
- the audio mix: click and backing, each on or off, and each one's volume;
- the three options for during a session: Vary settings, Tension across phrases and Rising tempo;
- the review's preferences: the generated-notes format, whether the generated-notes MIDI file carries the backing track, and the Played notes switch.
A setting changed while no session runs is saved at once. A setting changed while a session runs, such as the theme or the audio mix, is saved when that session ends, since nothing is written during a session. After a reload, each saved setting comes back with the value the player last gave it. The three options for during a session stay the player's own opt-in: each comes back on only if the player had turned it on. Nothing that belongs to a running session is saved as a setting.

## TECHNICAL INTERFACE
Every listed control writes its new value to the device's store when the player changes it, or when the running session ends for a change made during it, and reads it back when the app loads.

## EXPECTATION
- Every listed setting returns after a reload with the value the player last chose.
- No listed setting needs a save action.
- A setting changed during a session is written when that session ends, never before.
- An option for during a session comes back on after a reload only if the player had turned it on.
