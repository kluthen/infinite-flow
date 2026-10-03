# Prerequisites — Building Blocks Later Versions Need

Status: draft v0.1 (2026-09-25; the chord-fit check's placement updated 2026-10-03, D174). Preliminary analysis, not a decision document.

The user asked for "preliminary work of seeking what's necessary to build prior some items
proposed for later version to occur". This document maps each planned capability (v1.0 through
the [endgame](../vision/endgame.md)) to the **foundations** it rests on. It checks what exists in
`src/` today and proposes which foundations are cheap to prepare early and which would be
premature.

Reading rules:

- Statements about the code cite a file and were checked by reading it on 2026-09-25.
- Anything not directly checked is tagged **(inference)**.
- Gap sizes (S/M/L) are **estimates (inference)**, not effort commitments:
  - S = a local change to one module.
  - M = a new module, or a change crossing a few modules.
  - L = a new subsystem, or an architectural change touching the generator contract.
- Foundation letters (A–N) are local labels for this document only. They are not open-question
  IDs. Questions are listed unnumbered at the end, for the owner of the register to number.
- Decision numbers (Dnn) refer to the
  [2026-09-25 archive](../archive/2026-09-25-personas-and-vision/decisions-D47-D71.md). O10 refers to the
  [register](../open-questions.md); O24 is resolved (D108) — see
  [v2/master-spec.md §9](v2/master-spec.md#9-the-end-of-measure-chord-fit-check).

## 1. Dependency map

| Capability                                                                                                 | Version | Depends on foundations                                | Exists today                                                                                    | Gap                                        |
| ---------------------------------------------------------------------------------------------------------- | ------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Open instrument templates, transposition as data (D56, D57)                                                | v1.0    | H                                                     | Partly: profile parser exists; ids, notation modes and transpositions are closed literal unions | M                                          |
| Rhythmic variety, Mixed retired (D59, D60)                                                                 | v1.0    | M, I                                                  | Partly: density-keyed cell catalogs; variety concept absent                                     | M (pending the ISS-004 feasibility review) |
| Rolling phrase continuing its own output (D51, D65)                                                        | v2      | A, B, E, N, plus a latency budget                     | No: fixed four-measure one-shot generation, no prior-context input                              | L                                          |
| MIDI input, expected-note acknowledgement (D52)                                                            | v2      | C, B, H, L                                            | No MIDI code; no event identity through notation                                                | M–L                                        |
| End-of-measure chord-fit check (D108; a v3 nice-to-have since D174, not v2)                                | v3      | C, D, B                                               | Partly: chord events per measure and an internal chord-tone fact exist                          | S–M, now that D108 has settled the rule    |
| Backing audio: bass, block chords, click (D63, D70)                                                        | v2      | B, D                                                  | No audio code at all                                                                            | M–L                                        |
| Session model, last-session review (D62, D67)                                                              | v2      | E, C, N                                               | No: the session holds one result, no history                                                    | M                                          |
| MusicXML / MIDI export (D62, D67)                                                                          | v2      | G, E                                                  | No                                                                                              | M                                          |
| Adaptive tempo, opt-in (D66, D101)                                                                         | v2      | B, C, D, E                                            | No (flat schedule, D101; no longer depends on the chord-fit check)                              | S once B–E exist                           |
| Played-note privacy (D69)                                                                                  | v2      | E (in memory), G (export choice)                      | Trivially satisfied today: nothing is played or stored                                          | S                                          |
| Embellishment and style flags (D59)                                                                        | v2/v3   | I, J, M                                               | Partly: appoggiatura, enclosure, passing and neighbor figures exist; no trill/mordent/grace     | M–L                                        |
| MIDI-seeded continuation (D53)                                                                             | v3      | A (full form), C, O10                                 | No                                                                                              | L                                          |
| "My instrument" configuration (D55)                                                                        | v3      | H, F                                                  | Partly: the profile parser is a usable validation boundary                                      | S–M after H                                |
| Local persistence (D55)                                                                                    | v3      | F, N                                                  | No, and forbidden in v1 by an atom (see §4)                                                     | M                                          |
| Earlier-session review                                                                                     | v3      | E, F, N                                               | No                                                                                              | M                                          |
| Accompaniment with roles (D70)                                                                             | v4      | K, B, A, D                                            | No: the timeline is monophonic                                                                  | L                                          |
| Whole-file seed import (D65)                                                                               | v4      | G (import), A, M                                      | No: 4/4-only meter, sixteenth-grid-only time policy                                             | L                                          |
| Library, snippet as seed (D65, D68)                                                                        | v5+     | G, F, A, E                                            | No                                                                                              | L                                          |
| Microphone input (D55)                                                                                     | v5+     | C generalized to an input-source port, H (input kind) | No                                                                                              | L                                          |
| Character presets: scale restriction, banned pitches, ornament preferences, gimmicks, register personality | Endgame | I, J, M, A                                            | Partly: control bundles only                                                                    | L                                          |
| Multiple system voices                                                                                     | Endgame | K, B                                                  | No                                                                                              | L                                          |
| Turn-based phrase exchanges                                                                                | Endgame | A, K, M (short phrases)                               | No: phrase length is fixed at 4                                                                 | L                                          |
| Status effects: blindness, tone deaf, pitch scare                                                          | Endgame | L (display-effect layer), I                           | Partly: one clean insertion point (WrittenPhrase) exists                                        | M                                          |

## 2. Foundations

### A. Continuation-capable generation contract

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

**Current state.**

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

**What it is.**

- A single time source mapping musical positions (measure, `Rational` offset) to audio-context
  time at a tempo.
- A look-ahead scheduler for backing and click.
- The reference clock against which MIDI input is timestamped.

**Needed by:** backing audio, the rolling display and playhead, the end-of-measure check,
session inactivity timing, adaptive tempo, v4 accompaniment and endgame voices.

**Current state.**

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

**What it is.**

- Web MIDI access, and device selection with permission handling.
- Note-on and note-off events normalized to concert MIDI pitch through the instrument's
  transposition.
- Timestamps on clock B.
- Kept behind an **input-source port**, so the microphone (v5+) can plug in later. (proposed)

**Needed by:** acknowledgement, the chord-fit check, the session start and 30 s timeout,
adaptive tempo, review of played notes and the v3 seed.

**Current state.**

- There is none.
- Atoms `rule_optional_midi_privacy`, `req_browser_only_first_release` and
  `vision_infinite_flow_first_release` explicitly exclude MIDI from the first release (see §4).

**Earliest version.** v2.

### D. Harmony-facing facts on the result

**What it is.** Per-measure chord and scale material exposed on the result in a form that
consumers can use without re-running the planner: the backing voicer, the chord-fit check and
future accompaniment.

**Current state.**

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

**What it is.**

- An ordered session record: start and end, the phrases displayed (with the request, seed and
  timeline of each), the played notes, marks, and tempo changes.
- Everything is held in memory in v2.

**Current state.**

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

**What it is.**

- A storage abstraction (local only, per D64 and D69), with an in-memory implementation and a
  browser-storage implementation.
- Opt-in and delete operations for played notes.
- A schema version on everything stored.

**Current state.**

- There is none. A search of `src/` for `localStorage`, `sessionStorage` and `indexedDB` finds
  nothing.
- This is required by the atom `rule_ephemeral_session_state` (see §4).
- `vite.config.ts` uses `VitePWA`/workbox for asset precaching, which that atom explicitly
  permits.

**Earliest version.** v3.

### G. Music-file serializers

**What it is.**

- **Export (v2):** MusicXML from the written view, and Standard MIDI File from concert pitch
  plus tempo. Since D129, the played notes are exported as a second Standard MIDI File sharing
  the generated file's tempo map and phrase markers, so the serializer also writes unquantized
  played events.
- **Import (v4 whole-file seed, v5+ library):** parse, then normalize to the event model.

**Current state.**

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

**What it is.** Instrument templates as declarative data:

- an identity and a label;
- the concert range and the register-window policy;
- the transposition (chromatic plus diatonic);
- later, the input kind (MIDI or microphone, for D55).

**Current state.**

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
transposition), v3 "my instrument", and v5+ microphone input.

