# Export

This document records how Infinite Flow turns a finished session into export files: where the
encoders live, what each one takes and writes, and the technical choices behind them. The encoders
are pure functions from a session's phrases to the bytes of one file. The Review screen, the
export action and the browser download are not built yet, so no screen calls the encoders today.

Two encoders exist so far: generated notes as MusicXML, and generated notes as MIDI. The
played-notes MIDI encoder will be added to this document when it is built; it reuses the MIDI
time resolution and conductor track described below.

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
| `src/export/midi/midi-export-input.ts`         | The input types (`GeneratedNotesMidiInput`, `MidiSessionPhrase`, `MidiBackingPhrase`, `MidiBackingNote`), the typed `MidiExportError`, and `validateMidiExportInput`, the input check. |
| `src/export/midi/midi-encoder.ts`              | `encodeGeneratedNotesMidi`, the entry point: the header and the two or three tracks.                                                                          |
| `src/export/midi/midi-tracks.ts`               | The conductor track (time signature, tempo map, phrase markers), the generated line read from the concert timelines, the backing, and note-track ordering.      |
| `src/export/midi/midi-time.ts`                 | The fixed time resolution (`MIDI_TICKS_PER_QUARTER_NOTE`), the phrase length in MIDI ticks, exact whole-note to MIDI-tick conversion, and the tempo value.     |
| `src/export/midi/smf-writer.ts`                | The Standard MIDI File byte layer: variable-length quantities, header and track chunks, note and meta events.                                                  |

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

## Generated notes as MIDI

### Input

`encodeGeneratedNotesMidi(input)` takes:

- `phrases`: every phrase that sounded, in session order. Each has exactly three fields:
  - `number`: its session phrase number;
  - `timeline`: its `ConcertEventTimeline`, the concert-pitch notes and rests exactly as generated;
  - `tempo`: its tempo in quarter notes per minute (BPM).
- `backing`: `null` when the player leaves the backing off, which is the default. When they ask
  for it, one entry per phrase, in the same order and with the same numbers, each holding that
  phrase's backing notes. A backing note has exactly a `pitch` (a concert MIDI note number), a
  `start` counted from the beginning of its phrase and a `duration`, both exact values in whole
  notes. The encoder doesn't render the backing: the review screen passes it the backing
  renderer's notes for each phrase.

There is no field for played notes, and none can be added: `validateMidiExportInput` rejects any
extra field on the input, on a phrase, on a backing entry or on a backing note. The
generated-notes file never holds played notes; they leave the app only through their own export.

The check also rejects, each with a `MidiExportError`:

- an empty session;
- phrase numbers that don't run 1, 2, 3 … in order;
- a tempo that isn't a whole number from 60 to 240 BPM, the Tempo control's range, which
  adaptive tempo never leaves either;
- a backing that doesn't hold exactly one entry per phrase, numbered like the phrases;
- a backing note whose pitch isn't a whole number from 0 to 127, that has no length, or that
  starts before its phrase or ends after it;
- two backing notes of the same pitch that overlap: one MIDI channel can't sound the same pitch
  twice at once, so the file couldn't say which release ends which note. A note may start exactly
  where the same pitch ends.

Encoding also stops with a `MidiExportError` on a time that falls between two MIDI ticks (see
below), and on a tie continuation that doesn't follow a sounding note of the same pitch.

### Output

One Standard MIDI File, type 1 (several tracks played together), as a `Uint8Array`:

- **Time resolution.** 960 MIDI ticks per quarter note, fixed, for every MIDI file the app
  writes. A MIDI tick is the file's own time unit, not the app's sixteenth-note tick: a sixteenth
  note is 240 MIDI ticks, a measure 3840, a four-measure phrase 15360.
- **Phrases back to back.** Phrase _n_ starts at (_n_ − 1) × 15360 MIDI ticks: phrase 1 at time
  zero, with no gap. Every track ends where the last phrase ends, even on a rest.
- **Track 1, the conductor track**, named "Infinite Flow":
  - the 4/4 time signature, once, at time zero;
  - the full tempo map: a tempo event at time zero, and another at the start of every phrase whose
    tempo differs from the phrase before. No other phrase has one;
  - one marker per phrase, at its start, holding "Phrase" and its number: "Phrase 1",
    "Phrase 2" … A digital audio workstation (DAW, a music production program) shows them on its
    timeline.
- **Track 2, the generated line**, named "Generated notes", on MIDI channel 1: every note at
  concert pitch, as the concert timeline holds it. A tie joins two written notes into one sound,
  so a note and its tie continuations are written as one MIDI note, held for their total length,
  across a barline or not. A rest writes nothing.
- **Track 3, the backing**, named "Backing", on MIDI channel 2, only when the input carries the
  backing: every backing note, placed from its phrase's start.
