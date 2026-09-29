# Export

This document records how Infinite Flow turns a finished session into export files: where the
encoders live, what each one takes and writes, and the technical choices behind them. The encoders
are pure functions from a session's phrases to the bytes of one file. The Review screen, the
export action and the browser download are not built yet, so no screen calls the encoders today.

Only the generated-notes MusicXML encoder exists so far. The generated-notes MIDI encoder and the
played-notes MIDI encoder will be added to this document when they are built.

## Where the code lives

`src/export/` holds the export encoders, one directory per format. Like `src/domain/`, it is pure
and browser-free: no Vue, no DOM, no storage, no network. It reads the domain model and never
writes to it.

| File                                          | What it holds                                                                                                                                                  |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/export/musicxml/musicxml-export-input.ts` | The input types (`GeneratedNotesMusicXmlInput`, `MusicXmlSessionPhrase`), the typed `MusicXmlExportError`, and `validateMusicXmlExportInput`, the input check. |
| `src/export/musicxml/musicxml-encoder.ts`      | `encodeGeneratedNotesMusicXml`, the entry point: the score header, the part, and the measures of every phrase in session order.                               |
| `src/export/musicxml/musicxml-measure.ts`      | One written measure as MusicXML: notes, rests, ties, beams and chord symbols.                                                                                 |
| `src/export/musicxml/musicxml-marks.ts`        | The opening attributes, a key change, the transposition, the rehearsal mark, the metronome mark, the double barline and the final barline.                    |
| `src/export/musicxml/xml-text.ts`              | A small XML tree and its serializer: escaping, two-space indentation, a line feed after every line.                                                           |

## Generated notes as MusicXML

### Input

`encodeGeneratedNotesMusicXml(input)` takes:

- `instrument`: the session's instrument profile. The encoder reads its display name (the part
  name) and its transposition.
- `phrases`: every phrase that sounded, in session order. Each has exactly three fields:
  - `number`: its session phrase number;
  - `writtenPhrase`: the `WrittenPhrase` the staff showed, from `transformToWrittenPhrase` in
    `src/domain/notation/`, the same model the VexFlow engraver draws;
  - `tempo`: its tempo in quarter notes per minute (BPM).

There is no field for played notes, and none can be added: `validateMusicXmlExportInput` rejects
any extra field on the input or on a phrase. MusicXML only ever holds generated notes, because
unquantized playing can't be engraved faithfully, and quantizing it would misrepresent what was
played.

The check also rejects, each with a `MusicXmlExportError`:

- an empty session;
- phrase numbers that don't run 1, 2, 3 … in order;
- a tempo that isn't a positive whole number;
- a phrase whose written phrase belongs to another instrument's transposition;
- a chord-symbol suffix with no MusicXML chord kind. The generator writes only triads today:
  major (no suffix), minor (`m`) and diminished (`dim`).

### Output

One score-partwise 4.0 document, UTF-8, with the MusicXML 4.0 partwise document type:

- **One part**, `P1`, named after the instrument (for example "B-flat tenor saxophone").
- **Written pitch.** Every note is written as the staff shows it: its spelled written pitch, its
  displayed accidental, notated value and dot, ties, and beam groups. A second beam level is added
  over neighbouring sixteenth notes. A lone sixteenth gets a hook: forward when it opens its
  group, backward otherwise.
- **Divisions.** 4 per quarter note, so one division is one sixteenth-note tick of the written
  phrase and every duration is a whole number.
- **Opening attributes**, in the first measure only: divisions, the written key signature (the
  signed count of sharps or flats, and the collection as the mode: `ionian`, `dorian`, `minor` …),
  4/4, the treble G2 clef, and the transposition.
- **Transposition.** A `<transpose>` element for a transposing instrument. It's left out when both
  counts are zero (the C MIDI keyboard). The instrument profile gives written pitch relative to
  concert pitch; MusicXML's `<transpose>` gives the opposite, what to add to the written pitch to
  get the sounding pitch, so both counts change sign. Whole octaves go to `<octave-change>`:

  | Instrument             | Profile (concert to written) | `<diatonic>` | `<chromatic>` | `<octave-change>` |
  | ---------------------- | ---------------------------- | ------------ | ------------- | ----------------- |
  | B-flat tenor saxophone | +14 / +8 (a major ninth up)  | -1           | -2            | -1                |
  | E-flat alto saxophone  | +9 / +5 (a major sixth up)   | -5           | -9            | none              |
  | C MIDI keyboard        | 0 / 0 (no transposition)     | none         | none          | none              |

- **Chord symbols.** One `<harmony>` per chord symbol, written right before the note or rest it
  starts on. The root and any slash bass are the written spellings the staff shows. `<kind>` holds
  the MusicXML chord kind (`major`, `minor`, `diminished`). Its `text` attribute repeats the suffix
  the staff prints (empty, `m`, `dim`), so a notation program prints the same symbol.
- **Phrases back to back.** Four measures per phrase, from phrase 1, with no gap. Measures are
  numbered from 1 across the whole session, so phrase _n_ fills measures 4_n_ − 3 to 4_n_.
- **Rehearsal marks.** The first measure of every phrase opens with a rehearsal mark holding its
  phrase number, above the staff.
- **Double barlines and the final barline.** The last measure of every phrase ends with a double
  (light-light) barline, except the last phrase: its last measure ends with a final (light-heavy)
  barline, a thin line then a thick one, as printed music normally ends.
- **Metronome marks.** The first phrase opens with a metronome mark (quarter note = tempo), with a
  `<sound tempo>` for playback. Any later phrase whose tempo differs from the phrase before
  gets another one. No other phrase has one.
- **Key changes.** A phrase whose written key signature or collection differs from the phrase
  before starts with a new `<key>`. This can't happen in a v2.0 session, because nothing changes a
  setting during one, but the settings-mutation flag in v2.1 can.
- **Identification.** `<software>Infinite Flow</software>`. The document holds no date or other
  varying value, so the same session always gives the same bytes.

No stem directions, layout, fonts or page settings are written: the notation program decides them.

### Choices, and why

- **The written phrase, not the concert timeline.** The review and the export must never disagree
  with what the staff showed. Encoding the same `WrittenPhrase` the engraver draws keeps every
  spelling, accidental, tie and beam identical, and leaves nothing to re-decide.
- **A hand-written serializer, not an XML library.** The output is small and fixed in shape. A
  serializer of about a hundred lines keeps the bytes fully determined by the code, adds no
  dependency to the bundle, and needs no DOM.
- **Two directions at a phrase start.** The rehearsal mark and the metronome mark are separate
  `<direction>` elements, so a notation program places each one on its own.

## Verifying the MusicXML

The unit specs are in `tests/unit/export/musicxml/`:

- `musicxml-encoder.spec.ts` parses the output and checks each rule above: the document shape,
  written pitch, the transpose element per instrument, the key changes, chord symbols (including a
  two-chord measure), rehearsal marks, double barlines, metronome marks, ties, beams, and the input
  check.
- `musicxml-golden.spec.ts` compares the encoder's output, byte for byte, with three golden files:
  one per instrument template, one with a tempo change, one with a key change.
- `musicxml-schema.spec.ts` validates the encoder's output and every golden file against the
  MusicXML 4.0 schema with `xmllint`, offline. A deliberately invalid document must fail, so a
  pass means something. `xmllint` (from libxml2) must be installed: a missing binary fails the spec
  rather than skipping it.

[`docs/testing.md`](testing.md) lists the fixtures. Opening the files in MuseScore is a manual check
that belongs to the export screen, once it can download them.
