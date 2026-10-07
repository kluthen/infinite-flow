---
id: rule_failed_read_offers_only_delete_everything
status: DRAFT
notes: Created 2026-10-07 at DRAFT, re-sync to master spec v1.4, 2026-10-07, approved by the product owner. Kept apart from rule_first_phrase_waits_for_saved_settings, which says what such a visit reads and saves; this atom says which deletion it offers. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed v3 revision of the vision is confirmed.
dependents: []
layer: BUSINESS
priority: 1
tags: [v3,release-v3.0,storage,privacy]
type: RULE
version: 0.1
human_name: A Visit With Unreadable Saved Data Offers Only Delete Everything
parents:
  - [[rule_delete_everything]]
  - [[rule_first_phrase_waits_for_saved_settings]]
---

# A Visit With Unreadable Saved Data Offers Only Delete Everything

## INTENT
Give the player a way out of saved data that is damaged for good, without letting a visit that could not read it delete anything piecemeal.

## THE RULE / LOGIC
From v3.0, a visit whose saved settings could not be read at load, because reading failed or took longer than the short start-up wait, still offers Delete everything. Delete everything is the only deletion that visit offers: it offers no Delete on a kept session, no deletion of played notes, and no offer to delete kept played notes when "Keep my played notes" is switched off. Delete everything is the way out of saved data that is damaged for good.

## TECHNICAL INTERFACE
For the rest of a visit whose start-up read failed or timed out, Delete everything stays available and every other deletion action is withheld.

## EXPECTATION
- After a failed or timed-out read of the saved settings, Delete everything is offered in that visit, and confirming it empties the store and reloads the page into its first-visit state.
- In that visit, no other deletion is offered: no Delete on a kept session, no deletion of played notes, and no offer to delete kept played notes when "Keep my played notes" is switched off.
