---
id: rule_outdated_tab_stops_saving
status: DRAFT
tags: [v3, release-v3.0, storage]
parents:
  - [[req_on_device_storage]]
notes: Revised 2026-10-07 to version 0.4 (still DRAFT), re-sync to master spec v1.4 (failed read), 2026-10-07, approved by the product owner: the rule holds from the moment the tab knows that data saved by a newer version exists, whether it learns this at load or later in the visit. That it also wins over a visit whose start-up read failed (no Delete everything there either) is stated in rule_failed_read_offers_only_delete_everything. Earlier: Revised 2026-10-07 to version 0.3 (still DRAFT), re-sync to master spec v1.4, 2026-10-07, approved by the product owner: an outdated tab offers no deletion of any kind, not only no Delete everything: no kept session Delete, no deletion of played notes, and not the offer to delete kept played notes that switching off Keep my played notes makes. Earlier: Revised 2026-10-07 to version 0.2 (still DRAFT) by the re-sync to the v3.0 master spec v1.3, approved by the product owner: an outdated tab also deletes nothing and offers no Delete everything (its notice asks for a reload first); what it reads is its own atom, rule_outdated_tab_reads_what_it_can. Earlier: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls within the vision since version 0.8 (2026-10-08, spec D246).
dependents:
  - [[rule_outdated_tab_reads_what_it_can]]
type: RULE
version: 0.4
priority: 1
human_name: An Outdated Tab Stops Saving
layer: BUSINESS
---

# An Outdated Tab Stops Saving

## INTENT
Never let an old open tab damage data a newer version of the app wrote.

## THE RULE / LOGIC
The app updates itself silently, so a tab left open on an older version can meet data saved by a newer one. From v3.0, such a tab keeps working from memory and saves and deletes nothing more. It offers no deletion of any kind: not Delete everything, not the Delete of a kept session, not deleting played notes, and not the offer to delete kept played notes that switching off "Keep my played notes" otherwise makes. Its notice asks the player to reload first. The notice asking the player to reload is shown only outside a running session. The rule applies from the moment the tab knows that data saved by a newer version exists, whether it learns this at load or later in the visit.

## TECHNICAL INTERFACE
From the moment a tab knows that saved data written by a newer version exists, at load or later in the visit, it stops writing and deleting, offers no deletion action of any kind, and shows a reload notice outside a running session.

## EXPECTATION
- A tab opened by an older version, facing newer saved data, writes and deletes nothing.
- That tab offers no deletion of any kind: no Delete everything, no Delete on a kept session, no deletion of played notes, and no offer to delete kept played notes when "Keep my played notes" is switched off.
- When the newer saved data is found only later in the visit, the tab writes nothing, deletes nothing and offers no deletion from then on.
- It shows the reload notice, never during a running session.
