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
version: 0.5
notes: v3.2 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): for a Jam it opens with the quantized doodle as a section marked Doodle; engraving the quantized doodle does not contradict the reason given for never engraving played notes, since it is a generation input (rule_jam_exports_open_with_doodle). Text and status unchanged on purpose: it still describes the running code. Revise it in the change that builds that behaviour, per docs/release/v3.1-v3.2-intent-change-set.md. Earlier: Revised 2026-10-06 (previous version 0.4) on spec D193, the product owner answer to O105 - the checks of exports in real programs do not block the v2.0 tag; they follow it and are validated at a later date as v2.0.x hand checks, because the owner has no MuseScore account or DAW at hand (hardware checklist part F, 2026-10-06). The automated checks and the rest of the rule are unchanged; still part of release v2.0. Revised 2026-09-29 on an owner decision of 2026-09-29 (previous version 0.1). Version 0.1 closed every phrase with a double barline; the last phrase of the export now closes with a final barline instead, and a phrase whose written key differs from the previous phrase's opens with a new key signature. Still DRAFT. Revised 2026-10-05 (previous version 0.3) for spec D183 - v2 ships as one release, v2.0, and the real-hardware check this atom names is part of its single release gate rather than of a later release; the check itself is unchanged.
---

# Generated Notes MusicXML Export

## INTENT
Export the session's generated notes as a score a notation program opens faithfully.

## THE RULE / LOGIC
The MusicXML export (score-partwise 4.0) holds one part, in the session instrument's own written pitch, with a transpose element carrying that transposition (omitted for a C instrument). Chord symbols are always included. Each phrase is marked with a rehearsal mark. Every phrase but the last ends with a double barline (two thin lines); the last phrase of the export ends with a final barline (a thin line then a thick one, the usual sign that the piece is over). There is a metronome mark at the start and at every tempo change. MusicXML only ever holds generated notes: unquantized playing cannot be faithfully engraved, and quantizing it would misrepresent what was actually played.

## TECHNICAL INTERFACE
The generated-notes export in MusicXML format produces one score-partwise 4.0 file.

## EXPECTATION
- The MusicXML file carries each of the three instrument templates correctly, as automated tests check: the B♭ tenor and E♭ alto saxophones, which transpose, with their transpose element, and the C keyboard, which does not transpose, without one.
- Opening the file in a real notation program (MuseScore) for each of the three instrument templates, and finding it correct there, is a hand check that follows the v2.0 tag, validated later as a v2.0.x hand check; it does not block the tag.
- It shows written pitch, chord symbols, one rehearsal mark per phrase, a double barline (two thin lines) closing every phrase but the last, a final barline (a thin line then a thick one) closing the last phrase, and metronome marks at the start and at every tempo change.
- A phrase whose written key differs from the previous phrase's opens with a new key signature.
- It never contains played notes.
