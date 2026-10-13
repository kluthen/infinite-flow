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
notes: Revised 2026-10-13 to version 1.2 (previous version 1.1) on owner sign-off 2026-10-13 (relayed by the coordinator) of the optional sentence proposed at the v3.0 wave-2 post-task sync (change set part K2.5); stays REVIEW. The logic now says the transposition check's single written note is drawn on a staff in the same clef, which the link above engraveCheckNote (chunk 19b) already traces; no guarantee changes. Earlier: Synced 2026-10-13 at the v3.0 wave-2 post-task sync, same version 1.1: chunk 19b's code (d6928ec, merge 39cd2a5) draws every staff in the clef its phrase carries, treble for the built-in profiles, the clef changing where a note is drawn and never the written note or the concert phrase, with linked tests; the bass clef's pending note below is done. The transposition check's single note (engraveCheckNote in src/notation/vexflow-check-note-engraver.ts) now links this rule, as the chunk 19b preflight proposed: it is drawn in the selected instrument's clef and spelled in C major whatever the clef. The rule's text speaks of rendering a generated phrase; that the check note's staff is in the instrument's clef too is proposed to the owner as an optional clarifying sentence (wave-2 sync report). Status stays REVIEW. Earlier: Revised 2026-10-12 to version 1.1 (previous version 1.0) on two rulings of the product owner, relayed by the coordinator; stays REVIEW with his agreement, the guarantee (rendering written pitch never changes the generated phrase) unchanged. First, the owner's OK of 2026-10-12 to align this rule with spec D291 (master spec Part A v1.8, sections 7.1 and 12): the transposition no longer moves the key or the tonal-center labels. The written key is the tonal center the player chose, spelled with fewer accidentals, sharps on a tie; only the notes and the chord roots and slash bass move by the transposition's semitones; key signature, notes and chord symbols are spelled in the written key; the interval name is derived and shown only. This is what module_notation_display_convention 2.2 and the running code (unchanged since v2) already say and do. Second, spec D293 (master spec Part A v1.9, section 7.1): treble G2 clef becomes the instrument's clef, treble for the built-in profiles and treble or bass for my instrument, display only. Pending implementation: the bass clef is v3.0 build plan chunk 19b's target; until its code lands every staff is in treble clef, which agrees with this text while no my instrument can choose bass clef. Earlier: User sign-off 2026-09-24 (relayed by coordinator): approved promotion DRAFT to REVIEW; rule text unchanged. Re-confirmed 2026-09-26 against current (after the written-pitch key change) text: promotion DRAFT to REVIEW approved, verified against code as merged on main.
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
