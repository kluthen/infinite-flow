---
id: rule_saving_preset_asks_its_restriction
status: DRAFT
type: RULE
priority: 1
tags: [v3, release-v3.1, player-controls, presets]
layer: BUSINESS
version: 0.2
human_name: Save as New Asks for the Restriction
parents:
  - [[rule_key_and_mode_restriction]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.1 master spec the product owner approved on 2026-10-08. Describes intended v3.1 behaviour: nothing of it is built yet. It falls within the vision since version 0.8 (2026-10-08, spec D246). Revised the same day (version 0.1 to 0.2) after the spec settled that only save as new always asks the restriction; save changes asks it only outside the preset restriction (rule_save_changes_restriction).
dependents:
  - [[rule_save_changes_restriction]]
---

# Save as New Asks for the Restriction

## INTENT
Let a new player preset keep, widen or narrow the keys and modes it is meant for.

## THE RULE / LOGIC
Saving the current settings as a new player preset asks which restriction it keeps, with three choices. As now, the default: the restriction in force, or any when none is in force; saving from Custom based on a preset meant for Mixolydian or Dorian keeps Mixolydian or Dorian. Only this key and mode: one pair, the current written key and mode. Any key and mode. A player cannot build other lists. The keys half is written pitch, so a preset kept to G Dorian stays G Dorian as read on any instrument.

## TECHNICAL INTERFACE
Saving a new player preset records one of three restriction choices.

## EXPECTATION
- Save as new offers exactly the three restriction choices, As now by default.
- As now saves the restriction in force, or any when none is in force; Only this key and mode saves the current written key and mode as one pair.
