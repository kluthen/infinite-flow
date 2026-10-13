# Export

This document records how Infinite Flow turns a finished session into export files: where the
encoders live, what each one takes and writes, the technical choices behind them, how the
player's export action in the Review reaches a browser download, and the hand check of the
downloaded files. The encoders are pure functions from a session's phrases to the bytes of one
file.

Three encoders exist: generated notes as MusicXML, generated notes as MIDI, and played notes as
MIDI. The played-notes encoder reuses the generated-notes MIDI file's time resolution and
conductor track, so the two MIDI files of one session line up. The Review downloads only the
generated-notes files so far; the played-notes file's name and export action come with chunk 23
of the v2 build plan.

## Where the code lives

`src/export/` holds the export encoders, one directory per format, and the generated-notes file
the Review downloads. Like `src/domain/`, the encoders and `generated-notes-file.ts` are pure and
browser-free: no Vue, no DOM, no storage, no network. They read the domain model and never write
to it. `browser-download.ts` is the one file that touches the page, and only through the document
it is given.

| File                                           | What it holds                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/export/musicxml/musicxml-export-input.ts` | The input types (`GeneratedNotesMusicXmlInput`, `MusicXmlSessionPhrase`), the typed `MusicXmlExportError`, and `validateMusicXmlExportInput`, the input check.                                                                                                                                                                                                           |
| `src/export/musicxml/musicxml-encoder.ts`      | `encodeGeneratedNotesMusicXml`, the entry point: the score header, the part, and the measures of every phrase in session order.                                                                                                                                                                                                                                          |
| `src/export/musicxml/musicxml-measure.ts`      | One written measure as MusicXML: notes, rests, ties, beams and chord symbols.                                                                                                                                                                                                                                                                                            |
| `src/export/musicxml/musicxml-marks.ts`        | The opening attributes, a key change, the transposition, the rehearsal mark, the metronome mark, the double barline and the final barline.                                                                                                                                                                                                                               |
| `src/export/musicxml/xml-text.ts`              | A small XML tree and its serializer: escaping, two-space indentation, a line feed after every line.                                                                                                                                                                                                                                                                      |
| `src/export/midi/midi-export-input.ts`         | The input types (`GeneratedNotesMidiInput`, `MidiSessionPhrase`, `MidiBackingPhrase`, `MidiBackingNote`), the typed `MidiExportError`, `validateMidiExportInput`, the input check, and the shared checks both MIDI inputs use (`assertExactKeys`, `assertNumberedInOrder`, `assertTempo`).                                                                               |
| `src/export/midi/midi-encoder.ts`              | `encodeGeneratedNotesMidi`, the entry point: the header and the two or three tracks.                                                                                                                                                                                                                                                                                     |
| `src/export/midi/midi-tracks.ts`               | The conductor track (time signature, tempo map, phrase markers) and its name `MIDI_FILE_NAME`, shared by both MIDI encoders; the generated line read from the concert timelines; the backing; and note tracks: `voicedNoteTrackEvents` (each note with its own channel and velocity, `VoicedNote`) and `noteTrackEvents` (one channel and velocity for all, through it). |
| `src/export/midi/midi-time.ts`                 | The fixed time resolution (`MIDI_TICKS_PER_QUARTER_NOTE`), the phrase length in MIDI ticks and in seconds (`phraseSeconds`), exact whole-note to MIDI-tick conversion, seconds to the nearest MIDI tick (`midiTicksOfSeconds`), and the tempo value.                                                                                                                     |
| `src/export/midi/played-notes-midi-input.ts`   | The played-notes input types (`PlayedNotesMidiInput`, `PlayedNotesMidiPhrase`, `MidiPlayedNote`) and `validatePlayedNotesMidiInput`, its input check.                                                                                                                                                                                                                    |
| `src/export/midi/played-notes-placement.ts`    | `playedTrackNotes`: each played note's phrase, its MIDI ticks and its channel.                                                                                                                                                                                                                                                                                           |
| `src/export/midi/played-notes-midi-encoder.ts` | `encodePlayedNotesMidi`, the entry point: the header, the conductor track and the played track.                                                                                                                                                                                                                                                                          |
| `src/export/midi/smf-writer.ts`                | The Standard MIDI File byte layer: variable-length quantities, header and track chunks, note and meta events.                                                                                                                                                                                                                                                            |
| `src/export/generated-notes-file.ts`           | `buildGeneratedNotesFile`: the one file the player asked for (bytes, file name, MIME type), built from the session history; `generatedNotesFileName`; `backingForExport`, the backing track's notes.                                                                                                                                                                     |
| `src/export/load-generated-notes-export.ts`    | `loadGeneratedNotesExport`, the lazy-loading boundary of `generated-notes-file.ts`, and its typed `GeneratedNotesExportLoadError`.                                                                                                                                                                                                                                       |
| `src/export/browser-download.ts`               | `downloadFile`: one export file handed to the browser as a download, and its typed `BrowserDownloadError`.                                                                                                                                                                                                                                                               |

The Review's side of the export is in `src/components/workspace/review-export.ts` (see
[From the Review to a download](#from-the-review-to-a-download)).

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
  4/4, the instrument's clef, and the transposition.
- **Clef.** The [clef](music/lexicon.md#clef) the written phrase carries, its instrument's: the
  [treble clef](music/lexicon.md#treble-clef), `<sign>G</sign>` on line 2, for the three built-in
  profiles; for my instrument, its own clef, treble (G on line 2) or
  [bass](music/lexicon.md#bass-clef) (`<sign>F</sign>` on line 4). The clef changes only where the
  notes sit on the staff, never the written notes, so `<transpose>` is the same in either clef.
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

[`docs/testing.md`](testing.md) lists the fixtures. Opening the files in MuseScore is done by hand,
on files exactly as the app downloads them: see [Hand check](#hand-check).

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
  notes. The encoder doesn't render the backing: `backingForExport` in
  `src/export/generated-notes-file.ts` passes it the backing renderer's notes for each phrase's
  stored harmony, in 4/4 as the audio renders it. That renderer is `renderBacking` in
  `src/domain/backing/backing-renderer.ts`, the one the audio plays from (see
  [the backing](audio-transport.md#the-renderer)); its `BackingNote` has the same shape as
  `MidiBackingNote`, and its bass (MIDI 36 to 47) and chords (MIDI 53 to 64) never share a pitch.

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
audio clock. The played-notes file is built from the same tempo events and places each note from
its phrase's start, so the two files never drift apart from each other (see
[Played notes as MIDI](#played-notes-as-midi)).

### Choices, and why

- **The concert timeline, not the written phrase.** MIDI has no written pitch, spelling or
  engraving, only sounding notes, so the encoder reads the concert-pitch timeline the generator
  produced, the same notes the review engraves.
- **A conductor track of its own.** The tempo map and markers sit on track 1, apart from any
  notes, which is where DAWs look for them. The played-notes encoder makes the same track from the
  same function, `conductorTrackEvents`, with the same name, `MIDI_FILE_NAME`, so the two files
  share their tempo map and markers byte for byte.
- **Backing notes as input, not harmony.** The encoder writes notes; the backing renderer decides
  them. Taking its output keeps one source for what the backing plays, so the file and the audio
  can't disagree.
- **One channel per track.** The generated line on channel 1 and the backing on channel 2 keep
  their sounds apart when a tool plays the file through one synthesizer. Channel 10 is the
  General MIDI drum channel and is avoided.
- **A hand-written byte writer, not a library.** The file is small and fixed in shape. About 150
  lines keep the bytes fully determined by the code and add no dependency to the bundle.

## Played notes as MIDI

### Input

`encodePlayedNotesMidi(input)` takes `phrases`: every phrase that sounded, in session order. Each
has exactly four fields:

- `number`: its session phrase number;
- `tempo`: its tempo in quarter notes per minute (BPM);
- `startedAt`: the audio time, in seconds, it started sounding;
- `playedNotes`: the notes the player played whose onsets fall in it. Each has exactly a `pitch`
  (the [concert pitch](music/lexicon.md#concert-pitch) as received), a `velocity` (the original
  note-on velocity), an `onsetAt` and a `releaseAt`, both audio times in seconds.

`playedNotesMidiInputFromHistory(records)` in `src/session/session-history-export.ts` builds it
from the session history (see
[Handing a session to the encoders](session-engine.md#handing-a-session-to-the-encoders)). The
history has already placed each played note in the phrase whose span holds its onset, left out
the count-in and the starting note, and taken the latency correction off both times.

There is no field for generated notes or the backing, and none can be added:
`validatePlayedNotesMidiInput` rejects any extra or missing field on the input, on a phrase or on
a played note. The check also rejects, each with a `MidiExportError`:

- an empty session;
- phrase numbers that don't run 1, 2, 3 … in order;
- a tempo that isn't a whole number from 60 to 240 BPM;
- a phrase start that isn't a finite time, or phrases that aren't back to back on the audio clock
  within 1 ms: each phrase must start where the one before ends, 16 quarter notes at its tempo
  later;
- a pitch that isn't a whole number from 0 to 127, or a velocity that isn't one from 1 to 127;
- a time that isn't finite, or a release before its onset;
- an onset before its phrase's start, or at or after the next phrase's start (the last phrase may
  hold any later onset, as the history gives it every later note);
- a session in which nothing was played.

### Output

One Standard MIDI File, type 1, as a `Uint8Array`, with two tracks:

- **Track 1, the conductor track**, exactly the generated-notes file's for the same phrase numbers
  and tempos: the same name, "Infinite Flow", the 4/4 time signature, the tempo map and one
  marker per phrase, ending where the last phrase ends (see
  [Generated notes as MIDI](#generated-notes-as-midi)).
- **Track 2, the played notes**, named "Played notes": every played note, at its concert pitch as
  received and its original note-on velocity, on MIDI channel 1, or a later channel when the same
  pitch is still sounding (see below). Every note-off has the neutral release velocity 64.
- **Event order**, as in the generated-notes file: time order, every release before every attack
  at the same MIDI tick; then by channel, then by pitch, lowest first.
- **Nothing else.** No generated note, no backing, no program change, no controller. The file
  holds no date or other varying value, so the same session always gives the same bytes.

### Time

Every played note is placed from its own phrase's start, never from the session's:

- **Membership on the audio clock.** A note belongs to the phrase its onset falls in, decided in
  seconds, not in MIDI ticks. Any other phrase keeps every onset before the next phrase's start,
  even one in the up-to-1 ms gap after its own end. Only the last phrase is cut at its own end (16
  quarter notes after its start): a note with an onset at or after it is left out of the file.
- **The onset.** Its time since its phrase's start, converted to MIDI ticks at that phrase's tempo
  (`midiTicksOfSeconds`) and rounded to the nearest tick, with no other quantization. Rounding moves
  it by at most half a tick: about 0.52 ms at 60 BPM, less at any faster tempo (see
  [Time resolution and the 1 ms bound](#time-resolution-and-the-1-ms-bound)).
- **The release** is converted the same way, in the phrase that holds the release time, which may
  be a later phrase at another tempo. A release after the last phrase's end stops at the file's
  end, so a note still held when the session ended stops there.
- **At least one tick.** A note released at its onset, or rounded to no length, lasts one MIDI
  tick, so it still sounds.
- **The end.** The conductor track ends where the last phrase ends. The played track ends there
  too, or one tick later when a note played just before the end rounds onto it and gets its one
  tick.

### Choices, and why

- **One conductor track for both files.** Both encoders build track 1 with `conductorTrackEvents`
  and the same name, `MIDI_FILE_NAME`, so the tempo map, the markers and the end are byte for byte
  identical, and the two files line up phrase by phrase when imported together into a DAW.
- **Phrases must be back to back within 1 ms.** Every note is placed from its phrase's recorded
  start. A session whose phrases don't follow each other exactly on the audio clock can't be
  placed on the file's grid without moving notes, so it is refused rather than repaired.
- **Each phrase's own tempo.** Converting each time at the tempo of the phrase that holds it keeps
  notes in place across a tempo change, as the file's tempo map plays it.
- **Another channel for an overlapping attack of one pitch.** One MIDI channel can't sound the same
  pitch twice at once, and the generated-notes file refuses such backing notes, but a played note
  is not the app's to refuse. Each note goes on the lowest channel where its pitch is not still
  sounding (a note may start exactly where another ends), so both attacks survive. Channel 10, the
  General MIDI drum channel, is skipped; more than fifteen notes of one pitch at once is a
  `MidiExportError`.
- **A session with no played note gives no file.** The encoder refuses it with a
  `MidiExportError`. Chunk 23, which adds the Review's played-notes action, makes it unavailable
  for such a session.
- **The history records each phrase at its scheduled start.** The session controller records a
  sounding phrase at the transport's scheduled start, `audio.phraseStartsAt(n)`, not at the
  engine's time, which the engine time floor can raise past it (see
  [The history](session-engine.md#the-history)). A late recorded start would shift every note of
  the phrase and break the 1 ms contiguity check.

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
- `midi-golden.spec.ts` compares each encoder's output, byte for byte, with golden files: for the
  generated notes, the same three-phrase session with a tempo change and a tie across a barline,
  with the backing off and on; for the played notes, the reference played session on the same
  phrases and tempos, also read back to its tempo map, markers and notes worked out by hand.
- `played-notes-midi-input.spec.ts` checks the played-notes input contract: no field for the
  backing or a generated note, in the type and at run time, and every rejection listed above.
- `played-notes-midi-encoder.spec.ts` checks which notes the file holds (pitch and velocity as
  played, an onset at the last phrase's end left out), how long they last (a note held at the end,
  a zero-length note, a release across a tempo change), the channels, and the same bytes for the
  same session.
- `played-notes-midi-timing.spec.ts` is a seeded property test: 500 random sessions of two to
  four phrases, with random tempos (at least one change) and random onsets and releases, from a
  fixed-seed generator (mulberry32), so every run checks the same cases. Each file is read back
  and every onset converted to seconds from its phrase's marker through the file's own tempo map,
  independently of the encoder's arithmetic. No onset may be more than 1 ms from where it was
  played.
- `played-notes-midi-alignment.spec.ts` encodes the same session as both files and compares their
  division and whole conductor track byte for byte, over several tempo maps, the slowest and
  fastest tempos included.
- `tests/unit/session/session-history-export.spec.ts` checks `playedNotesMidiInputFromHistory`,
  and that a recorded session's two MIDI files share their conductor track.
- `smf-reader.ts` is the Standard MIDI File reader these specs use. It is written for the tests
  and shares no code with the encoder; `smf-reader.spec.ts` checks it on a file assembled by hand.
  Its `rawChunks` splits a file into its raw chunks for the byte-for-byte track comparison.

[`docs/testing.md`](testing.md) lists the fixtures. Opening the files in a real MIDI tool, with the
correct tempo map, is done by hand: see [Hand check](#hand-check). The hand check of a downloaded
played-notes file, lined up with its generated-notes file in a DAW, belongs to chunk 23, which
adds its download, and to the v2.1 release gate.

## From the Review to a download

The player exports from the last session's Review (see
[The last-session Review](phrase-workspace.md#the-last-session-review)), which opens when a
session ends after phrase 1 has sounded and stays reachable until the next session starts. The
Review builds the file from that session's history (see
[Session history](session-engine.md#session-history)) and hands it to the browser.

### The action

`review-export`, in the Review's header, is one group named "Export generated notes":

- **Format**: a segmented control, `MusicXML` (checked at first) or `MIDI`.
- **Backing track**: a toggle button, shown only while `MIDI` is checked, off at first. It is
  independent of the audio mix's `Backing` toggle.
- **Export generated notes**: builds exactly one file and starts its download. One activation,
  one file, one download.

Both choices hold for the page session: `useReviewHost`
(`src/components/workspace/use-review-host.ts`) keeps them in memory, across Reviews and
sessions, and stores them nowhere, so a reload brings back MusicXML with the backing off. While
the file is built, the button takes `is-loading` and is disabled; Format and Backing track stay
live and apply to the next export. Success shows and announces nothing: the browser's download is
the confirmation. Focus returns to the button.

`exportGeneratedNotes(history, request, ports)` in `src/components/workspace/review-export.ts`
runs one export: it loads the export code, builds the file and downloads it. Its two ports,
`ReviewExportPorts` (`load` and `download`), are the page's own by default
(`browserReviewExportPorts(document)`); `ScorePanel`'s `reviewExportPorts` prop lets a test or
the harness replace them.

### The file

`buildGeneratedNotesFile(history, request)` builds the one file asked for. The request holds the
format and `backingTrack`, which the Review sends as true only for MIDI with the toggle on.

- **MusicXML**: `musicXmlInputFromHistory` then `encodeGeneratedNotesMusicXml`, as UTF-8 bytes,
  with the MIME type `application/vnd.recordare.musicxml+xml`, in the session instrument
  profile's [written pitch](music/lexicon.md#written-pitch).
- **MIDI**: `midiInputFromHistory`, with `backingForExport`'s notes when the backing track is
  asked for and `null` otherwise, then `encodeGeneratedNotesMidi`, with the MIME type
  `audio/midi`, at [concert pitch](music/lexicon.md#concert-pitch).

Nothing is regenerated: both read the stored phrases (see
[Handing a session to the encoders](session-engine.md#handing-a-session-to-the-encoders)). The
history has held the player's played notes since chunk 17, but neither encoder's input has a
field for them, so no played note reaches either file.

- **File names.** `infinite-flow-{YYYY-MM-DD}-{HHmmss}-generated.musicxml` or `.mid`
  (`generatedNotesFileName`), from the session's start in the player's local time: the history's
  `startedAt`, the wall clock read once when the Start click or the starting note started the
  session, never the time of the export. For example, a session started at 14:30:05 on
  2 October 2026 exports `infinite-flow-2026-10-02-143005-generated.mid`. The played-notes file,
  whose download chunk 23 adds, is to take the same stem with `-played.mid`, so a session's files
  sort together.
- **The same bytes every time.** The same history and request always give the same bytes:
  neither encoder writes a date or any other varying value, and the name comes from the recorded
  start. Exporting twice downloads two identical files (the browser may add a number to the
  second file's name).

### Loading the export code

The encoders and the backing renderer stay out of the entry chunk. `loadGeneratedNotesExport()`
(`src/export/load-generated-notes-export.ts`) imports `generated-notes-file.ts` dynamically, into
its own chunk, and keeps the promise, so later exports share one load. Nothing else may import
that module statically. The code loads on the first export and is not warmed beforehand, unlike
the Review panel's chunk, which a session's start warms (see
[The last-session Review](phrase-workspace.md#the-last-session-review)). A failed import is
wrapped as a `GeneratedNotesExportLoadError` and the kept promise is cleared, so the next export
calls `import()` again rather than reusing the failed promise. Whether that call fetches the chunk
again is up to the browser: Chromium keeps a failed module for the page's life, so there every
later export fails the same way until the page is reloaded. The chunk is precached with every other
built chunk, so exporting works offline, and a load can only fail when the app is used offline
before the precache has finished or after a broken deploy; a reload recovers.

### The download

`downloadFile(file, document)` (`src/export/browser-download.ts`) makes a `Blob` of the bytes with
the file's MIME type, takes an object URL for it, appends a hidden temporary `<a>` whose
`download` attribute is the file name, clicks it once, then removes the anchor and revokes the URL
at once, even if the click throws. Revoking right after the click doesn't cancel the download:
the browser resolves a blob URL to its `Blob` when the link is followed, which `click()` does
synchronously. A document with no window throws a `BrowserDownloadError`.

### Failures

Any failure rejects the export: the export code failing to load, the file failing to build (an
encoder's or adapter's typed error), or the browser refusing the download. The Review then shows
`review-export-error`, "The file couldn't be made. Try again.", under its actions. It is not a
live region and moves no focus, and the next export removes it as it starts. A failure before the
download downloads nothing. The export works whatever the hidden workspace is doing, including
while the next phrase loads and while the staff has no room.

### Privacy

The history, the Review and the file live in memory only. Nothing is sent and nothing is stored,
the format and backing-track choices included: the app has no server, and browser storage and the
network are forbidden in `src/` (see [Runtime Constraints](../README.md#runtime-constraints)). The
download, started by the player's click, is the only way a session's data leaves the page.

### Verifying the download

The unit specs:

- `tests/unit/export/generated-notes-file.spec.ts`: each format's bytes are the encoder's output
  for the history's adapter; MusicXML ignores the backing-track choice; the MIDI backing track is
  `renderBacking`'s notes, phrase by phrase, only when asked for; the same bytes on a second
  build; no played note in any format or backing setting; the file names, zero-padded, from the
  recorded start in local time, not the time of the export, and refused for a start that is not a
  finite time.
- `tests/unit/export/load-generated-notes-export.spec.ts`: one shared load, a failed import as the
  typed error, and a new `import()` call after a failure (Vitest's mocked import runs again; a
  browser may not, see [Loading the export code](#loading-the-export-code)).
- `tests/unit/export/browser-download.spec.ts`: one anchor named after the file on a blob URL of
  its bytes and type, the URL revoked and the anchor removed (also when the click throws), and a
  document with no window refused.
- `tests/unit/components/workspace/review-export.spec.ts`: the backing track only when asked for,
  a rejection with nothing downloaded when the code fails to load or the file fails to build, a
  rejection when the browser can't take the download, and the file handed to the given document
  only.
- `tests/unit/export/export-hand-check-files.spec.ts`: the hand-check files below, rebuilt and
  compared byte for byte, and the MusicXML ones validated against the MusicXML 4.0 schema.

The browser-level checks (the Review's downloads, identical bytes, the export error, and the
network and storage spy) are listed in [The Review specs](testing.md#the-review-specs), and the
hand-check files below in [Export hand-check files](testing.md#export-hand-check-files).

## Hand check

Two things can't be checked by a test: that MuseScore, the notation program musicians use most,
reads the MusicXML files as intended, and that a real MIDI tool reads the MIDI files' tempo map
and markers. The owner checks them by hand and writes the results below.

### The files

[`tests/fixtures/export-hand-check/`](../tests/fixtures/export-hand-check/README.md) holds the
generated-notes files of one seeded six-phrase session (24 measures, 100 BPM throughout, written
key F major, Eighth note density), exactly as the app downloads them:

| File                              | Instrument profile     | Format                               |
| --------------------------------- | ---------------------- | ------------------------------------ |
| `b-flat-tenor-saxophone.musicxml` | B-flat tenor saxophone | MusicXML, with `<transpose>`         |
| `e-flat-alto-saxophone.musicxml`  | E-flat alto saxophone  | MusicXML, with `<transpose>`         |
| `c-keyboard.musicxml`             | C MIDI keyboard        | MusicXML, without `<transpose>`      |
| `generated.mid`                   | C MIDI keyboard        | MIDI, backing track off: two tracks  |
| `generated-with-backing.mid`      | C MIDI keyboard        | MIDI, backing track on: three tracks |

Its README gives the session's seeds and settings. `export-hand-check-files.spec.ts` rebuilds every
file through the real session runner and `buildGeneratedNotesFile`, and fails unless the bytes
are identical, so the files always match what the current code downloads. To rewrite them on
purpose, after a change to the export:

```sh
UPDATE_EXPORT_HAND_CHECK=1 npx vitest run tests/unit/export/export-hand-check-files.spec.ts
npx vitest run tests/unit/export/export-hand-check-files.spec.ts
```

Changed bytes mean the downloaded files changed: do the hand check again on the new files.

### Checklist

**MuseScore, each of the three MusicXML files.** Open the file (File > Open) and check:

1. **It opens** with no error, as one part on a [treble clef](music/lexicon.md#treble-clef)
   staff.
2. **The instrument name.** The part is named after the instrument profile: "B-flat tenor
   saxophone", "E-flat alto saxophone" or "C MIDI keyboard".
3. **Written pitch.** With MuseScore's Concert pitch toggle off, the notes are the ones the app's
   staff showed, in the instrument's [written pitch](music/lexicon.md#written-pitch), and the
   [key signature](music/lexicon.md#key-signature) is F major, one flat, in all three files.
4. **The transposition.** Turn Concert pitch on; the score should show
   [concert pitch](music/lexicon.md#concert-pitch), the pitch that sounds:
   - B-flat tenor saxophone ([transposing instrument](music/lexicon.md#transposing-instrument),
     `<transpose>` with an octave change): every note a major ninth lower (an octave and a whole
     step), in E-flat major, three flats;
   - E-flat alto saxophone (`<transpose>`, no octave change): every note a major sixth lower, in
     A-flat major, four flats;
   - C MIDI keyboard (no `<transpose>`): nothing changes.

   Turn Concert pitch off again.

5. **The time signature.** [4/4](music/lexicon.md#time-signature), at the start only.
6. **The measures.** 24 [measures](music/lexicon.md#measure), numbered 1 to 24, each holding
   four beats, with no empty or extra measure; [ties](music/lexicon.md#tie) and beams as the app
   drew them, a tie across a [bar line](music/lexicon.md#bar-line) included.
7. **Phrase numbers.** Rehearsal marks 1 to 6, the session phrase numbers, above measures 1, 5,
   9, 13, 17 and 21; a double bar line at the end of measures 4, 8, 12, 16 and 20, and a final
   bar line (thin then thick) after measure 24.
8. **The tempo.** One metronome mark, quarter note = 100, at measure 1, and none later; playback
   runs at 100 BPM ([tempo](music/lexicon.md#tempo)).
9. **Chord symbols.** One above each chord change, as the app showed them, spelled in written
   pitch (so the saxophone files' symbols move with Concert pitch).

**A MIDI tool, both MIDI files.** Open the file in a digital audio workstation (DAW) or a MIDI
file viewer that shows the tempo map and markers, and check:

1. **It opens** with no error.
2. **The tracks.** `generated.mid`: two tracks, "Infinite Flow" (the conductor track, with no
   notes) and "Generated notes" (channel 1). `generated-with-backing.mid`: the same two, plus
   "Backing" (channel 2), with the bass and the chords.
3. **The tempo map.** Exactly one tempo event, 100 BPM, at the start. A v2.0 session keeps one
   tempo throughout, so its tempo map holds one tempo; the encoder adds one only at a phrase whose
   tempo differs from the phrase before.
4. **The time signature.** 4/4, once, at the start.
5. **The markers.** "Phrase 1" to "Phrase 6", one at the start of every fourth measure (measures
   1, 5, 9, 13, 17, 21; at 100 BPM, every 9.6 s: 0, 9.6, 19.2, 28.8, 38.4 and 48.0 s).
6. **The length.** 24 measures, 57.6 s, every track ending there.
7. **The notes.** At concert pitch: for the C MIDI keyboard, the pitches of `c-keyboard.musicxml`.
   A tied note sounds as one held note. In `generated-with-backing.mid`, the backing's chord
   changes fall where `c-keyboard.musicxml` shows its chord symbols, and the generated line plays
   louder than the backing.

The real-hardware checks of the v2.0 release gate
([build-plan chunk 21](../specs/versions/v2/build-plan.md#chunk-21--v20-release-gate)),
ask for the same checks again on files downloaded from the running app. They do not block the
v2.0 tag: settled on 2026-10-06 (spec D193), they follow it, written down as a hand-check note on
a v2.0.x update.

### Results

Fill in one row per check when it is done: the tool and its version, the date, `pass` or `fail`,
and anything seen in the notes.

| Check                                                     | File                              | Tool and version | Date | Result       | Notes |
| --------------------------------------------------------- | --------------------------------- | ---------------- | ---- | ------------ | ----- |
| MuseScore opens it correctly, with `<transpose>`          | `b-flat-tenor-saxophone.musicxml` | —                | —    | open — owner |       |
| MuseScore opens it correctly, with `<transpose>`          | `e-flat-alto-saxophone.musicxml`  | —                | —    | open — owner |       |
| MuseScore opens it correctly, without `<transpose>`       | `c-keyboard.musicxml`             | —                | —    | open — owner |       |
| A MIDI tool opens it with the right tempo map and markers | `generated.mid`                   | —                | —    | open — owner |       |
| As above, plus the backing track                          | `generated-with-backing.mid`      | —                | —    | open — owner |       |
