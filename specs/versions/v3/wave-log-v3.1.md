# Infinite Flow v3.1 — Wave log

The execution record of the [v3.1 build plan](build-plan-v3.1.md), kept by the wave driver: what
each wave preflight found, each gate's results and figures, what was moved and why, and each
report to the owner. Rulings live in [`decisions.md`](../../decisions.md); the plan holds only the
current state.

## Wave 0 (2026-10-19)

Chunks 0 (intent re-sync), 2 (baselines) and 3 (measurement tools). Branch `v3.1-w0`, worktree
`../infinite_flow-v3.1-w0`, cut from `main` 1d6dee3 (the approved plan v4 with the v3.1 design
freeze, ux D324). `main` then received the `v4-accompaniment-research` merge (3861edc, D259 and
D260) and a lexicon follow-up (b2ddec2), was pushed, and was merged into the wave branch
(f8b9793).

Before the preflight: the owner approved plan v4, including the transitional state of waves 0–3
on `main` while T1 waits (spec D357); `spec-writer` checked master spec Part B's code facts
(B12) against the code and raised Part B to v1.1 (spec D358), opening O231.

### Preflight

`documentalist` ran the full pass over the three chunks without `atd audit`. `atd lint` passes;
`atd check --full` shows only the expected NO_IMPL rows (DRAFT v3.1/v3.2 atoms, CONTRACT, VISION
and a few requirement atoms), none in wave 0's files. No chunk names an architecture capture, so
no atom was written.

| Chunk | Verdict               | Governing atoms                                                                                                                                        | Open before code                                                                                                                      |
| ----- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | PROCEED, inputs ready | the 38 `release-v3.1` and 17 `changes-in-v3.1` atoms; `contract_infinite_flow_first_release` (STABLE, 6.3.1)                                           | none; the chunk may find a STABLE or CONTRACT atom that needs the owner                                                               |
| 2     | PROCEED               | none (test plumbing); backs `rule_seeded_phrase_reproduction`, `module_phrase_replay_key`, `rule_neutral_and_jazz_figure_levels` without changing them | none; the new corpus spec gets its `@test-link` in chunk 8, so the wave sync treats it as deferred                                    |
| 3     | PROCEED               | none (measurement)                                                                                                                                     | none; keep the `@test-link [[rule_look_ahead_deadline]]` tags of the sweep specs if they are touched (they are not on its Files line) |

Plan corrections, applied by `spec-writer` before the first chunk (5b5d55f): chunk 0's Atoms line
gives the contract at 6.3.1 and checks that the CONTRACT 3.0 wordings still hold in it; chunk 2's
Files line names `scripts/record-replay-key-corpus.mjs` (it writes only the `ifk1-v2.0.json`
corpus, which must stay unchanged); the Read-first box counts about fifty files that read the
profile (48 on d007b27).

Open for the owner, not blocking wave 0: **O231**, the entry chunk's 230 B of headroom under the
224 KiB budget, due before wave 1's gate; **T1**, asked again before wave 4.

### Chunks

- **Chunk 0, intent re-sync: done, 60fe7d8** (`documentalist`, spec ingestion on the wave branch).
  It checked Part B v1.1 against the `release-v3.1` atoms (now 40: two added,
  `rule_player_preset_may_hold_unsupported_rhythm` and `rule_presets_read_at_start_up`), the
  `changes-in-v3.1` atoms (now 20: three REVIEW atoms tagged) and CONTRACT 6.3.1, whose CONTRACT 3.0
  wordings all still hold. It revised `rule_presets_load_tolerantly` and
  `rule_earlier_kept_sessions_carried_over` to 0.2, and recorded the check as part I of the change
  set. `atd:lint` and `atd:check` pass. No status advanced.
  - Questions for the owner (change set I3): may the `changes-in-v3.1` tag go on the STABLE
    `rule_saved_settings_load_tolerantly` (metadata only); do v3.1's revisions of v3.0's STABLE
    atoms on the contract take a MINOR or a MAJOR contract bump (two weaken a guarantee:
    `rule_settings_saved_on_change` and `rule_saved_settings_load_tolerantly`), due before the
    first wave sync that revises one; and an optional rewording of `rule_open_phrase_ending`.
  - For `spec-writer` (I4): B11 and B12 still count four STABLE changes, from before CONTRACT 6.3,
    and miss four atoms. For the chunk that revises `rule_pregeneration_discarded_on_change`:
    `settingsKeyOf` keys on the profile selection, against B8.3 (part F).