**Earliest version.** v1.0.

### I. Extensible musical-profile (character) schema

**What it is.** A profile as declarative data that can express more than a bundle of control
values:

- capabilities, for example "chromatic approaches allowed";
- pitch-set restriction and banned pitches;
- ornament and figure preferences with rates (D59 "embellishment at 20%");
- register tendencies;
- a signature motif.

**Current state.**

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

**What it is.** Named figures the generator can place and the notation can show.

- These exist today: passing, neighbor, appoggiatura, enclosure.
- Missing: trill, mordent, turn, grace note.
- A decision is needed per ornament: an **expanded-events** figure or a **notated symbol**
  (`tr`, `~`) with playback expansion. (inference)

**Current state.**

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

**Current state.**

- It is monophonic by construction. `NoteEvent` and `RestEvent` have no voice or channel field
  (`measure-event.ts`).
- The vision atom states "a monophonic musician".
- **Inference: v2 backing does not need K.** Bass and block chords can be rendered on the fly
  from D's per-measure harmony by an audio-side voicer, outside the generation result. This
  keeps the v2 timeline unchanged. D70 describes v2 backing as rudimentary, which supports this.

**Earliest version.** v4.

### L. Display-state and display-effect layer

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

**Current state.**

- The pipeline is `transformToWrittenPhrase` (`written-phrase.ts`) → `describeWrittenPhrase`
  (`score-description.ts`) → `engraveWrittenPhrase` (`vexflow-engraver.ts`), coordinated by
  `createNotationCoordinator`.
