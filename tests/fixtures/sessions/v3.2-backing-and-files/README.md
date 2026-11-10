# The v3.2 backing and file corpus

A read-only baseline recorded on the code v3.2.0 shipped: for a sample of the sessions of the v3.2
replay-key corpus (`tests/fixtures/replay-keys/v3.2-corpus.json`), what each session renders and
exports. `npm run test:unit` regenerates every session's phrases from their stored `ifk4.` keys,
renders and encodes each file again and compares bytes
(`tests/unit/export/backing-and-files-v32-corpus.spec.ts`). Only
`node scripts/record-replay-key-corpus-v32.mjs` writes these files, on v3.2.0 or on a 3.2.x fix
that changes a recorded value.

## The files of each session

| File                       | What it holds                                                                                |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| `<name>.backing.json`      | The backing's rendered notes, per phrase: the bass and the chords, each as pitch, start, length. |
| `<name>.musicxml`          | The generated-notes MusicXML file.                                                           |
| `<name>.mid`               | The generated-notes MIDI file, the backing track left out.                                   |
| `<name>-with-backing.mid`  | The generated-notes MIDI file with the backing track.                                        |

## The sessions

| Session                 | Phrases (corpus labels)                                              | What it covers                                          |
| ----------------------- | -------------------------------------------------------------------- | ------------------------------------------------------- |
| `<instrument>-chain`    | `<instrument>-levels1-chain-p1` to `-p3`, for each of the five instruments | Carry-in chains; my baritone in the bass clef.          |
| `c-keyboard-key-change` | `c-keyboard-levels0-key-change-p1`, `-p2`                            | A key change, phrase 2 carrying a null final harmony.   |
| `my-baritone-lock`      | `my-baritone-lock-p1`, `-p2-locked`, `-p3-changed`, `-p4-forced-bend` | The rhythm lock: locked, changed, forced bend.          |
| `c-keyboard-jam`        | `c-keyboard-jam-eighth-offbeats-close-rung1-p1`, `-p2-locked`, `-p3-locked` | A Jam, its lock on; the files open with the doodle. |
