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
- **Plan v8 (6b26988, `spec-writer`, D367):** version 1 holds up to three phrase shapes between
  chunks 4 and 9 (profile only, profile and its levels, levels only). Chunk 8's reader takes all
  three (in the both-fields shape the levels must equal the profile's, or the record is
  unreadable) and routes the parser's `levelsForProfile` call through `profile-to-levels.ts`, with
  two Done when items for that. Chunk 9's version 1 database in its Done when holds four records,
  one per shape plus a damaged one. Next ids D368, O232.
- **Owner, 2026-10-19:** "you are allowed to parallelize some chunks if possible. this is
  temporary for this session": κ raised for this session only. Chunks 8 and 10 dispatched beside
  chunk 5: their Files lines share no file (5 in the pitch search and census, 8 in the replay key,
  storage, session and stale prompt, 10 in new `src/domain/presets/` files). Each owner re-runs
  typecheck and its tests on the merged tree if the wave branch moved, and stops on any file of
  another running chunk.
- **Chunk 10, preset model: merged 1567d0e** (f92a9c4). New files only, under
  `src/domain/presets/` and its tests; Done when met item by item (164 tests on its paths). For
  the interface chunks: each change is reported by its kind, with the key and collection after
  it. For the sync: `module_preset_model`'s refusal list adds `tooLong`.
- **Chunk 5, levels gate the figures: merged 9383597** (5a 7afa187, 5b 8ab76c9). Done when met
  item by item; 86 files / 1,509 tests on its paths on the merged tree; corpus guard passed. M1
  (2026-10-19 18:28 CEST, reference machine, load about 1.5 from the parallel chunks; shares do
  not depend on load): Neutral and Jazz equal v3.0's baseline; each figure Off gives 0 of it;
  every figure Off keeps Tension's figure, 6 of 1,278 Lift cases find no pitch plan (for the cost
  guard, chunk 11). Stale atom text for the sync: `rule_neutral_profile_diatonic_pitches`,
  `rule_jazz_chromatic_resolution`, `rule_tension_resolution_delay_permits_rests`,
  `module_musical_profile_capabilities`, `module_figure_levels`'s interface; and
  `rule_levels_govern_free_figures_only`'s EXPECTATION says "never changes which scheduled
  figure" where B5.4 says "does not reorder" (the binding can differ when one fails). Sent to
  `spec-writer`: whether the carry-in phrase's settleable tense ending should follow the passing
  or neighbor tone's level (ungated today; B5 is silent).
- **Plan v9 (f928c99, `spec-writer`): O232 opened**, for the owner, due before wave 2's
  preflight: should the figure levels reach a carry-in phrase's tense ending (ungated today)?
  Options: (a) leave it, (b) gate it like a free scale note there by the passing/accented passing
  and neighbor tone levels (recommended; the work goes on chunk 7), (c) gate it exactly across the
  join (too large). Chunk 11's section now records chunk 5's 6 Lift `no_legal_pitch_plan` cases
  and says its runs are made with O232's answer in place. Put to the owner 2026-10-19.
- **Owner ruling on O232 (2026-10-19): (b)**, gate the tense ending like a free scale note at
  that place (passing/accented passing or neighbor tone not Off); the work goes on chunk 7. Sent
  to `spec-writer` to record (D368).
- **Chunk 8, replay key `ifk3.`: merged ebeeab9** (35fafd0). Done when met item by item (12
  items); on the merged tree generation-worker and scripts 190, domain/generation 857, session
  762, storage 426, components 1,423, composables 195 tests pass; Playwright on its specs 38
  passed, 1 skipped (the key test, which passed given a key). The `ifk3.` tuple order and the
  built-in `null` marker are in the plan's Record line, for the sync to record in
  `module_phrase_replay_key`. In-browser replay test built; its Edge run is **v3.1 H3**, the
  owner's (`HARDWARE-CHECKLIST.md`). For the sync: part J's three contract atoms (chunk 8 half;
  CONTRACT 7.0.0), `module_on_device_database` known drift until chunk 9, the drift-check and
  Revision atoms listed in the chunk report. Left alone: the two corpus recorder scripts still
  label output `ifk1`/`ifk2` (re-recording only; fixtures never change).

### Wave gate (2026-10-19, 19:30 CEST, reference machine, idle)

