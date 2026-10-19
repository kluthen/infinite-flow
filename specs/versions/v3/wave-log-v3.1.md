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
