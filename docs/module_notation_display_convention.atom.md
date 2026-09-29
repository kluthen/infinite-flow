---
id: module_notation_display_convention
status: DRAFT
version: 2.1
dependents: []
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

Notation derives written pitch from the concert-pitch timeline using only the selected instrument profile's own concert-to-written transposition (an integer chromatic semitone count and integer diatonic letter-step count). There is no independently selectable Concert, B-flat, or E-flat display convention and no Concert-display override: the written pitch shown is always the one belonging to the currently selected instrument profile. The first-release transpositions are C MIDI keyboard +0 chromatic/+0 diatonic, B-flat tenor saxophone +14 chromatic/+8 diatonic (major ninth), and E-flat alto saxophone +9 chromatic/+5 diatonic (major sixth); a later profile supplies its own open transposition pair rather than selecting from a closed list. The transposition applies to note spelling, key, tonal-center label, chord roots, and slash bass, but preserves chord quality, alterations, extensions, additions, and omissions. Choosing the enharmonic spelling with the fewest accidentals (ties toward sharps) is applied consistently to every displayed item under this one transposition. Rendering written pitch never mutates the concert timeline, the selected instrument profile, its range/register policy, or any generation control.

## TECHNICAL INTERFACE

The notation boundary accepts a concert-pitch event timeline and the selected instrument profile's transposition (chromatic/diatonic integer pair) and active concert range; it exposes no separate display-convention parameter. The written phrase carries that profile's written range (its active concert range moved by the transposition's semitones), which describes the instrument, not the phrase's notes, and which the engraver uses to place the staff.

## EXPECTATION

For identical concert-pitch events, notation renders exactly one written-pitch representation determined solely by the selected instrument profile's transposition: transformed notes, key, tonal label, chord roots, and slash bass in treble G2 clef; chord quality and source events remain unchanged. Switching the selected instrument profile is the only way written pitch changes, and it is governed by the profile-switch rule, not by an independent display selection.
