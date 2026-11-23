# Infinite Flow v3.4 — Wave log

The execution record of the [v3.4 build plan](build-plan-v3.4.md), kept by the wave driver: what
each wave preflight found, each gate's results and figures, what was moved and why, and each
report to the owner. Rulings live in [`decisions.md`](../../decisions.md); the plan holds only the
current state.

## Before wave 1

- 2026-11-22: gate A0 cleared: the wave driver approved [master spec Part E](master-spec.md#part-e--v34)
  v1.0 and the plan's wave 1 under the owner's delegation (spec D556; D564, D565).
- 2026-11-22: gate G0 cleared: `spec-writer` read the lexicon page's code facts again on `main`
  828ab396 ([§E13](master-spec.md#e13-existing-code-and-risks)). New since the draft: the 400 KiB
  start-up budget (spec D536; 387,038 B at `3.3.0`), and `WorkspaceShell.vue` at 595 of 600
  effective lines.
- 2026-11-22: gate L0 cleared: the lexicon pass (spec D560), lexicon v1.9, 32868c5d and a follow-up
  commit on branch `v3.4-lexicon-pass`: 334 entries, 11 Internal, 323 shown. To merge into `main`
  before `v3.4-w1` is cut, or into the wave branch before chunk 2's branch.
- Open before wave 1 starts: I0 (Part E's ingestion) and P1 (the wave preflight and its three
  captures); T0 (the token-source pass) before chunk 2. No data preflight: the repo has no data
  register.

## Wave 1

- 2026-11-23: wave branch `v3.4-w1` cut from `main` a9f93c96 in
  `/home/bastien/work/infinite_flow-v3.4-w1`.
- 2026-11-23: gate I0 done (667164f6): `req_lexicon_page` DRAFT, tagged `release-v3.4`, parent
  `user_story_controlled_phrase_generation` (confirmed by `spec-writer`); `changes-in-v3.4` on
  `module_session_starting_note` and `rule_session_ends_on_portrait_view`.
- 2026-11-23: gate P1 done (be24541d). Verdicts: chunks 1, 2 and 3 proceed with notes; no halt; no
  STABLE wording changes, no contract sign-off. Captures (ARCHITECTURE, DRAFT):
  `module_lexicon_single_source` (1), `api_lexicon_read_contract` (1, checked by 3),
  `module_lexicon_page_history_entry` (2). Wording checks: `req_landscape_phrase_workspace` and
  first-release master spec lines 19 and 140 fine; lines 122 and 158 amended (D562).
- 2026-11-23: preflight corrections sent to `spec-writer`: plan v2 (7293457e). Applied: capture IDs
  and drift checks in the Atoms lines (chunk 1: `module_jam_code_boundary`,
  `specification_browser_only_operation_verification`; chunk 2: `module_jam_code_boundary`,
  `module_workspace_mode`, `rule_failed_save_never_disturbs_session`, `rule_midi_starting_note`,
  `rule_first_phrase_waits_for_saved_settings`, `service_session_midi`); chunk 2's Revisions widened
  (`module_session_starting_note` names every sheet; `rule_session_ends_on_portrait_view` "the phrase
  workspace"); moved blocks keep their tags. Rejected: `src/App.vue` in chunk 2's Files (`main.ts`
  mounts only after the saved data is read).
- For the owner (not blocking): the VISION v3.4 line (0.12 → 0.13), proposed by `documentalist`,
  applied at the release sync after sign-off. For the wave sync: `rule_midi_starting_note` (STABLE)
  does not name My instrument, Your data, the preset sheet or the lexicon page among the sheets that
  block the note; the gap predates v3.4; raise it as a contract question.
- 2026-11-23: T0 running (`ux-writer`, branch `v3.4-t0`, merged here before chunk 2). Chunk 1
  dispatched.
- 2026-11-23: gate T0 done: 86a57594 on `v3.4-t0`, merged into `v3.4-w1` 05556e43. The page's
  `lexicon-*` classes plus `lexicon-letters-button` and `footer-actions` (ux D492, D493); the two
  §E11 flow points (ux D494); `ux-critic` DRIFT, three findings fixed (ux D495), including a new
  rule: a `#lexicon` arriving while a sheet is open opens nothing, only the address is replaced.
  Sent to `spec-writer`: write D495's rule into §E8 (accepted by the driver under D556) and carry
  T0's chunk 2 notes into chunk 2 (the `footer-actions` wrapper, `lexicon-letters-button`,
  `--lexicon-bar-block-size` kept current on `lexicon-view`, `lexicon-view` outside `.layout-app`).
- 2026-11-23: plan v3 and Part E v1.1 (8708e7b6, spec D567): §E8's open-sheet rule; chunk 2 carries
  T0's notes (`footer-actions`, `lexicon-letters-button`, `--lexicon-bar-block-size`, the open-sheet
  e2e case). For the wave gate: `master-spec.md` already failed `prettier --check` before this
  commit (Part A's wide tables); check whether `npm run format:check` covers it.
- 2026-11-23: chunk 1 merged 688a86d3 (1a b7bc417a, 1b 7cdca3a6); no deviation. M1: the words' file
  `lexicon-words-*.js` 305,315 B (90,261 B gzip) of 458,752 B, lexicon v1.9; start-up JavaScript
  387,039 B of 409,600 B. Figures: 2 agents, 130 tool calls, 16.6M tokens in / 106k out, max
  context 222k, $6.79 at API prices. For the wave gate: `atd check` on the chunk's diff; re-measure
  M1; `verify-boundaries.spec.ts` now links 6 atoms (health-lint warning). For chunk 3: its
  browser-free check meets `src/lexicon/lexicon-words.d.ts` (type declaration of
  `virtual:lexicon-words` only). Chunk 2 dispatched (T0 done; order 1, 2, 3).
- 2026-11-23: chunk 2 stopped before merge on a design gap: axe `heading-order` fails in the
  searching state (Light and Dark): the lexicon page handoff (Layout Tree, Searching) puts the
  matches' `h4.lexicon-word` right after `h2#lexicon-title`. Branch `v3.4-c2-lexicon-page`: 2a
  4f9d074e, WIP 2b e0ca927c; worktree `/home/bastien/work/infinite_flow-v3.4-c2` kept. Everything
  else built: 42 of 44 browser tests pass (the 2 failures are this gap); `WorkspaceShell.vue` 596
  effective lines (the starts moved to `workspace-starts.ts`, tags with them); start-up JavaScript
  392,213 B (not gating). Sent: the heading to `ux-writer`; the chunk owner's two spec-silent
  choices to `spec-writer` (the stale-phrase prompt blocks `#lexicon` as a sheet; a sheet opened
  during the page's load stops the opening). Chunk 3 goes ahead.
- 2026-11-23: plan v4 and Part E v1.2 (be7925c4, spec D568, driver under D556): the stale-phrase
  prompt counts as a sheet for the `#lexicon` rules; a sheet opened during the page's load stops the
  opening even if it closes before the load ends. Chunk 2's WIP checks only at the load's end: its
  resume adds a watcher on the open sheet (as on `sessionActive`). `ux-writer` asked to mirror D568
  in the look up a word flow with the heading fix. Chunk 3 dispatched (branch
  `v3.4-c3-lexicon-api`).
- 2026-11-23: design gap settled: 1771e6a0 on `v3.4-t1`, merged 1663d739. ux D496: a visually
  hidden `h3.lexicon-matches-heading` "Matching words" heads a `section` round the matches while
  searching (absent when nothing matches); ux D497: D568 mirrored in the look up a word flow;
  `ux-critic` ALIGNED. Chunk 2 unblocked; it resumes after chunk 3 (κ = 1).
