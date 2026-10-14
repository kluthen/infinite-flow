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
