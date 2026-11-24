# Prerequisites — Building Blocks Later Versions Need

Status: draft v0.2 (2026-09-25; the chord-fit check's placement updated 2026-10-03, D174; the check dropped 2026-10-07, D211; microphone input out of scope in any version, 2026-11-22, D554; revised for v4.0 on 2026-11-24 against the v3.4 structural review, D575, D583: what is built marked, the game's and v5's rows placed, the library line added as foundation O, and K worked out for v4.0). Preliminary analysis, not a decision document.

The user asked for "preliminary work of seeking what's necessary to build prior some items
proposed for later version to occur". This document maps each planned capability (v1.0 through
the [endgame](../vision/endgame.md)) to the **foundations** it rests on. It checks what exists in
`src/` today and proposes which foundations are cheap to prepare early and which would be
premature.

Reading rules:

- Statements about the code cite a file and were checked by reading it on 2026-09-25, unless they
  are dated 2026-11-24: those were checked on `main` at 6d4c33c3 (v3.4.0 plus its archive). Each
  foundation's **Current state (2026-09-25)** is kept as the analysis it was; its **Status
  (2026-11-24)** line above it says what is true now.
- Anything not directly checked is tagged **(inference)**.
- Gap sizes (S/M/L) are **estimates (inference)**, not effort commitments:
  - S = a local change to one module.
  - M = a new module, or a change crossing a few modules.
  - L = a new subsystem, or an architectural change touching the generator contract.
- Foundation letters (A–O) are local labels for this document only. They are not open-question
  IDs. The questions at the end point to the register.
