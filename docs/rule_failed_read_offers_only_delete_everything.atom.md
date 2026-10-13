---
id: rule_failed_read_offers_only_delete_everything
status: DRAFT
notes: Revised 2026-10-12 to version 0.3 (previous version 0.2) on the owner's rulings of 2026-10-12, spec D295 and D296, master spec Part A v1.10 (section 4.4; spec D295 item 5), relayed to documentalist: a visit whose start-up read failed has read no kept session and no saved My instrument, so changing or deleting a My instrument made during it erases nothing, and the session it holds in memory keeps its review until the next session starts. Status unchanged (DRAFT). Earlier: Revised 2026-10-07 to version 0.2 (still DRAFT), re-sync to master spec v1.4 (failed read), 2026-10-07, approved by the product owner: a slow read (the start-up wait exceeded) counts as a failed one, Delete everything included; Delete everything is the way out when reloading does not help, whether the saved data is damaged or only slow to read, and it asks for confirmation as everywhere; whenever saved data written by a newer version is known to exist, at load or later in the visit, no deletion of any kind is offered, Delete everything included, as for an outdated tab. That the player is told about the failed read is its own atom, rule_failed_read_told_to_player. Earlier: Created 2026-10-07 at DRAFT, re-sync to master spec v1.4, 2026-10-07, approved by the product owner. Kept apart from rule_first_phrase_waits_for_saved_settings, which says what such a visit reads and saves; this atom says which deletion it offers. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls within the vision since version 0.8 (2026-10-08, spec D246).
dependents: []
layer: BUSINESS
priority: 1
tags: [v3,release-v3.0,storage,privacy]
type: RULE
version: 0.3
human_name: A Visit With Unreadable Saved Data Offers Only Delete Everything
parents:
  - [[rule_delete_everything]]
  - [[rule_first_phrase_waits_for_saved_settings]]
---

# A Visit With Unreadable Saved Data Offers Only Delete Everything

## INTENT
Give the player a way out when reloading does not help, whether the saved data is damaged or only slow to read, without letting a visit that could not read it delete anything piecemeal or destroy what a newer version of the app saved.

## THE RULE / LOGIC
From v3.0, a visit whose saved settings could not be read at load still offers Delete everything. A read that takes longer than the short start-up wait counts as a failed one, exactly like a read that fails outright. Delete everything is the only deletion that visit offers: it offers no Delete on a kept session, no deletion of played notes, and no offer to delete kept played notes when "Keep my played notes" is switched off. Delete everything is the way out when reloading does not help, whether the saved data is damaged or only slow to read, and it asks for the player's confirmation as it does everywhere. Such a visit has read no kept session and no saved My instrument, so changing or deleting a My instrument made during it erases nothing: the session it holds in memory keeps its review until the next session starts. One exception overrides this: whenever saved data written by a newer version of the app is known to exist, whether that is found at load or later in the visit, the visit offers no deletion of any kind, Delete everything included, since deleting could destroy what the newer version saved.

## TECHNICAL INTERFACE
For the rest of a visit whose start-up read failed or outlasted the start-up wait, Delete everything stays available behind its confirmation and every other deletion action is withheld; from the moment saved data written by a newer version is known to exist, Delete everything is withheld too.

## EXPECTATION
- After a read of the saved settings that fails, or that outlasts the start-up wait, Delete everything is offered in that visit; it asks for confirmation, and confirming it empties the store and reloads the page into its first-visit state.
- In that visit, no other deletion is offered: no Delete on a kept session, no deletion of played notes, and no offer to delete kept played notes when "Keep my played notes" is switched off.
- In that visit, changing or deleting a My instrument made during it erases nothing, and the session held in memory keeps its review until the next session starts.
- When saved data written by a newer version is known to exist, whether at load or later in that visit, no deletion of any kind is offered, Delete everything included.
