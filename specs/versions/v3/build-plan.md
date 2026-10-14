# Infinite Flow v3.0 — Build Plan

Status: v12 (2026-10-14): after chunk 7a, the storage tests that opening the database at every
load breaks, the loaded profile selection and the my-instrument start-up read (spec D301, D302;
[Wave records](#wave-4-preflight-2026-10-14)). Approved by
the product owner on 2026-10-07 (v1), with Gate A and the token-source pass (Q66) confirmed the
same day; every later revision writes in rulings from [the decisions log](../../decisions.md)
(spec D252–D302), and earlier wordings are in git.

Build plan for v3.0, Storage, written from [master spec v1.3](master-spec.md) (now Part A v1.14) and the v3.0 design
in [`ui_ux/versions/v3.0/`](../../../ui_ux/versions/v3.0/README.md), the copy frozen when the
v3.1 and v3.2 design started at the `ui_ux/` root (its links were repointed there on
2026-10-08). Approved for execution. It adds no behaviour:
what the app does is in the master spec, what the interface looks like is in the design set, and
where this plan disagrees with either, they win and the plan is corrected. The code facts it
relies on are in [storage-grounding.md](storage-grounding.md); the generation-worker facts that
pre-generation needs are in [jam-grounding.md](jam-grounding.md#a7-performance-budget).

It is read by whoever builds v3.0, and by the owner. Music terms are explained where they first
appear, with a link to the project [lexicon](../../../docs/music/lexicon.md) when it has an entry.

> **Read first:** [what v3.0 undoes in v2](#2-read-first-what-v30-undoes-in-v2). v2 is built and
> tested around "nothing survives a reload". v3.0 reverses that on purpose, and about ten tests,
> two code gates and three contract guarantees change with it, each in a named chunk.

## 1. Overview

### Release sequence

v3.0 ships as one release, with one gate,
[chunk 26](#chunk-26--v30-release-gate). Chunks 0–2 are prerequisites; chunks 3–25 build the
release in the order below; the gate checks all 23 items of the
[definition of done](master-spec.md#13-definition-of-done) on the merged code and produces
`docs/release/v3.0-release-notes.md`. v3.1 (embellishment flags and presets) and v3.2 (Jam) are
not specified yet and are not planned here.

The order follows the owner's direction: the storage foundation first, then saved settings, kept
sessions and the played-notes opt-in, favorites and the export scope, the session list and Your
data, my instrument (the widest change), the check's new action and the remembered controller,
pre-generation, the stray-note filter, then the gate.

### Owner steps and gates

Some steps are not code and need the owner. They are part of the sequence:

| Step | What | When | Blocks |
| --- | --- | --- | --- |
| **Q66** | The owner allows one `ux-writer` pass on `src/styles/theme.css` and `components.css` ([ux Q66](../../../ui_ux/open-questions.md)). | Now. | [Chunk 1](#chunk-1--token-source-pass-pending-owner-approval), so every interface chunk (8, 10–15, 20–22, 20c, 25). |
| **Gate A** | The owner confirms the contract change set, part A, in the words of [`v3.0-intent-change-set.md`](../../../docs/release/v3.0-intent-change-set.md#a-contract-18--20-major-three-narrowed-guarantees); `documentalist` applies A1–A4 (CONTRACT 1.8 → 2.0) in its own commit on `main`. | As soon as the owner confirms: the narrowed wording still holds for v2.0, so it can land before any v3.0 code. | Chunks 11, 12 and 22 may not **merge** before it (each breaks one of the three old guarantees); chunk 14 follows from 12. |
| **H1** | The owner records stray notes on the Travel Sax breath controller with v2.0's played-notes export ([measurement M1](#m1--the-stray-note-threshold)). | Any time; v2.0 already exports raw played notes. | Chunk 25's threshold. |
| **Range ruling** | **Settled 2026-10-12 (spec D294):** written C2–C7 in treble clef, E0–E5 in bass clef ([master spec §7.1](master-spec.md#71-what-it-is)), from measurement M3 ([chunk 16](#chunk-16--my-instrument-in-the-domain), [chunk 19](#chunk-19--my-instrument-on-the-staff) and [chunk 19b](#chunk-19b--bass-clef-for-my-instrument)). Chunk 19b confirms by measurement that the bass-clef bound keeps the shared height at most 24 staff spaces; if not, the figure goes back to the owner. | Done. | Nothing. Chunk 20 enforces it. |
| **Clef design** | `ux-writer` designs the clef control in my instrument's sheet, its wording and its default (proposed: treble clef), the staff-reach note read in the chosen clef, and the refusal of a range outside its clef's bound, in note names (spec D294) (ux D280+ and ux Q80+). | Now; before chunk 20. | Chunk 20. Chunk 19b may start before it: its only words are the score description's clef name, "bass clef" in the existing pattern, revised if `ux-writer` says otherwise. |
| **O181** | **Closed 2026-10-12 (spec D295, D296):** a save that changes the shared height re-checks the pre-generated phrases; a review never cuts a phrase (its design is in the Sessions design gate). | Done. | Nothing. |
| **Sessions design** | `ux-writer` designs, for spec D295 and D296: the warning before a range or transposition change erases my instrument's kept sessions (in its sheet, and in the check's **Use for my instrument** confirmation), with how many; the delete confirmation naming the sessions that go with my instrument; where the player lands when the review on screen loses its session; how an outdated tab's sheet withholds deleting my instrument and a range or transposition change while it has kept sessions; and how a review makes room for a session that needs more height than the shared height (proposed: the larger of the two). | Now; before chunk 20c. | [Chunk 20c](#chunk-20c--my-instruments-sessions). |
| **Review reachability** | **Done 2026-10-12:** the owner confirmed the wording of `req_last_session_review` (STABLE): the review stays reachable until the next session starts "or until the player deletes its session", as a MAJOR bump ("1. ok, major"; [master spec §10](master-spec.md#10-what-v30-changes-in-v2s-guarantees), spec D295, D297); `documentalist` applied it (CONTRACT 4.0). | Done. | Nothing. |
| **Starting-note wording** | **Done 2026-10-13:** the owner accepted the proposed wording of `rule_midi_starting_note` (STABLE): with a stale phrase 1, the starting note first asks, as the Start button does, and the count-in starts only if the player chooses Use it; ruled MAJOR, CONTRACT 4.0 → 5.0 ([master spec §10](master-spec.md#10-what-v30-changes-in-v2s-guarantees), spec D297's ruling note). `documentalist` applies the atom and the contract bump. | Done (the atom change is `documentalist`'s, before chunk 24b's code). | Nothing. |
| **O182** | **Done 2026-10-13:** Regenerate runs the usual Idle Regenerate and the app stays at Idle with the new phrase on screen; the player presses Start again ([spec O182](../../open-questions.md#v30-wave-2-o180) closed, master spec §16). | Done. | Nothing. |
| **Stale phrase design** | `ux-writer` designs the stale-phrase prompt (master spec §16 and §14): its wording in plain words for a beginner, the labels of its two choices (the owner's words are Regenerate and Use it; Part C's key and mode suggestion already has a Use it), how it is dismissed, whether it names the settings that changed, whether other controls can be used while it shows (proposed: no), and how it reads when the starting note opened it. | Now (O182 is settled); before chunk 24b-2. | Chunk 24b-2. |
| **Part B1** | The owner confirms the revised `rule_instrument_profile_range` (change set part B, a MINOR contract bump), which now also states my instrument's written-range bound per clef (spec D294). | After chunk 20's wave gate (its post-task sync revises the atom). | Nothing; the gate checks it is done. |
| **Part B2** | The owner confirms the revised `rule_controller_transposition_check` (part B, MINOR), which now also states that "use this for my instrument" first warns when it would erase my instrument's kept sessions (spec D295). | After chunk 20c's wave gate (its post-task sync revises the atom, once the warning is built). | Nothing; the gate checks it is done. |
| **Part C** | The owner confirms the VISION 0.7 → 0.8 text and the retirement of the four chord-fit atoms (part C). | In chunk 26. | The gate. |

### Waves

Waves run one after another. Inside a wave, chunks run one at a time in number order: the owner's
rule is **one coding chunk in flight at a time**. Each wave starts with one intent preflight, ends
with one wave gate (the full test pass, the bundle and the post-task sync), and reaches `main` as
one merge ([§3](#3-workflow-waves-and-chunks)). The chunks in a wave are independent of each other
and touch different source files, so one preflight can cover them all. A chunk still blocked
when the rest of its wave is done (waiting for the owner, a design answer or a measurement) moves to the
next wave.

**Wave 0 is the switch-over** (spec D252). Chunk 0 ran under the earlier per-chunk workflow and is
on `main`. Chunk 1 is done on its own branch, `v3-c1-token-source`. It merges into the wave branch
`v3.0-w0`, not into `main`. Chunk 2 runs on that wave branch under the new workflow, and the
wave-0 gate covers chunks 1 and 2.

| Wave | Chunks | Waits for |
| --- | --- | --- |
| 0 | 0 Intent re-sync · 1 Token-source pass · 2 Baselines | Nothing (chunk 1: the owner's Q66 answer). H1 can run now. |
| 1 | 3 Storage boundary gates · 6 Tolerant settings codec · 16 My instrument in the domain · 23 Session seed plan | Chunk 0 (and chunk 2 for 16 and 23, which its replay corpus guards) |
| 2 | 4 Database core · 19 My instrument on the staff · 19b Bass clef for my instrument · 24 Pre-generation at Idle | Chunk 3 (4); 16 (19); 19 and its own intent preflight (19b); 23 (24) |
| 3 | 5 Save policy · 9 Kept-session record | Chunk 4; chunk 23 (9) |
| 4 | 7 Saved settings · 8 Notice row | Chunks 5, 6; chunk 1 for 8 |
| 5 | 10 Most recent session kept · 17 My instrument across worker and history | Chunks 7, 8, 9 (10); 9, 16 (17) |
| 6 | **Gate A**, then 11 Played-notes opt-in · 12 Favorites, pin, comment · 18 Replay key `ifk2.` · 22 Remembered controller · 25 Stray-note filter | Chunk 10 and Gate A (11, 12; and Review reachability before 12 merges); chunk 17 (18, not Gate A); chunk 7 and Gate A (22); H1 and chunk 1 (25) |
| 7 | 13 Favorites-only export · 14 Session list · 20 My instrument sheet | Chunk 12 (13, 14); chunks 7, 17, 19b, 24, the clef design and ux Q76 (20) |
| 8 | 15 Your data · 21 The check feeds my instrument | Chunks 11, 14 (15); 20 (21) |
| 9 | 20c My instrument's sessions · 24b Stale phrase at Start | Chunks 14, 20 and 21 and the Sessions design gate (20c); chunk 24 and the Stale phrase design gate (24b) |
| 10 | 26 v3.0 release gate | Every other chunk |

The critical path runs 0 → 3 → 4 → 5 → 7 → 10 → 12 → 14 → 15 → 26; since v8, chunk 20c, which
waits for chunks 14, 20 and 21, adds wave 9 before the gate. My instrument (16–21, 20c) and
pre-generation (23–24) are side branches; their chunks share waves with the critical path's.
Since v9, chunk 24b (a stale phrase at Start, ISS-011) joins wave 9 beside chunk 20c, as the owner
asked for the end of v3.0; the two touch different files.

```mermaid
flowchart LR
  C0[0 Intent re-sync] --> C3[3 Boundary gates]
  C0 --> C6[6 Settings codec]
  C0 --> C16[16 My instrument domain]
  C0 --> C23[23 Seed plan]
  C1[1 Token pass] --> C8[8 Notice row]
  C2[2 Baselines] --> C16
  C2 --> C23
  C3 --> C4[4 Database core]
  C4 --> C5[5 Save policy]
  C4 --> C9[9 Kept-session record]
  C23 --> C9
  C5 --> C7[7 Saved settings]
  C6 --> C7
  C5 --> C8
  C7 --> C10[10 Most recent kept]
  C8 --> C10
  C9 --> C10
  C1 --> C10
  GA{{Gate A: contract 2.0}} --> C11
  GA --> C12
  GA --> C22
  C10 --> C11[11 Played-notes opt-in]
  C10 --> C12[12 Favorites, pin, comment]
  C12 --> C13[13 Favorites-only export]
  C12 --> C14[14 Session list]
  C11 --> C15[15 Your data]
  C14 --> C15
  C16 --> C17[17 Worker and history]
  C9 --> C17
  C16 --> C18[18 Replay key ifk2]
  C17 --> C18
  C16 --> C19[19 Staff placement]
  C19 --> C19b[19b Bass clef]
  C19b --> C17
  C19b --> C20
  CD{{Clef design}} --> C20
  C7 --> C20[20 My instrument sheet]
  C17 --> C20
  C24 --> C20
  C20 --> C21[21 Check feeds my instrument]
  C14 --> C20c[20c My instrument's sessions]
  C20 --> C20c
  C21 --> C20c
  SD{{Sessions design}} --> C20c
  RV{{Review reachability}} --> C12
  RV --> C20c
  C7 --> C22[22 Remembered controller]
  C23 --> C24[24 Pre-generation]
  H1{{H1 recordings}} --> C25[25 Stray-note filter]
  C15 --> C26[26 v3.0 gate]
  C13 --> C26
  C18 --> C26
  C20c --> C26
  C22 --> C26
  C24 --> C26
  C24 --> C24b[24b Stale phrase at Start]
  SP{{Stale phrase design}} --> C24b
  SN{{Starting-note wording}} --> C24b
  C24b --> C26
  C25 --> C26
```

### Wave records

#### Wave 0 (2026-10-09)

Chunk 0 is on `main`. Chunk 1 merged into `v3.0-w0` from `v3-c1-token-source`. Chunk 2 merged into
`v3.0-w0` (its record is under [chunk 2](#chunk-2--baselines-replay-key-corpus-and-bundle-headroom)).
The wave-0 gate (the full test pass, the bundle and the post-task sync) has not run yet.

#### Wave 1 preflight (2026-10-09)

`documentalist` ran the full pass and the file pass for chunks 3, 6, 16 and 23, without an LLM
(classifications from `atd query`, `atd trace`, grep and reading the atoms). `atd lint` passes. No
atom was written. Of the atoms the chunks name as "(v2)", only `rule_instrument_profile_range` and
`rule_session_generation_failure_ladder` are STABLE; `entity_instrument_profile`,
`rule_seeded_phrase_reproduction`, `module_named_stream_pseudorandomness` and
`rule_ephemeral_session_state` are REVIEW.

| Chunk | Verdict | Governing atoms | Open before code |
| --- | --- | --- | --- |
| 3 | PROCEED-WITH-SIGNOFF-PENDING | `req_on_device_storage`; `rule_session_data_never_sent_or_stored`, `specification_ephemeral_state_verification` (REVIEW); `specification_browser_only_operation_verification` (STABLE); Part D `rule_ephemeral_session_state` (REVIEW, BUSINESS) | The owner confirms the Part D wording of `rule_ephemeral_session_state` at the wave gate. No ARCHITECTURE atom yet records "storage code in `src/storage/` only" (§4.3); chunk 4's capture comes after chunk 3. Keep true: the network, `sendBeacon`, microphone and cookie bans, Web Audio in `src/audio/` only, Web MIDI in `src/midi/` only, every existing `@test-link` in `tests/unit/boundaries/` (`rule_optional_midi_privacy` and `req_session_backing_track`, both STABLE, are linked in the gate files). |
| 6 | PROCEED | `rule_saved_settings_load_tolerantly`, `rule_saved_setting_is_players_choice`, `rule_settings_saved_on_change`, `rule_outdated_tab_reads_what_it_can`, `rule_played_notes_kept_only_after_opt_in` (all DRAFT) | The record shape (one record per setting, `dataVersion`) comes before chunk 4's storage capture. The saved instrument selection needs chunk 16's open instrument id. Keep true: `rule_key_change_drops_harmonic_carry_in` (STABLE, on `rebuildGenerationWorkerIntent`; chunk 6 only exports the parser) and the strict `module_generation_control_catalog` validators. |
| 16 | PROCEED-WITH-SIGNOFF-PENDING | `req_my_instrument`, `rule_my_instrument_range_limits`, `rule_my_instrument_transposition_named_interval` (DRAFT); `entity_instrument_profile`, `module_generation_request_construction`, `module_generation_control_catalog` (REVIEW); `rule_instrument_profile_range` (STABLE) | Architecture capture: a new `entity_my_instrument` (ENTITY, ARCHITECTURE, DRAFT), after the leader settles the open id's literal, how the intent gets the profile, the profile's fields and the transposition input. `entity_instrument_profile` says a new profile needs no new enumeration member; the capture scopes that to the built-ins. Keep true: the three built-ins' ranges, windows and transpositions exactly; the transposition never changes the concert range or the generated events. Part B1 also lists the concert range derived from the written range as a use of the transposition. |
| 23 | PROCEED-WITH-SIGNOFF-PENDING | `rule_pregenerated_phrase_matches_session` (DRAFT); `rule_seeded_phrase_reproduction`, `module_named_stream_pseudorandomness` (REVIEW); `rule_session_generation_failure_ladder` (STABLE); in the files also `rule_session_density_only_steps_down`, `rule_tempo_never_affects_generation`, `rule_count_in_shown_on_screen` (STABLE) | Architecture capture: a new `module_session_seed_plan` (MODULE, ARCHITECTURE, DRAFT), after the leader settles where and when the session seed is drawn, what renews it, how the seeds derive from it, the request ids, and where it is recorded. Keep true: each ladder rung its own seed; the standalone attempt's request and seed independent of how many rungs ran; nothing generated depends on machine speed; density decided at request time and only stepping down; tempo never feeding the plan; phrase 1 exactly the Idle phrase. |

Plan corrections the preflight found. Chunk 23's scope is wrong on two code facts: the generator
draws from no named random stream (it orders candidates by seeded tie keys; only the settings
mutation uses the indexed streams), and the tension arc draws nothing (it is a pure function of
the phrase number, `src/session/tension-arc-cycle.ts`). Its Files list has no Idle-side file
(`src/composables/use-generation-session.ts`), though the session seed is drawn at Idle. Chunk 16
still says the transposition spelling is "flagged to `spec-writer`"; §8 item 2 says master spec
v1.3 settled it. The Atoms lines of chunks 6 and 16 below gain the atoms the preflight added.

Conflict for `ux-writer` (blocks chunk 20, not chunk 16): the my-instrument design enters the
transposition with a semitone stepper ("{n} lower / Same / {n} higher"), while master spec §7.1
and `rule_my_instrument_transposition_named_interval` enter it as a named interval, a number of
octaves and a direction, never as a bare number of semitones.

#### Owner rulings after the wave-1 preflight (2026-10-09)

The owner settled four points the preflight raised (spec D253–D256, master spec v1.5):

- **The transposition is entered in octaves and semitones** (spec D253): a number of octaves and a
  signed semitone count, the interval name derived and shown; §7.1's spelling table stays. This
  settles the conflict above on the spec's side: the design's stepper is consistent, and
  `ux-writer` adds the derived name ([ux Q76](../../../ui_ux/open-questions.md)). The owner then
  settled where the sign sits (spec D257, closing O163): it is the direction of the whole
  transposition, octaves included, and the value is entered with the design's one stepper
  counting semitones across octaves, the derived name beside it. Chunk 16 below takes the
  octaves, semitones and direction; chunk 20 shows the name.
- **My instrument's id is `my-instrument`**, fixed and apart from its display name (spec D254):
  the open id's literal chunk 16's capture needed. Chunks 6, 9, 16 and 20 below say it.
- **A session-wide record keeps the session's own facts, its session seed among them** (spec
  D255): chunk 23 puts the session seed there, chunk 9 keeps it. The owner adds no other facts
  (spec D258, closing O164): the record holds what master spec §5.2 lists and the session seed,
  and nothing derivable from the session seed; any further fact replay needs is settled in chunk
  9's architecture capture and put to the owner then.
- **The Part D wording of `rule_ephemeral_session_state` is confirmed** (spec D256): chunk 3's
  open point is closed; `documentalist` applies it in the wave-1 post-task sync.

The plan corrections above are applied: chunk 23's Scope and Files now state the code facts,
chunk 16 no longer says the spelling is flagged to `spec-writer`, and the Atoms lines of chunks 6
and 16 carry the atoms the preflight added.

#### Wave 2 preflight (2026-10-12)

`documentalist` ran the full pass and the file pass for chunks 4, 18, 19 and 24 on `v3.0-w2`
(made from `main` a84739a), without an LLM: classifications from `atd query`, `atd trace`, `atd
check --full`, grep over the atoms and the chunks' files, and reading the atoms, the master spec,
the design and the code they name. `atd lint` passes; `atd check --full` finds no dangling link
(385 atoms). No atom was written. The three architecture captures (chunks 4, 18, 24) are made at
the start of their chunk, once its leader has settled the design points listed below. Statuses as
found: `module_generation_worker_cancellation` and `rule_dropped_attempt_cancelled` are STABLE
and on the contract's surface; `module_phrase_replay_key`, `module_notation_layout_preflight`,
`module_notation_display_convention`, `module_generation_prewarm`, `rule_seeded_phrase_reproduction`,
`rule_look_ahead_deadline`, `rule_session_start_conditions` and `service_idle_generation_session`
are REVIEW; the v3.0 atoms are DRAFT, except `entity_my_instrument`, `module_session_seed_plan`
and `rule_my_instrument_range_limits` (REVIEW since the wave-1 sign-off).

| Chunk | Verdict | Governing atoms | Open before code |
| --- | --- | --- | --- |
| 4 | PROCEED | `req_on_device_storage`, `rule_outdated_tab_stops_saving`, `rule_saved_data_belongs_to_browser_profile` (DRAFT); in the port's reach also `rule_outdated_tab_reads_what_it_can`, `rule_delete_everything`, `rule_persistent_storage_requested`, `req_your_data` (DRAFT) and the one-directory clause of `rule_ephemeral_session_state` (REVIEW) | The architecture capture (its design points below). Keep true: the chunk-3 gates as merged (`specification_browser_only_operation_verification`, STABLE); `rule_session_data_never_sent_or_stored` (REVIEW; its never-stored half is chunk 10's Part D, and chunk 4 stores nothing of a session); chunk 6's codec, which already defines the record versions (`RecordVersions`, `SETTINGS_DATA_VERSION = 1` in `src/storage/records/settings-record.ts`) and reads a record without them, or with a newer data version, as unreadable, its setting falling back to the default, never as a thrown error (`rule_saved_settings_load_tolerantly`); an outdated tab writes and deletes nothing, delete everything included. |
| 18 | PROCEED-WITH-SIGNOFF-PENDING | `module_phrase_replay_key` (REVIEW, revised by the capture), `req_my_instrument` (DRAFT), `entity_my_instrument` (REVIEW); (v2) `rule_seeded_phrase_reproduction`, `service_headless_phrase_replay`, `module_generation_worker_protocol` (REVIEW) | First the coordinator settles the overlap with chunk 17 (plan corrections below), then the capture. The capture replaces the owner's 2026-10-01 rationale, "a later generator change may replay an older key differently, which is accepted", with what master spec item 19 and chunk 2's corpus now require: every `ifk1.` key decodes to the same phrase as in v2, and v3.1 extends this to `ifk2.` keys (master spec Part B). The key still holds no app version. The owner signs the revised text at the wave gate, since it changes a rationale he recorded. Keep true: the 87-case `ifk1.` corpus byte for byte; a built-in phrase still `ifk1.`, byte-identical; one console line per accepted phrase; no played notes and no app version in a key; the decoder sharing the worker's intent validation (no parallel schema). |
| 19 | PROCEED-WITH-SIGNOFF-PENDING | `req_my_instrument` (DRAFT), `module_notation_layout_preflight` (REVIEW); in the files also `module_notation_display_convention` (REVIEW), `rule_my_instrument_transposition_named_interval` (DRAFT), `entity_my_instrument` (REVIEW), `rule_staff_needs_room_notice`, `rule_session_layout_fixed_at_start` (REVIEW) | `module_notation_layout_preflight` gives the system positions "one block size that depends on the viewport and never on a phrase or a profile", one named height for every profile. Chunk 19 makes that size follow my instrument's written range. The design settles this (phrase-workspace handoff, Notation Contract; [master spec §14](master-spec.md#14-deferred-and-open)), so it is not a spec gap, but the atom's guarantee changes. Proposed: the atom is revised before code, at the chunk's start (version 0.8, back to DRAFT for the owner's sign-off on the text, as for 0.5 to 0.7), not changed silently at the sync. The spelling question below goes to `spec-writer`. It holds back only the chunk's spelling assertions for a "higher" transposition, not the placement and height work. Keep true: every v2 notation test and the four snapshots; each built-in's placement (top line at 73.5 units for the saxophones, 60 for the keyboard); the 16-space size while no saved instrument needs more; the size changes only when my instrument is saved or deleted; no concert-pitch display. Verification ends with the owner's **range ruling**, which blocks chunk 20, not this chunk. |
| 24 | HALT-NEEDS-CONTRACT-VISION-DECISION | `req_idle_pregeneration`, `rule_pregeneration_yields_to_player`, `rule_pregeneration_discarded_on_change`, `rule_start_never_waits_for_pregeneration`, `rule_pregenerated_phrase_matches_session` (DRAFT); `module_session_seed_plan` (REVIEW); (v2) `module_generation_worker_cancellation`, `rule_dropped_attempt_cancelled` (STABLE, contract surface), `rule_look_ahead_deadline`, `module_generation_prewarm` (REVIEW); in the files also `rule_session_density_only_steps_down`, `rule_tempo_never_affects_generation`, `req_last_session_review` (STABLE). **Part D:** `rule_session_start_conditions` (REVIEW, BUSINESS); drift check `service_idle_generation_session` (REVIEW) | The owner rules on `module_generation_worker_cancellation` (conflict 1 below) before the chunk is built. The chunk is last in the wave, so chunks 4, 18 and 19 run meanwhile. Then the capture. Part D against the wave-1 sync: the sync left `rule_session_start_conditions` unchanged, and its pending note (a background pre-generation is not "a new phrase being generated") still matches `rule_start_never_waits_for_pregeneration`. It is revised at the wave-2 sync with the owner's agreement. `service_idle_generation_session` 0.2 (the sync's seed-plan revision) agrees with `module_session_seed_plan`. Its "at most one operation runs at a time" must not take in a background attempt, or edits would lock and Start would wait. Keep true: the seed plan as merged (each rung's seed from the session seed and its label, nothing drawn during a session, phrase 1 exactly the Idle phrase); no deadline cancels anything at Idle; a prewarm draws nothing from the seed and request-id providers; density only steps down; tempo never feeds generation; nothing starts while a review shows; nothing is saved. |

Plan corrections the preflight found (listed, not applied: none is a stale file path):

- **Chunk 4.** §2's storage design and chunk 4 cite "about 8.8 kB" of entry-chunk headroom. Chunk 2
  measured 5,759 B, and the wave-1 gate 4,840 B (entry 224,536 B of 229,376 B); the raw-IndexedDB
  or `idb` choice weighs that figure. A `define` in `vite.config.ts` alone reaches neither
  `vitest.config.ts` nor the workspace and notation harness configs, since none of them imports
  `vite.config.ts`. The Atoms line lacks `rule_outdated_tab_reads_what_it_can` (the reopen without
  a version), `rule_delete_everything` (delete everything), `rule_persistent_storage_requested`
  (persist, persisted) and `req_your_data` (estimate). Done when's "a record without them is
  rejected on read" must mean "unreadable", as chunk 6's codec already reads it, never a throw
  past tolerant loading.
- **Chunk 18.** The decoder rebuilds the intent through `rebuildGenerationWorkerIntent`
  (`src/generation-worker/generation-worker-inbound.ts`, a chunk-17 file). Replay runs through
  the worker runtime's own parser (`service_headless_phrase_replay`), which refuses `my-instrument`
  until chunk 17 (`entity_my_instrument`). So any `ifk2.` round trip or replay, not only "an
  end-to-end replay of a session phrase", needs the inbound half of [chunk 17](#chunk-17--my-instrument-across-the-worker-and-the-history).
  Either chunk 18 takes that half (adding `generation-worker-inbound.ts` and
  `generation-worker-protocol.ts` to its Files), or it moves after chunk 17, to wave 5. The
  coordinator decides. Three existing tests assert that `ifk2.` is refused as unsupported:
  `tests/unit/generation-worker/phrase-replay-key.spec.ts`, `phrase-replay.spec.ts` and
  `tests/unit/scripts/replay-phrase-script.spec.ts`, the last outside the Files line.
- **Chunk 19.** Scope says "the notation already transposes by a profile's chromatic and diatonic
  pair". It reads only the chromatic count (`src/domain/notation/written-phrase.ts`); only the
  MusicXML `<transpose>` reads the diatonic one. Done when says "the key signature … moved by its
  transposition", but the written key is the written tonal center the player chose, the same for
  every instrument. The transposition moves the concert key the phrase is generated in, and the
  written notes and chord roots come back from concert pitch. "The placement helper it uses" is
  `planStaffPlacement`, inside `notation-layout-policy.ts`. The 16-space size is the constant
  `NOTATION_SYSTEM_POSITION_UNITS`, read by `vexflow-engraver.ts` and
  `vexflow-two-system-engraver.ts`, with `planStaffPositions` called from `PhraseScore.vue`,
  `ReviewPanel.vue` and `src/session/session-window.ts`, and cited in `theme.css`'s sizing note.
  A size that varies reaches all of them.
- **Chunk 24.** Files has no Idle-side file: `src/composables/use-generation-session.ts` publishes
  phrase 1 with its session seed and receives the edits that discard. It has no Start-side file
  either (`workspace-session-begin.ts`, and the session engine or runner that takes the ready
  phrases). The abort signal is passed in `src/generation-worker/generation-worker-client.ts`.
- **§3.** The worktree paths read `infinite_flow-v3-w<n>` and `infinite_flow-v3-c<n>`; wave 2's is
  `infinite_flow-v3.0-w2`.
- **Key versions** are consistent: v3.0 writes `ifk2.` for a player-made instrument only, built-ins
  staying `ifk1.`; v3.1 writes `ifk3.` for every phrase; v3.2 writes `ifk4.`; and fde9188 (O171)
  puts v3.3's richer chords after `ifk4.`. `ifk3.` carries my instrument "inline, as `ifk2.`
  does", so chunk 18's choice about the name carries into `ifk3.` and `ifk4.`.
  [build-plan-v3.2.md](build-plan-v3.2.md)'s "`main` has no `src/storage/` … no `ifk2.`" has been
  stale since wave 1. It is left for that plan's own preflight.

Conflicts and gaps:

1. **For the owner (contract), blocks chunk 24.** `module_generation_worker_cancellation` (STABLE,
   contract surface) says "a generate call with no signal is never cancelled; the Idle flow passes
   none". `rule_pregeneration_yields_to_player` (master spec §8) has any player request at Idle
   cancel the background attempt through that cancellation, so a background attempt must carry a
   signal. The v3.0 change set does not list this atom. Proposed wording: "the Idle flow's player
   requests pass none; a background pre-generation attempt passes one, aborted by any player
   request at Idle". It needs the owner's agreement and a CONTRACT bump in the same change.
   Altering a surfaced guarantee is MAJOR under the grid, unless the owner rules it a narrowing.
   `rule_dropped_attempt_cancelled` (STABLE) stays true as written ("at Idle there is no
   deadline, so nothing is cancelled *for this reason*"); no change is proposed.
2. **Change-set gap (`documentalist`, owner's agreement at the wave-2 sync), does not block.**
   `rule_look_ahead_deadline` (REVIEW, BUSINESS) says "phrase 2 is generated during the one-measure
   count-in". That stops holding when phrase 2 was pre-generated. The atom has no `changes-in-v3.0`
   tag and is not in Part D. Proposed: chunk 24's sync revises it, as Part D.
3. **For `spec-writer`, the written spelling (chunk 19, and chunk 16's merged code).** Master spec
   §7.1 and `rule_my_instrument_transposition_named_interval` say the letter-name steps spell the
   notes, the key signature and the chord symbols. `module_notation_display_convention` and the
   code (`spellWrittenKey`) spell the written key from the chosen written tonal center by the
   fewest accidentals, ties toward sharps, and never read the steps. The two differ, for example,
   for "6 semitones higher" with concert C. The code writes F♯ major; an augmented fourth below C
   is G♭ major. Which one holds?
4. **For `ux-writer`:** none found.

Design points each capture waits for:

- **Chunk 4** (new ARCHITECTURE atom or atoms; parents among `req_on_device_storage`,
  `rule_outdated_tab_stops_saving`, `rule_outdated_tab_reads_what_it_can`,
  `rule_saved_data_belongs_to_browser_profile`, `rule_ephemeral_session_state`,
  `rule_delete_everything`, `rule_persistent_storage_requested`). The scope: §2's directory and
  port, database and stores, record envelope and migrations, and outdated-tab detection. The hold
  and "saving off" are chunk 5's. One atom, or a MODULE plus an ENTITY for the envelope? Is the
  database's data version the records' `dataVersion`, one number or one per store, and does
  `RecordVersions` move to `record-envelope.ts`? "Read-only" has no IndexedDB counterpart: the
  port refuses every write and delete once outdated, delete everything included, while a visit
  whose read failed may still delete everything (chunk 5's rule, but the port's error kinds must
  allow it). The store list is fixed now, since a later store needs an upgrade step. Raw
  IndexedDB or `idb`, against 4,840 B of headroom. How the app version reaches tests and harnesses.
  Is "`src/session/` and `src/export/` never import `src/storage/`" enforced by a gate (none
  exists) or left to review and the storage-free test? Links: the storage files link the new
  atom. The chunk-3 gate entries (the `src/storage/` override in `eslint.config.js`, the
  directory-scoped entry in `scripts/verify-boundaries.mjs`) link `req_on_device_storage`
  today; whether they also link the new atom is the sync's call.
- **Chunk 18** (revision of `module_phrase_replay_key`). Is the display name in `ifk2.`? The
  generator-facing profile carries it (`entity_my_instrument`). Leaving it out needs a decode-side
  rule for the name, or the name leaves that profile, or "encoding then decoding returns an equal
  intent" no longer holds. Putting it in places player text in a console line (local only) and,
  later, in `ifk3.` and `ifk4.`. What does the inline instrument hold: my instrument's owning
  fields (written range, transposition as octaves, semitones and direction, and the template only
  if it affects generation) rebuilt through `makeMyInstrument`, or the derived profile checked by
  rebuild-and-compare? The tuple shape: an eighth slot, or the instrument in place of the id. The
  refusals: an `ifk2.` key naming a built-in, an `ifk1.` key naming `my-instrument`. Who changes
  the shared rebuild (the chunk-17 overlap)? The `keyVersion` union and the console line's
  `ifk1.`-only pattern. The restated per-version replay guarantee.
- **Chunk 24** (new ARCHITECTURE atom for the Idle background queue, after the owner's ruling).
  Which calls carry an abort signal, and who aborts them? Is the cancellation's prewarm of the
  cancelled intent wanted for a background attempt? A background attempt is not an operation of
  `service_idle_generation_session`. Seeds: phrases 2 to 5 take the plan's rung seeds with no
  deadline, the standalone rung only after every carry-in rung fails. The mutation seed is derived
  at Idle when Vary settings is on, and `module_session_seed_plan` says "at Start", which needs a
  wording revision (REVIEW, owner's sign-off). Request ids are drawn at Idle from the page-wide
  provider, so "identical" with pre-generation on and off compares timelines and seeds, request
  ids aside. If `rule_pregenerated_phrase_matches_session`'s "the same request" is meant to
  include the id, that is a question for `spec-writer`. Pre-generation is not a prewarm: it never
  reuses the prewarm's fixed seed and id. Also to settle: where the ready phrases live and how
  Start hands them over (`SessionStart`); where the session's look-ahead resumes; how a ready
  phrase is checked against the layout the session holds; the discard triggers, tempo and Rising
  tempo excluded; the window re-check from the first phrase that no longer fits; stopping and
  resuming around a review; when a pre-generated phrase's replay key is emitted (at generation,
  or when spent, a discarded one never); and starting only after the prewarm.

#### Owner rulings after the wave-2 preflight (2026-10-12)

The owner settled the three points the preflight put to him (spec D290–D292, master spec Part A
v1.8). In his words: "1. ok; 2. less accidental the better, sharp in case of tie; 3. ok".

- **A background pre-generation attempt can be cancelled** (spec D290; conflict 1 above, chunk
  24). The owner agrees to revise `module_generation_worker_cancellation` (STABLE, on the
  contract's surface) to: "the Idle flow's player requests pass no signal and are never
  cancelled; a background pre-generation attempt passes one, aborted by any player request at
  Idle". He rules it a **MINOR** contract bump, not MAJOR: every guarantee the player relied on
  still holds, and the change only adds a background attempt that gives way to the player.
  `rule_dropped_attempt_cancelled` stays as written. `documentalist` applies the atom and the
  contract bump in its own commit. Chunk 24 is no longer blocked; its capture follows.
- **A written key with two spellings takes the one with fewer sharps or flats, sharps on a tie**
  (spec D291; conflict 3 above, chunks 16 and 19). The code's rule holds (`spellWrittenKey`,
  `module_notation_display_convention`), and master spec §7.1's "the letter-name steps spell the
  written notes, the key signature and chord symbols" is withdrawn. The written key is the one
  the player chose, spelled with fewer sharps or flats in its key signature; written notes and
  chord symbols (root and slash bass) are spelled in that key. For example, an instrument whose
  written notes sound 6 semitones higher writes concert C major as F♯ major, not G♭ major. The
  interval name is still derived by §7.1's table and shown; its letter-name steps stay in the
  profile's transposition and a MusicXML file's `<transpose>`, and spell nothing on the staff.
  Chunk 16's merged code needs no change. `rule_my_instrument_transposition_named_interval` still
  says the steps spell the written part; `documentalist` revises it.
- **The staff's shared height follows my instrument's written range** (spec D292; chunk 19's open
  point). The one system-position size, which `module_notation_layout_preflight` (REVIEW) says
  "never depends on a phrase or a profile", now takes my instrument's written range into account.
  It changes only when my instrument is saved or deleted, never from phrase to phrase, as the
  design already says. `documentalist` revises the atom before chunk 19's code.

One call by the coordinator, with no decision number:

- **Chunk 18 moves to wave 6, after chunk 17.** Its `ifk2.` decoder rebuilds the intent through
  `rebuildGenerationWorkerIntent` (chunk 17's file), and replay goes through the worker runtime's
  own parser, which refuses `my-instrument` until chunk 17. Taking chunk 17's inbound half into
  chunk 18 would blur both chunks, and chunk 18 is off the critical path. It goes to wave 6, not
  wave 5, so the chunks of one wave stay independent: chunk 17 is in wave 5. Wave 2 is now chunks
  4, 19 and 24; wave 6 is Gate A, then chunks 11, 12, 18, 22 and 25. Chunk 18 is independent of
  chunks 11, 12, 22 and 25 and touches none of their files, and it does not need Gate A: the
  replay key changes none of the three guarantees Gate A narrows.

The preflight's plan corrections are applied: §2's storage design and M5 give the headroom left
after the wave-1 gate; chunk 4's Scope, Files, Atoms and Done when take the `define` reach, the
four missing atoms and "unreadable"; chunk 18's Scope, Files and Depends on take chunk 17's
rebuild and the three tests that assert `ifk2.` is refused; chunk 19's Scope, Files and Done when
take the chromatic-only notation, the written key the player chose, `planStaffPlacement` and the
readers of `NOTATION_SYSTEM_POSITION_UNITS`; chunk 24's Files take the Idle-side and Start-side
files and the worker client; §3 gives the worktree paths in use; and
[build-plan-v3.2.md](build-plan-v3.2.md)'s stale "`main` has no `src/storage/`" line is
corrected. Chunk 16's Scope no longer says the diatonic count decides the spelling (spec D291).

Not blocking: `rule_look_ahead_deadline`'s "phrase 2 is generated during the one-measure
count-in" (conflict 2 above) is revised in chunk 24's sync, as Part D, with the owner's agreement
then. Chunk 24's Part D line names it.

#### Owner ruling during wave 2: bass clef (2026-10-12)

Chunk 19 merged (aec8f63) with M3's staff half recorded in
[`notation-engraving.md`](../../../docs/notation-engraving.md#my-instruments-written-range-m3-2026-10-12):
in treble clef only an exact two-octave range from written B2–B4 up to E4–E6 keeps 16 staff
spaces; C3–C6 needs 18, C2–C4 19, C6–C8 21, C2–C6 23, C2–C7 24. Asked for the range ruling, the
owner answered: "bass clef option for v3.0, and keep in mind 8va/8vb/15ma etc for a later version
should the need arise." Spec D293 writes it into master spec Part A v1.9:

- My instrument is written in treble or bass clef, the player's choice; the built-ins stay in
  treble clef; a new my instrument starts in treble clef (proposed, for `ux-writer`). The clef is
  display only: written pitch, transposition and generation are unchanged, the generator never
  reads it, and the `ifk2.` key does not carry it. It follows the phrase into the staff at Idle
  and in a session, the check's note, the review of the last and kept sessions (kept with the
  phrase's instrument), the score's description and the MusicXML export (`<clef>` F, line 4).
- The staff's shared height (spec D292) reads my instrument's written range placed in its own
  clef.
- The range ruling stays owed, now per clef: proposed treble C2–C7 and bass E0–E5 (the same lines
  and spaces), keeping the shared height at most 24 staff spaces; chunk 19b measures the bass
  figure. The gate moves after chunk 19b.
- Octave signs and octave clefs wait for a later version
  ([spec O180](../../open-questions.md#v30-wave-2-o180)). A gap D292 already had, which the clef
  makes common, is registered as [spec O181](../../open-questions.md#v30-wave-2-o180) and gates
  chunk 20.

Placement: **chunk 19b** joins wave 2 after chunk 19 (merged). Under the owner's
one-chunk-in-flight rule it runs before or after chunk 24, as the coordinator chooses. It touches none of chunk 4's or chunk 24's files. Wave 2's preflight did not cover it,
so it gets its own intent preflight (a D-peek) first, after `documentalist` revises the atoms that
say "treble" (listed in chunk 19b). The clef control and the record field stay in chunk 20, behind
the new **Clef design** gate for `ux-writer` and O181. Chunk 17 carries the clef with the phrase's
instrument into the history and the kept-session record; chunk 18's key leaves it out; chunk 21
creates my instrument in treble clef or keeps the existing clef.

#### Chunk 19b preflight (2026-10-12)

`documentalist` ran the D-peek for chunk 19b on `v3.0-w2` after the atom revisions it waited for
(13de53c, change set part H), without an LLM: the `@spec-link` and `@test-link` tags in every file
of the chunk's Files line, `atd query`, grep over the atoms, and reading them. A STABLE atom sits in
the files, so the peek was widened to every file rather than one. `atd lint` passes; `atd check
--full` finds no dangling link (386 atoms). No atom was written by the peek.

| Chunk | Verdict | Governing atoms | Open before code |
| --- | --- | --- | --- |
| 19b | PROCEED-WITH-SIGNOFF-PENDING | `rule_notation_display_preserves_phrase` 1.1 (REVIEW, BUSINESS), `module_notation_display_convention` 2.3, `module_notation_stem_direction` 0.2, `module_notation_layout_preflight` 0.9, `entity_my_instrument` 0.2, `rule_generated_notes_musicxml_export` 0.6 (REVIEW), `req_my_instrument` 0.4 (DRAFT); in the files also `rule_controller_transposition_check` (STABLE, contract surface; `vexflow-check-note-engraver.ts`), `rule_my_instrument_range_limits`, `entity_instrument_profile`, `module_notation_engraving_anchors`, `module_notation_note_identity_overlays`, `module_idle_fit_round`, `module_session_rolling_display`, `rule_session_layout_fixed_at_start`, `rule_session_ends_when_staff_too_small`, `rule_session_ends_on_portrait_view` (REVIEW) | Every atom the chunk names now says what it builds, so the capture point (where the clef sits) is already in `entity_my_instrument` 0.2 and `module_notation_display_convention` 2.3; tell `documentalist` if the design differs. `rule_controller_transposition_check` (STABLE) says only "one written note from the instrument's own range", with no clef, so drawing it in my instrument's clef keeps it true; no contract change. No atom names the check note's clef: at the post-task sync, the clef code in `vexflow-check-note-engraver.ts` links `rule_notation_display_preserves_phrase`, which now says every staff is in the selected instrument's clef. The sign-off pending is not the chunk's: the owner's later ruling (kept sessions tied to my instrument, reviewed with it as it is now, its current clef included) is not yet a spec decision, and `rule_kept_session_content` waits for it. Keep the review's clef source easy to change: Scope's "every reader draws the clef the phrase carries, the review included" may become "the review reads my instrument's current clef". The same ruling may touch `req_last_session_review` (STABLE, contract surface: "engraved exactly as it was displayed"), for `spec-writer` and the owner. Keep true: the built-ins' staff, snapshots and MusicXML byte for byte; the clef in no generation request, controls, worker message or replay key (the `ifk1.` corpus); `makeMyInstrument`'s refusals unchanged; no range refusal per clef (`rule_my_instrument_range_limits` states only the two-octave minimum until `spec-writer` records the approved bound); a new my instrument's clef is treble only as the templates' clef, the default itself being for the Clef design gate. |

#### Owner rulings during wave 2: range bound, sessions and their instrument (2026-10-12)

Three spec decisions, written into master spec Part A v1.10:

- **The range bound (spec D294).** My instrument's written range must lie within written C2–C7
  in treble clef and written E0–E5 in bass clef, refused live in the sheet with the reason in note
  names; a clef change checks it again. The **Range ruling** step is settled. Chunk 19b still
  measures the bass-clef bound and confirms the shared height stays at most 24 staff spaces (if
  not, back to the owner); chunk 20 enforces it.
- **Kept sessions belong to their instrument (spec D295).** Deleting my instrument deletes every
  kept session played with it; saving a change to its range or transposition (in the sheet, or
  through the check) first warns that it erases them, and how many, then erases them on
  confirmation. The session that just ended goes too, its review closing as on `Delete session`.
  An outdated tab offers neither action while my instrument has kept sessions. No migration: no
  v3.0 session data exists.
- **The classifications and O181 (spec D296).** A transposition change counts like a range
  change; a name or clef change is cosmetic (no warning, sessions kept, each phrase still in the
  clef it was played in). A save that changes the shared height re-checks the pre-generated
  phrases as a window change does (O181(b)). A review never cuts a phrase: when its session needs
  more height than the shared height (a clef change can cause it), it makes room; how is
  `ux-writer`'s. [Spec O181](../../open-questions.md#v30-wave-2-o180) is closed.
- **A contract wording, proposed for the owner.** `req_last_session_review` (STABLE) promises the
  review "stays reachable until the next session starts". Deleting a session from its own review
  (chunk 12) already ends it sooner, and so do the new paths (chunk 20c). Proposed: add "or until
  the player deletes its session"; MAJOR by the contract's rule unless the owner rules it MINOR
  (master spec §10). It becomes the owner step **Review reachability**, before chunk 12 merges.
  "Engraved exactly as it was displayed" holds unchanged, since each phrase keeps its clef.

What it changes in the plan (v8):

- **Merged chunks.** Chunks 4, 19 and 23 need no change. Chunk 16's `makeMyInstrument` gains the
  per-clef bound beside the two-octave rule; chunk 20 adds it (after chunk 19b's clef), with tests
  beside chunk 16's. The chunk 19b preflight's pending sign-off is answered: the review draws the
  clef the phrase carries, as chunk 19b's Scope says; `rule_kept_session_content` keeps the clef
  with each phrase.
- **In flight.** Chunk 24 needs no change of behaviour. Its re-check after a window change is
  what chunk 20 calls after a save that changes the shared height, so it should take "the layout
  changed" from any cause, not only a resize event.
- **Chunk 17** keeps each phrase's full instrument and clef in the kept-session record; a clef
  change of my instrument leaves a kept session drawn in its old clef. Its "edited or deleted"
  wording goes: deletion and range or transposition changes now erase the sessions (chunk 20c).
- **Chunk 20** enforces the bound and re-checks pre-generated phrases on a save that changes the
  shared height. It no longer waits for the range ruling or O181. Deleting and changing my
  instrument do not touch kept sessions yet: until chunk 20c, its delete confirmation keeps the
  current design's words.
- **New chunk 20c, My instrument's sessions,** in a new wave 9: the deletion with sessions, the
  erase warning in the sheet and in the check's confirmation, the review of an erased session
  closing, the outdated-tab restriction, and a review making room for a session in another clef.
  It waits for chunks 14, 20 and 21 and the **Sessions design** gate. The release gate moves to
  wave 10.

#### Owner ruling at the end of wave 2: a stale phrase at Start (2026-10-13)

ISS-011, found by chunk 24 and reproduced on v2.0.0 on 2026-10-12: after a change of Written key,
Collection or Register at Idle (sometimes Harmonic motion), Start throws `CarryInError` and
nothing starts, from 60 to 220 BPM. The owner: "it's not urgent. plan it for the end of v3.0"
(no v2 hotfix), and "when starting session says the current phrase is stale and ask either to
regenerate or use it". Spec D297, master spec Part A v1.11 §16:

- **Stale** means made under settings that differ, in what the generation reads, from the current
  ones; the tempo, the session options, the mix, the theme, my instrument's clef and name and the
  window's width never count.
- **Use it** starts the session with phrase 1 unchanged; phrase 2 joins it as after a settings
  change at a phrase boundary, through the existing carry-in rules, so no `CarryInError` can occur.
- **Regenerate** is proposed to run the Idle Regenerate and stay at Idle (spec O182, for the
  owner).
- **Pre-generation** keeps running with a stale phrase 1 and builds the phrases Use it plays;
  chunk 24's quiet stop on `CarryInError` goes.
- **The starting note** asks too: a contract wording, proposed for the owner (the
  **Starting-note wording** step).

What it changes in the plan (v9): a new [chunk 24b](#chunk-24b--stale-phrase-at-start) in wave 9,
beside chunk 20c; the **Stale phrase design** gate for `ux-writer`; the owner steps **O182** and
**Starting-note wording**; hand check H9; definition-of-done item 24 in §7. No merged chunk
changes; chunk 24's quiet stop is replaced in chunk 24b. Later the same day the owner closed O182
(Regenerate stays at Idle) and accepted the starting-note wording as MAJOR (CONTRACT 5.0), so
both owner steps are done and the **Stale phrase design** gate can start. The **Review reachability** step is done
(CONTRACT 4.0, 2026-10-12).

#### Wave 3 preflight (2026-10-14)

`documentalist` ran the full pass and the file pass for chunks 5 and 9 on `v3.0-w3` (made from
`main` 488d9e0), without an LLM: classifications from `atd query`, the `@spec-link` tags in the
chunks' files, grep over the atoms, and reading the atoms, the master spec, the design and the
code they name. Chunk 9's architecture capture is made now, before code: two new atoms,
`entity_kept_session_record` and `module_kept_session_codec` (ARCHITECTURE, DRAFT). `atd lint`
passes. No status was advanced and no STABLE atom was touched. Statuses as found: every atom the
two Atoms lines name is DRAFT, except `rule_session_history_keeps_timeline_and_inputs` and
`service_session_history` (REVIEW); in reach also `module_on_device_database` and
`module_session_seed_plan` (REVIEW). VISION 0.9 covers kept sessions; no atom of either chunk is on
the contract's surface (CONTRACT 5.0).

| Chunk | Verdict | Governing atoms | Open before code |
| --- | --- | --- | --- |
| 5 | PROCEED-WITH-SIGNOFF-PENDING | `rule_no_save_during_session`, `rule_failed_save_never_disturbs_session`, `rule_persistent_storage_requested`, `rule_outdated_tab_stops_saving` (DRAFT); in reach also `rule_first_phrase_waits_for_saved_settings` (the `off-unreadable` state), `rule_settings_saved_on_change` (a change during a session saved at its end), `req_your_data` (estimate, persisted) (DRAFT), and `module_on_device_database` (REVIEW, on `storage-port.ts`) | Nothing blocks. The sign-off pending is the sync's: flushing the held writes "in one transaction" needs a batch the port lacks (it writes one record per call), so extending `storage-port.ts` revises `module_on_device_database`'s interface, for the owner at the wave gate. No ARCHITECTURE atom governs the save policy (`module_on_device_database` leaves it to "the save policy built on this port"); the sync records one. "Never while saving is off" for the persistence request is not in `rule_persistent_storage_requested`, and agrees with it: a visit that saves nothing keeps nothing. The "reports once" rule is the design's (saved-data handoff, Notices). Keep true: nothing touches the database while held; while off, a queued write is dropped, never flushed later; the meta check inside every write transaction holds for the batch too; the port's error kinds unchanged. |
| 9 | PROCEED-WITH-SIGNOFF-PENDING | `rule_kept_session_content`, `rule_kept_session_holds_no_acknowledgements` (DRAFT); (v2) `rule_session_history_keeps_timeline_and_inputs`, `service_session_history` (REVIEW); captured `entity_kept_session_record`, `module_kept_session_codec` (DRAFT); in reach also `req_kept_session_list`, `req_kept_session_review`, `rule_played_notes_kept_only_after_opt_in`, `rule_outdated_tab_reads_what_it_can` (DRAFT), `module_session_seed_plan`, `module_on_device_database` (REVIEW); in the review files `req_last_session_review`, `rule_review_played_notes_toggle`, `rule_repeat_phrase_marked_internally_only` (STABLE) | The leader settles the three points below and the capture is completed at the sync. The owner's sign-off is on `rule_kept_session_content`'s wording (gap 1 below), which does not block the code: the capture already holds the session seed, from master spec §5.2. If the review input adapter touches `ReviewPanel.vue`, `ReviewPhrase.vue` or `review-types.ts`, it is a type change only: the review of the session that just ended engraves, lists and exports exactly as today. Keep true: the history and the export modules storage-free (the trap test); no acknowledgement, rhythm or tension provenance or diagnostics in any record; a profile decoded from its data, never rebuilt from its id; the `ifk1.` corpus untouched. |

The capture, in short. A kept session is up to three records under one key the saver supplies:
the session-wide record in `sessionSummaries` (start, length, phrase count, the musical profile
selection at Start, the instrument id with the display name it had, starting and reached tempo,
pinned, favorites count, comment, whether played notes are kept, the app version that recorded it
in a field of its own, and the session seed); the body in `sessionBodies` (per sounded phrase: its
number, its start, the timeline, the chord symbols' harmony, the intent with the profile as data,
the tempo, the repeat mark with the phrase repeated, the favorite mark and the clef); and the
played notes in `playedNotes`, only when kept. Every time is in seconds from phrase 1's scheduled
start, the earliest audio-clock moment the history holds. Decoding classifies through the envelope
(a newer record left unread, an invalid one unreadable, never repaired) and gives the review's
input, inventing nothing the records do not hold.

Left to chunk 9's leader (recorded in the atoms at the sync):

- **The length.** The history holds no end time and the design shows whole minutes ("Under 1 min"
  below 30 seconds). Proposed: from phrase 1's scheduled start to the end of the last sounded
  phrase, computed from the history alone.
- **The session seed's record.** The capture puts it in the session-wide record, reading the
  spec's "one session-wide record"; §2's store list calls `sessionSummaries` what a list row shows.
  The leader may move it to the body; the atom follows.
- **Validation without a rebuild by id.** No parser validates a stored harmony beyond "a plain
  object" (`parseGenerationProvenance` is private and only checks that), and the only whole-intent
  parsers (`rebuildGenerationWorkerIntent`, `parseGenerationWorkerIntent`) rebuild the profile
  from its id. The pieces that fit are `parseGenerationRequest`, `parseCarryIn`,
  `parseInstrumentProfile`, `parseConcertEventTimeline` and `isInstrumentClef`.

Plan corrections the preflight found (applied in v10, as chunks 5 and 9 were built):

- **Chunk 9, Scope.** The body list lacks each phrase's number, its start, the phrase a repeat
  repeats and its clef. The review's played-notes lane and the played-notes MIDI input read each
  phrase's start (the input checks that phrases are back to back), and master spec §5.2 keeps the
  clef with each phrase's instrument since spec D293 and D295.
- **Chunk 9, Scope.** "Decoding validates through the existing parsers (outcome …)":
  `parseGenerationOutcome` requires `provenance.rhythm`, `provenance.tensionBinding` and
  `diagnostics`, which are never kept, so it cannot read a kept phrase (the third point above).
- **Chunk 9, Scope.** "`src/session/` … not changed" and "the same review input the in-memory
  history gives": the review and the export adapters (`musicXmlInputFromHistory`,
  `midiInputFromHistory`, `playedNotesMidiInputFromHistory` in `src/session/session-history-export.ts`)
  take `SessionHistoryRecord`, whose outcome needs the provenance and diagnostics and whose record
  needs the acknowledgements. Decoding cannot give one without inventing them. Either those
  parameters narrow to the fields read (a type-only change in `src/session/`), or the review input
  adapter builds the encoder inputs itself. The leader chooses; behaviour in `src/session/` does
  not change either way.
- **Chunk 9, Scope.** The summary's app version is the session's own fact; the envelope's
  `appVersion` names the app that last wrote the record, which a migration rewrites. The capture
  keeps them apart.
- **Chunk 5, Scope.** "Every write is skipped while off" should say deletes too, with one
  exception: in a visit whose read failed (`off-unreadable`), Delete everything stays offered (master
  spec §4.4), while an outdated tab offers none (the port already refuses it). The batch added for
  the flush is best made to take deletes as well as writes, so chunk 10's one save transaction
  (write the new session, delete every unpinned one) needs no second port change.

Chunk 17 and the clef: no schema change is needed. Master spec §5.2 and `rule_kept_session_content`
0.2 already keep my instrument's clef with each phrase's instrument, and the capture puts a clef
field in every body phrase now (treble for every built-in, the only instruments a session can be
played with before chunk 17) and keeps each phrase's profile as data, decoded without a rebuild
by id. Chunk 17 changes only where the clef comes from (the history record it adds the clef to)
and has the review read it. No v3.0 session data exists before the release, so data version 1
would need no migration even then.

Gaps:

1. **For the owner (wording), does not block.** `rule_kept_session_content` 0.2 (DRAFT, BUSINESS)
   lists the session's facts without the session seed that master spec §5.2 keeps since spec D255
   and D258. Proposed: after "the app version that recorded it", add "and its session seed, the
   one seed every later phrase's seed derives from; nothing that can be derived from it is kept".
   It stays DRAFT, version 0.3.
2. **For `spec-writer` and `ux-writer`:** none found.

#### Wave 3 (2026-10-14): done

Chunk 5 merged into `v3.0-w3` (9f01f7f) and chunk 9 after it (fcabf7f); their records are under
[chunk 5](#chunk-5--save-policy) and [chunk 9](#chunk-9--kept-session-record). The wave-3 gate
ran on fcabf7f on the Linux dev machine: `npm run quality` green (unit 5,872, e2e 309, a11y 45,
notation 106 with 4 skipped); the entry chunk is 227,629 B, unchanged since wave 2. What the two
chunks found for later chunks is written into chunks 8, 10, 11 and 17 (plan v10, spec D299); the
kept-session size is the measured one (spec D299). ISS-012, found during the wave and older than
it, goes to [chunk 10](#chunk-10--most-recent-session-kept), which reads the review's instrument
name from the session's own data before chunk 17 makes a my-instrument session playable.

#### Wave 4 preflight (2026-10-14)

`documentalist` ran the full pass and the file pass for chunks 7 and 8 on `v3.0-w4` (made from
`main` 261984a), without an LLM. No record changed and no capture was made: the interface between
chunks 7 and 8 is mostly fixed already by `module_save_policy` (REVIEW, from wave 3); the one
piece it leaves open, the load outcome, is left to chunk 7 and recorded at the wave sync, with the
loader, as an ARCHITECTURE atom.

| Chunk | Verdict | Governing atoms | Open before code |
| --- | --- | --- | --- |
| 7 | PROCEED | `rule_settings_saved_on_change`, `rule_saved_setting_is_players_choice`, `rule_saved_settings_load_tolerantly`, `rule_first_phrase_waits_for_saved_settings`, `rule_no_save_during_session`, `req_on_device_storage` (DRAFT); `module_save_policy` (REVIEW); (v2) `rule_mutation_reverts_at_session_end` (STABLE), `rule_adaptive_tempo_resets_after_session` (REVIEW); Part D as the chunk lists it, plus `service_session_controller` (REVIEW) | Nothing blocks. The sync applies the Part D revisions, revises `service_session_controller` (its three flags no longer only "in memory for the page's lifetime"; the hold and release go through it) and records the loader. Keep true: settings saved from the player's change handlers only. |
| 8 | PROCEED | `rule_failed_save_never_disturbs_session`, `rule_outdated_tab_stops_saving`, `rule_failed_read_told_to_player` (DRAFT); `module_save_policy`, `module_on_device_database` (REVIEW) | Nothing blocks. `module_save_policy` 0.1 says a run of refusals is reported once, which the chunk's change of kind contradicts; the contradiction was known from wave 3 (spec D299) and is cleared by the chunk's revision to 0.2, whose wording awaits the owner's sign-off. |

The reading of "told outside a running session, never during one"
(`rule_failed_read_told_to_player`) as "appears outside a running session": a notice already
showing at Start stays, its buttons disabled, as the design says. No action unless the owner
disagrees.

Plan corrections the preflight found, applied in v11 (spec D300):

- **Chunk 7, Atoms and Part D.** `rule_first_phrase_waits_for_saved_settings` governs the
  start-up wait, the defaults and saving off. `service_session_controller` (REVIEW) holds the three
  session options "in memory for the page's lifetime", and the hold and release go through it;
  `module_session_adaptive_tempo_control` says the flag is "off at load".
- **Chunk 7, Scope: the options enter at the controller's creation.** A saved `Rising tempo` `On`
  must load with no MIDI controller attached (the phrase-workspace design keeps the stored `On`
  while the option is unavailable), and `setAdaptiveTempo(on)` throws then.
- **Chunk 7, Scope: the load outcome.** Chunk 8's outdated-tab wording needs to know whether the
  visit read the saved data or started from the defaults, which the saving state alone cannot
  carry. A port that opens after the start-up wait gets its policy then, and
  `stopSavingUnreadable()` at once. `spec-writer`, checking this against chunk 4's port, found the
  preflight's example inexact: a newer version's database whose read-only reopening fails gives an
  unavailable port, so `off-unreadable`, not `off-outdated`; the plan states the cases the code
  gives, and the divergence from the design is [spec O190](../../open-questions.md#v30-wave-4-o190).
- **Chunk 7, Scope: saves from the player's handlers only,** never from a watcher on control
  values, which would save a `Vary settings` change, the end-of-session restore or the tempo reset.
- **Chunk 7, Files.** There is no theme composable; the real files are named, with `docs/storage.md`
  and `docs/testing.md`, and the 7a/7b split is stated by file and by "Done when" line.
- **Chunk 8, Atoms, Files and Revisions.** `rule_failed_read_told_to_player` governs the
  unusable-data notice; `docs/storage.md` changes ("Failure report", "Not here yet");
  `module_save_policy` 0.1 → 0.2, pending the owner's sign-off.
- **Chunk 8, Scope.** The port's outdated report carries no cause, so after another tab's
  `Delete everything` the notice shows the newer version's wording, the design's fallback; no cause
  is added to the port (spec D300, the wave driver's call under the owner's delegation).

**Owner sign-off (2026-10-14).** The owner signed `module_save_policy` 0.2 ("ok for
module_save_policy 0.2"); `documentalist` applied it on `v3.0-w4` (2509b01) before chunk 8's code.

Plan corrections after chunk 7a, applied in v12 (spec D301, D302). Run on `v3.0-w4` at 5ae353d,
the full e2e suite fails four tests, three of them on "no IndexedDB database":

- **Chunk 7b takes the tests that assumed no database.** `persistence-absence`'s first test was
  already 7b's. `review-privacy`'s storage half gets an interim narrowing in 7b, widened by chunk
  10 and rewritten by chunk 11, so the wave-4 and wave-5 gates stay green on a real guarantee.
  `pregeneration`'s storage test (from chunk 24, missed by §2) and `offline-and-fonts`' second
  test, which races the start-up wait after its reload (passes alone, fails under load), are
  fixed in 7b too.
- **Chunk 7b, the loaded profile selection.** A preset, not custom, loads as custom with its
  grammar when its seven values are not all its own (spec D302); the atom
  `rule_profile_control_customization` is added, so 7b needs a peek before it starts.
- **Chunk 20, the start-up read.** The bootstrap reads the `instrument` store and sets
  `myInstrumentLoaded`; `src/storage-bootstrap.ts` joins its files.

**Peek before chunk 7b (2026-10-14).** `documentalist` peeked at 7b after v12: proceed, with
notes. The interim `review-privacy` check is stricter than `rule_optional_midi_privacy` (STABLE);
`rule_session_data_never_sent_or_stored` (REVIEW) saying settings are never stored is known drift
since 7a, left to chunk 10's Part D. D302 agrees with `rule_profile_control_customization`; it
literally departs from `rule_saved_settings_load_tolerantly` 0.1 (DRAFT: "every other saved setting
still loads with its saved value"), so the wave sync proposes 0.2: "A saved preset, not custom,
whose profile-controlled values after loading are not all that preset's loads as custom with that
preset's grammar; each value keeps what it loaded with." That wording goes to the owner with the
wave report.

#### Wave 4 gate (2026-10-14)

Chunk 7 merged into `v3.0-w4` in two halves (7a 5259cd5, 7b ba27042) and chunk 8 after it
(6071356); their records are under [chunk 7](#chunk-7--saved-settings) and
[chunk 8](#chunk-8--notice-row). The gate ran on the Linux dev machine (AMD Ryzen 5 PRO 8640HS
laptop, bare metal). Three failures, each fixed on the wave branch in its own commit:

- `lint:health`: five unattached ATD links from chunk 8 (286bad0).
- `verify:boundaries`: the entry chunk at 247,690 B, over its 229,376 B budget (wave 3: 227,629 B).
  Per merge: 7a +14,216 B (the loader: port, database, settings codec, save policy, bootstrap),
  7b +2,538 B, 8 +3,307 B; nothing came in by accident. Fixed without a behaviour change or a budget
  raise (6d66c37): the generation worker client and the staff drawing code load on demand after the
  first draw, and the request envelope's basics moved to `generation-request-envelope.ts` so the
  parser and carry-in leave the entry. **Entry 218,663 B, 10,713 B of headroom, −8,966 B since
  wave 3.** First-load JS (the entry plus the side chunks it imports) went from 237,200 B to
  226,301 B. The budget measures `index-*.js` only, and Rolldown's side chunks can move code out of
  it without shrinking the first load; the builder suggests M5 measure first-load JS (for
  `spec-writer`).
- `review-export.spec.ts`: its second session opened on the first session's saved format, as §4.2
  says it should since 7b; the test now sets the format it needs (9f3977e).

Then `npm run quality` green on 9f3977e: unit 5,949, e2e 335, a11y 45, notation 106 with 4
skipped; `atd:lint` and `atd:check` pass. No chunk placed the sweep at this gate.

## 2. Read first: what v3.0 undoes in v2

v2 promised that nothing survives a reload and enforced it three ways: two code gates, about ten
tests and three contract guarantees. v3.0 reverses the promise on purpose
([master spec §10](master-spec.md#10-what-v30-changes-in-v2s-guarantees)). Each enforcement point
changes in exactly one chunk, never "along the way" (one exception, `review-privacy`'s storage
half, narrowed in steps; spec D301):

| What says "nothing is saved" today | Changed in | Becomes |
| --- | --- | --- |
| `eslint.config.js` `forbiddenPersistenceApis`; `scripts/verify-boundaries.mjs` `forbiddenPersistence` | [3](#chunk-3--storage-boundary-gates) | Storage APIs allowed in `src/storage/` only, still banned everywhere else; `navigator.storage` and `cookieStore` banned outside it too (a gap today). |
| `tests/e2e/release/persistence-absence.spec.ts` › 'no customized control, generated phrase, or instrument profile survives a reload' | [7](#chunk-7--saved-settings) | Settings come back; a generated phrase still does not. |
| same file › 'a retryable generation failure does not survive a reload' | [7](#chunk-7--saved-settings) | Same behaviour; its storage-length checks become "no failure record in the database". |
| `tests/e2e/workspace/theme.spec.ts` › 'nothing about the theme choice persists across a reload' | [7](#chunk-7--saved-settings) | The theme comes back. |
| `tests/e2e/review/review-navigation.spec.ts` › reloading discards the Review | [10](#chunk-10--most-recent-session-kept) | After a reload, `Review last session` opens the kept session. |
| `tests/e2e/review/review-privacy.spec.ts`, storage half | [7](#chunk-7--saved-settings) (7b, interim), [10](#chunk-10--most-recent-session-kept), [11](#chunk-11--played-notes-opt-in-and-deletion) | In steps, since chunk 7a opens the database at every load (spec D301). 7b: the app's database and its settings records only; no session, phrase, review or played-notes data. 10: the kept session too, still no played note. 11: only allowed data is written; played notes only after the opt-in. The network half stays as it is. |
| `tests/e2e/workspace/pregeneration.spec.ts` › 'pre-generation writes nothing to storage' | [7](#chunk-7--saved-settings) (7b) | Pre-generation writes no record; the app's database may exist (spec D301). |
| `tests/e2e/review/review-opens.spec.ts` › 'the Review has no favorites…' | [12](#chunk-12--favorites-pin-and-comment-in-the-review) | Favorites exist; still no grading wording anywhere. |
| `tests/e2e/controller/controller-status.spec.ts` › 'after a page reload no controller is remembered…' | [22](#chunk-22--remembered-controller) | The remembered controller is reattached when access is already allowed; after `Disconnect`, nothing is. |
| Reload-based determinism tests in `audio-transport-mix.spec.ts`, `midi/midi-input.spec.ts`, `release/deterministic-replay.spec.ts` | [7](#chunk-7--saved-settings) re-checks them | They must not depend on a reload returning to defaults; each is fixed or proved unaffected. |
| `tests/unit/session/session-history-export.spec.ts` › 'touches no browser storage…' | **Never** | Stays green: the history and export modules stay storage-free (definition-of-done item 4). |
| Contract guarantees in `req_last_session_review`, `rule_optional_midi_privacy`, `rule_same_controller_reattaches` | **Gate A** | Narrowed to what holds in both v2.0 and v3.0 (CONTRACT 2.0). |
| `req_last_session_review`: the review "stays reachable until the next session starts" | **Review reachability** (done 2026-10-12) | "or until the player deletes its session" (spec D295), confirmed MAJOR (CONTRACT 4.0). |
| `rule_midi_starting_note`: playing the starting note "starts the count-in" | **Starting-note wording** (done 2026-10-13) | With a stale phrase 1, the note first asks, as Start does (spec D297), confirmed MAJOR (CONTRACT 5.0). |

Every replaced test gets its v3.0 counterpart in the same chunk, and the gate lists each pair
(item 22).

### The storage design the chunks build on

Proposed here, settled in [chunk 4](#chunk-4--database-core) with `documentalist`'s architecture
capture before code, and written down in a new `docs/storage.md`:

- **One directory, `src/storage/`.** Everything that touches IndexedDB or `navigator.storage`
  lives there: the database adapter, and the pure codecs that decide what a record holds, so "what
  is saved" is auditable in one place. The rest of the app reaches it through an injected port
  (the pattern `src/audio/` and `src/midi/` already use), never by import of a browser API.
  `src/session/` and `src/export/` never import it.
- **Raw IndexedDB, no library.** 4,840 bytes of entry-chunk headroom are left after the wave-1
  gate (entry 224,536 of 229,376 bytes; 8.8 kB when this was written, 5,759 bytes at chunk 2); a
  hand-written promise wrapper over the few calls needed costs less than `idb`. If chunk 4 finds otherwise,
  `idb` (about 1.5 kB gzip) is the fallback, never a larger library.
- **One database, a few object stores:** `meta` (the database's data version and the app version
  that last upgraded it), `settings` (one record per setting, so each loads and fails on its own),
  `instrument` (my instrument), `controller` (the remembered controller), `sessionSummaries`
  (what a list row and Your data's counts show), `sessionBodies` (the phrases, read only when a
  session is opened) and `playedNotes` (one record per session, a store of its own so the opt-in
  and the deletions are provable).
- **Every record carries `dataVersion` (an integer, 1 for v3.0) and `appVersion`** (the package
  version, injected at build time). Migrations run in the database's upgrade step, one step per
  data version.
- **Saving is off, not failing, when it must be:** an outdated tab, or a visit started from the
  defaults because the read failed or was too slow. A **hold** queues every write while a session
  runs and flushes the latest value per record at its end.
- **Outdated tab detection:** at open (a stored data version above the code's, or a `VersionError`
  from a database upgraded by a newer app, in which case the tab reopens it without a version to
  read what it can); while open (the `versionchange` event, and a check of `meta` inside every
  write transaction, so a newer tab that wrote without an upgrade is caught before this tab
  writes).

## 3. Workflow: waves and chunks

Work runs **wave by wave**. The intent checks and the full test and performance pass happen once
per wave; a chunk tests only what it changed. The owner chose this on 2026-10-09 (spec D252) for a
better quality-to-cost ratio. He accepts that the chunks of one wave may drift a little apart
before the wave gate catches it.

**Order.** One wave at a time, in wave order. Inside a wave, one chunk at a time, in number order.
**One coding chunk is in flight at a time.** A chunk may go ahead of a blocked lower-numbered chunk
of the same wave. If a chunk is still blocked when the rest of its wave is done (it is waiting for
the owner, a design answer or a measurement), it leaves the wave: the wave closes without it, and
it joins the next wave, whose preflight covers it.

**Branches.** At the start of a wave, a wave branch `v3.0-w<n>` is made from `main` in its own
worktree (`/home/bastien/work/infinite_flow-v3.0-w<n>`). Each chunk runs in its own worktree
(`/home/bastien/work/infinite_flow-v3.0-c<n>`) on a branch made from the wave branch
(`v3.0-c<n>-<slug>`). It ends with one commit, merged `--no-ff` into the wave branch as soon as
its chunk checks pass; that merge needs no owner approval. The wave branch merges `--no-ff` into
`main` after the wave gate, when the owner asks, so `main` only ever receives waves that passed
the full gate. Never reuse `../infinite_flow-perf-investigation`.

### Wave start: intent preflight

1. `documentalist` runs its preflight **once for the whole wave**. It does the full pass, then
   runs again with the files of every chunk in the wave, starting from the chunks' **Atoms**
   lines. A missing or conflicting atom stops the chunk it concerns until it is resolved: a spec
   gap goes to `spec-writer`, a design gap to `ux-writer`. The wave's other chunks go on, because
   chunks in one wave are independent.
2. For every chunk of the wave marked **Architecture capture**, `documentalist` records the
   architecture now, before any code, in a commit on the wave branch.
3. A chunk runs no preflight of its own. If a chunk still meets an atom that contradicts it, it
   stops and reports it as in step 1. It never fixes it silently.

ATD covers business behaviour and architecture only, never tooling, tests' plumbing or
measurement scripts.

### Every chunk: four steps

A chunk is finished when step 4 is done and it is merged into the wave branch.

1. **Tests first, red to green.** Write the tests for the chunk's **Done when** first and see them
   fail on an assertion about the missing behaviour, not an import error.
   - Pure logic gets Vitest unit tests under `tests/unit/`, mirroring `src/`. IndexedDB in Vitest
     runs on `fake-indexeddb` (a dev dependency added in chunk 4); its quota and failure cases are
     injected through the port, never by a test-only branch.
   - Behaviour gets Playwright scenarios on the workspace harness. Each test starts with an empty
     browser context; a test that needs saved data seeds it through the harness's storage seam
     (added in [chunk 7](#chunk-7--saved-settings)), never by hand-built records.
   - A new Playwright spec outside `tests/e2e/notation/` is added to the explicit `test:e2e` list
     in `package.json`, or it never runs in `npm run quality`.
2. **Implement** until the tests pass, following [`CODING_RULE.md`](../../../CODING_RULE.md):
   crash early, no silent fallbacks (tolerant loading is the spec's explicit exception, and lives
   in one codec), injected seams instead of test-only branches, an injected clock, the file-size
   limits. Interface code uses only the classes and tokens of `src/styles/`; no raw visual value.
3. **Verify the change, not the whole app.** These are the **chunk checks**; each chunk's
   **Verification** line starts from them:
   - The chunk's **Done when** holds.
   - The tests the chunk adds or changes pass. So do the existing unit tests of the source files
     it touches (`npx vitest related --run <those files>`) and the Playwright specs it adds or
     edits.
   - `npm run typecheck`, `npm run lint` and `npm run format:check` pass, and
     `npm run lint:links` passes when the chunk changed a Markdown file.
   - A debug run shows the behaviour on screen (`npm run dev` in Chromium, or the workspace
     harness), with a landscape phone-sized window for anything that shows below
     `bp-tablet-landscape`. Never edit the repository while the owner is testing on the dev
     server: Vite reloads the page.
   - The chunk does **not** run `npm run quality`, the full end-to-end, accessibility or notation
     suites, the sweep, a bundle measurement or a timing measurement, unless its **Verification**
     line names that check. A line names one only when the check is the chunk's point: a
     measurement chunk, or a chunk whose change is that area (the boundary gates in chunk 3,
     notation in chunk 19). A check the line places "at the wave gate" waits for the wave gate.
4. **Documents.** `README.md` (directory boundaries, the forbidden-API lists, the quality-gate
   table), `docs/storage.md` (new, from chunk 4), `docs/testing.md` (every new seam, fake and
   fixture), and the area's own document. A place where the code had to differ from the spec or
   the design is reported to `spec-writer` or `ux-writer`, never fixed silently.

### Wave end: the wave gate

"The gate" alone still means the release gate, chunk 26; "the wave gate" is this one.

When the wave's last chunk is merged into the wave branch, on that branch and on an idle machine
(never while `atd audit` runs: it saturates the machine and makes timing tests fail):

1. **The full test pass.** `npm run quality`, and `npm run test:sweep` when a chunk of the wave
   places the sweep at the wave gate, with every other check or measurement a chunk's
   **Verification** line places there. A failure is traced to the chunk that caused it and fixed
   on the wave branch in a commit of its own. A fix that would change behaviour the spec or the
   design states goes to `spec-writer` or `ux-writer` instead.
2. **The bundle.** The entry chunk's size after `npm run build`, with its change since the
   previous wave ([measurement M5](#m5--the-first-load-bundle)), is written in the wave's merge
   commit message. A chunk's "lazy" or "unchanged" claim about the entry chunk is checked here.
3. **Performance.** A figure measured on a virtual machine never gates: it is recorded with the
   machine and date, for reference. The owner checks budgets on the reference machine.
4. **Post-task sync, once for the wave.** `documentalist` runs it over the wave's whole diff. It
   checks the `@spec-link` / `@test-link` tags (directly above the function or test, never at the
   top of a file), confirms the atoms still describe the code, and applies every chunk's
   **Part D** revisions (the non-STABLE atoms the change set tags `changes-in-v3.0`). It advances
   a status only with the owner's agreement. `npm run atd:lint` and `npm run atd:check` pass. The
   sync is committed on the wave branch.
5. **Merge.** The owner gets a short report: the chunks merged, any chunk moved to the next wave,
   the gate's results, the bundle figure and the sync's changes. The wave branch merges into
   `main` when he asks. Then its worktrees and branches are removed.

## 4. Measurements

Five figures the spec leaves to the build, each with the chunk that takes it and where it is
recorded. The gate copies each into the release notes.

### M1 — The stray-note threshold

- **What:** the constant under which a played note counts as a very short "stray" note
  ([§9](master-spec.md#9-stray-notes)): a note a controller sends for a few milliseconds while the
  fingers move between two positions. It must stay well under 62.5 ms, a sixteenth note at
  240 BPM. Measurement starts around 30–40 ms.
- **How:** the owner (step H1) plays, on the Travel Sax over USB in v2.0 as it ships (nothing new
  is needed), three sessions of a few minutes: slow scales, fast scales at 240 BPM, and free
  playing with many finger changes, then exports each session's played notes (v2.0's MIDI file,
  960 ticks per quarter note, so under 1 ms of resolution at any tempo). Chunk 25 adds a script
  that lists every note's length in ms from those files and draws the distribution. Stray notes
  show as a separate cluster of very short lengths, often in pairs at full velocity; the
  threshold goes in the gap between that cluster and the shortest intended notes.
- **Recorded:** a new section of [`docs/midi-tuning.md`](../../../docs/midi-tuning.md), with the
  files kept under `tests/fixtures/stray-notes/` so the filter's tests replay real data.

### M2 — The start-up wait for saved settings

- **What:** how long the first draw waits for saved data before starting from the defaults
  ([§4.4](master-spec.md#44-loading-saved-settings)). The design proposes 2 seconds.
- **How:** chunk 7 times the load read (settings, my instrument, the remembered controller and
  every session summary) on a seeded database with 0, 10, 100 and 500 kept sessions, cold (first
  load after a browser start) and warm, on the reference machine; the owner repeats it on the
  Chromium tablet if at hand. The constant is set at no more than 2 s and well above the slowest
  measured read.
- **Recorded:** `docs/storage.md`.

### M3 — My instrument: generator success and a written-range bound

- **What:** whether a range of exactly two octaves, or an extreme one, makes phrase generation
  fail too often ([§7.1](master-spec.md#71-what-it-is), item 16), and how far a written range may
  reach before it makes the staff taller for every instrument
  ([§14](master-spec.md#14-deferred-and-open)).
- **How:** chunk 16 runs a sweep like `npm run test:sweep` over player-made instruments: 24-semitone
  ranges placed low, middle and high in the MIDI range, the extreme ends (MIDI 0–24 and
  103–127), and wide ranges (48 and 60 semitones), each against every supported rhythm setting
  with two seeds, recording the share of failed generations by failure code. Chunk 19 measures,
  with the engraving calibration, the staff height a written range needs, and the written range
  beyond which the shared height grows past today's. Chunk 19b measures the same in bass clef
  (spec D293), the proposed bound E0–E5 included.
- **Recorded:** `docs/generation-latency.md` (a new "My instrument ranges" section) and
  `docs/notation-engraving.md`. The owner's **range ruling**, per clef, follows; `spec-writer`
  writes it into the spec, and chunk 20 enforces it.

### M4 — Phrase 2 joining phrase 1 at 240 BPM after pre-generation

- **What:** the share of 240 BPM sessions whose phrase 2 joins phrase 1 smoothly (generated with a
  **carry-in**: the generator continues from phrase 1's last note and chord instead of starting
  afresh) once pre-generation runs; v2's figure is 0 % (item 20).
- **How:** chunk 24 extends the real-cost sweep (568 cases, every supported rhythm setting × two
  seeds) with an Idle phase before Start, no deadline, then the session as today. It counts the
  cases whose phrase 2 is a carry-in phrase. Run by the owner on the reference machine.
- **Also, for information** (from the pre-generation draft, not the definition of done): the cost
  of up to four background generations after each change, on the tablet on battery, as a hand
  check.
- **Recorded:** `docs/generation-latency.md`.

### M5 — The first-load bundle

- **What:** the entry chunk stays within its 224 kB budget (`scripts/verify-boundaries.mjs`); about
  8.8 kB were left on 2026-10-05, 5,759 bytes at chunk 2 and 4,840 bytes after the wave-1 gate.
- **How:** chunk 2 measures the baseline on `main`; every wave gate records the entry size and its
  change since the previous wave ([§3](#wave-end-the-wave-gate)). Code that is not needed before the
  first draw loads on demand: the kept-session codec and the session list with the review's code,
  the Your data and my instrument sheets like the connection sheet. Raising the budget needs the
  owner.
- **Recorded:** each commit message, and the gate's release notes.

## 5. Hand checks

The owner runs these himself. His hardware is the Travel Sax breath controller over USB and the
reference machine; he owns no USB keyboard, so no keyboard check is part of v3.0 (v2.0's carried
keyboard checks stay where they are). Each is written into a new v3.0 part of
[`HARDWARE-CHECKLIST.md`](../../../HARDWARE-CHECKLIST.md) by the chunk named, and run at that chunk
or at the gate.

| Check | Chunk | What the owner does |
| --- | --- | --- |
| H1 Stray-note recordings | Wave 0, used by 25 | M1's three sessions, played-notes exports kept. |
| H2 Start-up wait | 7 | M2 on the reference machine, and the tablet if at hand. |
| H3 Use this for my instrument | 21 | Set the Travel Sax's transpose to a value that does not match the selected profile, run the check, use the result, confirm the written part now matches, reload, confirm it stayed. |
| H4 Remembered controller | 22 | Connect the Travel Sax, reload: it reattaches with no prompt; the starting note waits for one click; unplug and replug; `Disconnect`, reload: nothing reattaches. |
| H5 Stray notes in real playing | 25 | Play a fast passage, open the review: the lane shows no stray notes; the played-notes export leaves them out by default and keeps them with `Include very short notes`. |
| H6 Pre-generation at 240 BPM | 24 | Start several 240 BPM sessions right after phrase 1 appears and after waiting a few seconds; note the tablet's battery cost (M4, for information). |
| H7 Persistent storage in real Chrome | 26 | Pin a session in the installed app and in a plain tab; read Your data's Protection line. For information: Chrome decides silently. |
| H8 Favorites-only files in real programs | 26 | Open a favorites-only MusicXML in MuseScore and both MIDI files in a MIDI tool; phrase numbers and markers match the session. May follow the tag as a v3.0.x note, as in v2. |
| H9 Stale phrase at Start | 24b | ISS-011's steps: at Idle, after a phrase appears, change the Written key, then press Start at 60, 120 and 220 BPM; again with a Collection change and a Register change. Each time the prompt shows; Use it starts and phrase 2 follows; Regenerate shows a new phrase at Idle and starts nothing, and the next Start asks nothing. With the Travel Sax, play the starting note on a stale phrase: the prompt shows and nothing starts. |

## 6. Chunks

Each chunk names its goal, what it builds and where, the spec sections and design documents, the
atoms, what it waits for, how to tell it is done, which definition-of-done items it covers, and
how it is verified. "Item _n_" is item _n_ of [§13](master-spec.md#13-definition-of-done).
**Atoms** are ids of `docs/<id>.atom.md`; "(v2)" marks an existing atom the chunk must keep true
or revises. **Part D** lists the non-STABLE atoms tagged `changes-in-v3.0` that the chunk's
post-task sync revises.

### Chunk 0 — Intent re-sync to master spec v1.3

**Goal.** Bring the 37 v3.0 atoms in line with master spec v1.3. They were ingested from v1.0, and
v1.1 and v1.2 add behaviours the atoms do not have yet: `Disconnect` also forgets the remembered
controller; Delete everything reloads into a first visit; saving a session deletes every unpinned
session, not only the previous one; removing a session's last favorite never unpins it; switching
`Keep my played notes` on keeps the session that just ended; the start-up wait and the saving-off
visit; my instrument's written range kept when the transposition changes, and the range bound
still open; the remembered controller reattached only when MIDI access is already allowed; theme
and audio-mix changes made during a session saved at its end; the starting note waiting for the
page's first click after a load.

**Scope.** `documentalist`, spec ingestion (milestone refinement). Atoms only; no code. It also
puts the Gate A confirmation request in front of the owner, unchanged from the change set.

**Atoms:** every atom tagged `release-v3.0`; `rule_last_controller_remembered`,
`rule_delete_everything`, `rule_most_recent_session_kept`, `rule_favorite_pins_session`,
`rule_played_notes_kept_only_after_opt_in`, `req_on_device_storage`,
`rule_saved_settings_load_tolerantly`, `rule_settings_saved_on_change`, `req_my_instrument`,
`rule_my_instrument_range_limits` in particular.

**Depends on:** nothing.

**Done when:** each v1.1/v1.2 behaviour above is stated by an atom (still DRAFT); `npm run atd:lint`
and `npm run atd:check` pass; the change set file says which atoms changed.

**Items covered:** none directly; every later wave's preflight relies on it.

**Verification:** `documentalist`'s ingestion report; `npm run quality`.

### Chunk 1 — Token-source pass (pending owner approval)

**Pending the owner's go-ahead on [ux Q66](../../../ui_ux/open-questions.md).**

**Goal.** Write v3.0's new tokens and component classes into the canonical token source, so every
interface chunk can style its components without inventing a value.

**Scope.** `ux-writer`, not a coding executor. Edits `src/styles/theme.css` and
`src/styles/components.css` only: everything in
`ui_ux/token-source-v3.md` (deleted by this chunk once merged) (`--color-error-hover`,
`--sheet-wide-max-inline-size`, the stepper, text-input, comment-field and favorite-icon sizes, and
the new classes such as `sheet-wide`, `app-notice-row`, `layout-footer`, `sessions-panel`,
`session-row*`, `favorite-toggle`, `review-comment`, `review-scope`, `note-stepper`,
`range-alert`, `toggle-button`); clears the old `v2 new` / `v2 changed` comments; fixes the
audio-mix comment; then deletes `token-source-v3.md` and points `ui_ux/README.md` and the
handoffs at the token source alone. The chunk was built before the v3.0 design was frozen into
`ui_ux/versions/v3.0/`, so after the merge `ux-writer` applies the same clean-up there too (that
folder's README and handoffs), as `ui_ux/todo.md` records.

**Design docs:** `ui_ux/token-source-v3.md`,
[`ui_ux/README.md`](../../../ui_ux/README.md).

**Atoms:** none (styling is not business behaviour).

**Depends on:** the owner's Q66 answer.

**Done when:** every class and token `token-source-v3.md` names exists in `src/styles/`; no v3.0
handoff names a class that exists nowhere; `npm run quality` passes with no snapshot change
(nothing uses the new classes yet); `npm run lint:links` passes after the document is deleted.

**Items covered:** none directly; it unblocks 8, 10–15, 20–22 and 25.

**Verification:** `npm run quality`; a `grep` of each handoff's class names against `src/styles/`.

### Chunk 2 — Baselines: replay-key corpus and bundle headroom

**Goal.** Record, on the code v2.0.0 shipped, the two facts later chunks must not break: the
phrase every `ifk1.` replay key gives, and the entry chunk's size.

**Scope.**

- A corpus of `ifk1.` keys with the timeline each one replays to, generated from `main` before
  any v3.0 change: the three built-in instruments × Neutral and Jazz × a spread of controls ×
  several seeds, with and without carry-in (including a carry-in whose final harmony is null).
  Fixture `tests/fixtures/replay-keys/ifk1-v2.0.json` and a unit test,
  `tests/unit/generation-worker/phrase-replay-key-corpus.spec.ts`, that decodes each key and
  regenerates it through the worker runtime and expects the stored timeline byte for byte.
- The entry chunk's size after `npm run build` on `main`, written in this plan's chunk 2 record
  and in `docs/testing.md`'s fixture list with the corpus. It is measured on `main`, which still
  holds the v2.0.0 code, not on the wave-0 branch, which also holds chunk 1's styles. The wave-0
  gate's figure then shows what chunk 1 added.

**Files:** `tests/fixtures/replay-keys/ifk1-v2.0.json`, the spec above, a small generator script
under `scripts/` (tooling), `docs/testing.md`.

**Atoms:** none new (test plumbing); the corpus later backs `module_phrase_replay_key` and
`rule_seeded_phrase_reproduction` (v2), whose tags chunk 18 adds.

**Depends on:** nothing.

**Done when:** the corpus test passes on `main`; the baseline size is recorded.

**Items covered:** 19 (its "every `ifk1.` key still decodes to the same phrase" half, as a guard
for chunks 16, 17, 18 and 23).

**Verification:** the chunk checks; the corpus test is red if any timeline is changed by hand.

**Record (2026-10-09).** Measured on `main`'s v2.0.0 code, on a cloud VM (a VM figure is for
reference only). After `npm run build`, the entry chunk `dist/assets/index-*.js` is 223,617 bytes,
counted as `scripts/verify-boundaries.mjs` counts it: the minified file's size on disk, with no
compression (Vite reports 73.6 kB gzip, which no budget checks). Its budget is 224 kB of 1,024
bytes, 229,376 bytes, so 5,759 bytes (about 5.6 kB) of headroom are left, less than the 8,831 bytes
(the "about 8.8 kB" above) of the 2026-10-05 build: v2.0.0 took further source changes on
2026-10-06 and 2026-10-07. The corpus holds 87 cases: 72 standalone phrase-1 keys (three built-in
instruments × Neutral and Jazz × four control spreads × seeds 1, 7 and 42), 12 carry-in keys
(phrases 2 and 3 of a three-phrase chain on the eighths spread, per instrument and profile) and 3
key-change phrase-2 keys whose carry-in has a null final harmony. The fixture is about 711 kB.

### Chunk 3 — Storage boundary gates

**Goal.** Move the storage ban from "nowhere" to "one directory": allow IndexedDB and
`navigator.storage` in `src/storage/` only, and keep every other ban.

**Scope.** Per-directory allowance on the model of `src/audio/` (Web Audio) and `src/midi/` (Web
MIDI). `indexedDB` and `navigator.storage` allowed in `src/storage/` only; `localStorage`,
`sessionStorage`, `caches`, `document.cookie` and `cookieStore` still banned everywhere,
`src/storage/` included; `navigator.storage` and `cookieStore` newly banned outside it (today only
the end-to-end spy watches them). The PWA rules (`runtimeCaching: []`, the precache manifest)
are untouched.

**Files:** `eslint.config.js`, `scripts/verify-boundaries.mjs`,
`tests/unit/boundaries/eslint-boundaries.spec.ts`,
`tests/unit/boundaries/verify-boundaries.spec.ts`, fixtures under
`tests/fixtures/boundaries/src/storage/` (allowed) and the existing `src/audio/storage.ts` and
`src/midi/storage.ts` fixtures (still rejected); `README.md` (forbidden lists, quality-gate
table), [`docs/release/browser-and-offline-limits.md`](../../../docs/release/browser-and-offline-limits.md).

**Spec sections:** [§4.3](master-spec.md#43-where-and-how), [§12](master-spec.md#12-architectural-decisions-and-their-reasons).

**Atoms:** `req_on_device_storage`; (v2) `rule_session_data_never_sent_or_stored`,
`specification_ephemeral_state_verification`, `specification_browser_only_operation_verification`.
**Part D:** `rule_ephemeral_session_state` (its "never stored" clause gets the one-directory
wording, confirmed by the owner on 2026-10-09, spec D256; the full revision is chunk 7's).

**Depends on:** chunk 0.

**Done when:**

- An `indexedDB.open` and a `navigator.storage.persist()` call under `src/storage/` pass both
  gates; the same calls in `src/audio/`, `src/midi/`, `src/session/`, `src/export/` and
  `src/components/` fail both, each proved by a fixture.
- `localStorage`, `sessionStorage`, `caches`, `document.cookie` and `cookieStore` fail both gates
  even inside `src/storage/`.
- `tests/unit/session/session-history-export.spec.ts` is unchanged and green.

**Items covered:** 4.

**Verification:** the chunk checks; `npm run verify:boundaries`.

### Chunk 4 — Database core

**Architecture capture:** the storage design of [§2](#the-storage-design-the-chunks-build-on).

**Goal.** One IndexedDB database for the app, with versioned records, migrations, and the
outdated-tab rule, behind a port. No setting is saved yet.

**Scope.**

- `src/storage/database.ts`: open with the code's data version; create the object stores of §2;
  a migration runner (one step per data version, tested with a fake version 0 → 1 step and a
  synthetic 1 → 2 step that only the test registers through the port); on `VersionError`, reopen
  without a version, read-only, and report "outdated"; `versionchange` closes the connection and
  reports "outdated"; every write transaction reads `meta` first and aborts with "outdated" when
  its data version is above the code's.
- `src/storage/record-envelope.ts`: `dataVersion` and `appVersion` on every record; reading a
  record with a higher data version reports it as "newer" rather than failing.
- `src/storage/app-version.ts`: the package version, injected at build time. A `define` in
  `vite.config.ts` alone reaches neither `vitest.config.ts` nor the workspace and notation harness
  configs (`vite.workspace-harness.config.ts`, `vite.notation-harness.config.ts`), since none of
  them imports `vite.config.ts`; the capture settles how the version reaches them.
- `src/storage/storage-port.ts`: the interface the app sees (read, write, delete, delete
  everything, estimate, persisted, persist), and the error kinds: `quota`, `outdated`, `other`.
- `fake-indexeddb` as a dev dependency.

**Files:** the four `src/storage/` files above, `vite.config.ts` (`define`), and
`vitest.config.ts` and the two harness configs as the capture settles, `package.json`, tests
under `tests/unit/storage/`, `docs/storage.md` (new).

**Spec sections:** [§4.3](master-spec.md#43-where-and-how), [§4.6](master-spec.md#46-storage-belongs-to-one-address).

**Design docs:** [`flows/saved-data/handoff.md`](../../../ui_ux/versions/v3.0/flows/saved-data/handoff.md) (Load,
the newer-version branch).

**Atoms:** `req_on_device_storage`, `rule_outdated_tab_stops_saving`,
`rule_saved_data_belongs_to_browser_profile`, `rule_outdated_tab_reads_what_it_can` (the reopen
without a version), `rule_delete_everything` (delete everything),
`rule_persistent_storage_requested` (persist, persisted), `req_your_data` (estimate).

**Depends on:** chunk 3.

**Done when:**

- Every record written carries `dataVersion` and `appVersion`; a record without them is read as
  unreadable, as chunk 6's codec already reads it (its setting falls back to the default), never
  as an error thrown past tolerant loading.
- A database at data version 0 is migrated to 1 on open; a test-only step 1 → 2 runs in order.
- Two connections in one test: the newer opens with a higher version; the older gets
  `versionchange`, reports "outdated" and never writes again. A newer tab that writes a higher
  `meta` version without an upgrade makes the older tab's next write abort with "outdated".
- Opening a database already at a higher version gives a read-only connection and "outdated".
- Delete everything removes the database.

**Items covered:** 14 (the storage layer's half).

**Verification:** the chunk checks; the bundle at the wave gate (nothing imports the module yet, so
no change is expected).

### Chunk 5 — Save policy

**Goal.** Decide, in one place, when a write happens: saving on or off for the visit, held during
a session, failures classified and reported, persistent storage asked for once.

**Scope.** `src/storage/save-policy.ts` (pure, with the port injected):

- **Saving state:** `on`, `off-outdated`, `off-unreadable`. Every write and every delete is
  skipped while off, with one exception: in a visit whose read failed (`off-unreadable`), Delete
  everything stays offered (master spec §4.4). An outdated tab offers no deletion at all (the
  port already refuses it).
- **Session hold:** `hold()` at Start, `release()` at the session's end; writes made in between
  are queued, coalesced to the latest value per record, and flushed in one transaction at
  release, through the port's batch `apply`, which takes writes and deletes (so chunk 10's one
  save transaction needs no second port change). Nothing touches the database while held.
- **Failure report:** each failed write reports `quota` or `other` to one listener (the notice
  row, chunk 8); a run of refusals with no success between them reports once.
- **Persistent storage:** `requestProtection()` calls `navigator.storage.persist()` at most once
  per visit, never while saving is off, never when `persisted()` is already true.
- **Space and protection:** `estimate()` and `persisted()` wrappers for Your data.

**Files:** `src/storage/save-policy.ts`, `src/storage/storage-port.ts` (extended),
`tests/unit/storage/save-policy.spec.ts`, `docs/storage.md`.

**Spec sections:** [§4.1](master-spec.md#41-principles), [§4.2](master-spec.md#42-what-is-saved-automatically) (saved at the session's end), [§4.5](master-spec.md#45-keeping-the-data-safe-from-the-browser), [§5.1](master-spec.md#51-which-sessions-are-kept).

**Design docs:** [`flows/saved-data/handoff.md`](../../../ui_ux/versions/v3.0/flows/saved-data/handoff.md) (What
Is Saved, Notices).

**Atoms:** `rule_no_save_during_session`, `rule_failed_save_never_disturbs_session`,
`rule_persistent_storage_requested`, `rule_outdated_tab_stops_saving`.

**Depends on:** chunk 4.

**Done when:**

- Between `hold()` and `release()` the fake database sees no call at all; at `release()` it
  sees each held record once, with its latest value.
- While off, no write or delete reaches the database (Delete everything excepted in
  `off-unreadable`) and no protection request is made.
- A quota failure and an other failure are reported with their kind; a second refusal in a row
  is not reported again; one after a success is.
- `persist()` is called once per visit, after the first protection request, and never when
  already persisted.

**Items covered:** 7, 13 and 15 (the storage layer's half of each).

**Verification:** the chunk checks.

**Record (2026-10-14).** Merged into `v3.0-w3` (9f01f7f, chunk commit 98e2633); the wave-3 gate is
green on fcabf7f ([Wave 3](#wave-3-2026-10-14-done)). The port gained a batch, `apply`, taking
writes and deletes (`StorageChange`); `save(changes)` and `release()` both go through it, and the
meta check holds for the batch. Deletes are skipped while off, Delete everything excepted in
`off-unreadable`. The policy has one failure listener, told only the kind; a run of refusals is
reported once whatever its kinds, as this chunk's Done when asked ([chunk 8](#chunk-8--notice-row)
adds the change of kind). The builder's calls, kept as built: held changes that fail to flush are
dropped, not retried (the queue is cleared before the attempt); `requestProtection()` made during
a session waits for the release, so the browser is never asked while a session runs; an invalid
held change throws only at release, when the port checks it, not when it is queued (the reviewer
noted this is later than crash-early). `persist()` is asked through
`src/storage/save-policy-requests.ts`.

### Chunk 6 — Tolerant settings codec

**Goal.** Load each saved setting on its own: an unknown or invalid value becomes that setting's
default, and every other setting is kept.

**Scope.** `src/storage/records/settings-record.ts`: encode and decode one record per setting:
each of the 14 controls (instrument selection included, which may name my instrument by its fixed
id, `my-instrument`, never by its display name; master spec §7.1), the
musical profile selection, the theme, the audio mix (each on/off and volume), the three "During a
session" options, the review's format, backing-track and `Played notes` choices, and
`Keep my played notes`. Decoding validates each value through the existing validators
(`validateControlValue`, `normalizeTempo`, `validateClickVolume`, `validateBackingVolume`) and
falls back to that setting's default, never throwing; the musical profile parser is exported from
`src/generation-worker/generation-worker-inbound.ts` or a tolerant twin is added. After decoding,
the whole set goes through `makeGenerationControls` once, so the strict builders still guard what
the app runs. A saved instrument selection naming my instrument is kept only if my instrument
itself loads (the my-instrument record arrives in chunk 20; until then it falls back).

**Files:** `src/storage/records/settings-record.ts`, maybe `src/storage/records/setting-defaults.ts`,
`src/generation-worker/generation-worker-inbound.ts` (export only),
`tests/unit/storage/settings-record.spec.ts`.

**Spec sections:** [§4.2](master-spec.md#42-what-is-saved-automatically), [§4.4](master-spec.md#44-loading-saved-settings).

**Atoms:** `rule_saved_settings_load_tolerantly`, `rule_saved_setting_is_players_choice`,
`rule_settings_saved_on_change`, `rule_outdated_tab_reads_what_it_can`,
`rule_played_notes_kept_only_after_opt_in`.

**Depends on:** chunk 0. Independent of chunks 3–5 (pure code).

**Done when:**

- For every setting, a record with an unknown value, a wrong type, or an out-of-range number
  decodes to that setting's default, and every other setting in the same load keeps its saved
  value (property test over random corruptions).
- A record with a higher data version is treated as unreadable for that setting only.
- `Sixteenth` density round-trips as `Sixteenth` whatever the window width: the codec stores the
  chosen controls, never the generated ones.
- Rising tempo's reached tempo has no record.

**Items covered:** 2, 3.

**Verification:** the chunk checks.

### Chunk 7 — Saved settings

**Goal.** Read the saved data before the workspace is first drawn, and save every setting when the
player changes it.

**Scope.**

- **Load:** a bootstrap module beside `main.ts` (`src/storage-bootstrap.ts`) opens the port,
  creates the save policy, and reads the settings, the session summaries' presence and the
  remembered-controller record through it, with the start-up wait as a constant
  ([M2](#m2--the-start-up-wait-for-saved-settings)); the page shows only its background until
  then; the workspace is drawn once with the loaded values, and no control changes value after it
  is drawn. A read that fails or is too slow starts from the defaults and calls
  `stopSavingUnreadable()`, so saving is off for the visit (the notice comes in chunk 8). A port
  that opens only after the start-up wait gets its policy then, and `stopSavingUnreadable()` at
  once; if that port opened outdated, the policy starts `off-outdated` and stays so (the design's
  newer data revealed by a late read). Nothing is generated until the player asks, as today.
- **Load outcome:** the load exposes whether the visit started from the saved data read or from
  the defaults. Chunk 8's outdated-tab notice reads it for its wording ("saved data read" or
  "started from the defaults"); the saving state alone cannot carry it, since `off-outdated`
  comes both with saved data read (a port that opened outdated and read) and with the defaults on
  screen (a port that opened outdated, or turned outdated before the load read, whose start-up
  read then failed or outlasted the wait, and a port that opened outdated after the wait). The
  wave sync records the loader (the start-up wait, the read before the first draw, the hold and
  release, the load outcome) as an ARCHITECTURE atom.
- **The session options enter at the controller's creation.** The session controller's three
  flags (`varySettings`, `tensionAcrossPhrases`, `adaptiveTempo`) take their loaded values when
  the controller is created, never through its actions: the controller loads as its own chunk
  after the first draw, and `setAdaptiveTempo(on)` throws when turning the flag on while no MIDI
  controller is attached, which is the usual state at load. A saved `Rising tempo` `On` loads
  even then: the option shows `Off` and disabled while unavailable, keeps the stored `On`, and
  shows `On` again as soon as a controller attaches (phrase-workspace handoff, Rising tempo).
- **Save on change:** the player's change handlers for the controls and the musical profile
  selection, the theme, the audio mix (each on/off, and each volume on slider release), the three
  "During a session" options and the review host's preferences each call the save policy.
  Settings are saved from those handlers only, never from a watcher on control values: a watcher
  would also save a setting `Vary settings` changed, the end-of-session restore and the rising
  tempo's reset (`rule_saved_setting_is_players_choice`, `rule_mutation_reverts_at_session_end`).
  Values the app changes by itself during a session (a mutated setting, the rising tempo) are
  never saved.
- **Session hold:** the session controller calls `hold()` at Start and `release()` at its end, so
  theme and mix changes made during a session are saved then.
- **Harness seam:** `window.__workspaceHarness.storage` to seed records before load and read
  what was written, documented in `docs/testing.md`.
- **The loaded profile selection (7b, spec D302).** The settings codec decodes the musical
  profile selection and the seven profile-controlled values each on its own, so a saved preset,
  not custom, can load with a value that is not the preset's (one value, or the selection itself,
  fell back to its default). After decoding, such a selection loads as custom with that preset's
  grammar, the state a manual edit leaves; a preset whose seven values are all its own stays
  checked. Silent, as every fallback (master spec §4.4).
- **Tests that assumed no database (7b, spec D301).** 7a opens IndexedDB at every load. Beside
  the rewrites of [§2](#2-read-first-what-v30-undoes-in-v2), three tests change here.
  `review-privacy`'s storage half takes an interim narrowing that stays a real guarantee until
  chunk 10 widens it and chunk 11 rewrites it: the spy allows `indexedDB.open` and nothing else
  (`indexedDB.deleteDatabase` and every other storage API still banned); the end state allows
  the app's one database and, read through the harness's `storage.records()`, settings records
  only, so no session, phrase, review or played-notes data reaches any storage; its network half
  is unchanged. `pregeneration`'s 'pre-generation writes nothing to storage' checks that
  pre-generation writes no record, every store the same before and after, instead of "no
  database". `offline-and-fonts`' 'offline after the first load…' waits for the workspace to be
  drawn after its reload, as `gotoWorkspace` does, before generating: the start-up wait delays
  the first draw, and the test raced it under the full suite's load.
- **Docs:** `docs/storage.md` records M2 and the start-up wait, the load outcome and the hold, and
  its "Not here yet" loses what this chunk wires.

**Files:** `src/storage-bootstrap.ts` (new; or the load in `src/App.vue`), `src/main.ts` or
`src/App.vue` (the wait before the first draw; `App.vue` also applies the loaded theme through
`src/components/workspace/apply-theme-preference.ts`), `src/components/workspace/create-workspace-session.ts`
(the loaded values and the policy, passed on), `src/composables/use-generation-session.ts` and
`src/composables/generation-session-control-actions.ts` (controls, profile selection, theme:
loaded, and saved from `setControl`, `selectMusicalProfile` and `setTheme` or their callers in
`WorkspaceShell.vue` and `ThemeControl.vue`), `src/audio/audio-transport.ts` (the loaded mix),
`src/components/workspace/MixControls.vue` and `MixVolumePanel.vue` (the mix's on/off and
sliders), `src/components/workspace/workspace-session-controller.ts` with its dependencies
(`workspace-session-controller-seams.ts`), `workspace-adaptive-tempo.ts` and `workspace-session-settings.ts` (the three flags'
loaded values; the hold and release), `src/components/workspace/use-session-options.ts`,
`src/components/workspace/use-review-host.ts`, `tests/e2e/workspace-harness/main.ts` (the seam);
docs: `docs/storage.md`, `docs/testing.md`; tests: `tests/unit/storage/storage-bootstrap.spec.ts`
(new), `tests/e2e/storage/saved-settings.spec.ts` (new), the rewritten tests of
[§2](#2-read-first-what-v30-undoes-in-v2), `tests/e2e/review/review-privacy.spec.ts` (storage
half, interim), `tests/e2e/workspace/pregeneration.spec.ts` (its storage test),
`tests/e2e/release/offline-and-fonts.spec.ts` (the wait after the reload); the loaded profile
selection: `src/storage/records/settings-record.ts` with `tests/unit/storage/settings-record.spec.ts`.
There is no theme composable: the theme is state of
the generation session, shown by `ThemeControl.vue` and applied by `App.vue`.

**Spec sections:** [§4.2](master-spec.md#42-what-is-saved-automatically), [§4.4](master-spec.md#44-loading-saved-settings).

**Design docs:** [`flows/saved-data/handoff.md`](../../../ui_ux/versions/v3.0/flows/saved-data/handoff.md) (What
Is Saved, Load), [`flows/generate-phrase/handoff.md`](../../../ui_ux/versions/v3.0/flows/generate-phrase/handoff.md)
(the load step), [`screens/phrase-workspace/handoff.md`](../../../ui_ux/versions/v3.0/screens/phrase-workspace/handoff.md)
(saved settings, the load wait, Rising tempo).

**Atoms:** `rule_settings_saved_on_change`, `rule_saved_setting_is_players_choice`,
`rule_saved_settings_load_tolerantly`, `rule_first_phrase_waits_for_saved_settings` (the
start-up wait, the defaults, saving off), `rule_no_save_during_session`, `req_on_device_storage`,
`module_save_policy` (REVIEW, kept true); (v2) `rule_mutation_reverts_at_session_end`,
`rule_adaptive_tempo_resets_after_session`; (7b, spec D302) `rule_profile_control_customization`
(REVIEW), whose custom state a loaded selection may now take.
**Part D:** `rule_ephemeral_session_state`, `specification_ephemeral_state_verification`,
`req_adaptive_tempo`, `module_session_adaptive_tempo_control` (its flag "off at load"),
`rule_sixteenth_unavailable_below_tablet_width`, `req_settings_mutation_flag`,
`req_multi_phrase_tension_arc`, `module_session_vary_settings_flag`,
`module_session_tension_across_phrases_flag`, `module_review_played_notes_lane` (the switch is
saved), `service_idle_generation_session`, and, added by the wave-4 preflight though the change
set does not tag it, `service_session_controller` (REVIEW): its interface holds `varySettings`,
`tensionAcrossPhrases` and `adaptiveTempo` "in memory for the page's lifetime", and the hold and
release at Start and at the session's end go through it.

**Revisions:** at the wave sync, a new ARCHITECTURE atom for the loader: the start-up wait, the
read before the first draw, the hold and release, and the load outcome chunk 8 reads.

**Depends on:** chunks 5 and 6.

**Done when** (the half that owns each line in brackets):

- [7b] Every setting of §4.2's table, changed and reloaded, comes back with the player's value; a
  rising-tempo session's reached tempo does not; each "During a session" option comes back on
  only if the player turned it on (one e2e test per row of the table).
- [7b] Below `bp-tablet-landscape`, a chosen `Sixteenth` reloads as `Sixteenth`.
- [7a] Every seeded setting loads, and the workspace is first drawn with it; until the load ends
  the page shows only its background, and no control changes value after the first draw.
- [7a] A seeded invalid value loads as its default, silently, and the other seeded values load.
- [7a] A seeded `Rising tempo` `On` with no controller attached shows `Off` and disabled, and
  `On` once a controller attaches; seeded `Vary settings` and `Tension across phrases` load on.
- [7a] An injected failing read, a read slower than the start-up wait, and a port that opens
  after it: the defaults on screen, saving off, the load outcome "started from the defaults"; a
  port that opened outdated and read: the saved values, `off-outdated`, "saved data read"; one
  that opened outdated whose read fails: the defaults, `off-outdated`, "started from the
  defaults" (unit tests on the bootstrap with the fake port).
- [7b] After a session in which `Vary settings` changed settings and `Rising tempo` raised the
  tempo, a reload shows the player's own values: nothing the app set during the session, nor the
  end-of-session restore, was written.
- [7b] A write spy on IndexedDB sees no write from Start to the session's end, then the theme or
  mix change made during it.
- [7b] The rewritten `persistence-absence`, `theme` and reload-based determinism tests pass;
  `persistence-absence`'s first test, failing since 7a on its "no database" check, among them.
- [7b] `review-privacy`, its storage half narrowed: the spy, still armed for every API it wraps,
  records no storage call but `indexedDB.open`; at the end the only IndexedDB database is
  `infinite-flow`, its `sessionSummaries`, `sessionBodies` and `playedNotes` stores are empty,
  every `settings` record is one the settings codec reads back, and Storage, Cache Storage,
  cookies and service workers are empty. Its network half and its export checks are unchanged.
- [7b] `pregeneration`'s storage test: the queue filling changes no record in any store, and the
  other storage areas stay empty. `offline-and-fonts` passes under the full e2e suite.
- [7b] A saved `Jazz`, not custom, whose `Register` record is invalid loads as custom with the
  Jazz grammar ("Custom configuration - Jazz grammar retained"), `Register` at its default and
  the other values kept; a saved `Jazz` with its seven values all valid loads with `Jazz` checked;
  an unreadable selection with Jazz's seven values loads as custom with the Neutral grammar (unit
  tests on the codec).

**Items covered:** 1 (but my instrument and the controller), 2, 3, 7.

**Verification:** the chunk checks; [M2](#m2--the-start-up-wait-for-saved-settings) and hand check
H2 (7a); the bundle at the wave gate (the loader is in the entry chunk).

**Split rule.** This is the widest wiring chunk, past about five source files, so it is built in
two halves, in order, each its own commit that leaves the app working:

- **7a, load before the first draw:** `src/storage-bootstrap.ts`, `src/main.ts` or `src/App.vue`,
  `create-workspace-session.ts`, `use-generation-session.ts` (loaded controls, profile selection
  and theme), `audio-transport.ts` (the loaded mix), `use-review-host.ts` (the loaded
  preferences), `workspace-session-controller.ts` with its dependencies (`workspace-session-controller-seams.ts`),
  `workspace-adaptive-tempo.ts` and `workspace-session-settings.ts` (the flags' loaded values),
  the harness seam, M2 and H2, and `docs/storage.md` (M2, the wait, the load outcome) and
  `docs/testing.md`. Most of these files gain only an initial value. It owns the "Done when" lines
  marked [7a]. The policy exists after 7a, but nothing saves yet.
- **7b, save on change:** `generation-session-control-actions.ts` (or its callers in
  `WorkspaceShell.vue` and `ThemeControl.vue`), `MixControls.vue`, `MixVolumePanel.vue`,
  `use-session-options.ts`, `use-review-host.ts` (the saves), and the hold and release in the
  session controller, with `saved-settings.spec.ts`, the rewritten tests of §2, the three tests
  that assumed no database, the loaded profile selection in `settings-record.ts`, and
  `docs/storage.md` ("Not here yet" loses the hold and release). It owns the lines marked [7b].

**Record 7a (2026-10-14).** Merged into `v3.0-w4` (5259cd5, chunk commit 3ec46c3). The load outcome
is `SavedDataLoad.outcome` (`'saved-data-read' | 'started-from-defaults'`) in
`src/storage-bootstrap.ts`, reached through `App.vue`'s `savedData` prop and
`workspace.savedData`; `savePolicy` is a promise, settled before the draw when the port opened in
the wait. M2: `STARTUP_WAIT_MS` stays 2,000 ms; the slowest read was 23 ms (500 kept sessions,
cold), 2026-10-14, AMD Ryzen 5 PRO 8640HS laptop, headless Chromium (`npm run measure:startup-read`,
`docs/storage.md`). H2 is with the owner (`HARDWARE-CHECKLIST.md`; its tablet step needs 7b).
Outside 7a's file list, to carry the loaded values: `WorkspaceShell.vue` and `ScorePanel.vue`
(optional props), `use-session-options.ts` (shows the loaded values while the controller loads),
`tests/e2e/workspace/helpers.ts` (`gotoWorkspace` waits for the mount); the harness global now
appears after the load. Reported to the wave driver: the settings codec decodes the profile
selection and the profile-controlled controls independently (a "Jazz, not custom" whose one value
fell back shows Jazz with an off-preset value); `myInstrumentLoaded` stays false until the
my-instrument chunk reads its store. Opening IndexedDB at every load breaks
`persistence-absence` test 1 (7b's rewrite) and the storage half of `review-privacy` (chunk 11's).

**Record 7b (2026-10-14).** Merged into `v3.0-w4` (ba27042, chunk commit 4af5a6c); no deviation
from the spec or the design. Saves go through `src/storage/settings-saver.ts`
(`createVisitSaves`: one batch per player change, kept in order before and after the policy
resolves, reached through the `SAVE_SETTINGS` injection from `App.vue`); `hold()` before the start's
`try` in `workspace-session-start.ts`, `release()` in `tearDown`. The mix volumes save on slider
`change`. D302 is `loadedProfileSelection` in `settings-record.ts`. The four tests 7a broke pass
(`offline-and-fonts` inside a 133-test run). Builder's calls: `review-privacy` resets the format
and backing track between its two sessions (now saved); `theme.spec`'s "comes back" test links
only `rule_settings_saved_on_change` (its `rule_ephemeral_session_state` link dropped, for the
wave sync); `pregeneration` reads IndexedDB directly (the seam cannot reach `meta`). Nothing
listens to `policy.onFailure` yet (chunk 8); no `requestProtection()` caller yet. H2's tablet step
is now possible.

### Chunk 8 — Notice row

**Goal.** Tell the player, outside a running session, when saving failed, when storage is full,
when the tab is outdated, and when the saved data could not be read.

**Scope.** `app-notice-row` at the top of `layout-workspace` with its four notices, one at a
time, by the rules of the saved-data flow: the save-problem notice in two wordings, outdated and
unusable notices replacing it, `Dismiss` and `Reload`; a notice arising during a session held
until it ends; a notice showing at Start kept still, its buttons disabled. `Your data` in the
storage-full notice is rendered disabled until chunk 15 adds the sheet (or added by chunk 15).

**The save policy's report (a small change to chunk 5's code).** Chunk 5 reports a run of
refusals with no success between them once, whatever their kinds. The design switches a showing
save-problem notice to the latest cause's wording (saved-data flow, Notices), so the policy also
reports when the refusal's kind changes within a run (`quota` after `other`, or the reverse). A
refusal of the same kind in the same run is still not reported again. The notice row switches
the wording of a showing notice in place; a notice dismissed during the run stays dismissed until
a save succeeds and then fails again.

**The outdated tab's wording.** The notice reads chunk 7's load outcome: its saved-data wording
when the visit read the saved data, its defaults wording when the visit started from the defaults
(the saving state alone cannot tell them apart; see [chunk 7](#chunk-7--saved-settings)). An
unusable-data notice switches in place to the defaults wording when the tab becomes outdated later
in the visit. After `Delete everything` in another tab, the notice shows the newer version's
wording, the design's own fallback: the port's outdated report carries no cause
(`module_on_device_database`, `onOutdated`), and none is added in v3.0 (spec D300). A newer
version's database whose read-only reopening fails gives an unavailable port, not an outdated one
([spec O190](../../open-questions.md#v30-wave-4-o190)); the notice follows the saving state and
the load outcome either way, so it needs nothing more here.

**Files:** `src/components/workspace/AppNoticeRow.vue` (new), `src/components/workspace/use-app-notices.ts`
(new), `src/components/workspace/WorkspaceShell.vue`, `src/storage/save-policy.ts` (the report
above), `docs/storage.md` (its "Failure report" says a run is "told once, at its first refusal",
which the report above changes; "Not here yet" says the notices come "from the saving state and
the failure report", to which the load outcome is added, and loses them once built), tests
`tests/unit/...use-app-notices.spec.ts`, `tests/unit/storage/save-policy.spec.ts`,
`tests/e2e/storage/notices.spec.ts`.

**Spec sections:** [§4.1](master-spec.md#41-principles), [§4.3](master-spec.md#43-where-and-how) (outdated tab), [§4.4](master-spec.md#44-loading-saved-settings).

**Design docs:** [`flows/saved-data/handoff.md`](../../../ui_ux/versions/v3.0/flows/saved-data/handoff.md)
(Notices), [`screens/phrase-workspace/handoff.md`](../../../ui_ux/versions/v3.0/screens/phrase-workspace/handoff.md)
(notice row).

**Atoms:** `rule_failed_save_never_disturbs_session`, `rule_outdated_tab_stops_saving`,
`rule_failed_read_told_to_player` (the unusable-data notice); also governing,
`module_save_policy` (REVIEW) and `module_on_device_database` (REVIEW, the port's outdated
report).

**Revisions:** `module_save_policy` 0.1 → 0.2, staying REVIEW: a refusal is reported again each
time its kind differs from the last one reported in the run. **Done 2026-10-14:** signed by the
owner and applied before the chunk's code (2509b01); the chunk builds it.

**Depends on:** chunks 1 and 5, and chunk 7 for the load notices and the load outcome, read from
its merged code.

**Done when:**

- Seeded data with a higher data version: the outdated notice shows in its saved-data wording,
  and a write spy sees no write for the rest of the visit, a session's end included.
- An outdated tab whose start-up read fails or outlasts the wait: the outdated notice in its
  defaults wording; an unusable-data notice showing when the tab becomes outdated later switches
  to that wording in place.
- The database deleted from a second page of the same browser context (`indexedDB.deleteDatabase`,
  as another tab's `Delete everything` does): the outdated notice in the newer version's wording,
  saving `off-outdated`, and no write for the rest of the visit.
- An injected slow or failing read: the unusable-data notice, defaults on screen, no write.
- An injected quota refusal at a setting change: the storage-full notice; another refusal keeps
  one notice; a success then a refusal shows it again after `Dismiss`.
- A quota refusal then an other failure with no success between: one notice, switched in place to
  the Save failed wording (and the reverse); after `Dismiss`, neither brings it back until a save
  has succeeded.
- An outdated condition raised during a session shows only when it ends; the session's timing is
  unchanged (fake clock).
- No focus move and no live region on any notice; phone and desktop layouts checked.

**Items covered:** 14, 15.

**Verification:** the chunk checks; a debug run with two tabs on the dev server (the newer one
simulated through the harness).

**Record (2026-10-14).** Merged into `v3.0-w4` (6071356, chunk commit 5f9f902). `AppNoticeRow.vue`
and `use-app-notices.ts` are new; `WorkspaceShell.vue` takes the required `savedData` prop.
`module_save_policy` 0.2 is built, and the failure listener became `listener(kind, startsRun)`
(`SaveFailureListener`): under 0.2 the row could not otherwise tell a change of kind inside a run
from a new run after a success, and so could not keep a dismissed notice away until a save succeeds.
A `documentalist` peek found it within 0.2 (no sign-off); the wave sync revises the atom's
TECHNICAL INTERFACE. Harness: `?storageRead=fail|slow`, `storage.refuseSaves(kind)`,
`storage.portChanges()`, `storage.openNewerVersion()` (`docs/testing.md`). Outside the file list:
`src/App.vue` (one line), and a `quietSavedData()` test helper for the seven `WorkspaceShell`
spec files. Known gap, not a deviation: a refusal before the row attaches its listener (only while
a late-opening port's policy is arriving) is not shown, though it counts toward its run.
`WorkspaceShell.vue` is near the 400-line warning.

### Gate A — Contract 2.0

Not a chunk: an owner step with a commit of its own, made by `documentalist` on `main`. The owner
confirms part A of the change set in its own words; `documentalist` applies A1
(`req_last_session_review` 0.5), A2 (`rule_optional_midi_privacy` 0.3), A3
(`rule_same_controller_reattaches` 0.2) and A4 (`contract_infinite_flow_first_release` 2.0, with
the date and the confirmation in its notes). **Chunks 11, 12 and 22 may not merge before it.**
The confirmation is item 23's evidence.

### Chunk 9 — Kept-session record

**Architecture capture:** the kept-session shape (summary, body, played notes) and the mapping
layer beside the history. The capture checks whether replaying a kept session needs any fact
beyond master spec §5.2's list; if it does, the leader names it and it goes to the owner as a new
spec question before the record is built (spec D258). One candidate to raise if replay needs it,
not settled: the three "During a session" options as they were at Start (Vary settings, Tension
across phrases, Rising tempo), since each phrase's inputs show their effects but not the choices.

**Goal.** Turn a finished session's in-memory history into the record v3.0 keeps, and back into
what the review reads, keeping only what the review and the exports need.

**Scope.** `src/storage/records/kept-session-record.ts`: from `SessionHistory` to a summary
(start date and time, length, phrase count, musical profile, instrument by its id, with its
display name as shown then, starting and reached tempo, pinned, favorites count, comment, whether
played notes are kept, app version), the session-wide record's facts that are not for the list
(the session seed of chunk 23; master spec §5.2; nothing derivable from the session seed, such
as the later phrases', ladder rungs' or mutation seeds, spec D258), and a body (per sounded
phrase: its phrase number, its start, the timeline, the chord symbols' harmony, the reproduction
intent with the profile as data, the stored generation `request`, the tempo, the repeat mark with
the phrase it repeats (`repeatOf`), the favorite mark and the clef); played notes, when asked
for, as a separate record with times in seconds from the session's start. Never
acknowledgements, rhythm or tension provenance, or diagnostics. Decoding validates with the
chunk's own kept-phrase parsers, built from the existing pieces that fit (`parseGenerationRequest`,
`parseCarryIn`, `parseInstrumentProfile` on the intent's own profile, `parseConcertEventTimeline`,
`isInstrumentClef`), never a rebuild by id: `parseGenerationOutcome` cannot read a kept phrase,
since it requires the provenance and diagnostics that are never kept. Decoding produces the
review's input. The review and export adapters take that input through narrowed types
(`ReviewedPhrase`, `ReviewedOutcome`): a type-only change in `src/session/`, `src/export/` and
the review, so the review of the session that just ended engraves, lists and exports exactly as
before.

**Files (as built):** `src/storage/records/kept-session-record.ts` (`encodeKeptSession` and the
decoding), `kept-session-summary.ts`, `kept-session-body.ts`, `kept-played-notes.ts`,
`kept-phrase-parsers.ts`, `kept-record-shape.ts` and `kept-reading.ts` in the same directory;
type-only changes in `src/session/session-history.ts`, `src/session/session-history-export.ts`,
`src/export/`, `src/domain/notation/notation-input.ts`, `src/components/review/` and
`src/components/workspace/review-export.ts`; tests under `tests/unit/storage/`.

**Spec sections:** [§5.2](master-spec.md#52-what-a-kept-session-holds), [§7.1](master-spec.md#71-what-it-is) (the id), [§12](master-spec.md#12-architectural-decisions-and-their-reasons).

**Atoms:** `rule_kept_session_content`, `rule_kept_session_holds_no_acknowledgements`; (v2)
`rule_session_history_keeps_timeline_and_inputs`, `service_session_history`.

**Depends on:** chunk 4 (envelope); chunk 23 (the session-wide record and its session seed in the
history). Independent of chunks 5–8.

**Done when:**

- A recorded five-phrase session with played notes and acknowledgements encodes to records whose
  keys are an allowlist: no `acknowledgements`, `provenance.rhythm`, `provenance.tensionBinding`
  or `diagnostics` anywhere.
- Decoding gives a review input from which MusicXML and MIDI exports are byte-identical to the
  exports of the in-memory session, for the three instruments.
- Played-note times decode relative to the session start and export identically.
- The session-wide record round-trips: the session seed decodes to the value the history held,
  and the instrument decodes by its id, with the display name it had then.
- A 30-minute 240 BPM Jazz `Sixteenth` session's summary and body encode to at most 4.25 MB,
  measured in a guard test (built: 4.07 MB, master spec §5.2, spec D299). No compact encoding.
- `session-history-export.spec.ts`'s storage trap stays green.

**Items covered:** 8; 4 (the history stays storage-free).

**Verification:** the chunk checks.

**Record (2026-10-14).** Merged into `v3.0-w3` (fcabf7f, chunk commit 7d71d01); the wave-3 gate is
green on that merge ([Wave 3](#wave-3-2026-10-14-done)). `encodeKeptSession` and
`decodeKeptSession` are the entry points (`kept-session-record.ts`); nothing outside
`src/storage/records/` calls them yet (chunk 10 does). The body holds each sounded phrase's
number, start, `repeatOf`, clef and stored `request` beside the timeline, harmony, intent, tempo
and favorite mark; `KeptPhrase` extends the review's `ReviewedPhrase` with the clef. Decoding
validates with the chunk's own parsers (`kept-phrase-parsers.ts`), since `parseGenerationOutcome`
cannot read a kept phrase. The review and export input was narrowed by type only
(`ReviewedPhrase`, `ReviewedOutcome` in `src/session/session-history.ts`). The summary holds the
instrument as `{ id, displayName }`, the name taken from the first phrase's profile. Size,
measured on 450 phrases (the guard test in `kept-session-record.spec.ts`): 4.07 MB for summary
and body (timeline 2.2, harmony 0.83, intent 0.77, request 0.27 MB); played notes add about
1.5 MB at one note per shown note; the guard is 4.25 MB and no compact encoding is built (spec
D299). Until [chunk 17](#chunk-17--my-instrument-across-the-worker-and-the-history), the body
encoder throws for a my-instrument phrase, whose clef the history does not carry yet.

### Chunk 10 — Most recent session kept

**Goal.** Save the session once, as its review opens; keep it across a reload; delete every
unpinned older session in the same save; open it again from `Review last session`.

**Scope.** At the session's end, after the review opens: release the hold, then encode the
session with chunk 9's `encodeKeptSession` and save it in one port `apply` batch that writes the
new session (summary and body; played notes only when `Keep my played notes` is on, which is
always off until chunk 11) and deletes every unpinned kept session. A session ended
during its count-in saves and deletes nothing. A failed save keeps the session in memory as the
most recent one, deletes nothing, and the review's keep line says "Not saved on this device…";
storage full also raises the notice, and no other failure of this save does (the design's Save
failed is for saves other than the session's own). The save policy's one listener cannot tell
which save failed, so the session's save is marked as the session's own, through a parameter of
the policy call or a result path of its own (the leader chooses): a `quota` refusal of it reaches
the notice row, an `other` failure reaches only the keep line. After a reload, `review-link` shows when the most recent
kept session can be read, and opens it (reading it first, `is-loading`). The review title and
summary use the session date. The review's instrument name comes from what the session holds,
never from a lookup by id: the kept summary's `instrument.displayName` for a kept session, the
phrase intent's own profile for the session that just ended. Today `use-review-host.ts` looks the
name up with `getInstrumentProfile(id)`, which throws for `my-instrument`, so the review of a
my-instrument session would crash once chunk 17 makes one playable (ISS-012). `review-keep-line` in its three wordings (only "Not saved" on the
phone). `review-privacy`'s storage half, as chunk 7b narrowed it, is widened to the kept session
(spec D301): its summary and body may be written; still no played note in any record.

**Files:** `src/components/workspace/workspace-session-ends.ts` (save at end),
`src/components/workspace/session-review-state.ts`, `src/components/workspace/use-review-navigation.ts`,
`src/storage/save-policy.ts` (the session's own save), `src/components/workspace/use-review-host.ts`
(the instrument name, ISS-012),
`src/components/review/ReviewPanel.vue` (keep line, title), `src/components/workspace/SessionCueRow.vue`
(`review-link` rule), tests `tests/e2e/storage/kept-session.spec.ts`, the rewritten
`review-navigation` reload test, `tests/e2e/review/review-privacy.spec.ts` (storage half widened).

**Spec sections:** [§5.1](master-spec.md#51-which-sessions-are-kept), [§5.4](master-spec.md#54-reaching-earlier-sessions).

**Design docs:** [`flows/kept-sessions/handoff.md`](../../../ui_ux/versions/v3.0/flows/kept-sessions/handoff.md)
(Keeping at a Session's End, the cue-row links),
[`flows/review-and-export/handoff.md`](../../../ui_ux/versions/v3.0/flows/review-and-export/handoff.md) (Saving
the Session), [`screens/last-session-review/handoff.md`](../../../ui_ux/versions/v3.0/screens/last-session-review/handoff.md)
(`review-keep-line`, title).

**Atoms:** `rule_most_recent_session_kept`, `req_kept_sessions`, `req_kept_session_review`,
`rule_no_save_during_session`, `rule_failed_save_never_disturbs_session`; (v2)
`req_last_session_review`. **Part D:** `rule_session_data_never_sent_or_stored`,
`rule_new_session_discards_review`, `req_rolling_practice_session`,
`rule_session_history_keeps_timeline_and_inputs`, `service_session_history`.

**Depends on:** chunks 1, 7, 8 and 9.

**Done when:**

- A session played, the page reloaded: `Review last session` opens the same review (notation and
  exports byte-identical to before the reload).
- A second session's save leaves one kept session; a pinned one (seeded) survives it.
- A session ended in its count-in changes nothing kept.
- A write spy sees nothing between Start and the end, then exactly one save transaction.
- An injected failure at the end: the session's end is not delayed (fake clock), the keep line
  says "Not saved…", the review works in full. An `other` failure raises no notice; a `quota`
  refusal raises the storage-full notice as the review opens.
- The review names the instrument from the session's own data: a unit test of the review host
  with a history whose instrument is `my-instrument` (profile as data) gives that profile's
  display name and does not throw, and a kept session's review shows the summary's display name
  (ISS-012).
- `review-privacy` passes with its storage half widened: the kept session's summary and body
  allowed, the `playedNotes` store empty and the summary's `playedNotesKept` false; everything
  else as chunk 7b left it.

**Items covered:** 6, 7, 15.

**Verification:** the chunk checks; a debug run with a real session and a reload.

### Chunk 11 — Played-notes opt-in and deletion

**Gate A must be applied before this chunk merges** (it breaks the old `rule_optional_midi_privacy`
guarantee).

**Goal.** Keep the player's played notes only after they opt in, and let them delete them.

**Scope.** `Keep my played notes` (off by default, saved) in the review's `review-view`; switching
it on in the review of the session that just ended keeps that session's played notes too;
switching it off saves at once and, when some are kept, opens "Delete the played notes already
kept?". `Delete played notes` for one session, with its confirmation; the lane, `review-view` and
the played-notes export leave that review at once. A kept session without played notes has no
lane. Played notes are kept all or nothing, with the summary's `playedNotesKept` saying which:
keeping or deleting a session's played notes writes or deletes its `playedNotes` record and
updates its summary in one port `apply` batch, so the two never disagree. The review privacy spy
rewritten: the network half unchanged; the storage half, starting from the version chunk 10 leaves
(chunk 7b's interim narrowing, widened to the kept session; spec D301), now checks
that only the allowed stores are written and that no played note reaches storage while the switch
is off. The allowed stores include `instrument` and `controller`, which chunks 20 and 22 write
(chunk 22 follows in this wave, and the spied session attaches a controller).

**Files:** `src/components/review/ReviewPanel.vue` (or a new `ReviewView.vue` part),
`src/components/workspace/use-review-host.ts`, `src/storage/records/kept-session-record.ts`
(played-notes record), tests `tests/e2e/review/review-privacy.spec.ts` (rewritten),
`tests/e2e/storage/played-notes-opt-in.spec.ts`.

**Spec sections:** [§5.3](master-spec.md#53-played-notes-opt-in-and-deletion), [§10](master-spec.md#10-what-v30-changes-in-v2s-guarantees).

**Design docs:** [`flows/review-and-export/handoff.md`](../../../ui_ux/versions/v3.0/flows/review-and-export/handoff.md)
(Played Notes, Privacy), [`screens/last-session-review/handoff.md`](../../../ui_ux/versions/v3.0/screens/last-session-review/handoff.md).

**Atoms:** `rule_played_notes_kept_only_after_opt_in`, `rule_kept_played_notes_deletable`; (v2,
STABLE after Gate A) `rule_optional_midi_privacy`, `rule_review_played_notes_toggle`.

**Depends on:** chunk 10 and Gate A.

**Done when:**

- With the switch off, a full session, its review and both exports under the spy: no played note
  written; after a reload the kept session has no lane.
- With it on: the played notes are kept and come back after a reload, times relative to the
  session start.
- Switched on in the just-ended session's review: that session's notes are kept too.
- Per-session deletion removes that session's played notes and nothing else (body, favorites,
  comment unchanged; the summary's `playedNotesKept` turns false in the same batch); an injected
  failure of that batch leaves both as they were.
- The network half of the privacy spy still sees no request carrying player data, with storage
  in use.

**Items covered:** 5, 9.

**Verification:** the chunk checks.

### Chunk 12 — Favorites, pin and comment in the review

**Gate A must be applied before this chunk merges** (it breaks the old "the review has no
favorites" guarantee).

**Goal.** Mark whole phrases as favorites, pin and unpin, delete, and comment, from any review.

**Scope.** `favorite-toggle` per phrase (marking pins the session; removing the last favorite
leaves it pinned); `review-session-tools` with `Pin` / `Unpin` (confirmation when the session has
favorites) and `Delete session` (confirmation; the list it leads to arrives in chunk 14, so until
then deletion returns to idle); `review-comment` (at most 500 characters, saved on `Done`, blur
and leaving the review); the first pin or favorite of a visit asks for persistent storage. Each
change is saved when made; a session whose save had failed is retried on the next change. A new
session's Start never asks anything. The "no favorites" test is replaced by a test that the review
still holds no grading or scoring wording.

**Files:** `src/components/review/ReviewPhrase.vue` (favorite), `src/components/review/ReviewSessionTools.vue`
(new), `src/components/review/ReviewComment.vue` (new), a shared confirmation sheet component in
`src/components/workspace/` (reused by 14, 15, 20), `src/components/workspace/use-review-host.ts`;
tests `tests/e2e/review/review-favorites.spec.ts`, `review-comment.spec.ts`, the rewritten
`review-opens` check.

**Spec sections:** [§5.1](master-spec.md#51-which-sessions-are-kept), [§5.5](master-spec.md#55-a-comment-on-a-session), [§6](master-spec.md#6-favorites), [§4.5](master-spec.md#45-keeping-the-data-safe-from-the-browser).

**Design docs:** [`flows/review-and-export/handoff.md`](../../../ui_ux/versions/v3.0/flows/review-and-export/handoff.md)
(Favorites, Comment, Pin and Delete), [`flows/kept-sessions/handoff.md`](../../../ui_ux/versions/v3.0/flows/kept-sessions/handoff.md)
(Pin and Unpin, Deleting a Session, The Confirmation Pattern),
[`screens/last-session-review/handoff.md`](../../../ui_ux/versions/v3.0/screens/last-session-review/handoff.md).

**Atoms:** `req_favorite_phrases`, `rule_favorite_pins_session`, `rule_pinned_session_kept`,
`rule_session_comment`, `rule_persistent_storage_requested`,
`rule_new_session_never_asks_about_favorites`; (v2, STABLE after Gate A) `req_last_session_review`.

**Depends on:** chunk 10 and Gate A.

**Done when:**

- Marking a favorite pins the session; after a new session and a reload, it and its favorite are
  still there; removing the last favorite leaves it pinned.
- Unpinning a session with favorites asks first; without favorites it does not.
- A comment of 600 pasted characters keeps 500; it survives a reload.
- A persist spy sees one `navigator.storage.persist()` call at the first pin or favorite of a
  visit, none after.
- Starting a session from a review with favorites asks nothing.
- Phone: every new control present (the star without its word).

**Items covered:** 10 (marking, pinning, confirmation, no question at Start), 11 (the comment's
limit and keeping), 13 (the request), 6 (pinned sessions kept).

**Verification:** the chunk checks.

### Chunk 13 — Favorites-only export

**Goal.** Export only the favorite phrases, in session order with their phrase numbers, for the
generated notes (MusicXML or MIDI) and the played notes (MIDI).

**Scope.** A pure selection in `src/export/` that takes the review input and a set of phrase
numbers: phrases in session order, each keeping its session phrase number (markers, measure
numbers); a played note held past the end of a favorite phrase stops there when the next phrase
is not exported. `review-scope` (`Whole session` / `Favorites only`, never saved, disabled with
no favorite, and says why); `Export played notes` disabled under `Favorites only` when no favorite
holds a played note; file names gain `-favorites`. The comment never enters a file.

**Files:** `src/export/favorites-selection.ts` (new), `src/export/generated-notes-file.ts`,
`src/export/played-notes-file.ts`, `src/export/export-file.ts` (names),
`src/components/review/ReviewPanel.vue` (scope); tests under `tests/unit/export/` and
`tests/e2e/review/review-export-favorites.spec.ts`.

**Spec sections:** [§6](master-spec.md#6-favorites), [§5.5](master-spec.md#55-a-comment-on-a-session).

**Design docs:** [`flows/review-and-export/handoff.md`](../../../ui_ux/versions/v3.0/flows/review-and-export/handoff.md)
(Export), [`screens/last-session-review/handoff.md`](../../../ui_ux/versions/v3.0/screens/last-session-review/handoff.md)
(`review-scope`).

**Atoms:** `rule_favorites_only_export`; (v2) `rule_generated_notes_musicxml_export`,
`rule_generated_notes_midi_export`. **Part D:** `req_session_export`, `req_played_notes_export`
(the scope half), `module_review_export_pipeline`.

**Depends on:** chunk 12.

**Done when:**

- For favorites {2, 5, 6} of a seven-phrase session, each of the three file kinds holds exactly
  those phrases, in order, numbered 2, 5, 6 (unit tests on the encoders' input and output).
- A played note held from phrase 2 into phrase 3 stops at phrase 2's end when 3 is not exported,
  and is kept whole when 3 is.
- A comment with a distinctive string is absent from every exported file's bytes.
- The scope is disabled, with its reason, when the session has no favorite.
- `Whole session` exports are byte-identical to v2's.

**Items covered:** 10 (the export), 11 (the comment absent from every file).

**Verification:** the chunk checks; hand check H8 at the gate.

### Chunk 14 — Session list

**Goal.** List every kept session, newest first, and open, pin, unpin and delete from it.

**Scope.** `sessions-panel` in the review mode (the same place and rules as `review-panel`), its
title, intro, rows (session date, " · Last session" on the most recent, the detail line, the
status line, the comment's first line), `Pin` / `Unpin`, `Delete`, the empty states; opening a
row reads its body (`is-loading`, the latest press wins, `Close review` cancels); a row that
cannot be read or was saved by a newer version shows its note. `sessions-link` ("All sessions") in
the cue row, decided at load with the settings; `All sessions` in a review. Row summaries are
read at load and kept current, so the list shows at once. The list ships with the review's code,
loaded on demand. No row or count shows how well the player played. `Your data` in the header is
added by chunk 15.

**Files:** `src/components/review/SessionList.vue` (new), `src/components/review/SessionRow.vue`
(new), `src/components/workspace/use-kept-sessions.ts` (new: summaries in memory),
`src/components/workspace/SessionCueRow.vue`, `src/components/review/load-review-panel.ts`; tests
`tests/e2e/review/session-list.spec.ts`, `tests/unit/...session-row-text.spec.ts`.

**Spec sections:** [§5.4](master-spec.md#54-reaching-earlier-sessions).

**Design docs:** [`flows/kept-sessions/handoff.md`](../../../ui_ux/versions/v3.0/flows/kept-sessions/handoff.md),
[`screens/session-list/handoff.md`](../../../ui_ux/versions/v3.0/screens/session-list/handoff.md),
[`screens/phrase-workspace/handoff.md`](../../../ui_ux/versions/v3.0/screens/phrase-workspace/handoff.md) (the
cue row).

**Atoms:** `req_kept_session_list`, `req_kept_session_review`, `rule_pinned_session_kept`.

**Depends on:** chunk 12 (its confirmation sheet and pin rules).

**Done when:**

- Seeded with five sessions (two pinned, one with played notes, one with a comment, one saved by
  a newer version): the rows show exactly the specified fields, newest first; the newer one
  cannot be opened and has no pin button.
- A text scan of the list finds no number other than date, time, length, phrase count and
  favorite count, and no wording of hits, misses, score or accuracy.
- Each row opens its review; `All sessions` returns to that row; pin, unpin and delete behave as
  in the review; deleting the last row shows the empty state, focus on the title.
- A row whose body read fails shows its note and keeps focus.
- Phone layout: every row keeps every line and both buttons.

**Items covered:** 11, 6 (opening any kept session).

**Verification:** the chunk checks; the bundle at the wave gate (unchanged: the list is lazy).

### Chunk 15 — Your data

**Goal.** One sheet that shows what is kept, the space it uses and whether the browser protects
it, with every deletion, Delete everything included.

**Scope.** `layout-footer` with `Your data`; the sheet's overview (settings, my instrument,
controller, sessions, played notes with the same `Keep my played notes` switch, space used,
protection), its four confirmations (every session, all played notes, the played notes already
kept, everything), the saving-off state, failures kept in the confirmation. Delete everything
deletes the database and reloads into a first visit (the MIDI permission and the offline copy
stay). `Your data` in the session list's header and the storage-full notice. The sheet loads on
demand.

**Files:** `src/components/workspace/YourDataSheet.vue` (new), `src/components/workspace/use-your-data.ts`
(new), `src/components/workspace/LayoutFooter.vue` (new), `src/components/workspace/WorkspaceShell.vue`,
`src/components/review/SessionList.vue` (header button); tests
`tests/e2e/storage/your-data.spec.ts`.

**Spec sections:** [§4.1](master-spec.md#41-principles), [§4.5](master-spec.md#45-keeping-the-data-safe-from-the-browser), [§5.3](master-spec.md#53-played-notes-opt-in-and-deletion), [§15](master-spec.md#15-access-model).

**Design docs:** [`flows/saved-data/handoff.md`](../../../ui_ux/versions/v3.0/flows/saved-data/handoff.md) (Your
Data), [`screens/your-data/handoff.md`](../../../ui_ux/versions/v3.0/screens/your-data/handoff.md),
[`screens/phrase-workspace/handoff.md`](../../../ui_ux/versions/v3.0/screens/phrase-workspace/handoff.md)
(footer).

**Atoms:** `req_your_data`, `rule_delete_everything`, `rule_kept_played_notes_deletable`,
`rule_saved_data_belongs_to_browser_profile`, `rule_persistent_storage_requested` (the report).
**Part D:** `rule_single_local_user`.

**Depends on:** chunks 11 and 14.

**Done when:**

- Seeded data: the counts, the space line and the protection line show as specified, the
  protection line from a stubbed `persisted()`.
- Delete every session removes every session and the one in memory; settings, my instrument and
  the controller stay.
- Delete all played notes removes every played-notes record and nothing else.
- Delete everything: after the reload, the database holds nothing (no store, no record), the
  workspace is in its first-visit state, and Your data shows the empty overview.
- An injected deletion failure keeps the confirmation with its error line.
- Openers disabled during a session; no MIDI note starts a session while the sheet is open.
- An injected failed or slow read: Your data offers Delete everything and no other deletion; once
  newer data is detected (at load, or written later by a stubbed newer version), no deletion is
  offered and an open confirmation closes without deleting (master spec §4.4, v1.4).

**Items covered:** 9 (all-sessions deletion), 12, 13 (the report), 14 (Your data's deletions in
both saving-off states).

**Verification:** the chunk checks; the bundle at the wave gate (the sheet is lazy).

### Chunk 16 — My instrument in the domain

**Architecture capture:** opening the closed instrument id: how a player-made profile is named in
the controls (by its fixed id, `my-instrument`) and carried as data.

**Goal.** Let a player-made instrument exist as a valid instrument profile: built from a template,
a written range, a transposition and a name, held to the rules every profile obeys. This is the
first step of the widest change in v3.0.

**Scope.**

- `InstrumentProfileId` gains one member for my instrument, the fixed id `my-instrument`
  (kebab-case like `c-keyboard`; spec D254): it is what saved settings, kept sessions and replay
  keys store, and it is never renamed. `makeGenerationControls` accepts it; the profile itself
  travels as data beside the controls (in the generation intent, which already embeds the full
  profile). The display name is a separate property of the profile, changeable at any time,
  never part of the id.
- `makeMyInstrument({ template, name, writtenRange, transposition })` in `src/domain/profile/`,
  `name` being the display name and `transposition` a number of octaves (from 0 up), a number of
  semitones (0 to 11) and one direction for the whole transposition, octaves included (lower,
  the same or higher: a written note sounds lower or higher), never an interval name (master spec
  §7.1, spec D253, D257). So "one octave lower" is 1 octave, 0 semitones, lower, and the sheet's
  one stepper ("14 lower") maps to 1 octave, 2 semitones, lower; the octaves' only bound is the
  MIDI one below. The concert range follows from the written range and the transposition; whole-number
  endpoints; a span of at least 24 semitones, refused with a reason; both ends sounding inside
  MIDI 0–127; register windows derived by the built-in profiles' algorithm; input kind "MIDI
  controller". The interval name, and with it the transposition's letter-step part (its
  **diatonic** count, which the profile and a MusicXML file's `<transpose>` carry; the staff's
  spelling never reads it, spec D291), is derived from the semitones by §7.1's fixed table (0 = unison, 1 = minor second, 2 = major second … 6 =
  augmented fourth … 11 = major seventh; each octave adds 12 semitones and 7 steps), and exposed
  so the sheet (chunk 20) can show it.
- Measurement M3's generator sweep, as a script and a sweep config (tooling).

**Files:** `src/domain/profile/instrument-profiles.ts`, `src/domain/profile/my-instrument.ts`
(new), `src/domain/controls/generation-controls.ts`, `src/domain/generation/generation-intent.ts`
(`getInstrumentProfile` no longer the only source), tests under `tests/unit/domain/profile/`, the
sweep under `tests/sweep/` or `scripts/`.

**Spec sections:** [§7.1](master-spec.md#71-what-it-is), [§11](master-spec.md#11-existing-code-and-risks), [§14](master-spec.md#14-deferred-and-open).

**Design docs:** [`flows/my-instrument/handoff.md`](../../../ui_ux/versions/v3.0/flows/my-instrument/handoff.md)
(Routing Rules: valid range, the transposition).

**Atoms:** `req_my_instrument`, `rule_my_instrument_range_limits`,
`rule_my_instrument_transposition_named_interval` (to revise for spec D253: entered in octaves,
semitones and one direction, the name derived), the new `entity_my_instrument` (its capture: the
fixed id and the display name, spec D254; the transposition as octaves, semitones and one
direction, spec D257); (v2)
`entity_instrument_profile`, `module_generation_request_construction`,
`module_generation_control_catalog`, `rule_instrument_profile_range` (STABLE: must stay true of the
three built-ins; its revision is Part B1).

**Depends on:** chunks 0 and 2.

**Done when:**

- A range of 23 semitones, or with its lowest note above its highest, is refused with its
  reason; 24 is accepted.
- Every transposition from 0 to 11 semitones, with and without octaves, in both directions,
  derives §7.1's interval name and letter-name steps; 6 semitones is an augmented fourth; the
  tenor saxophone's 1 octave and 2 semitones lower is a major ninth lower, 8 steps, as the
  built-in's transposition is.
- My instrument's id is `my-instrument` whatever its display name; two instruments differing only
  by display name give the same generated phrase for the same request and seed.
- Each built-in template turned into my instrument without change gives a profile deep-equal to
  the built-in's, windows included.
- The derived windows of random valid ranges obey every rule the built-in windows obey (property
  test).
- The `ifk1.` corpus of chunk 2 still passes; every v2 generation test passes.
- M3's sweep has run and its table is recorded (a VM figure for reference; the owner's run
  gates nothing until the range ruling).

**Items covered:** 16 (the refusal, the success-rate measurement).

**Verification:** the chunk checks; M3.

**Record (2026-10-11).** Merged into `v3.0-w1`. `documentalist` captured `entity_my_instrument`
(DRAFT) first, scoped `entity_instrument_profile`'s "no new enumeration member" to the built-ins
and revised `rule_my_instrument_transposition_named_interval` for octaves, semitones and one
direction (DRAFT); no status advanced. The id set is now the three built-ins and `my-instrument`;
`INSTRUMENT_PROFILE_IDS` stays the three built-ins (tests and the deadline sweep enumerate it to
build profiles from the table), and the controls, and the saved-settings codec while my instrument
loads, accept the four. The generation intent takes my instrument's profile as data and refuses a
missing or mismatched one; a built-in still resolves from its id. Refusals carry a reason code,
available without throwing for chunk 20's live check. The interval name beyond the table: an
octave is "octave", one octave plus a table interval takes the compound name ("major ninth"), two
or more octaves read "2 octaves and a major second". Paths that still rebuild an intent from the
controls alone (the session's attempt intents, the carry-in receiver, the worker's inbound
message) refuse `my-instrument` until chunk 17. M3's generator sweep: no failure in any range case
(table in [`generation-latency.md`](../../../docs/generation-latency.md#my-instrument-ranges-2026-10-11)),
measured on the build machine, not a VM, for reference.


### Chunk 17 — My instrument across the worker and the history

**Goal.** Carry a player-made profile through the generation worker, into the session's history
and into a kept session.

**Scope.** `rebuildGenerationWorkerIntent` / `parseGenerationWorkerIntent` accept my instrument's
profile as data, validated by `parseInstrumentProfile` and `makeMyInstrument`'s rules, instead of
rebuilding it by id (the built-ins keep their rebuild-and-compare check); the session history
records it; the kept-session codec stores and decodes it, so a kept session keeps the instrument
it was played with in full. A later change of my instrument's name or clef leaves it as it was;
deleting my instrument, or a change to its range or transposition, erases its kept sessions
instead (spec D295, chunk 20c). My instrument's clef (spec
D293, chunk 19b) travels with the phrase's instrument into the history and the kept-session
record, so a review draws each phrase in the clef it was played in; it is display data, never
part of the worker's intent. The prewarm and the cancellation paths carry it unchanged.

**The clef, after chunk 9.** The history record gains each phrase's clef. The kept-session body
encoder (`kept-session-body.ts`) takes it from there, and its throw for a my-instrument phrase
goes. The review and the MusicXML input read each phrase's clef instead of the built-in constant
(`BUILT_IN_INSTRUMENT_CLEF` in `ReviewPhrase.vue` and `session-history-export.ts`): `KeptPhrase.clef`
for a kept session, the record's clef for the session that just ended. The stored shape does not
change: chunk 9's body already has a clef field.

**Files:** `src/generation-worker/generation-worker-inbound.ts`, `generation-worker-protocol.ts`,
`src/session/session-history.ts` (the clef), `src/storage/records/kept-session-body.ts`,
`src/storage/records/kept-session-record.ts`, `src/session/session-history-export.ts`,
`src/components/review/ReviewPhrase.vue`; tests under `tests/unit/generation-worker/`,
`tests/unit/session/` and `tests/unit/storage/`. If the brief exceeds about five source files,
split the clef (17b) from the worker (17a).

**Spec sections:** [§7.4](master-spec.md#74-phrase-replay-key), [§11](master-spec.md#11-existing-code-and-risks).

**Atoms:** `req_my_instrument`, `rule_kept_session_content`; (v2) `rule_seeded_phrase_reproduction`.
**Part D / drift check:** `module_generation_worker_protocol`, `service_session_history`.

**Depends on:** chunks 9, 16 and 19b (the clef).

**Done when:**

- A generation with a player-made profile (e.g. written C3–C6, sounding a minor third lower)
  crosses the worker and every note of the timeline lies in its concert range.
- A malformed profile (23-semitone span, inconsistent transposition, windows set by hand) is
  rejected by the worker with a typed error.
- A built-in profile whose data was altered is still rejected (rebuild-and-compare kept).
- A session played with my instrument encodes and decodes as a kept session with that profile
  and its clef; a bass-clef session still reviews in bass clef after my instrument is switched to
  treble clef, both as the session that just ended and as a kept session.
- The `ifk1.` corpus passes.

**Items covered:** 16 (generates in its range).

**Verification:** the chunk checks.

### Chunk 18 — Replay key `ifk2.`

**Architecture capture:** the `ifk2.` format (revision of `module_phrase_replay_key`).

**Goal.** A new key version that carries my instrument inline, while every `ifk1.` key keeps
decoding to the same phrase.

**Scope.** `encodePhraseReplayKey` writes `ifk2.` only when the profile is not a built-in, with
the profile's owning fields (name excluded or included as the capture decides; never played
notes, never an app version); `ifk1.` otherwise, unchanged. `decodePhraseReplayKey` accepts both.
`npm run replay:phrase` replays both. The decoder rebuilds the intent through
`rebuildGenerationWorkerIntent`, which chunk 17 opens to my instrument; chunk 18 does not change
it.

**Files:** `src/generation-worker/phrase-replay-key.ts`, `phrase-replay-key-decode.ts`,
`scripts/replay-phrase.mjs` (if it parses the prefix), tests under `tests/unit/generation-worker/`.
Three existing tests assert that `ifk2.` is refused as unsupported and change here:
`tests/unit/generation-worker/phrase-replay-key.spec.ts`, `phrase-replay.spec.ts`, and
`tests/unit/scripts/replay-phrase-script.spec.ts`.

**Spec sections:** [§7.4](master-spec.md#74-phrase-replay-key).

**Atoms:** `module_phrase_replay_key`, `req_my_instrument`; (v2) `rule_seeded_phrase_reproduction`.

**Depends on:** chunk 17 (and so 16): any `ifk2.` round trip or replay needs chunk 17's
inbound parser, which accepts `my-instrument`. It runs in wave 6 and does not need Gate A.

**Done when:**

- Encoding then decoding a key for a player-made phrase returns an equal intent, and replaying it
  gives the same timeline.
- The chunk 2 corpus passes unchanged; a built-in phrase still encodes as `ifk1.`, byte-identical
  to v2.
- A malformed `ifk2.` key throws the typed key error.
- The key carries no clef (spec D293): two phrases that differ only by my instrument's clef
  encode to the same key.

**Items covered:** 19.

**Verification:** the chunk checks; `npm run replay:phrase -- <ifk2 key>` by hand.

### Chunk 19 — My instrument on the staff

**Goal.** Show my instrument in its own written pitch, placed on the staff from its written range,
and measure what its range costs the staff's shared height.

**Scope.** The notation already writes a phrase in any profile's written pitch: it moves each
note and chord root by the transposition's semitones (its chromatic count; only the MusicXML
`<transpose>` reads the diatonic one) and spells them in the written key the player chose, by
master spec §7.1's rule (spec D291). This chunk proves it for any player-made transposition and
makes the staff placement and the shared system-position size take my instrument's written range
into account (the size changes only when my instrument is saved or deleted; spec D292, after
`documentalist` revises `module_notation_layout_preflight`). The 16-space size is the constant
`NOTATION_SYSTEM_POSITION_UNITS`, read by `vexflow-engraver.ts` and
`vexflow-two-system-engraver.ts`, with `planStaffPositions` called from `PhraseScore.vue`,
`ReviewPanel.vue` and `src/session/session-window.ts`, and cited in `theme.css`'s sizing note; a
size that varies reaches all of them. The engraving calibration gains player-made fixtures: low, high and wide
written ranges. Measurement M3's staff half: the written range beyond which the shared size grows.

**Files:** `src/notation/notation-layout-policy.ts` (with its placement helper,
`planStaffPlacement`), the readers of the shared size named in Scope as the size reaches them,
`tests/e2e/notation/notation-calibration.spec.ts` and its fixtures, `tests/e2e/notation-harness/fixtures.ts`,
[`docs/notation-engraving.md`](../../../docs/notation-engraving.md).

**Spec sections:** [§7.1](master-spec.md#71-what-it-is), [§14](master-spec.md#14-deferred-and-open).

**Design docs:** [`screens/phrase-workspace/handoff.md`](../../../ui_ux/versions/v3.0/screens/phrase-workspace/handoff.md)
(Notation Contract: my instrument's placement and the shared size).

**Atoms:** `req_my_instrument`; (v2) `module_notation_layout_preflight` (revised for spec D292
before code), `module_notation_display_convention`.

**Depends on:** chunk 16.

**Done when:**

- A phrase for a player-made instrument engraves in its written pitch: its notes and chord roots
  are the concert ones moved by its transposition's semitones, and the key signature, notes and
  chord symbols are spelled in the written key the player chose, by master spec §7.1's rule (6
  semitones higher, concert C major: F♯ major) (notation harness).
- A written range inside every built-in's reach leaves the shared size unchanged; one reaching
  further makes it grow, and the calibration confirms every profile's ink stays inside.
- The four known notation snapshots and every v2 notation test pass unchanged for the built-ins.
- The written-range figure for M3 is recorded.

**Items covered:** 16 (notation in written pitch).

**Verification:** the chunk checks; `npm run test:notation`; the calibration run; then chunk 19b,
then the **range ruling**.

### Chunk 19b — Bass clef for my instrument

**Architecture capture:** where the clef sits: in my instrument's domain value beside the display
name, outside the generator-facing profile and the worker's intent, and carried by the written
phrase as it carries `writtenRange` (revisions of `entity_my_instrument` and
`module_notation_display_convention`).

**Goal.** Draw a phrase made with my instrument in bass clef when it has that clef, wherever a
staff shows it, and measure the bass-clef range bound (spec D293, master spec §7.1).

**Scope.**

- The clef, `treble` or `bass`, joins my instrument's domain value (`makeMyInstrument`), never the
  generator-facing profile or the generation request; the built-ins are treble. The written phrase
  carries its instrument's clef, so every reader draws the clef the phrase carries, the review
  included.
- Each treble-only place in [master spec §11](master-spec.md#11-existing-code-and-risks) takes the
  clef: the written phrase's type (`clef: 'treble'` today); both engravers (`addClef`); the staff
  layout's ink and placement model, read from the clef's own lines (bass clef: top line A3,
  middle line D3, 12 letter-name steps below the treble clef's F5 and B4); the stem rule's middle
  line; the score description ("bass clef"); the MusicXML `<clef>` (`F`, line 4; `G`, line 2 for
  treble), the `<transpose>` unchanged; the transposition check's note, drawn in my instrument's
  clef while it is selected.
- `planSystemPositionUnits` takes my instrument's written range with its clef. The seam on
  `WorkspaceShell` stays fed with nothing until chunk 20's record (no saved instrument).
- The calibration gains bass-clef fixtures: the proposed bound E0–E5, a low range (C2–C4, which
  the ink model predicts at 16 spaces in bass clef, against 19 in treble), a high one and a wide
  one; M3's bass-clef figure is recorded beside the treble one in
  [`docs/notation-engraving.md`](../../../docs/notation-engraving.md). `docs/export.md` states the
  clef per instrument.

**Files:** `src/domain/profile/my-instrument.ts`, `src/domain/notation/written-phrase-types.ts`,
`written-phrase.ts`, `stem-direction.ts`, `pitch-spelling.ts` (the staff position),
`score-description.ts`; `src/notation/notation-layout-policy.ts`, `vexflow-engraver.ts`,
`vexflow-two-system-engraver.ts`, `vexflow-check-note-engraver.ts`;
`src/export/musicxml/musicxml-marks.ts`; the harness (`tests/e2e/notation-harness/`, a clef
parameter for the player-made instrument), `notation-calibration.spec.ts`,
`notation-my-instrument.spec.ts`, unit tests beside each module; `docs/notation-engraving.md`,
`docs/export.md`, `docs/testing.md`. If the brief grows past one chunk, split the export and the
description (19b-2) from the engraving and the height (19b-1).

**Spec sections:** [§7.1](master-spec.md#71-what-it-is), [§7.4](master-spec.md#74-phrase-replay-key),
[§11](master-spec.md#11-existing-code-and-risks), [§14](master-spec.md#14-deferred-and-open).

**Design docs:** [`screens/phrase-workspace/handoff.md`](../../../ui_ux/versions/v3.0/screens/phrase-workspace/handoff.md)
(Notation Contract), and the clef wording once the **Clef design** gate has run.

**Atoms:** `rule_notation_display_preserves_phrase` (BUSINESS, REVIEW: "treble G2 clef"),
`module_notation_display_convention`, `module_notation_layout_preflight`,
`module_notation_stem_direction` (its middle line B4), `entity_my_instrument`, `req_my_instrument`,
`rule_generated_notes_musicxml_export`; each revised by `documentalist` before code, none on the
contract.

**Depends on:** chunk 19; its own intent preflight.

**Done when:**

- A phrase for a bass-clef my instrument engraves with a bass clef on both systems, its notes on
  the bass staff's lines and spaces, its stems down from D3 up, and its key signature in the bass
  clef's positions (notation harness); the description names the bass clef.
- The same phrase in treble and bass clef has the same written notes, the same concert timeline
  and the same replay inputs.
- The shared size reads the written range in its clef: written C2–C4 keeps 16 spaces in bass
  clef and needs 19 in treble; the calibration confirms every case's ink inside its position.
- The MusicXML export of a bass-clef phrase opens with `<clef>` F on line 4 and the same
  `<transpose>`; a built-in's is unchanged, byte for byte.
- The check note follows the selected instrument's clef.
- The four known notation snapshots and every v2 notation test pass unchanged for the built-ins.
- M3's bass-clef figure is recorded.

**Items covered:** 16 (the clef).

**Verification:** the chunk checks; `npm run test:notation`; the calibration run, which confirms
that the ruled bass-clef bound, written E0–E5 (spec D294), keeps the shared height at most 24
staff spaces; if it does not, the figure goes back to the owner before chunk 20.

### Chunk 20 — My instrument sheet and the instrument control

**Goal.** Let the player make, select, change and delete their instrument, and keep it across
reloads.

**Scope.** The my-instrument record in `src/storage/records/` (one value: it loads whole or not at
all, then the saved selection falls back); the instrument control's fourth segment, labelled with
the name, present only while my instrument exists; `instrument-actions` (`Create my instrument` /
`Edit my instrument`); the sheet (template, name, range steppers, the live refusal, the windows,
the staff-reach note, the transposition on the design's one stepper counting semitones across
octaves, one direction for the whole, with its derived interval name shown beside it (master spec
§7.1, spec D253, D257; the display as `ux-writer` settles it under ux Q76), the clef, treble or
bass (spec D293; the control, its wording and its default as the **Clef design** gate settles
them), delete with confirmation), loaded on demand; the record holds the clef with the rest of
my instrument, and the shared size reads it with the written range (chunk 19b's seam); the record keeps the fixed id `my-instrument` and the display
name apart (spec D254); save outcomes
(replace the phrase as on an instrument switch only when selected and its range or transposition
changed; a change of clef alone keeps the phrase and redraws it, and discards no pre-generated
phrase); a save that changes the shared size without discarding the pre-generated phrases (a
clef change, or a range change while another profile is selected) re-checks them through chunk
24's re-check after a window change (spec D296); the first save asks for persistent storage; the
range bound (spec D294): written C2–C7 in treble clef, E0–E5 in bass clef, both ends included,
added to my instrument's validity rules in `src/domain/profile/my-instrument.ts` beside the
two-octave rule (a chunk-16 file, after chunk 19b's clef) and refused live in the sheet with the
**Clef design** gate's wording in note names, checked again when the clef changes. The bound
needs the clef, so it is checked where my instrument's domain value is built with its clef, never
in the generator-facing profile the worker validates (chunk 17), which carries no clef; deleting
returns to its template only when it was selected. The start-up read (`src/storage-bootstrap.ts`,
chunk 7a) also reads the `instrument` store before the first draw, and the settings decode takes
`myInstrumentLoaded` from that record (chunk 7a passes `false`, so until this chunk a saved
selection of my instrument falls back). **Not in this chunk:** deleting my instrument
and saving a range or transposition change leave its kept sessions untouched until chunk 20c,
which adds the erasing and its warnings; until then the delete confirmation keeps the current
design's words.

**Files:** `src/storage/records/my-instrument-record.ts` (new), `src/storage-bootstrap.ts` (the
start-up read), `src/domain/profile/my-instrument.ts` (the bound), `src/components/controls/FoundationControls.vue`
(the fourth segment and the button), `src/components/workspace/MyInstrumentSheet.vue` (new),
`src/components/workspace/use-my-instrument.ts` (new), `src/composables/generation-session-profile-switch.ts`;
tests `tests/e2e/storage/my-instrument.spec.ts`, unit tests for the sheet's model. If the brief
exceeds about five source files, split the sheet (20b) from the record and the control (20a).

**Spec sections:** [§7.1](master-spec.md#71-what-it-is), [§4.2](master-spec.md#42-what-is-saved-automatically), [§4.5](master-spec.md#45-keeping-the-data-safe-from-the-browser).

**Design docs:** [`flows/my-instrument/handoff.md`](../../../ui_ux/versions/v3.0/flows/my-instrument/handoff.md),
[`screens/my-instrument/handoff.md`](../../../ui_ux/versions/v3.0/screens/my-instrument/handoff.md),
[`screens/phrase-workspace/handoff.md`](../../../ui_ux/versions/v3.0/screens/phrase-workspace/handoff.md) (the
instrument control).

**Atoms:** `req_my_instrument`, `rule_my_instrument_range_limits`, `rule_settings_saved_on_change`,
`rule_persistent_storage_requested`, `rule_saved_settings_load_tolerantly`. **Part B1** follows
the merge.

**Depends on:** chunks 1, 7, 17, 19, 19b and 24 (its re-check), the **Clef design** gate and
`ux-writer`'s answer to ux Q76. The range ruling (spec D294) and spec O181 (D295, D296) are
settled.

**Done when:**

- Creating from the tenor template with a new name and range: saved, selected, the phrase
  replaced, notation in its written pitch; after a reload, back and selected.
- A range under two octaves disables `Save` with the refusal; the stepper never stops at the
  two-octave limit; the transposition change keeps the written range.
- A range outside the bound for its clef disables `Save` with its refusal in note names: in
  treble clef, written B1 as the lowest note or C♯7 as the highest is refused, C2–C7 itself is
  allowed; in bass clef, D♯0 or F5 is refused, E0–E5 allowed. Switching a written C2–C4 range
  from treble to bass clef keeps it valid; switching a written E0–E2 range from bass to treble
  clef refuses it until the range or the clef changes. `makeMyInstrument` refuses the same
  ranges, with tests beside chunk 16's.
- Editing only the name relabels the segment and leaves the phrase; the saved selection still
  names `my-instrument`.
- Each step of the transposition updates the shown interval name (14 lower: a major ninth lower;
  6 higher: an augmented fourth higher; 12 lower: one octave lower, saved and reloaded as lower).
- Deleting while selected returns to the template; while not selected, changes nothing else; the
  remembered controller is untouched.
- A new my instrument starts in the clef the design settles (proposed: treble); switching it to
  bass clef redraws the phrase on screen in bass clef without replacing it, survives a reload,
  and resizes the staff as its range in bass clef needs.
- With phrases pre-generated at Idle, a clef change that changes the shared height re-checks
  them: one that no longer fits is discarded with every phrase after it; one that fits stays
  (held-generation harness).
- A seeded invalid my-instrument record loads as absent, and a saved selection of it falls back
  to the default profile.
- The first save makes one persist request.

**Items covered:** 16 (survives a reload, deleting returns to its template), 1 (my instrument), 13.

**Verification:** the chunk checks; phone layout; then Part B1 with the owner.

### Chunk 21 — The check feeds my instrument

**Goal.** Turn a transposition check result that is not a match into my instrument's
transposition, in one confirmed step.

**Scope.** `Use this for my instrument` on every non-match result (absent when the result would
sound outside MIDI 0–127); the **Use for my instrument** confirmation; on confirm, create my
instrument from the selected built-in (named "My instrument", its written range, treble clef) or
update its transposition, keep the written range and the clef, save, select, replace the phrase, and go to **Connected**
with "{name} now matches your controller."; the check run against my instrument when it is
selected. Played notes are still compared at the pitch received: nothing in acknowledgement
changes.

**Files:** `src/components/controller-connection/SheetStateBody.vue`,
`src/components/controller-connection/connection-sheet-model.ts`,
`src/domain/controller-check/transposition-check.ts` (my instrument as the expected profile),
`src/components/workspace/use-my-instrument.ts`; tests
`tests/e2e/controller/controller-connection-check.spec.ts` (extended), unit tests of the model.

**Spec sections:** [§7.2](master-spec.md#72-the-transposition-check-feeds-it).

**Design docs:** [`flows/controller-connection/handoff.md`](../../../ui_ux/versions/v3.0/flows/controller-connection/handoff.md),
[`screens/controller-connection/handoff.md`](../../../ui_ux/versions/v3.0/screens/controller-connection/handoff.md),
[`flows/my-instrument/handoff.md`](../../../ui_ux/versions/v3.0/flows/my-instrument/handoff.md) (From the
Transposition Check).

**Atoms:** `rule_transposition_check_sets_my_instrument`; (v2, STABLE)
`rule_controller_transposition_check` (Part B2 follows chunk 20c, which adds the erase warning), `rule_acknowledgement_exact_pitch`.

**Depends on:** chunk 20.

**Done when:**

- With the fake MIDI access sending a note 2 semitones above what the tenor profile expects: the
  action is offered; after confirming, my instrument exists with the matching transposition and
  the tenor's written range; the check run again is a match; after a reload it is still there.
- `Back` changes nothing.
- An acknowledgement test still lights only exact concert pitches.

**Items covered:** 17.

**Verification:** the chunk checks; hand check H3. Part B2 waits for chunk 20c.

### Chunk 20c — My instrument's sessions

**Goal.** Make every kept session belong to the instrument it was played with: deleting my
instrument deletes its kept sessions, and saving a change to its range or transposition erases
them after a warning (spec D295, D296; master spec §5.1, §7.1, §7.2).

**Scope.**

- **The sessions of my instrument** are the kept sessions whose summary names `my-instrument`
  (chunk 9's summary holds the instrument id), counted from chunk 14's summaries in memory, the
  session that just ended included.
- **Deleting my instrument:** its confirmation names the sessions that go, with their number,
  in the words the **Sessions design** gate settles; on confirmation, one transaction deletes the
  my-instrument record and every session of my instrument (summary, body, played notes; their
  favorites and comments go with them). Chunk 14's summaries follow. When the session that just
  ended is one of them, it leaves memory, its review closes as on `Delete session` (chunk 12),
  and `Review last session` goes.
- **Saving a range or transposition change while my instrument has kept sessions:** `Save` opens
  the warning with their number; confirming saves the change and erases them in one
  transaction; cancelling returns to the sheet with the edit unsaved. With no kept session of my
  instrument, `Save` saves as in chunk 20, with no warning. A name or clef change never warns and
  keeps every session.
- **The check:** chunk 21's **Use for my instrument** confirmation, when my instrument exists and
  has kept sessions, carries the same warning; confirming erases them.
- **Saving off.** An outdated tab, while my instrument has kept sessions, offers neither deleting
  it nor saving a range or transposition change, in the form the design gate settles, and its
  notice asks for a reload. A visit whose saved data could not be read erases nothing: it read
  no kept session.
- **A review never cuts a phrase:** a kept session whose phrases need more height than the
  shared height (one played in a clef my instrument no longer has) gets the room the design
  gives it (proposed: the larger of the shared height and its own), measured by chunk 19b's
  planner from the session's own instrument and clef.
- A failed deletion keeps its confirmation with the error line, as in chunks 12 and 15, and
  deletes nothing.

**Files:** `src/components/workspace/use-my-instrument.ts`, `src/components/workspace/MyInstrumentSheet.vue`,
`src/components/workspace/use-kept-sessions.ts`, the deletion by instrument id in
`src/storage/records/`, `src/components/controller-connection/SheetStateBody.vue` (the warning),
`src/components/workspace/use-review-host.ts` (closing the review), the review's staff size in
`src/components/review/`; tests `tests/e2e/storage/my-instrument-sessions.spec.ts`, unit tests
beside each module. If the brief exceeds about five source files, split the review's room for
another clef (20c-2) from the deletions and warnings (20c-1).

**Spec sections:** [§5.1](master-spec.md#51-which-sessions-are-kept), [§7.1](master-spec.md#71-what-it-is),
[§7.2](master-spec.md#72-the-transposition-check-feeds-it), [§4.3](master-spec.md#43-where-and-how),
[§4.4](master-spec.md#44-loading-saved-settings).

**Design docs:** [`flows/my-instrument/handoff.md`](../../../ui_ux/versions/v3.0/flows/my-instrument/handoff.md),
[`screens/my-instrument/handoff.md`](../../../ui_ux/versions/v3.0/screens/my-instrument/handoff.md),
[`flows/kept-sessions/handoff.md`](../../../ui_ux/versions/v3.0/flows/kept-sessions/handoff.md),
[`screens/last-session-review/handoff.md`](../../../ui_ux/versions/v3.0/screens/last-session-review/handoff.md)
and [`screens/controller-connection/handoff.md`](../../../ui_ux/versions/v3.0/screens/controller-connection/handoff.md),
as the **Sessions design** gate revises them.

**Atoms:** `req_my_instrument`, `entity_my_instrument`, `req_kept_sessions`,
`rule_most_recent_session_kept`, `rule_pinned_session_kept`, `rule_favorite_pins_session`,
`req_kept_session_list`, `req_kept_session_review`, `rule_outdated_tab_stops_saving`,
`rule_transposition_check_sets_my_instrument`, `module_notation_layout_preflight`; (v2, STABLE)
`req_last_session_review` (after **Review reachability**), `rule_controller_transposition_check`
(Part B2 follows the merge). Each is revised by `documentalist` before code.

**Depends on:** chunks 14, 20 and 21; the **Sessions design** gate; **Review reachability**
before it merges.

**Done when:**

- Seeded with three sessions of my instrument (one pinned with a favorite, one with played notes,
  the most recent) and two of the tenor profile: deleting my instrument says three sessions go;
  once confirmed, exactly those three are gone (summaries, bodies, played notes), the tenor ones
  untouched, and the same after a reload.
- The same seed: a range change warns with three; `Cancel` changes nothing and keeps the edit in
  the sheet; confirming saves it and erases the three. The same for a transposition change, and
  for **Use for my instrument** from the check.
- A name change and a clef change save with no warning and keep every session; a kept bass-clef
  session still reviews in bass clef after the clef is switched to treble.
- With the review of the session that just ended (played with my instrument) on screen, a
  confirmed range change from the sheet closes that review as `Delete session` does, and
  `Review last session` is gone.
- With no kept session of my instrument, a range change saves with no warning.
- An outdated tab (stubbed newer version) with sessions of my instrument offers neither action
  and deletes nothing.
- An injected deletion failure keeps the confirmation with its error line; nothing is deleted.
- A kept session played in treble clef with written C2–C4 (19 staff spaces), reviewed after my
  instrument is switched to bass clef (shared height 16): every phrase is drawn whole (notation
  harness).

**Items covered:** 6 (sessions belong to their instrument), 14 (the outdated tab), 16 (the erase
warning, the cosmetic changes, the review's room), 17 (the check's warning).

**Verification:** the chunk checks; then Part B2 with the owner.

### Chunk 22 — Remembered controller

**Gate A must be applied before this chunk merges** (it breaks the old "forgotten on reload"
guarantee).

**Goal.** Remember the last controller the player chose and reattach it at load, without a
prompt, until the player disconnects it.

**Scope.** The controller record (written when a device counts as connected, cleared by
`Disconnect`, untouched by an unplug or by deleting my instrument, gone with Delete everything);
at load, only when the permission query says MIDI is already granted and a controller is
remembered, request access (which cannot prompt) and attach it when present, the no-controller
badge otherwise; through the sheet, **Requesting access** chooses it directly; after a load the
starting note starts nothing until the page's first click, tap or key press, and the
starting-note line says so. The remembered controller's identity matches the way v2 recognises a
device that comes back within a page.

**Files:** `src/midi/web-midi-access.ts`, `src/midi/midi-controller.ts` (load path),
`src/storage/records/controller-record.ts` (new), `src/components/workspace/use-controller-connection.ts`,
`src/components/workspace/SessionCueRow.vue` (the line); tests: the rewritten
`controller-status` reload test, `tests/e2e/controller/controller-remembered.spec.ts`.

**Spec sections:** [§7.3](master-spec.md#73-remembering-the-controller).

**Design docs:** [`flows/controller-connection/handoff.md`](../../../ui_ux/versions/v3.0/flows/controller-connection/handoff.md)
(At load, Routing rules), [`screens/controller-connection/handoff.md`](../../../ui_ux/versions/v3.0/screens/controller-connection/handoff.md),
[`screens/phrase-workspace/handoff.md`](../../../ui_ux/versions/v3.0/screens/phrase-workspace/handoff.md) (the
header at load, the starting-note line).

**Atoms:** `rule_last_controller_remembered`, `rule_delete_everything`; (v2, STABLE after Gate A)
`rule_same_controller_reattaches`, `rule_audio_unlocked_by_player_click`.

**Depends on:** chunk 7 and Gate A (and 15 for the Delete everything test).

**Done when:**

- Fake MIDI with permission granted and the device present: after a reload it is attached with no
  `requestMIDIAccess` prompt path taken and no sheet; with permission `prompt`, nothing is
  requested and `Connect controller` shows.
- The starting note after a load starts nothing before a click; after one click it starts a
  session.
- `Disconnect`, reload: nothing reattaches. Delete everything, reload: nothing reattaches.
- A different device plugged in is not picked up.

**Items covered:** 18, 12 (the controller included), 1 (the controller).

**Verification:** the chunk checks; hand check H4.

### Chunk 23 — Session seed plan

**Architecture capture:** the session's seeds and schedules fixed from phrase 1, before Start.

**Goal.** Make every seed and schedule a session will use known before Start, so that a phrase
generated early is exactly the phrase the session would have generated at that place.

**Scope.** Today each attempt draws a fresh random seed when it runs (`nextSeed` in
`src/session/session-intents.ts`; the Idle phrase's own in
`src/composables/use-generation-session.ts`), and the settings-mutation seed is drawn at Start
(`mutationFlagFor` in `src/components/workspace/workspace-session-runner.ts`). The generator
itself draws from no named random stream: it orders its candidates by seeded tie keys, so a
phrase depends only on its request and its seed. Only the settings mutation uses the indexed
streams (`deriveIndexedStream` in `src/domain/random/streams.ts`). The tension arc draws nothing:
it is a pure function of the phrase number (`src/session/tension-arc-cycle.ts`), so it is already
fixed before Start and this chunk leaves it alone.

This chunk draws one **session seed** at Idle, when a phrase 1 becomes a phrase a session could
start from (master spec §8), and derives from it, by one fixed integer derivation that the
architecture capture settles, the seed of every later phrase, of every failure-ladder rung and the
settings-mutation seed. Phrase 1 keeps the seed it was generated with. The session takes its plan
from phrase 1 at Start and holds the session seed in its **session-wide record** in the history
(spec D255, master spec §5.2), which chunk 9 keeps. Each phrase still carries its own seed, so
replay keys are unchanged in form. Pre-generation itself comes in chunk 24.

**Files:** `src/session/session-intents.ts`, `src/session/session-seed-plan.ts` (new),
`src/composables/use-generation-session.ts` (Idle side: the session seed drawn with phrase 1),
`src/components/workspace/workspace-session-runner.ts` (mutation seed),
`src/components/workspace/workspace-session-begin.ts`, `src/session/session-history.ts` (the
session-wide record), the harness's queued-seed seam; tests under `tests/unit/session/` and
`tests/unit/composables/`.

**Spec sections:** [§8](master-spec.md#8-pre-generating-phrases-at-idle) (the same phrases either way, the session seed), [§5.2](master-spec.md#52-what-a-kept-session-holds) (the session-wide record), [§11](master-spec.md#11-existing-code-and-risks).

**Atoms:** `rule_pregenerated_phrase_matches_session`; (v2) `rule_seeded_phrase_reproduction`,
`module_named_stream_pseudorandomness`, `rule_session_generation_failure_ladder`.

**Depends on:** chunks 0 and 2. Independent of every storage chunk.

**Done when:**

- Two runs of the same session from the same phrase 1 and session seed, on the fake clock, give
  identical phrases, including with Vary settings and Tension across phrases on.
- The session's history holds the session seed in its session-wide record from Start; a new
  phrase 1 at Idle comes with a newly drawn session seed.
- A skipped ladder rung's seed is simply unused; the next rung's seed does not depend on it, so the
  phrase after it is unchanged. The skipped rung's request id is still drawn and discarded.
- The `ifk1.` corpus passes unchanged.
- At the wave gate: the v2 sweep's results are unchanged in kind (no new repeat at any deadline).
  A new repeat there is traced back to this chunk first.

**Items covered:** 20 (its identity half).

**Verification:** the chunk checks; the sweep at the wave gate.

**Record (2026-10-11).** Merged into `v3.0-w1`. `documentalist` captured `module_session_seed_plan`
(DRAFT) first; no status advanced. The Idle session draws one session seed, from its own provider
apart from the phrase seeds', each time a fit run publishes a phrase 1 (one draw however many fit
attempts it took); re-showing that phrase 1 keeps it. Every later seed is the session seed XOR the
FNV-1a hash of a versioned label (`session-seed-plan-v1:phrase:<n>:rung:<r>` per phrase and ladder
rung, `session-seed-plan-v1:settings-mutation`), in `src/session/session-seed-plan.ts`: a session
draws no seed. A skipped rung's seed is simply unused, so the standalone attempt and the next
phrase keep theirs however many rungs ran, at any tempo (the Done-when's "consumes its seed
exactly as before" holds in that sense: nothing after the skip changes); a phrase requested again after a settings
change gets the same rung seeds. Request ids stay drawn from the page-wide provider, so they stay
unique, and a skipped rung still discards its request id. The session history holds the session
seed from Start (`SessionHistory.sessionSeed`), with nothing derived from it. The workspace harness
gains `queueSessionSeeds` / `sessionSeedsDrawn` and the two derivations; the e2e specs that queued
a session's seeds now queue a session seed (for a fixed label the derivation is its own inverse).
The export hand-check files were regenerated because their later phrases changed: their hand
checks need redoing. The `ifk1.` corpus passes unchanged.

### Chunk 24 — Pre-generation at Idle

**Architecture capture:** the Idle background queue on the one generation worker.

**Goal.** While the app is Idle with a phrase 1 a session could start from, generate up to four
following phrases in the background, never making the player wait, and spend them at Start.

**Scope.** After the prewarm, on the same worker: phrases 2 to 5 one after another, with no
deadline and the seed plan of chunk 23 (so a carry-in attempt gets all its retries). Any player
request at Idle cancels the background attempt in progress through the worker's existing
cancellation. Anything that replaces phrase 1 or changes a setting phrases are generated from
(a control, the profile, the instrument, a regeneration) discards every pre-generated phrase and
starts again; a window change that changes the generated density or the staff layout re-checks
them and discards from the first that no longer fits. Not while a review shows. A background
attempt never counts as "a phrase being generated" for Start. At Start the session takes the
ready phrases, then looks one phrase ahead as in v2; nothing is topped up during a session.
Nothing is saved. Measurement M4.

**Files:** `src/composables/generation-session-pregeneration.ts` (new),
`src/composables/generation-session-prewarm.ts`, `src/components/workspace/prewarm-policy.ts`,
`src/session/session-start-conditions.ts`, `src/components/workspace/workspace-session-phrases.ts`;
on the Idle side `src/composables/use-generation-session.ts` (it publishes phrase 1 with its
session seed and receives the edits that discard); on the Start side
`src/components/workspace/workspace-session-begin.ts` and the session engine or runner that takes
the ready phrases (`src/session/session-engine.ts`, `session-runner.ts`, as the capture settles);
`src/generation-worker/generation-worker-client.ts`, where the abort signal is passed; tests under `tests/unit/composables/`, `tests/e2e/workspace/pregeneration.spec.ts`, the sweep's
Idle phase.

**Spec sections:** [§8](master-spec.md#8-pre-generating-phrases-at-idle).

**Design docs:** [`flows/generate-phrase/handoff.md`](../../../ui_ux/versions/v3.0/flows/generate-phrase/handoff.md)
and [`flows/play-session/handoff.md`](../../../ui_ux/versions/v3.0/flows/play-session/handoff.md) (phrases
prepared at idle, no interface), [`screens/phrase-workspace/handoff.md`](../../../ui_ux/versions/v3.0/screens/phrase-workspace/handoff.md)
(Ready).

**Atoms:** `req_idle_pregeneration`, `rule_pregeneration_yields_to_player`,
`rule_pregeneration_discarded_on_change`, `rule_start_never_waits_for_pregeneration`,
`rule_pregenerated_phrase_matches_session`; (v2) `rule_dropped_attempt_cancelled`,
`module_generation_worker_cancellation` (revised for spec D290, a MINOR contract bump),
`rule_look_ahead_deadline`. **Part D:** `rule_session_start_conditions`,
`service_idle_generation_session`, and `rule_look_ahead_deadline` ("phrase 2 is generated during
the one-measure count-in" no longer holds when phrase 2 was pre-generated; revised at the sync,
with the owner's agreement then).

**Depends on:** chunk 23.

**Done when:**

- With every attempt succeeding at once (fake clock, instant generator), a session's phrases are
  identical with pre-generation on and off, for the same phrase 1 and session seed.
- A regeneration requested while a background attempt runs: the attempt is cancelled and the
  regeneration answers as fast as with pre-generation off (held-generation harness).
- Start pressed while a background attempt runs starts at once.
- A control change, a profile change, an instrument change and a regeneration each discard the
  ready phrases; a window change that steps the density down discards from the first that no
  longer fits.
- Nothing runs while a review shows; nothing is written to storage.
- M4's sweep has run; the share is recorded.

**Items covered:** 20.

**Verification:** the chunk checks; M4 on the reference machine; hand check H6.

### Chunk 24b — Stale phrase at Start

**Goal.** When Start is pressed, or the starting note played, and the phrase on screen is stale,
say so and ask Regenerate or Use it; make Use it start the session with phrase 2 joined as after
a settings change during a session, so ISS-011's `CarryInError` can no longer occur (spec D297;
master spec §16).

**Scope.**

- **Phrase 1's settings.** The Idle result records the settings its fit run was built from: the
  chosen controls and the musical-profile selection. Take the chosen controls, not the intent's:
  the intent holds the note density the window's width gave, which is not a setting.
- **Stale, one pure check.** It compares phrase 1's settings with the current controls and
  profile selection, by value, over what the generation reads (master spec §16's list): the tempo
  and the profile's customized mark left out; the instrument's id and, for my instrument, its
  range and transposition in. The session options, the mix, the theme, my instrument's clef and
  name, and the window never reach it.
- **The engine (24b-1, no interface).** A session start carries phrase 1's settings, with the
  session's tempo, beside the session's settings. `createSessionEngine` takes them as the
  settings phrase 1 was decided under (`lastDecidedSettings`), so `lookAheadBasis` adapts phrase
  2's carry-in through `adaptCarryIn`, as after a change at a phrase boundary. When the two are
  equal, nothing changes: the same requests and seeds as today. The pre-generation plan's initial
  course (`initialCourse`) takes the same input, so its phrases stay the session's.
  `workspace-pregeneration.ts`'s quiet stop on `CarryInError` goes; a `CarryInError` is a
  programming error again.
- **Pre-generation's re-check and its e2e lane (24b-1, from the wave-2 gate).** The queue's
  `observeInputs` re-check does not run while a session runs: today a layout report during a
  session calls `reconsider` (`workspace-pregeneration.ts`), which can truncate the ready phrases
  and abort the attempt in flight; it re-checks on the return to Idle instead. The workspace
  harness gains a permanent `VITE_HARNESS_PREGENERATION=on` switch, read where it chooses its
  pre-generation default (`tests/e2e/workspace-harness/main.ts:226`, today `disabled` without a
  `?pregeneration=` parameter), and the e2e suite gains a lane run with it on. The 10 e2e specs the
  wave-2 gate named load `?pregeneration=off` explicitly, so they do not depend on the default.
- **The prompt (24b-2).** At Start, once `startBlocker()` finds nothing, a stale phrase 1 opens
  the prompt in the words and form of the **Stale phrase design** gate. Nothing is unlocked,
  locked or started. **Use it** runs the same start, phrase 1's settings passed through. It is
  the click that unlocks the sound and asks for the screen locks, and it checks the start
  conditions again. **Regenerate** runs the Idle Regenerate and stays at Idle (O182, settled):
  nothing starts. Dismissing changes nothing. While the prompt shows, no MIDI note
  starts anything, as during the connection step, and pre-generation goes on.
- **The starting note** opens the same prompt when phrase 1 is stale.
- **Shown settings:** phrase 1's settings during the count-in and phrase 1, then the session's from
  phrase 2.
- **Split:** 24b-1 (the result's settings, the stale check, the engine, the pre-generation plan)
  runs first; 24b-2 (the prompt, Start, the starting note, the shown settings) needs O182 and the
  design gate. Each stays within about five source files.

**Files:** 24b-1: `src/composables/workspace-session-result.ts`, a new `src/session/stale-phrase-one.ts`,
`src/session/session-types.ts` (`SessionStart`), `src/session/session-engine.ts`,
`src/session/session-pregeneration.ts`, `src/components/workspace/workspace-pregeneration.ts`,
`tests/e2e/workspace-harness/main.ts`, the e2e lane's script in `package.json` and the 10 specs;
24b-2: `src/components/workspace/workspace-session-start.ts`,
`src/components/workspace/workspace-session-midi.ts`,
`src/components/workspace/workspace-session-settings.ts`, `src/components/workspace/WorkspaceShell.vue`
and a new prompt component beside it; tests under `tests/unit/session/`,
`tests/unit/components/workspace/` and `tests/e2e/workspace/stale-phrase-start.spec.ts`.

**Spec sections:** [§16](master-spec.md#16-a-stale-phrase-1-at-start), [§8](master-spec.md#8-pre-generating-phrases-at-idle),
[§10](master-spec.md#10-what-v30-changes-in-v2s-guarantees).

**Design docs:** [`flows/play-session/handoff.md`](../../../ui_ux/versions/v3.0/flows/play-session/handoff.md)
and [`screens/phrase-workspace/handoff.md`](../../../ui_ux/versions/v3.0/screens/phrase-workspace/handoff.md),
as the **Stale phrase design** gate revises them, or wherever it places the prompt.

**Atoms:** `rule_phrase_one_is_idle_phrase`, `rule_session_start_conditions`,
`module_session_shown_settings`, `service_session_engine`, `service_workspace_session_flow`,
`service_idle_generation_session`, `module_session_pregeneration_plan`,
`module_idle_pregeneration_queue`, `rule_pregenerated_phrase_matches_session`, and a new rule for
the prompt, each revised or written by `documentalist` before code; (STABLE, contract surface)
`rule_midi_starting_note` after **Starting-note wording**. Keep true:
`rule_setting_change_rechecks_pitch_carry_in`, `rule_key_change_drops_harmonic_carry_in`,
`rule_harmony_change_drops_unfit_harmonic_carry_in`, `rule_join_carry_in_limited`,
`rule_count_in_shown_on_screen`, `rule_tempo_never_affects_generation` (STABLE);
`rule_register_change_replaces_carried_window` (REVIEW).

**Depends on:** chunk 24; the **Stale phrase design** gate (24b-2 only). O182 and
**Starting-note wording** are settled (2026-10-13); the atom revision is `documentalist`'s,
before code.

**Done when:**

- ISS-011's engine reproduction (phrase 1 generated in C major, the session started with Written
  key F♯ at 60 BPM) starts, and phrase 2's request carries no harmonic part.
- Engine tests, phrase 1 generated under the defaults and the session started under one changed
  setting, at every tempo from 60 to 240 BPM in steps of 10: every other Written key; every other
  Collection, Ionian to Major included; every other Harmonic motion; Register Middle to Low, to
  High and to Varying. Each starts with no `CarryInError`, and phrase 2's request carries what
  the carry-in rules leave: no harmonic part after a key or collection change or a chord that no
  longer fits, the new register's window, standalone after Varying or a failed pitch re-check.
- With phrase 1 generated under the start settings, the engine's requests and seeds are as
  before: the existing engine tests and the `ifk1.` corpus pass unchanged.
- The stale check: each setting master spec §16 counts makes phrase 1 stale; the tempo, Rising
  tempo, Vary settings, Tension across phrases, the mix, the theme, my instrument's clef and
  name, a window crossing (a chosen Sixteenth below the tablet-landscape width included), and a
  setting changed and changed back do not.
- Pre-generation (fake clock, instant generator): with a stale phrase 1, the pre-generated
  phrases equal those the Use it session generates, and nothing stops quietly.
- A layout report during a session leaves the ready phrases and the attempt in flight alone; the
  re-check runs at the return to Idle. The e2e suite passes with pre-generation on, in its own
  lane, and off.
- e2e: the Written key changed at Idle, then Start: the prompt shows and nothing sounds. Use it:
  the count-in, phrase 1 as it was, phrase 2 in the new key, the controls showing phrase 1's key
  until phrase 2. Regenerate: a new phrase at Idle, nothing starts, and the next Start shows no
  prompt. Dismissing: still Idle. With no change, or only a
  tempo change, Start starts at once and the v2 Start tests pass unchanged.
- Fake MIDI: with a stale phrase 1, the starting note opens the prompt and starts nothing; no note
  played while it shows starts anything.
- The review of a Use it session shows phrase 1 in its own key and phrase 2 in the new one;
  phrase 1's replay key is the one it had at Idle.

**Items covered:** 24; 20 (pre-generation with a stale phrase 1); 23 (the sixth contract change).

**Verification:** the chunk checks; hand check H9.

### Chunk 25 — Stray-note filter

**Goal.** Leave very short stray notes out of the review's lane and, by default, out of the
played-notes export, while storing every note as received.

**Scope.** The threshold constant from M1, with its measured basis in a comment and in
`docs/midi-tuning.md`; one pure filter (`src/session/` or `src/domain/`, not `src/midi/`, since
it reads recorded notes) applied on reading: the lane, and the played-notes export unless
`Include very short notes` (never saved, off at every review opening) is on. Acknowledgement and
storage untouched. M1's duration script (tooling).

**Files:** `src/domain/played-notes/stray-notes.ts` (new), `src/components/review/played-notes-lane-view.ts`,
`src/export/played-notes-file.ts`, the review's export block for the option, `scripts/` (the
duration script); tests under `tests/unit/` with the M1 fixtures, `tests/e2e/review/review-played-notes.spec.ts`
(extended).

**Spec sections:** [§9](master-spec.md#9-stray-notes).

**Design docs:** [`flows/review-and-export/handoff.md`](../../../ui_ux/versions/v3.0/flows/review-and-export/handoff.md)
(Export: very short notes; Played Notes), [`screens/last-session-review/handoff.md`](../../../ui_ux/versions/v3.0/screens/last-session-review/handoff.md).

**Atoms:** `rule_stray_note_definition`, `rule_stray_notes_filtered_on_reading`,
`rule_played_notes_export_omits_stray_notes`; (v2) `rule_acknowledgement_exact_pitch`,
`rule_review_played_notes_toggle`. **Part D:** `req_played_notes_export`,
`module_review_played_notes_lane`.

**Depends on:** H1 (the recordings), chunk 1. Independent of the storage chunks; if chunk 11 has
merged, a kept session's played notes are filtered the same way.

**Done when:**

- The threshold is under 62.5 ms with a margin the M1 record justifies.
- On the M1 fixtures, the lane holds none of the notes under the threshold; the default export
  holds none; with the option, the export holds every note as received.
- A stored session's played notes include the very short ones.
- Acknowledgement tests are unchanged.

**Items covered:** 21.

**Verification:** the chunk checks; hand check H5.

### Chunk 26 — v3.0 release gate

**Goal.** Check the whole definition of done on the merged code, record every measurement and hand
check, close the intent record, and get the owner's go for the `3.0.0` tag.

**Scope.**

- `docs/release/v3.0-release-notes.md`, on the model of
  [`v2.0-release-notes.md`](../../../docs/release/v2.0-release-notes.md): one row per item 1–23
  with its evidence (named tests as `file` › 'title', or a written hand check), then a table of
  every replaced v2 test and its v3.0 counterpart (item 22), then M1–M5 with their figures.
- The privacy spy (network half) re-run with a database full of every kind of record (item 5).
- `npm run verify:boundaries` with the 224 kB entry budget unchanged (M5).
- Hand checks H3–H9 done or, for H8, written down as a v3.0.x note.
- Part B1 and B2 confirmed, **Review reachability** and **Starting-note wording** applied; **Part C** put to the owner and applied by `documentalist`;
  `documentalist`'s post-task sync over every `release-v3.0` atom, promoting those the owner
  agrees to.
- `package.json` version `3.0.0`; the tag only when the owner asks.

**Atoms:** every atom tagged `release-v3.0`; `contract_infinite_flow_first_release`,
`vision_infinite_flow_first_release`, `specification_behavioral_quality_gates`,
`specification_ephemeral_state_verification`; the four chord-fit atoms (retired).

**Depends on:** every other chunk, Gate A, Review reachability, Starting-note wording, Parts B1
and B2.

**Done when:** every item of §13 has a row with evidence; every measurement has its figure; the
owner says go.

**Items covered:** all, 22 and 23 in particular.

**Verification:** `npm run quality` on an idle machine; the release notes reviewed by the owner;
`npm run lint:links`. After the tag: `spec-writer` and `ux-writer` archive the v3.0 working
records (milestone archive).

## 7. Definition-of-done coverage

Every item of [§13](master-spec.md#13-definition-of-done), the chunk that builds it, and its
verification. The gate copies this into the release notes with the final test names.

| Item | Built in | Verified by |
| --- | --- | --- |
| 1 Settings survive a reload | 7; 20 (my instrument); 22 (controller); 11 (`Keep my played notes`) | e2e `tests/e2e/storage/saved-settings.spec.ts`, one test per §4.2 row; reached tempo not saved |
| 2 Chosen density saved | 6, 7 | codec unit test; e2e at phone width |
| 3 Tolerant loading | 6, 7 | property test over corruptions; e2e with a seeded invalid value |
| 4 Storage in one place | 3, 9 | boundary unit tests and fixtures; `session-history-export` storage trap unchanged |
| 5 Nothing sent | 11, 26 | privacy spy, network half, with storage in use |
| 6 Most recent survives; save deletes unpinned, keeps pinned; sessions belong to their instrument | 10, 12, 14, 20c | e2e reload and second-session tests; e2e deleting my instrument with seeded sessions |
| 7 No save during a session | 5, 7, 10 | save-policy unit test; IndexedDB write spy across a session |
| 8 Kept session holds only §5.2 | 9 | record allowlist test; byte-identical exports after decoding |
| 9 Played notes only after opt-in | 11, 15 | privacy spy, storage half; deletion tests |
| 10 Favorites | 12, 13 | e2e favorites; encoder tests of the favorites scope |
| 11 Session list; comment | 14, 12, 13 | e2e list; text scan for figures; comment limit; comment absent from files |
| 12 Delete everything | 15, 22 | e2e: empty database after the reload, controller forgotten |
| 13 Persistent storage | 5, 12, 15, 20 | persist spy; Protection line with stubbed `persisted()`; H7 for information |
| 14 Outdated tab | 4, 8, 20c | two-connection unit tests; e2e with newer seeded data, my instrument's deletions withheld |
| 15 Failed save | 5, 8, 10 | injected quota and other failures; session timing on the fake clock |
| 16 My instrument | 16, 17, 19, 19b, 20, 20c | refusal tests, the bound per clef included; worker range test; notation harness, both clefs; MusicXML clef test; reload e2e; the erase warning and the cosmetic changes e2e; pre-generated phrases re-checked on a clef change; a review in another clef drawn whole; M3 recorded, both clefs |
| 17 The check feeds my instrument | 21, 20c | fake-MIDI e2e, with and without kept sessions of my instrument; H3 |
| 18 Controller remembered | 22 | fake-MIDI e2e with permission states; H4 |
| 19 Replay keys | 2, 18 | `ifk1.` corpus; `ifk2.` round trip |
| 20 Pre-generation | 23, 24 | identity on the fake clock; cancellation, Start, discard tests; M4 recorded; H6 |
| 21 Stray notes | 25 (M1 from H1) | filter tests on real recordings; H5 |
| 22 v2 behaviour otherwise unchanged | every wave gate | `npm run quality`; the replaced-tests table of [§2](#2-read-first-what-v30-undoes-in-v2) |
| 23 Contract | Gate A, Review reachability, Starting-note wording, 26 | the confirmation recorded in the CONTRACT atom's notes |
| 24 Stale phrase at Start | 24b | engine tests per Written key, Collection, Harmonic motion and Register change, 60–240 BPM; stale-check unit tests; pre-generation identity with a stale phrase 1; e2e prompt; fake-MIDI starting note; H9 |

## 8. Open points for spec-writer

All seven points found while planning were settled in master spec v1.3 (2026-10-07):

1. Pre-generation identity: a pre-generated phrase equals the session's phrase wherever the
   session's own attempt succeeds in time, and is what a successful attempt would have produced
   elsewhere (master spec §8, item 20). Chunk 24 tests identity when the same attempts succeed.
2. Transposition spelling: chosen by interval name plus octaves and direction; each name fixes
   semitones and letter-name steps; the tritone is spelled as an augmented fourth (§7.1). Chunk
   16's interval names follow it. **Changed by master spec v1.5 (2026-10-09, spec D253):** the
   transposition is entered as octaves and a signed semitone count, and the name is derived from
   it by the same table and shown; the spelling rule is unchanged. **Changed by master spec v1.8
   (2026-10-12, spec D291):** the interval name no longer spells anything; the written part is
   spelled in the written key the player chose, with the fewer sharps or flats, sharps on a tie,
   as the code already does.
3. Vary settings and Tension across phrases discard pre-generated phrases; the tempo and Rising
   tempo do not (§8, item 20).
4. Persistent storage is asked for once per visit, on the first keep, unless already granted
   (§4.5, item 13), as this plan and the design have it.
5. An outdated tab saves and deletes nothing and offers no Delete everything (§4.3, item 14). The
   design offers it there today; `ux-writer` aligns `ui_ux/screens/your-data/handoff.md` (in the
   "Saving off this visit" state, `Delete everything` stays only for the unreadable-data case).
6. An outdated tab reads what it can; records written by a newer version are left unread, and a
   kept session saved by a newer version is listed as such and does not open (§4.3).
7. Pre-generation's battery cost is measured for information (§14; M4, H6).

Master spec v1.4 (2026-10-07) only fixes two wordings the chunk 0 re-sync found, and no chunk
changes: the starting note waiting for the page's first click, tap or key press widens v2's
audio-unlock rule (§7.3, §10; chunk 22 already uses any first gesture), and
item 6 deletes every unpinned kept session, as §5.1 says (chunk 10 already does).

Later the same day, v1.4 also settled three behaviours, and only chunk 15's tests change. An
outdated tab offers no deletion of any kind (§4.3, item 14). A visit whose read failed or was slow
offers Delete everything and nothing else (§4.4). Newer data wins over a failed read (§4.4).
Chunks 11 to 15 build the missing restrictions, as `ui_ux/` now specifies ("While Saving Is
Off" in `flows/kept-sessions/`). Neither saving-off state (an outdated tab, a visit whose read
failed or was slow) offers a deletion in the session list or a review, the review of the session
held in memory included. Turning `Keep my played notes` off there asks nothing, and no change
there retries a save. Item 14 now also covers the failed-read visit. Chunk 12 (review) and
chunk 14 (session list) test these with an injected failed read and with a stubbed newer version.

Master spec v1.9 (2026-10-12, spec D293) adds my instrument's clef, treble or bass, display only:
chunk 19b builds it in the notation, chunks 17, 18, 20 and 21 carry, leave out, choose and keep it.
Three points stay with the owner or `ux-writer`, none blocking chunk 19b: the range bound per clef
(the range ruling, [master spec §14](master-spec.md#14-deferred-and-open)), [spec O181](../../open-questions.md#v30-wave-2-o180) (phrases made
before a save that changes the shared height, before chunk 20), and the clef control's design
(the **Clef design** gate). Octave signs are [spec O180](../../open-questions.md#v30-wave-2-o180),
for a later version.

Master spec v1.10 (2026-10-12, spec D294–D296) settles two of those three points. The range bound
is written C2–C7 in treble clef and E0–E5 in bass clef (chunk 19b confirms the bass figure, chunk
20 enforces it). Spec O181 is closed: kept sessions belong to the instrument they were played
with; deleting my instrument deletes them, and a range or transposition change erases them after
a warning (the new chunk 20c); a name or clef change keeps them; a save that changes the shared
height re-checks the pre-generated phrases (chunk 20); a review never cuts a phrase (chunk 20c).
The **Clef design** gate stays, and a **Sessions design** gate joins it before chunk 20c. One
point waits for the owner: the wording of `req_last_session_review`'s reachability (the
**Review reachability** step), needed before chunk 12 merges, since chunk 12's `Delete session`
already ends the review sooner than "until the next session starts".

Master spec v1.11 (2026-10-13, spec D297) adds §16, a stale phrase at Start (ISS-011, reproduced
on v2.0.0): when the phrase on screen was made under settings that differ, in what the generation
reads, from the current ones, Start and the starting note ask Regenerate or Use it. Use it joins
phrase 2 to phrase 1 through the existing carry-in rules for a change during a session, so
nothing new is needed there; pre-generation builds the phrases Use it plays. New chunk 24b in wave
9 builds it. Three points wait: [spec O182](../../open-questions.md#v30-wave-2-o180) (what
Regenerate does; proposed: stay at Idle), the **Starting-note wording** (a STABLE contract
wording, for the owner), and the **Stale phrase design** gate (`ux-writer`). The **Review
reachability** step above is done: the owner confirmed it as MAJOR on 2026-10-12 (CONTRACT 4.0).

Later on 2026-10-13 the owner settled both points left to him (spec D297's ruling note, master
spec v1.12): Regenerate runs the Idle Regenerate and stays at Idle, the player pressing Start
again ([spec O182](../../open-questions.md#v30-wave-2-o180) closed); the starting-note wording is
accepted, MAJOR (CONTRACT 5.0). Only the **Stale phrase design** gate remains before chunk 24b-2.
