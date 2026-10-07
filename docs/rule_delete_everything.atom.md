---
id: rule_delete_everything
status: DRAFT
priority: 1
tags: [v3, release-v3.0, storage, privacy]
type: RULE
layer: BUSINESS
version: 0.2
human_name: Delete Everything
parents:
  - [[req_your_data]]
notes: Revised 2026-10-07 to version 0.2 (still DRAFT) by the re-sync to the v3.0 master spec v1.3, approved by the product owner: after deleting, the page reloads into its first-visit state. Earlier: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed v3 revision of the vision is confirmed.
dependents:
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
