---
id: req_on_device_storage
status: DRAFT
parents:
  - [[req_browser_only_first_release]]
type: REQUIREMENT
layer: BUSINESS
notes: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls within the vision since version 0.8 (2026-10-08, spec D246).
dependents:
  - [[module_on_device_database]]
  - [[req_kept_sessions]]
  - [[req_my_instrument]]
  - [[req_your_data]]
  - [[rule_failed_save_never_disturbs_session]]
  - [[rule_last_controller_remembered]]
  - [[rule_no_save_during_session]]
  - [[rule_outdated_tab_stops_saving]]
  - [[rule_persistent_storage_requested]]
  - [[rule_player_presets_saved_on_device]]
  - [[rule_saved_data_belongs_to_browser_profile]]
  - [[rule_settings_saved_on_change]]
version: 0.1
priority: 1
human_name: Keeping Things on the Player's Device
tags: [v3, release-v3.0, storage, privacy]
---

# Keeping Things on the Player's Device

## INTENT
Keep what the player chooses, keeps and plays on their own device, so that a reload no longer starts them from nothing.

## THE RULE / LOGIC
From v3.0 the app keeps, on the player's device only: their settings and preferences, their own instrument and the controller they last chose, the most recent session, the sessions they pinned, their favorite phrases, their comments on sessions, and, only once they opt in, the notes they played. Nothing is ever sent anywhere: the app's network behaviour is unchanged, and data leaves the device only through an export the player triggers. The app's offline copy of its own static files is not player data and stays as it is.

## TECHNICAL INTERFACE
The browser keeps one store of the player's data for the app; no network path carries any of it; exports stay local downloads the player triggers.

## EXPECTATION
- After a reload the player finds their settings, their instrument, their remembered controller, their kept sessions and their favorites as they left them.
- With storage in use, no network request carries any player data.
- The only way kept data leaves the device is an export the player triggered.
