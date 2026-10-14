---
id: module_notation_display_convention
status: REVIEW
version: 2.3
dependents:
  - [[service_headless_phrase_replay]]
human_name: Notation Written-Pitch Rendering
layer: ARCHITECTURE
priority: 1
tags: notation
parents:
  - [[rule_notation_display_preserves_phrase]]
type: MODULE
---

# Notation Written-Pitch Rendering

## INTENT

Render written notation directly in the selected instrument profile's written pitch, with no independently selectable display convention.

## THE RULE / LOGIC
Notation derives written pitch from the concert-pitch timeline using only the selected instrument profile's own concert-to-written transposition. That transposition is a pair, an integer chromatic semitone count and an integer diatonic letter-step count, but notation reads only the chromatic count: a written note is its concert pitch plus the chromatic count, and so are a chord symbol's root and slash bass. The diatonic count decides no spelling; only an exported MusicXML file's transposition states it. There is no independently selectable Concert, B-flat, or E-flat display convention and no Concert-display override: the written pitch shown is always the one belonging to the currently selected instrument profile. The first-release transpositions are C MIDI keyboard +0 chromatic/+0 diatonic, B-flat tenor saxophone +14 chromatic/+8 diatonic (major ninth), and E-flat alto saxophone +9 chromatic/+5 diatonic (major sixth); a later profile, my instrument included, supplies its own transposition pair rather than selecting from a closed list. The tonal center is chosen in written pitch, so the written key is the chosen tonal center and collection: the transposition never moves it, it moves the concert key the phrase is generated in. When the written key can be spelled two ways, it takes the spelling whose key signature has fewer accidentals, the sharp one on a tie: for an instrument whose written notes sound 6 semitones higher, concert C major is written in F♯ major, not G♭ major. That one spelling serves the tonal-center label, the key signature, the notes, the chord roots and the slash bass: a pitch of the key's scale takes the key's own spelling; any other pitch takes its own letter on a white key, and on a black key a flat when the key signature has flats, a sharp otherwise. Chord quality, alterations, extensions, additions, and omissions are preserved. Rendering written pitch never mutates the concert timeline, the selected instrument profile, its range/register policy, or any generation control. The written phrase is drawn on a staff in the clef of the instrument it was written for: treble clef for a built-in profile, my instrument's own clef, treble or bass, for my instrument. The clef decides only the line or space each written note is drawn on and where the key signature's accidentals sit; it changes no written pitch and no spelling.

## TECHNICAL INTERFACE
The notation boundary accepts a concert-pitch event timeline and the selected instrument profile's transposition (chromatic/diatonic integer pair) and active concert range, and that instrument's clef, treble or bass (treble for every built-in profile); it exposes no separate display-convention parameter. The written phrase carries that profile's written range (its active concert range moved by the transposition's semitones), which describes the instrument, not the phrase's notes, and which the engraver uses, read in the clef, to place the staff. It also carries the instrument's clef, which the engravers draw; every reader of a written phrase, the review included, draws the clef the phrase carries. The clef comes from my instrument's own value, never from the generator-facing profile or the generation request. Each system starts with the instrument's clef, then the key signature, whose accidentals sit on that clef's lines (`addClefAndKey` in `src/notation/vexflow-two-system-engraver.ts`); every note is built in the same clef. Rests sit on the same staff lines in either clef: every rest on the middle line (written B4 in treble clef, D3 in bass clef), a whole rest hanging from the fourth line from the bottom (written D5 in treble, F3 in bass) (`REST_KEYS` in `src/notation/vexflow-mapping.ts`).

## EXPECTATION
For identical concert-pitch events and written key, notation renders exactly one written-pitch representation, determined by the selected instrument profile's chromatic transposition count: transformed notes, chord roots, and slash bass, spelled in the written key, on a staff in the instrument's clef (treble for a built-in profile, treble or bass for my instrument); chord quality and source events remain unchanged. The same phrase written for treble and for bass clef has the same written notes and spelling; only where they are drawn differs. The written key and its tonal label are the tonal center the player chose, spelled with the fewer accidentals, sharps on a tie, and never moved by the transposition; the diatonic count changes no spelling. Switching the selected instrument profile is the only way written pitch changes, and it is governed by the profile-switch rule, not by an independent display selection.
