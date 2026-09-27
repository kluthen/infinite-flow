# v2 — Sessions, Last-Session Review and Export

> **Archived 2026-09-27.** Consolidated into the v2 master spec. Live summary:
> [versions/v2/master-spec.md §7](../../versions/v2/master-spec.md).

Status: draft v0.1 (2026-09-26)

**Scope of this document.** How a session starts and ends, what the session history records,
the last-session review with favorites, MusicXML and MIDI export, and how played notes stay
private. Timing and audio are covered in [audio-and-backing.md](audio-and-backing.md); MIDI input
is covered in [midi-and-acknowledgement.md](midi-and-acknowledgement.md).

Settled items cite their decision. Everything else is `(proposed)`. O37, O46, O59, O62, O63, O64,
O65, O66, O72 and O73 are all settled (D88, D85, D93) — see [§8](#8-open-questions).

## 1. Settled inputs

- **Starting and ending.** A session starts on the first MIDI input or a Start click. With a
  controller, it ends after more than 30 s without input or on Stop (D62). Without a controller,
  only Stop ends it. The phrase keeps scrolling through the player's silences (D67).
- **Review and export.** At the end, the player reviews the last session (what was displayed and
  what was played) and marks what they liked. Export is MusicXML and MIDI, and ships with the
  review (D62, proposed timing kept). Reviewing earlier sessions needs persistence and is v3
  (D55, D62).
- **Privacy.** Played notes are private (D64). They stay on the player's system: in memory for
  the last-session review in v2, and they leave only through an export the player triggers, and
  only if the player chooses to include them (D69).
- **No material manipulation.** Editing, cutting, splicing and arranging are out of scope. Snippet
  selection exists only to create a continuation seed, which is v3 (D68).

## 2. What v1 gives us (checked, 2026-09-26)

- **No persistence and no network code.** A search of `src/` for `fetch(`, `XMLHttpRequest`,
  `sendBeacon`, `localStorage` and `indexedDB` finds nothing. The only network traffic is the
  app shell and the service-worker precache (`req_browser_only_first_release`).
- **No export code.** Nothing in `src/` mentions MusicXML or MIDI files.
- **Everything MusicXML needs already exists as a written phrase.**
  `src/domain/notation/written-phrase-types.ts` and `written-phrase.ts` give:
  - per measure: spelled written pitches (letter, alter, octave), notated durations with dots,
    rests and `tieToNext`;
  - written chord symbols (root, suffix, bass) placed at a tick;
  - the written key (tonic, collection, label and signature).

  `src/domain/notation/score-description.ts` already serializes that structure into accessible
  text. A MusicXML serializer is the same kind of pure function over the same input.

- **Session model.** The v1 session is modal: one `result` at a time, and edits are suppressed
  while an operation runs (`src/composables/use-generation-session.ts`). v2 needs a separate
  session state machine (see [rolling-phrase.md §5](rolling-phrase.md)).
- **No version stamp on results.** `GenerationResult` is `{ requestId, seed, timeline }`
  (`src/domain/generation/generation-result.ts`).

## 3. Session lifecycle (settled, D85/D89)

| State       | Entered by                                                           | Left by                                                                                       |
| ----------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Idle        | App load. End of review (starting again or dismissing it).           | Start click, or the first note-on once a controller is connected and audio is unlocked (D76). |
| Counting in | Start.                                                                | End of the count-in bar(s) (D85). Stop.                                                       |
| Running     | End of the count-in.                                                 | Stop. Inactivity timeout (controller sessions only). Page hidden (D89, ends the session).      |
| Review      | End of a session in which **at least one phrase was shown** (below). | Start (a new session replaces this review, D88). Dismiss.                                     |

- **Stop** ends the session at once. The backing and click fade out over about 100 ms, so it
  doesn't end on a click, and the review opens.
- **Stop during the count-in**, before any phrase was shown, returns to Idle with no review.
- **A hidden tab (D89) ends the session the same way Stop does** — there is no Paused state.
- **Controller session.** A session is a controller session while at least one MIDI input is
  attached. The 30 s inactivity timer counts from the most recent **note-on** (D86). It is armed
  by the first note-on of the session (**settled, D85**), so a player who clicks Start and has not
  yet played is not timed out.
- **Device loss** turns a controller session into a no-controller session (see
  [midi-and-acknowledgement.md §3](midi-and-acknowledgement.md)).
- **"Shown" phrase.** A phrase counts as shown once its **first bar has started sounding**. The
  look-ahead phrase that was displayed as read-ahead but never sounded is not part of the
  history. The phrase that was sounding when the session ended is included whole.
- **Trailing silence.** A timeout ends a session after more than 30 s of silence, which is 2 to 8
  phrases the player did not play, depending on tempo. **Settled (D85):** they stay in the
  history, because they were shown and may have been read.

## 4. Session history (settled, D88)

- **One record per shown phrase**, in order, held in memory only:
  - `phraseOrdinal` (1-based; O43);
  - the resolved request (intent, including controls and instrument template), the `seed`, and
    the `carryIn`, if any;
  - the `generatorVersion` stamp (below);
  - the **concert timeline** and the harmony provenance (for chord symbols and the backing);
  - the tempo the phrase was played at, and its start time on the session clock;
  - `repeatOf`, when the phrase is a failure-ladder repeat (O36);
  - the phrase's acknowledgements, and the played notes whose onsets fall in the phrase (§6).
- **Why store both the timeline and the reproduction inputs (D88):**
  - The timeline makes the review and the export independent of regeneration. They can never
    disagree with what was shown, even if a future generator version would produce something
    else.
  - The reproduction inputs make the "every phrase is reproducible" requirement testable, and
    they are exactly what v3 persistence and continuation seeds will need.
  - The cost is negligible: a four-bar phrase is a few kilobytes, so even a two-hour session at
    240 BPM (1,800 phrases) stays in the low megabytes (O72).
- **Generator version stamp.** v2 adds a `generatorVersion` identifier to the result, or to the
  history record, meaning "the output of this seed and request is stable under this
  identifier". It changes whenever golden fixtures change. This is a contract change in
  `specs/generator-contract.md` (reported, not edited here).

## 5. Last-session review (D62, D88)

- **What it shows:** every shown phrase, in order, engraved as it was displayed (written pitch,
  key signature, chord symbols), with its phrase number and tempo. The layout and navigation are
  ux-writer's decision. The requirement is that the player can reach any phrase in a long
  session without waiting (settled, D88: no cap on session length).
- **Favorites (settled, D88):** a favorite marks a **whole phrase**, and can be toggled on and
  off. Marking a bar range is a snippet selection, which D68 ties to continuation seeds, so it is
  v3.
- **Played notes in the review (settled, D93).** The generated notes are always shown (this was
  already true). Played notes are **optional**, shown with a toggle (the original proposed
  default holds). When shown, they appear against the phrase's time grid, **unquantized and
  neutral**, and may indicate which notes matched the script — an appreciation of having
  followed it, not a score. There is still no right/wrong colouring on a miss: only a positive
  match is ever marked, per D66/D92.
- **Only the last session exists.** Starting a new session discards the current review and its
  played notes. **Settled (D88):** if favorites were marked and not exported, a confirmation is
  asked first. Closing or reloading the page discards everything, without a prompt.
- **Empty review.** A session that showed phrases but received no MIDI input still gets a review.
  Only the played-notes toggle is unavailable.

## 6. Export (settled, D88)

- **Scope: both.** "Export session" exports every shown phrase. "Export favorites" is
  available when at least one favorite exists, and exports only those phrases, in session order.
  Every exported phrase keeps its session phrase number.
- **Delivery:** a file download created in the browser (a `Blob` and an object URL). There is no
  upload and no share target in v2. File names follow the pattern
  `infinite-flow-YYYY-MM-DD-HHmm[-favorites].musicxml` or `.mid`.
- **MusicXML** (`score-partwise`, version 4.0, uncompressed `.musicxml`):
  - One part, in **written pitch** for the session's instrument template, with a `<transpose>`
    element carrying the template's transposition, so notation software can switch to concert
    pitch. For a C template, the element is omitted.
  - Treble clef, as in v1. The key signature is repeated wherever the key changed during the
    session.
  - Chord symbols as `<harmony>` elements at their written tick (settled, D88: always included).
  - Each phrase starts with a rehearsal mark ("Phrase 7") and a double barline. A metronome mark
    appears at the start and at each tempo change.
  - Implemented as a pure serializer over the written phrases, with no library.
  - **Played notes are not in MusicXML** (O65). Unquantized input can't be engraved faithfully,
    and quantizing it would misrepresent what was played.
- **MIDI** (Standard MIDI File, type 1, 480 ticks per quarter):
  - Track 1: the generated line at **concert pitch**, velocity 80, channel 1.
  - A tempo map (tempo meta-events at every change), time signature 4/4, and a marker per phrase
    ("Phrase 7").
  - Optional track: the backing, as rendered during the session (bass and chords). Off by
    default (settled, D88).
  - Optional track: the played notes, **only if the player ticks "include what I played"**. Off
    by default (D69). They are unquantized, converted from session time with the tempo map, and
    keep their velocity.
  - Implemented by hand: a type-1 writer is a small, well-specified piece of code. The fallback
    is `midi-writer-js` (MIT) or `@tonejs/midi` (MIT) if the hand-rolled writer proves costly.
- **Favorites export and joins.** Non-adjacent favorites are exported back to back. Each still
  starts on a fresh beat-1 attack (see [rolling-phrase.md §3](rolling-phrase.md)), so no tie or
  beam is ever cut.

## 7. Privacy (D64, D69) `(proposed)`

- **Where played notes live.** They exist only in memory, in the current session and its review.
  v2 writes **nothing** to `localStorage`, IndexedDB or the Cache API, for played notes or for
  generated history. Opt-in persistence is v3.
- **When they are discarded:** on a new session, on dismissing the review, and on page close or
  reload.
- **The only way out** is the player's export with the explicit played-notes option.
- **The access model is trivial and stated for completeness.** There is one local user and no
  accounts, roles or sharing. Every action is available to whoever is using the page.

## 8. Open questions

**Settled here:** O37, O46, O59, O62, O63, O64, O65, O66, O72, O73 (D88, D93, D85, above).

No open questions remain in this document.

## 9. Acceptance criteria (proposed)

1. **Lifecycle.** Start, Stop, the first-note start and the 30 s timeout behave as in D62 and
   D67 and §3. This is checked with a fake clock and injected MIDI.
2. **History is complete and exact.** The review lists every shown phrase, in order, and nothing
   else. Each phrase is identical to what was displayed.
3. **Reproducible.** Regenerating each history record from its request, seed and carry-in with
   the same `generatorVersion` yields the stored timeline.
4. **MusicXML in real tools.** A session export opens in MuseScore 4 with the correct written
   pitches, key signatures, chord symbols, transposition and phrase marks, for the C, B♭ and E♭
   templates.
5. **MIDI in real tools.** A MIDI export imports into MuseScore 4 or a DAW with concert pitches,
   the session's tempo map and one marker per phrase.
6. **Privacy.** In an end-to-end run with a network and storage spy: no request and no storage
   write carries played-note data at any point in a session, review or export. After a reload,
   no played note is recoverable. An export without the played-notes option contains no played
   notes.
7. **No grading.** No view (live, review or export) labels a played note as wrong, missed or
   scored.

## Sources

- MusicXML 4.0 reference, `<transpose>` and `<harmony>` elements, W3C Music Notation Community
  Group: <https://www.w3.org/2021/06/musicxml40/>.
- Standard MIDI File 1.0 specification (MIDI Association):
  <https://midi.org/standard-midi-files-specification>.
- npm registry: `midi-writer-js` 3.2.1 (MIT) and `@tonejs/midi` 2.0.28 (MIT).