- **Chunk 2, baselines: merged 392cdc9** (99d6233). The wave branch's `src/`, `tests/`, `scripts/`
  and package files equal `v3.0.0`; the corpus passed on the tag itself and on the wave branch.
  210 cases (126 `ifk1.`, 84 `ifk2.`), 677,547 B, deterministic (each key replayed twice). Entry
  chunk 229,146 B on the tag. Within-chunk decision: 21 rotated cases the workspace blocks take the
  workspace's nearest supported syncopation. A temporary `@lint-ignore-atd` line in the new spec
  must be removed by chunk 8 (carried into its brief).
- **Owner rulings (2026-10-19)** on chunk 0's I3 and O231: the `changes-in-v3.1` tag may go on the
  STABLE `rule_saved_settings_load_tolerantly`; v3.1's revisions of v3.0's STABLE atoms on the
  contract take a **MAJOR** bump, with the owner confirming the wordings before the first wave sync
  that revises one; `rule_open_phrase_ending` is reworded with v3.1; the entry budget is raised to
  **300 kB** (read as 300 KiB, 307,200 B, the unit the 224 kB budget uses). Sent to `spec-writer`
  to record and to `documentalist` for the tag and the wording draft.
- **Rulings recorded (plan v5, 67b92c0):** D359 (budget 300 KiB, O231 closed), D360 (STABLE tag),
  D361 (MAJOR bump, gate CS), D362 (`rule_open_phrase_ending` reworded in chunk 12). `spec-writer`
  traced from the code that **CS blocks wave 1's sync** (chunk 8 changes what a kept phrase
  stores), added the contract atoms to chunks 8, 9, 12, 16, 17 and 18's Revisions, and gave the
  three REVIEW atoms of change set I4 a chunk each. For wave 1's preflight: chunk 8 writes kept
  phrases in the new shape at data version 1 while chunk 9's migration to version 2 expects
  v3.0's, so sessions kept in a development database between waves 1 and 2 may not read after
  the upgrade (development data only; no release before wave 5).
- **CS drafts and the D360 tag (c1e4913, `documentalist`):** change set part J, nine wordings,
  two of them weakening a guarantee; CONTRACT 6.3.1 → 7.0.0, applied from wave 1's sync on. Sent
  to the owner 2026-10-19; CS open.
- **Entry budget 300 KiB (fa76c8b, `coding-executor`):** `entryChunkByteBudget = 300 * 1024`, the
  README's checks table; `verify:boundaries` passes with the entry chunk at 229,146 B. The two
  present-tense 224 KiB lines in `docs/controller-connection.md` marked as history.
- **CS cleared (d2311c2, `spec-writer`, plan v6):** the owner agreed the part J wordings
  ("Agreed to the change in the wording."), recorded as D363; gate CS done, out of wave 1's
  Waits-for. The wave sync marks part J confirmed. Next free ids D364, O232.
- **Owner, 2026-10-19:** "once you're done with wave 0 you may proceed to wave 1", read as leave to
  close wave 0 (gate, sync, merge into `main`, unpushed) and start wave 1 without a further stop.
- **Chunk 3, measurement tools: merged 6e9f36c** (d976392). Figure census (`measure:figures`, M1)
  and cost runner (`measure:cost`, M2), both taking a `{label, apply}` setting list so chunk 4 can
  add figure levels. Baselines on v3.0's code (`src/` identical to `v3.0.0`), reference machine
  (Ryzen 5 PRO 8640HS, not a VM), 2026-10-19, idle; in the plan's Record line and
  `docs/generation-latency.md`. Within-chunk readings: "568 rhythm settings × two seeds" as the 568
  sweep cases (284 settings × 2 seeds); "240 BPM session run" as the sweep's six-phrase sessions.
  The first M2 run ran out of memory; the outcome cache is now per (setting, density), peak about
  1.57 GB. Finding, no issue filed: sweep case #542 played as Jazz repeats phrase 5 at its deadline
  at 60 and 120 BPM (v3.0 behaviour; `test:sweep` plays it as Neutral). `test:sweep` now also runs
  the census's 4 fast tests. Risk for chunks 5–7: the census mirrors the validator's free-figure
  rules and must follow any change to them.

