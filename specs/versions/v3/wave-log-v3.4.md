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
- 2026-11-23: chunk 3 merged a7200fe5 (ff146150); no deviation. Schema draft 2020-12
  `urn:infinite-flow:lexicon-entry/v1`, nine fields required, none other; the browser-free check
  reads `src/lexicon/` through the TypeScript parser and also refuses `node:fs` and package imports.
  For the wave sync: `api_lexicon_read_contract` revision candidate (the document words the check
  more exactly). Figures: 1 agent, 40 tool calls, 3.5M tokens in / 35k out, max context 116k, $1.86
  at API prices. Chunk 2 resumed from e0ca927c (fresh owner).
- 2026-11-23: chunk 2 merged a1660fd9 (2a 57c05801, 2b 0e6f8878), resumed by a fresh owner from the
  WIP: the D496 heading, the D568 load watcher (only while a load runs: one set up at the start read
  `anySheetOpen` before the shell declared it), the Tab-from-a-scrolled-view test. Choice: a failed
  load after a sheet stopped the opening still shows the notice, the focus staying in the sheet.
  47 Playwright tests pass (default lane only). `lexicon-page-history.spec.ts` past the 400-line
  warning. Figures: 7 agents, 366 tool calls, 48.8M tokens in / 308k out, max context 314k (over
  300k: the first owner, which ran to its 100-call pause with the page, host, history and 44
  browser tests in one context), $21.76 at API prices. All chunks merged; wave gate next.
- 2026-11-23: wave gate green on a1660fd9+8dc07f95 (`npm run quality`, exit 0; the driver's machine,
  not the reference machine): unit 10,325 tests in 668 files; end-to-end 786 passed in each of the
  two lanes; accessibility 86; notation 121; `atd:lint`, `atd:check` pass (`atd check main...HEAD`:
  26 atoms, all with code and tests). No sweep (plan delta). M2: start-up JavaScript 392,293 B of
  409,600 B (+5,255 B since 387,038 B at `3.3.0`: the footer's button and the page's host), entry
  chunk 337,281 B (+5,255 B since 332,026 B). M1: the words' file 305,315 B (90,611 B gzip) of
  458,752 B, lexicon v1.9. No dependency change: no `security-advisor` check. Wave sync dispatched.
