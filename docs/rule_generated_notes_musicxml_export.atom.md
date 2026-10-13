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
notes: Synced 2026-10-13 at the v3.0 wave-2 post-task sync, same version 0.6: chunk 19b's code (d6928ec, merge 39cd2a5) writes the part's clef from the phrase's: a G clef on line 2 for treble clef, an F clef on line 4 for bass clef (clefElement in src/export/musicxml/musicxml-marks.ts), the transpose element unchanged, built-in exports byte for byte, with linked tests (musicxml-encoder.spec.ts, the schema check). The chunk 19b pending note below is done; the v3.2 change pending is untouched; status stays REVIEW. Earlier: Revised 2026-10-12 to version 0.6 (previous version 0.5) on the owner's ruling D293 (master spec Part A v1.9, sections 7.1 and 11), before code, for v3.0 build plan chunk 19b; stays REVIEW, as the owner agreed the change. The part's clef is its instrument's: a G clef on line 2 for treble clef (the built-in profiles, and my instrument in treble clef), an F clef on line 4 for my instrument in bass clef; the transpose element is unchanged. Pending implementation: until chunk 19b's code lands every export writes a G clef on line 2, which agrees with this text while no my instrument can choose bass clef. Chunk 19b's post-task sync checks the code against this text. The v3.2 change pending below is unaffected. Earlier: v3.2 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): for a Jam it opens with the quantized doodle as a section marked Doodle; engraving the quantized doodle does not contradict the reason given for never engraving played notes, since it is a generation input (rule_jam_exports_open_with_doodle). Text and status unchanged on purpose: it still describes the running code. Revise it in the change that builds that behaviour, per docs/release/v3.1-v3.2-intent-change-set.md. Earlier: Revised 2026-10-06 (previous version 0.4) on spec D193, the product owner answer to O105 - the checks of exports in real programs do not block the v2.0 tag; they follow it and are validated at a later date as v2.0.x hand checks, because the owner has no MuseScore account or DAW at hand (hardware checklist part F, 2026-10-06). The automated checks and the rest of the rule are unchanged; still part of release v2.0. Revised 2026-09-29 on an owner decision of 2026-09-29 (previous version 0.1). Version 0.1 closed every phrase with a double barline; the last phrase of the export now closes with a final barline instead, and a phrase whose written key differs from the previous phrase's opens with a new key signature. Still DRAFT. Revised 2026-10-05 (previous version 0.3) for spec D183 - v2 ships as one release, v2.0, and the real-hardware check this atom names is part of its single release gate rather than of a later release; the check itself is unchanged.
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
