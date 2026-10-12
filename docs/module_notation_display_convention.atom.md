---
id: module_notation_display_convention
status: REVIEW
version: 2.2
dependents:
  - [[service_headless_phrase_replay]]
human_name: Notation Written-Pitch Rendering
layer: ARCHITECTURE
priority: 1
tags: notation
parents:
  - [[rule_notation_display_preserves_phrase]]
type: MODULE
notes: Revised 2026-10-12 to version 2.2 (previous version 2.1) on the owner's ruling D291 (master spec Part A v1.8, sections 7.1 and 12), which keeps this module's spelling over the withdrawn rule that an interval's letter-name steps spell the written part. The text now says what the running code does (spellWrittenKey and transformToWrittenPhrase in src/domain/notation/): the tonal center is chosen in written pitch, so the transposition never moves the written key; the written key takes the spelling with fewer accidentals, sharps on a tie, and the notes, chord roots and slash bass are spelled in it; written pitch reads only the transposition's chromatic count, and the diatonic count reaches only an exported MusicXML file's transposition. The earlier wording, in which the transposition applied to the key and both counts derived written pitch, is gone. No code change: status stays REVIEW. Earlier: 2026-10-05: code and tests checked against the version 2.1 text after the ISS-006 stem-direction fix (which leaves written pitch untouched); promoted DRAFT to REVIEW under the owner's 2026-10-05 allowance.
---

# Notation Written-Pitch Rendering

## INTENT

Render written notation directly in the selected instrument profile's written pitch, with no independently selectable display convention.

## THE RULE / LOGIC
Notation derives written pitch from the concert-pitch timeline using only the selected instrument profile's own concert-to-written transposition. That transposition is a pair, an integer chromatic semitone count and an integer diatonic letter-step count, but notation reads only the chromatic count: a written note is its concert pitch plus the chromatic count, and so are a chord symbol's root and slash bass. The diatonic count decides no spelling; only an exported MusicXML file's transposition states it. There is no independently selectable Concert, B-flat, or E-flat display convention and no Concert-display override: the written pitch shown is always the one belonging to the currently selected instrument profile. The first-release transpositions are C MIDI keyboard +0 chromatic/+0 diatonic, B-flat tenor saxophone +14 chromatic/+8 diatonic (major ninth), and E-flat alto saxophone +9 chromatic/+5 diatonic (major sixth); a later profile, my instrument included, supplies its own transposition pair rather than selecting from a closed list. The tonal center is chosen in written pitch, so the written key is the chosen tonal center and collection: the transposition never moves it, it moves the concert key the phrase is generated in. When the written key can be spelled two ways, it takes the spelling whose key signature has fewer accidentals, the sharp one on a tie: for an instrument whose written notes sound 6 semitones higher, concert C major is written in F♯ major, not G♭ major. That one spelling serves the tonal-center label, the key signature, the notes, the chord roots and the slash bass: a pitch of the key's scale takes the key's own spelling; any other pitch takes its own letter on a white key, and on a black key a flat when the key signature has flats, a sharp otherwise. Chord quality, alterations, extensions, additions, and omissions are preserved. Rendering written pitch never mutates the concert timeline, the selected instrument profile, its range/register policy, or any generation control.

## TECHNICAL INTERFACE

The notation boundary accepts a concert-pitch event timeline and the selected instrument profile's transposition (chromatic/diatonic integer pair) and active concert range; it exposes no separate display-convention parameter. The written phrase carries that profile's written range (its active concert range moved by the transposition's semitones), which describes the instrument, not the phrase's notes, and which the engraver uses to place the staff.

## EXPECTATION
For identical concert-pitch events and written key, notation renders exactly one written-pitch representation, determined by the selected instrument profile's chromatic transposition count: transformed notes, chord roots, and slash bass, spelled in the written key, in treble G2 clef; chord quality and source events remain unchanged. The written key and its tonal label are the tonal center the player chose, spelled with the fewer accidentals, sharps on a tie, and never moved by the transposition; the diatonic count changes no spelling. Switching the selected instrument profile is the only way written pitch changes, and it is governed by the profile-switch rule, not by an independent display selection.
