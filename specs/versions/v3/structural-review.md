# v3.4 — Structural Review

Status: v1.5, report written; rulings D569–D574 (2026-11-23: the
[report](structural-review-report.md) answers Q1–Q4; R1–R4 are taken as waves 2 and 3 of the
[v3.4 build plan](build-plan-v3.4.md), D569, D570; the 400 KiB budget is kept with no raise, D571;
the rest is deferred or dropped, D572; the split's form, D573; the lexicon API's home, D574).
Draft v1.4 (2026-11-22; scoping, D389; the lexicon page noted, D393; the owner's first
rulings, D545–D547; the tag, D550; the three-way split as the target, D551; the owner's v4.0
horizon, D552, and v4.0's scope, D553; v3.4's questions delegated to the wave driver, D556, and
its rulings on the refactors' bounds and the order, D557, D558; a backend some day, D561).
Settled: the milestone's existence and placement (D389), what v3.4 delivers (D545), that the
review looks at the code as it is and not at v4's scope (D546), that no runtime dependency is
added besides Tone.js (D547), that v3.4 is tagged `3.4.0` (D550), that the owner favours a
three-way split, which Q4 evaluates (D551), the bounds of a refactor (D557), and that the
measurement pass runs once the lexicon page is built (D558). No v3.4 question of the review is
open; O314 holds what the v4.0 horizon (D552) leaves open, O316 the backend. The read-only part of
the analysis (the code facts and the tooling research) started on 2026-11-22, with no tool
installed; this document frames the questions, and the report answers them.

Serves no persona goal directly: it adds no player-facing behaviour. It protects the delivery of
every later goal on the way to the [endgame](../../vision/endgame.md), without planning for any
one version's scope (D546). The first-load question also touches the shared
[context of use](../../personas.md#context-of-use): the occasional phone used outdoors, on a mobile
connection.

## 1. Why, in the owner's words

Recorded 2026-10-21 (D389): "objective there is to do an overall structural analysis of our app,
are we still sound for expansion? can/should we reduce our initial footprint (currently set to a
max of 300kb), do we have refactoring opportunities that are worth taking. starting v4 we truly
begin working on endgame and it's got a lot to do, we might even consider splitting the app in
multiple libs. this "milestone" is meant to have a clear view of our current setup."

**Goal:** a clear, evidenced view of the current code before v4's work starts, a short list of
ranked recommendations the owner can take, defer or drop, and the refactors he takes, built in
v3.4 (D545).

The owner's rulings of 2026-11-22, in his words:

- What v3.4 delivers (D545): "it's both the report and the corrective measures should they
  arise."
- Which v4 the review plans for (D546): "we wont work on reviewing V4.0 right now. we will focus
  on v3.4".
- How far a refactor may go (D547): "the only dependency we should plan for is tone.js otherwise
  we don't have need to add a new one."
- The endgame as the same app or a separate one (D551): "I'm in favor of a 3 way split, this app
  would remain neutral or student oriented. the lib itself, the game on the other side. The game
  and this app don't quite share the same personas."
- This app's horizon and the split's form (D552, a direction): "the last update for this app will
  most probably be v4.0 with basic accompaniments (if i remember well). We may need to create new
  repo to enforce this."

## 2. Where it sits

- **The last v3 milestone:** after v3.3, before v4, in the [v3 releases](README.md#releases-d211)
  (D389). The owner, asked whether it should run before v3.2 and v3.3 instead: "leave it for the
  last milestone of v3, there is no need to run it prior".

## 3. What it is not

- **No new player-facing behaviour.** Nothing a player sees or hears changes because of the
  review. v3.4's one player-facing item, the [lexicon page](lexicon-page.md) (D393, amending
  D389), is a separate small build; the review measures the app with it, its own size budget
  included (D549, D558).
- **Not a rewrite.** The analysis reads and measures; it changes no code. A refactor it
  recommends is built only once it is taken (by the wave driver under the owner's delegation,
  D556), as a chunk of the v3.4 build plan (D545).
  Behaviour-preserving only, guarded by the existing tests, atom IDs unchanged and their links
  moved with the code (D557).
- **No new runtime dependency** besides Tone.js (D547). Tone.js is v4's planned sound library
  ([v4](../v4/README.md)); the review may weigh where it would load and what it would cost the
  start-up budget, and plans nothing else for it. It does not bar the dev-only analysis tools of
  §7, which run in a throwaway worktree with nothing committed (D557).
- **Not a review of v4.** The review looks at the code as it is now: its soundness for expansion
  in general, the entry budget, the refactors worth taking and a split. It does not plan for v4's
  items or review v4's scope (D546).
- **Not a re-decision of settled product rules.** The master spec parts and the declared intent
  (`docs/*.atom.md`) stay the contract; the review looks at how the code carries them, not at what
  they say.

## 4. Starting facts (first blast-radius view, 2026-10-21)

Read on branch `v3.1-w5` at 8c407e7 (after v3.1 wave 5's gate). These are facts to start from, not
findings; the review re-measures them.

- **Size.** About 72,000 lines under `src/`. The largest areas: `components/` (~25,000 lines, of
  which `components/workspace/` ~17,200 in 109 files), `domain/` (~19,000, the pure generation
  logic), `session/` (~6,000), `storage/` (~5,500). Then `notation/`, `composables/`,
  `generation-worker/`, `styles/`, `export/`, `audio/` and `midi/`, each 1,500–3,000.
- **Packages.** One npm package; no workspaces. `tsconfig.json` references three projects (app,
  node, e2e); the only path alias is `@/*`.
- **Boundaries.** `scripts/verify-boundaries.mjs` (`npm run verify:boundaries`) guards browser
  APIs (storage, network, audio, MIDI, each allowed in its own folder only), the built output (no
  audio files, the service worker's precache) and chunk sizes. It defines **no import rules between
  modules**. The only import rules are two ESLint ones (`eslint.config.js`): `session/` and
  `export/` may not import `storage/`, and only four `notation/vexflow-*.ts` files may import
  VexFlow.
- **The entry chunk.** Budget `entryChunkByteBudget` = 300 KiB = 307,200 B (D359), measured on the
  minified file on disk (`dist/assets/index-*.js`), **not** the compressed size a browser
  downloads. Now 265,431 B, 41,769 B under budget. Its history through v3.1: 229,146 B at v3.0,
  then 230,609, 227,702, 246,844, 250,721 and 265,431 B (wave 5 added 14,710 B). Other budgets:
  the generation worker 150 KiB (now 131,789 B), the VexFlow engraver chunk 800 KiB (now
  733,117 B), any other chunk 100 KiB. The CSS (~44 KB) has no budget.
- **Lazy loading.** No `manualChunks`; chunks come from about 40 dynamic `import()` sites and two
  workers. Already lazy: the VexFlow engraver, the review, the connection sheet, the Your data
  sheet, the preset sheet, the my-instrument sheet, exports, the kept-session codec, and the
  session runner, controller, pre-generation and worker client. `WorkspaceShell.vue` imports the
  control panel, score panel and header directly, so they sit in the entry with Vue.
- **The subsystems the owner names.**
  - Generation worker: `src/generation-worker/` (13 files), reached through
    `generation-worker-client.ts`; it also holds the replay-key code.
  - Session engine: `src/session/session-engine.ts`, a pure state machine over 33 sibling modules,
    driven by `session-runner.ts` and wrapped in about 9 `components/workspace/workspace-session-*`
    files.
  - Storage and codecs: `src/storage/` (IndexedDB behind `storage-port.ts`), the codecs in
    `storage/records/`, and `src/storage-bootstrap.ts`, which loads saved data before the app
    mounts.
  - UI shell: `main.ts` → `App.vue` → `WorkspaceShell.vue` (554 lines, ~36 imports), which
    builds the session through `create-workspace-session.ts`.
- **Code health.** `npm run lint:health` (`scripts/code-health-check.mjs`, limits in
  `scripts/code-health/config.mjs`): files warn above 400 and fail above 600 effective lines;
  nesting fails above 4; a file warns above 5 distinct linked atoms and fails above 10. There is no
  function-length or complexity rule. On 2026-10-21: 0 errors and 746 warnings over 1,204 files
  (509 missing intent comments, 218 atom links, 19 sizes); `src/` alone has 159.
  - **27 files sit at exactly 10 atoms**, the failing edge, 17 of them in `components/workspace/`.
    v3.1's wave-5 gate failed once on this limit (`WorkspaceShell.vue` and `ControlPanel.spec.ts`)
    and was fixed by moving code out.
  - Largest file: `domain/pitch/pitch-candidates.ts`, 553 effective lines, 47 under the size
    error.
- **Duplication.** No duplication or dependency-graph tool is configured (no jscpd,
  dependency-cruiser, madge or knip).
- **Architecture records.** `README.md`'s "Directory Boundaries" and "Architecture Overview";
  `CODING_RULE.md`; [generator architecture](../../generator-architecture.md) (its status says it is
  partly pre-gate); [prerequisites](../prerequisites.md), the cross-version building blocks
  (multi-voice representation, generator versioning, the display-effect layer and others), still
  being drafted; 412 atoms in `docs/` (125 architecture, 287 business); the large subsystem docs
  in `docs/` (session engine, storage, notation, phrase workspace, generation latency, testing).

## 5. The questions it must answer

Each answer needs evidence: measured numbers, file paths, and what was checked. "It seems fine" is
not an answer.

### Q1. Is the architecture sound for expansion?

- What are the real module boundaries today, as the import graph shows them, and where do they
  differ from what `README.md` and the architecture atoms say?
- Should module boundaries be enforced by a tool (an import-rule map), as browser APIs already are
  by `verify:boundaries`? Which rules would it hold?
- For each named subsystem (the generation worker, the session engine, storage and codecs, the UI
  shell): what does it expose and depend on, and what in its current shape helps or blocks growth
  in general (new features beside the existing ones, more of them, more code)?
  - Out of scope since D546, kept as the record of what this question first asked: what v4 asks of
    each subsystem (several system voices with roles, a software sound library loaded on demand,
    a whole-file seed, rhythm ratios and the rhythm editor; see [v4](../v4/README.md)), and which
    v4 to plan for (O237, closed by D546).
- Is `components/workspace/` (109 files, most of the files at the atom limit) a seam that is about
  to give way, and what would a better split look like?
- Are the [prerequisites](../prerequisites.md) still the right list, and which are now urgent?
- Does the planned widening to Firefox and Safari (at v4 or v5, [roadmap](../../roadmap.md#engineering-carry-overs-not-tied-to-one-version))
  change anything structural?

### Q2. Should the entry budget be lowered, and how?

- What is in the 265 KB entry chunk today, by module and by dependency?
- What could move out of it by lazy loading, at what cost to the time before the app is usable and
  to the code?
- What did v3.2 and v3.3 add to it, and at what pace does it grow? (v3.1 grew it by about 36 KB.)
  What v4's items would add is out of scope (D546).
- Tone.js, the one dependency the owner plans for (D547): its weight, and where it would load
  (lazily, on first use of a sound, or in the start-up JavaScript), against the start-up budget.
- The measure is settled (D536): all JavaScript loaded at start-up, in minified bytes on disk,
  400 KiB. The review may also report the compressed download and the time until the app is
  usable on the reference phone, as information.
- Options with their costs (keep 400 KiB; lower it to a number the review proposes). The wave
  driver chooses, under the owner's delegation (D556).

### Q3. Which refactoring opportunities are worth taking?

- A ranked list, each with its benefit, its cost (size, risk, ATD link churn, test churn) and what
  it unblocks, within the bounds set: no new runtime dependency besides Tone.js (D547);
  behaviour-preserving, atom IDs unchanged (D557).
- **Which refactors v3.4 builds** (D557): no calendar budget. The v3.4 build plan takes only the
  refactors the report ranks as preparing the three-way split (D551) or v4's Tone.js seam
  (D553), or as clearing a friction that recurs at the gates; every other recommendation is
  deferred and listed in the report.
- Sources: the code-health backlog (`npm run lint:health`), the files at or near the size and atom
  limits, duplication (measured with a tool, not guessed), and the friction recorded in the v3 wave
  logs (gate failures, "beyond Files" changes, recurring sync notes).
- Are the code-health limits themselves right as the code grows (for example, does the 10-atom
  limit push code apart along good seams or arbitrary ones)?

### Q4. Should the app split into several libraries or packages?

- Candidate seams, for example: the music and generation core (`domain/`, the worker), notation
  (`notation/`, VexFlow), storage and codecs, audio and MIDI, the UI. Which are already clean
  enough to lift, and which would need work first?
- What form: folders with enforced boundaries in one package, npm workspaces in one repo, or
  separate repositories? What each costs in build (Vite, TypeScript project references), tests
  (Vitest, Playwright), ATD (atom links and paths, `atd` tooling, `.atd` config), the boundary
  checks, the release and the VPS deploy. The owner leans to separate repositories: "We may need
  to create new repo to enforce this" (D552; O314 (c)). The review weighs that form (a library
  repository, this app's, the game's) against one repository with enforced boundaries, and for
  separate repositories adds what only they cost: ATD across repositories, versioning and
  publishing the library, CI in each, the VPS deploy, and agents working across repositories.
- What a split buys: a second consumer of the library (the game, D551), faster builds and tests,
  clearer ownership for agents working on separate seams.
- **The owner's preferred target** (D551): a three-way split. (1) **A library**, the music and
  generation core; (2) **this app**, Infinite Flow, which stays neutral or student-oriented, with
  its current personas; (3) **the game** of the [endgame](../../vision/endgame.md), a separate
  app on the other side of the library, with its own personas. The review evaluates this shape;
  it does not re-open whether the game is a separate app. Its answer stays evidenced:
  - which seams are clean enough to become the library now, which need work first, and where
    the line between the library and this app falls (for example, whether notation, the session
    engine, audio and MIDI belong to the library, to the app, or to a third shared part);
  - what the split costs in build, tests, ATD, the boundary checks, the release and the VPS
    deploy, in each form (above), separate repositories weighed first as the owner's lean;
  - in what order to get there, and which steps, if any, are worth taking in v3.4 (D545) rather
    than when the game starts; the report may recommend none now.
  - The review plans nothing for the game itself (D546): it names only what the library must
    expose for a second consumer, as far as the endgame's
    [architectural implications](../../vision/endgame.md#architectural-implications-to-keep-in-mind-observations-not-decisions)
    already state it.
- **This app's horizon** (D552, a direction, not a ruling): the owner expects v4.0, with "basic
  accompaniments", to be this app's last update most probably; v4.0 is now Tone.js and
  accompaniment with roles (D553). What is left to settle, the items after v4 and the split's
  form, is O314; the review informs (c) and does not decide (a).
- **The lexicon API's home** (D555, D559): v3.4 builds the lexicon API as a plain TypeScript
  module over the page's parser ([lexicon page §9](lexicon-page.md#9-step-two-the-lexicon-api-d555)).
  Whether it belongs to the library or to this app follows this question's split recommendation
  (O315); the review says which, with its reason. Settled: this app (D574, closing O315).
- **A backend some day** (D561, a direction, not scheduled): the owner: "we will need to have a
  backend at some point anyway", and "currently, the backend is only for lexicon which doesn't
  contains any user information". The review notes which part of the split such a lexicon
  backend would sit beside and what the browser-only seams cost it (`verify:boundaries` forbids
  `fetch(` in `src/`), and recommends nothing for it now (O316).
- **The personas split** (D551, not revised now): the game and this app "don't quite share the
  same personas". What the personas and vision documents say today that the split makes out of
  date, for `spec-writer` to revise later (O313): [personas](../../personas.md) P1's "a player in
  the game-player sense", an attitude for now with game mechanics in the far future, and finding
  F3 ("game player" against no scoring); the [far vision](../../vision/far-vision.md)'s "'Game
  player' is an attitude first" and its endgame horizon; and the [endgame](../../vision/endgame.md),
  titled "Infinite Flow as a Rhythm RPG", which describes the game as this app dressed as a game,
  with Infinite Flow as its "music factory". The review's evaluation needs none of this revised
  first.

## 6. Deliverables

1. **A written report** with the evidence and ranked recommendations for Q1–Q4, written by
   `spec-writer` from the analysts' results into this folder (proposed:
   `structural-review-report.md`).
2. **The rulings** on each recommendation (take, defer, drop), the wave driver's under the
   owner's delegation (D556), logged as decisions.
3. **A v3.4 build plan of the refactors taken** (D545, within D557), written by `spec-writer` on the
   build-plan model, should any be taken; with none taken, the report and the rulings close the
   review.
4. **A release** (D550): v3.4 is tagged `3.4.0`.

**Definition of done (proposed):** every question in §5 has an evidenced answer in the report
(Q4 for the three-way split, D551); every recommendation carries a cost, a benefit and a risk; the
driver has ruled on each one (D556); the refactors taken are built (D545), the build plan approved
separately (proposed).

## 7. Who does what (proposed)

- **`codebase-explorer`**, read-only: the facts. The import graph and where it breaks the
  documented boundaries; what each subsystem exposes and depends on; the workspace folder's
  structure; duplication hot spots; the friction found in the v3 wave logs.
- **`web-researcher`**, read-only: tooling. Bundle analysis for Vite, import-rule tools
  (dependency-cruiser, ESLint boundaries plugins), duplication tools (jscpd), and package splitting
  (npm workspaces, TypeScript project references, Vite library mode, Vitest and Playwright across
  packages); Tone.js's size and how it can be loaded (D547). No personal data in any request.
- **A measurement pass**: what is in the entry chunk needs a build with a bundle analyser. That is
  a run, not a read: a `coding-executor` in a throwaway worktree, with nothing committed (D557),
  once the lexicon page is built so the page is measured with the app (D558). The analysis tools
  it installs there (bundle analyser, dependency-cruiser or similar, jscpd, knip) are not
  dependencies the app adds (D557). Keeping one in the repository, such as an import-rule checker,
  is decided with that recommendation in the report (D557).
- **`documentalist`**: what a split or a move costs the atoms and their links, and whether
  `atd` works across packages.
- **`principal-advisor`**: weighs the facts, the measurements and the research, and ranks the
  recommendations for Q1–Q4.
- **`spec-writer`**: writes the report, takes it to the wave driver (D556), logs the rulings and
  writes the build plan.
- **The owner**: answered O234 and O237 and part of O238 on 2026-11-22 (D545–D547), then O312
  (D550) and O236 (D551); then left the resolution of v3.4 to the wave driver: "you're free to
  handle the resolution of v3.4, i'll bow to your suggestions" (D556). The driver ruled O238 (D557)
  and O245 (D558) and rules on each of the report's recommendations under D556; the owner keeps
  the tag's go, the pushes he asks for and the VPS deploys.

## 8. Open

None of the review's own questions is open ([register](../../open-questions.md#v34-structural-review-o234)).
Bearing on Q4, after v3.4 or alongside it: the personas and vision revision the three-way split
calls for is O313; what the owner's v4.0 horizon leaves to settle is O314; the backend is O316.
The lexicon API's home was O315, closed by D574.
