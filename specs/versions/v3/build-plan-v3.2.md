# Infinite Flow v3.2 — Build Plan

Status: v3 (2026-10-16): migrated to the build-plan model and waves re-formed (spec D350); not
approved. **Stale, not to be built from (spec D405):** v3.2 was re-scoped around Jam as its own
mode (spec D400–D408, [jam-mode.md](jam-mode.md)) and consolidated into
[master spec Part C v1.1](master-spec.md#part-c--v32) (spec D409, awaiting the owner's approval);
this plan still describes v1.0's Jam switch. It is rewritten from Part C v1.1 as plan v4 once the
v3.2 design is approved (gate D0). The corrections against v3.1 found on 2026-10-21 are listed in
[jam-mode.md §6](jam-mode.md#6-blast-radius) and apply at that rewrite; only "nine modes" is
corrected here ahead of it.

Jam, the key and mode suggestion, the rhythm lock, Jam's drift and Vary settings' allowed groups,
written from [master spec Part C](master-spec.md#part-c--v32) (v1.0, approved 2026-10-08, with spec
D240–D249 and D251 written in) and the v3.2 design at the root of
[`ui_ux/`](../../../ui_ux/README.md) (awaiting the owner's approval: gate D0): everything marked
`[v3.2 new]`, `[v3.2 changed]` or with a `_v3.2 …:_` change-block line. Code facts:
[jam-grounding.md](jam-grounding.md), [rhythm-lock.md](rhythm-lock.md),
[key-and-mode-suggestion.md](key-and-mode-suggestion.md) and [jam.md](jam.md), checked against
`main` (c65152b) on 2026-10-08. The plan follows the build-plan model
(`~/.local/share/dev_team/references/build-plan-model.md`) through the project's
[build workflow](build-workflow.md). Music terms: the [lexicon](../../../docs/music/lexicon.md).

**v3.2 is built on v3.0 and v3.1**: every chunk of the [v3.0](build-plan.md) and
[v3.1](build-plan-v3.1.md) build plans merged and v3.1's release gate passed (gate R0). This plan
names their modules as those plans do ("v3.0 chunk _n_", "v3.1 chunk _n_"); where one of them
landed a module elsewhere, or code has moved since c65152b, the wave preflight follows the code.

## Read first: what v3.2 changes in v2, v3.0 and v3.1

> With Jam off, the rhythm lock off and all six allowed groups on (the defaults), v3.2 must
> generate exactly what v3.1 generates, note for note, and Vary settings must draw exactly what it
> draws. Two corpora recorded on v3.1 before any change
> ([chunk 2](#chunk-2--baselines-the-v31-corpus-the-vary-settings-draws-and-the-bundle)) guard
> every generator and session chunk. And for the first time a session starts with no phrase on
> screen: the session engine learns a capture, a deadline counted from the generation measure, and
> a ladder of its own for phrase 1.

[C13](master-spec.md#c13-what-v32-changes-in-v2-v30-and-v31-guarantees-and-atoms) lists what v3.2
changes on purpose. Each enforcement point changes in exactly one chunk, never "along the way".
Test titles are as on `main` (c65152b) or as the v3.0 and v3.1 plans name them; those plans may
move their lines, so a chunk finds each one by its title. Unlike v3.1, most of v3.2 adds a mode
beside v2's behaviour rather than replacing it: a v2 test that describes a session outside a Jam
stays as it is, and the chunk adds the Jam variant beside it.

| What holds today | Changed in | Becomes |
| --- | --- | --- |
| Sixteen STABLE contract guarantees (change set part A: A5–A16, among them `rule_optional_midi_privacy`, `rule_midi_starting_note`, `rule_count_in_shown_on_screen`, `rule_silence_timeout_ends_session`, `rule_controller_loss_mid_session`, `rule_controller_reconnection_window`, `rule_session_generation_failure_ladder`, `rule_dropped_attempt_cancelled`, `rule_join_carry_in_limited`) | **Applied** 2026-10-08 (CONTRACT 3.0, D246) | The new wordings hold for v3.1's code and v3.2's alike; each chunk below builds the exception its guarantee now allows. |
| A session starts with phrase 1 on screen: `tests/e2e/session/session-start.spec.ts` › 'the count-in lights beat by beat with its clicks, and phrase 1 never moves'; `tests/e2e/session/session-midi-start.spec.ts` › '…: the line names phrase 1's first note, which starts the count-in' | [17](#chunk-17--jam-engine-part-1-the-count-in-and-the-capture), [21](#chunk-21--a-fresh-jam-on-screen) | Unchanged outside Jam mode; a fresh Jam starts on the home note with no phrase on screen, its beats still counted (new tests beside them). |
| The silence timer counts from the starting note: `tests/e2e/session/session-midi-silence.spec.ts` › 'counted from the starting note: running at 29.9 s, ended by 30.1 s' | 17 | Unchanged outside a fresh Jam; in one, neither the home note nor the doodle arms it, and the 30-second wait for a first doodle note is the Jam's own rule. |
| A lost controller never ends a session at once: `tests/e2e/session/session-midi-controller-loss.spec.ts` › 'the banner shows while the count-in clicks on; a replug before beat 4 brings it back' | 17 | Unchanged outside a fresh Jam; from a fresh Jam's count-in until phrase 1 sounds, a lost controller ends the Jam at once. |
| v2's failure ladder (`LADDER`, `src/session/failure-ladder.ts`) and the phrase-2 deadline (`phraseTwoDeadline`, `src/session/session-timing.ts`) | [18](#chunk-18--jam-engine-part-2-from-the-doodle-to-phrase-1) | Unchanged for phrases 2 onward and outside Jam; a fresh Jam's phrase 1 has its own three rungs and three-measure deadline, and its phrase 2 is due at the start of phrase 1's last measure. |
| Phrase 1 is generated at Idle (`rule_phrase_one_is_idle_phrase`, `rule_session_density_only_steps_down`'s wording) | 18 | In a fresh Jam the session generates phrase 1, so the narrow-window step-down can apply from phrase 1. |
| The join has a positive phrase number: `makeCarryIn` (`src/domain/generation/carry-in/carry-in.ts`) refuses phrase number 0; the replay key requires "phrase number equals the carry-in's plus one" | [6](#chunk-6--the-request-carries-v32s-inputs), [12](#chunk-12--replay-key-ifk4) | A join from the doodle, from no phrase, with no chord, no arriving interval and no owed recovery; numbered joins keep every refusal. |
| The worker refuses any extra request field (`parseGenerationRequest`; the worker's inbound parser; `tests/unit/generation-worker/generation-worker-protocol.spec.ts`) | 6 | It accepts and re-validates the five new inputs, and still refuses any other field. |
| Replay keys: encoding writes `ifk3.` (v3.1 chunk 8's tests in `tests/unit/generation-worker/phrase-replay-key.spec.ts`) | 12 | Encoding writes `ifk4.` for every phrase; every `ifk1.`, `ifk2.` and `ifk3.` decoding test stays. |
| Rhythm candidates ordered by seed alone (`rankMaterializedRhythmCandidates`, `candidate-ranking.ts`), and the atom `module_ranked_candidate_ordering`'s "without scoring or preferring any candidate over another" | [8](#chunk-8--rhythm-ordered-by-the-doodle) (doodle order), [10](#chunk-10--the-rhythm-lock-in-the-generator) (lock and forced bend order) | Preference keys in front of the seeded key when a doodle or the lock is in the request; seeded order alone otherwise. The atom is revised in chunk 8's capture. |
| Vary settings moves every setting but tempo and the instrument, and throws when no move exists: `tests/unit/session/settings-mutation.spec.ts` › 'changes exactly one eligible setting by one step, never tempo or the instrument', › 'throws instead of looping when no candidate is supported'; `tests/unit/session/settings-mutation-scales.spec.ts` › 'holds one scale per eligible setting and never tempo or the instrument', › 'offers at least one step for every eligible setting' (as v3.1 chunk 12 rewrites them) | [15](#chunk-15--vary-settings-allowed-groups) | Only settings of an allowed group move; with all six on, the draws are v3.1's, byte for byte. With no legal move Vary settings is unavailable at Idle; a dead end mid-session skips one mutation, recorded, and never throws. |
| Notes before phrase 1 belong to no phrase: `tests/unit/session/session-history-played-notes.spec.ts` › 'puts the starting note and the count-in notes in no phrase' | 17 | Unchanged; in a fresh Jam the notes with a snapped start inside the doodle's measures belong to the doodle. |
| The played-notes export drops every note before phrase 1, and both MIDI files start phrase 1 at time zero: `tests/unit/export/midi/played-notes-midi-input.spec.ts` › 'refuses an onset before its phrase starts or at or after the next phrase starts'; `tests/unit/export/midi/midi-encoder.spec.ts` › 'writes one marker per phrase with its number, phrases back to back from time zero'; `tests/unit/export/musicxml/musicxml-encoder.spec.ts` › 'lays phrases back to back from phrase 1, four full measures each, numbered 1 upward' | [25](#chunk-25--exports-open-with-the-doodle) | Unchanged outside a Jam; a Jam's files open with a "Doodle" section at time zero and phrase 1 at the next barline, the raw doodle notes in the played-notes file's section. |
| The session end generates a new phrase 1 (`rule_session_end_generates_next_phrase_one`) | 21, [24](#chunk-24--the-held-doodle) | In Jam mode, no phrase without a held doodle; with one, phrase 1 written again from it. |
| Kept sessions as v3.1 leaves them (data version 3 is v3.1's last) | [22](#chunk-22--kept-jam-sessions-on-the-device) | Data version 4: the Jam flag, the quantized doodle with its capture tempo, the decline, and each phrase's new inputs. |
| Pre-generation's discard triggers (v3.1 chunk 19's B8.3 matrix) | 20, [26](#chunk-26--pre-generation-and-the-v32-settings) | Five more triggers; no pre-generation in Jam mode without a held doodle; with one, it runs from it. |
| The cold-generation goldens, `generation-outcome-golden.spec.ts`, and the `ifk1.`, `ifk2.` and `ifk3.` corpora of v3.0 and v3.1 | **Never** | They stay byte-identical: without a doodle and the lock, v3.2 reproduces v3.1 (item 10). A chunk that needs to touch one is wrong. |

Every replaced or extended test gets its v3.2 counterpart in the same chunk, and the release gate
lists each pair (item 40).

**The transitional interface.** From wave 4 (chunks 19 and 20) to wave 6 (chunk 24) the Jam's
interface is incomplete: in wave 5, `Jam again on this doodle` closes the review and turns Jam on
without holding the doodle. Each wave may merge into `main` in that state, but no release is cut
before wave 6 has merged.

## Gates

| Gate | What | Cleared by | Blocks | Status |
| --- | --- | --- | --- | --- |
| **R0** | v3.1 is released: the [v3.1 release gate](build-plan-v3.1.md#chunk-21--v31-release-gate) passed and `3.1.0` is tagged, so chunk 2's corpora are recorded on the code v3.1 ships. | The owner, at v3.1's release | Chunk 2, and through wave 0 every later wave | open |
| **D0** | The owner approves the v3.2 design ([`ui_ux/todo.md`](../../../ui_ux/todo.md)); if `ux-writer` freezes it into `ui_ux/versions/v3.2/`, `spec-writer` repoints this plan's design links there. | The owner; `ux-writer`; `spec-writer` | Chunk 1, and through it every interface chunk (19–21, 23–25) | open |
| **T2** | The owner allows one `ux-writer` pass on `src/styles/theme.css` and `components.css` for part 2 of [`token-source-v3.1-v3.2.md`](../../../ui_ux/token-source-v3.1-v3.2.md), as for v3.0 (ux Q66) and v3.1 (T1). | The owner, with D0 | Chunk 1 | open |
| **LD** | The owner ranks a handful of rhythm pairs by ear on drift's distance scale ([H1](#hand-checks)), before the scale drives the Drift control ([C8](master-spec.md#c8-jams-drift)). A ranking that disagrees with the scale goes to `spec-writer` before chunk 20. | The owner; `spec-writer` if the ranking disagrees | Chunk 20 | open (after chunks 3 and 8, wave 2) |
| **L1** | The owner's listening check of Jam ([H2](#hand-checks), item 14). | The owner | The release gate | open (after chunk 21) |
| **L2** | The owner's listening check of the suggestion ([H3](#hand-checks), item 25); the weights and cues are tuned from it. | The owner | The release gate's final suggestion tests | open (after chunk 23) |
| **L3** | The owner's listening check of the allowed rhythm changes ([H4](#hand-checks), item 32); the change shares are tuned from it. | The owner | The release gate's final M2 run | open (after chunk 19) |
| **Contract** | C13's guarantee changes confirmed and applied (CONTRACT 3.0). | The owner; `documentalist` | Nothing; the release gate checks the record (item 41) | done (2026-10-08, spec D246) |

## Waves

| Wave | Chunks | Waits for | Status |
| --- | --- | --- | --- |
| 0 | 0 Intent re-sync · 1 Token-source pass · 2 Baselines | R0 (2); D0 and T2 (1) | blocked (on R0) |
| 1 | 4 The quantized doodle · 5 Rhythm bars, distance and change kinds · 6 The request carries v3.2's inputs · 15 Vary settings' allowed groups | Wave 0. In-wave 4 → 6: chunk 4's capture fixes the doodle type and the parser 6's worker check calls. | planned |
| 2 | 3 Measurement tools · 8 Rhythm ordered by the doodle · 9 Melody follows the doodle · 10 The rhythm lock in the generator · 17 Jam engine, part 1 | Wave 1. In-wave 8 → 10: chunk 8's capture fixes the ordering seam. LD opens at its end. | planned |
| 3 | 7 Phrase 1 joins the doodle · 11 Allowed rhythm changes · 14 The key and mode suggestion · 16 The rhythm lock in a session | Wave 2. In-wave 11 → 16: chunk 11's capture fixes the draw and what it records. | planned |
| 4 | 12 Replay key `ifk4.` · 13 Cost and lock measurements · 18 Jam engine, part 2 · 19 The lock and What may vary in the controls · 20 Jam mode at Idle | Wave 3; LD (20). In-wave 12 → 13: the `ifk4.` capture fixes the keys 13 replays; 19 → 20: chunk 19's capture fixes the dependent controls and the session options 20 adds to. L3 opens at its end. | planned |
| 5 | 21 A fresh Jam on screen · 22 Kept Jam sessions · 23 The review's doodle section and the suggestion | Wave 4. In-wave 21 → 23 and 22 → 23: chunk 21's capture fixes what the review receives from an ended Jam, chunk 22's data version 4. L1 and L2 open at its end. | planned |
| 6 | 24 The held doodle · 25 Exports open with the doodle · 26 Pre-generation and the v3.2 settings | Wave 5. In-wave 24 → 26: chunk 24's capture fixes the held doodle. | planned |

The [release gate](#chunk-27--v32-release-gate) (chunk 27) follows wave 6, with L1, L2 and L3. κ
is 1 ([build workflow](build-workflow.md#concurrency-and-order)). Waves 2 and 4 hold five chunks
each, among them the widest (17 in wave 2; 18 and 20 in wave 4).

```mermaid
flowchart LR
  R0{{R0: v3.1 released}}
  D0{{D0 + T2: design approved, token pass allowed}}
  LD{{LD: drift scale by ear}}
  L{{L1, L2, L3: listening}}
  subgraph W0[Wave 0]
    C0[0 Intent re-sync]
    C1[1 Token pass]
    C2[2 Baselines]
  end
  subgraph W1[Wave 1]
    C4[4 Quantized doodle]
    C5[5 Bars and distance]
    C6[6 Request inputs]
    C15[15 Allowed groups]
  end
  subgraph W2[Wave 2]
    C3[3 Measurement tools]
    C8[8 Rhythm by the doodle]
    C9[9 Melody by the doodle]
    C10[10 Lock in the generator]
    C17[17 Jam engine 1: capture]
  end
  subgraph W3[Wave 3]
    C7[7 Join from the doodle]
    C11[11 Allowed changes]
    C14[14 Suggestion]
    C16[16 Lock in a session]
  end
  subgraph W4[Wave 4]
    C12[12 ifk4 key]
    C13[13 Cost and lock run]
    C18[18 Jam engine 2: phrase 1]
    C19[19 Lock and groups controls]
    C20[20 Jam mode at Idle]
  end
  subgraph W5[Wave 5]
    C21[21 Fresh Jam on screen]
    C22[22 Kept Jam sessions]
    C23[23 Review doodle and suggestion]
  end
  subgraph W6[Wave 6]
    C24[24 Held doodle]
    C25[25 Exports with the doodle]
    C26[26 Pre-generation]
  end
  C27[27 Release gate]
  R0 --> C2
  D0 --> C1
  C0 --> C4
  C0 --> C5
  C0 --> C15
  C2 --> C5
  C2 --> C3
  C5 --> C3
  C2 --> C6
  C4 --> C6
  C4 --> C14
  C4 --> C17
  C6 --> C7
  C6 --> C8
  C5 --> C8
  C6 --> C9
  C3 --> LD
  C8 --> LD
  C8 --> C10
  C5 --> C10
  C10 --> C11
  C7 --> C12
  C3 --> C13
  C9 --> C13
  C11 --> C13
  C12 --> C13
  C11 --> C16
  C7 --> C18
  C9 --> C18
  C14 --> C18
  C16 --> C18
  C17 --> C18
  C1 --> C19
  C15 --> C19
  C16 --> C19
  C1 --> C20
  C17 --> C20
  C19 --> C20
  LD --> C20
  C18 --> C21
  C20 --> C21
  C12 --> C22
  C18 --> C22
  C14 --> C23
  C21 --> C23
  C22 --> C23
  C21 --> C25
  C22 --> C25
  C20 --> C24
  C23 --> C24
  C19 --> C26
  C24 --> C26
  C19 --> L
  C21 --> L
  C23 --> L
  C13 --> C27
  C25 --> C27
  C26 --> C27
  L --> C27
```

The critical path runs 0 → 4 → 6 → 8 → 10 → 11 → 16 → 18 → 21 → 23 → 24 → 26 → 27.

## Workflow deltas

The [build workflow](build-workflow.md) holds for v3.2 with release name `v3.2`: wave branches
`v3.2-w<n>` in `/home/bastien/work/infinite_flow-v3.2-w<n>`, chunk branches `v3.2-c<id>-<slug>`
in `/home/bastien/work/infinite_flow-v3.2-c<id>`. v3.2's own:

- **Corpus guard** (a chunk check): chunks 6–12, 15, 16 and 18, which touch generation or the
  session's draws, run chunk 2's two corpora (the `ifk3.` phrase corpus,
  `tests/unit/generation-worker/phrase-replay-key-v31-corpus.spec.ts`, and the Vary settings
  draws), v3.1's `v3.0-neutral-jazz.json` corpus, v3.0's `ifk1-v2.0.json` corpus and the
  cold-generation goldens unchanged. Red means a request with no doodle and no lock, or Vary
  settings with all six groups on, no longer reproduces v3.1.
- **Session tests on the fake clock**: the session and the Jam engine run on the injected audio
  clock with a fake MIDI port and the held-generation harness; a test never waits for real time.
- **Sweep at the wave gate**: chunks 6–11 and 15–18 place it there, so waves 1–4 run it; wave 4's
  gate also re-runs M1 with chunk 18's real ladder.
- **Intent**: the DRAFT atoms are tagged `release-v3.2`, the atoms to revise `changes-in-v3.2`;
  revisions are part E, drift checks part F and the two corrected atoms part G of the
  [v3.1–v3.2 intent change set](../../../docs/release/v3.1-v3.2-intent-change-set.md). Chunks 1,
  2, 3 and 13 add no atom.
- **Chunks 0 and 1 are not coding chunks**: the driver hands chunk 0 to `documentalist` (spec
  ingestion, milestone refinement) and chunk 1 to `ux-writer`.
- **Area documents**: `docs/session-engine.md`, `docs/phrase-workspace.md`,
  `docs/generation-latency.md`, `docs/audio-transport.md`,
  [`docs/music/`](../../../docs/music/README.md); the lexicon entries of C4.
- **Entry budget**: 224 kB, unchanged ([M4](#m4--the-first-load-bundle)).
- **Hand checks** go into a new v3.2 part of [`HARDWARE-CHECKLIST.md`](../../../HARDWARE-CHECKLIST.md),
  written by the chunk the [table](#hand-checks) names.

## Measurements and hand checks

Four figures the spec leaves to the build ([C17](master-spec.md#c17-deferred-and-open): "measured
before the gate, not open questions"). The release gate copies each into the release notes. The
corpora of chunk 2 are a guard, not a measurement: they pass, or the chunk stops.

### M1 — The Jam sweep

- **What:** [C16 item 13](master-spec.md#c16-definition-of-done) and
  [C5.8](master-spec.md#c58-the-time-budget): over doodles × settings at 60, 120 and 240 BPM, with
  the rhythm lock on and off, the share of phrase 1 generated by each rung (the doodle's join and
  preferences; the preferences without the join; doodle-free) and the share of Jams whose phrase 1
  never came; the cost of the new orderings (keying a domain by bars, ordering it by distance, the
  pitch preference) per attempt; that no phrase is repeated; and that every standalone attempt,
  carrying the doodle's preferences and the lock, stays within the standalone reserve
  (`STANDALONE_RESERVE_SECONDS`, 1.075 s, of which the 0.95 s budget is the attempt's).
- **How:** chunk 3's Jam sweep: the deadline sweep's 568 rhythm settings (`sweepCases()`,
  `tests/unit/session/deadline-sweep.ts`), each with a set of recorded and written doodles (one to
  four measures, near and far from the settings' rhythms, inside and outside the register windows
  and the instrument's range, one note, a chord played as a doodle), each attempt charged its
  measured time as `npm run test:sweep` does, phrase 1 driven through chunk 18's ladder (a test
  double of it until chunk 18 exists) and phrases 2 to 8 through v2's. The slowest domain depends
  on the run (the 1,797-candidate settings in Chromium at the v2.0 gate, the 2,932-candidate
  Straight settings in Node since the speed-up, `docs/generation-latency.md`); M1 measures both.
- **Run by:** chunk 3 (the "Jam off, lock off" baseline, on v3.1); chunk 13 (the complete
  generator); wave 4's gate (with chunk 18's real ladder); the release gate.
- **Acceptance:** no phrase repeated anywhere in the sweep; the slowest standalone attempt within
  the budget on the reference machine; with Jam off and the lock off, the v3.1 baseline's figures
  (the phrases are byte-equal; only timing noise may differ). If the preferences or the lock push a
  standalone attempt past its budget, that is not tuned away: it goes to `spec-writer` (C5.9 and
  C7.6 keep them on every rung), with the figures.
- **Recorded:** a new "Jam and the rhythm lock" section of `docs/generation-latency.md`.

### M2 — The lock census: forced bends and rhythm changes

- **What:** C16 items 26 and 27, and [C7.4](master-spec.md#c74-when-a-phrase-changes)'s starting
  shares: the forced-bend rate (overall, with Tension across phrases at each tension, and after
  Vary settings' Tension step from Build to Lift); the share of phrases that draw a change (target:
  near 1 in 4, near 1 in 2 on tenser phrases); the share of draws that found no candidate, per
  allowed kind and per rhythm setting; and that no phrase makes more than one change, of an
  allowed kind, measured from the locked rhythm.
- **How:** chunk 3's lock census, over seeded eight-phrase sessions on the deadline sweep's
  settings, each kind allowed alone and all five together, Tension across phrases on and off. Its
  per-kind availability is compared with
  [jam-grounding §D.2](jam-grounding.md#d2-what-the-rhythm-domain-offers-a-locked-rhythm)'s
  measured shares.
- **Run by:** chunk 13; the release gate, after L3's tuning.
- **Acceptance:** the changed share within a few points of 1 in 4 and 1 in 2 over the sweep
  (tuned by L3); the rest is recorded, not judged. A forced-bend rate the owner finds too high at
  L3 goes to `spec-writer`: the lock is strict by spec.
- **Recorded:** `docs/generation-latency.md` (the rates) and
  [`docs/music/rhythm-phrase-structure.md`](../../../docs/music/rhythm-phrase-structure.md) (what
  each kind offers per setting).

### M3 — The start-up read and the migration

- **What:** whether loading the five new settings and listing kept Jam sessions stays inside
  v3.0's start-up wait (Part A §4.4), and how long the data version 4 upgrade takes on v3.1's data.
- **Run by:** chunk 22: the start-up read on a seeded database with 0, 10, 100 and 500 kept
  sessions, half of them Jam sessions with four-measure doodles and kept raw notes, cold and warm,
  and the version 4 upgrade on 10, 100 and 500 v3.1 sessions. The owner repeats the deciding runs
  on the reference machine.
- **Acceptance:** each, upgrade included, well under the start-up wait constant. If the upgrade
  does not fit, the fallback D250 allowed for v3.1 (each session mapped when read, the player
  seeing no difference) is the reading; chunk 22 reports it to `spec-writer` before merging.
- **Recorded:** `docs/storage.md`.

### M4 — The first-load bundle

- **What:** the entry chunk stays within its 224 kB budget (`entryChunkByteBudget`). The
  quantizer, the capture, the five controls with two `toggle-list`s, `staff-jam` and the cue row's
  new parts add code ([C14](master-spec.md#c14-existing-code-and-risks)) and are in the entry
  chunk; the review's doodle section and the suggestion load with the review; the bar key, the
  distance and the orderings live in the generation worker's bundle.
- **Run by:** chunk 2 (the baseline on the v3.1 release); every wave gate; the release gate (`npm
  run verify:boundaries`, budget unchanged).
- **Recorded:** the wave log and each wave's merge commit message; the release notes.

### Hand checks

The owner runs these on the Travel Sax over USB and the reference machine. H1 to H4 are the
listening checks C8 and C16 ask for.

| Check | Written by | Run at | What the owner does |
| --- | --- | --- | --- |
| H1 Drift's scale by ear (LD) | 8 | After wave 2, before wave 4 | Listen to chunk 3's rendered pairs (a doodle measure, then candidate measures at Same, Close, Near and beyond) and rank them by how different they sound; say whether Close sounds closer than Near. The band rule is kept, or the disagreement goes to `spec-writer` before the Drift control ships. |
| H2 Listening: Jam (L1) | 21 | After wave 5; used by the release gate | Play a handful of doodles (one, two and four measures; a rhythmic figure, a scale run, a leap), each at Close, Near and Free, lock off and on: "does it sound like my doodle?" Item 14. |
| H3 Listening: the suggestion (L2) | 23 | After wave 5; used by the release gate | Play a handful of doodles, the research note's worked examples among them, and judge each suggestion; say whether Locrian ever surprises. The weights, cues and the Locrian question are tuned from it (C6.2). Item 25. |
| H4 Listening: allowed rhythm changes (L3) | 19 | After wave 4; used by the release gate | With the lock on, allow each kind alone on a handful of locked rhythms at Eighth and Sixteenth, Heavily varied; say whether each change is heard as small, and whether 1 in 4 (1 in 2 on tenser phrases) is too often. Item 32. The change shares are tuned from it, then M2 re-run. |
| H5 A Jam on the Travel Sax | 21 | Chunk 21 | At 60, 120 and 240 BPM: a doodle ended by silence, one ended by length with a held note, a note played a little early onto beat 1, a breath noise; the click through to phrase 1 with `Click` off; phrase 1 continuing the last note. Unplug the controller during the count-in, the capture and the read-in measure: the Jam ends at once each time. |
| H6 Same answer in Edge | 14 (suggestion), 12 (phrases) | Chunks 14 and 12 | Run chunk 12's in-browser replay test and chunk 14's suggestion test once with Playwright's Microsoft Edge channel (`msedge`), and replay one `ifk4.` key of a Jam phrase copied from a Chrome session in Edge; the phrases and the suggestion match. Items 21 and 37's "Chrome and Edge" half. |
| H7 A Jam's files | 25 | Chunk 25 | Open a Jam's MusicXML in MuseScore and both MIDI files in a DAW: the "Doodle" section at time zero, phrase 1 at the next barline, the two MIDI files line up measure for measure. |
| H8 v3.1 data carried over | 22 | The release gate | In the installed app and a plain Chrome tab that used v3.1 (settings changed, a pinned session, played notes kept), update to v3.2: the settings come back with v3.2's defaults, the pinned session opens as before, with no doodle and no "Jam". |
| H9 Vary settings' groups | 19 | Chunk 19 | With the Travel Sax, Vary settings on with only "Key and mode" allowed: a long session moves only the key and mode. Lock on with every group: the rhythm never moves. |

## Chunks

"Item _n_" is item _n_ of the [definition of done](master-spec.md#c16-definition-of-done). The
**Atoms** and **Revisions** lines follow the [build workflow](build-workflow.md#intent-atd).

### Chunk 0 — Intent re-sync

Status: planned
Wave: 0
Depends on: none (run right after R0: it checks the atoms against the state v3.1's release gate
left)
Architecture capture: none

- **Goal:** make sure the 67 `release-v3.2` atoms and the 33 `changes-in-v3.2` atoms still match
  master spec Part C and v3.1's released state, before the first v3.2 chunk relies on them.
- **Scope:** `documentalist`, spec ingestion (milestone refinement); atoms only, no code.
  - Part C as it stands when the build starts: the decisions recorded after the ingestion of
    2026-10-08 (D247–D249 are written in; D251 onwards) that touch Part C.
  - The atoms v3.1's gate promoted or revised that v3.2 revises again
    (`rule_seeded_phrase_reproduction`, `rule_mutation_rerolls_unsupported_combination`,
    `rule_mutation_draws_setting_then_direction`, `rule_settings_saved_on_change`,
    `rule_delete_everything`, `rule_kept_session_content`, `req_kept_session_list`,
    `rule_pregeneration_discarded_on_change`): their `changes-in-v3.2` notes still name the right
    change.
  - `module_ranked_candidate_ordering` and `module_named_stream_pseudorandomness` (part G) still
    read as corrected on 2026-10-08.
- **Files:** `docs/*.atom.md`; the [change set](../../../docs/release/v3.1-v3.2-intent-change-set.md).
- **Spec sections:** [Part C](master-spec.md#part-c--v32). No item directly; every later wave's
  preflight relies on it.
- **Atoms:** every atom tagged `release-v3.2` or `changes-in-v3.2`;
  `contract_infinite_flow_first_release` (3.0).
- **Revisions:** none.
- **Done when:** each Part C behaviour is stated by an atom (still DRAFT); `npm run atd:lint` and
  `npm run atd:check` pass; the change set file records what changed, if anything.
- **Verification:** `documentalist`'s ingestion report; chunk checks.
- **Split rule:** none needed.

### Chunk 1 — Token-source pass, part 2 (v3.2)

Status: blocked (on D0, T2)
Wave: 0
Depends on: D0, T2 (and v3.1 chunk 1's part 1, merged)
Architecture capture: none

- **Goal:** write v3.2's new component classes into the canonical token source, so every interface
  chunk can style its components without inventing a value.
- **Scope:** `ux-writer`, not a coding executor. Everything in part 2 of
  [`token-source-v3.1-v3.2.md`](../../../ui_ux/token-source-v3.1-v3.2.md), under `v3.2 new`
  comments: no new token; the classes `staff-jam`, `jam-instruction`, `jam-notice`, `jam-capture`,
  `jam-writing`, `jam-bar`, `suggestion-row`, `review-doodle`, `toggle-list` (its read-only state)
  and `field-dependent` (the dashed ring drawn once, by the outer read-only `field-group`). With
  part 2 applied, `ux-writer` marks the document as applied in full.
- **Files:** `src/styles/theme.css`, `src/styles/components.css`;
  `ui_ux/token-source-v3.1-v3.2.md`.
- **Design docs:** [`ui_ux/token-source-v3.1-v3.2.md`](../../../ui_ux/token-source-v3.1-v3.2.md)
  (part 2), [`ui_ux/README.md`](../../../ui_ux/README.md). No item directly; it unblocks 19, 20,
  21, 23 and 24.
- **Atoms:** none (styling is not business behaviour).
- **Revisions:** none.
- **Done when:** every class part 2 names exists in `src/styles/`; no v3.2 handoff names a class
  that exists nowhere; `npm run test:notation` passes with no snapshot change; `npm run
  lint:links` passes.
- **Verification:** chunk checks; `npm run test:notation` (this chunk's area); a `grep` of each
  v3.2 handoff's class names against `src/styles/`.
- **Split rule:** none needed.

### Chunk 2 — Baselines: the v3.1 corpus, the Vary settings draws and the bundle

Status: blocked (on R0)
Wave: 0
Depends on: R0
Architecture capture: none

- **Goal:** record, on the code v3.1 shipped, the facts v3.2 must not break: the phrase every
  request gives without a doodle or the lock, every `ifk3.` key's phrase, Vary settings' draws,
  and the entry chunk's size.
- **Scope:**
  - **The phrase corpus**, generated from the `3.1.0` tag before any v3.2 change: the eight
    built-in presets and a spread of figure levels × **every one of the nine collections** × the three
    built-in instruments and two player-made ones × a spread of the other controls (every Tension
    value, Eighth and Sixteenth with Heavily varied, Strict variety with Straight syncopation) ×
    several seeds, with and without carry-in (a carry-in with a null harmony included). Each case
    is stored as its `ifk3.` key and the timeline it replays to; a unit test decodes each key,
    regenerates it and expects the stored timeline byte for byte. It sits beside v3.1's
    `v3.0-neutral-jazz.json` corpus and v3.0's `ifk1-v2.0.json`, which stay.
  - **The Vary settings corpus**: seeded sessions (Vary settings on, every preset's restriction, a
    narrow-window step-down among them) whose drawn moves, phrase by phrase, are recorded from the
    tag; a unit test replays each through the session's draw and expects the same moves. Item 33's
    "all six groups reproduce today's Vary settings byte for byte" rests on it.
  - The entry chunk's size after `npm run build` on the tag ([M4](#m4--the-first-load-bundle)).
- **Files:** `tests/fixtures/replay-keys/v3.1-corpus.json`,
  `tests/unit/generation-worker/phrase-replay-key-v31-corpus.spec.ts`,
  `tests/fixtures/sessions/v3.1-vary-settings-draws.json` and its unit test (all new), a generator
  script under `scripts/` (tooling), `docs/testing.md`.
- **Spec sections:** [C11](master-spec.md#c11-the-generation-request-the-replay-key-and-kept-sessions),
  [C9](master-spec.md#c9-vary-settings-allowed-groups); items 10 and 33 (as the guard for chunks
  6–12, 15, 16 and 18), 37 (`ifk3.` decoding).
- **Atoms:** none (test plumbing). The corpus later backs
  `rule_jam_and_lock_off_reproduce_earlier_phrases` and `rule_seeded_phrase_reproduction`, whose
  test links chunk 12 adds.
- **Revisions:** none.
- **Done when:** both corpus tests pass on the tag and on `main`; the baseline size is recorded
  here and in `docs/testing.md`.
- **Verification:** chunk checks; each corpus test is red if a stored value is changed by hand.
- **Split rule:** none needed.

### Chunk 3 — Measurement tools: the doodle set, the Jam sweep, the lock census and the renders

Status: planned
Wave: 2
Depends on: 2, 5 (the census and the renders classify with the bar key)
Architecture capture: none

- **Goal:** the scripts M1, M2 and the listening checks need, run once on v3.1 for their
  baselines.
- **Scope:** tooling only, no product code.
  - **The doodle set**: a fixture of quantized doodles, written by hand from C5.5's rules and
    recorded on the Travel Sax (the v3.0 played-notes export, v3.0's H1, gives real timing), each
    with its intended traits (length, density, far from or near to which rhythm settings, last
    note inside or outside the windows). Recorded raw notes are kept with their quantized form, so
    chunk 4's quantizer is tested on them too.
  - **The Jam sweep** (M1): the deadline sweep (`tests/sweep/session-deadline-sweep-*.spec.ts`,
    `sweepCases()` in `tests/unit/session/deadline-sweep.ts`) and v3.1 chunk 3's cost runner,
    parameterised by a doodle and the lock (until chunks 6–11 exist, it runs Jam off and lock off
    only, the baseline). It writes, as JSON like `LATENCY_OUT`, the rung shares, the per-attempt
    timings with the orderings' share, the repeat count, and the slowest and 95th-percentile
    standalone attempts.
  - **The lock census** (M2): seeded eight-phrase sessions per setting; per phrase, whether it
    kept the locked bars, took a change (of which kind), or a forced bend; per draw, whether
    candidates existed. Classifies with chunk 5's `rhythm-change-kinds.ts`.
  - **The renders** for H1, H2 and H4: a script writing short MIDI files (a doodle measure then
    candidates at each distance; a locked rhythm then one change of each kind) for the owner to
    hear without the app.
- **Files:** `tests/sweep/jam-sweep.ts`, `tests/sweep/jam-sweep.spec.ts`,
  `tests/sweep/lock-census.ts`, `tests/sweep/lock-census.spec.ts`, `tests/fixtures/doodles/`,
  `scripts/render-rhythm-examples.mjs` (all new), `package.json` (`measure:jam`, `measure:lock`,
  `render:rhythms`), `docs/testing.md`, `docs/generation-latency.md` (the baseline).
- **Spec sections:** [C5.5](master-spec.md#c55-quantizing), [C5.8](master-spec.md#c58-the-time-budget),
  [C7.4](master-spec.md#c74-when-a-phrase-changes); no item directly (M1 and M2 rest on it: items
  13, 26, 27).
- **Atoms:** none (measurement).
- **Revisions:** none.
- **Done when:** the sweep runs on `main` with Jam and the lock off and records the baseline; the
  census classifies a hand-written session holding one change of each kind, a forced bend and a
  kept phrase exactly; the renders play in a MIDI player.
- **Verification:** chunk checks (the census's own unit test); the baseline run (M1: this chunk's
  point).
- **Split rule:** none needed (tooling).

### Chunk 4 — The quantized doodle

Status: planned
Wave: 1
Depends on: 0 (and v3.0 chunk 25's stray-note filter)
Architecture capture: the quantized doodle, `src/domain/doodle/quantized-doodle.ts`: one to four
measures, each note a start and a length in ticks from the start of the doodle's first measure and
a concert pitch; at most 64 notes, sorted, never overlapping (one melodic line). Its own type, not
a `ConcertEventTimeline` (always four measures), with a validating constructor and a parser that
the worker (chunk 6) and the storage (chunk 22) reuse. The capture tempo is kept beside it by the
session and the storage, never inside it, so it can never reach the request. The quantizer,
`doodle-quantizer.ts`, takes raw notes on the audio clock, the grid origin and the tempo; integer
arithmetic after one conversion to microseconds. Chunk 6 builds on the type and the parser in the
same wave.

- **Goal:** turn the raw notes of a capture into the quantized doodle every later step reads, by
  C5.5's rules, with integer arithmetic.
- **Scope:**
  - `quantized-doodle.ts` (new): the type, its constructor and parser, and the overlay of its
    measures on four phrase measures (one measure four times; two twice; three as 1, 2, 3, 1; four
    as they are).
  - `doodle-quantizer.ts` (new): from raw notes (concert pitch, onset and release on the audio
    clock), the grid origin (the first barline after the count-in) and the tempo: the stray-note
    filter first (v3.0 chunk 25's `src/domain/played-notes/stray-notes.ts`); each time converted
    once to integer microseconds, then snapped to the nearest tick with integer division (a tie
    rounds to the later tick, stated in the module and tested); a note keeps at least one tick;
    overlaps cut the earlier note at the later start; two notes on one tick keep the longer, then
    the higher; notes before the doodle's first measure (snapped before the first beat after the
    count-in) dropped; a note past the doodle's end cut at its last barline. The doodle's first
    measure is the measure holding its first note; the doodle starts there, rests included.
  - What a measure is for the capture: `doodleMeasureOf(snappedStart)`, used by chunk 17's end
    rule.
- **Files:** `src/domain/doodle/quantized-doodle.ts`, `src/domain/doodle/doodle-quantizer.ts`
  (new); tests `tests/unit/domain/doodle/quantized-doodle.spec.ts`, `doodle-quantizer.spec.ts`,
  using chunk 3's recorded doodles once they exist.
- **Spec sections:** [C5.4](master-spec.md#c54-capturing-the-doodle-where-it-starts-and-where-it-ends),
  [C5.5](master-spec.md#c55-quantizing), [C5.9](master-spec.md#c59-what-the-doodle-feeds-the-generator)
  (the overlay), [C10.6](master-spec.md#c106-stray-notes-v30),
  [C11](master-spec.md#c11-the-generation-request-the-replay-key-and-kept-sessions); items 7, 6
  (the doodle's half).
- **Atoms:** `rule_doodle_quantized_to_sixteenths`, `rule_doodle_is_one_line`,
  `rule_doodle_capture_start`, `rule_quantized_doodle_is_generation_input`; (v3.0)
  `rule_stray_note_definition`, `rule_stray_notes_filtered_on_reading`.
- **Revisions:** none.
- **Done when:**
  - Recorded and written doodles quantize as C5.5 says: a note a little early onto beat 1 is the
    doodle's first note; overlaps, chords and notes colliding on one tick reduce to one line (each
    rule a named test); a very short note never starts, extends or shapes the doodle.
  - The quantizer has no floating-point operation after the one conversion to microseconds (a
    test over the module's source), and quantizes a fixed list identically twice.
  - The constructor refuses zero or five measures, an overlap, a note outside its measures, 65
    notes.
  - The overlay gives C5.9's four patterns.
- **Verification:** chunk checks.
- **Split rule:** none needed (two new modules).

### Chunk 5 — Rhythm bars, distance and change kinds

Status: planned
Wave: 1
Depends on: 0, 2
Architecture capture: the bar key, `src/domain/rhythm/rhythm-bars.ts` (a revision of
`entity_rhythm_candidate_domain`): a candidate's written bars per measure (note starts and
lengths, rests, ties) as a compact string key, so identical rhythms compare equal by their bars,
never by their `identity` (which also holds the grammar version, controls, recurrence and
transforms) or index; a domain keyed by bars once, beside the canonical memo
(`canonical-rhythm-domain.ts`), so a lookup costs a map access.

- **Goal:** C8's distance and C7.3's five kinds as pure, tested functions over the existing rhythm
  candidates, before any ordering uses them.
- **Scope:**
  - `rhythm-bars.ts` (new): the bar key; its start lists (note starts and rest starts, ties
    ignored, so a rhythm written with other ties is at distance 0); the keyed domain.
  - `rhythm-distance.ts` (new): the per-measure edit count between two start lists (an edit adds a
    start, removes one, or moves one by at most an eighth note; a note start turned into a rest
    start at the same tick is one edit, [C8](master-spec.md#c8-jams-drift), spec D251), the band
    (Same; Close, one edit away from ticks 0 and 8; Near, one edit touching tick 0 or 8, or two
    Close edits; beyond), and the total over four measures. Integers only.
  - `rhythm-change-kinds.ts` (new): given the locked bars and a candidate's bars, the one
    allowed-kind change they differ by (move a note start by a sixteenth or an eighth, move a
    rest, split a note, merge two notes, add or remove a rest), either in one measure or made in
    gesture measure _k_ and repeated in answer measure _k_ + 2, or none. Bars are compared as
    written: a candidate that also differs by a tie elsewhere is not one change
    ([C7.4](master-spec.md#c74-when-a-phrase-changes), spec D251).
- **Files:** the three modules above (new); tests under `tests/unit/domain/rhythm/`.
- **Spec sections:** [C4](master-spec.md#c4-words-used-in-this-part) (Bars, Distance),
  [C7.3](master-spec.md#c73-the-five-kinds-and-the-known-limit),
  [C7.6](master-spec.md#c76-how-the-search-holds-the-lock), [C8](master-spec.md#c8-jams-drift);
  items 12 and 26 (their basis).
- **Atoms:** `rule_rhythm_distance`, `rule_rhythm_change_kinds`; (v2)
  `rule_unsupported_rhythm_settings_block_generation`. Drift check:
  `entity_rhythm_candidate_domain`.
- **Revisions:** none.
- **Done when:**
  - Over the real domains, the bar key finds jam-grounding §D.2's facts: in the slowest domain,
    1,797 candidates and 1,435 distinct rhythms; every Settled or Lift rhythm among Build's;
    Settled and Lift equal, Build and Edge equal (a test over every rhythm setting).
  - C8's bands on hand-written measure pairs, one test per row of its definition; the total is
    symmetric and zero only between rhythms equal up to ties.
  - The five kinds on hand-written pairs, each kind alone and repeated, and pairs that are none
    (two changes; a tie difference); the per-kind availability over the domains is within a point
    of §D.2's shares.
  - Keying the largest domain (2,932 candidates) takes about 10 ms in Node (recorded, not gated).
- **Verification:** chunk checks; then H1 can be prepared with chunk 3's renders.
- **Split rule:** none needed (three new pure modules).

### Chunk 6 — The request carries v3.2's inputs

Status: planned
Wave: 1
Depends on: 2, 4 (and v3.1 chunks 4 and 8, the request with levels and no profile; v3.0 chunks
16–17, my instrument in the request)
Architecture capture: the five new request inputs and the join from no phrase.
`GenerationIntent` and the resolved `GenerationRequest` gain, as one optional group each, `doodle`
(the quantized doodle and the drift) and `rhythmLock` (its state, the allowed rhythm changes,
whether the phrase is a tenser one). The lock's state has three forms: off (no group at all, the
allowed changes and the tenser flag included), on with nothing locked yet (a Jam's phrase 1, and a
held doodle's), on with these bars ([C11](master-spec.md#c11-the-generation-request-the-replay-key-and-kept-sessions),
spec D251). Absent means v3.1's request exactly. Every ordering and draw is computed inside
generation from these inputs, so the generator stays a pure function of its request and a replay
key replays without the app's state. `CarryIn` gains an origin: a phrase (with its number, as
today) or the doodle (no number, no chord, no arriving interval, no owed recovery); `makeCarryIn`
keeps all nine refusals for a phrase origin and checks only the pitch and the window for a doodle
origin (revises `entity_phrase_carry_in`).

- **Goal:** put the doodle, the drift, the lock's state, the allowed rhythm changes and the tenser
  flag into the request, across the worker, with no effect on any phrase yet.
- **Scope:**
  - `GenerationIntent` and `GenerationRequest` gain the two groups; `makeGenerationIntent` and
    `request-resolution.ts` carry them, so a request is canonical and a v3.1-shaped one stays
    exactly v3.1's.
  - `CarryIn` gains its origin; `makeCarryIn` and `parseCarryIn` accept a doodle origin and keep
    every refusal for a phrase origin; `carriedMotionState` (`src/domain/pitch/pitch-carry-in.ts`)
    reads a doodle origin as "the note before beat 1, reached by no interval".
  - The worker's inbound parser validates and rebuilds both groups (the doodle through chunk 4's
    parser; a drift, a lock state or a kind it does not know refused with the typed protocol
    error) and still refuses any other field (`GENERATION_INTENT_ALLOWED_KEYS`,
    `GENERATION_REQUEST_ALLOWED_KEYS`, `requireAllowedKeys`); `makeCarryInGenerationIntent`
    (`carry-in/carry-in-intent.ts`) accepts a doodle-origin join only with a doodle in the intent;
    the prewarm and the cancellation paths carry them.
  - No consumer reads them yet: every phrase is v3.1's.
- **Files:** `src/domain/generation/generation-intent.ts`, `generation-request.ts`,
  `src/domain/generation/orchestration/request-resolution.ts`,
  `src/domain/generation/carry-in/carry-in.ts`, `carry-in-intent.ts`,
  `src/domain/pitch/pitch-carry-in.ts`, `src/generation-worker/generation-worker-inbound.ts`,
  `generation-worker-protocol.ts`; tests under `tests/unit/domain/generation/`,
  `tests/unit/generation-worker/generation-worker-protocol.spec.ts` and
  `generation-worker-protocol-carry-in.spec.ts` (extended).
- **Spec sections:** [C11](master-spec.md#c11-the-generation-request-the-replay-key-and-kept-sessions),
  [C5.9](master-spec.md#c59-what-the-doodle-feeds-the-generator) (the join),
  [C14](master-spec.md#c14-existing-code-and-risks); items 10 (guarded), 11 (the join's form).
- **Atoms:** `rule_quantized_doodle_is_generation_input`, `rule_every_jam_phrase_carries_doodle`,
  `rule_jam_and_lock_off_reproduce_earlier_phrases`; (v2) `rule_seeded_phrase_reproduction`,
  `rule_join_carry_in_limited`. Drift check: `module_generation_request_construction`,
  `module_generation_worker_protocol`, `entity_phrase_carry_in`.
- **Revisions:** none.
- **Done when:**
  - A request with each group round-trips through the worker unchanged; one with an unknown
    drift, lock state or kind, a malformed doodle, or any extra field is refused with the typed
    error.
  - A doodle-origin join is accepted with a pitch inside the window; refused outside it; a phrase
    origin with number 0 is still refused (each of the nine refusals keeps its test).
  - The v3.1 corpus, every earlier corpus and the goldens pass unchanged; a request built with Jam
    off and the lock off is deep-equal to v3.1's.
- **Verification:** chunk checks with the corpus guard; the sweep and the bundle at the wave gate.
- **Split rule:** if the brief passes about five source files, 6a the two groups in the intent,
  the request and the worker (intent, request, resolution, inbound parser, protocol), 6b the
  join's doodle origin (carry-in, carry-in intent, pitch carry-in).

### Chunk 7 — Phrase 1 joins the doodle

Status: planned
Wave: 3
Depends on: 6 (and v3.0 chunk 16, my instrument's range)
Architecture capture: none (it builds on chunk 6's)

- **Goal:** make phrase 1 continue from the doodle's last note, in the register window C5.9 picks,
  or generate without the join when that note lies outside it.
- **Scope:**
  - `src/domain/doodle/doodle-join.ts` (new): from the doodle and the instrument, the join: the
    last note's concert pitch, with no chord, no arriving interval and no owed recovery; none when
    that note lies outside the instrument's range or the window.
  - **Register:** with Register on Varying, the window holding the last note, the nearest by its
    centre when several do (ties by the existing register tie key); when none does, Varying
    resolves as in v2. With Low, Middle or High, the player's window. An input decided before the
    search, in the register resolution stage (`selectVaryingRegister`, `request-resolution.ts`,
    ties by `registerTieKey`). For rung 2 (no join) the session passes that window as the explicit
    register a standalone attempt already receives from `buildAttemptIntent` (chunk 18).
  - The orchestrator reads the doodle group: the join for phrase 1 (the session says which phrase
    it is asking for through the carry-in it sends, chunk 18). Phrases 2 onward keep v2's join
    from the previous phrase.
- **Files:** `src/domain/doodle/doodle-join.ts` (new), the register resolution in
  `src/domain/generation/orchestration/request-resolution.ts`, `generation-orchestrator.ts`; tests
  under `tests/unit/domain/doodle/`, `tests/unit/domain/generation/`.
- **Spec sections:** [C5.9](master-spec.md#c59-what-the-doodle-feeds-the-generator) (the join,
  register), [C5.10](master-spec.md#c510-planner-authority); items 11, 9 (the join changes no
  setting).
- **Atoms:** `rule_jam_phrase_one_joins_doodle`, `rule_jam_register_follows_doodle`,
  `rule_doodle_only_orders_candidates`; (v2) `rule_varying_register_once_per_session`,
  `rule_instrument_profile_range`. Drift check: `entity_phrase_carry_in`.
- **Revisions:** revise `rule_join_inherits_leap_recovery`, `rule_join_tense_note_resolution`.
- **Done when:**
  - Over the doodle set, phrase 1's first interval from the doodle's last note obeys the limits of
    two notes inside a phrase, and no recovery is owed on its first note.
  - Varying picks the window holding the last note (the nearest centre among several); outside
    every window, Varying's v2 choice; Low, Middle and High never change.
  - Outside the window or the range, phrase 1 is generated with no join (a test per case), the
    doodle's other inputs still in the request.
  - The v3.1 corpus passes.
- **Verification:** chunk checks with the corpus guard; the sweep at the wave gate.
- **Split rule:** none needed (three source files).

### Chunk 8 — Rhythm ordered by the doodle

Status: planned
Wave: 2
Depends on: 5, 6
Architecture capture: preference keys in front of the seeded key. In the rhythm stage, a
candidate's place is a tuple: a preference rank, then the existing seeded tie key, then its index,
compared in code-unit order (ISS-010). With a doodle and no lock: rank 0 for a candidate whose
every measure lies inside the drift band, else 1 plus its total edits. Under the lock: the drawn
change's candidates, then the locked bars, then the forced bend's order by total edits from the
locked bars (chunks 10 and 11). With neither, the tuple is the seeded key alone, so the order is
v3.1's. In the pitch stage, the doodle's move preference is one term inside `pitchRank`'s existing
rank, never across ranks (chunk 9). In the capture, before the code, `documentalist` revises
`module_ranked_candidate_ordering` (REVIEW), whose "without scoring or preferring any candidate
over another" v3.2 breaks (change set part G): with a doodle or the lock in the request, a
preference rank comes first, then the seeded tie key, then the index; without them the order is the
seeded key alone, its expectation gaining the doodle-free case's identity with today's order.
Chunk 10 builds on the ordering seam in the same wave.

- **Goal:** order a phrase's rhythm candidates by C8's drift bands when the request carries a
  doodle, without removing any.
- **Scope:**
  - In the rhythm ranking (`candidate-ranking.ts`, `rankMaterializedRhythmCandidates`), with a
    doodle: the overlay of chunk 4 laid over the four measures; candidates whose every measure
    lies inside the drift position's band first, in seeded order; then the rest by total edits,
    fewest first, then the seeded order; Free keeps the seeded order alone. Ties by the seeded
    key, then by index, in code-unit order.
  - The ranked cache stays valid per request: the preference is computed after the seeded ranking,
    over the bar key's lists, once per request.
  - A doodle far from every rhythm the settings allow is only approached: no candidate is dropped,
    so `no_legal_rhythm_plan` can arise only where it arises in v3.1.
- **Files:** `src/domain/generation/orchestration/candidate-ranking.ts`,
  `src/domain/rhythm/rhythm-doodle-order.ts` (new), `generation-orchestrator.ts`; tests under
  `tests/unit/domain/generation/orchestration/`, `tests/unit/domain/rhythm/`.
- **Spec sections:** [C5.9](master-spec.md#c59-what-the-doodle-feeds-the-generator) (rhythm),
  [C8](master-spec.md#c8-jams-drift),
  [C11](master-spec.md#c11-the-generation-request-the-replay-key-and-kept-sessions) (determinism);
  items 12 (rhythm), 9.
- **Atoms:** `rule_jam_rhythm_ordered_by_doodle`, `rule_jam_drift_positions`,
  `rule_rhythm_distance`, `rule_doodle_only_orders_candidates`. Drift check:
  `module_named_stream_pseudorandomness` (no new stream), the rhythm ranking modules.
- **Revisions:** none (`module_ranked_candidate_ordering` is revised in the capture).
- **Done when:**
  - Over the doodle set and every drift position, the chosen rhythm's measures lie in the band
    whenever a candidate in it can make a phrase; Free chooses exactly v3.1's rhythm for the seed.
  - The same doodle and seed give the same order twice, in any locale (a test with a non-English
    collation forced, as for ISS-010).
  - Every candidate appears once in the order (no filter); the v3.1 corpus passes.
  - Then **H1** (LD) with the owner, from chunk 3's renders.
- **Verification:** chunk checks with the corpus guard; the sweep at the wave gate; H1.
- **Split rule:** none needed (three source files).

### Chunk 9 — Melody follows the doodle's moves

Status: planned
Wave: 2
Depends on: 6 (and v3.1 chunk 6, the favored rank the term sits inside)
Architecture capture: none (it builds on chunk 8's pitch-stage term)

- **Goal:** order pitch candidates to follow the doodle's moves at Close and Near, inside every
  rule.
- **Scope:** in the pitch ranking (`pitchRank`, `src/domain/pitch/pitch-ranking.ts`): for each
  note of the phrase, the doodle's next move (up, down or the same note; a step, a skip or a leap
  in the app's size classes), cycled in order; at Close direction and size are preferred, at Near
  direction only, at Free nothing. The term orders candidates within each rank of the existing
  order (chord tones first, v3.1's drawn favored figures), never across ranks, after the hard rules
  (Contour, Leapiness, the window). The search's ordering memo (`searchPitchPlan`,
  `src/domain/pitch/pitch-search.ts`) keeps a correct key: its key, `attackIndex|required|priorMidi`,
  already holds the note's position, on which the doodle's move depends alone; a test pins that a
  doodle request reuses no ordering across two different doodles (the memo lives per search).
- **Files:** `src/domain/pitch/pitch-ranking.ts`, `src/domain/pitch/doodle-moves.ts` (new),
  `src/domain/pitch/pitch-search.ts` (if the memo key needs it); tests under
  `tests/unit/domain/pitch/`.
- **Spec sections:** [C5.9](master-spec.md#c59-what-the-doodle-feeds-the-generator) (melody),
  [C8](master-spec.md#c8-jams-drift),
  [C10.1](master-spec.md#c101-presets-and-the-key-and-mode-restriction-v31) (figures); items 12
  (melody), 9.
- **Atoms:** `rule_jam_melody_follows_doodle_moves`, `rule_jam_drift_positions`,
  `rule_doodle_only_orders_candidates`; (v3.1) `rule_figure_level_orders_search`. Drift check:
  `mechanic_pitch_search_policy` and the pitch search modules.
- **Revisions:** none.
- **Done when:**
  - Over the doodle set, the share of notes moving in the doodle's direction rises from Free to
    Near to Close, and of matching sizes at Close (property over seeds).
  - Every phrase passes the validator unchanged (no rule is weakened): the doodle never makes a
    phrase impossible that v3.1 finds (property: the same requests without the doodle succeed at
    least as often).
  - Without a doodle the pitch order is v3.1's; the v3.1 corpus passes.
- **Verification:** chunk checks with the corpus guard; the sweep at the wave gate.
- **Split rule:** none needed (three source files).

### Chunk 10 — The rhythm lock in the generator

Status: planned
Wave: 2
Depends on: 5, 8 (the ordering seam)
Architecture capture: the lock's order and the rhythm-major search. Candidates are matched to the
locked bars by bars (chunk 5's key) among the candidates of the phrase's own settings, never by
index or identity. `searchWindow` walks chord plans, then rhythms; under the lock the phrase's
rhythm (the drawn change, then the locked bars) is tried with every chord plan before any other
rhythm, then the forced bend's rhythms, each with every chord plan. An order, not a filter: every
phrase possible in v3.1 stays possible. The outcome names which happened (locked, forced bend) in
the provenance the session history keeps, never in the timeline.

- **Goal:** with the lock in the request, keep the locked bars, take a forced bend only when they
  cannot make a phrase, and choose phrase 1's rhythm nearest the doodle.
- **Scope:**
  - **Under "on, these bars":** the locked bars first; then the forced bend's order (total edits
    from the locked bars, a tie variant at 0 first, then the seeded order).
  - **Under "on, nothing locked yet"** (phrase 1 of a Jam, and a held doodle's phrase 1):
    candidates by total edits to the doodle only, closest first, whatever the drift; outside a Jam
    phrase 1 is an ordinary phrase.
  - **The search** (`searchWindow`, `src/domain/generation/orchestration/window-search.ts`), as the
    capture says, under the fuel the request already has. Without the lock the loop is v3.1's.
  - **The outcome** in the provenance.
- **Files:** `window-search.ts`, `candidate-ranking.ts`, `src/domain/rhythm/rhythm-lock-order.ts`
  (new), `orchestration-types.ts`; tests under `tests/unit/domain/generation/orchestration/`.
- **Spec sections:** [C7.1](master-spec.md#c71-the-switch-and-what-is-locked),
  [C7.5](master-spec.md#c75-the-forced-bend), [C7.6](master-spec.md#c76-how-the-search-holds-the-lock),
  [C5.10](master-spec.md#c510-planner-authority); items 26, 29, 30 (phrase 1 nearest the doodle).
- **Atoms:** `req_rhythm_lock`, `rule_rhythm_lock_strict`, `rule_locked_rhythm_is_phrase_one`,
  `rule_forced_bend`; (v2) `rule_session_generation_failure_ladder`. Drift check:
  `module_ranked_candidate_ordering` (as revised in chunk 8's capture),
  `entity_rhythm_candidate_domain`.
- **Revisions:** none.
- **Done when:**
  - With the locked bars present, every phrase has them, on every rung (an instrumented search
    shows the locked rhythm tried with every chord plan before any other rhythm: item 29).
  - A step from Build to Lift whose domain lacks the bars gives a forced bend at the least total
    edits; a tie variant is taken at distance 0 first.
  - Phrase 1 under "nothing locked yet" takes the candidate nearest the doodle over the doodle
    set, whatever the drift.
  - Without the lock, the v3.1 corpus passes; the fuel per search never exceeds v3.1's allowance.
- **Verification:** chunk checks with the corpus guard; the sweep at the wave gate.
- **Split rule:** none needed (four source files).

### Chunk 11 — Allowed rhythm changes in the generator

Status: planned
Wave: 3
Depends on: 10
Architecture capture: the rhythm-change draw, `src/domain/rhythm/rhythm-change-draw.ts`: `fnv1a32`
(`src/domain/random/hash32.ts`) over the tie-key prefix `infinite-flow/rhythm-change/v1` and the
phrase's seed, kept when it falls under the share (a numerator over a power of two,
`RHYTHM_CHANGE_SHARE` 1/4 and `TENSER_RHYTHM_CHANGE_SHARE` 1/2); integer operations only
(`Math.imul`, `>>> 0`, masks), as v3.1's favored draw, and no new stream; computed only when the
lock's bars and an allowed kind are both in the request. What it records in the provenance: the
change's kind, or "no change available". Chunk 16 builds on it in the same wave.

- **Goal:** let a locked phrase make one change of an allowed kind, at the share C7.4 gives, drawn
  inside generation.
- **Scope:** `rhythm-change-draw.ts` (new): with the locked bars, at least one allowed kind and a
  phrase seed, whether the phrase changes (1 in 4, 1 in 2 when the tenser flag is set); if so, the
  candidates whose bars differ from the locked bars by exactly one allowed change (chunk 5), every
  kind pooled, in seeded order, placed before the locked bars in chunk 10's order. No candidate:
  the locked rhythm, recorded as "no change available". Never on a request without locked bars
  (phrase 1); no draw at all without the lock or a kind.
- **Files:** `src/domain/rhythm/rhythm-change-draw.ts` (new),
  `src/domain/rhythm/rhythm-lock-order.ts`; tests under `tests/unit/domain/rhythm/`.
- **Spec sections:** [C7.2](master-spec.md#c72-allowed-rhythm-changes-the-option),
  [C7.3](master-spec.md#c73-the-five-kinds-and-the-known-limit),
  [C7.4](master-spec.md#c74-when-a-phrase-changes); item 27 (generator half).
- **Atoms:** `rule_allowed_rhythm_changes`, `rule_rhythm_change_kinds`,
  `rule_rhythm_change_lasts_one_phrase`, `rule_rhythm_change_share`; (v2)
  `rule_seeded_phrase_reproduction`. Drift check: `module_named_stream_pseudorandomness` (a hash
  tie key, no new stream).
- **Revisions:** none.
- **Done when:**
  - Over many seeds, no phrase makes more than one change, each of an allowed kind and measured
    from the locked bars; the drawn share is near 1 in 4 and 1 in 2 on tenser phrases (property).
  - No floating-point operation in the draw (a test over the module's source); golden draws for a
    fixed seed list.
  - Under Strict variety with Straight syncopation at Sixteenth, no change is ever found and the
    phrase keeps the locked rhythm.
  - Without the lock or with no kind allowed, no draw is made; the v3.1 corpus passes.
- **Verification:** chunk checks with the corpus guard; the sweep at the wave gate.
- **Split rule:** none needed (two source files).

### Chunk 12 — Replay key `ifk4.`

Status: planned
Wave: 4
Depends on: 7 (the join's two origins), 2 (the corpus) (and v3.1 chunk 8's `ifk3.`, v3.0 chunk
18's `ifk2.`)
Architecture capture: the `ifk4.` format (a revision of `module_phrase_replay_key`): everything
`ifk3.` carries, plus the doodle group and the lock group as chunk 6 defines them, and a join of
either origin. A phrase with a doodle-origin join is phrase 1, and "phrase number equals the
carry-in's plus one" (`requireConsistentPhraseNumber`, called by the encoder and the decoder) holds
only for a phrase origin. The atom's "holds no played notes" is read against C5.14: the quantized
doodle is a generation input, never the raw notes. Chunk 13 replays from it in the same wave.

- **Goal:** write `ifk4.` for every phrase, holding the request's new inputs, while every `ifk1.`,
  `ifk2.` and `ifk3.` key keeps decoding to the same phrase.
- **Scope:**
  - **The key.** `encodePhraseReplayKey` writes `ifk4.`. A four-measure doodle at sixteenths is
    about a kilobyte of JSON: still one console line.
  - **Decoding** accepts all four versions: `ifk1.` to `ifk3.` decode as no doodle, no lock and no
    allowed change, to the phrase their version wrote; `ifk4.` re-validates every field (the
    doodle through chunk 4's parser); a later prefix is refused as an unsupported version. `npm
    run replay:phrase` replays all four.
  - An in-browser replay test (workspace harness) replays a Jam phrase 1, a locked phrase, a
    changed phrase, a forced bend and a drifted phrase through the worker, for H6.
- **Files:** `src/generation-worker/phrase-replay-key.ts`, `phrase-replay-key-decode.ts`,
  `phrase-replay.ts`, `phrase-replay-report.ts`, `scripts/replay-phrase.mjs`; tests under
  `tests/unit/generation-worker/`, `tests/unit/scripts/`,
  `tests/e2e/release/deterministic-replay.spec.ts` (extended).
- **Spec sections:** [C11](master-spec.md#c11-the-generation-request-the-replay-key-and-kept-sessions),
  [C5.14](master-spec.md#c514-the-doodles-two-forms); items 37, 10 (guarded), 21's Edge half for
  phrases (H6).
- **Atoms:** `rule_quantized_doodle_is_generation_input`,
  `rule_jam_and_lock_off_reproduce_earlier_phrases`; (v2) `rule_seeded_phrase_reproduction`. Drift
  check: `module_phrase_replay_key`, `module_generation_worker_protocol`,
  `module_generation_request_construction`.
- **Revisions:** revise `rule_seeded_phrase_reproduction` (the doodle, the drift, the locked bars,
  the allowed changes, the tenser flag).
- **Done when:**
  - Every phrase's key is `ifk4.`; encoding then decoding returns an equal intent, and replaying it
    gives the same timeline, with and without each group, for built-in and player-made
    instruments.
  - Chunk 2's corpus and every earlier corpus pass: each `ifk1.`, `ifk2.` and `ifk3.` key decodes
    to the same phrase.
  - An `ifk4.` key with a malformed doodle, an unknown drift, lock state or kind is refused with
    the reason; an `ifk5.` key as an unsupported version.
  - `npm run replay:phrase` replays one key of each version.
- **Verification:** chunk checks with the corpus guard; `npm run replay:phrase -- <key>` for each
  version by hand; H6.
- **Split rule:** none needed (five source files and the replay script, one format).

### Chunk 13 — Cost and lock measurements, first run

Status: planned
Wave: 4
Depends on: 3, 9, 11, 12
Architecture capture: none

- **Goal:** measure M1 and M2 on the complete generator, before any interface is built on it (it
  runs before chunks 18–20 in wave 4), and tune the change shares if needed.
- **Scope:** no product code beyond tuning constants. Run M1 at 60, 120 and 240 BPM, lock off and
  on, over the doodle set, phrase 1 driven by a test double of chunk 18's ladder (the rungs, the
  deadline and the reserve as C5.7 sets them; chunk 18 replaces the double and wave 4's gate
  re-runs it). Run M2. Replay a sample of every kind of phrase (Jam phrase 1 by each rung, locked,
  changed, forced bend, drifted) from its `ifk4.` key. Report the figures to the owner, and to
  `spec-writer` if a standalone attempt exceeds its budget.
- **Files:** `src/domain/rhythm/rhythm-change-draw.ts` (constants only, if tuned),
  `docs/generation-latency.md`, `docs/music/rhythm-phrase-structure.md`.
- **Spec sections:** [C5.8](master-spec.md#c58-the-time-budget),
  [C7.4](master-spec.md#c74-when-a-phrase-changes),
  [C14](master-spec.md#c14-existing-code-and-risks) (at risk); items 13 (first measurement), 26
  (forced-bend rate), 27 (shares), 37 (every kind replays).
- **Atoms:** none (measurement).
- **Revisions:** none.
- **Done when:** M1 and M2 are recorded, on the reference machine for the deciding runs; no phrase
  is repeated; every replayed sample matches.
- **Verification:** the runs themselves (M1, M2: this chunk's point); chunk checks if a constant
  changed.
- **Split rule:** none needed.

### Chunk 14 — The key and mode suggestion

Status: planned
Wave: 3
Depends on: 4
Architecture capture: the suggestion module, `src/domain/key-suggestion/`, and its integer draw:
the seed is `fnv1a32` of the quantized doodle's notes under `infinite-flow/key-suggestion/v1`; the
weights come from a precomputed integer table indexed by the penalty gap; no transcendental
function runs. Its answer is "nothing", "no fit" or the drawn pair named in the player's family,
which chunks 18, 23 and 24 read. It runs on the main thread (far under a millisecond), loaded with
the review's code and fetched when a Jam starts.

- **Goal:** C6's method as pure, tested functions over the quantized doodle.
- **Scope:** `src/domain/key-suggestion/` (new):
  - **Scores:** the 84 pairs (12 home notes × Ionian to Locrian), each note's role penalty in
    thousandths (from the research note's −ln shares: 1609, 1802, 1931, 2141 and 5521), weighted by
    its length in ticks clamped to 2–6 (half a beat to a beat and a half), × 1.5 on beat 1 or 3;
    the final ×2 and first ×1.5 cues as fixed bonuses when the note is the candidate's home note.
    Every factor of 1.5 handled by doubling the whole scale, so nothing is fractional.
  - **Thresholds:** nothing below 5 pitch classes, 6 notes or 2 beats of sounding time (after the
    stray-note filter, in the quantized doodle); the fit share (`5 × fitting ≥ 4 × total` for
    80 %).
  - **The kept candidates:** at most 3, within a penalty gap of 693 thousandths of the best (the
    research note's "half the best one's chance" at T = 1), ordered by penalty, then home note C
    to B, then mode Ionian to Locrian.
  - **The draw:** the weights' values written once, from `e^(−gap/1000)`, as integer literals in
    the source with their derivation in a comment; `seed % total` walks the list.
  - **The answer:** "nothing" (too little material; the selection among the kept candidates, Major
    as Ionian and Minor as Aeolian), "no fit", or the drawn pair, named in written pitch in the
    player's family (Major or Minor for Ionian or Aeolian while Major or Minor is selected, else the
    mode). The restriction plays no part. The suggestion is seeded by the doodle alone
    ([C6.2](master-spec.md#c6-the-key-and-mode-suggestion), spec D251).
- **Files:** `src/domain/key-suggestion/key-suggestion.ts`, `key-suggestion-scores.ts`,
  `key-suggestion-draw.ts`, `key-suggestion-names.ts` (all new); tests under
  `tests/unit/domain/key-suggestion/`, the research note's worked examples among them; an
  in-browser test (harness) that computes the suggestion for a fixed doodle list, for H6.
- **Spec sections:** [C6.1](master-spec.md#c6-the-key-and-mode-suggestion) to
  [C6.3](master-spec.md#c63-when-nothing-is-suggested),
  [C6.5](master-spec.md#c65-use-it-keep-mine-and-jam-again-on-this-doodle) (the family's labels),
  [C10.1](master-spec.md#c101-presets-and-the-key-and-mode-restriction-v31); items 21, 22 (the
  rules), 24 (the names), 6 (the filter's half).
- **Atoms:** `req_key_and_mode_suggestion`, `rule_suggestion_candidates`,
  `rule_suggestion_same_doodle_same_answer`, `rule_suggestion_withheld`,
  `rule_doodle_outside_modes_told`, `rule_suggestion_ignores_restriction`,
  `rule_suggestion_named_in_players_family`. Drift check: `module_named_stream_pseudorandomness`.
- **Revisions:** none.
- **Done when:**
  - The research note's worked examples give its answers; each threshold and the 80 % rule at
    their edges; the selection among the kept candidates gives nothing; Major and Ionian, Minor and
    Aeolian compared as the same.
  - The same doodle gives the same answer every run; no floating-point operation on the path (a
    test over the modules' sources); golden answers for a fixed list, identical in Chromium and in
    Edge (H6).
  - A doodle transposed by a fifth gives the answer transposed, and a preset restriction changes
    nothing (property).
  - Scoring 64 notes takes under a millisecond (recorded).
- **Verification:** chunk checks; H6.
- **Split rule:** none needed (four new pure modules).

### Chunk 15 — Vary settings' allowed groups

Status: planned
Wave: 1
Depends on: 0 (and v3.1 chunks 12 and 15, the figure step and the restriction bound; v3.0 chunk
23, the seed plan)
Architecture capture: the run-time exclusion of groups in the settings mutation: each mutable
setting's group (Key and mode, Harmony, Tension, Rhythm, Melody shape, Figures); a setting of a
disallowed group skipped by the same route as an unsupported landing is redrawn, so with all six on
the draws consume the stream exactly as v3.1's; the legal-move check, a pure function the controls
call at Idle (chunk 19).

- **Goal:** let Vary settings move only the settings of the allowed groups, never the Rhythm group
  under the lock, with the legal-move check and the narrow mid-session skip.
- **Scope:**
  - **Groups** (`src/session/settings-mutation-scales.ts`) and the draw (`drawMutation`,
    `src/session/settings-mutation.ts`), as the capture says (chunk 2's corpus).
  - **The legal-move check**: at least one move from the current settings onto a supported
    combination, among the eligible groups (Rhythm not counting under the lock; Key and mode
    counting only inside the restriction in force, v3.1 chunk 15).
  - **The session's settings** hold the groups and whether the lock is on; a session started
    while no move exists runs without Vary settings. The session seed plan (v3.0 chunk 23) takes
    the groups.
  - **A dead end mid-session** (only after a narrow-window step-down): that mutation is skipped
    and recorded in the session history; the next is drawn as usual; nothing throws. The throw
    stays only for unsupported input settings, which a session can no longer start with.
- **Files:** `src/session/settings-mutation-scales.ts`, `settings-mutation.ts`,
  `src/session/session-mutation-step.ts`, `session-types.ts`, `src/session/session-seed-plan.ts`
  (v3.0), `src/session/session-history.ts`; tests under `tests/unit/session/` (the four tests of
  [Read first](#read-first-what-v32-changes-in-v2-v30-and-v31) rewritten).
- **Spec sections:** [C9](master-spec.md#c9-vary-settings-allowed-groups),
  [C7.7](master-spec.md#c77-what-the-lock-meets) (Vary settings),
  [C10.1](master-spec.md#c101-presets-and-the-key-and-mode-restriction-v31); item 33.
- **Atoms:** `rule_vary_settings_allowed_groups`, `rule_vary_settings_needs_legal_move`,
  `rule_vary_settings_skips_dead_end`; (v3.1) `rule_vary_settings_stays_inside_restriction`,
  `rule_vary_settings_figure_step`. Drift check: `module_settings_mutation`.
- **Revisions:** revise `req_settings_mutation_flag`,
  `rule_mutation_rerolls_unsupported_combination`, `rule_mutation_draws_setting_then_direction`.
- **Done when:**
  - With all six groups on, chunk 2's Vary settings corpus passes byte for byte.
  - With any subset, over many seeded sessions, every move is of an allowed group; under the lock
    the Rhythm group never moves.
  - The legal-move check is false exactly when no move exists (property over random settings,
    groups, lock and restriction); a session started then runs without Vary settings.
  - A seeded step-down that leaves a dead end skips one mutation, records it, and never throws.
- **Verification:** chunk checks with the corpus guard; the sweep at the wave gate.
- **Split rule:** if the brief passes about five source files, 15a the groups in the draw and the
  legal-move check (scales, mutation), 15b the session's side (the mutation step, the session's
  settings and types, the seed plan, the dead-end record).

### Chunk 16 — The rhythm lock in a session

Status: planned
Wave: 3
Depends on: 11 (and v3.0 chunks 23 and 24)
Architecture capture: none (it builds on chunk 11's)

- **Goal:** run the lock through a session: phrase 1's bars locked at Start, every request
  carrying them, the tenser flag and the allowed changes, the re-lock after a narrow-window
  step-down, and nothing shown.
- **Scope:**
  - **At Start** (outside a Jam), the session freezes phrase 1's bars (the phrase on screen) and
    the allowed rhythm changes. Every later request carries "on, these bars", the allowed changes,
    and the tenser flag from Tension across phrases (`tensionArcCycleStep`,
    `src/session/tension-arc-cycle.ts`: the second phrase of each group of four, unless already
    Edge). A Tension step made by Vary settings is never a tenser phrase.
  - **Every rung of the ladder** keeps the lock (`src/session/failure-ladder.ts`,
    `src/session/session-intents.ts`).
  - **The re-lock:** the first phrase generated with Eighth after a narrow-window step-down takes
    the nearest Eighth rhythm (its request holds the old bars; the generator's forced-bend order
    finds it, with no change drawn: [C7.1](master-spec.md#c71-the-switch-and-what-is-locked),
    [C7.4](master-spec.md#c74-when-a-phrase-changes), spec D251), and the session locks that
    phrase's bars for the rest of the session.
  - **The history** records each phrase as locked, changed (with its kind), forced bend, re-lock
    or no change available; nothing is shown in the live view.
  - **Pre-generation** (v3.0 chunk 24) follows the lock: the seed plan takes the lock, phrases 2–5
    carry phrase 1's bars and draw exactly as the session would.
- **Files:** `src/session/session-intents.ts`, `session-runner.ts`, `failure-ladder.ts`,
  `session-types.ts`, `session-history.ts`, `src/session/rhythm-lock-session.ts` (new),
  `src/session/session-seed-plan.ts` (v3.0), `src/composables/generation-session-pregeneration.ts`
  (v3.0); tests under `tests/unit/session/`, `tests/unit/composables/`.
- **Spec sections:** [C7.1](master-spec.md#c71-the-switch-and-what-is-locked),
  [C7.4](master-spec.md#c74-when-a-phrase-changes), [C7.7](master-spec.md#c77-what-the-lock-meets),
  [C10.5](master-spec.md#c105-pre-generation-v30); items 26, 27, 30 (re-lock), 31, 28 (nothing in
  the live view; e2e in chunk 19).
- **Atoms:** `rule_rhythm_lock_strict`, `rule_locked_rhythm_is_phrase_one`,
  `rule_rhythm_lock_relocks_after_step_down`, `rule_rhythm_change_lasts_one_phrase`,
  `rule_rhythm_changes_never_shown`; (v3.0) `rule_pregenerated_phrase_matches_session`; (v2)
  `rule_multi_phrase_tension_arc_cycle`, `rule_session_density_only_steps_down`. Drift check:
  `service_session_runner`, `module_session_failure_ladder`, `service_session_history`.
- **Revisions:** revise `rule_look_ahead_deadline` (only if the lock touches it; else in chunk
  18).
- **Done when:**
  - Over seeded sessions with the lock on and no kind allowed, every phrase has phrase 1's bars,
    apart from forced bends, which the history records (item 26).
  - With kinds allowed: at most one change per phrase, never on phrase 1, the next phrase back to
    the locked bars, tenser phrases drawing about twice as often (item 27).
  - A seeded narrow-window step-down: the first Eighth phrase's bars are locked from then on (item
    30).
  - With pre-generation (fake clock, instant generator), the session's phrases are identical with
    it on and off, changes included (item 31).
  - With the lock off, the v3.1 corpus and chunk 2's Vary settings corpus pass.
- **Verification:** chunk checks with the corpus guard; the sweep at the wave gate.
- **Split rule:** if the brief passes about five source files, 16a the lock in the session's
  requests (intents, runner, ladder, types, the lock module, the history), 16b pre-generation
  follows the lock (the seed plan, the pre-generation composable).

### Chunk 17 — Jam engine, part 1: the count-in and the capture

Status: planned
Wave: 2
Depends on: 4 (and v3.0 chunk 25, the filter; v3.0 chunk 23, the seed plan: a fresh Jam fixes its
session seeds at Start, [C6.2](master-spec.md#c6-the-key-and-mode-suggestion), spec D251)
Architecture capture: a session that starts without phrase 1, and the capture's state machine.
`src/session/jam/` holds the capture's states (count-in, capture, tentative generation measure,
generation measure, extended wait, read-in), driven by the click plan's beat grid (`beatAt`,
`src/audio/click-track.ts`) on the injected audio clock, and phrase 1's ladder (chunk 18). The
session engine gains one way in, "start without phrase 1", and joins its usual running state when
phrase 1 sounds. The cue row's phase (count-in, capture with the current measure, writing,
read-in) is engine state that chunk 21 reads.

- **Goal:** start a fresh Jam on a Start click or the home note, count in, capture the doodle until
  its end by silence or by length, and end the Jam cleanly before phrase 1 for every reason C5.13
  gives.
- **Scope:**
  - **The starting note in Jam mode** (`src/session/starting-note.ts`): the selected key's home
    note in written pitch, in the octave nearest the middle of the instrument's written range (the
    lower of two equally near), matched at its exact concert pitch; it starts the count-in only and
    belongs to no doodle.
  - **The engine's new way in** (`src/session/session-engine.ts`, beside `createSessionEngine`'s
    phrase-1 path): a start with no phrase 1, which neither records a phrase 1 nor requests phrase
    2 at Start, and a start (`workspace-session-start.ts`) that queues no backing; the count-in as
    v2's; the click forced on from the count-in to the end of the read-in measure whatever the
    click switch says, at the click volume, by extending the count-in's existing bypass of the
    click gain (`web-audio-session-bus.ts`); no backing before phrase 1.
  - **The capture** (`src/session/jam/jam-capture.ts`, new), on the click plan's beat grid: notes
    through the stray-note filter, each belonging by its snapped start (chunk 4); the doodle's
    first measure is the one holding its first note; at each barline after it, with no note
    sounding, a "tentative generation measure" begins (chunk 18 starts an attempt there); a doodle
    note inside it cancels the attempt and the measure joins the doodle; a measure beginning with a
    note sounding is never silent; after four measures the doodle ends, a held note cut at that
    barline. The doodle is quantized once, at its end. Notes after the end belong to nothing.
  - **Ends before phrase 1:** no doodle note within 30 s after the count-in (very short notes not
    counting); the controller lost (at once, no countdown); Stop; the tab hidden; the staff no
    longer shown. Each ends as a count-in end: back to Idle, no review, nothing kept, the doodle
    not held. Neither the home note nor a doodle note arms the silence timer
    (`src/session/session-midi-timers.ts`).
  - **The history** keeps the raw doodle notes as played notes marked as the doodle's, and the
    quantized doodle with the session's tempo as its capture tempo.
  - The cue row's phase is exposed as engine state; nothing is drawn yet.
- **Files:** `src/session/starting-note.ts`, `session-engine.ts`, `session-engine-state.ts`,
  `session-midi-timers.ts`, `session-history.ts`, `session-history-played-notes.ts`,
  `src/session/jam/jam-capture.ts`, `src/session/jam/jam-phase.ts` (new),
  `src/audio/web-audio-session-bus.ts`, `src/audio/audio-transport.ts`,
  `src/components/workspace/workspace-session-start.ts`, `workspace-session-begin.ts`,
  `workspace-session-midi.ts` (notes routed to the capture); tests under `tests/unit/session/jam/`,
  `tests/unit/session/`, `tests/unit/audio/`.
- **Spec sections:** [C5.2](master-spec.md#c52-starting-a-jam),
  [C5.3](master-spec.md#c53-the-count-in-and-the-click),
  [C5.4](master-spec.md#c54-capturing-the-doodle-where-it-starts-and-where-it-ends),
  [C5.13](master-spec.md#c513-edge-cases-before-phrase-1-sounds),
  [C10.6](master-spec.md#c106-stray-notes-v30); items 3 (engine), 4 (engine), 5, 6 (the 30-second
  wait), 16 (engine half).
- **Design docs:** [`flows/jam/handoff.md`](../../../ui_ux/flows/jam/handoff.md) (A Jam; Routing
  Rules: Terms, The starting note, Count-in, The click, Capture, Ends before phrase 1 sounds),
  [`flows/play-session/handoff.md`](../../../ui_ux/flows/play-session/handoff.md) (The starting
  note in a Jam; The count-in of a fresh Jam; the silence timer).
- **Atoms:** `req_jam`, `rule_jam_starting_note_is_home_note`, `rule_jam_start_conditions`,
  `rule_jam_click_runs_until_phrase_one`, `rule_jam_no_backing_before_phrase_one`,
  `rule_jam_live_view_never_shows_doodle`, `rule_doodle_capture_start`,
  `rule_doodle_ends_by_silence`, `rule_doodle_ends_by_length`,
  `rule_notes_after_doodle_belong_nowhere`, `rule_jam_without_doodle_note_ends`,
  `rule_jam_silence_timer_from_phrase_one`, `rule_jam_controller_loss_before_phrase_one`,
  `rule_jam_ending_before_phrase_one`, `rule_raw_doodle_notes_are_played_notes`; (v2, STABLE)
  `rule_midi_starting_note`, `rule_count_in_shown_on_screen`, `rule_silence_timeout_ends_session`,
  `rule_controller_loss_mid_session`. Drift check: `module_session_starting_note`,
  `module_session_silence_timeout`, `module_session_controller_loss`, `service_session_engine`,
  `service_session_start`, `service_session_history`.
- **Revisions:** revise `rule_session_start_conditions`, `rule_starting_note_only_starts_count_in`,
  `rule_count_in_always_clicks`, `rule_click_track`, `rule_count_in_ending_returns_to_idle`,
  `rule_hidden_tab_ends_session`, `rule_stop_ends_session`,
  `rule_session_history_records_played_notes`.
- **Done when:** on the fake clock with fake MIDI,
  - the home note in C5.2's octave starts a fresh Jam (each built-in instrument and a player-made
    one, the octave tie included); no other note at Idle starts anything;
  - the click sounds every beat from the count-in on with the click switch off; no backing is
    scheduled;
  - each end rule of C5.4 is a test: silence after one, two and three measures; four measures with
    a held note cut; a note inside the tentative measure extends the doodle; a measure beginning
    with a held note that ends at once is not silent; an early note onto beat 1 belongs to the
    doodle;
  - no doodle note within 30 s (very short ones not counting) ends the Jam; at 29.9 s it still
    runs;
  - a controller lost, Stop, a hidden tab and a lost staff during the count-in and the capture each
    end it with no review and nothing kept; the silence timer is never armed before phrase 1;
  - outside Jam mode every v2 starting-note, count-in, silence and controller test passes
    unchanged.
- **Verification:** chunk checks; the sweep at the wave gate.
- **Split rule:** if the brief passes about five source files, 17a the way in (the starting note,
  the start without phrase 1, the forced click, the timers left unarmed), 17b the capture, its
  history and the ends before phrase 1.

### Chunk 18 — Jam engine, part 2: from the doodle to phrase 1

Status: planned
Wave: 4
Depends on: 7, 9, 14, 16, 17 (and v3.0 chunk 23, the seeds)
Architecture capture: none (it builds on chunk 17's)

- **Goal:** write phrase 1 from the doodle within the generation measure, extend the wait by whole
  measures up to the deadline, fall down the three rungs, show phrase 1 with its read-in measure,
  and run the Jam as any session from phrase 1.
- **Scope:**
  - **The attempts:** at the tentative generation measure (chunk 17) the first attempt starts,
    with the doodle group, the doodle-origin join (chunk 7), and with the lock on "on, nothing
    locked yet"; a doodle note cancels it on the worker (v2's cancellation).
  - **The ladder** (`src/session/jam/jam-phrase-one.ts`, new): rung 1, the join and the
    preferences, with v2's carry-in retries (a fresh seed each from the seed plan, skipped after a
    search that covered every candidate); rung 2, one attempt with the preferences and no join;
    rung 3, v2's standalone phrase with no doodle at all. The **deadline** is three measures after
    the generation measure begins; once less than the standalone reserve
    (`STANDALONE_RESERVE_SECONDS`) is left, no rung 1 or 2 attempt starts, the running one is
    cancelled and rung 3 is requested at once. A phrase 1 that does not engrave in the session
    staff layout is a failed attempt.
  - **Showing:** phrase 1 at the first barline at or after it is ready, then one read-in measure,
    then it sounds with the backing. Phrase 2 is requested as soon as phrase 1 is ready, its
    deadline the start of phrase 1's last measure.
  - **Every rung failed by the deadline:** the Jam ends as a count-in end, and the engine reports
    why (chunk 21 shows `jam-notice`).
  - **From phrase 1:** a v2 session; every request carries the doodle group (phrases 2 onward join
    the phrase before, every rung keeping the preferences); with the lock on, phrase 1's bars are
    locked (chunk 16), a rung-3 phrase 1 keeping its own; Vary settings, Tension across phrases and
    Rising tempo count from phrase 1; the silence timer waits for a first note from phrase 1 on;
    the narrow-window step-down applies from phrase 1.
  - **The suggestion** (chunk 14) is computed when the doodle ends and kept with the session;
    nothing is shown.
- **Files:** `src/session/jam/jam-phrase-one.ts` (new), `src/session/session-timing.ts` (the
  Jam's deadlines beside `phraseTwoDeadline`), `session-engine.ts`, `session-runner.ts`,
  `session-intents.ts`, `failure-ladder.ts` (its rungs reused, not changed), `session-history.ts`;
  tests under `tests/unit/session/jam/`, `tests/unit/session/`, the sweep's Jam phase.
- **Spec sections:** [C5.6](master-spec.md#c56-from-the-doodle-to-phrase-1-the-generation-and-read-in-measures),
  [C5.7](master-spec.md#c57-when-phrase-1-is-late-the-extended-wait-and-the-fallback),
  [C5.8](master-spec.md#c58-the-time-budget),
  [C5.9](master-spec.md#c59-what-the-doodle-feeds-the-generator),
  [C5.12](master-spec.md#c512-during-the-jam), [C7.1](master-spec.md#c71-the-switch-and-what-is-locked),
  [C10.8](master-spec.md#c108-other-session-rules); items 8 (engine), 9, 16 (the failure), 17, 30
  (Jam half), 13 (the sweep's phrase 1 is now the real ladder).
- **Design docs:** [`flows/jam/handoff.md`](../../../ui_ux/flows/jam/handoff.md) (Generation
  measure, Extended wait, Every rung failed, Read-in measure, Phrase 1 sounds),
  [`flows/play-session/handoff.md`](../../../ui_ux/flows/play-session/handoff.md) (Phrase 1 of a
  fresh Jam; the step-down from phrase 1).
- **Atoms:** `rule_two_measures_before_jam_phrase_one`, `rule_jam_phrase_one_deadline`,
  `rule_jam_phrase_one_failure_ladder`, `rule_jam_ends_when_phrase_one_never_comes`,
  `rule_every_jam_phrase_carries_doodle`, `rule_jam_runs_as_session_from_phrase_one`,
  `rule_doodle_only_orders_candidates`; (v2, STABLE) `rule_session_generation_failure_ladder`,
  `rule_dropped_attempt_cancelled`, `rule_session_density_only_steps_down`. Drift check:
  `module_session_look_ahead_timing`, `module_session_failure_ladder`, `service_session_runner`,
  `service_session_controller`, `module_generation_worker_cancellation`.
- **Revisions:** revise `rule_phrase_one_is_idle_phrase`, `rule_look_ahead_deadline`,
  `req_rolling_practice_session`, `rule_no_carry_in_output_matches_v1`.
- **Done when:** on the fake clock, with the held-generation harness,
  - an instant generator shows phrase 1 at the generation measure's end and sounds it one measure
    later: two measures between the doodle and phrase 1, at 60, 120 and 240 BPM;
  - a slow generator: the wait grows by whole measures; rung 2 and rung 3 are reached in order; at
    240 BPM, no rung 1 or 2 attempt starts with less than the reserve left;
  - every rung failing ends the Jam with no review, nothing kept, and the failure reported;
  - phrase 2's deadline is the start of phrase 1's last measure;
  - with the lock on, phrase 1 is the candidate nearest the doodle and is then held (item 30); a
    rung-3 phrase 1's own rhythm is held;
  - the doodle changes no setting: the controls after a Jam equal those before (item 9);
  - Vary settings, Tension across phrases and Rising tempo count from phrase 1 (item 17).
- **Verification:** chunk checks with the corpus guard; the sweep at the wave gate; M1 re-run with
  the real ladder at the wave gate.
- **Split rule:** if the brief passes about five source files, 18a the ladder and the deadlines up
  to phrase 1 sounding (the phrase-1 module, the timing, the engine), 18b the Jam from phrase 1 on
  (the runner, the intents, the history: the doodle group on every request, the lock's bars, the
  counts, the suggestion kept).

### Chunk 19 — The rhythm lock and What may vary in the controls

Status: planned
Wave: 4
Depends on: 1, 15, 16 (and v3.0 chunks 6 and 7; v3.1 chunk 14, the Embellishments group before
"During a session")
Architecture capture: the "During a session" group's dependent controls and options:
`FieldDependent.vue` (a dependent shown under its switch, appearing and leaving at once, only at
Idle and in the review mode, its read-only state) and `ToggleList.vue` (a list of toggles, its
read-only and disabled states); the session-options composable (`use-session-options.ts`) that
holds each option, judges its availability and saves it; each new option a record of its own in
`settings` (the five v3.2 settings, here and in chunk 20), no migration, a missing record taking its
default. Chunk 20 builds the Jam and Drift controls on them in the same wave.

- **Goal:** the Rhythm lock with its Allowed rhythm changes, and Vary settings' What may vary, in
  "During a session", saved, with Vary settings unavailable when no move exists.
- **Scope:**
  - `field-group` **Rhythm lock** (Off, On) with its note, and its `field-dependent` **Allowed
    rhythm changes**: a `toggle-list` of five ("Move a note", "Move a rest", "Split a note", "Merge
    two notes", "Add or remove a rest"), all off by default, with its note; shown only while the
    lock shows On, its values kept while hidden.
  - Under **Vary settings**, the v3.2 note, and the `field-dependent` **What may vary**: six
    toggles, all on; "Rhythm" disabled and shown off while the lock shows On, with "The rhythm lock
    holds the rhythm."; **unavailable for lack of a move** (chunk 15's check): On disabled, Off
    shown checked, "Nothing is allowed to vary with these choices. Turn on another group below.",
    the stored choice kept, judged at Idle and in the review mode after any change of the groups,
    the lock, a preset or a setting.
  - Read-only during Loading and a session with the choices the session runs with; dependents
    appear and leave at once, only at Idle and in the review mode.
  - **Saving** (v3.0 chunks 5–7): the lock, the allowed changes and the groups, each a `settings`
    record, saved when the player changes it, never during a session; tolerant loading (an unknown
    or invalid value takes its default; a stored "Rhythm" group kept while the lock disables it).
  - Changing either at Idle discards the pre-generated phrases (the full matrix is chunk 26's).
  - The live view never marks a change or a forced bend (e2e over a seeded session).
- **Files:** `src/components/controls/SessionOptions.vue` (or the existing "During a session"
  group's component), `src/components/controls/ToggleList.vue` (new),
  `src/components/controls/FieldDependent.vue` (new),
  `src/components/workspace/use-session-options.ts`, `src/storage/records/settings-record.ts`;
  tests `tests/unit/components/controls/ToggleList.spec.ts`,
  `tests/e2e/workspace/rhythm-lock-controls.spec.ts`,
  `tests/e2e/workspace/vary-settings-groups.spec.ts`,
  `tests/e2e/storage/session-options-v32.spec.ts` (new).
- **Spec sections:** [C7.1](master-spec.md#c71-the-switch-and-what-is-locked),
  [C7.2](master-spec.md#c72-allowed-rhythm-changes-the-option),
  [C9](master-spec.md#c9-vary-settings-allowed-groups),
  [C10.2](master-spec.md#c102-saving-the-new-settings-v30-storage),
  [C12](master-spec.md#c12-for-the-interface-design); items 33 (UI), 34 (three of the five), 28
  (live view), 26 and 27 (e2e).
- **Design docs:** [`screens/phrase-workspace/handoff.md`](../../../ui_ux/screens/phrase-workspace/handoff.md)
  (Layout Tree: "During a session"; Components and Content: Rhythm lock, Vary settings, What may
  vary, Unavailable for lack of a move, Saved settings; Responsive Behavior),
  [`flows/play-session/handoff.md`](../../../ui_ux/flows/play-session/handoff.md) (The rhythm lock
  during a session; Vary settings' allowed groups),
  [`flows/saved-data/handoff.md`](../../../ui_ux/flows/saved-data/handoff.md) (What Is Saved; Load).
- **Atoms:** `req_rhythm_lock`, `rule_allowed_rhythm_changes`, `rule_rhythm_changes_never_shown`,
  `rule_vary_settings_allowed_groups`, `rule_vary_settings_needs_legal_move`; (v3.0)
  `rule_saved_setting_is_players_choice`, `rule_no_save_during_session`. Drift check:
  `module_session_vary_settings_flag`.
- **Revisions:** revise `rule_settings_saved_on_change`, `rule_saved_settings_load_tolerantly`
  (their v3.2 halves for these three settings).
- **Done when:**
  - The lock and each kind set in the controls reach the session's requests (harness reads the
    intents); the list is hidden and kept while the lock is off.
  - Each group toggled off is never moved over a seeded session; "Rhythm" disabled under the lock,
    its stored value back when the lock goes off.
  - Choices that leave no move (only "Rhythm" on with the lock on; only "Key and mode" on under a
    player preset restricted to one key and mode) show the unavailable state with its sentence;
    the stored On returns as soon as a move exists.
  - Each value survives a reload; a corrupt record loads its default; v3.1 data loads the
    defaults.
  - Nothing in the live view changes on a changed phrase or a forced bend.
  - Phone landscape stacks each dependent under its switch; no toggle is cut. Then **H4** (L3) and
    **H9** with the owner.
- **Verification:** chunk checks; the accessibility checks of what it adds; phone and desktop debug
  runs; the bundle at the wave gate; H9.
- **Split rule:** none needed (five source files).

### Chunk 20 — Jam mode at Idle

Status: planned
Wave: 4
Depends on: 1, 17, 19 (the dependent control and the session options), LD (the Drift control) (and
v3.0 chunks 7, 22 and 24)
Architecture capture: none (it builds on chunk 19's)

- **Goal:** the Jam switch and Drift, Jam mode in and out of effect with the controller, and Jam
  mode's Idle: the empty staff, `Start Jam` and the home note named.
- **Scope:**
  - `field-group` **Jam** (Off, On), first in "During a session", unavailable without a connected
    controller as Rising tempo is, the stored choice kept; its `field-dependent` **Drift** (Close,
    Near, Free; Near by default). Both saved like the session options (tolerant, defaults Off and
    Near).
  - **Jam mode in effect** (the switch On and a controller attached), judged at Idle and in the
    review mode: turning it on, or a controller attaching with Jam stored On (at load too, through
    v3.0 chunk 22's remembered controller), discards at once and silently the phrase on screen,
    every prepared phrase, a failure banner, a notation error, a too-many-notes notice and a
    generation in flight; a no-room notice stays.
  - **Jam mode at Idle**: `staff-frame staff-jam`, the empty system engraved by the notation
    pipeline (clef, the key signature of the selected key and collection, 4/4, no barline, placed
    by the instrument's rule at the breakpoint's scale) and `jam-instruction`; redrawn at once on a
    key, mode or instrument change; `Generate phrase` disabled and secondary; `Start Jam` primary,
    under the start conditions (chunk 17); `start-note-line` naming the home note with its octave
    number, no marker. No phrase generated, prepared or replaced; the rhythm prewarm still runs.
  - **Leaving Jam mode** (the switch off, the controller lost) shows **Empty**: nothing generated
    until `Generate phrase`.
  - `jam-notice` placed and shown on demand (chunk 21 raises it).
- **Files:** `src/components/controls/SessionOptions.vue`,
  `src/components/workspace/use-session-options.ts`, `src/components/workspace/use-jam-mode.ts`
  (new), `ScorePanel.vue`, `WorkspaceHeader.vue`, `src/components/workspace/session-action-policy.ts`,
  `src/notation/empty-system-engraving.ts` (new, beside `vexflow-engraver.ts`),
  `src/components/workspace/prewarm-policy.ts`,
  `src/composables/generation-session-pregeneration.ts` (v3.0; stops in Jam mode),
  `src/storage/records/settings-record.ts`; tests
  `tests/unit/notation/empty-system-engraving.spec.ts`, `tests/e2e/workspace/jam-mode-idle.spec.ts`
  (new).
- **Spec sections:** [C5.1](master-spec.md#c51-jam-mode), [C5.2](master-spec.md#c52-starting-a-jam),
  [C8](master-spec.md#c8-jams-drift), [C10.2](master-spec.md#c102-saving-the-new-settings-v30-storage),
  [C10.5](master-spec.md#c105-pre-generation-v30), [C12](master-spec.md#c12-for-the-interface-design);
  items 1, 2, 3 (Idle half), 34 (two of the five), 35 (no pre-generation in Jam mode).
- **Design docs:** [`flows/jam/handoff.md`](../../../ui_ux/flows/jam/handoff.md) (Jam Mode In and
  Out of Effect; Routing Rules: Jam mode in and out of effect, Turning Jam mode on, Leaving Jam
  mode at Idle, Jam mode at Idle, Start conditions, The starting note, At load),
  [`screens/phrase-workspace/handoff.md`](../../../ui_ux/screens/phrase-workspace/handoff.md) (Jam,
  Drift; Jam mode's staff; the action table; The starting note in Jam mode; Notation Contract: The
  empty system; States: Jam mode at Idle, Leaving Jam mode; Responsive Behavior),
  [`flows/generate-phrase/handoff.md`](../../../ui_ux/flows/generate-phrase/handoff.md) (Jam mode).
- **Atoms:** `rule_jam_needs_controller`, `rule_jam_idle_shows_no_phrase`,
  `rule_jam_starting_note_is_home_note`, `rule_jam_start_conditions`, `rule_jam_drift_positions`;
  (v2, STABLE) `rule_midi_never_blocks_session`. Drift check: `service_idle_generation_session`.
- **Revisions:** revise `req_idle_pregeneration`, `rule_settings_saved_on_change`,
  `rule_saved_settings_load_tolerantly` (the Jam and Drift halves).
- **Done when:**
  - The switch is off at first; without a controller On is disabled with its note, the stored On
    kept and back when a controller attaches; Idle and Start then behave as with Jam off.
  - Turning Jam on discards the phrase on screen and every prepared phrase (spy on the queue);
    `staff-jam` shows the key signature of each of the nine collections in two keys; turning it off shows
    Empty and generates nothing.
  - `start-note-line` names the home note with its octave for each built-in instrument; `Start
    Jam` disabled under the unsupported-rhythm alert, Needs more room and Notation error.
  - Drift shown only while Jam shows On; Jam and Drift survive a reload; presets never change them.
  - Phone landscape: the empty system and the instruction at every breakpoint.
- **Verification:** chunk checks; the accessibility checks of what it adds; phone and desktop debug
  runs; the bundle at the wave gate.
- **Split rule:** if the brief passes about five source files, 20a the switch, Drift and Jam mode
  in and out of effect (the session options, the Jam-mode composable, the record, the prewarm and
  pre-generation stops), 20b Jam mode's Idle on screen (the score panel, the header, the action
  policy, the empty system).

### Chunk 21 — A fresh Jam on screen

Status: planned
Wave: 5
Depends on: 18, 20
Architecture capture: how a Jam's end reaches the workspace and the review: what the review host
receives from an ended Jam (its session history, with the quantized doodle and its capture tempo,
the raw doodle notes and the suggestion kept by chunk 18), and the state the workspace takes after
it (Jam mode's Idle, or Empty when the controller is away). Chunk 23 builds the review's doodle
section on it in the same wave.

- **Goal:** show a fresh Jam from Start to phrase 1: the cue row's capture and writing, phrase 1
  entering at the read-in measure, the ends before phrase 1, and `jam-notice`.
- **Scope:**
  - `session-cue-row`: `count-in` during the count-in; `jam-capture` ("Your doodle", "Doodle" on
    the phone, numbers 1 to 4 lit on the audio clock: `is-current` from the doodle's first note,
    then at each barline); `jam-writing` (static) during the tentative and real generation measures
    and an extended wait; `count-in` again in the read-in measure. The staff keeps `staff-jam`; no
    doodle note, playhead or mark is drawn.
  - **Read-in:** at its barline `staff-jam` fades out and phrase 1 enters in the session staff
    layout held from the start; phrase 2 enters the bottom system when engraved.
  - **Ends before phrase 1:** back to Jam mode's Idle, `staff-jam` back, focus on `Start Jam`; a
    lost controller shows Empty with focus on the phrase action; a viewport with no room shows
    Needs more room; only a failed phrase 1 shows `jam-notice` ("The app couldn't continue your
    doodle with these settings. Try again, or change a setting."), named by `Start Jam`'s
    `aria-describedby`, until the next start or a control change.
  - **The session end in Jam mode:** the hidden workspace takes Jam mode's Idle (no new phrase); a
    controller away at the end leaves Jam mode.
  - During the Jam nothing is asked or offered: no button beyond Stop, no sheet.
- **Files:** `src/components/workspace/SessionCueRow.vue`, `JamCapture.vue`, `JamWriting.vue`
  (new), `ScorePanel.vue`, `workspace-session-display.ts`, `workspace-session-ends.ts`,
  `session-end-focus.ts`, `workspace-session-begin.ts`, `create-workspace-session.ts`; tests
  `tests/e2e/session/jam-fresh.spec.ts`, `tests/e2e/session/jam-ends-before-phrase-one.spec.ts`
  (new).
- **Spec sections:** [C5.3](master-spec.md#c53-the-count-in-and-the-click) to
  [C5.7](master-spec.md#c57-when-phrase-1-is-late-the-extended-wait-and-the-fallback),
  [C5.12](master-spec.md#c512-during-the-jam), [C5.13](master-spec.md#c513-edge-cases-before-phrase-1-sounds),
  [C12](master-spec.md#c12-for-the-interface-design); items 3, 4, 8, 16, 17, 23 (never during a
  Jam).
- **Design docs:** [`flows/jam/handoff.md`](../../../ui_ux/flows/jam/handoff.md) (A Jam; Routing
  Rules from Count-in to Ends before phrase 1 sounds),
  [`screens/phrase-workspace/handoff.md`](../../../ui_ux/screens/phrase-workspace/handoff.md) (The
  Jam's cue row; States: Jam count-in, Jam capture, Jam writing, Jam read-in, Jam ended before
  phrase 1; Session end), [`flows/play-session/handoff.md`](../../../ui_ux/flows/play-session/handoff.md)
  (Starting a Jam; A fresh Jam ended before phrase 1 sounds; The end of a Jam),
  [`flows/review-and-export/handoff.md`](../../../ui_ux/flows/review-and-export/handoff.md) (The
  next phrase in Jam mode).
- **Atoms:** `req_jam`, `rule_jam_live_view_never_shows_doodle`, `rule_jam_ending_before_phrase_one`,
  `rule_jam_ends_when_phrase_one_never_comes`, `rule_jam_runs_as_session_from_phrase_one`; (v2,
  STABLE) `rule_count_in_shown_on_screen`, `rule_midi_starting_note`.
- **Revisions:** revise `rule_session_end_generates_next_phrase_one`.
- **Done when:**
  - E2e on the harness (fake MIDI, fake clock): a Jam by `Start Jam` and one by the home note each
    reach Session running; the cue row's phases in order; no note appears on the staff during the
    capture; the audio spy hears the click with `Click` off and no backing until phrase 1.
  - Each end before phrase 1 (no note in 30 s, controller lost, Stop, hidden tab, no room, every
    rung failed) lands where the design says, with its focus; only the last shows `jam-notice`.
  - No note starts anything while the review shows.
  - Then **H5** and **H2** (L1) with the owner.
- **Verification:** chunk checks; the accessibility checks of what it adds; phone and desktop debug
  runs; H5; H2 (L1) after the wave.
- **Split rule:** if the brief passes about five source files, 21a the cue row and the read-in
  (the cue row and its two parts, the score panel, the session display), 21b the ends and the
  session end in Jam mode (the session ends, the end focus, the begin and create modules).

### Chunk 22 — Kept Jam sessions on the device

Status: planned
Wave: 5
Depends on: 12, 18 (and v3.0 chunks 4, 9–11, 14 and 15; v3.1 chunks 9 and 16, data versions 2 and
3)
Architecture capture: data version 4 and its upgrade step, inside v3.0's
[storage design](build-plan.md#the-storage-design-the-chunks-build-on), after v3.1's versions 2
and 3: the kept session's summary gains the Jam flag and the decline, its body the quantized doodle
and its capture tempo, each phrase's reproduction inputs the doodle and lock groups. The upgrade
step writes the summaries' Jam flag (false) and leaves pre-v3.2 bodies as they are, an absent field
reading as "none" in the body codec. Raw doodle notes are played notes, in v3.0's `playedNotes`
store, marked as the doodle's. Chunk 23 saves the decline through it in the same wave.

- **Goal:** keep a Jam session with its doodle in both forms, by the privacy split, migrate earlier
  sessions, mark Jam sessions in the list, and make the deletions and the visits that save nothing
  hold.
- **Scope:**
  - **Data version 4** (the migration runner of v3.0 chunk 4), as the capture says. M3's timing.
  - **The save** at the session's end, as any session (a Jam that ends before phrase 1 saves
    nothing): the quantized doodle and its capture tempo **whatever "Keep my played notes" says**;
    the raw doodle notes in the `playedNotes` record, marked as the doodle's, **only while it is
    on**. The decline is saved when the review's `Keep` is pressed (chunk 23).
  - **Deletions:** deleting a Jam session deletes both forms; deleting its played notes (one
    session, or all) deletes the raw doodle notes and keeps the quantized doodle; Delete everything
    removes every Jam session and resets the five v3.2 settings to their defaults.
  - **Visits that save nothing** (outdated tab, failed read): a Jam runs and is reviewed in memory;
    nothing is written, the decline included. A Jam session written by a newer version is listed
    as such and does not open.
  - **The list and the summary:** the session list's detail line and `review-summary` begin with
    "Jam" for a Jam session.
- **Files:** `src/storage/records/kept-session-record.ts` (and its summary module),
  `src/storage/records/played-notes-record.ts` (v3.0), `src/storage/migrations/kept-sessions-v4.ts`
  (new), `src/storage/database.ts`, the session-row text module (v3.0 chunk 14),
  `src/components/review/` (the summary), `src/components/workspace/use-your-data.ts` (v3.0);
  tests under `tests/unit/storage/`, `tests/e2e/storage/kept-jam-session.spec.ts` (new),
  `tests/e2e/review/review-privacy.spec.ts` (extended: the storage half with a Jam).
- **Spec sections:** [C5.14](master-spec.md#c514-the-doodles-two-forms),
  [C10.3](master-spec.md#c103-kept-sessions-and-played-notes),
  [C10.4](master-spec.md#c104-visits-that-save-nothing-outdated-tab-failed-read),
  [C10.7](master-spec.md#c107-delete-everything-and-your-data),
  [C11](master-spec.md#c11-the-generation-request-the-replay-key-and-kept-sessions); items 20
  (storage), 38, 39, 36 (the save half), 18 (the list's mark).
- **Design docs:** [`flows/kept-sessions/handoff.md`](../../../ui_ux/flows/kept-sessions/handoff.md)
  (Terms: Jam session; Keeping at a Session's End; Deleting a Session; Deletions Made Elsewhere;
  While Saving Is Off), [`flows/saved-data/handoff.md`](../../../ui_ux/flows/saved-data/handoff.md)
  (What Is Saved; Load; Your Data),
  [`screens/session-list/handoff.md`](../../../ui_ux/screens/session-list/handoff.md) (the detail
  line), [`screens/your-data/handoff.md`](../../../ui_ux/screens/your-data/handoff.md) (Overview
  copy; Confirmations: "Doodles stay as the app wrote them."),
  [`screens/last-session-review/handoff.md`](../../../ui_ux/screens/last-session-review/handoff.md)
  (`review-summary`; the played-notes confirmation in a Jam).
- **Atoms:** `rule_quantized_doodle_is_generation_input`, `rule_raw_doodle_notes_are_played_notes`,
  `rule_deleting_played_notes_keeps_quantized_doodle`, `rule_jam_in_visits_that_save_nothing`,
  `rule_jam_ending_before_phrase_one`; (v3.0) `rule_most_recent_session_kept`,
  `rule_outdated_tab_stops_saving`, `rule_failed_read_offers_only_delete_everything`; (v2, STABLE)
  `rule_optional_midi_privacy`.
- **Revisions:** revise `rule_kept_session_content`, `req_kept_session_list`,
  `rule_played_notes_kept_only_after_opt_in`, `rule_kept_played_notes_deletable`,
  `rule_delete_everything`.
- **Done when:**
  - A database seeded with v3.1 sessions (pinned, favorites, played notes, a comment, presets)
    opens at data version 4; each session opens as before, exports byte-identical, no "Jam".
  - A Jam session with the switch off: after a reload, the doodle and its tempo are back, no raw
    doodle note is in storage (the privacy spy's storage half); with it on, the raw notes are back,
    marked as the doodle's.
  - Deleting played notes keeps the doodle; deleting the session removes both; Delete everything
    empties the sessions and resets the five settings.
  - An outdated tab and a failed-read visit: a Jam runs and reviews, nothing is written.
  - The list's detail line and the summary begin with "Jam"; M3 recorded. Then **H8** at the
    release gate.
- **Verification:** chunk checks; M3 (this chunk's point); a debug run reloading a kept Jam
  session; H8 at the release gate.
- **Split rule:** if the brief passes about five source files, 22a the records, the version 4
  upgrade and the save (the kept-session and played-notes records, the migration, the database),
  22b the deletions, the visits that save nothing and the list's mark (the session-row text, the
  review summary, Your data).

### Chunk 23 — The review's doodle section and the suggestion

Status: planned
Wave: 5
Depends on: 14, 21, 22 (and v3.0 chunks 12 and 25; v3.1 chunks 10 and 13)
Architecture capture: none (it builds on chunk 21's and chunk 22's)

- **Goal:** open a Jam's review with the doodle as the app heard it, its played-notes lane, the
  suggestion with Use it and Keep mine, and `Jam again on this doodle`.
- **Scope:**
  - **`review-doodle`** between `review-view` and `review-list`: its header ("Your doodle", the
    capture tempo, `Jam again on this doodle` disabled without a controller with "Needs a connected
    controller."), its `review-staff` engraving the quantized doodle in the session instrument's
    written pitch, with the key signature the Jam started with, no chord symbol, its measures at a
    phrase's width from the system's start, the staff lines ending at its last barline; split
    below `bp-tablet-landscape`; the first item of the engraving order; "This doodle needs a wider
    window." or "…couldn't be drawn." by the phrase's rules; no number, no favorite, nothing
    acknowledged.
  - **The lane** over the doodle: the raw doodle notes, very short ones left out, anchored to the
    doodle's engraving, "Played notes, your doodle"; empty in a Jam on a held doodle.
    `review-view` and `Export played notes` count a note in the doodle (C5.15's rule).
  - **`suggestion-row`** (offering, set, no fit, absent), computed by chunk 14 and judged against
    the current key, mode and restriction in force whenever the review opens and whenever one of
    them changes while it shows; the restriction line when the answer lies outside it (v3.1's
    restriction in force and its preset name). **Use {answer}** sets Written key and Collection as
    a change by hand (saved, prepared phrases discarded, Custom under an excluding restriction, the
    Collection crossing to the modes); **Keep {key} {mode}** changes nothing and saves the decline
    into the session (chunk 22). Focus as the design says; nothing announced.
  - **`Jam again on this doodle`** leaves the review mode as `Close review` does and turns Jam on;
    holding the doodle is chunk 24's (until then the button only closes and turns Jam on, through
    the harness).
  - The `room-notice` stands in for the doodle section too.
- **Files:** `src/components/review/ReviewDoodle.vue`, `src/components/review/SuggestionRow.vue`,
  `src/components/review/use-key-suggestion.ts` (all new), `ReviewPanel.vue`,
  `review-engraving-window.ts`, `played-notes-lane-geometry.ts`, `played-notes-lane-view.ts`,
  `src/notation/doodle-engraving.ts` (new), `src/components/review/load-review-panel.ts` (the
  suggestion loads with the review); tests `tests/unit/components/review/SuggestionRow.spec.ts`,
  `tests/e2e/review/review-doodle.spec.ts`, `tests/e2e/review/review-suggestion.spec.ts` (new).
- **Spec sections:** [C5.15](master-spec.md#c515-the-review-and-the-exports),
  [C6.3](master-spec.md#c63-when-nothing-is-suggested), [C6.4](master-spec.md#c64-where-and-when-it-is-shown),
  [C6.5](master-spec.md#c65-use-it-keep-mine-and-jam-again-on-this-doodle),
  [C10.1](master-spec.md#c101-presets-and-the-key-and-mode-restriction-v31),
  [C12](master-spec.md#c12-for-the-interface-design); items 18, 22, 23, 24 (review half).
- **Design docs:** [`screens/last-session-review/handoff.md`](../../../ui_ux/screens/last-session-review/handoff.md)
  (`review-doodle`, `suggestion-row`, The doodle's lane, Focus and Keyboard, Responsive Behavior,
  States), [`flows/review-and-export/handoff.md`](../../../ui_ux/flows/review-and-export/handoff.md)
  (The Doodle and the Suggestion; Played Notes).
- **Atoms:** `rule_review_opens_with_doodle`, `rule_suggestion_shown_after_jam_only`,
  `rule_suggestion_use_it`, `rule_suggestion_keep_mine`, `rule_suggestion_withheld`,
  `rule_doodle_outside_modes_told`, `rule_suggestion_named_in_players_family`; (v2, STABLE)
  `rule_review_played_notes_toggle`, `req_last_session_review`; (v3.1) `rule_restriction_in_force`,
  `rule_custom_selection`. Drift check: `module_review_played_notes_lane`.
- **Revisions:** none.
- **Done when:**
  - The review of a just-ended Jam and of a kept one open with the doodle section, engraved from
    the quantized doodle (one-, two- and four-measure doodles), the lane under it when on; a
    session kept before v3.2 has none.
  - Each form of the suggestion row; the row leaves when the key and mode become a close answer;
    `Use` under Reel's restriction makes Custom, based on Reel; under Major an Ionian answer reads
    and sets "Major"; `Keep` declines for good, after a reload too.
  - "No fit" shows its sentence in every review of that Jam, never naming a note.
  - `Jam again on this doodle` disabled without a controller, enabled in place when one connects.
  - A screen reader reaches the section's buttons in the design's tab order. Then **H3** (L2).
- **Verification:** chunk checks; the accessibility checks of what it adds; phone and desktop debug
  runs; the bundle at the wave gate (the section is lazy).
- **Split rule:** if the brief passes about five source files, 23a the doodle section and its lane
  (the doodle component, the review panel, the engraving window, the lane, the doodle engraving),
  23b the suggestion row and `Jam again on this doodle` (the row, its composable, the lazy load).

### Chunk 24 — The held doodle

Status: planned
Wave: 6
Depends on: 20, 23 (and v3.0 chunk 24)
Architecture capture: the held doodle, `src/components/workspace/use-held-doodle.ts`, in memory
only: what holds it (a Jam's review, just ended or kept, replacing any doodle held), the changes
that let it go, and what reads it (phrase 1 at Idle, pre-generation, a Jam on it). Chunk 26 builds
on it in the same wave.

- **Goal:** hold a doodle at Idle from `Jam again on this doodle`, write phrase 1 from it, play a
  Jam on it with no capture, and let it go exactly when C5.11 and the design say.
- **Scope:**
  - **Holding:** from a Jam's review (just ended or kept), replacing any doodle held; the Jam
    switch turned on (saved) if off.
  - **Phrase 1 at Idle** from it: three rungs (chunk 18's ladder with no deadline, the idle attempt
    budget, a fresh seed each), through every idle rule (the fit retries and replacements written
    from it, Needs more room, the generation errors, `Retry generation` writing from it); with the
    lock on, the rhythm nearest the doodle. Pre-generation runs from it.
  - **`jam-bar`** between `score-toolbar` and the failure banner's place: its sentence, and
    `suggestion-row` at Idle (no no-fit form; "Key and mode set to {answer}." after `Use`, which
    keeps the doodle and writes phrase 1 again from it in the new key and mode; `Keep` declines,
    saved with the source session). Hidden with the staff area in the review mode; held still, its
    buttons disabled, during a session.
  - **A Jam on a held doodle**: a v2 start from Ready (`Start Jam` or phrase 1's first note), no
    capture, no 30-second wait, v2's controller rule from the count-in; its review shows the held
    doodle with its first capture tempo, an empty lane, the decline carried; at its end, phrase 1
    written again from the doodle with a fresh seed (or, ended during its count-in, the same phrase
    1 again).
  - **What keeps it and what lets it go**, as the design's two lists say: the tempo, Rising tempo,
    the audio mix, the theme, a viewport change, `Regenerate phrase`, its own `Use` keep it; every
    other change that discards prepared phrases, the Jam switch off, the controller lost (at Idle,
    or away when a Jam on it ends), deleting its source session or Delete everything, another
    doodle, a reload let it go, with its suggestion, silently.
- **Files:** `src/components/workspace/use-held-doodle.ts`, `JamBar.vue` (new), `ScorePanel.vue`,
  `use-review-host.ts`, `workspace-session-begin.ts`, `workspace-session-ends.ts`,
  `src/composables/generation-session-pregeneration.ts` (v3.0), `use-generation-session.ts`; tests
  `tests/unit/components/workspace/use-held-doodle.spec.ts`, `tests/e2e/workspace/held-doodle.spec.ts`
  (new).
- **Spec sections:** [C5.11](master-spec.md#c511-the-held-doodle-and-jam-again-on-this-doodle),
  [C5.13](master-spec.md#c513-edge-cases-before-phrase-1-sounds),
  [C6.4](master-spec.md#c64-where-and-when-it-is-shown),
  [C6.5](master-spec.md#c65-use-it-keep-mine-and-jam-again-on-this-doodle),
  [C10.5](master-spec.md#c105-pre-generation-v30); items 15, 23 (Idle half), 24 (held half), 36 (in
  memory).
- **Design docs:** [`flows/jam/handoff.md`](../../../ui_ux/flows/jam/handoff.md) (The Held Doodle;
  Routing Rules: Jam on a held doodle, The held doodle at Idle, What keeps a held doodle, What lets
  it go, `jam-bar`, The suggestion at Idle),
  [`screens/phrase-workspace/handoff.md`](../../../ui_ux/screens/phrase-workspace/handoff.md) (The
  held doodle's bar; States: Jam mode with a held doodle),
  [`flows/generate-phrase/handoff.md`](../../../ui_ux/flows/generate-phrase/handoff.md) (A held
  doodle's phrase 1), [`flows/review-and-export/handoff.md`](../../../ui_ux/flows/review-and-export/handoff.md)
  (`Jam again on this doodle`; A Jam played on a held doodle).
- **Atoms:** `rule_jam_again_on_this_doodle`, `rule_held_doodle_phrase_one_at_idle`,
  `rule_jam_on_held_doodle_skips_capture`, `rule_held_doodle_dropped_on_change`,
  `rule_held_doodle_in_memory_only`, `rule_suggestion_use_it`, `rule_suggestion_keep_mine`; (v3.0)
  `rule_pregenerated_phrase_matches_session`.
- **Revisions:** revise `rule_session_end_generates_next_phrase_one` (its held-doodle half).
- **Done when:**
  - `Jam again on this doodle` from a just-ended and from a kept Jam holds the doodle, turns Jam
    on, and shows phrase 1 written from it with `jam-bar`; the starting note is phrase 1's first
    note.
  - The held doodle's phrase 1 and prepared phrases are the phrases the Jam plays (fake clock,
    instant generator).
  - Each "keeps" and each "lets go" change of the design, one test each; letting go shows Jam
    mode's Idle or Empty, announcing nothing.
  - After a reload no doodle is held; the kept session's review offers it again, and the same
    settings and seed give the same phrase 1.
  - During a Jam on it, `jam-bar` is held still; its review's lane is empty.
- **Verification:** chunk checks; the accessibility checks of what it adds; a debug run going round
  twice on one doodle.
- **Split rule:** if the brief passes about five source files, 24a holding, phrase 1 at Idle and
  what keeps or lets it go (the held-doodle composable, the review host, the generation session,
  pre-generation), 24b the bar and a Jam on it (the bar, the score panel, the session begin and
  ends).

### Chunk 25 — Exports open with the doodle

Status: planned
Wave: 6
Depends on: 21, 22 (and v3.0 chunks 13 and 25)
Architecture capture: none

- **Goal:** open a Jam's generated-notes and played-notes files with a "Doodle" section, in both
  scopes, the two MIDI files still lining up.
- **Scope:**
  - **Generated notes:** MusicXML (written pitch, the key signature the Jam started with, no chord
    symbol, a rehearsal mark "Doodle") and MIDI (a marker "Doodle", no backing under it even with
    `Backing track` on), the section as many measures long as the doodle, at its capture tempo,
    starting at time zero; the first exported phrase at the next barline; the waiting measures
    never written.
  - **Played notes:** the same section holding the raw doodle notes (very short ones following
    `Include very short notes`), a note running past the section's end stopped there; other notes
    before phrase 1 still dropped; in a Jam on a held doodle the section is there, empty.
  - **Both scopes:** the doodle is always exported, never a favorite; `Export played notes` under
    `Favorites only` is disabled only when neither a favorite phrase nor the doodle holds a note.
  - Outside a Jam every file is byte-identical to v3.1's. No change or forced bend is marked.
- **Files:** `src/export/generated-notes-file.ts`, `src/export/played-notes-file.ts`,
  `src/export/midi/midi-export-input.ts`, `midi-tracks.ts`, `played-notes-midi-input.ts`,
  `played-notes-placement.ts`, `src/export/musicxml/musicxml-export-input.ts`, `musicxml-marks.ts`,
  `src/export/doodle-section.ts` (new); tests under `tests/unit/export/` (the three tests of
  [Read first](#read-first-what-v32-changes-in-v2-v30-and-v31) kept, Jam variants beside them),
  `tests/e2e/review/review-export-jam.spec.ts` (new).
- **Spec sections:** [C5.15](master-spec.md#c515-the-review-and-the-exports),
  [C5.14](master-spec.md#c514-the-doodles-two-forms); items 19, 20 (exports), 28 (exports).
- **Design docs:** [`flows/review-and-export/handoff.md`](../../../ui_ux/flows/review-and-export/handoff.md)
  (Export: A Jam's exports open with the doodle),
  [`screens/last-session-review/handoff.md`](../../../ui_ux/screens/last-session-review/handoff.md)
  (A Jam's files open with the doodle; In a Jam, the raw doodle notes count as played notes).
- **Atoms:** `rule_jam_exports_open_with_doodle`, `rule_jam_exports_line_up`,
  `rule_raw_doodle_notes_are_played_notes`, `rule_rhythm_changes_never_shown`; (v2)
  `rule_played_notes_export_unquantized_timing`. Drift check: `module_review_export_pipeline`.
- **Revisions:** revise `req_played_notes_export`,
  `rule_played_notes_export_aligns_with_generated_midi`, `rule_generated_notes_midi_export`,
  `rule_generated_notes_musicxml_export`, `rule_favorites_only_export`.
- **Done when:**
  - Each file of a seeded Jam (one-, two- and four-measure doodles, Rising tempo on) opens with the
    section; in both MIDI files the doodle starts at tick 0 and phrase 1's marker at the same tick
    (alignment test over both scopes).
  - The played-notes file holds the raw doodle notes unquantized, a held note stopped at the
    section's end, very short ones by the option; a Jam on a held doodle: the section empty.
  - Non-Jam sessions export byte-identical files to v3.1's (golden).
  - No exported file holds a raw doodle note except the played-notes file (byte scan). Then
    **H7**.
- **Verification:** chunk checks; H7.
- **Split rule:** if the brief passes about five source files, 25a the generated-notes files (the
  file, the MIDI and MusicXML inputs, the tracks, the marks, the doodle section), 25b the
  played-notes file and Favorites only (the file, its MIDI input, the placement).

### Chunk 26 — Pre-generation and the v3.2 settings

Status: planned
Wave: 6
Depends on: 19, 24 (and v3.1 chunk 19, the B8.3 matrix it extends)
Architecture capture: none (it builds on chunk 24's)

- **Goal:** prove, in one place, every case of C10.5: what the v3.2 settings discard, and how
  pre-generation runs in Jam mode.
- **Scope:** most triggers are already wired by chunks 19, 20 and 24; this chunk pins the matrix:
  discards on any change at Idle of the Jam switch, the drift, the lock, the allowed changes and
  the groups, whether or not the change acts on phrases at that moment; with a held doodle each
  also lets it go; no pre-generation in Jam mode without a held doodle; with one, prepared phrases
  carry the doodle, the drift, the lock and its draws exactly as the session would; `Use {answer}`
  discards as a key or mode change and keeps the held doodle. None of it shows.
- **Files:** `src/composables/generation-session-pregeneration.ts` (v3.0),
  `src/components/workspace/use-held-doodle.ts`; tests under `tests/unit/composables/`,
  `tests/e2e/workspace/pregeneration.spec.ts` (extended).
- **Spec sections:** [C10.5](master-spec.md#c105-pre-generation-v30),
  [C7.7](master-spec.md#c77-what-the-lock-meets) (pre-generation), Part A §8; items 35, 31 (held
  doodle and lock together).
- **Design docs:** [`flows/generate-phrase/handoff.md`](../../../ui_ux/flows/generate-phrase/handoff.md)
  (Prepared phrases and the v3.2 settings).
- **Atoms:** (v3.0) `req_idle_pregeneration`, `rule_pregenerated_phrase_matches_session`.
- **Revisions:** revise `rule_pregeneration_discarded_on_change`.
- **Done when:** each row of the matrix above is a test (unit, with a spy on the pre-generation
  queue); an e2e test shows the ready phrases dropped on a lock change and the held doodle's
  prepared phrases played by its Jam.
- **Verification:** chunk checks.
- **Split rule:** none needed (two source files).

## Chunk 27 — v3.2 release gate

Status: blocked (on L1, L2, L3)
Depends on: every chunk, L1, L2, L3

The release gate, not a wave; it keeps its chunk number because other plans link it. It runs the
[build workflow's release gate](build-workflow.md#release-gate), plus:

- `docs/release/v3.2-release-notes.md`: one row per item 1–41 of C16, then the table of every
  replaced or extended test and its v3.2 counterpart (item 40, from
  [Read first](#read-first-what-v32-changes-in-v2-v30-and-v31)), then M1–M4 with their figures.
- **Final M1 and M2** after L3's tuning, on the reference machine.
- The v3.1 corpus, every earlier corpus, the Vary settings corpus and the goldens re-run; the
  privacy spy (network half) with Jam sessions kept, raw notes kept and not (nothing sent).
- `npm run verify:boundaries` with the 224 kB entry budget unchanged (M4).
- Hand checks H1–H9 done.
- `documentalist`'s post-task sync over every `release-v3.2` atom, promoting those the owner
  agrees to; every `changes-in-v3.2` atom revised; part F's drift checks done
  (`module_ranked_candidate_ordering` and `module_named_stream_pseudorandomness` among them); the
  vision's v3.2 scope checked; the contract's item 41 record checked (D246, in the CONTRACT 3.0
  notes). The lexicon entries of C4 no longer say "planned". Atoms: every atom tagged
  `release-v3.2`; `contract_infinite_flow_first_release`, `vision_infinite_flow_first_release`,
  `specification_behavioral_quality_gates`.
- `ux-writer` confirms no v3.2 handoff names a class missing from `src/styles/`.
- `package.json` version `3.2.0`.

**Done when:** every item of C16 has a row with evidence; every measurement has its figure; the
owner says go.

### Definition-of-done coverage

| Item | Proved in | Verified by |
| --- | --- | --- |
| 1 The Jam switch | 20 | e2e: off at first, saved, Idle and review only, unavailable without a controller with the choice kept, presets never change it |
| 2 Idle in Jam mode | 20 | e2e: `staff-jam` with the key signature, no phrase, no Idle rules, no pre-generation (queue spy); Empty on leaving |
| 3 Starting | 17, 20, 21 | engine tests of the home note's octave; e2e start by click and by note; no other note starts; none while a review shows |
| 4 The click | 17, 21 | engine test with the click switch off; e2e audio spy: no backing before phrase 1; no doodle note drawn |
| 5 The end rule | 17 | engine tests of each end rule on the fake clock |
| 6 Very short notes | 4, 14, 17 | quantizer and suggestion inputs; the 30-second wait ignores them |
| 7 Quantizing | 4 | named tests on recorded doodles: early notes, overlaps, chords, one-tick collisions |
| 8 Phrase 1 timing, ladder and failure | 18, 21 | engine tests with a slow generator; e2e `jam-notice` |
| 9 The doodle changes no setting | 7, 8, 9, 18 | validator over the doodle set; controls unchanged after a Jam |
| 10 Unchanged without the new inputs | 2, guarded in 6–12, 15, 16, 18; 27 | the v3.1 corpus, earlier corpora, goldens and Vary settings corpus, unchanged |
| 11 The join | 6, 7 | join and register tests over the doodle set |
| 12 Drift's three positions | 5, 8, 9 | band tests; order properties per position |
| 13 The sweep | 3, 13, 18, 27 | M1 tables |
| 14 Jam listening | 21 (H2), 27 | the owner's recorded check |
| 15 The held doodle | 23, 24 | e2e holding, keeping and letting go; prepared phrases equal; after a reload |
| 16 Ends before phrase 1 | 17, 18, 21 | engine tests; e2e each end with no review and nothing kept |
| 17 During the Jam | 18, 21 | nothing offered (e2e); counts from phrase 1 (engine) |
| 18 The review, the lane, the list mark | 22, 23 | e2e doodle section and lane; list detail line |
| 19 The exports | 25 | alignment test in both scopes; byte scan; H7 |
| 20 The doodle's two forms | 22, 25, 27 | storage spy with the switch off; deletion tests; network spy |
| 21 The suggestion is deterministic | 14 | integer-only test; golden answers; H6 (Edge) |
| 22 Nothing suggested | 14, 23 | threshold and fit tests; the no-fit sentence in every review |
| 23 Where the suggestion shows | 21, 23, 24 | e2e: never during a Jam; review and Idle with a held doodle only; only the drawn answer |
| 24 Use it and Keep mine | 14, 23, 24 | e2e under a restriction and in each family; decline after a reload |
| 25 Suggestion listening | 23 (H3), 27 | the owner's recorded check |
| 26 Strict lock | 5, 10, 13, 16 | session property; M2 forced-bend rate |
| 27 Allowed changes | 11, 13, 16 | draw properties; M2 shares and no-candidate share |
| 28 Never shown | 16, 19, 23, 25 | live-view e2e; review and export golden |
| 29 Search order under the lock | 10 | instrumented search on every rung |
| 30 Jam and narrow windows | 10, 16, 18 | phrase 1 nearest the doodle; re-lock after a step-down |
| 31 Pre-generated under the lock | 16, 26 | identity with pre-generation on and off, changes included |
| 32 Rhythm-change listening | 19 (H4), 27 | the owner's recorded check |
| 33 Vary settings' allowed groups | 2, 15, 19 | corpus with all six; subset properties; unavailable state e2e |
| 34 Persistence | 19, 20 | reload e2e per setting; corrupt and v3.1 data load defaults |
| 35 Pre-generation | 20, 26 | the C10.5 matrix |
| 36 Visits that save nothing | 22, 23, 24 | outdated tab and failed read: a Jam runs, reviews, suggests, holds; nothing written |
| 37 Replay keys | 2, 12, 13 | `ifk4.` round trip; earlier corpora; every kind of phrase replays; H6 |
| 38 Kept sessions | 22 | data version 4 migration on seeded v3.1 data; H8 |
| 39 Delete everything | 22 | e2e: Jam sessions gone, five settings reset |
| 40 Otherwise unchanged | every wave gate | `npm run quality`; the table of [Read first](#read-first-what-v32-changes-in-v2-v30-and-v31) |
| 41 Contract | done (D246), 27 | the confirmation in the CONTRACT 3.0 atom's notes |
