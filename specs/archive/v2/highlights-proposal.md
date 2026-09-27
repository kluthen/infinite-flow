# v2 Highlights — Draft Proposal

> **Archived 2026-09-27.** The original 2026-09-26 highlights/cut-line proposal that opened the v2
> conversation. Superseded by [versions/v2/master-spec.md](../../versions/v2/master-spec.md).

Status: draft v0.1. For the user to react to. Anything the user hasn't settled is tagged `(proposed)`. Settled inputs cite their decision IDs.

Topic documents (draft v0.1, 2026-09-26) develop this proposal: [rolling phrase](rolling-phrase.md), [audio and backing](audio-and-backing.md), [MIDI and acknowledgement](midi-and-acknowledgement.md), [sessions, review and export](sessions-review-export.md), [adaptive tempo](adaptive-tempo.md), [definition of done](definition-of-done.md) and [questions for the user](questions-for-user.md).

## 1. Headline

v2 turns Infinite Flow from a phrase you _look at_ into a phrase you _play along with_.

- **Press Start, or just start playing on your MIDI controller.** Phrases keep arriving on a rolling staff, over a simple bass-and-chords backing, at your tempo.
- **The app quietly acknowledges the notes you get right,** and never flags the ones you miss.
- **The phrase keeps flowing when you stop to breathe.**
- **When you stop, you can look back over the session,** keep the bits you liked, and export them as MusicXML or MIDI.

v2 is still a practice partner, not a judge (D66).

## 2. Session walk-through

**P1 — The Curious Improviser (tenor sax / Travel Sax 2)**

1. P1 picks their instrument, key and feel, as in v1. The key is in written pitch (D56).
2. They play a first note on the Travel Sax. That starts the session (D62). A one-bar count-in could come first `(proposed)`.
3. The backing starts: bass, block chords and an optional click (D70). The first phrase is on the staff with a playhead. The next phrase is already generated.
4. P1 plays along. Right notes get a quiet acknowledgement on the staff (D52). P1 embellishes a bit in bar 3, and nothing complains.
5. P1 loses track and stops. The staff keeps scrolling and the backing keeps going (D67). P1 re-enters two phrases later.
6. After more than 30 s without input, the session ends on its own (D62).
7. On the review screen, P1 scrolls back through every phrase shown. They star the gimmick from phrase 7 and export it as MusicXML.

**P2 — The Speed Builder (MIDI keyboard, concert pitch)**

- P2 starts with the button and sets the tempo.
- They tick "adaptive tempo" (D66, if included). The tempo creeps up while they keep matching notes.
- The rolling staff is the whole point for P2: fresh material they can't memorize (D59: rhythmic variety).

**P3 — The Fledgling Composer**

- P3 mostly cares about the end: review, star and export.
- If they opt in, the review also shows what they played. That stays local, and is included in an export only if they choose it (D69).

## 3. Highlights, ranked

**Must**

