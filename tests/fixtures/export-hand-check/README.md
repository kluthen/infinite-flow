# Export hand-check files

These are the generated-notes files of one seeded session, exactly as the app downloads them, for
checking by hand: the MusicXML files in MuseScore and the MIDI files in a MIDI tool. The unit spec
`tests/unit/export/export-hand-check-files.spec.ts` rebuilds every file with
`buildGeneratedNotesFile` and fails unless the bytes here are identical. It also validates the
three MusicXML files against the MusicXML 4.0 schema with `xmllint`.

## The session

Each file comes from a session recorded through the real session runner, with real phrase
generation, and stopped after the last phrase:

| Setting        | Value                                                     |
| -------------- | --------------------------------------------------------- |
| Phrase 1 seed  | 2026 (generated at Idle)                                  |
| Session seed   | 9100; every later seed derived from it by the seed plan   |
| Phrases        | 6, so 24 measures                                         |
| Tempo          | 100 BPM throughout, so the tempo map holds a single tempo |
| Written key    | F major (one flat)                                        |
| Note density   | Eighth                                                    |
| Other controls | the session test defaults (`sessionSettings`)             |

All three instruments use the same seeds and settings. The written key is the instrument's own
written key, so the three files share the key signature and the sounding (concert) keys differ.

## The files

| File                              | Instrument             | What to check by hand                                                                                           |
| --------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| `b-flat-tenor-saxophone.musicxml` | B-flat tenor saxophone | MuseScore opens it; the part transposes (concert pitch shows E-flat major, an octave and a major second lower). |
| `e-flat-alto-saxophone.musicxml`  | E-flat alto saxophone  | MuseScore opens it; the part transposes (concert pitch shows A-flat major, a major sixth lower).                |
| `c-keyboard.musicxml`             | C MIDI keyboard        | MuseScore opens it; no transposition, so concert pitch changes nothing.                                         |
| `generated.mid`                   | C MIDI keyboard        | A MIDI tool opens it: 2 tracks, 100 BPM, 4/4, markers "Phrase 1" to "Phrase 6", one every 4 measures.           |
| `generated-with-backing.mid`      | C MIDI keyboard        | As `generated.mid`, plus a third track, "Backing", with the bass and chords.                                    |

In every MusicXML file, check also: rehearsal marks 1 to 6, one per phrase; a double barline after
each phrase but the last, which ends with a final barline; the chord symbols; one metronome mark
(quarter note = 100) at the start.

## Regenerating

Run the spec with `UPDATE_EXPORT_HAND_CHECK=1` to rewrite the files from the current code, then
run it again without the variable to confirm the bytes:

```sh
UPDATE_EXPORT_HAND_CHECK=1 npx vitest run tests/unit/export/export-hand-check-files.spec.ts
npx vitest run tests/unit/export/export-hand-check-files.spec.ts
```

Regenerate only on purpose: a change to these bytes means the downloaded files changed, and the
hand checks should be done again.
