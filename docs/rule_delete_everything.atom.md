---
id: rule_delete_everything
status: DRAFT
priority: 1
tags: [v3, release-v3.0, storage, privacy, changes-in-v3.1, changes-in-v3.2]
type: RULE
layer: BUSINESS
version: 0.2
human_name: Delete Everything
parents:
  - [[req_your_data]]
dependents:
  - [[module_on_device_database]]
  - [[module_save_policy]]
  - [[rule_failed_read_offers_only_delete_everything]]
---

# Delete Everything

## INTENT
Give the player one action that leaves nothing of theirs behind.

## THE RULE / LOGIC
From v3.0, Delete everything removes every item the app has saved on the device at once: settings, the player's own instrument, the remembered controller, every kept session, its favorites, comments and played notes. It acts only after the player confirms it. It then reloads the page, which opens in its first-visit state.

## TECHNICAL INTERFACE
Delete everything asks for one confirmation, empties the app's store on the device, then reloads the page.

## EXPECTATION
- After Delete everything is confirmed, no saved item remains, the remembered controller included.
- The page then reloads and opens in its first-visit state.
- Without the confirmation, nothing is deleted.
