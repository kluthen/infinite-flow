---
id: rule_instrument_profile_range
status: STABLE
type: RULE
version: 0.4
priority: 1
tags: range,instrument-profile,hard-constraint
dependents:
  - [[entity_instrument_profile]]
  - [[module_generation_request_construction]]
  - [[module_phrase_generation_profile_policy]]
  - [[module_register_intent_boundary]]
  - [[module_register_window_resolution_primitives]]
  - [[rule_my_instrument_range_limits]]
human_name: Instrument Profile Range
layer: BUSINESS
parents:
  - [[req_four_measure_phrase]]
---

# Instrument Profile Range

## INTENT
Keep every generated source pitch inside the selected instrument profile's active concert range and resolved whole-phrase register window, for a built-in profile and a player-made instrument alike.

## THE RULE / LOGIC
The three built-in profiles use inclusive active concert ranges and contained overlapping windows: C MIDI keyboard 48-72 with Low 48-60, Middle 54-66, High 60-72; B-flat tenor saxophone 46-70 with Low 46-58, Middle 52-64, High 58-70; and E-flat alto saxophone 51-75 with Low 51-63, Middle 57-69, High 63-75. From v3.0, a player-made instrument (My instrument) obeys the same rule: its range endpoints are whole-number pitches, its range spans at least 24 semitones, and its Low, Middle and High windows are derived from its range by the same method as the built-in profiles', never set by hand. Its written range lies within a bound set by its clef, both ends included: written C2 to written C7 in treble clef, written E0 to written E5 in bass clef (middle C is C4). Varying deterministically selects one feasible Low, Middle, or High window before planning the complete phrase and never changes it mid-phrase. The instrument profile's own concert-to-written transposition, used only to convert between written and concert pitch (in the notation, the request's written-to-concert tonal-center conversion, the controller transposition check, the starting note, the MusicXML export, and a player-made instrument's concert range, derived from its written range), never changes the active concert range or the source events.

## TECHNICAL INTERFACE

The generation request includes a selected validated profile's active concert range and resolved register window; the result contains concert-pitch events.

## EXPECTATION
Every generated concert event falls inside the selected profile's active range and resolved whole-phrase register window, for a built-in profile and a player-made instrument alike. A player-made instrument whose range endpoints are not whole numbers, whose range spans fewer than 24 semitones, or whose written range leaves its clef's bound (written C2 to C7 in treble clef, written E0 to E5 in bass clef, both ends included) is refused; its register windows are derived from its range. The instrument profile's own concert-to-written transposition, used only to convert between written and concert pitch (in the notation, the request's written-to-concert tonal-center conversion, the controller transposition check, the starting note, the MusicXML export, and a player-made instrument's concert range, derived from its written range), never alters those source events or generation constraints.
