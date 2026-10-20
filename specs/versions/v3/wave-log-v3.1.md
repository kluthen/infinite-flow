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
- **Chunk 7, the free appoggiatura, the diatonic enclosure and D368: merged d4c9985** (b3f4d6c).
  Done when met item by item; 2,241 tests on the merged tree (its paths, session, corpus guard);
  carry-in matrix 480 of 480 joins, 0 tense endings with the three tones Off. M1 (load 1.5–4.9):
  both new figures rise from 0 at Off to 61.2 % and 77.2 % at Strongly favored; Neutral and Jazz
  equal v3.0. For chunk 11's M2: the diatonic enclosure at Favored adds the most cut-offs. Stale
  for the sync: `rule_join_tense_note_resolution` (D368), `module_favored_figure_draw` (lists the
  two new figures; "not built yet"), `entity_pitch_candidate_domain`,
  `module_pitch_domain_validation`.

### Wave gate (2026-10-19, 22:24 CEST, reference machine, load 3.4 falling, nothing else running)

On `v3.1-w2` at 90b9945. `npm run quality`: exit 0. Code health 0 errors (724 warnings); unit
471 files, 7,248 tests passed; `verify:boundaries` passed (48 JS chunks, from 42); Playwright
458 + 458 passed (1 skipped each), 57 passed, 107 passed and 4 skipped; `atd:lint` and
`atd:check` pass. `npm run test:sweep` (placed by chunks 6 and 7): exit 0, 5 files, 16 tests,
116 s. **Bundle: entry chunk 227,702 B**, −2,907 B on wave 1's 230,609 B (−1,444 B on v3.0's
229,146 B), 79,498 B under the 300 KiB budget.

### Wave sync and report