- **Velocities.** The generated line has no dynamics, so every note has the same note-on velocity:
  96 for the generated line, 72 for the backing, so the line stands out when the file plays. Every
  note-off has the neutral release velocity 64.
- **Event order.** Events sit in time order. At the same MIDI tick, every release comes before
  every attack, so a pitch that ends one note and starts the next is released before it sounds
  again; releases among themselves, and attacks among themselves, go by pitch, lowest first.
- **No other events.** No program change (the playing tool picks its default sound), no key
  signature, no controller, no running status. The file holds no date or other varying value, so
  the same session always gives the same bytes.

### Time resolution and the 1 ms bound

The played-notes file must place every onset within 1 ms of where it was played, and it lines up
with this file only if both use the same time grid. So the resolution is chosen for played notes
and fixed here, for both files:

- At 60 BPM, the slowest tempo, a quarter note lasts 1 s = 1,000,000 µs, so one MIDI tick lasts
  1,000,000 / 960 ≈ 1041.7 µs.
- Rounding a time to the nearest MIDI tick moves it by at most half a tick: about 520.8 µs, under
  1 ms. At any faster tempo a tick is shorter, so the bound holds with more room.
- 480 MIDI ticks per quarter note, the other common choice, would allow up to about 1041.7 µs at
  60 BPM: over the bound.
- 960 divides by 2, 3, 4, 5, 6 and 8, so every sixteenth note, triplet and thirty-second note of
  the generated rhythm falls exactly on a MIDI tick. The generated notes and the backing are never
  rounded at all: a time that doesn't fall on a tick stops the encoder rather than being moved.

`midi-time.spec.ts` checks the bound two ways: half a tick at 60 BPM is at most 1 ms, and a sweep
of every whole-microsecond onset across one quarter note at 60 BPM, rounded to the nearest tick,
never moves more than half a tick.

The tempo itself is written in whole microseconds per quarter note, the only unit the format has.
Most tempos have no exact value (70 BPM is 857,142.86 µs), so it is rounded to the nearest
microsecond. That moves a quarter note by under 0.5 µs, a whole phrase by under 8 µs, so within
one phrase it is far below the 1 ms bound. Over a very long session the difference adds up
(about 1 ms per 2000 quarter notes at worst), so a DAW's clock can drift that much from the app's
audio clock. The played-notes file is to be built from
the same tempo events and to place each note from its phrase's start, so the two files never
drift apart from each other.

### Choices, and why

- **The concert timeline, not the written phrase.** MIDI has no written pitch, spelling or
  engraving, only sounding notes, so the encoder reads the concert-pitch timeline the generator
  produced, the same notes the review engraves.
- **A conductor track of its own.** The tempo map and markers sit on track 1, apart from any
  notes, which is where DAWs look for them. The played-notes encoder, once built, makes the same track from
  the same function, `conductorTrackEvents`, so the two files share their tempo map and markers
  byte for byte.
- **Backing notes as input, not harmony.** The encoder writes notes; the backing renderer decides
  them. Taking its output keeps one source for what the backing plays, so the file and the audio
  can't disagree.
- **One channel per track.** The generated line on channel 1 and the backing on channel 2 keep
  their sounds apart when a tool plays the file through one synthesizer. Channel 10 is the
  General MIDI drum channel and is avoided.
- **A hand-written byte writer, not a library.** The file is small and fixed in shape. About 150
  lines keep the bytes fully determined by the code and add no dependency to the bundle.

## Verifying the MIDI

The unit specs are in `tests/unit/export/midi/`:

- `midi-encoder.spec.ts` reads the output back and checks each rule above: the file type and
  resolution, the tracks and their names, the time signature, the tempo map (including a rounded
  tempo), one marker per phrase, the generated notes worked out by hand (the tie across a barline
  as one note), channels and velocities, release before attack at a phrase join, the backing on
  and off, and the same bytes for the same session. Its round-trip test reads a five-phrase file
  back and gets the same notes and the same tempo map as the session.
- `midi-export-input.spec.ts` checks the input contract: no field for played notes, in the type
  and at run time, and every rejection listed above.
- `midi-time.spec.ts` checks the resolution, the 1 ms bound, exact conversion and the tempo value.
- `midi-golden.spec.ts` compares the encoder's output, byte for byte, with two golden files: the
  same three-phrase session with a tempo change and a tie across a barline, with the backing off
  and on.
- `smf-reader.ts` is the Standard MIDI File reader these specs use. It is written for the tests
  and shares no code with the encoder; `smf-reader.spec.ts` checks it on a file assembled by hand.

[`docs/testing.md`](testing.md) lists the fixtures. Opening the files in a real MIDI tool, with the
correct tempo map, is a manual check that belongs to the export screen, once it can download
them.
