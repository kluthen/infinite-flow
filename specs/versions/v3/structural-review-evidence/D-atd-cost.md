# v3.4 structural review: Part D, what moving code or splitting the repo costs the declared intent

> Kept copy. Written 2026-11-22, measured on `main` 1c4fc24f, read-only. Scratchpad paths inside are historical: the scratchpad is not kept.

`documentalist`, 2026-11-22, read-only, on `main` at 1c4fc24f (/home/bastien/work/infinite_flow).
Nothing in the repo was edited or committed, and `atd audit` was not run. Experiments ran in a
throwaway worktree (`scratchpad/atd-trial`, detached at main; node_modules was a symlink to the
main checkout's) and in a scratch two-project ATD workspace (`scratchpad/ws-trial`). Both have
been removed. The raw outputs are kept in `scratchpad/trial-out/` and the scripts in
`scratchpad/d-scripts/` (`paths.mjs` = path mentions in atom prose, `links.mjs` = which side of a
split each atom's links sit on, `spread.mjs` = distinct atoms per file).

Tool: `atd` revision b0c83e84 (`~/.local/bin/atd`). Source read: `/home/bastien/work/atd/atd`
(`pkg/coverage/coverage.go`, `pkg/exploration/explorer.go`, `cmd/atd/cmd/lint.go`,
`pkg/atom/selfsufficiency.go`, `pkg/workspace/*.go`, `cmd/atd/cmd/stats.go`), plus `ATD.md`.

Atoms: 499 (154 ARCHITECTURE, 345 BUSINESS). Statuses: STABLE 128, REVIEW 314, DRAFT 57. Links:
5,015 `@spec-link` and 8,097 `@test-link` occurrences under `src/` and `tests/`.

## 0. The short answer

- **Moving files breaks nothing that `atd` resolves.** Links name atom ids, not paths. `atd`
  walks the whole project root (honouring .gitignore) for links and for `*.atom.md` files. After
  three moves (one of them out of `src/` into `packages/music-core/src/`), `atd check --full`
  printed the same output as before, byte for byte.
- **What does break, breaks silently.** (a) The default diff mode of `atd check` does not see a
  pure move at all. (b) A link to an unknown id, or a project-qualified id with no workspace, is
  dropped without any message by both `lint` and `check`. (c) Path text in atom prose is never
  checked. (d) `atd check` exits 0 in every mode, NO_IMPL included. The one real guard on link
  integrity is the repo's own `lint:health` phantom-id rule, and it only scans `src/`, `tests/` and
  `scripts/`.
- **Rewording churn is all at the ARCHITECTURE layer.** 774 of the 776 path mentions sit in 124
  ARCHITECTURE atoms, 761 of them in TECHNICAL INTERFACE. One BUSINESS atom names a folder
  (`rule_ephemeral_session_state`, REVIEW, `src/storage/`). No STABLE+BUSINESS atom names a path,
  so no move hits the `atd update` guard. A handful of atoms state **folder boundaries**; those
  change meaning, not only wording.
- **Form matters far more than moves.** In one repository with one root `.atd` (folders, or npm
  workspaces), ATD costs only the path rewording. Separate repositories cost a re-cut of the
  record: under the core library line, 63 BUSINESS and 16 ARCHITECTURE atoms have code links on
  both sides, and 1,200 to 1,800 link occurrences would point across the boundary. `atd`'s
  workspace feature only works with all repositories checked out side by side. Checked out alone,
  each repository fails lint on its cross-repository links.

## 1. Trial: move files, run the tools

### 1.1 What was moved (trial copy only)

| move | links in file | atoms naming the old path |
|---|---|---|
| `src/domain/harmony/seventh-draw.ts` → `packages/music-core/src/harmony/seventh-draw.ts` (relative imports → `@/domain/…`; 1 src and 2 test importers repointed) | 12 `@spec-link`, 5 atoms | 0 by full path |
| `src/components/workspace/workspace-pregeneration-queue.ts` → `src/components/workspace/pregeneration/` (`./` → `../`; 3 importers) | 11, 6 atoms | 2 (`module_idle_pregeneration_queue`, `module_kept_doodle`) |
| `src/domain/rhythm/rhythm-change-draw.ts` → `packages/music-core/src/rhythm/`, **pure `git mv`, no edit** | 18, 6 atoms | 3 |
| `src/components/workspace/use-kept-sessions.ts` → `…/kept/`, **plain `mv`, not added to git** | 10, 5 atoms | 2 |

Imports were fixed only enough to be honest about it. Nothing was compiled, because the ATD
result doesn't depend on it.

### 1.2 Results

| command | result | broken or silent |
|---|---|---|
| `atd lint` (before and after every step) | "All atoms passed structural validation", exit 0 | silent: 5 atoms still name the old paths |
| `atd check --full` after the 3 moves | identical to the baseline (499 atoms, 484 with impl, 492 with tests; 15 NO_IMPL, 1 NO_TESTS, all pre-existing) | nothing broke: the links moved with the code |
| `atd check` (default diff) on a clean tree | "No atoms found for the specified scope.", exit 0 | ISS-020 reproduced |
| `atd check` after `git mv` + edits | 22 atoms, from the **edited** files only | the moved file shows up only because it was edited after staging |
| `atd check` after a **pure** `git mv` | the 6 atoms of `rhythm-change-draw.ts` absent | **silent**: a staged change is invisible |
| `atd check` after a plain `mv` | 0 of the 5 atoms of `use-kept-sessions.ts` | **silent**: the old path is "deleted", the new one untracked, so neither matches a link |
| `atd check HEAD` | same blindness to the untracked file | |
| `atd check -- --cached` | sees the staged rename (6 of 6 atoms) | works: the arguments are passed to `git diff` |
| `atd check --file <old path>` | "No atoms found", exit 0 | **silent** |
| `atd check --file <new path>` | 6 atoms | ok |
| typo in one link id (`…_nothin`) | lint passes; check only lowers that atom's impl count (2→1) | **silent**: the link is dropped in `extractLinks` (`explorer.go`, `found == false` → nothing recorded) |
| `[[music-core:rule_…]]` (project-qualified, no workspace) | same: dropped, count 2→1 | **silent** |
| removing an atom's only `@spec-link` (`rule_triad_fallback_per_phrase`) | `--full` row turns NO_IMPL, **exit 0**; lint passes (its "Missing Proof" rule applies only to IMPLEMENTATION-layer atoms) | visible only to a human reading 499 rows |
| `node scripts/code-health-check.mjs` (= `lint:health`) | default roots: 0 errors | **misses both phantom ids**, because `packages/` isn't in `DEFAULT_ROOTS` (`src`, `tests`, `scripts`) |
| `node scripts/code-health-check.mjs packages` | 2 ERRORs: `phantom atom id [[rule_seventh_chords_off_changes_nothin]]` and `[[music-core:rule_…]]` | catches them once told where to look |
| `atd trace rule_triad_fallback_per_phrase` | still prints `implementation_rate: 1` (it rates dependents) | silent at the atom level |
| `atd stats --src src` | `total_atoms: 0` | gotcha: `--src` becomes the explorer's **project root**, so docs are looked for under `src/docs/`. A `--src packages/lib` would do the same |
| `atd crawl --gaps` | `orphaned_stable_atoms: []` before and after | n/a |

### 1.3 ISS-020: why `atd:check` reports "No atoms found", and what it hides

- Cause (read in `pkg/coverage/coverage.go`, `diffChangedFiles`): plain `atd check` runs
  `git -C <root> diff --name-only` with **no revision**. That compares the **working tree with the
  index**, not with HEAD. On a committed tree the list is empty, so there are no atoms and the
  command exits 0. ISS-020's cause section is right about the effect, but "uncommitted changes
  against HEAD" is not quite it: staged changes are invisible too, which is why a pure `git mv` is
  missed. So are untracked files.
- The positional arguments go straight to `git diff` (`Args: MaximumNArgs(2)`): `atd check
  main...HEAD`, `atd check <base> <head>` and `atd check -- --cached` all work. Run on the last
  code merge on main, `atd check 65553a0a^1 65553a0a` reported 447 atoms (447 with impl, 446 with
  tests).
- What it hides: the per-atom coverage of the wave (atoms left with no impl or no test).
  **Link breakage in the sense of phantom ids is not hidden by ISS-020, because `atd check` never
  reports it in any mode.** It is caught today only by `lint:health` (`rules/atd.mjs`
  `phantom atom id`), which does run on committed trees. A lost last link shows up only as a
  NO_IMPL row, and only in `--full` or range mode, with exit 0. A gate therefore needs a wrapper
  that fails on new NO_IMPL/NO_TESTS against a baseline. Today's baseline: 15 NO_IMPL (BUSINESS
  atoms implemented through their descendants) and 1 NO_TESTS.
- For any move or split: (1) run `atd:check` against the merge base (`atd check main...HEAD`) or
  `--full`, plus a baseline diff; (2) widen `DEFAULT_ROOTS` to any new code root (`packages/`) in
  the same change, or the phantom-id guard goes blind there. Both are tooling, outside the atoms.

## 2. Atom prose naming paths: what goes stale, per candidate refactor

### 2.1 Inventory (`paths.mjs`, all 499 atoms)

- 776 path mentions (774 `src/`-prefixed) in **125 atoms**, 339 distinct paths. This is close to
  Part A's 786 / 124; the regexes differ slightly. **Every named file exists today**, so the prose
  is accurate now and any move makes it stale at once.
- By layer: **ARCHITECTURE 774 mentions in 124 atoms** (31 of them STABLE). **BUSINESS 2 mentions
  in 1 atom** (`rule_ephemeral_session_state`, REVIEW: "IndexedDB and `navigator.storage` are
  allowed only under `src/storage/`…").
- By type: MODULE 648 (92 atoms), ENTITY 68 (13), SERVICE 45 (13), UI 9 (3), MECHANIC 3 (2),
  SPECIFICATION 1, RULE 2.
- By section: TECHNICAL INTERFACE 761, THE RULE / LOGIC 9, EXPECTATION 6. Path churn is
  interface-section churn.
- 94 more bare file names (`x.ts`, `x.vue` with no folder) in 38 atoms. A move keeps them true, a
  rename doesn't.
- `atd lint`'s self-sufficiency check flags only document citations (`.md`, `.pdf`, … in
  `selfsufficiency.go` `docExtRe`), URLs and wiki links. **Source paths are never checked**, so
  stale path prose is invisible to every tool.

### 2.2 Per refactor

"Atoms" means atoms whose prose names a path the refactor moves. All edits go through
`atd update --interface "<whole section>"`, one call per atom: the section is rewritten whole,
and hand bulk edits are not allowed. STABLE ARCHITECTURE atoms pass the CLI's guard, but under my
rules even a path-only edit to a confirmed atom needs the invoker's go-ahead. One blanket ruling
under D556 would cover it, since it changes wording, not meaning.

| refactor | mentions | atoms | BUSINESS | STABLE | meaning changes (not just wording) |
|---|---|---|---|---|---|
| **Library extraction, core** (domain/ + generation-worker/ + export/midi, musicxml) | 193 | 59 | 0 | 20 | 33 of the 59 also name app paths, so they straddle the line (see §3.4) |
| **Library extraction, extended** (+ pure session/, jam/, notation/ subsets from Part A §3.3) | 273 | 73 | 0 | 21 | the folder-boundary atoms below |
| **components/workspace/ regrouping** into sub-folders | 193 | 48 | 0 | 17 | none: prefix only (`…/workspace/x` → `…/workspace/<cluster>/x`). Mechanical but the biggest single batch. `module_jam_code_boundary` names `load-jam-mode.ts` as the one allowed importer, so its path must follow |
| **storage settings-type cycle fix** (move `GeneratedNotesFormat`/`ThemePreference` down; mix validators out of audio/) | 11 | 10 | 0 | 5 | none. No atom names either type, so only the files named change (`setting-defaults.ts`, `settings-record.ts`, `review-types.ts`, `generation-session-types.ts`, `audio-mix.ts`) |
| **audio split for Tone.js** | 19 | 5 | 0 | 0 | the path churn is small. The real churn is v4's change of behaviour (Tone.js, roles), an intent change in its own right, not counted here. Only `module_guide_playback_layers` names Web Audio / `AudioContext` |
| **lazy migration codecs** (dynamic import of `storage/migrations/*`) | 20 | 8 | 0 | 6 (`module_on_device_database`, `module_kept_session_codec`, the upgrade-step modules) | none if behaviour-preserving. No atom says the migrations load eagerly, and none mentions lazy loading |

**Atoms whose claim is about a folder, so a move changes what they assert** (`src/<area>/` with
no file name):

- `module_jam_code_boundary` (MODULE, REVIEW; 12 folder mentions): "nothing outside `src/jam/`
  but the loader imports a `src/jam/` module statically". If Jam's 10 pure files go to the
  library, the boundary's subject changes. That is a decision for a leader or the owner, not a
  rewording.
- `module_on_device_database` (STABLE) and `module_kept_session_codec` (STABLE): "`src/session/`
  and `src/export/` stay storage-free". These hold if the folders keep their roles; they need
  restating if session/ is split between the library and the app.
- `rule_ephemeral_session_state` (BUSINESS, REVIEW): storage APIs confined to `src/storage/`.
  Wording only, but it is the one BUSINESS atom touched, so it needs owner-level sign-off if
  storage moves.
- `module_preset_model`, `module_figure_levels` (STABLE): purity claims over `src/domain/presets/`
  and `src/domain/figures/`. Their source-scanning tests hard-code the same paths (Part A §6).

Estimate: core library extraction ≈ 59 `atd update` calls, with 33 of them needing judgment on
where the atom now sits. Workspace regrouping ≈ 48 mechanical calls. The other three refactors
≈ 5–10 calls each. Plus 2–4 boundary atoms that need a ruling. Recommendation (mine, for the
report): before any big move, take the paths out of TECHNICAL INTERFACE (name the module and its
exports, not the file). That is one pass over 124 atoms, and later moves then cost nothing.

## 3. Can `atd` work across packages and across repositories?

### 3.1 What the tool actually does (source and trial)

- `.atd` here holds only `docs_path: "docs/"`, `supported_extensions` (`.mjs`, merged with the
  defaults: `.ts`/`.vue` links are found) and LLM settings. There are no source roots and no path
  globs.
- The explorer (`Load`) walks **the whole project root** (gitignore-aware), parses every
  `*.atom.md` it finds there, wherever it sits, and collects links from every supported file.
  That is why `packages/…` links resolved in the trial with no config change.
- `atd lint [dir]` globs `dir/*.atom.md`, **not recursively** (default `docs/`). It requires
  **exactly one CONTRACT and one VISION per linted set** that contains BUSINESS atoms (`lint.go`,
  "PROJECT GOVERNANCE").
- The repo's code-health reads atom ids from **top-level `docs/*.atom.md` only**
  (`sources.mjs:121`), and its phantom-id check compares raw ids, so `[[proj:id]]` counts as
  phantom.
- The **workspace feature** (`pkg/workspace`): a `.atd.workspace` JSON file, found by walking
  **upward** from the project, lists projects (`name`, `path` relative to the workspace root,
  optional `code_paths`). An optional shared `docs/` at the workspace root holds shared atoms.
  References may be `[[project:id]]` or `[[shared:id]]`. A bare id resolves against the current
  project first, then shared, then any other project, and is an error if ambiguous. The link regex
  accepts `:`, so `@spec-link [[lib:rule_x]]` parses.

Trial in a scratch workspace (`lib/` + `app/`, one `.atd` each; an app MODULE with parents
`[[req_…]]` and `[[lib:rule_seventh_chord_draws_reproducible]]`; app code with qualified, bare,
dangling and unknown-project links):

| check | result |
|---|---|
| `atd lint` in each project (workspace present) | the cross-project parent **resolves**. Each project fails "Missing CONTRACT / Missing VISION": one pair per project with BUSINESS atoms |
| `atd check --full` in lib | the lib atom shows 1 impl, 0 tests, NO_TESTS. **The app's 2 links and 1 test link to it are invisible** (each project counts only links under its own root) |
| `atd check --full` in app | the app's own atoms only; the links to lib atoms aren't reported anywhere |
| dangling `[[lib:rule_does_not_exist]]`, unknown project `[[game:rule_x]]` | dropped silently |
| `atd weave` run in app | **writes into lib's atom**: `dependents: [[app:module_seventh_chords_level_options]]`. The library's record ends up naming its consumers |
| `atd crawl --workspace` | each atom appears twice (`app:x` and `x`), with the links split between the two keys |
| `atd stats --workspace` | `total_atoms: 5` for 3 real atoms (double counting) |
| `atd trace lib:rule_…` from app / `trace rule_…` from lib | each sees only its own side's code and test links; `trace --workspace` is "Reserved … not yet wired" (`--help`) |
| **each project copied alone, no `.atd.workspace` above it** (a fresh clone, CI, a single worktree) | lib: `Unresolved dependent link: [[app:module_…]]`. app: `Unresolved parent link: [[lib:rule_…]]`. Both exit 1 |

### 3.2 What each form would need

**(a) One package, folders with enforced boundaries.** ATD needs nothing beyond the path
rewording of §2. One atom set, one CONTRACT, one VISION. Boundaries are enforced by ESLint or
dependency-cruiser, not `atd`.

**(b) npm workspaces in one repo, one root `.atd`, all atoms kept in root `docs/`.** This works
today unchanged: `atd` finds links in `packages/*/src` (trial). Needed: `DEFAULT_ROOTS` in
`scripts/code-health/config.mjs` extended to `packages`, `ATD_EXEMPT_PATHS` reviewed, and
`atd:check` given a base (§1.3). **Don't** move atoms into `packages/*/docs/`: `atd lint` would no
longer see them (non-recursive glob), code-health would call every link to them phantom, and each
linted set would demand its own CONTRACT/VISION. One record also keeps "no parent, no entry"
intact, because library ARCHITECTURE atoms keep their app BUSINESS parents. Tags or a `domain`
field can mark which package an atom belongs to. Cost: lowest. The library line is enforced in
code, not in the record.

**(c) Monorepo with an `atd` workspace (a `.atd` per package, `.atd.workspace` at the root).** It
works in one checkout, CI included, because everything is present. It costs a CONTRACT + VISION
per package with BUSINESS atoms. Coverage is split per package: no tool shows an atom's links from
all packages together. `crawl`/`stats --workspace` have the defects above, and code-health must
learn `proj:id`. It is a stepping stone to (d), not better than (b) on its own.

**(d) Separate repositories (owner's lean, D552/O314 c).** The `atd` workspace is not a real
cross-repository mechanism. It needs every repository checked out side by side under one parent
holding `.atd.workspace`, a file that belongs to no repository (or to a meta-repository). Without
it, every cross-repository parent, dependent or link fails lint or is dropped silently, and
`weave` writes consumers into the library's record. So each repository needs a **self-contained
record**:

- **Library repository:** its own VISION (scope: what the library offers its consumers: phrase
  generation under controls, profiles and presets as data, continuation, replay keys, encoders;
  neutral on scoring and on personas), its own CONTRACT (the public, versioned guarantees: same
  seed gives the same phrase, instrument range, leap recovery, replay-key format), its own
  BUSINESS layer phrased as library guarantees, ARCHITECTURE atoms for its modules, and **no
  parent outside the repository**. The library's CONTRACT would also tie to semver: a MAJOR
  contract bump means a MAJOR package version.
- **App repository** (and later the **game**): its own VISION and CONTRACT, product BUSINESS
  atoms, ARCHITECTURE atoms for app code. A library guarantee is read like a third-party
  dependency's contract: the app's atom states the behaviour it relies on, in its own words, with
  no ancestry link into the library and **no cross-repository `@spec-link`** (each repository tags
  its own code with its own atoms).
- **Under D557 (ids unchanged):** an atom that moves keeps its id in its new repository. The same
  id must not live in both, because bare ids become ambiguous if a workspace is ever used. Atoms
  whose code sits on both sides must be **split** (a library guarantee plus an app rule), which
  needs new ids for one half. That is a tension with D557 for those atoms only.

### 3.3 How big the re-cut is (`links.mjs`)

Each atom is classified by where its links sit: library files and their tests
(`tests/unit/domain/**` and so on) against everything else.

| | core library | extended library |
|---|---|---|
| BUSINESS atoms, `@spec-link` library-only / both sides / app-only / none | 57 / **63** / 211 / 14 | 89 / **96** / 146 / 14 |
| ARCHITECTURE atoms, library-only / both / app-only / none | 43 / **16** / 91 / 4 | 55 / **26** / 69 / 4 |
| BUSINESS parents of library-only ARCHITECTURE atoms | 62, of which 36 also serve app code | 84, of which 50 |
| parent edges crossing the line (of 971) | 131 | 172 |
| link occurrences crossing the line if "both" atoms stay with the app | 580 spec + 631 test (library code tagging app-homed atoms) + 47 test the other way | 816 + 812 + 174 |
| …if "both" atoms go to the library | 607 spec + 1,226 test (app code tagging library atoms) | 968 + 2,271 |
| CONTRACT surface (125 ids), library-only / both / app-only / none | 7 / 29 / 85 / 4 | 14 / 36 / 71 / 4 |

Reading: the generator's rules are recorded today as **this app's BUSINESS rules** (player-facing:
"every generated pitch falls inside the instrument's range"). A separate library makes them the
library's guarantees, and the app restates what it relies on. That means re-parenting up to 62–84
BUSINESS parents, splitting 79–122 two-sided atoms, and taking the CONTRACT apart: about 7–14 of
its entries move wholesale, 29–36 split, 85–71 stay. Order of magnitude: 150–250 atom edits plus
two new CONTRACT/VISION pairs, against about 60–75 path rewordings in form (a) or (b).

### 3.4 CONTRACT and VISION across library, app and game

- Today there is one CONTRACT (`contract_infinite_flow_first_release`, STABLE, version 19.0.0)
  and one VISION (`vision_infinite_flow_first_release`, STABLE, version 0.12), both product-wide.
  Lint enforces exactly one of each per atom set.
- In (a) or (b): unchanged. Library guarantees stay CONTRACT entries; their package location is
  invisible to the record.
- In (c) or (d): three pairs. The **library VISION** scopes capabilities, not players. The **app
  VISION** keeps today's text, which is about the app: "never penalizing, grading, ranking or
  scoring the player". The **game VISION** has its own personas (D551, O313), and the endgame's
  scoring of fights would sit outside the app's VISION, which is exactly why the game can't share
  it. The **library CONTRACT** takes the generation guarantees (`rule_seeded_phrase_reproduction`,
  `rule_leap_recovery`, `rule_open_phrase_ending`, `rule_join_carry_in_limited`, `module_preset_model`,
  `module_figure_levels`, `module_favored_figure_draw`; extended adds `module_settings_mutation`,
  `rule_instrument_profile_range` and others). The **app CONTRACT** keeps sessions, storage,
  controller, review, presets UI and so on. Removing guarantees from the app's CONTRACT is a MAJOR
  bump under its own EXPECTATION, so it needs the owner's or driver's ruling (D556). The game
  starts with its own record when it starts (D546: nothing planned for it now).

## 4. Does the ≤10-linked-atoms rule push code apart along good seams?

Distribution (`spread.mjs`, files under `src/` and `tests/` with at least one link, distinct atom
ids per file):
`1:284 2:249 3:183 4:151 5:131 6:86 7:79 8:53 9:49 10:80`, none above 10.

- **Files pile up at the cap.** 80 files sit at exactly 10 against 49 at 9 and 53 at 8, while
  every other step of the curve falls. Files aren't being split before the limit; they're pinned
  at it (45 in `src/`, 35 tests). §4 of the review counted 27 on 2026-10-21, so the pile-up is
  growing.
- **Where:** 38 of the 45 `src/` files are in `components/workspace/`. The rest: session/ 9,
  storage/ 7, composables/ 6, jam/ 4, domain/ 4, generation-worker/ 2, midi/ 2, and one each in
  review, controls and `storage-bootstrap.ts`. The library side has 6. **The limit puts its
  pressure on the wiring hubs** (`WorkspaceShell.vue`, `create-workspace-session.ts`,
  `workspace-session-controller-types.ts`, `session-types.ts`, `settings-record.ts`), whose job is
  to connect many features. Splitting them per atom doesn't advance the library seam.
- **Cohesion of the at-limit files** (clusters of related atoms among a file's 10; related means
  parent/child or a shared parent): 1 cluster: 9 files; 2: 6; 3: 18; 4: 21; 5: 14; 6 or more: 12.
  For about 70 of 80 the cap does flag a real mix of unrelated concerns, so it is a fair *signal*.
  For 9 (`session-engine.ts`, `session-types.ts`, `kept-session-summary.ts`, `settings-saver.ts`,
  `workspace-kept-session-edits.ts`, …) all 10 atoms belong to one feature, and a split there
  would be arbitrary. At-limit `src/` files have a median of 338 lines against 141 for all linked
  files: the cap mostly tracks size.
- **What the cap produced in practice** (wave logs):
  - Links dropped: v3.1 chunk 13, "three links left out for the 10-atom cap"; v3.1 sync, "links
    left out for the 10-atom cap".
  - Links displaced: v3.2, "Two atoms' tags were placed off the busiest files because of code
    health's 10-atom limit"; v3.3, `req_seventh_chords_level` "linked from tests only
    (`settings-record.ts`, `settings-saver.ts` at the 10-atom limit)".
  - A test misplaced: v3.2, an axe check put in `review-suggestion.spec.ts` "since
    `accessibility.spec.ts` is at 10 atoms".
  - Real splits: v3.1 gate, `WorkspaceShell.vue` at 12 → the four control-panel forwarders moved
    "word for word" into `use-control-panel-actions.ts`; v3.2 gate, a phrase-1 spec split by
    topic. The first is a reasonable seam, the second neutral.
  - So the commonest response is **giving up traceability** (a missing or moved tag) rather than
    restructuring. That is the cost to declared intent: a tag that can't be placed on the code
    that implements the atom is a claim the record doesn't make.
- **Why it can't track seams:** the count depends on how finely the business was cut (314 RULE
  atoms, one rule per atom), not on code structure. A finer atom split pushes files over the cap
  with no code change. Lifting the library doesn't change any file's count, because links move
  with their code. Only extracting pure functions out of a hub relieves it.
- Assessment (for `principal-advisor`): keep it as a warning signal (more than 5 already warns).
  For the error, either exempt composition roots and type hubs, or count distinct **business
  ancestors** (feature clusters) instead of distinct atoms, so that a cohesive file isn't forced
  apart and a mixed one still is. Whatever is chosen, a tag that hits the cap should be reported,
  not silently dropped or moved.

## 5. For the report: costs by form, ATD only

| form | ATD cost | risk |
|---|---|---|
| (a) one package, enforced folders | ≈60–75 path rewordings for the library line, +48 for the workspace regrouping, +2–4 boundary rulings | low; stale paths are silent unless a path-free interface pass is done first |
| (b) npm workspaces, one root `.atd`, atoms in root `docs/` | same as (a), + `DEFAULT_ROOTS`, + `atd:check` with a base | low; `atd` already works across packages |
| (c) monorepo with an `atd` workspace | (a) + 2 CONTRACT/VISION pairs + per-package coverage blind spots + code-health learning `proj:id` | medium; workspace commands have defects (double counts, `trace --workspace` unwired) |
| (d) separate repositories | a re-cut of the record: 79–122 two-sided atoms split, 62–84 BUSINESS parents re-rooted, CONTRACT split (MAJOR bump), 2–3 VISION/CONTRACT pairs; every library change means a preflight and sync in two repositories, with two commits | high; `atd` has no cross-repository mode that survives a lone checkout; tension with D557 for split atoms |

Not done here: no atoms were changed. Everything above is evidence and proposals for the report,
and none of it is applied.
