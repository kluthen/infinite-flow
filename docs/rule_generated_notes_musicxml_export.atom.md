---
id: rule_generated_notes_musicxml_export
status: REVIEW
human_name: Generated Notes MusicXML Export
tags: [v2, release-v2.0, v2.4-check, export, notation, changes-in-v3.2]
layer: BUSINESS
priority: 1
parents:
  - [[req_session_export]]
dependents:
  - [[module_review_export_pipeline]]
type: RULE
version: 0.6
---

# Generated Notes MusicXML Export

## INTENT
Export the session's generated notes as a score a notation program opens faithfully.

## THE RULE / LOGIC
The MusicXML export (score-partwise 4.0) holds one part, in the session instrument's own written pitch, with a transpose element carrying that transposition (omitted for a C instrument). The part's clef is its instrument's: a G clef on the second line (treble clef) for the built-in profiles and for my instrument in treble clef, an F clef on the fourth line (bass clef) for my instrument in bass clef; the clef changes no written note and not the transpose element. Chord symbols are always included. Each phrase is marked with a rehearsal mark. Every phrase but the last ends with a double barline (two thin lines); the last phrase of the export ends with a final barline (a thin line then a thick one, the usual sign that the piece is over). There is a metronome mark at the start and at every tempo change. MusicXML only ever holds generated notes: unquantized playing cannot be faithfully engraved, and quantizing it would misrepresent what was actually played.

## TECHNICAL INTERFACE
The generated-notes export in MusicXML format produces one score-partwise 4.0 file.

## EXPECTATION
- The MusicXML file carries each of the three instrument templates correctly, as automated tests check: the B♭ tenor and E♭ alto saxophones, which transpose, with their transpose element, and the C keyboard, which does not transpose, without one.
- Opening the file in a real notation program (MuseScore) for each of the three instrument templates, and finding it correct there, is a hand check that follows the v2.0 tag, validated later as a v2.0.x hand check; it does not block the tag.
- It shows written pitch, chord symbols, one rehearsal mark per phrase, a double barline (two thin lines) closing every phrase but the last, a final barline (a thin line then a thick one) closing the last phrase, and metronome marks at the start and at every tempo change.
- A phrase whose written key differs from the previous phrase's opens with a new key signature.
- An export whose instrument is my instrument in bass clef opens with an F clef on the fourth line and the same transpose element as in treble clef; every other export opens with a G clef on the second line, a built-in profile's unchanged.
- It never contains played notes.