- The endgame doc already points out that `WrittenPhrase` / `ScoreDescription` is the one
  insertion point. (inference, agreed with)

**Earliest version.** v2 needs the display-state half: event identity plus overlays. The
display-effect half comes at the endgame.

### M. Rhythm grammar generalization

**What it is.** A rhythm grammar that:

- is not keyed on one density (variety, D59);
- has no Mixed (D60);
- allows phrase starts other than the downbeat, for continuation;
- allows lengths other than four bars, for short exchange phrases;
- possibly allows other meters, for imported seeds.

**Current state.**

- `V1_BEAT_CELL_CATALOGS` in `src/domain/rhythm/rhythm-skeleton.ts` is keyed by
  `Quarter | Eighth | Sixteenth | Mixed`, and `feasibleBar` branches on density.
- Terminals are "version-owned" (comment in `rhythm-skeleton.ts:31`), and the grammar id is
  `rhythm-mvp-v1`.
- `unsupported-rhythm-settings.ts` defines `UNSUPPORTED_RHYTHM_SETTINGS`, and atom
  `rule_unsupported_rhythm_settings_block_generation` governs it.

**Earliest version.** v1.0, as ISS-004's feasibility review.

### N. Generator versioning and stream registry

**What it is.** A version stamp that says which grammar, stream registry and planner rules
produced a result.

**Current state.**

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

### Cross-cutting: generation latency budget (v2)

- The rolling phrase needs phrase N+1 ready before phrase N ends.
- At the top tempo of 240 BPM, four bars of 4/4 last 4 s.
- Generation runs a bounded window search in a worker (`generation-orchestrator.ts`,
  `window-search.ts`, `search-ledger.ts`).
- **Its worst-case wall time was not measured in this analysis.**
- A generate-ahead buffer, and a policy for a failed or late generation mid-session, are
  prerequisites of v2. (inference)

## 3. Pull-forward recommendations

### Cheap now, recommended while doing v1.0 work that touches the same code (inference, for the user to confirm)

1. **Design ISS-003's template schema for v3 from the start (H).** Make the template one
   validated data record parsed through the existing `InstrumentProfileParseError` boundary.
   - It should carry transposition as plain numbers, not literal unions.
   - It should carry a schema version.
   - Then "my instrument" (v3) is only a new source of the same record.
   - Do **not** add input-kind or microphone fields yet (premature, see below).
2. **When ISS-004 adds variety to the profile bundles, keep the bundle a declarative record
   (I).**
   - Replacing the two `profile !== 'Jazz'` checks with named capability flags is small and
     local, and it removes the pattern characters would otherwise multiply.
   - Borderline: it touches planner files that ISS-004 may not otherwise touch. The user
     decides whether it rides with ISS-004 or waits for v2.
3. **Make ISS-004's feasibility review also look at continuation (M, A).** The review can
   record, without implementing, whether the reworked grammar could later accept a non-downbeat
   start and a boundary tie. Asking now costs a paragraph. Discovering it in v2 costs a second
   grammar rework.

### Cheap, but belongs at the start of v2, not in v1.0

4. **A version stamp on `GenerationResult` (N)**, before any history exists.
5. **Stable event identity through the notation pipeline (L).** This is a prerequisite of
   acknowledgement highlighting and of review marks.
6. **Expose the per-measure harmony facts (D)** for consumers, now that D108 has settled the
   chord-fit rule.

### Premature now: do not pull forward

- **Persistence (F).** An atom forbids it for the first release, and nothing needs it before
  v3.
  - At most, v2 can put its in-memory session store behind an interface. (proposed)
- **Multi-voice timeline (K).** v2 backing can be derived from harmony without it, and v4
  roles are undefined.
- **Ornament vocabulary (J) and character schema beyond capability flags (I).** Their shape
  depends on the unresolved embellishment-flags question and on the endgame, which has no
  scope yet.
- **File import (G, import half), other meters and tuplets.** These are v4+, and they require
  lifting grid and meter policy.
- **The continuation interface itself (A).** It should wait for O10 and the v2 spec. Only the
  cheap question in item 3 is worth asking early.
- **The display-effect half of L.** It is endgame-only.
- **Input-kind or microphone abstraction on templates.** It is v5+. The v2 MIDI layer should
  still sit behind a port (C), which costs nothing extra.

## 4. Constraint conflicts

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

## 5. Questions (registered in [open questions](../open-questions.md))

The IDs point to the register.

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
