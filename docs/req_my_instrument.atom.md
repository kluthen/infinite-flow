---
id: req_my_instrument
status: DRAFT
type: REQUIREMENT
priority: 1
parents:
  - [[req_on_device_storage]]
  - [[user_story_controlled_phrase_generation]]
layer: BUSINESS
version: 0.5
human_name: My Instrument
tags: [v3, release-v3.0, storage, instrument-profile]
notes: Revised 2026-10-12 to version 0.5 (previous version 0.4) on the owner's rulings of 2026-10-12, spec D294 to D296, master spec Part A v1.10 (sections 5.1, 7.1, 7.2, 12, item 16 and 14), relayed to documentalist. The written range lies within a bound set by its clef, written C2 to C7 in treble clef and E0 to E5 in bass clef, refused live with the reason in note names, a clef change checking it again (D294). Every kept session belongs to the instrument it was played with: deleting My instrument deletes its kept sessions, with a count in the confirmation; a range or transposition change erases them after a warning with the count, with no warning when there are none; a name or clef change keeps them (D295, D296). The clef of a new My instrument, treble, is settled as a design default by ux-writer (ux D281) and stays out of this text. Within the vision as it stands. Status unchanged (DRAFT). Earlier: Revised 2026-10-12 to version 0.4 (previous version 0.3) on the owner's ruling D293 (master spec Part A v1.9, sections 3 and 7.1): my instrument is written in treble or bass clef, as the player chooses, display only; the built-in profiles stay in treble clef. Not stated, because the master spec leaves them open: the clef of a new my instrument (treble proposed, for ux-writer) and the per-clef bound on the written range (approved by the owner on 2026-10-12, not yet recorded by spec-writer). Within the vision as it stands (an instrument the player describes themselves). Status unchanged (DRAFT). Earlier: Revised 2026-10-12 (previous version 0.2) on the owner's approval at the v3.0 wave-1 sign-off: the transposition is no longer chosen by name but entered as octaves and semitones in one direction with one stepper counting semitones across octaves, its interval name derived and shown (spec D253, D257; matches rule_my_instrument_transposition_named_interval and entity_my_instrument). Status unchanged (DRAFT). Earlier: Revised 2026-10-07 to version 0.2 (still DRAFT) by the re-sync to the v3.0 master spec v1.3, approved by the product owner: the range is set and kept in written pitch, the concert range following from it and the transposition, so changing the transposition keeps the written range; the transposition is a named interval, detailed in rule_my_instrument_transposition_named_interval. Earlier: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls within the vision since version 0.8 (2026-10-08, spec D246).
dependents:
  - [[entity_my_instrument]]
  - [[module_notation_layout_preflight]]
  - [[rule_my_instrument_range_limits]]
  - [[rule_my_instrument_transposition_named_interval]]
  - [[rule_transposition_check_sets_my_instrument]]
---

# My Instrument

## INTENT
Let the player describe the instrument they actually play, so that the written part matches it.

## THE RULE / LOGIC
From v3.0, the player can make and save one instrument of their own, My instrument, starting from one of the three built-in profiles (C MIDI keyboard, B-flat tenor saxophone, E-flat alto saxophone) as its template. They may change its name; its range, the lowest and highest note, in written pitch; and its transposition, the interval between written and sounding pitch, entered as a number of octaves and semitones in one direction (lower, the same or higher) with one stepper that counts semitones across octaves; its interval name is derived and shown, never chosen; and its clef, treble or bass, the clef its written part is drawn in. The clef is display only: it changes neither the written notes, nor the transposition, nor anything generated. The written range is what the player sets and keeps: the concert range follows from it and the transposition, so changing the transposition, by hand or through the controller-transposition check, keeps the written range. The written range must lie within a bound set by the clef, both ends included: written C2 to C7 in treble clef, written E0 to E5 in bass clef. A range outside it is refused live, with the reason in note names, and changing the clef checks the range again. Its input kind is MIDI controller, the only kind there is, recorded so that another kind could be added later. My instrument is a fourth choice in the instrument control; the three built-in profiles stay unchanged and selectable. Every kept session belongs to the instrument it was played with. Deleting My instrument returns the instrument control to the template it was made from, and deletes every kept session played with it, its confirmation saying how many go. Saving a change to its written range or its transposition, in its sheet or through the controller-transposition check, first warns that it erases every kept session played with it, and how many; confirming saves the change and erases them, cancelling changes nothing. While it has no kept session, nothing is erased and no warning is shown. A change of its name or its clef keeps its kept sessions, with no warning, since nothing generated changes. Notation shows the selected instrument's written pitch, as for the built-in profiles, with no concert-pitch display option, in my instrument's clef; the built-in profiles stay in treble clef.

## TECHNICAL INTERFACE
The instrument control offers the three built-in profiles and, once made, My instrument; My instrument is edited from a template, its clef included, and can be deleted.

## EXPECTATION
- My instrument survives a reload.
- A valid My instrument generates phrases inside its range and shows notation in its written pitch.
- My instrument's phrases are drawn in its clef, treble or bass, and the same phrase in either clef has the same written notes; the built-in profiles are drawn in treble clef.
- Changing My instrument's transposition, by hand or through the transposition check, keeps its written range.
- A written range outside C2 to C7 in treble clef, or E0 to E5 in bass clef, is refused live with the reason in note names; changing the clef checks the range again.
- Deleting My instrument selects the template it was made from, and deletes exactly the kept sessions played with it, pinned ones and the session that just ended included, and no other; its confirmation says how many go.
- Saving a change to its range or transposition while it has kept sessions first warns that they will be erased, and how many; confirming saves the change and erases them, cancelling changes nothing; with no kept session, no warning is shown.
- A change of its name or clef keeps its kept sessions, with no warning.
- The three built-in profiles stay selectable and unchanged.
