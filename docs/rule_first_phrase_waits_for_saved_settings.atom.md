---
id: rule_first_phrase_waits_for_saved_settings
status: DRAFT
type: RULE
layer: BUSINESS
parents:
  - [[rule_settings_saved_on_change]]
dependents:
  - [[module_save_policy]]
  - [[rule_failed_read_offers_only_delete_everything]]
  - [[rule_failed_read_told_to_player]]
version: 0.1
priority: 1
human_name: First Phrase Waits for Saved Settings
tags: [v3, release-v3.0, storage, player-controls]
notes: Synced 2026-10-14 at the v3.0 wave-3 post-task sync, same version 0.1: build plan chunk 5's save policy (merge 9f01f7f; module_save_policy, src/storage/save-policy.ts and save-policy-requests.ts) builds the storage half of saving nothing after a failed or slow read: the saving state off-unreadable, entered by stopSavingUnreadable or when the port could not be opened, skips every write and delete for the visit. The start-up wait itself is the settings wiring's. Links and linked tests (save-policy.spec.ts, save-policy-your-data.spec.ts) checked and right. Built in storage and not wired yet: no app code uses the policy until build plan chunk 7, so the running app does not yet behave so. Text and status unchanged (DRAFT). Earlier: Created 2026-10-07 at DRAFT by the re-sync to the v3.0 master spec v1.3, approved by the product owner. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls within the vision since version 0.8 (2026-10-08, spec D246).
---

# First Phrase Waits for Saved Settings

## INTENT
Start every visit from the player's saved settings, and never let a failed read overwrite what is kept.

## THE RULE / LOGIC
From v3.0, the first phrase waits for the saved settings to be read, so it is generated from them. If reading them fails, or takes longer than a short start-up wait, the app starts from the defaults and saves nothing for the rest of that visit, so a failed read never overwrites what is kept.

## TECHNICAL INTERFACE
At load, the saved settings are read under a bounded start-up wait before the first phrase is requested; a failed or late read leaves the defaults in place and switches saving off until the next load.

## EXPECTATION
- The first phrase of a visit is generated from the saved settings.
- When reading the saved settings fails or outlasts the start-up wait, the app starts from the defaults.
- After such a failed or late read, nothing is written to storage for the rest of that visit, and what was kept is still there on the next load.