| #   | Highlight                                                                                                                        | Value                                    | Personas | Status                                                                                                                                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| M1  | **Flow mode:** a rolling phrase with a tempo clock and a playhead                                                                | Reading in real time, with mild pressure | P1, P2   | Settled (D51)                                                                                                                                    |
| M2  | **Backing playback:** bass and block chords, an optional click, mute/volume; plays during the session and through silences       | Something to play _with_; sets the beat  | P1, P2   | Settled (D63, D70)                                                                                                                               |
| M3  | **Sessions:** Start/Stop, the first MIDI note starts a session, 30 s of MIDI silence ends it, and without MIDI only Stop ends it | Clear frame for flow and for review      | all      | Settled (D62, D67)                                                                                                                               |
| M4  | **MIDI connection and expected-note acknowledgement**                                                                            | Positive signal, no penalty              | P1, P2   | Settled (D52)                                                                                                                                    |
| M5  | **Seamless phrase joins:** the next phrase continues from the last pitch and register of the previous one                        | Sounds like one line, not stitched bars  | P1, P2   | `(proposed)`, see §5.1                                                                                                                           |
| M6  | **MIDI input transposition on the instrument template,** so a Travel Sax 2 sending written or concert pitch is read correctly    | Acknowledgement works on the test rig    | P1       | Superseded by D72; see [controller check](midi-and-acknowledgement.md#4-a-silent-failure-to-design-out-controller-vs-template-transposition-o55) |
| M7  | **Last-session review of the phrases shown, with favorites**                                                                     | Keep what you liked                      | P3, P1   | Settled (D62)                                                                                                                                    |
| M8  | **MusicXML and MIDI export** of the session or the favorites                                                                     | Take ideas to other tools                | P3       | Formats settled (D62); timing in v2 `(proposed)`                                                                                                 |

**Should**

| #   | Highlight                                                                                          | Value                                   | Personas | Status                            |
| --- | -------------------------------------------------------------------------------------------------- | --------------------------------------- | -------- | --------------------------------- |
| S1  | **End-of-measure chord-fit acknowledgement**                                                       | Rewards embellishment and improvisation | P1       | Settled (D52), **blocked on O24** |
| S2  | **Played notes in the review:** in memory only, and exported only if the player explicitly chooses | See what you actually played            | P3, P1   | Settled (D64, D69)                |
| S3  | **Control changes during a session apply at the next phrase boundary**                             | Adjust without stopping                 | P1, P2   | `(proposed)`                      |

**Nice**

| #   | Highlight                                                                             | Value                  | Personas | Status                    |
| --- | ------------------------------------------------------------------------------------- | ---------------------- | -------- | ------------------------- |
| N1  | **Adaptive tempo,** as an opt-in checkbox                                             | Gradual BPM gain       | P2       | Settled as opt-in (D66)   |
| N2  | **Embellishment flags,** for example trills and approach figures                      | More vocabulary        | P1       | Direction (D59): v2 or v3 |
| N3  | **Multi-phrase arc:** tension shaped across 8 or 16 bars instead of repeating every 4 | Flow feels less cyclic | P1       | `(proposed)`              |
| N4  | **Count-in before the first phrase**                                                  | Easier entry           | all      | `(proposed)`              |

## 4. Proposed cut line (superseded)

This section is the original 2026-09-26 proposal, kept for history. The authoritative cut line is
now [definition-of-done.md §1](definition-of-done.md), settled D104/D107/D108: v2.0 is the full
core loop (M1–M8, S3); v2.1 is S2 and the settings-mutation flag; v2.2 is adaptive tempo (N1) and
the multi-phrase arc (N3); v2.3 is the chord-fit check (S1), split out on its own once O24 was
resolved rather than shipping alongside S2 in v2.1 as first proposed here.

- **v2.0:** M1–M8. This delivers the core loop: flow, backing, MIDI acknowledgement, review and export.
- **v2.1 (superseded, see above):** S1 and S2, once O24 is defined and the privacy UI for played notes is designed. S3 goes in here too if it is not trivial in v2.0.
- **v2.2 and later:** N1–N4.
- **Alternative, leaner cut:** ship v2.0 without MIDI (M4, M6), as "flow, backing, review", and add MIDI in v2.1. This lowers risk, because audio and the rolling display are new ground. But it delays the feature the product owner tests with.

## 5. Key design tensions and risks, grounded in the code

### 5.1 Continuous generation: latency is fine, continuity is the real gap

- **Latency is not the problem.**
  - Measured in Chromium, end to end including Worker, validation and engraving: warm regeneration takes about 70–86 ms, and the worst cold case about 320 ms (`docs/generation-latency.md`). In Node, the slowest cold setting is 741–768 ms. That setting uses **Mixed**, which v1.0 retires (D60).
  - A four-bar phrase lasts 4 s at 240 BPM and 16 s at 60 BPM.
  - So "generate phrase N+1 when phrase N starts" has 5–20× headroom, even cold.
- **Continuity is the problem.**
  - The request is structurally closed. `GenerationRequest` carries only identity, seed, the four measures and 4/4. `parseGenerationRequest` rejects unknown fields (`src/domain/generation/generation-request.ts`).
  - No planner receives the previous phrase. The architecture already names the missing input: the "(proposed) recent phrase when available", and the **phrase transformer** seam (`specs/generator-architecture.md`).
  - Without it, each join can leap arbitrarily, which bypasses the leapiness and leap-recovery rules.
  - A `Varying` register (`src/domain/profile/`) is resolved per phrase, so the register can also jump at every join.
- **Proposal: forward-only carry-in context** `(proposed)`.
  - It carries the previous phrase's last sounding concert pitch, its resolved register window and its final harmony, as read-only data.
  - It goes into the request as a deliberate, versioned contract change.
  - The pitch search treats it as the "previous note" for the first attack.
  - It only flows forward, and no stage revises an earlier one, so **it does not trigger O10** (planner authority).
- **Harmony already chains well.** Every phrase ends open on a degree-5 endpoint (`HarmonyEndpoint`, `src/domain/harmony/harmony-types.ts`, and D28). A new phrase opening on the tonic reads as a resolution.
- **But the arc repeats.** The tension arc repeats every four bars, which may feel cyclic over a long session. That is why N3 exists.
- **Four measures are fixed in the types.** The phrase size is set by `measureCount: 4`, `PHRASE_MEASURE_COUNT` (`src/domain/events/timeline.ts`, `generation-request.ts`), `barIndex: 0|1|2|3` in the harmony types, and the layout (`src/notation/notation-layout-policy.ts`).
  - **Recommendation:** keep the four-bar phrase as the generation unit and chain phrases. Do not widen the timeline type.

### 5.2 Determinism and seeds across a stream

- Each phrase keeps its own `Seed` and intent. The same request reproduces the same phrase.
- The named-stream registry is closed and versioned (`specs/generator-contract.md` §Seed Semantics). A stream does not need a new stream label.
- **Proposal** `(proposed)`: each phrase draws a fresh seed from the existing injected provider. The session history stores, per phrase: intent, seed and carry-in.
  - Any phrase is reproducible by itself.
  - The whole session can be replayed from the history.
  - The review and export read from the same history, so no second record is needed.
- The session composable enforces one operation at a time and suppresses control edits while generating (`src/composables/use-generation-session.ts`; contract §Session Ownership).
  - Flow mode needs a different session state machine: a lookahead queue, control edits deferred to the next phrase boundary (S3), and no modal "Phrase ready" cycle.
- **A generation failure mid-stream can't block the flow.** Today a failure surfaces an alert and a retry (`src/composables/generation-failure-alert.ts`).
  - **Proposal** `(proposed)`: silent auto-retry with a fresh seed, using the lookahead headroom.
  - As a last resort, repeat the previous phrase.

### 5.3 Audio clock and MIDI timestamps

- **Nothing audio or MIDI exists in `src/` today.** The contract deliberately excludes "audio scheduling timestamps" from results, which is good: the backing arranger (contract §Stage Ownership) and the scheduler derive times from exact `Rational` durations and BPM.
- **Tempo is not read by any planner.** It appears only in the control modules, so adaptive tempo (N1) is purely a clock concern and never touches generation.
- **Proposal** `(proposed)`:
  - The **Web Audio clock is the master clock**. Look-ahead scheduling drives the backing, the playhead and the scroll.
  - Web MIDI event timestamps use the `performance.now()` timebase. They are mapped onto audio time, for example via `AudioContext.getOutputTimestamp()`, and compensated for output latency.
  - v1 is Chromium-only, which conveniently matches Web MIDI support.
- **Travel Sax 2 over Bluetooth MIDI adds latency and jitter.** The acknowledgement window must be tuned on the real device, not assumed.
- **Sound source is still undecided:** oscillator synthesis or a sampled soundfont. This affects bundle size, the offline precache (`docs/release/browser-and-offline-limits.md`) and third-party licensing.

### 5.4 The rolling notation display

- The v1 engraver lays out exactly one four-bar phrase: one system, or two systems of two bars on landscape phones (D46; `src/notation/notation-layout-policy.ts`, `vexflow-two-system-engraver.ts`). Each measure is a strict 4/4 `Voice` (`vexflow-engraver.ts`).
- Re-engraving is cheap enough to do per phrase or even per bar (§5.1 figures).
- **Proposal for v2.0** `(proposed)`: a phrase conveyor.
  - The current phrase is shown with the playhead, and the next phrase as a preview.
  - The display advances one phrase at a time.
  - Smooth per-measure scrolling is a v2.x refinement.
- **Tension:** on landscape phones one phrase already needs two systems, so there may be no room for a preview there.

### 5.5 Chord-fit acknowledgement depends on O24

- The "measure's chord" is not always one chord: `HarmonyEvent.startBeat` is `0 | 2`, so a bar can hold two chords (`src/domain/harmony/harmony-types.ts`).
- The generated line itself uses scale passing tones, and in jazz, chromatic approaches.
- So S1 cannot be specified until O24 decides both **what counts as fitting** and **the unit of the check** (bar or half-bar).
- The data is available: harmony travels as `GenerationProvenance` beside the result.

### 5.6 Privacy

- The current rule (`docs/rule_optional_midi_privacy.atom.md`) is written for v1: no MIDI at all. v2 needs a rewritten rule that follows D64 and D69:
  - played notes stay local;
  - they are held in memory for the last-session review;
  - they are exported only by explicit choice.
- **Suggested test:** no network request ever carries played-note data. With the app's no-server design (`req_browser_only_first_release`) this is cheap to assert.
- Open: D22 (archived) hid the played pitch. With the mismatch hint gone (D52), does the live view still never show the played pitch? (See §7.)

### 5.7 Dependency on ISS-003 and D57

- **MIDI comparison happens in concert pitch** (the timeline is concert). A wind controller may transmit written or concert pitch depending on its own settings.
- The instrument template that D57 introduces is the natural home for a **MIDI input transposition** field, next to the display transposition.
- **ISS-003 should land with transposition as open data first.** Otherwise v2 builds on the closed `NotationMode` union (`src/domain/notation/notation-mode.ts`).
- **Export reuses the v1 written-pitch path.** MusicXML needs written pitch, spelling and key, which the notation domain already derives (`src/domain/notation/pitch-spelling.ts`). MIDI export uses concert pitch.

## 6. Candidate v2 definition of done `(proposed)`

1. **No gaps between phrases.** In flow mode, at every supported BPM (60–240) and for every supported setting in the seed × settings matrix, the next phrase is generated and engraved before the current one ends.
2. **Joins obey the phrase rules.** The interval across a phrase join follows the same leapiness and leap-recovery rules as intervals inside a phrase. The register window does not jump at a join unless `Varying` explicitly allows it.
3. **The backing is in pitch and on the beat.** Its pitch classes match each harmony event's triad, and it sounds on the beat.
4. **The clock stays in sync.** Playhead drift against the audio clock stays under a threshold, measured and signed off like the latency budget.
5. **Session boundaries behave exactly as in D62 and D67.** v1-blocked rhythm settings cannot start a session.
6. **Acknowledgement is positive-only.**
   - A correct pitch played within the note's acknowledgement window is acknowledged.
   - A wrong or missing note produces no negative signal of any kind (D66).
   - The window is tuned and documented on the Travel Sax 2 and at least one USB keyboard.
7. **Review and export work in real tools.**
   - The review lists every phrase shown in the last session, in order, and favorites can be marked.
   - MusicXML export opens in MuseScore with the correct written pitches, key and chord symbols.
   - MIDI export contains concert pitches at the session tempo.
8. **Privacy holds.**
   - No network request carries played-note data.
   - Played notes are gone after the page closes.
   - An export includes them only by explicit choice.
9. **Every phrase in the history is reproducible** from its stored intent, seed and carry-in.
10. **v1 guarantees still hold:** the instrument range contract, and offline use after the first load, including any audio assets.

## 7. Questions (registered in [open questions](../../open-questions.md))

- **[O39]** When the player changes a control mid-session, does it apply at the next phrase boundary (S3), or is changing controls only allowed between sessions?
- **[O40]** Should the next phrase be visible as a preview? And what happens on landscape phones, where one phrase already takes two systems?
- **[O40]** Should the display advance a phrase at a time or scroll per measure?
- **[O41]** What exactly is the acknowledgement window for an expected note: during its written duration only, or with a grace period? Octave-exact or pitch class? What happens on tied notes?
- **[O42]** With the mismatch hint gone, does the live view still never show the played pitch (archived D22)?
- **[O44]** Should there be a count-in before the first phrase? How does that fit "the first MIDI note starts the session"?
- **[O36]** Should a mid-stream generation failure silently retry with a fresh seed, and repeat the previous phrase as a last resort?
- **[O35]** Should the tension arc stay per four-bar phrase in flow mode, or should flow get a longer, multi-phrase arc (N3)?
- **[O24]** For the chord-fit check (O24), is the unit the bar or the half-bar, given that bars can hold two chords?
- **[O33 → resolved by D72]** Does the Travel Sax 2 transmit concert or transposed pitch in your setup? Is a MIDI input transposition on the instrument template acceptable for v2, ahead of v3's "my instrument"?
- **[O45]** Synthesized or sampled backing sound, given the bundle-size, offline and licensing trade-offs?
- **[O41]** If a keyboard player plays a chord, is the matching note in it acknowledged? The product assumes a monophonic player.
- **[O46]** Should export in v2 cover whole sessions, favorites only, or both?
