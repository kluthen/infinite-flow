# v3.4 — Structural Review

Status: draft v1.1 (2026-10-21; scoping only, D389; the lexicon page noted, D393). Nothing here is decided beyond the milestone's
existence and its placement. The analysis itself has not started; this draft frames the
questions it must answer and does not answer them.

Serves no persona goal directly: it adds no player-facing behaviour. It protects the delivery of
every later goal, starting with v4's several system voices, the first step toward the
[endgame](../../vision/endgame.md). The first-load question also touches the shared
[context of use](../../personas.md#context-of-use): the occasional phone used outdoors, on a mobile
connection.

## 1. Why, in the owner's words

Recorded 2026-10-21 (D389): "objective there is to do an overall structural analysis of our app,
are we still sound for expansion? can/should we reduce our initial footprint (currently set to a
max of 300kb), do we have refactoring opportunities that are worth taking. starting v4 we truly
begin working on endgame and it's got a lot to do, we might even consider splitting the app in
multiple libs. this "milestone" is meant to have a clear view of our current setup."

**Goal:** a clear, evidenced view of the current code before v4's work starts, and a short list of
ranked recommendations the owner can take, defer or drop.

## 2. Where it sits

- **The last v3 milestone:** after v3.3, before v4, in the [v3 releases](README.md#releases-d211)
  (D389). The owner, asked whether it should run before v3.2 and v3.3 instead: "leave it for the
  last milestone of v3, there is no need to run it prior".

## 3. What it is not

- **No new player-facing behaviour.** Nothing a player sees or hears changes because of the
  review. v3.4's one player-facing item, the [lexicon page](lexicon-page.md) (D393, amending
  D389), is a separate small build; the review measures the app with it, its own size budget
  included (O242, O245).
- **Not a rewrite.** The analysis reads and measures; it changes no code. Any refactor it
  recommends is built later, only once the owner chooses it, as ordinary build-plan chunks.
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
  shell): what does v4 ask of it (several system voices with roles, a software sound library loaded
  on demand, a whole-file seed, rhythm ratios and the rhythm editor; see [v4](../v4/README.md)),
  and what in its current shape helps or blocks that? Which v4 to plan for is O237.
- Is `components/workspace/` (109 files, most of the files at the atom limit) a seam that is about
  to give way, and what would a better split look like?
- Are the [prerequisites](../prerequisites.md) still the right list, and which are now urgent?
- Does the planned widening to Firefox and Safari (at v4 or v5, [roadmap](../../roadmap.md#engineering-carry-overs-not-tied-to-one-version))
  change anything structural?

### Q2. Should the entry budget be lowered, and how?

- What is in the 265 KB entry chunk today, by module and by dependency?
- What could move out of it by lazy loading, at what cost to the time before the app is usable and
  to the code?
- What do v3.2, v3.3 and v4 add to it if nothing changes? (v3.1 grew it by about 36 KB.)
- Is the minified size the right thing to measure, or the compressed download, or the time until
  the app is usable on the reference phone?
- Options with their costs (keep 300 KiB; lower it to a number the review proposes; budget by
  another measure). The owner chooses (O235).

### Q3. Which refactoring opportunities are worth taking?

- A ranked list, each with its benefit, its cost (size, risk, ATD link churn, test churn) and what
  it unblocks, within the bounds the owner sets (O238).
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
  checks, the release and the VPS deploy.
- What a split buys: who would consume a library besides this app (the endgame's game?), faster
  builds and tests, clearer ownership for agents working on separate seams.
- The answer depends on the owner's intent for the endgame (O236).

## 6. Deliverables

1. **A written report** with the evidence and ranked recommendations for Q1–Q4, written by
   `spec-writer` from the analysts' results into this folder (proposed:
   `structural-review-report.md`).
2. **The owner's rulings** on each recommendation (take, defer, drop), logged as decisions.
3. **Possibly a v3.4 build plan** of the refactors taken, on the build-plan model, if the owner
   wants them built before v4 (O234).

**Definition of done (proposed):** every question in §5 has an evidenced answer in the report;
every recommendation carries a cost, a benefit and a risk; the owner has ruled on each one; any
build plan that follows is a separate approval.

## 7. Who does what (proposed)

- **`codebase-explorer`**, read-only: the facts. The import graph and where it breaks the
  documented boundaries; what each subsystem exposes and depends on; the workspace folder's
  structure; duplication hot spots; the friction found in the v3 wave logs.
- **`web-researcher`**, read-only: tooling. Bundle analysis for Vite, import-rule tools
  (dependency-cruiser, ESLint boundaries plugins), duplication tools (jscpd), and package splitting
  (npm workspaces, TypeScript project references, Vite library mode, Vitest and Playwright across
  packages). No personal data in any request.
- **A measurement pass**: what is in the entry chunk needs a build with a bundle analyser. That is
  a run, not a read: a `coding-executor` in a throwaway worktree, with nothing committed (proposed).
- **`documentalist`**: what a split or a move costs the atoms and their links, and whether
  `atd` works across packages.
- **`principal-advisor`**: weighs the facts, the measurements and the research, and ranks the
  recommendations for Q1–Q4.
- **`spec-writer`**: writes the report, takes it to the owner, logs the rulings and, if asked,
  writes the build plan.
- **The owner**: answers O234–O238 first, then rules on each recommendation.

## 8. Open

O234–O238, in the [register](../../open-questions.md#v34-structural-review-o234).
