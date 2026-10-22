---
id: rule_delete_everything
status: STABLE
priority: 1
tags: [v3, release-v3.0, storage, privacy, changes-in-v3.2]
type: RULE
layer: BUSINESS
version: 0.4
human_name: Delete Everything
parents:
  - [[req_your_data]]
dependents:
  - [[entity_my_instrument_record]]
  - [[entity_remembered_controller_record]]
  - [[module_on_device_database]]
  - [[module_save_policy]]
  - [[rule_failed_read_offers_only_delete_everything]]
---

# Delete Everything

## INTENT
Give the player one action that leaves nothing of theirs behind.

## THE RULE / LOGIC
From v3.0, Delete everything removes every item the app has saved on the device at once: settings, every player preset, a preset record that could not be read included, the player's own instrument, the remembered controller, every kept session, a Jam session's doodle included, its favorites, comments and played notes, and Jam's saved settings; the doodle Jam mode keeps goes too. It acts only after the player confirms it. It then reloads the page, which opens in its first-visit state.

## TECHNICAL INTERFACE
Delete everything asks for one confirmation, whose wording names the player's presets among what it deletes, empties the app's store on the device, then reloads the page.

## EXPECTATION
- After Delete everything is confirmed, no saved item remains, the remembered controller, every player preset, every Jam session with its doodle and Jam's settings included.
- The page then reloads and opens in its first-visit state.
- Without the confirmation, nothing is deleted.