- 2026-11-23: wave sync 3772ae7a (`documentalist`): revisions applied, statuses unchanged:
  `module_session_starting_note` 0.7 (every sheet and the lexicon page), `rule_session_ends_on_portrait_view`
  0.2 ("the phrase workspace"), `module_lexicon_page_history_entry` 0.2 (as built, D567, D568),
  `api_lexicon_read_contract` 0.2 (as `docs/lexicon-api.md` words it). Links added above
  `reportSheetsOpen`, `lexiconPageImportPattern`, `chunkByteBudget`; the starts' three tags moved
  intact. Drift aligned: `module_jam_code_boundary`, `specification_browser_only_operation_verification`,
  `module_workspace_mode`. Not applied (not in the Revisions): `service_session_midi` interface wording
  (one flag for every sheet); `module_lexicon_single_source` interface gap (the ESLint rule, the
  exactly-one words' file check). `atd check main...HEAD`: 26 atoms OK; `atd:lint`, `lint:health`
  (0 errors), `lint:links` pass. `doc-ids compare main v3.4-w1`: 0 collisions.
- 2026-11-23: wave 1 gated; reported to the owner. Asked: merge `v3.4-w1` into `main` (and push)?
  the VISION v3.4 line (0.12 → 0.13); `rule_midi_starting_note` (STABLE, CONTRACT 19.0.0): name
  every sheet and the lexicon page among what blocks the note (MAJOR 20.0.0, or a clarification of
  shipped behaviour); the two non-STABLE wordings above; DRAFT → REVIEW for `req_lexicon_page`,
  `module_lexicon_single_source`, `api_lexicon_read_contract`, `module_lexicon_page_history_entry`.
  Open after the merge: H1 (the owner sees the page before the tag), R1 (structural review: its
  measurement pass runs now, spec D558). Branches kept until the merge: `v3.4-c1-lexicon-module`,
  `v3.4-c2-lexicon-page`, `v3.4-c3-lexicon-api`.

#### v3.4 wave 1

- Time: 2026-11-23 15:18 → 2026-11-23 17:09 (1h50)
- Agents: 16 · tool calls: 829 · model turns: 786
- Tokens in: 98.1M (fresh 2k, cache write 2.3M, cache read 95.7M) · out: 661k
- Max context: 314k (coding-leader: v3.4 w1 chunk 2 lexicon page)
- Cost: $44.39 at API list prices (checked 2026-11-12)
- Ends: at its last tagged agent (not merged yet)

#### By role

| role               | agents | calls | tokens in |  out |   cost | share | max ctx |
| ------------------ | -----: | ----: | --------: | ---: | -----: | ----: | ------: |
| coding-leader      |      4 |   330 |     47.6M | 307k | $20.64 |   47% |    314k |
| coding-executor    |      1 |   101 |     15.2M |  91k |  $6.12 |   14% |    263k |
| documentalist      |      2 |   112 |     11.3M |  77k |  $5.24 |   12% |    150k |
| ux-writer          |      2 |    86 |      8.1M |  66k |  $4.15 |    9% |    158k |
| spec-writer        |      3 |    97 |      6.1M |  45k |  $3.28 |    7% |    104k |
| driver (top level) |      1 |    52 |      7.0M |  42k |  $2.97 |    7% |    161k |
| ux-critic          |      3 |    51 |      2.6M |  33k |  $1.99 |    4% |     98k |

#### By chunk

| chunk          | agents | calls | tokens in |  out |   cost | share | max ctx |
| -------------- | -----: | ----: | --------: | ---: | -----: | ----: | ------: |
| 1              |      2 |   130 |     16.6M | 106k |  $6.79 |   15% |    222k |
| 2              |      7 |   366 |     48.8M | 308k | $21.76 |   49% |    314k |
| 3              |      1 |    40 |      3.5M |  35k |  $1.86 |    4% |    116k |
| outside chunks |        |       |           |      | $13.98 |   31% |         |

#### By activity (tool calls)

| activity    | calls | share | writes | results |
| ----------- | ----: | ----: | -----: | ------: |
| dispatch    |    14 |    2% |        |     14k |
| doc-get     |    19 |    2% |        |     77k |
| plan        |    43 |    5% |     14 |    172k |
| spec        |    61 |    7% |      1 |    228k |
| design      |    54 |    7% |      2 |    204k |
| intent      |    48 |    6% |      6 |    148k |
| other docs  |    73 |    9% |     16 |    254k |
| source      |   217 |   26% |     41 |    659k |
| checks      |   169 |   20% |        |    225k |
| git         |    75 |    9% |        |    146k |
| shell other |    30 |    4% |      3 |     97k |
| skills      |     9 |    1% |        |     299 |
| other files |     2 |    0% |        |     76k |
| other tools |    15 |    2% |        |     915 |

#### Largest contexts

| agent                             |                           task | calls | max ctx |  cost |
| --------------------------------- | -----------------------------: | ----: | ------: | ----: |
| ! coding-leader                   |   v3.4 w1 chunk 2 lexicon page |   101 |    314k | $9.95 |
| coding-executor                   |     E2E tests for lexicon page |   101 |    263k | $6.12 |
| coding-leader                     | v3.4 w1 chunk 1 lexicon module |   105 |    222k | $5.95 |
| driver (top level)                |        driver session e6a199d9 |    52 |    161k | $2.97 |
| ux-writer                         |     v3.4 w1 gate T0 token pass |    52 |    158k | $2.87 |
| (! = over 300k tokens of context) |

- 2026-11-23: the owner: "merge and push". `v3.4-w1` merged into `main` 977e795a and pushed; the
  wave's worktree and branches removed. The owner accepted the report's recommendations: the VISION
  v3.4 line; `rule_midi_starting_note` named every sheet and the lexicon page as a clarification of
  shipped behaviour (no MAJOR bump); the `service_session_midi` and `module_lexicon_single_source`
  wordings; DRAFT → REVIEW for the four lexicon atoms. Sent to `documentalist` on branch
  `v3.4-w1-rulings`.

## The structural review (gate R1)

- 2026-11-22: the read-only parts A to D (the import graph and seams, code health and friction,
  tooling and Tone.js research, the ATD cost of a move or split), on `main` 7af3628c (D: 1c4fc24f).
- 2026-11-23: the measurement pass (part E, spec D558) on `main` 2ea48d1c, after wave 1's merge,
  with the analysis tools in a throwaway worktree; nothing committed. All start-up JS is
  392,293 B of 409,600 (17,307 B left); the candidate rule set has 0 violations on the library and
  the encoders. Where E disagrees with A or B, E wins.
- 2026-11-23: the principal-advisor's ranking (part F): R1–R4 for v3.4 as two waves, R5 as a ruling,
  the rest deferred or dropped.
- 2026-11-23: `spec-writer` kept the evidence, parts A to F, in
  [structural-review-evidence/](structural-review-evidence/README.md), wrote the
  [report](structural-review-report.md), and logged the driver's rulings under the owner's
  delegation (spec D556): R1–R3 taken (D569); R4, a relaxed gate for test files (D570); the 400 KiB
  budget kept, an overrun taking a lever, never a raise (D571); the rest deferred or dropped, no
  analysis tool kept (D572); the split's form (D573); O315 closed (D574). Build plan v5 adds wave 2
  (chunks 4 and 5) and wave 3 (chunks 6 and 7), with gates P2 and P3. Branch `v3.4-review-report`,
  not merged.

## Wave 2

- 2026-11-23: the review's branch merged into `main` bce1fce3 (spec D569–D575, plan v5.1). Wave
  branch `v3.4-w2` cut from bce1fce3 in `/home/bastien/work/infinite_flow-v3.4-w2`. Chunks 4 and 5.
- 2026-11-23: preflight P2 (`documentalist`, 66f4dec5). Chunk 4: PROCEED, no governing entry
  (tooling, ATD-exempt). Chunk 5: PROCEED; governing `module_library_code_boundary` (captured, DRAFT,
  tagged `release-v3.4`; parents chosen by `documentalist`: `user_story_controlled_phrase_generation`,
  `req_rolling_practice_session`, `req_session_export`, `req_played_notes_export`; promotion is the
  owner's call), `module_jam_code_boundary` (REVIEW),
  `specification_browser_only_operation_verification` (STABLE); no STABLE wording changes. The atom
  ends on "sets no rule on the files outside the set that import the library", so P3 may extend it
  for session or add a sibling. Plan corrections to `spec-writer`: plan v5.2 6d48ba3b (wave 2 row's
  fast-gate leftover removed; chunk 5's Atoms line names the capture).
- 2026-11-23: chunk 4 dispatched (`coding-leader`, `/home/bastien/work/infinite_flow-v3.4-c4`,
  branch `v3.4-c4-test-atom-limit`).
- 2026-11-23: chunk 4 merged 9d823690 (0f40a81f): a test file above 10 atoms now warns; source
  files keep their error; `npm run lint:health` 0 errors, 979 warnings over 1,625 files. Beyond
  Files: two comments quoting §6. Figures: 1 agent, 20 tool calls, 1.3M tokens in / 11k out, max
  context 80k, $0.85. Chunk 5 dispatched (`coding-leader`, `/home/bastien/work/infinite_flow-v3.4-c5`,
  branch `v3.4-c5-library-line`).
- 2026-11-23: chunk 5 merged f7cc1e81 (ca37fd93): `verify:boundaries` checks 156 library files
  (TypeScript's parser, every specifier resolved; 0 violations); `tsconfig.domain.json` (no DOM)
  referenced from `tsconfig.json`, a planted `document` use failed it (TS2584, not committed);
  README's Directory Boundaries states the line, drift points 1–7 corrected. M3: +0.7 s (16.0 →
  16.7 s). New `lint:health` warnings: `verify-boundaries.mjs` 422 and its spec 451 effective
  lines, the spec at 7 atoms. Risks: a non-literal `import()`/`new URL()` is not checked (none in
  the library). Figures: 3 agents, 93 tool calls, 7.0M tokens in / 62k out, max context 136k, $3.87 at API prices. All chunks merged; wave gate next.
- 2026-11-23: wave 2 gate GREEN on 025e93b7 (`npm ci` + `npm run quality`, 20:36–20:47 CET, AMD
  Ryzen 5 PRO 8640HS, idle): unit 10,344 tests in 668 files; e2e 786 ×2 (1 skipped); a11y 86;
  notation 121 (4 skipped); `verify:boundaries` with the library check (156 files). Start-up
  392,293 B of 409,600 B in 18 chunks (Δ 0 against wave 1), entry 337,281 B (Δ 0). No dependency
  change. Default `atd check` printed "No atoms found for the specified scope" (ISS-020): the sync
  runs `atd check main...HEAD`.
- 2026-11-23: wave 2 sync 1c4dfc93 (`documentalist`): no drift; `module_library_code_boundary`'s
  interface now names the two limits (computed `import()`/`new URL()` paths unchecked; a bare
  folder import counts as inside). `atd check main...HEAD`: 14 atoms OK; `--full`: 15 NO_IMPL and
  1 NO_TESTS, the baseline. `doc-ids compare main v3.4-w2`: 0 collisions.
- 2026-11-23: wave 2 reported to the owner. Asked: merge and push. Driver's recommendations (D556):
  `module_library_code_boundary` stays DRAFT until the release sync, then REVIEW with the other
  v3.4 atoms; no ban on computed import paths (none exist, the check states the limit). Wave cost:
  8 agents, 227 tool calls, 20.1M tokens in / 150k out, max context 194k, $10.82 at API prices.

#### Wave 2 figures

### v3.4 wave 2

- Time: 2026-11-23 19:36 → 2026-11-23 20:49 (1h13)
- Agents: 8 · tool calls: 227 · model turns: 220
- Tokens in: 20.1M (fresh 464, cache write 686k, cache read 19.4M) · out: 150k
- Max context: 194k (driver (top level): driver session cefe6134)
- Cost: $10.82 at API list prices (checked 2026-11-12)
- Ends: at its last tagged agent (not merged yet)
- Not counted: other top-level sessions active in the window, with no agent of this wave: e6a199d9

### By role

| role               | agents | calls | tokens in | out |  cost | share | max ctx |
| ------------------ | -----: | ----: | --------: | --: | ----: | ----: | ------: |
| driver (top level) |      1 |    56 |      8.6M | 53k | $4.07 |   38% |    194k |
| coding-leader      |      2 |    66 |      5.9M | 40k | $2.91 |   27% |    136k |
| documentalist      |      2 |    52 |      3.0M | 23k | $1.82 |   17% |     88k |
| coding-executor    |      1 |    30 |      1.8M | 23k | $1.25 |   12% |     89k |
| codebase-explorer  |      1 |    17 |      545k | 10k | $0.56 |    5% |     52k |
| spec-writer        |      1 |     6 |      235k |  2k | $0.22 |    2% |     42k |

### By chunk

| chunk          | agents | calls | tokens in | out |  cost | share | max ctx |
| -------------- | -----: | ----: | --------: | --: | ----: | ----: | ------: |
| 4              |      1 |    20 |      1.3M | 11k | $0.85 |    8% |     80k |
| 5              |      3 |    93 |      7.0M | 62k | $3.87 |   36% |    136k |
| outside chunks |        |       |           |     | $6.11 |   56% |         |

### By activity (tool calls)

| activity    | calls | share | writes | results |
| ----------- | ----: | ----: | -----: | ------: |
| dispatch    |    11 |    5% |        |     11k |
| doc-get     |     3 |    1% |        |      7k |
| plan        |    16 |    7% |        |    112k |
| spec        |    13 |    6% |      2 |     56k |
| intent      |    13 |    6% |        |     43k |
| other docs  |    40 |   18% |     11 |    188k |
| source      |    39 |   17% |      6 |    129k |
| checks      |    43 |   19% |        |     59k |
| git         |    18 |    8% |        |     93k |
| shell other |    19 |    8% |      2 |     23k |
| skills      |     4 |    2% |        |     137 |
| other tools |     8 |    4% |        |     427 |

### Largest contexts

| agent              |                                      task | calls | max ctx |  cost |
| ------------------ | ----------------------------------------: | ----: | ------: | ----: |
| driver (top level) |                   driver session cefe6134 |    56 |    194k | $4.07 |
| coding-leader      |                       v3.4 wave 2 chunk 5 |    46 |    136k | $2.06 |
| coding-executor    | Library import check in verify-boundaries |    30 |     89k | $1.25 |
| documentalist      |                  v3.4 wave 2 preflight P2 |    30 |     88k | $1.12 |
| coding-leader      |                       v3.4 wave 2 chunk 4 |    20 |     80k | $0.85 |

- 2026-11-23: the owner: "ok resolve the points you've raised, merge push". Settled as recommended:
  `module_library_code_boundary` stays DRAFT and goes to REVIEW at the release sync with the other
  v3.4 atoms; no ban on computed import paths in the library (none exist; the atom states the
  limit). `v3.4-w2` merged into `main` and pushed. Next: wave 3 (P3, chunks 6 and 7), in a fresh
  session.

## Wave 3

- 2026-11-23: wave 2 merged into `main` 8250efe2 and pushed. Wave branch `v3.4-w3` cut from
  8250efe2 in `/home/bastien/work/infinite_flow-v3.4-w3`. Chunks 6 and 7.
- 2026-11-23: preflight P3 (`documentalist`, 47950fdf). Chunk 6: PROCEED WITH NOTES; governing
  `module_library_code_boundary` (DRAFT), `module_session_code_boundary` (captured at P3, DRAFT,
  tagged `release-v3.4`, parent `req_rolling_practice_session`: a sibling rather than an edit, since
  the library atom sets no rule on files outside the set), `req_rolling_practice_session`; drift
  check on `module_session_rolling_display`, `module_notation_layout_preflight`,
  `module_idle_window_width_density`, `module_session_seed_plan`. Note: cut 2 would hit its own stop
  condition, because the two planners throw `NotationError` (`src/notation/notation-error.ts`,
  outside the library set). Chunk 7: PROCEED WITH NOTES; governing `module_workspace_mode`,
  `module_jam_code_boundary`. Note: the shell links 10 distinct atoms, so taking out the Jam block
  leaves 9, and one more block must go to reach ≤ 8. `atd check --full`: 16 NO_IMPL (+1, the
  pre-code capture; back to 15 once 6b links it), 1 NO_TESTS.
- 2026-11-23: the driver's ruling under the owner's delegation (spec D556): `NotationError` moves
  into `src/domain/notation/` with cut 2, and `src/notation/` re-exports it (spec D576). P3's
  corrections and the ruling go to `spec-writer`: plan v5.3 0546c9a8, P3's status 86d60d82.
- 2026-11-23: chunk 6 dispatched (`coding-leader`, `/home/bastien/work/infinite_flow-v3.4-c6`,
  branch `v3.4-c6-session-one-way`).
- 2026-11-23: chunk 6 merged e104e7bd (6a 87b99789, 6b 7fe2b5ad): `verify:boundaries` checks 40
  session files (0 violations; the new scan found the 6 cut imports on the branch before the
  chunk); the layout names and two helpers in `src/domain/notation/staff-layout.ts`, `NotationError`
  in `src/domain/notation/` with the old path as a re-export (a spec case checks one class); the
  count-in end-to-end specs 24/24; `lint:health` 0 errors. Start-up 392,415 B (+122 against the wave
  2 gate; M2 at the gate). For the sync: `module_session_rolling_display`,
  `service_idle_generation_session`, `module_notation_layout_preflight` name moved paths. Left:
  three CSS comments name the old path of two constants (`theme.css`, `components.css`), sent to
  `ux-writer`. Figures: 1 agent, 82 tool calls, 11.4M tokens in / 50k out, max context 211k, $4.26
  at API prices. Chunk 7 dispatched (`coding-leader`, `/home/bastien/work/infinite_flow-v3.4-c7`,
  branch `v3.4-c7-jam-host-out`).
