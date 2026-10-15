---
id: rule_outdated_tab_stops_saving
status: DRAFT
tags: [v3, release-v3.0, storage]
parents:
  - [[req_on_device_storage]]
dependents:
  - [[entity_my_instrument_record]]
  - [[module_kept_session_changes]]
  - [[module_kept_session_reach]]
  - [[module_kept_session_save]]
  - [[module_on_device_database]]
  - [[module_save_policy]]
  - [[rule_outdated_tab_reads_what_it_can]]
type: RULE
version: 0.5
priority: 1
human_name: An Outdated Tab Stops Saving
layer: BUSINESS
---

# An Outdated Tab Stops Saving

## INTENT
Never let an old open tab damage data a newer version of the app wrote.

## THE RULE / LOGIC
The app updates itself silently, so a tab left open on an older version can meet data saved by a newer one. From v3.0, such a tab keeps working from memory and saves and deletes nothing more. It offers no deletion of any kind: not Delete everything, not the Delete of a kept session, not deleting played notes, and not the offer to delete kept played notes that switching off "Keep my played notes" otherwise makes; and, while My instrument has kept sessions, neither deleting My instrument nor saving a change to its range or transposition, in its sheet or through the controller-transposition check, since either would erase those sessions. A change of My instrument's name or clef still applies, for the visit only. Its notice asks the player to reload first. The notice asking the player to reload is shown only outside a running session. The rule applies from the moment the tab knows that data saved by a newer version exists, whether it learns this at load or later in the visit.

## TECHNICAL INTERFACE
From the moment a tab knows that saved data written by a newer version exists, at load or later in the visit, it stops writing and deleting, offers no deletion action of any kind, and shows a reload notice outside a running session.

## EXPECTATION
- A tab opened by an older version, facing newer saved data, writes and deletes nothing.
- That tab offers no deletion of any kind: no Delete everything, no Delete on a kept session, no deletion of played notes, and no offer to delete kept played notes when "Keep my played notes" is switched off; while My instrument has kept sessions, neither deleting My instrument nor saving a change to its range or transposition, in its sheet or through the transposition check.
- When the newer saved data is found only later in the visit, the tab writes nothing, deletes nothing and offers no deletion from then on.
- It shows the reload notice, never during a running session.