### Wave gate (2026-10-19, 16:40 CEST, reference machine, idle)

`npm run quality` on `v3.1-w0` at a3ab504: exit 0. Code health 0 errors (705 warnings, as
before); unit 446 files, 6,735 tests passed; `verify:boundaries` passed (entry budget 300 kB);
Playwright 454 + 454 + 57 + 107 passed, 4 skipped; `atd:lint` and `atd:check` pass. No sweep (no
wave 0 chunk places it). **Bundle: entry chunk 229,146 B**, unchanged from v3.0 (no `src/` change
in the wave), 78,054 B under the 300 KiB budget.

### Wave sync and close

`documentalist` post-task sync over `b2ddec2..v3.1-w0` (67ede41): change set part J marked
confirmed by the owner (D363), none of it applied yet (wave 1's sync, chunk 8, applies it under
CONTRACT 7.0.0); the D360 tag confirmed in place; chunk 2's missing `@test-link` deferred to
chunk 8; chunk 3 and the budget change need no atom (no atom states a KiB figure). No atom edited,
no status advanced, no drift. For `spec-writer`, optional: part J's heading still reads "for the
owner's sign-off … not applied"; `decisions.md` D363 links to its anchor.

Report to the owner (2026-10-19): chunks 0, 2 and 3 merged, none moved; gate passed; entry chunk
229,146 B; sync clean; nothing waiting on the owner for wave 1 (T1 is asked again before wave 4).
Merged into `main` on the owner's leave ("once you're done with wave 0 you may proceed to wave
1"), not pushed.

Left for wave 1: the preflight raises the data-version risk between chunks 8 and 9 (see the
rulings entry above); chunk 8's brief says to remove the `@lint-ignore-atd` line in
`phrase-replay-key-v30-corpus.spec.ts` and apply part J under CONTRACT 7.0.0; chunk 4's brief
notes that `measure:figures` and `measure:cost` take a `{label, apply}` setting list.

## Wave 1 (2026-10-19)

Chunks 4 (figure levels in the request), 5 (levels gate the figures), 8 (replay key `ifk3.`) and
10 (preset model). Branch `v3.1-w1`, worktree `../infinite_flow-v3.1-w1`, cut from `main` b5f46da
(wave 0 merged), on the owner's leave to go on from wave 0.

### Preflight

`documentalist` (517527b), without `atd audit`. `atd lint` and `atd check` pass.

| Chunk | Verdict                                | Captures                                                                                                                                |
| ----- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 4     | PROCEED                                | `module_figure_levels` 0.1 (new); `module_musical_profile_capabilities` 0.2; `module_generation_request_construction` 0.5 (end of wave) |
| 5     | PROCEED                                | none (its three Revisions are REVIEW atoms off the contract)                                                                            |
| 8     | PROCEED, sign-off given (part J, D363) | `module_phrase_replay_key` 0.5 (`ifk3.`); `module_stored_profile_to_levels` 0.1 (new, `src/storage/records/profile-to-levels.ts`)       |
| 10    | PROCEED                                | `module_preset_model` 0.1 (new, `src/domain/presets/`)                                                                                  |

Left to chunk 8 and recorded at the sync: the order of the `ifk3.` tuple's entries, and how a
built-in phrase's tuple marks that it has no My instrument profile (permanent once keys are
emitted). Chunk 8's corpus spec links: the replay case takes `rule_seeded_phrase_reproduction`,
`rule_neutral_and_jazz_figure_levels` and `module_phrase_replay_key`; the decode case takes
`module_phrase_replay_key`; remove the `@lint-ignore-atd` line.

