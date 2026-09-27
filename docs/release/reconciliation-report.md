# Reconciliation Report

Compares delivered behaviour against
[`specs/first-release-master-spec.md`](../../specs/first-release-master-spec.md),
[`specs/roadmap.md`](../../specs/roadmap.md), and the `ui_ux/` set
([`README.md`](../../ui_ux/README.md), [`decisions.md`](../../ui_ux/decisions.md),
[`strategy.md`](../../ui_ux/strategy.md), and the `screens/phrase-workspace/` handoff docs). This
report does not change product intent; `specs/` and `ui_ux/` content is not edited by this task.
`specs/roadmap.md` was checked for a per-step delivery-status field to update with a plain status
fact (per the Step 10 plan clause allowing that one kind of edit) — it has none (only a document-level
"Status: draft v0.1" at the top, no per-stage delivered/not-delivered marker), and First Release is
not fully delivered yet (Step 10's e2e hardening, verification matrix, and release checklist are
still pending per this task's own scope note), so no edit was made.

## Master-spec amendments already made this step (user-approved)

Verified via `git diff main -- specs/ ui_ux/`; all reworded text is quoted from the current
(post-diff) files, and all five are already applied, not proposed:

1. **Custom preset radiogroup exception.** `specs/first-release-master-spec.md` (Application
   State, Accessibility, and Layout) now states the sanctioned exception: "The one exception is the
   musical-profile preset group in the custom state: after a manual edit to a preset-controlled
   field, neither Neutral nor Jazz is checked, the first option is the sole tab stop, and a status
   line names the retained grammar." This documents `ui_ux/decisions.md` D22, itself already
   validated by `ux-critic` per `ui_ux/todo.md`.
2. **Q6 rule (profile switch clears the phrase under an unsupported rhythm setting).**
   `specs/first-release-master-spec.md` (same section) adds: "The six note-density, silence, and
   syncopation settings that have no legal rhythm under the v1 rhythm grammar ... block generation
   with an explanatory status message. If an incompatible instrument-profile switch happens while
   one of them is selected, the switch still applies, the phrase is cleared to the empty workspace,
   and no generation runs." This matches `ui_ux/decisions.md` D27 and
   `docs/rule_unsupported_rhythm_settings_block_generation.atom.md`.
3. **Definition of Done bullet.** The corresponding DoD bullet in `specs/first-release-master-spec.md`
   now reads: "An incompatible instrument-profile switch is the sole automatic full-phrase
   regeneration; under a blocked rhythm setting it clears the phrase instead."
4. **`specs/generator-contract.md:39`.** Reworded from a Step-5-forward-looking statement to:
   "Musical annotations are not attached to the core concert timeline. The selected harmony
   candidate, rhythm candidate, and concrete tension binding travel beside the result as the
   successful generation outcome's `provenance` (`GenerationProvenance`), which result validation
   checks the timeline against." Verified against code: `GenerationProvenance` is defined and used
   in `src/domain/generation/orchestration/orchestration-types.ts`,
   `src/domain/validation/generation-result-validator.ts`,
   `src/domain/validation/generation-result-validator-checks.ts`,
   `src/generation-worker/generation-worker-protocol.ts`, and
   `src/domain/generation/orchestration/window-search.ts`.
5. **Generation retry uses a fresh seed (user decision, 2026-09-25; `ui_ux/qna.md` Q12, `ui_ux/decisions.md` D30).** The
   previous contract said "Retry generation repeats the exact failed intent". That made a
   deterministic failure (a no-legal-plan code or `search_limit_exceeded`) a dead end: retry could
   never succeed, and control edits did not clear the error. The user chose to change the intent.
   Retry after a failed generation now builds a new request from the current controls and profile
   with a fresh seed and identity, as Regenerate does. Amended: `specs/generator-contract.md`
   (session paragraph), `specs/generator-architecture.md` (session factory paragraph), and
   `specs/first-release-master-spec.md` (Application State, Accessibility, and Layout: "Retrying a
   failed generation builds a new request from the current controls and profile with a fresh seed,
   as Regenerate does; it does not replay the failed request."). The same section's sentence listing what creates a generation request now names "Generate, Regenerate, or Retry generation" (flagged by ux-critic as contradicting the retry sentence otherwise). Retry notation is unchanged: it
   still re-engraves the retained phrase without generating.

## Scope added to Step 10 by the user (not in `specs/first_release_plan.md`)

These items were requested by the user on 2026-09-25. They add to the Step 10 scope and change no
product behavior, so no spec text was amended for them:

- **Production container packaging.** A root `Dockerfile` (a Node 22 build stage runs the real
  `npm run build`; the runtime is an unprivileged nginx on port 8080), `docker/nginx.conf` and
  `docker/security-headers.conf` (PWA cache classes, CSP, Permissions-Policy denying the
  optional-scope capabilities), a hardened `compose.yaml` bound to loopback, and `.dockerignore`.
  The target is a later test deployment on the user's shared VPS behind an existing Caddy reverse
  proxy, which provides TLS and therefore the secure context the service worker needs. The Caddy
  configuration in `README.md` is illustrative and not yet applied.
- **Development container.** `.devcontainer/` (a dedicated Dockerfile with Node 22, Playwright
  Chromium, and developer CLIs; features for the Docker CLI, the GitHub CLI, and Claude Code). The
  `atd` CLI is excluded on purpose because it is not publicly released yet.

## Drift items found (need an owner decision)

Each item lists the current text, the observed behaviour, and a resolution. Items 2 and 3 were
factual wording corrections applied by the Step 10 coordinator. Item 1 is left unedited in `specs/`
and needs no action beyond the owner's Chromium-only decision.

### 1. `specs/first_release_plan.md` Step 10 Verify clause says "Playwright browser matrix"

- **File:line:** `specs/first_release_plan.md:147`
- **Current text:** "...formatting, lint, strict typecheck, unit/component/property tests,
  Playwright browser matrix, axe scans, visual baselines, production build, offline test, ATD
  lint/link/semantic coverage, and final acceptance against every master-spec definition-of-done
  item."
- **Observed behaviour:** `playwright.config.ts` defines exactly one project (`chromium`); the
  matrix has a single member. `README.md` already states this plainly (see
  [`browser-and-offline-limits.md`](browser-and-offline-limits.md)).
- **Suggested resolution:** Either accept "matrix" as still technically correct (a matrix of one),
  or have the release owner reword it to "Playwright Chromium suite" (or similar) to remove the
  implication of multiple engines. This is the one remaining piece of stated-but-superseded browser
  scope in `specs/`; the equivalent README text was already updated by the release owner (per the
  user decision recorded in this task) and is treated as resolved, not as drift.

### 2. `specs/generator-contract.md:54` still frames the annotations slot as waiting on "later steps"

- **File:line:** `specs/generator-contract.md:54`
- **Current text:** "`annotations`, where present, is `{ musical?: string; validation?: string }`
  — free-form strings. The controlled vocabularies for chord degree, tension role, phrase function,
  and profile-range source rule belong to later steps' harmony and profile work and are
  intentionally not invented here; the slot exists so those steps can attach annotations without a
  later shape change."
- **Observed behaviour:** Harmony (Step 5), instrument-profile/register (Step 3), and pitch/tension
  orchestration (Step 7) are all implemented, and the same document's own line 39 (already amended
  this step, see above) now states that harmony/rhythm/tension facts travel beside the result as
  `GenerationProvenance` rather than through this annotations slot. Grepping `src/` finds no
  producer that writes to `annotations.musical` or `annotations.validation`; the slot is reserved
  but genuinely unused, not "belonging to" still-pending work.
- **Resolution (applied):** Line 54 was reworded as a tense and fact correction with no change of
  intent. No producer writes the slot in the first release, provenance carries these facts, and the
  slot stays for a later release.

### 3. `specs/generator-contract.md:41` conditions range enforcement on Step 3 "once ... exist"

- **File:line:** `specs/generator-contract.md:41`
- **Current text:** "...hard range constraints are enforced once instrument-profile ranges exist
  (Step 3)."
- **Observed behaviour:** Step 3 (declarative instrument profiles and register policy) is
  implemented and referenced elsewhere in the same document as delivered (line 3's status banner:
  "Steps 2-9 are implemented"). Range enforcement is unconditional today.
- **Resolution (applied):** Reworded to the present tense: "result validation enforces the selected
  instrument profile's hard active concert range", which matches
  `src/domain/validation/generation-result-validator-checks.ts`.

### 4. `docs/release/browser-and-offline-limits.md`'s Chromium-only note vs. `specs/first_release_plan.md`

- **File:line:** `specs/first_release_plan.md:147` (same as item 1) and generally Step 1/Step 10's
  "Playwright browser matrix"/"browser suites" phrasing.
- **Status:** Recorded as resolved by the release owner. Chromium-only support is a decided product
  scope (see [`browser-and-offline-limits.md`](browser-and-offline-limits.md)); `README.md` already
  reflects it (`git diff main -- README.md` shows Chromium-only wording replacing the prior
  Chromium/Firefox/WebKit wording). The only text that still reads as broader-than-Chromium is the
  `specs/first_release_plan.md:147` "Playwright browser matrix" phrase in item 1, which is not
  edited here because `specs/` is out of scope for this task.

## Items checked and found already consistent (no drift)

- `ui_ux/README.md` (then `index.md`) already names `src/styles/theme.css`/`components.css` as the canonical
  production token/component source (Step 9's documented requirement), with `ui_ux/ui_common.css`
  correctly described as a frozen, non-buildable reference.
- `specs/roadmap.md` "Explicitly Unresolved Decisions" → "Rhythm settings with no legal phrase"
  lists exactly the same six settings as
  `src/domain/controls/unsupported-rhythm-settings.ts` and
  `docs/rule_unsupported_rhythm_settings_block_generation.atom.md`.
- `specs/roadmap.md` §1 ("First Release... MIDI is removed from that target and becomes the
  immediate next roadmap item") matches delivered scope: no MIDI code exists in `src/`, enforced by
  `scripts/verify-boundaries.mjs` and `eslint.config.js` (see
  [`browser-and-offline-limits.md`](browser-and-offline-limits.md)).
- `ui_ux/decisions.md` D22-D27 and the `screens/phrase-workspace/handoff.md` updates for the custom
  preset state, contour order, `character-static`, `control-summary`, and the D27 unsupported-rhythm
  profile-switch outcome were already independently re-validated by `ux-critic` against production
  code (`ui_ux/todo.md`: "Q5 closed... verdict ALIGNED, no doc or code drift found"), so this report
  does not re-litigate them.
- `specs/generator-architecture.md`'s "Delivered Outer Request Boundary" and "Delivered Phrase
  Workspace (Step 9)" sections describe the same session/worker/component wiring found in
  `src/components/workspace/create-workspace-session.ts`, `src/App.vue`, and
  `src/generation-worker/*`.
