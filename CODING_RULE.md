# Coding Standard

**Scope:** any project, any language, any layer. These rules govern *how code is written and
changed*. What the product must do, and why, lives in the project's declared intent (§1), never in
this file and never in code comments.

> **Precedence.** This file is the canonical source for the principles below. A project document
> may set local mechanics (commands, paths, thresholds, tool names) and wins on those only, never on
> the principle itself.

The seven non-negotiables. Each is **MUST/NEVER**, not a preference.

## 1. Declared intent adherence

A project declares its intent in one of two backends, named in its `CLAUDE.md` / `AGENTS.md`:
**ATD** (atoms in `docs/*.atom.md`, code links `@spec-link` / `@test-link`) or the **intent
register** (entries in `intent/*.md`, code links `@intent <id>`). A project with neither skips this
section until one is started.

- **No business behaviour change without its governing intent.** Before altering business
  behaviour, the atom or entry that governs it must exist and be settled. Leaders gate every change
  through `documentalist` (skill `intent-gating-protocol`).
- **One Contract and one Vision per project**, settled *before* any business intent of that project
  changes. If two things need separate contracts, they are two projects.
- Every source file that carries business behaviour carries ≥1 intent link, atop the exact
  function/type — never on package/file headers. Test files use test links only (`@test-link` in
  ATD). No phantom links.
- **Declared intent is for business behaviour only.** Tooling, scripts, debug, logging,
  diagnostics, app bootstrap and test plumbing (fixtures, harnesses, shared helpers) stand outside
  it: they get no intent and need no links. They still follow every other rule in this file.
- **The link is the only place code carries intent.** A comment never restates the purpose or the
  rule of the intent it links (see §6).
- **Module boundaries the project declares are enforced by a check** (an import-boundary lint or
  equivalent), not by convention.

## 2. Observability and determinism

- **Every new service is born instrumented** with the project's tracing standard (OpenTelemetry
  unless the project says otherwise): inbound requests, data stores and outbound calls. Retrofitting
  is expensive; do not defer it to "later", and do not add to existing debt — instrument what you
  touch.
- **Correlation survives every hop.** Propagate the trace context (W3C `traceparent`) and the
  request id across each service or message boundary.
- **Core logic takes time and randomness as injected sources**, fakeable in tests; only boundary
  code reads the real clock or random generator. Behaviour that must be reproducible (seeded
  generation, replays) is reproducible from its inputs alone.
- **Scheduled work goes through the project's durable mechanism**, never an ad-hoc timer, ticker
  or background loop, so it survives restarts and can be tested.

## 3. Crash early, fail fast

- **Defaulting hides critical errors.** No silent failures, no catch-all default values in core
  logic to "keep things running." A clear rejection or exception beats undefined behaviour.
- Validate inputs at the boundary and reject the invalid loudly. Where garbage input can only mean a
  caller bug, let it surface rather than papering over it.
- Errors are values to handle or propagate, never to swallow. No empty `catch`, no discarded error.

## 4. Strict contract adherence — no defaulting to save the day

- **Honor the API/interface contract exactly.** Do not invent fallbacks, coerce types, or fill
  missing fields to make a call "work." If the contract is violated, fail per the contract. Parity
  work reproduces the documented behaviour, quirks included, rather than "improving" it silently.
- **Never change a public contract** (an API, a wire or storage format, a serialization envelope)
  without the user's explicit approval, and update its documentation and governing intent in the
  same change.
- Cross-module and cross-service references go **through the owning module's interface** — never a
  reach across a seam (another module's internals, another domain's tables) to shortcut a contract.
- **Boundary types are concrete.** Inputs and outputs that cross a module or service boundary never
  use an escape type (`any`, `interface{}`, untyped maps); every field has a type describing its
  structure.

## 5. Test-first when fixing bugs

- **Reproduce the error as a test before fixing it.** On any new bug, first write a test at the
  nearest concerned module that fails *because of* the bug. Only then make it pass. The test is the
  proof the bug existed and the guard that it stays dead.
- Tests exercise production code — **no test-only branches in production files** (rare
  observability exceptions only). Only external engines and services are doubled.
- Prefer targeted runs (one spec, one suite) over the full sweep while iterating; the full suite
  runs before the change is called done.

## 6. Code health — zero-error standard

Enforced by the project's health checker; treat its errors as blocking. The thresholds below are the
defaults; a project changes them only in its checker's configuration, with the reason written there.

- **File size:** warn >400 effective LOC, error >600. Split along domain seams before trimming.
- **Nesting depth:** ≤4 levels; refactor beyond.
- **Doc comments:** every function has a doc comment; a missing one on an exported function is an
  error. The comment says what the function does for whoever calls or changes it: what it takes,
  what it returns, its side effects, what it assumes and how it fails. Start with that description
  itself — no label such as `Intent:`, `Purpose:` or `Summary:`. Match the surrounding file's
  comment density and idiom.
- **Comments never restate declared intent.** The business purpose and rules live in the linked
  atom or entry; a comment that copies them drifts unnoticed, because intent syncs compare the
  record with the code, never with its comments. Write what the code does and how; let the link
  carry why.
- **Intent link density:** ≥1 link per business file; repeated links to the same id count once. A
  source file links ≤10 distinct atoms or entries (warn >5 distinct). A test file warns above 5
  distinct and never errors, so a broad spec links every atom it covers. Files outside intent scope
  (§1) are exempt.
  Bypass tokens are for genuine exceptions (third-party or generated code), never for silencing your
  own.

## 7. Change discipline

- **Docs move with code.** Any change to an API path, payload or behaviour updates its API
  documentation and the governing intent in the same change. Observability and contract docs
  likewise.
- **Documentation is self-sufficient — no external references.** No doc (in-code comment, README,
  API doc, intent record, architecture doc) may point a reader at issues, failure reports, tickets,
  PRs, chat threads, or other out-of-band material to understand it. A doc must stand on its own for
  whoever reads it next, without chasing a link that may be stale, private, or gone. The only
  exception is a **hard link between parts of the same split document** (an index linking to its
  subject files, a subject file linking back to its index) — never a link out to a different kind
  of artifact.
- Commit/push only when asked; branch off the default branch first. Build outputs and binaries are
  never committed.
- **New features and major updates start in a new git worktree**, not the checked-out working copy,
  so in-progress work stays isolated from whatever else is live in the primary checkout. Small fixes
  and targeted bug patches don't need one — use judgment on "major."
- Report outcomes faithfully — if a test fails or a step was skipped, say so with the evidence.

---

*When in doubt: crash loud, honor the contract, write the test first, keep the trace flowing, and
anchor behaviour in declared intent — never in a comment. If a rule seems to force worse code, raise
it with the user — do not quietly route around it.*