- Decision numbers (Dnn) refer to the
  [2026-09-25 archive](../archive/2026-09-25-personas-and-vision/decisions-D47-D71.md). O10 refers to the
  [register](../open-questions.md); O24 is resolved (D108) — see
  [v2/master-spec.md §9](v2/master-spec.md#9-the-end-of-measure-chord-fit-check).

## 0. Where this stands (2026-11-24)

The v3.4 structural review asked whether this list is still right and which items are urgent
([report §2.1](v3/structural-review-report.md#21-the-prerequisites)). This revision answers it.

- **As a map, it holds.** Each capability still rests on the foundations named below.
- **Most of it is built.** v2 and v3 built A (minimal form), B, C, D, E, F, G (export), H, L
  (display-state half), M (for v1.0's variety) and N (by stored timelines and versioned replay
  keys). §1 marks each row; each foundation's status line says how far.
- **Who needs the rest has changed.** The game is a separate app on the other side of a library
  (D551), and v4.0 is most probably this app's last update (D552), holding Tone.js and
  accompaniment with roles only (D553). So:
  - the endgame rows are **the game's**, built on the library, and wait for game start;
  - the whole-file seed and library snippets are **v5's**, and wait on
    [O314](../open-questions.md#after-v34-the-split-and-this-apps-horizon-o313) (a), which may move
    them to the game; their analysis stays here, unrevised, until then;
  - for this app, one capability is left: **v4.0's accompaniment with roles**, on K, B, A and D.
- **One foundation was missing: the library line** (O below). It is built and enforced since v3.4.
- **The one urgent item is K, the multi-voice representation**, for v4.0. The player plays the lead
  only (D580), so K does not have to make the timeline polyphonic: §2 K proposes how v4.0 carries
  several system voices beside the one lead.

## 1. Dependency map

Placement since 2026-11-24: **built** (with the version), **v4.0**, **v5** (D553; may move to the
game, O314 (a)), **game** (D551; was "endgame"), **out**, or **dropped**.

| Capability                                                                                                 | Placement           | Depends on foundations                                | State on 2026-11-24                                                                                 |
| ---------------------------------------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Open instrument templates, transposition as data (D56, D57)                                                | Built, v1.0 and v3.0 | H                                                     | Built: open transposition data, three presets and My instrument                                    |
| Rhythmic variety, Mixed retired (D59, D60)                                                                 | Built, v1.0         | M, I                                                  | Built: `rhythm-variety.ts` replaces Mixed                                                           |
| Rolling phrase continuing its own output (D51, D65)                                                        | Built, v2           | A, B, E, N, plus a latency budget                     | Built: carry-in, pre-generation                                                                     |
| MIDI input, expected-note acknowledgement (D52)                                                            | Built, v2           | C, B, H, L                                            | Built: `midi/`, note identity, overlays                                                             |
| End-of-measure chord-fit check (D108; a v3 nice-to-have since D174)                                       | Dropped (D211)      | C, D, B                                               | Not built                                                                                           |
| Backing audio: bass, block chords, click (D63, D70)                                                        | Built, v2           | B, D                                                  | Built: `domain/backing/`, `audio/`                                                                  |
| Session model, last-session review (D62, D67)                                                              | Built, v2           | E, C, N                                               | Built                                                                                               |
| MusicXML / MIDI export (D62, D67)                                                                          | Built, v2           | G, E                                                  | Built: `export/midi`, `export/musicxml`                                                             |
| Adaptive tempo, opt-in (D66, D101)                                                                         | Built, v2           | B, C, D, E                                            | Built                                                                                               |
| Played-note privacy (D69)                                                                                  | Built, v2 and v3.0  | E (in memory), G (export choice)                      | Built: opt-in keeping, on the device only                                                           |
| Embellishment and style flags (D59)                                                                        | Built, v3.1         | I, J, M                                               | Built: seven figures with levels, presets; no trill, mordent or grace note                         |
| MIDI-seeded continuation (D53)                                                                             | Built, v3.2 (Jam)   | A (full form), C, O10                                 | Built as Jam: a doodle grows phrases                                                                |
| "My instrument" configuration (D55)                                                                        | Built, v3.0         | H, F                                                  | Built                                                                                               |
| Local persistence (D55)                                                                                    | Built, v3.0         | F, N                                                  | Built: `storage/`, codecs, migrations                                                               |
| Earlier-session review                                                                                     | Built, v3.0         | E, F, N                                               | Built: kept sessions                                                                                |
| Accompaniment with roles (D70)                                                                             | **v4.0** (D553)     | K, B, A, D                                            | B, A (minimal) and D built; K is the gap (§2 K)                                                     |
| Whole-file seed import (D65)                                                                               | v5 (D553)           | G (import), A, M                                      | No: 4/4-only meter, sixteenth-grid-only time policy                                                 |
| Library, snippet as seed (D65, D68)                                                                        | v5+ (O314 (a))      | G, F, A, E                                            | No                                                                                                  |
| Microphone input (D55; out of scope in any version, D554)                                                  | Out                 | C generalized to an input-source port, H (input kind) | No                                                                                                  |
| Character presets: scale restriction, banned pitches, ornament preferences, gimmicks, register personality | Game (D551)         | I, J, M, A, O                                         | Partly: presets of generation settings (v3.1), capability flags                                     |
| Multiple system voices                                                                                     | Game (D551)         | K, B, O                                               | v4.0's K is the first step, in this app                                                             |
| Turn-based phrase exchanges                                                                                | Game (D551)         | A, K, M (short phrases), O                            | No: phrase length is fixed at 4                                                                     |
| Status effects: blindness, tone deaf, pitch scare                                                          | Game (D551)         | L (display-effect layer), I, O                        | Partly: one clean insertion point (WrittenPhrase) exists                                            |

The table as it stood on 2026-09-25, with its gap sizes, is in this file's git history (before
the v4.0 revision); its rows are kept above, re-placed.

## 2. Foundations

### A. Continuation-capable generation contract

**Status (2026-11-24).** The minimal form is built (v2): `domain/generation/carry-in` and the
session's carry-in adaptation (review evidence A §3.4). Jam (v3.2) grows phrases from a played
doodle, a first full form. v4.0 adds one reader: the arranger reads the phrase it accompanies and,
for a fill leading into the next phrase, that phrase's first chord (§2 K). The file seed's and the
game's forms wait (v5, game).

**What it is.** A way to generate phrase N+1 so that it follows on from material that is
already fixed. The fixed material can be the previous generated phrase (v2), a played motif
(v3), a file (v4), a library snippet (v5+) or the other side's turn (endgame).

- **The minimal form (v2)** passes a small **boundary state**: the last chord and its harmonic
  role, the last sounding pitch, an open figure obligation, and whether a tie crosses the
  boundary.
- **The full form (v3+)** interprets an arbitrary seed as rhythm, pitch and implied harmony.
  (inference)

**Needed by:** the rolling phrase (v2), MIDI-seeded continuation (v3), the whole-file seed (v4),
library snippets (v5+) and endgame exchanges.

**Current state (2026-09-25).**

- There is no input for prior context.
  - `GenerationRequest` (`src/domain/generation/generation-request.ts`) carries only
    `requestId`, `seed`, `measureCount: 4`, a 4/4 `meter`, the active concert range, the
    register and the register window.
  - `GenerationIntent` (`generation-intent.ts`) adds controls and profiles, but no prior
    material.
- **The phrase is exactly four measures by type.**
  - `PHRASE_MEASURE_COUNT = 4`.
  - `ConcertEventTimeline.measures` is a fixed 4-tuple, and `makeConcertEventTimeline` rejects
    any other count (`src/domain/events/timeline.ts`).
- **Phrase-boundary rules assume a standalone phrase.**
  - The phrase starts with a fresh attack on bar 1, beat 1. It never opens with a rest, a
    pickup or a tie (validation code `first_note_off_downbeat`; atom
    `rule_phrase_starts_on_downbeat`).
  - The phrase ends open (`contour-endpoint-rules.ts`; atom `rule_open_phrase_ending`).
  - The notation transform rejects a tie continuation in measure 0
    (`src/domain/notation/written-phrase.ts`, around line 59).
- **Rhythm coordinates are phrase-local.** `BarIndex = 0|1|2|3`, `GestureBarIndex = 0|1`, bar
  forms `xxxx`…`xyyx`, grammar `rhythm-mvp-v1`.
- **The planner already has an internal notion of attack context.** `compileAttacks` and
  `compilePitchSearchContext` in `pitch-context.ts` carry `chordPitchClasses` and `isFinal`, and
  pitch figures carry `FigureState` and `FreeObligation` (`pitch-figures.ts`). These are the
  natural places for a boundary state to enter. (inference)

**O10.** Continuation makes planner authority concrete. Two questions arise:

- Can phrase N+1's planners treat phrase N's tail as immovable, which is the only safe reading
  once N is displayed or played?
- Can harmony for N+1 be chosen with the pitch boundary in view without re-coupling the stages?

O10 should be answered before the continuation interface is designed. It does not need to be
answered before v2 is specced.

**Earliest version.** v2 needs the minimal form. v3 needs the full form.

### B. Musical clock and audio scheduler (transport)

**Status (2026-11-24).** Built (v2): the audio transport, the look-ahead scheduler and the worker
wake timer (review evidence B §5.1, §5.2). v4.0 keeps it the only clock (v4 constraint 1). One
change: the session bus must become async-aware, since `import('tone')` is asynchronous and
`openSessionBus` is not ([report §9](v3/structural-review-report.md#9-v40-inputs) item 5).

**What it is.**

- A single time source mapping musical positions (measure, `Rational` offset) to audio-context
  time at a tempo.
- A look-ahead scheduler for backing and click.
- The reference clock against which MIDI input is timestamped.

**Needed by:** backing audio, the rolling display and playhead, the end-of-measure check,
session inactivity timing, adaptive tempo, v4 accompaniment and endgame voices.

**Current state (2026-09-25).**

- There is no audio code. A search of `src/` for `AudioContext`, `Tone`, `requestMIDIAccess`,
  `performance.now` and `setInterval` finds nothing.
- The only animation-frame use is layout scheduling in `src/components/notation/PhraseScore.vue`
  (line 130).
- **Tempo does not reach generation.** `tempo` appears only in `src/domain/controls/`
  (`TEMPO_VALUES` 60–240, `DEFAULT_GENERATION_CONTROLS` 90). The `GenerationRequest` has no
  tempo field.
- **The time model is transport-ready.** `src/domain/time/rational.ts` and `ticks.ts` give exact
  positions, and `timeline.ts` excludes audio scheduling on purpose.

**Earliest version.** v2.

### C. MIDI input layer

**Status (2026-11-24).** Built (v2): `midi/`, 8 files. v4.0 needs nothing new from it: the
system voices answer the generated lead, not the played notes, unless
[O321](../open-questions.md#v40-accompaniment-with-roles-o317) says otherwise.

**What it is.**

- Web MIDI access, and device selection with permission handling.
- Note-on and note-off events normalized to concert MIDI pitch through the instrument's
  transposition.
- Timestamps on clock B.
- Kept behind an **input-source port**, so another input could plug in later. (proposed; the
  microphone it was meant for is out of scope in any version, D554)

**Needed by:** acknowledgement, the chord-fit check, the session start and 30 s timeout,
adaptive tempo, review of played notes and the v3 seed.

**Current state (2026-09-25).**

- There is none.
- Atoms `rule_optional_midi_privacy`, `req_browser_only_first_release` and
  `vision_infinite_flow_first_release` explicitly exclude MIDI from the first release (see §4).

**Earliest version.** v2.

### D. Harmony-facing facts on the result

**Status (2026-11-24).** Built for the backing (v2) and the guides (v3.2): the renderers in
`src/domain/backing/` read the phrase's harmony events, and since v3.3 a harmony event can carry
a seventh. The chord-fit check that also needed D was dropped (D211). v4.0's arranger reads the
same facts plus the lead's notes (§2 K).

**What it is.** Per-measure chord and scale material exposed on the result in a form that
consumers can use without re-running the planner: the backing voicer, the chord-fit check and
future accompaniment.

**Current state (2026-09-25).**

- The timeline's measures already carry a harmonic role and a chord event or sustained-harmony
  marker (atom `entity_concert_event_timeline`).
- `NotationPhraseInput` carries concert `chords` and a `tonalContext` (`written-phrase-types.ts`).
- The planner's per-attack chord-tone fact (`chordTone` in `pitch-validation-types.ts`, used by
  `figure-rules.ts` and `contour-endpoint-rules.ts`) is **internal**. It is not in
  `GenerationResult {requestId, seed, timeline}` (`generation-result.ts`).
- **Inference:**
  - A measure check can be computed from the chord events plus the collection alone.
  - Whether "fits" should also reuse the profile's own figure legality (so the check never
    fails the app's own line) is now settled (D108): yes — the check fires only when the player's
    played notes deviate from the written phrase, never on a measure played exactly as written.

**Earliest version.** v3, as a nice-to-have, not committed scope (D174; it was v2.3 under D104 and
D108). The gap is small and no longer blocked; see
[v2/master-spec.md §9](v2/master-spec.md#9-the-end-of-measure-chord-fit-check).

### E. Session model with phrase history

**Status (2026-11-24).** Built (v2 in memory, v3.0 kept sessions): history stores each phrase's
timeline as well as its reproduction inputs (D88, answering O37).

**What it is.**

- An ordered session record: start and end, the phrases displayed (with the request, seed and
  timeline of each), the played notes, marks, and tempo changes.
- Everything is held in memory in v2.

**Current state (2026-09-25).**

- `GenerationSessionState` in `src/composables/use-generation-session.ts` holds one `result`,
  one `latestIntent` and an `operation` state. There is no history.
- Each result retains its seed (`generation-result.ts`; atom `rule_seeded_phrase_reproduction`).

**Inference: "keeping a history is cheap because each phrase retains its seed" holds only for
standalone phrases.**

- Once phrases continue from their predecessor (A), a phrase is reproducible only from its seed
  **plus** its boundary context **plus** the generator version that produced it (see N).
- Storing the timeline itself is small (4 measures of events) and removes the dependency.
- This matters for v3 persistence more than for the v2 in-memory review.

**Earliest version.** v2.

### F. Persistence port

**Status (2026-11-24).** Built (v3.0): `storage/`, with its codecs and migrations, opt-in played
notes and a schema version.

**What it is.**

- A storage abstraction (local only, per D64 and D69), with an in-memory implementation and a
  browser-storage implementation.
- Opt-in and delete operations for played notes.
- A schema version on everything stored.

**Current state (2026-09-25).**

- There is none. A search of `src/` for `localStorage`, `sessionStorage` and `indexedDB` finds
  nothing.
- This is required by the atom `rule_ephemeral_session_state` (see §4).
- `vite.config.ts` uses `VitePWA`/workbox for asset precaching, which that atom explicitly
  permits.

**Earliest version.** v3.

### G. Music-file serializers

**Status (2026-11-24).** Export is built (v2; the played-notes file since D129). v4.0 widens it:
each system voice needs a place in the exports (§2 K). Import is v5's (the whole-file seed, D553)
and waits on O314 (a); O48 stays open with it.

**What it is.**

- **Export (v2):** MusicXML from the written view, and Standard MIDI File from concert pitch
  plus tempo. Since D129, the played notes are exported as a second Standard MIDI File sharing
  the generated file's tempo map and phrase markers, so the serializer also writes unquantized
  played events.
- **Import (v4 whole-file seed, v5+ library):** parse, then normalize to the event model.

**Current state (2026-09-25).**

- There is none.
- Export is well supported by what exists (inference):
  - `WrittenPhrase` already carries every engraving decision: written pitch, key, spelling,
    chord symbols.
  - Durations are exact `Rational`s on the sixteenth grid.
- Import is the hard direction:
  - Real files contain other meters, tuplets, polyphony and pickups.
  - `parseMeter` accepts only 4/4 (`generation-request.ts`).
  - `validateSixteenthGridAlignment` rejects tuplets and sub-sixteenth values
    (`src/domain/time/grid.ts`). Its own comment says the restriction is policy that "a later
    release can lift … without changing the representation".

**Earliest version.** v2 needs export. v4 needs import.

### H. Open instrument template schema

**Status (2026-11-24).** Built (v1.0, v3.0): profiles carry open transposition data
(`src/domain/profile/instrument-profile.ts`, `transposition-interval.ts`), the three built-ins are
presets, and My instrument is a second source of the same record. No input kind (D554).

**What it is.** Instrument templates as declarative data:

- an identity and a label;
- the concert range and the register-window policy;
- the transposition (chromatic plus diatonic);
- later, the input kind (MIDI or microphone, for D55; the microphone is now out of scope in any
  version, D554).

**Current state (2026-09-25).**

- `InstrumentProfileId = 'c-keyboard' | 'bb-tenor' | 'eb-alto'` is a closed union
  (`src/domain/profile/instrument-profile.ts`). Profiles carry no transposition.
- `NotationMode` is closed (`'Concert' | 'B-flat tenor' | 'E-flat alto'`), and
  `DisplayTransposition` uses literal types `chromatic: 0|9|14`, `diatonic: 0|5|8`
  (`src/domain/notation/notation-mode.ts`).
- `INSTRUMENT_PROFILE_IDS` is a closed frozen array in `generation-controls.ts`.
- **Positive:**
  - `makeInstrumentProfile` validates containment and window intersection.
  - A parser for untrusted profile input already exists (`InstrumentProfileParseError`).
  - That is the right boundary for data-driven templates (v1.0) and a user-authored "my
    instrument" (v3).

**Needed by:** v1.0 (ISS-003), v2 MIDI matching (played pitch ↔ expected pitch through
transposition) and v3 "my instrument" (v5+ microphone input is out of scope in any version, D554).

**Earliest version.** v1.0.

### I. Extensible musical-profile (character) schema

**Status (2026-11-24).** The capability flags are built (`module_musical_profile_capabilities`;
no `profile !== 'Jazz'` check is left in `src/`), and v3.1's presets are records of generation
settings. The character schema beyond that is the game's (D551).

**What it is.** A profile as declarative data that can express more than a bundle of control
values:

- capabilities, for example "chromatic approaches allowed";
- pitch-set restriction and banned pitches;
- ornament and figure preferences with rates (D59 "embellishment at 20%");
- register tendencies;
- a signature motif.

**Current state (2026-09-25).**

- `MUSICAL_PROFILES = ['Neutral', 'Jazz']` is a closed array (`generation-controls.ts`).
- `PROFILE_BUNDLES` (`profile-selection.ts`) holds control values only: harmonic motion,
  density, syncopation, silence, contour, register.
- **Profile behavior inside the planner is keyed on the profile name:**
  - `if (facts.context.policy.profile !== 'Jazz')` in `src/domain/pitch/validation/figure-rules.ts:168`
  - `if (facts.input.policy.profile !== 'Jazz') return []` in `src/domain/pitch/pitch-candidates.ts:172`
  - **Inference:** every new character would add another name check unless these become
    capability flags on the profile.
- Atom `rule_neutral_profile_diatonic_pitches` already reads like a capability (no chromatic
  pitches, no chromatic enclosures). That supports modeling capabilities explicitly.

**Needed by:** v1.0 variety (both presets set it, D59), the v2/v3 embellishment flags, and
endgame characters and "tone deaf" style generation effects.

**Earliest version.** The first step comes in v1.0: variety joins the bundle. The capability
flags are needed by v2/v3.

### J. Ornament and figure vocabulary

**Status (2026-11-24).** v3.1 built seven figures with levels (`src/domain/figures/figure-levels.ts`:
passing tone, accented passing tone, neighbor tone, appoggiatura, diatonic and chromatic
enclosure, chromatic approach). Trill, mordent, turn and grace note are still absent; they are
the game's or a style pack's, not v4.0's.

**What it is.** Named figures the generator can place and the notation can show.

- These exist today: passing, neighbor, appoggiatura, enclosure.
- Missing: trill, mordent, turn, grace note.
- A decision is needed per ornament: an **expanded-events** figure or a **notated symbol**
  (`tr`, `~`) with playback expansion. (inference)

**Current state (2026-09-25).**

- Figures live in `src/domain/pitch/pitch-figures.ts` (`ActiveFigurePath`, `FreeObligation`,
  `FigureState`).
- A search of `src/` found no trill, mordent or grace support.
- `NoteEvent.annotations?: {musical?: string; validation?: string}`
  (`src/domain/events/measure-event.ts`) was added "so those steps can attach annotations
  without a later shape change". It is a free-form string, a weak but existing hook for an
  ornament tag.
- A trill as expanded events would hit the sixteenth-grid policy (G) at fast values.
  (inference)

**Earliest version.** v2/v3, if embellishment flags include ornaments. Endgame otherwise.

### K. Multi-voice representation

**What it is.** A result carrying several voices, each with a role (lead, bass, chords,
highlighting, contrasting, responding), sharing one harmony and one clock.

**Current state (2026-09-25).**

- It is monophonic by construction. `NoteEvent` and `RestEvent` have no voice or channel field
  (`measure-event.ts`).
- The vision atom states "a monophonic musician".
- **Inference: v2 backing does not need K.** Bass and block chords can be rendered on the fly
  from D's per-measure harmony by an audio-side voicer, outside the generation result. This
  keeps the v2 timeline unchanged. D70 describes v2 backing as rudimentary, which supports this.

**Earliest version.** v4.

**Status (2026-11-24): still monophonic, and v4.0 does not need it to stop being so.** Checked on
6d4c33c3:

- The lead is one voice. `ConcertEventTimeline.measures` is a 4-tuple of `Measure`s
  (`src/domain/events/timeline.ts:27-29`), and `NoteEvent`/`RestEvent` carry no voice, channel or
  part field (`measure-event.ts:39-57`). Twelve files outside `src/domain/` read the timeline
  (audio, export, session, storage, Jam, the worker, one workspace file).
- **System voices already live beside the timeline, not in it.** Two pure renderers in
  `src/domain/backing/` turn one phrase into parts: `renderBacking(harmony, meter)` gives
  `RenderedBacking {bass, chords}` (`backing-renderer.ts:270`), and `renderGuide(timeline,
  harmony)` gives `RenderedGuide {melody, rhythm}` (`guide-renderer.ts:143`). Both are lists of
  `{pitch, start, duration}` in whole-note rationals from the phrase's start. They are rendered
  per phrase when the phrase is queued on the transport (`src/audio/transport-session.ts:181-213`),
  routed by sound role (`src/audio/sound-roles.ts:30`) to a mix channel, and never stored: kept
  sessions store the harmony, and the export renders the backing again from it
  (`src/export/generated-notes-file.ts:94-101`).
- That is already a multi-voice representation for system voices, of a narrow kind: fixed pairs,
  no role but the field name, no velocity, no unpitched note, no seeded choice, and only the
  backing reads no lead.

**What v4.0 needs (inference, from the research and the owner's D580).** The player plays the lead
only, so v4.0's several voices are all system voices, and they all follow the one lead. K for
v4.0 is therefore **not** a polyphonic timeline. It is the generalisation of the renderers' output:

1. **The lead stays the monophonic timeline,** unchanged, the authority every system voice reads
   and none may change (the arranger never edits the player's phrase; research
   [accompaniment-systems §8.1](../../docs/music/accompaniment-systems.md#81-recommended-family-role-based-rules-over-style-templates)
   item 3).
2. **A phrase's accompaniment is a list of parts,** one per system voice: its voice id, its
   accompaniment role, and its notes. A part note is today's `{pitch, start, duration}` plus what
   the roles need: a velocity (accents, a doubling softer than the lead), and an unpitched kind
   for drums if [O319](../open-questions.md#v40-accompaniment-with-roles-o317) takes them. Bass,
   chords and the two guides become parts of the same shape, so the transport, the mix and the
   exports handle one kind of thing.
3. **One pure, seeded arranger** on the library side of the line (O), in `src/domain/backing/` or
   a sibling, renders the parts from the phrase's timeline, its harmony and the session's
   accompaniment settings. Its choices draw from new named streams (N: a registry bump), so the
   same phrase and settings always give the same accompaniment.
4. **Still rendered, never stored,** as the backing is today: kept sessions keep the harmony and
   the timeline, plus the accompaniment settings, and the review and the exports render the parts
   again. This holds only while the arranger is the same; since v4.0 is meant to be the last
   update (D552), a version field on the stored settings is enough to detect a change.
5. **No new replay key** if the arranger's inputs stay outside the generation intent: an `ifk5.`
   key encodes the intent only (`phrase-replay-key.ts:4-23`). The accompaniment settings would
   then travel beside the key, not in it. (proposed)

**What it costs, against the 2026-09-25 estimate (L).** M, not L (inference): no change to the
timeline, the generator, the notation or the twelve timeline readers; a new domain module, the
renderers' output widened, the transport's per-phrase queue and the session bus taking parts by
role, the mix taking channels by role (already the §C19.6 design), and the exports given one part
per system voice.

**Two gaps the research's roles hit** (checked 2026-11-24):

- **The next phrase's harmony is not known** when a phrase's backing is queued: phrase N is queued
  at the start of phrase N−1's last measure and N+1 is requested only when N starts sounding
  (`src/session/session-engine.ts:217-234`). A fill or a bass approach that leads into the next
  phrase's first chord needs it. Proposed: v4.0's roles do without it (a fill ends on the phrase's
  own last chord); asking the engine to hold two look-ahead phrases is a larger change.
- **The lead's chord-tone facts are internal to generation** (`pitch-validation-types.ts:63-84`),
  not on the result. The arranger recomputes them from the timeline and the harmony, which is
  cheap and keeps the generator untouched.

### L. Display-state and display-effect layer

**Status (2026-11-24).** The display-state half is built (v2): `notation/note-identity.ts` and
`score-overlay-state.ts`. The display-effect half is the game's. Whether v4.0 draws any system
voice on the score is [O320](../open-questions.md#v40-accompaniment-with-roles-o317); the
proposed answer draws none, so L needs nothing for v4.0.

**What it is.** A deliberate transform stage between the faithful written view and the
engraver.

- **v2 need, found in this analysis:**
  - Acknowledging an expected note, and showing a playhead or scroll, needs a **per-note
    visual state** mapped back to the timeline event it came from.
  - Today no event identity survives the notation pipeline. `written-phrase.ts` indexes
    measures positionally, and the search found no source-event reference on written notes.
    (Checked by searching for `sourceIndex`, `eventIndex` and `sourceEvent`; none found.)
- **Endgame need:** blindness hides or obscures notation, and "pitch scare" presumably alters
  what is shown (undefined, per the endgame doc).

**Current state (2026-09-25).**

- The pipeline is `transformToWrittenPhrase` (`written-phrase.ts`) → `describeWrittenPhrase`
  (`score-description.ts`) → `engraveWrittenPhrase` (`vexflow-engraver.ts`), coordinated by
  `createNotationCoordinator`.
- The endgame doc already points out that `WrittenPhrase` / `ScoreDescription` is the one
  insertion point. (inference, agreed with)

**Earliest version.** v2 needs the display-state half: event identity plus overlays. The
display-effect half comes at the endgame.

### M. Rhythm grammar generalization

**Status (2026-11-24).** Variety replaced Mixed (v1.0, `src/domain/rhythm/rhythm-variety.ts`).
Phrases are still four measures of 4/4 on the sixteenth grid (`PHRASE_MEASURE_COUNT = 4`).
Non-downbeat starts, short phrases and other meters are v5's or the game's. v4.0's system voices
use the same grid and length.

**What it is.** A rhythm grammar that:

- is not keyed on one density (variety, D59);
- has no Mixed (D60);
- allows phrase starts other than the downbeat, for continuation;
- allows lengths other than four bars, for short exchange phrases;
- possibly allows other meters, for imported seeds.

**Current state (2026-09-25).**

- `V1_BEAT_CELL_CATALOGS` in `src/domain/rhythm/rhythm-skeleton.ts` is keyed by
  `Quarter | Eighth | Sixteenth | Mixed`, and `feasibleBar` branches on density.
- Terminals are "version-owned" (comment in `rhythm-skeleton.ts:31`), and the grammar id is
  `rhythm-mvp-v1`.
- `unsupported-rhythm-settings.ts` defines `UNSUPPORTED_RHYTHM_SETTINGS`, and atom
  `rule_unsupported_rhythm_settings_block_generation` governs it.

**Earliest version.** v1.0, as ISS-004's feasibility review.

### N. Generator versioning and stream registry

**Status (2026-11-24).** Met another way: kept sessions store timelines (E), replay keys carry a
version (`ifk1.` to `ifk5.`) and the hash domains end in `/v1` (review evidence A §3.2).
`GenerationResult` itself still carries no version stamp. v4.0's arranger adds named streams, so a
registry version bump, and possibly a replay-key version (§2 K).

**What it is.** A version stamp that says which grammar, stream registry and planner rules
produced a result.

**Current state (2026-09-25).**

- Named streams come from a closed, versioned registry: `STREAM_LABELS`, with
  `STREAM_REGISTRY_VERSION = 1` (`src/domain/random/streams.ts`; atom
  `module_named_stream_pseudorandomness`).
- The rhythm grammar is version-owned (`rhythm-mvp-v1`).
- **`GenerationResult` carries no version** (`generation-result.ts`).
- **Inference:**
  - Every later stage (ornaments, continuation, character rules) will add stream labels or
    grammar changes.
  - A seed stored today will then silently produce a different phrase.
  - That breaks review-from-seed and v3 persisted sessions unless results carry a version
    stamp, or history stores timelines (see E).

**Earliest version.** v2, when history first exists.

### O. The library line

**What it is.** The boundary between the code that will become the shared library (the generator,
the music model, the notation planners: everything the game will need) and this app's own code
(the session, the audio, the screens, the storage). It was missing from the 2026-09-25 list, which
predates the three-way split (D551).

**Status (2026-11-24).** Built and enforced since v3.4 (structural review R1 and R2, D569;
`module_library_code_boundary`, `module_session_code_boundary`): `domain/` and
`generation-worker/` import nothing outside themselves, and `session/` imports only the library.
The split's form is folders now and a new repository for the library and the game at game start
(D573). The contract the split must keep: the hash-domain strings and the `ifk*` replay-key
prefixes are never renamed (review evidence A §3.2).

**Needed by:** every game-side row of §1, and v4.0's arranger, which belongs on the library side
(§2 K).

### Cross-cutting: generation latency budget (v2)

**Status (2026-11-24).** Built (v2): pre-generation keeps the next phrase ready; its worst case
was settled for v2 (one phrase of look-ahead, O36, D72–D108). v4.0's arranger adds work per phrase and must fit the same
budget (§2 K).

- The rolling phrase needs phrase N+1 ready before phrase N ends.
- At the top tempo of 240 BPM, four bars of 4/4 last 4 s.
- Generation runs a bounded window search in a worker (`generation-orchestrator.ts`,
  `window-search.ts`, `search-ledger.ts`).
- **Its worst-case wall time was not measured in this analysis.**
- A generate-ahead buffer, and a policy for a failed or late generation mid-session, are
  prerequisites of v2. (inference)

## 3. Pull-forward recommendations

Revised 2026-11-24. The 2026-09-25 recommendations were for v1.0 and v2, and every one is done or
overtaken: H's template schema, I's capability flags and M's variety (v1.0); N's versioning, L's
event identity and D's harmony facts (v2). The "premature now" list held through v3.4 and is
re-placed below.

- **Urgent, before v4.0's master spec:** K, as §2 K proposes.
- **v4.0, with K:** B's async-aware session bus; G's export of the system voices.
- **Game, not before game start:** I beyond capability flags (characters), J (ornament symbols),
  K beyond v4.0 (voices that trade turns), M's short phrases, L's display-effect half, A's
  exchange form. All of them sit on the library line (O).
- **v5, waiting on O314 (a):** G's import half, A's full form for a file, M's other meters and
  tuplets (O48).
- **Out:** the input kind on templates (D554).

## 4. Constraint conflicts

**Revised 2026-11-24.** The rows below were written on 2026-09-25 for v1.0 to the endgame. The
v1.0 to v3 rows were dealt with when those versions were specced and are not rechecked here (O49
still asks how first-release atoms are amended). The atoms v4.0 must amend are listed after the
table, in [v4.0's rows](#v40s-rows).

Later capabilities would have to amend the following atoms and contract clauses. Each is
checked against the atom's rule text under `docs/`, read-only.

| Atom / clause                                                   | What it says today                                                                                                                                                 | Amended by                                                                                                                                   | Nature                                                                                                                                                                                        |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `req_four_measure_phrase`                                       | One complete four-measure 4/4 phrase; "rather than playback, accompaniment, scoring, or autonomous continuous generation"                                          | v2 rolling phrase, v2 backing; endgame short phrases                                                                                         | Direct contradiction. It must be scoped to v1 or rewritten.                                                                                                                                   |
| `rule_optional_midi_privacy`                                    | "No MIDI controller connection, input, match or mismatch feedback, timing evaluation, MIDI-seeded continuation, scoring, generation change, or phrase advancement" | v2 MIDI and acknowledgement, adaptive tempo (a generation or tempo change driven by input), v3 seed                                          | Direct contradiction for v2. Its privacy intent carries over (D69), and "no scoring" survives in reworded form (D66).                                                                         |
| `req_browser_only_first_release`                                | Excludes MIDI controller connection and input feedback                                                                                                             | v2 MIDI                                                                                                                                      | Partial. The client-side and no-server part stays valid and is reinforced by D69.                                                                                                             |
| `vision_infinite_flow_first_release`                            | A monophonic musician; "rather than a MIDI-input, evaluative" tool; a "non-evaluative" deferred MIDI scope                                                         | v2 (acknowledgement is positive-only, D66); v4 and endgame multiple voices                                                                   | The "non-evaluative" wording vs the D66 "acknowledge, never penalize" principle needs reconciling. "Monophonic player" may still hold; monophonic _output_ does not after v4.                 |
| `rule_ephemeral_session_state`                                  | Never writes or restores user or session state in localStorage, sessionStorage, IndexedDB or user-state cache                                                      | v3 persistence and "my instrument"                                                                                                           | Direct contradiction, intended (v3 README: "deliberately departs"). The asset-precache carve-out stays valid.                                                                                 |
| `rule_phrase_starts_on_downbeat`                                | The phrase never opens with a rest, a pickup or a tie continuation                                                                                                 | v2 continuation (a boundary tie or a rest after a held note); v3 seeds with pickups                                                          | Likely needs a "first phrase of a session" vs "continuation phrase" distinction. (inference)                                                                                                  |
| `rule_open_phrase_ending`                                       | Four-bar phrase ends open; dissonances resolve before the final event                                                                                              | v2 rolling (each phrase end is now an internal seam); endgame exchanges                                                                      | Probably still valid per phrase, but its purpose ("so the player can continue playing") changes meaning when the app continues. (inference)                                                   |
| `entity_concert_event_timeline` plus `timeline.ts` 4-tuple type | Timeline of ordered measures, exactly four by type                                                                                                                 | Endgame short phrases; v4 multi-voice                                                                                                        | Structural. The monophonic event model needs a voice dimension in v4.                                                                                                                         |
| `rule_seeded_phrase_reproduction`                               | Deterministic for "a given complete request and seed"                                                                                                              | v2 continuation (the complete request now includes boundary context); any generator change vs stored seeds (v3)                              | The definition of "complete request" must grow, and a version dimension is needed (N).                                                                                                        |
| `module_named_stream_pseudorandomness`                          | Closed, versioned label registry                                                                                                                                   | Any new generation stage                                                                                                                     | Not a conflict: it is designed for this. Each addition is a registry version bump.                                                                                                            |
| `rule_notation_display_preserves_phrase`                        | Concert, B-flat and E-flat are display modes with fixed transforms; switching modes never changes generated material                                               | v1.0 ISS-003 (the selector is removed, transposition moves to the instrument, and switching instrument regenerates); endgame display effects | Direct amendment in v1.0, already expected (v1 README: "the first-release contract may be amended"). Endgame effects need an explicit "deliberate display effect" exception, not a weakening. |
| `entity_instrument_profile`                                     | "The first-release profiles are C MIDI keyboard 48-72, B-flat tenor 46-70, E-flat alto 51-75"                                                                      | v1.0 open templates; v3 user-defined instrument                                                                                              | The fixed list becomes "shipped presets", and the entity gains a transposition.                                                                                                               |
| `contract_infinite_flow_first_release`                          | Guarantees generated pitches stay inside the selected profile's active range and resolved register; weakening needs a MAJOR bump                                   | v3 user-defined ranges; v2/v3 ornaments (for example a trill's upper note at the range edge); endgame "register spikes"                      | Not necessarily a conflict. Keeping the invariant for user-defined ranges and ornament notes is a design constraint on H, I and J. (inference)                                                |

### v4.0's rows

Checked against the atoms' text on 2026-11-24. Rewording them is `documentalist`'s, from v4.0's
master spec; nothing changes before.

| Atom                                  | What it says today                                                                                                                                                         | Why v4.0 amends it                                                                                                                                      |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `req_session_backing_track`           | Bass and block chords "synthesized … from simple oscillators, with no sample library"; "no accompaniment with musical roles such as harmonizing, responding to or contrasting" | Roles are v4.0's scope (D553). The sound ban becomes recorded samples and audio assets only (owner, 2026-10-11; [sound library survey](../../docs/sound-library-survey.md#open-questions) item 1) |
| `rule_guide_sound_from_oscillators`   | "only from the browser's own oscillators and gains: no sample, no audio file, no new library"                                                                             | A sound library is v4.0's scope; the guides' voices move with it or stay on oscillators ([sound library](v4/sound-library.md))                          |
| `module_guide_playback_layers`        | The seam's four sound roles; "the sounding … turns one note into an oscillator"                                                                                           | The seam widens to the accompaniment's roles; the sounding part is the one the library replaces (D491)                                                 |
| `req_session_audio_mix`               | Eight mix controls: backing, click, melody guide, rhythm guide                                                                                                             | One more channel per system voice, if [O318](../open-questions.md#v40-accompaniment-with-roles-o317) gives each its switch                              |
| `vision_infinite_flow_first_release`  | "a simple, deterministic backing track (bass and block chords)"; its out-of-scope list through v3.4                                                                       | Adds v4.0. "A monophonic musician" still holds: the player plays the lead only (D580)                                                                   |
| `entity_concert_event_timeline`       | Exactly four measures, one voice                                                                                                                                           | Not amended by v4.0: system voices sit beside the timeline (§2 K)                                                                                       |

`verify:boundaries` follows the first row: its rule against `createBufferSource` and
`decodeAudioData` in authored source, and its wording "voices are oscillators and gains only",
are reworded to ban recorded sound and audio assets (`scripts/verify-boundaries.mjs:32-39`,
`:133`).

## 5. Questions (registered in [open questions](../open-questions.md))

The IDs point to the register. Revised 2026-11-24: O34–O38, O43 and O45 were answered for v2
(D72–D108; [v2 archive](../archive/v2/README.md)) and O47 for v3.1 (D216); O33 and O32 earlier, as
marked. O48 and O49 are still open. v4.0's questions are O317–O322.

- **[O34]** **Continuation boundary.** Does v2's rolling phrase need only a boundary state (last chord,
  last pitch, pending figure, tie), or must phrase N+1 see more of phrase N? Is O10 settled
  before or during the v2 spec?
- **[O34]** **Phrase-start rule in continuation.** May a continuation phrase begin with a tie or a rest,
  or is every rolling phrase still a fresh downbeat attack?
- **[O35]** **Seam across phrases.** Is harmony planned phrase by phrase, or does the rolling flow have
  a longer harmonic horizon?
- **[O36]** **Latency budget.** What is the measured worst-case generation time? How far ahead does v2
  generate? What happens if the next phrase is not ready, or generation fails mid-session?
- **[O37]** **History storage.** Does session history store timelines, or seeds plus context plus a
  generator version? This decides whether a version stamp is required from v2.
- **[O38]** **Tempo as a generation input.** Tempo does not reach the generator today. Should it in v2
  (for example, sparser material at high BPM), or does it stay transport-only?
- **[O33 → resolved by D72]** **Transposition at the MIDI boundary.** Do controllers such as the Travel Sax 2 send
  concert or written MIDI note numbers? Should the template carry an input-transposition
  distinct from the display transposition?
- **[O43]** **Event identity.** What stable id links a displayed note, an expected note, a played note
  and a review mark?
- **[O45]** **Backing as a voice or a renderer.** Is v2 backing rendered from harmony outside the
  result (no timeline change), or is it a generated voice (an early step toward K)?
- **[O32 → resolved by D73]** **Profile capabilities.** Should planner behavior be driven by capability flags on the
  profile rather than by profile name, and when (ISS-004 or v2)?
- **[O47]** **Ornament representation.** Is a trill or mordent an expanded event figure or a notated
  symbol with playback expansion? How does it interact with the sixteenth-grid policy and the
  range invariant?
- **[O48]** **Import normalization.** For the whole-file seed, what happens to non-4/4 meters, tuplets,
  pickups and polyphony: reject, normalize, or lift the grid and meter policy?
- **[O49]** **Atom lifecycle.** Are the first-release atoms listed in §4 amended in place, or scoped to
  "first release" with new v2 atoms beside them?
