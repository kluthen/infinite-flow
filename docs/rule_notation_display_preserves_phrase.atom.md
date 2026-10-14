---
id: rule_notation_display_preserves_phrase
status: REVIEW
human_name: Notation Transposition Preserves Phrase
type: RULE
priority: 1
tags: notation
parents:
  - [[req_four_measure_phrase]]
dependents:
  - [[module_notation_display_convention]]
  - [[module_notation_layout_preflight]]
  - [[module_notation_stem_direction]]
layer: BUSINESS
version: 1.2
---

# Notation Transposition Preserves Phrase

## INTENT

Guarantee that rendering written notation in the selected instrument profile's written pitch never changes the generated phrase.

## THE RULE / LOGIC
Standard staff notation is rendered from the concert-pitch event timeline, in the selected instrument profile's written pitch only, on a staff in that instrument's clef: treble clef (the G clef, on the second line) for the three built-in profiles, and treble or bass clef (the F clef, on the fourth line) for my instrument, as the player chooses. The clef is display only: it changes the line or space a written note is drawn on, never the written note, the transposition or anything generated. The transposition check's single written note is drawn on a staff in the same clef. There is no independently selected display convention and no Concert-display override: written pitch always follows the selected instrument profile's own concert-to-written transposition (an integer chromatic semitone count and integer diatonic letter-step count), for example C MIDI keyboard +0/+0, B-flat tenor saxophone +14/+8 (major ninth), and E-flat alto saxophone +9/+5 (major sixth). The written key is the tonal center the player chose, in written pitch, and the transposition never moves it; when it can be spelled two ways, it takes the spelling whose key signature has fewer accidentals, the sharp one on a tie. Only the notes and the chord symbols' roots and slash bass move, by the transposition's semitone count, from concert to written pitch; the key signature, the notes and the chord symbols are spelled in the written key, and chord quality is preserved. The transposition's interval name is derived and shown only; it spells nothing. Rendering written pitch never changes generated pitches, harmony, seed, active range policy, or register policy; the only way written pitch changes is by switching the selected instrument profile, which is a separate, governed regeneration event, not a display-mode change.

## TECHNICAL INTERFACE
Notation renders a generated phrase in the selected instrument profile's written pitch, on a staff in that instrument's clef; there is no player-facing selection of an independent display mode, and my instrument's clef is a property of the instrument, not a display mode.

## EXPECTATION
Written pitch always matches the selected instrument profile's transposition. Rendering written pitch changes only written display values, on a staff in the instrument's clef (treble for the built-in profiles, treble or bass for my instrument), the written key's spelling included, and leaves the original concert phrase, chord quality, selected profile policy, and generator policy identical. The written key is the tonal center the player chose, whatever the transposition. The same phrase drawn in treble or in bass clef has the same written notes and the same concert phrase. A change in written pitch can occur only through an instrument-profile switch, never through an independent display-mode selection or a change of clef.
