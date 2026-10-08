---
id: req_my_instrument
status: DRAFT
type: REQUIREMENT
priority: 1
parents:
  - [[req_on_device_storage]]
  - [[user_story_controlled_phrase_generation]]
layer: BUSINESS
version: 0.2
human_name: My Instrument
tags: [v3, release-v3.0, storage, instrument-profile]
notes: Revised 2026-10-07 to version 0.2 (still DRAFT) by the re-sync to the v3.0 master spec v1.3, approved by the product owner: the range is set and kept in written pitch, the concert range following from it and the transposition, so changing the transposition keeps the written range; the transposition is a named interval, detailed in rule_my_instrument_transposition_named_interval. Earlier: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls within the vision since version 0.8 (2026-10-08, spec D246).
dependents:
  - [[rule_my_instrument_range_limits]]
  - [[rule_my_instrument_transposition_named_interval]]
  - [[rule_transposition_check_sets_my_instrument]]
---

# My Instrument

## INTENT
Let the player describe the instrument they actually play, so that the written part matches it.

## THE RULE / LOGIC
From v3.0, the player can make and save one instrument of their own, My instrument, starting from one of the three built-in profiles (C MIDI keyboard, B-flat tenor saxophone, E-flat alto saxophone) as its template. They may change its name; its range, the lowest and highest note, in written pitch; and its transposition, the interval between written and sounding pitch, chosen by name. The written range is what the player sets and keeps: the concert range follows from it and the transposition, so changing the transposition, by hand or through the controller-transposition check, keeps the written range. Its input kind is MIDI controller, the only kind there is, recorded so that another kind could be added later. My instrument is a fourth choice in the instrument control; the three built-in profiles stay unchanged and selectable. Deleting it returns the instrument control to the template it was made from. Notation shows the selected instrument's written pitch, as for the built-in profiles, with no concert-pitch display option.

## TECHNICAL INTERFACE
The instrument control offers the three built-in profiles and, once made, My instrument; My instrument is edited from a template and can be deleted.

## EXPECTATION
- My instrument survives a reload.
- A valid My instrument generates phrases inside its range and shows notation in its written pitch.
- Changing My instrument's transposition, by hand or through the transposition check, keeps its written range.
- Deleting My instrument selects the template it was made from.
- The three built-in profiles stay selectable and unchanged.
