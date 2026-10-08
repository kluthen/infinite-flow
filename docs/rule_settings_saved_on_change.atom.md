---
id: rule_settings_saved_on_change
status: DRAFT
human_name: Settings Saved When the Player Changes Them
tags: [v3, release-v3.0, storage, player-controls, changes-in-v3.1, changes-in-v3.2]
parents:
  - [[req_on_device_storage]]
dependents:
  - [[rule_first_phrase_waits_for_saved_settings]]
  - [[rule_saved_setting_is_players_choice]]
  - [[rule_saved_settings_load_tolerantly]]
layer: BUSINESS
priority: 1
notes: v3.1 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): the musical profile selection becomes the preset selection (a preset, or Custom and its base), the seven figure levels are saved, and player presets are kept (rule_player_presets_saved_on_device). v3.2 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): the Jam switch, the drift, the rhythm lock, the allowed rhythm changes and Vary settings' allowed groups are saved too; a held doodle is not. Text and status unchanged on purpose: it still describes the running code. Revise it in the change that builds that behaviour, per docs/release/v3.1-v3.2-intent-change-set.md. Earlier: Revised 2026-10-07 to version 0.2 (still DRAFT) by the re-sync to the v3.0 master spec v1.3, approved by the product owner: a setting changed during a session, such as the theme or the audio mix, is saved when that session ends; the start-up read of saved settings is its own atom, rule_first_phrase_waits_for_saved_settings. Earlier: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed v3 revision of the vision is confirmed.
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