On `v3.1-w1` at 85c538a. `npm run quality`: exit 0. Code health 0 errors (720 warnings, from
705: link-count and table-arrow warnings on the new files); unit 457 files, 6,979 tests passed;
`verify:boundaries` passed; Playwright 456 + 456 passed (1 skipped each, the H3 key test without
a key), 57 passed, 107 passed and 4 skipped; `atd:lint` and `atd:check` pass. `npm run
test:sweep` (placed by chunks 4 and 5): exit 0, 5 files, 16 tests, 113 s. **Bundle: entry chunk
230,609 B**, +1,463 B on v3.0's 229,146 B, 76,591 B under the 300 KiB budget.

### Wave sync and close

`documentalist` post-task sync over `b5f46da..v3.1-w1` (cc9aa6f): 20 atoms. **CONTRACT 6.3.1 →
7.0.0** (MAJOR) with part J6's paragraph; part J's chunk 8 half applied to
`rule_kept_session_content` 0.4, `entity_kept_session_record` 0.5, `module_kept_session_codec`
0.4 (D363); chunk 9's half (preset label, data version 2) waits, and takes the next version of
each. `module_phrase_replay_key` 0.6 records the `ifk3.` tuple. Chunks 4, 5 and 10's revisions
applied (`rule_levels_govern_free_figures_only` now says "do not reorder", B5.4's wording); one
`@spec-link` for `rule_jazz_chromatic_resolution` restored above `chromaticApproachPaths`. No
status advanced. Unresolved drift: `module_on_device_database`, until chunk 9 (D364, D367).
Applied differently from J3's text: "request and intent" applied to the intent only (the resolved
request never held a profile); the both-fields rule sits in the codec's interface.

For the owner: DRAFT → REVIEW for `module_figure_levels` and `module_preset_model` (built,
tested); the J3 deviation above. For chunk 9's sync: the J3/J5 second half, the
`module_on_device_database` drift, `module_stored_profile_to_levels`'s "not built yet" caveat.

Owner, 2026-10-19: "you may merge into main, you may work on the next wave, but that will be the
last for the day." Wave 1 merged into `main`, not pushed; wave 2 is the last wave today.

## Wave 2 (2026-10-19)