**Data-version risk (raised at wave 0):** no atom or plan line covers it, and it is worse than
first thought. A version 2 step that expects a profile in every version 1 phrase throws on a
phrase written by chunk 8, the upgrade rolls back and every later open of that development
database fails. Chunk 8 also contradicts the STABLE `module_on_device_database` (a record's data
version is the one its current shape was introduced at) until chunk 9 lands. Proposed:
chunk 9 moves into wave 1 after chunk 8; chunk 9's step reads both shapes and never throws on a
stored value; chunk 8's Done when adds "a session kept by this chunk's code reopens and exports
identically". Fallback: clear development kept sessions before a wave 2 build.

Ten plan corrections (Files lines of chunks 4, 5, 8; the Read-first "Never" row against `ifk3.`
re-encoding; the goldens' factory input; the summary's profile source; the stale prompt's labels
with no owner; chunk 8's drift list and size; chunk 10's key labels) and a v3.0 mismatch
(`rule_stale_phrase_prompt_at_start` vs. the codec's summary profile after "Use it") sent to
`spec-writer` before the first chunk.

### Plan v7 (0ba6e5e, `spec-writer`), before the first chunk

- **D364, the data-version risk:** chunk 9 stays in wave 2 (moving it would change a wave after
  its preflight and make a three-chunk chain 4 → 8 → 9). Instead chunk 9's version 2 step reads
  both version 1 shapes with chunk 8's reader and never throws on a stored value, leaving an
  unreadable record for the codec to report; its Done when opens a version 1 database holding a
  v3.0 session, a wave 1 session and one damaged record. Chunk 8's Done when adds that a session
  kept by its code reopens with identical review and exports. Chunk 8's drift check names
  `module_on_device_database` as known drift until chunk 9.
- **Chunk 4 grew:** it now removes the profile from the pitch policy, the validation context and
  the harmony planner (with its three callers), so chunks 5 and 8 share no file; 4a/4b split rule;
  Revision of `module_harmony_candidate_domain`. Files gain `window-search.ts`,
  `figure-census.ts`, `validation-fixtures.ts`.
- **Chunk 8:** the "Never" row now names the fixtures and replay assertions, not the spec files;
  re-encode cases replaced; goldens' factory input keeps the profile until chunk 12; **D365** the
  summary's profile comes from the session history (fixing v3.0's "Use it" mismatch); it owns the
  stale prompt's labels (interim wording until chunk 14, never released); Revisions gain
  `module_session_carry_in_after_change` and `service_session_history`; Files name the test
  readers beyond its folders.
- **Chunk 5:** census added to Files. **Chunk 10:** the restriction in words takes display labels
  as input; `rule_preset_management_actions` not added (chunk 17's).
- D366 records the rest. Next ids D367, O232. A `documentalist` peek over chunk 4's and chunk 8's
  added files runs before chunk 4.
- **Peek after plan v7 (f2cd74b, `documentalist`):** chunk 4 PROCEED, chunk 8 PROCEED (sign-off
  given) confirmed. Eight STABLE atoms sit in the added files outside part J; none changes
  meaning (the files only drop an unused profile argument). Capture touch-ups:
  `module_musical_profile_capabilities` and `module_generation_request_construction` (the factory
  input keeps the profile until chunk 12). For the wave sync: J3's kept-record wording applies
  only in its chunk 8 half (spec D364); revise `module_harmony_candidate_domain` together with
  `rule_jazz_chromatic_resolution` (chunk 5).

### Chunks

- **Chunk 4, figure levels in the request: merged bfa53a3** (4a d06205b, 4b 683bee4; split rule
  applied). Done when met item by item; corpus guard passed, fixtures byte-identical; unit 223
  files / 4,287 tests on its paths. Outside its Files line, forced by the intent's new field:
  `kept-phrase-parsers.ts` reads `figureLevels` as optional (checked against the stored profile,
  filled from it when absent). So phrases kept until chunk 8 hold both `musicalProfile` and
  `figureLevels`: a third version 1 shape, sent to `spec-writer` for chunks 8 and 9 (D364's
  reader). Chunk 8 routes that parser's `levelsForProfile` call through `profile-to-levels.ts`
  (`module_stored_profile_to_levels`). For the sync: `module_harmony_candidate_domain` no longer
  consumes a profile.
