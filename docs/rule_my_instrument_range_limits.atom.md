---
id: rule_my_instrument_range_limits
status: REVIEW
type: RULE
version: 0.2
parents:
  - [[req_my_instrument]]
dependents:
  - [[entity_my_instrument]]
layer: BUSINESS
priority: 1
human_name: My Instrument Obeys the Profile Range Rules
tags: [v3, release-v3.0, instrument-profile, range]
notes: Synced 2026-10-13 at the v3.0 wave-2 post-task sync, same version 0.2: chunk 19b measured the bass-clef bound (M3, docs/notation-engraving.md, 2026-10-13): written E0 to E5 in bass clef engraves at 24 staff spaces (240 units), the same as C2 to C7 in treble clef, so the bound keeps the shared height at most 24 staff spaces and nothing goes back to the owner. The bound itself is still unenforced: chunk 16's makeMyInstrument has the two-octave minimum only; chunk 20 adds it. Status stays REVIEW. Earlier: Revised 2026-10-12 to version 0.2 (previous version 0.1) on the owner's rulings of 2026-10-12, spec D294 to D296, master spec Part A v1.10 (sections 7.1, 12, item 16 and 14), relayed to documentalist; stays REVIEW, as the owner ruled the change himself. Adds the bound on the written range per clef: written C2 to C7 in treble clef, written E0 to E5 in bass clef, refused live with the reason in note names, a change of clef checking the range again. This replaces the pending note of the same day, which waited for spec-writer to record the bound. Pending implementation: chunk 16's code (src/domain/profile/my-instrument.ts) has the two-octave minimum and no bound; v3.0 build plan chunk 20 enforces the bound, and chunk 19b confirms by measurement that the bass-clef bound keeps the shared height at most 24 staff spaces (if it does not, the figure goes back to the owner). Chunk 20's post-task sync checks the code against this text. Earlier: Status DRAFT to REVIEW on 2026-10-12 with the owner's agreement (v3.0 wave-1 sign-off), same version: chunk 16's code (src/domain/profile/my-instrument.ts, merge d49e559) matches the logic and expectation, with its linked tests. Earlier: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls within the vision since version 0.8 (2026-10-08, spec D246).
---

# My Instrument Obeys the Profile Range Rules

## INTENT
Hold a player-made instrument to the same rules as the built-in profiles, so it cannot break phrase generation, and keep its written range within what its staff can show.

## THE RULE / LOGIC
From v3.0, My instrument obeys the rules every instrument profile already obeys. Its range endpoints are whole-number pitches, and it spans at least two octaves (24 semitones); a range under two octaves is refused, with the reason. Its Low, Middle and High register windows are derived from its range by the same method as the built-in profiles', never set by hand. Every generated pitch stays inside its range and the register window chosen for the phrase, exactly as for a built-in profile, and its transposition only converts between written and concert pitch.

Its written range must also lie within a bound set by its clef, both ends included: between written C2 and written C7 in treble clef, between written E0 and written E5 in bass clef (middle C is C4, MIDI note 60, so C2 is note 36, C7 note 96, E0 note 16 and E5 note 76). The two bounds sit on the same lines and spaces of their own staff, from eight ledger lines below it to about five above it, and keep the staff's shared height at most 24 staff spaces. A range outside the bound for its clef is refused live, as the player edits it, like a range under two octaves, with the reason given in note names. Changing the clef checks the range again, so a range allowed in one clef may be refused in the other until the range or the clef changes. The two-octave minimum and the MIDI note range still apply.

## TECHNICAL INTERFACE
Editing and saving My instrument validates its range, against the two-octave minimum and its clef's bound, and derives its three register windows from it; a range outside its clef's bound is refused live, with the reason in note names.

## EXPECTATION
- A range under two octaves is refused, with the reason.
- In treble clef, a written range reaching below C2 or above C7 is refused live, with the reason in note names, and C2 to C7 itself is accepted; in bass clef, the same holds for E0 and E5.
- Changing the clef checks the range again: a range inside one clef's bound but outside the other's is refused once the other clef is chosen.
- My instrument's register windows are derived from its range, never entered.
- Every phrase generated for My instrument stays inside its range and the phrase's register window.
