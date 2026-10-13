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
notes: v3.1 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): it also removes every player preset, a record that could not be read included. v3.2 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): it also removes every kept Jam session with its doodle in both forms, and resets v3.2's saved settings to their defaults. Text and status unchanged on purpose: it still describes the running code. Revise it in the change that builds that behaviour, per docs/release/v3.1-v3.2-intent-change-set.md. Earlier: Revised 2026-10-07 to version 0.2 (still DRAFT) by the re-sync to the v3.0 master spec v1.3, approved by the product owner: after deleting, the page reloads into its first-visit state. Earlier: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls within the vision since version 0.8 (2026-10-08, spec D246).
dependents:
  - [[module_on_device_database]]
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