`documentalist` post-task sync over `8e327bb..v3.1-w2` (ae4b2b3): 18 atoms, contract stays
7.0.0. Part J's chunk 9 half applied (D363); `module_on_device_database` 0.5 resolves the drift
from D364/D367. `rule_join_tense_note_resolution` 0.3 per D368. Chunk 6's draw recorded
(domain `infinite-flow/figure-draw/v1`, shares). `module_pitch_planner` 1.2: "no candidate
retried" became "no search entry retried" (D369 tries a free tone twice). Part J applied
differently from its wording in seven listed places (in the change set's "Applied at wave 2's
sync" paragraph); the material one: sessions are carried over at open only, until O233. Finding:
a request failing inside the upgrade (a full device) rolls it back and gives an unavailable port,
so every visit starts from the defaults until space is freed; no test covers that path. No drift
unresolved. No status advanced; proposed DRAFT → REVIEW: `module_favored_figure_draw`,
`module_kept_session_upgrade_step`, `module_stored_profile_to_levels` (with wave 1's
`module_figure_levels`, `module_preset_model`).

Report to the owner (2026-10-19, end of day): chunks 6, 7, 9 merged, none moved; gate passed;
entry chunk 227,702 B; sync applied part J in full. Open for the owner: O233 (gate M3H, before the
release gate; recommended (a) accept), the five DRAFT → REVIEW proposals, whether to test or file
the full-device path, merging `v3.1-w2` into `main`, v3.1 H3 in Edge. Next for a fresh driver:
wave 3 (chunks 11, 12, 15, 16, 22) after the merge; T1 is asked again before wave 4.

### Owner answers and merge (2026-10-20)

The owner answered: merge `v3.1-w2` into `main` and push; O233 (a), accept the rare overrun and
say so; all five DRAFT → REVIEW proposals; the full-device path: leave it. `spec-writer`
recorded D376 (2e25145, plan v13): O233 closed, B9 states the limit, gate M3H done, the
full-device rollback accepted with no test; wave 3's sync aligns
`rule_earlier_kept_sessions_carried_over` and change set J3 with the new B9. `documentalist`
committed the owner sign-off (51392cb): `module_figure_levels`, `module_preset_model`,
`module_favored_figure_draw`, `module_kept_session_upgrade_step`, `module_stored_profile_to_levels`
to REVIEW. Wave 2 merged into `main` and pushed. The owner then said to go on with wave 3 in
this session (κ > 1 still allowed for it).

## Wave 3 (2026-10-20)

Chunks 11 (cost guard, first run), 12 (presets replace the musical profile), 15 (vary settings
inside the restriction), 16 (presets and levels on the device) and 22 (the review's summary
gives the session's length). Branch `v3.1-w3`, worktree `../infinite_flow-v3.1-w3`, cut from
`main` 1650ab4 (wave 2 merged and pushed). T1 not given, so chunk 1 stays in wave 4. The owner
said to go on with this wave in the same session as wave 2's merge; κ > 1 still allowed.

### Preflight

`documentalist` (866f761), without `atd audit`. `atd lint` passes; `atd check --full` 408 atoms,
313 with code, 316 with tests.

| Chunk | Verdict                                            | Captures                                                                                                              |
| ----- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 11    | PROCEED (C11-1 if a share is tuned)                | none                                                                                                                  |
| 12    | PROCEED, sign-off given (J5, D363), after C12-*    | `module_generative_profile_selection` 1.2, `module_profile_control_customization` 1.2, `module_settings_mutation` 0.3 |
| 15    | PROCEED after C15-1                                | none                                                                                                                  |
| 16    | PROCEED, sign-off given (J1–J3, D363), after C16-* | `module_settings_upgrade_step` 0.1, `entity_player_preset_record` 0.1 (new, DRAFT)                                    |
| 22    | PROCEED after C22-1                                | none (the length's definition is in `entity_kept_session_record`)                                                     |

No new owner sign-off; contract stays 7.0.0. No wave 3 chunk changes
`rule_earlier_kept_sessions_carried_over`; the sync aligns it and J3 with D376's B9.

Sent to `spec-writer` before the first chunk: C11-1 (revise the draw atoms if a share is tuned);
C12-1 (files that still read the profile); C12-2 (storage between chunks 12 and 16: Neutral and
Jazz selections saved as v3.0's, the rest unsaved until 16; adds `settings-saver.ts`); C12-3
(drift check list); C15-1 (the restriction reaches the draw through the start settings and
`session-mutation-step.ts`, not the seed plan); C16-1 (atoms line); C16-2 (J3 without the
read-time clause, per D376); C22-1 (two tests that assert the whole summary line).

### Plan v14 (6947bca, `spec-writer`), before the first chunk

All nine corrections applied; D377 records C12-2 (storage until chunk 16: Neutral, Jazz and
Custom based on one saved as v3.0's selection; the other built-ins and the levels unsaved until
16; no owner needed, as wave 3 does not merge between 12 and 16). The change set's J3 is left
to `documentalist` at chunk 16's sync.

### Chunks

Order changed from the plan's tie-by-number: chunk 11's M2 charges each attempt its measured
time, so it runs alone on an idle machine, after 12, 15, 16 and 22 have merged and before the
wave gate. Chunk 12 first (15, 16 and 22 wait on it), then 15, 16 and 22 beside each other.

- Chunk 12: dispatched 2026-10-20 (`../infinite_flow-v3.1-c12`, branch
  `v3.1-c12-presets-replace-profile`).
  Merged as f0228f7 (51aadb7); chunk checks pass, corpus guard unchanged. New
  `src/storage/saved-profile-bridge.ts` holds D377's interim mapping (chunk 16 deletes it). For
  the sync: delete `rule_mutation_profile_flip_keeps_controls`; `service_session_engine`'s
  settings wording. Copy still saying "musical profile" (`your-data-copy.ts`,
  `generation-failure-alert.ts`) noted for chunk 13 or `ux-writer`.
- Chunks 15, 16 and 22: dispatched together 2026-10-20 after chunk 12's merge
  (`../infinite_flow-v3.1-c15`, `-c16`, `-c22`); they share only `HARDWARE-CHECKLIST.md` on
  paper. Chunk 16 asked for a `reviewer` pass on its upgrade step and for M3 only on a quiet
  machine.
- Chunk 22: merged as 983d6bb (fedbe14); chunk checks pass. `sessionLengthSeconds` now in
  `src/session/session-timing.ts`. No revisions; the sync confirms its new links.
- Chunk 15: merged as 43cb17c (ed24231); chunk checks and corpus guard pass. The restriction is
  frozen at Start from `BUILT_IN_PRESETS`; told chunk 16's owner (still running) that every place
  fed the built-ins needs the full list once player presets load.
- Chunk 16: merged as b6e21f3 (12d6422, adff353; `reviewer` OKAY on step 3). Data version 3;
  player presets load into the session and feed every place chunk 15 named. M3 inside the wait
  (500 sessions 735–767 ms). Found: `decodeSettings` can throw on a stored BigInt or circular
  control value (v3.0 defect), to file as an issue.
- Chunk 11: dispatched 2026-10-20 after chunk 16's merge, alone on the reference machine
  (`../infinite_flow-v3.1-c11`); timed runs only below a 1-minute load of about 1.5. It
  proposes DP's decision; the driver takes it to the owner and `spec-writer`.
- Chunk 11: merged as 138a9da (b1a4427). M2 meets B5.6's acceptance in all three settings (no
  phrase lost; fallbacks at or below the baseline); every built-in generates in every allowed
  mode; no share tuned. Proposed DP: reject the passing-and-neighbor rule (chunk 20 dropped).
  Taken to the owner.

### Owner ruling during the wave (2026-10-20)

Gate DP: the owner chose "Reject the rule (Recommended)". `spec-writer` (c6e5407, plan v15, Part
B v1.6): D378 (DP rejected, chunk 20 dropped, wave 5 is 14, 17, 18, 19), D379 (chunk 11's two
readings hold), D380 (ISS-014: a stored BigInt or circular control value makes `decodeSettings`
throw, and the app then never mounts; Low, Medium argued), D381 (chunk 12's leftover "musical
profile" copy goes to chunks 13 and 18, worded by the frozen design set).

### Wave gate (2026-10-20, 12:50 CEST, reference machine, load 0.86, nothing else running)

First run on 51fcef7 (11:57): `npm run quality` failed in the Playwright run on one test,
`pregeneration.spec.ts` "pre-generation writes nothing to storage", still counting 7 stores after
chunk 16 added `presets`; fixed by a `coding-executor` in 3fb7919 (test expectation only).
`npm run test:sweep` (placed by chunk 12): exit 0, 5 files, 16 tests.

Second run on `v3.1-w3` at c6e5407: `npm run quality` exit 0. Unit 478 files, 7,386 tests
passed; Playwright 488 + 488 passed (1 skipped each), 57 passed, 107 passed and 4 skipped;
`verify:boundaries`, `atd:lint`, `atd:check` pass. **Bundle: entry chunk 246,844 B** (49 JS
chunks), +19,142 B on wave 2's 227,702 B (+17,698 B on v3.0's 229,146 B), 60,356 B under the
300 KiB budget.

### Wave sync and report

`documentalist` post-task sync over `1650ab4..v3.1-w3` (7b6868b); contract stays 7.0.0. Part J:
J1, J2, J5 as worded; J3 without the read-time clause (D376), plus each shape's data version, and
`KeptSessionFacts.presets` applied to `module_kept_session_codec` under J3 (for the owner to
confirm); the change set's J1–J3 marked applied, J4 left for chunks 17 and 18. Chunk 12's
Revisions applied, `rule_mutation_profile_flip_keeps_controls` deleted; chunk 15's and 16's
drift aligned; `rule_earlier_kept_sessions_carried_over` 0.4 per D376;
`req_embellishment_figure_levels` 0.2 per D378 (every figure Off selectable; no rule atom; change
set part H records the rejection). Unresolved: ISS-014 against `rule_saved_settings_load_tolerantly`;
STABLE `module_kept_session_save`'s interface lacks the `presets` argument (1.1 proposed);
`docs/session-engine.md` still speaks of the profile in several places (coding side); copy until
chunk 13. Proposed DRAFT → REVIEW: `module_settings_upgrade_step`, `entity_player_preset_record`
and 13 business rules built and tested in this wave.

### Owner answers and merge (2026-10-20)

The owner answered: merge `v3.1-w3` into `main` and push; fix ISS-014 before merging; all the
sync's sign-offs; give T1. ISS-014 fixed by a `coding-executor` (e4c6a9b: `controlValue` refuses
a non-string stored value, as chunk 16's `heldControl` does; four tests). `documentalist`
committed the owner sign-off (547c632): `module_settings_upgrade_step`,
`entity_player_preset_record` and 13 business rules DRAFT → REVIEW; STABLE
`module_kept_session_save` 1.1 (interface wording, the `presets` argument); the J3 reading of
`KeptSessionFacts.presets` confirmed. `spec-writer` (0dad768, plan v16): D382 (T1 given,
reversing D355; gate T1 done), D383 (ISS-014 resolved). Chunks 1, 13, 14, 17, 18 and 19 are no
longer blocked; wave 4 is planned. Left for `ux-writer` at wave 4: record the T1 allowance as a
ux decision and update `ui_ux/todo.md` (line 90); for `documentalist`'s next sync: ISS-014 no
longer stands against `rule_saved_settings_load_tolerantly`.

Gate re-run on 0dad768 (13:38 CEST, reference machine, load 0.91): `npm run quality` exit 0; unit
479 files, 7,390 tests; Playwright 488 + 488 (1 skipped each), 57, 107 (4 skipped). Entry chunk
246,866 B (49 JS chunks). The sweep was not re-run (the fix touches only the settings codec).
Wave 3 merged into `main` and pushed.

## Wave 4 (2026-10-20)

Chunks 1 (token-source pass, part 1, `ux-writer`) and 13 (the preset bar and the key and mode
marks), in the order 1 → 13. Branch `v3.1-w4`, worktree `../infinite_flow-v3.1-w4`, cut from
`main` a63590a (wave 3 merged and pushed). T1 given (D382). The owner said to go on with the
next wave in this session.

### Preflight

`documentalist` (e965269), without `atd audit`. Chunk 1: PROCEED (styling only; the frozen
token source already meets `rule_restriction_highlight_never_blocks` and
`rule_readonly_controls_keep_contrast`). Chunk 13: PROCEED, DRAFT → REVIEW proposals at the sync
only; captures `ui_segmented_control_marked_option` 0.1 and `module_preset_bar_model` 0.1. No
STABLE or contract atom in reach.

Sent to `spec-writer` before chunk 13: chunk 14 builds on the option model in wave 5; missing
Files (`use-shown-settings.ts`, three unit specs, thirteen e2e files); missing Atoms (six business,
five architecture); Revisions name `module_generative_profile_selection`; and an uncaptured
decision: where a session's marks get their frozen restriction from (proposed: the start
restriction on `SessionSettings`, never the shown key and mode).

### Chunks

- Chunk 1: dispatched 2026-10-20 to `ux-writer` (`../infinite_flow-v3.1-c1`), beside the plan
  revision (it touches no plan text chunk 1 reads); also records the T1 allowance on the ux side.
- Plan v17 (a3676aa, `spec-writer`): the five corrections applied; D384 settles the marks'
  session source (the session's start settings, never the shown ones; the controller exposes
  them); chunk 13 splits into 13a (the preset bar) and 13b (the marks). `documentalist`
  dispatched to capture D384 before chunk 13.
- Chunk 1: merged as d8698cb (f63b385, ux D325). Every handoff class and token exists;
  `test:notation` unchanged.
- D384 captured (add49d0): `module_key_and_mode_marks` 0.1 (new), `module_preset_bar_model` 0.2,
  `ui_segmented_control_marked_option` 0.2. Open for the owner at the report: B6.4 and
  `rule_restriction_highlight_never_blocks` say nothing of the marks during a session (only the
  design and D384 freeze them at Start); a business sentence would need the owner's sign-off.
- Chunk 13: dispatched 2026-10-20 (`../infinite_flow-v3.1-c13`, branch `v3.1-c13-preset-bar`),
  13a then 13b.
- Chunk 13: merged as 878fb9f (3b1283f 13a, 192e235 13b). Every Done-when item met; no deviation
  from the spec, the design or the intent. For the sync: `module_generative_profile_selection`'s
  revision and `startSettings` in `service_session_controller`'s readonly state; three links left
  out for the 10-atom cap (listed in the Record). Leftovers: `your-data-copy.ts:38` ("the musical
  profile", Your data sheet) and `docs/phrase-workspace.md` ~936 (stale-phrase labels). Gate next.

### Gate

- Run 1 (1613693, 15:21–15:27, load rising to 8): `quality` exit 1. Two harness-load timeouts
  (`session-locks.spec.ts:173`, `pregeneration.spec.ts:319`) passed on rerun; one deterministic
  failure, `controller-connection-layout.spec.ts:137` (landscape sheet `scrollTop` 0).
  `coding-executor` traced it to chunk 13a: with a `<select>` in the document, Chromium forces a
  layout as the focused Continue is removed, which drops the scroll the test was reading, left over
  from the previous state (Disconnect was already in view, so the test never scrolled). Fix 4ff267a
  (test only): reset the sheet, wheel-scroll it, poll `scrollTop > 0`. The app is unchanged.
- Run 2 (4ff267a, 15:43–15:50, start load 1.98), AMD Ryzen 5 PRO 8640HS: `quality` exit 0. Unit
  482 files, 7,450 tests; Playwright 516 + 516 (1 skipped each), a11y 59, notation 107 (4
  skipped). Entry chunk 250,721 B (wave 3: 246,866; budget 307,200). No sweep or measurement placed
  in this wave.

### Sync

`documentalist` 5bc6ca2 (no `atd audit`): `module_generative_profile_selection` 1.4 (chunk 13's
Revision), `service_session_controller` 0.6 (`startSettings`; "profile selection" → "preset
selection"), `module_preset_bar_model` 0.3, `ui_segmented_control_marked_option` 0.3; five links
placed; links left out for the 10-atom cap listed in the report. `atd:check` 19/19 OK. For the
owner: DRAFT → REVIEW for `rule_restriction_highlight_never_blocks`, `rule_custom_names_its_base`,
`ui_segmented_control_marked_option`, `module_preset_bar_model`, `module_key_and_mode_marks`; the
rewording of `rule_custom_names_its_base`'s last LOGIC sentence (present tense); the optional
sentence on the marks during a session (`rule_restriction_highlight_never_blocks` 0.2 and B6.4).
Leftovers: `your-data-copy.ts` `SETTINGS_LINE` is chunk 18's (D381); `docs/phrase-workspace.md`
~938 and `docs/session-engine.md` (profile wording) remain for a coding pass; the
`@lint-ignore-atd` on `segmented-control-option.ts` stays (the atom is linked through the control).

### Owner answers and merge

2026-10-20: merge and push; every sign-off given (spec D385, bbce423): the five atoms to REVIEW,
`rule_custom_names_its_base` 0.2 reworded, and the marks keep their Start state during a session as
a business rule (B6.4 v1.7; `rule_restriction_highlight_never_blocks` 0.2, two e2e links;
`documentalist` fc895ce). Wave 5 (14, 17, 18, 19) starts in a fresh session. Open for later: the
profile wording in `docs/session-engine.md` and `docs/phrase-workspace.md` ~938 (a coding pass);
`your-data-copy.ts` `SETTINGS_LINE` is chunk 18's. Wave 4 merged into `main`.
