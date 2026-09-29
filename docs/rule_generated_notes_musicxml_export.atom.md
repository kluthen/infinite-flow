---
id: rule_generated_notes_musicxml_export
status: DRAFT
human_name: Generated Notes MusicXML Export
tags: [v2, release-v2.0, export, notation]
layer: BUSINESS
priority: 1
parents:
  - [[req_session_export]]
dependents: []
type: RULE
version: 0.1
---

# Generated Notes MusicXML Export

## INTENT
Export the session's generated notes as a score a notation program opens faithfully.

## THE RULE / LOGIC
The MusicXML export (score-partwise 4.0) holds one part, in the session instrument's own written pitch, with a transpose element carrying that transposition (omitted for a C instrument). Chord symbols are always included. Each phrase is marked with a rehearsal mark and a double barline, and there is a metronome mark at the start and at every tempo change. MusicXML only ever holds generated notes: unquantized playing cannot be faithfully engraved, and quantizing it would misrepresent what was actually played.

## TECHNICAL INTERFACE
The generated-notes export in MusicXML format produces one score-partwise 4.0 file.

## EXPECTATION
- The MusicXML file opens correctly in a real notation program (MuseScore) for each of the three instrument templates: the B♭ tenor and E♭ alto saxophones, which transpose, with their transpose element, and the C keyboard, which does not transpose, without one.
- It shows written pitch, chord symbols, one rehearsal mark and double barline per phrase, and metronome marks at the start and at every tempo change.
- It never contains played notes.