Chunks 6 (favored levels order the search), 7 (two new free figures, plus D368's tense ending)
and 9 (kept sessions hold the levels and the preset label). Branch `v3.1-w2`, worktree
`../infinite_flow-v3.1-w2`, cut from `main` 8e327bb (wave 1 merged). The owner's last wave for
2026-10-19.

### Preflight

`documentalist` (787241d), without `atd audit`. `atd lint` and `atd check` pass.

| Chunk | Verdict                                    | Captures                                                                                |
| ----- | ------------------------------------------ | --------------------------------------------------------------------------------------- |
| 6     | PROCEED after C6-1                         | `module_favored_figure_draw` 0.1 (`isFigureDrawn` in `src/domain/pitch/figure-draw.ts`) |
| 7     | PROCEED, sign-off given (D368), after C6-1 | none (builds on chunk 6's)                                                              |
| 9     | PROCEED, sign-off given (part J, D363)     | `module_kept_session_upgrade_step` 0.1 (`src/storage/migrations/kept-sessions-v2.ts`)   |

Part J covers every chunk 9 Revision, `module_on_device_database` included (J3), so the contract
stays 7.0.0. Chunk 9 shares no file with 6 or 7, so it may run beside them.

Sent to `spec-writer` before the first chunk: **C6-1** (blocks 6 and 7) which figure a free
diatonic tone "starts" and whether a favored one is held to the drawn figure's resolution;
**C9-1** one `KEPT_SESSION_DATA_VERSION` for summary, body and played notes, so moving it to 2
would make every session with played notes unreadable (option a: each shape its own version,
played notes stay at 1, per the STABLE database rule; option b: rewrite played notes too, which
needs the owner); C9-2 the label new sessions write until chunk 12 ("Custom (Jazz grammar)" today
vs. "Custom, based on Jazz"); C9-3 the phrase 1 fallback; Files and drift-check corrections C6-2,
C6-3, C6-4, C7-1, C9-4.

- **Plan v11 (c948f8f, `spec-writer`), D369–D372, no owner question:** D369 a favored free scale
  tone names the figures it may become and is tried held to the drawn figure ahead of the chord
  tones, then again unheld in its usual place (never a quota); D370 each kept shape keeps its own
  data version (summary and body to 2, played notes stay at 1; J3's "the shapes are at data
  version 2" applied to summary and body); D371 new sessions store the label in B9's form
  ("Custom, based on Jazz") from chunk 9 on, through one label function outside `src/storage/`,
  which chunk 12 routes the summary through; D372 the rest (fallback dropped, Part B v1.4; chunk
  6 Files and a 6a/6b split rule; drift checks; chunk 7 Atoms; chunk 9 Files, owner notes and
  Done when). Captures to amend to D369 and D372 before chunks 6 and 9 start.
- **Captures amended (afbafd3, `documentalist`):** `module_favored_figure_draw` 0.2 (D369) and
  `module_kept_session_upgrade_step` 0.2 (D370–D372). For the sync: the migration step now
  receives the app version (a STABLE interface detail under J3's "data version 2 and its step");
  check what the open does after a callback abort.
- **Chunks 6 and 9 dispatched in parallel** (no shared file; chunk 7 follows 6). Chunk 9, a data
  migration, has a `reviewer` check its step before merging.

### Chunks

- **Chunk 6, favored order: merged e307449** (6a c7bc4ae, 6b 1fed56c). Done when met item by
  item; 764 tests on its paths plus the corpus guard, 679 on orchestration and validation. Hash
  domain `infinite-flow/figure-draw/v1`, shares 1/4 and 1/2 (in the Record line, for the sync).
  M1 (load 4–10 from chunk 9; shares do not depend on it): each written figure rises strictly
  from As today to Strongly favored, for example neighbor tone 16.7 → 92.0 → 97.0 % of phrases.
  **For the owner when listening:** at 1 note in 4, a favored figure appears in most phrases;
  tuning is one constant in `figure-draw.ts`. Favoring adds a few `search_limit_exceeded` (up to
  15 against 6 of 5,112), well under B5.6's 2-point limit; chunk 11's M2 confirms at 240 BPM.
  Stale for the sync: `module_named_stream_pseudorandomness`, `module_pitch_search_transition`,
  `mechanic_pitch_tie_break_ordering`, `entity_pitch_candidate_domain`,
  `module_favored_figure_draw`'s "not built yet".
- **Chunk 9, kept sessions hold the levels and the preset label: merged dee61a7** (9a 5cf4798,
  9b 2750de7; `reviewer` OKAY on the step). Done when met item by item; 2,167 tests on the merged
  tree (chunk tests and corpus guard), 101 Playwright tests on its specs; new e2e spec
  `kept-sessions-carried-over.spec.ts` added to `test:e2e`; new script
  `measure:kept-session-upgrade`. M3 (reference machine, alone): 500 sessions of 100 kB in about
  0.75 s, inside the 2 s wait, so the step stays at open; with 650 kB bodies 500 sessions run past
  the wait (one visit from the defaults). **For the owner.** Sent to `spec-writer`: the review
  summary's missing {length} (both designs show it, no chunk owns it); the M3 heavy-body figure;
  `parseConcertEventTimeline` accepting a hole in `timeline.measures`. Stale for the sync: part
  J's chunk 9 half (`rule_kept_session_content`, `entity_kept_session_record`,
  `module_kept_session_codec`, `module_kept_session_reach`, `req_kept_session_list`,
  `module_on_device_database` incl. `MigrationUpgrade.appVersion`),
  `rule_earlier_kept_sessions_carried_over` (reads the mark from the summary, no phrase 1),
  `module_kept_session_upgrade_step`'s "not built yet".
- **Plan v12 (af72dc2, `spec-writer`), D373–D375:** D373 inserts **chunk 22** (the review's
  summary gives the session's length, from the same function as the stored `lengthSeconds`) into
  wave 3, after chunk 12 (wave 3 not yet preflighted, so its preflight covers it); D374 records
  M3 (the plan's method settles chunk 9's point) and opens **O233** for the owner with a new gate
  **M3H** blocking only the release gate: accept that very long pinned v3.0 sessions (about 220+
  of about 13 minutes) overrun the start-up wait once (recommended), or build read-time
  conversion; D375 files **ISS-013** (Low), `parseConcertEventTimeline` accepting holes. Next
  ids D376, O234.
