# Phrase Workspace

This document records how the Step 9 browser workspace turns one root-composed session into the
responsive, accessible screen a player generates and reads a four-measure phrase from: the
component tree and its props/events contracts, how the session is wired together at the
application root, the state-to-UI map, the generation Worker protocol, the seed-independent
canonical rhythm-domain memo, the unsupported-rhythm-settings block, accessibility behavior, and
the styling source of truth.

## Component tree

```
App.vue
  WorkspaceShell.vue
    WorkspaceHeader.vue
      ThemeControl.vue
      SegmentedControl.vue        (notation-mode)
      <button class="btn-primary">  (primary action)
    ScorePanel.vue
      PhraseScore.vue
    ControlPanel.vue
      FoundationControls.vue
      RhythmControls.vue
      MelodicShapeControls.vue
      CharacterControls.vue
    OrientationNotice.vue
```

| Component                  | Responsibility                                                                                                                                                                                                                           | Props in / events out                                                                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `App.vue`                  | Builds the one production `WorkspaceSession` for the tab's lifetime via `createWorkspaceSession`, applies the theme preference as a DOM side effect, and disposes the worker on unmount.                                                 | No props/events; it is the composition root.                                                                                                     |
| `WorkspaceShell.vue`       | Lays out header, score panel, control panel, and the portrait guard around one already-constructed session; forwards `ControlPanel`'s typed events onto the session's own actions.                                                       | In: `session`, `pendingPhrase`, `handleEngraved`, `handleNotationError`. Out: none (it calls session actions directly).                          |
| `WorkspaceHeader.vue`      | Brand mark, meter/tempo/notation-mode context, the theme override, and the single primary action (`Generate phrase` / `Regenerate phrase` / `Retry generation` / `Retry notation`), including that label's priority and disabled policy. | In: `session`. Out: none (drives `session.actions` directly).                                                                                    |
| `ThemeControl.vue`         | The header's System/Light/Dark segmented control.                                                                                                                                                                                        | In: `theme`. Out: `select` (a `ThemePreference`).                                                                                                |
| `ScorePanel.vue`           | The score toolbar (title, the `generation-status` live region, and a generation-failure banner) plus the staff viewport: empty, loading, ready, or a notation-error panel layered over the still-mounted `PhraseScore`.                  | In: `session`, `pendingPhrase`, `handleEngraved`, `handleNotationError`. Out: none (mounts `PhraseScore` and wires its events straight through). |
| `ControlPanel.vue`         | The full below-score control sheet: Foundation, Rhythm, Melodic shape, and Character groups, each delegated to its own group component. Owns no control state; forwards every group's typed event upward unchanged.                      | In: `controls`, `profileSelection`, `readonly`. Out: `set-control`, `select-instrument-profile`, `select-musical-profile`.                       |
| `FoundationControls.vue`   | Tempo, tonal center, collection, instrument profile (with its range summary), musical-profile preset (with its status region), harmonic motion, and tension.                                                                             | In: `controls`, `profileSelection`, `readonly`. Out: `set-control`, `select-instrument-profile`, `select-musical-profile`.                       |
| `RhythmControls.vue`       | Note density, syncopation, silence density, plus the unsupported-rhythm-setting notice and its live region.                                                                                                                              | In: `controls`, `readonly`. Out: `set-control`.                                                                                                  |
| `MelodicShapeControls.vue` | Contour, register, leapiness.                                                                                                                                                                                                            | In: `controls`, `readonly`. Out: `set-control`.                                                                                                  |
| `CharacterControls.vue`    | Arpeggio chaos, behind the `character-disclosure` wrapper.                                                                                                                                                                               | In: `controls`, `readonly`. Out: `set-control`.                                                                                                  |
| `SegmentedControl.vue`     | Generic presentational single-select radiogroup with roving tabindex; carries no domain or session knowledge.                                                                                                                            | In: `label`, `options`, `modelValue`, `readonly`. Out: `update:modelValue`.                                                                      |
| `TempoStepper.vue`         | Generic presentational spinbutton stepper over a fixed ordered catalog.                                                                                                                                                                  | In: `modelValue`, `values`, `readonly`. Out: `update:modelValue`.                                                                                |
| `OrientationNotice.vue`    | Static portrait-rotate copy; entirely CSS-driven (see Accessibility below), so it carries no responsive logic itself.                                                                                                                    | No props/events.                                                                                                                                 |

Every control-group component is props-in/events-out only: it re-validates whatever it emits
against its own domain catalog (`validateControlValue`) before the event leaves, and it never
imports the session. `control-options.ts` builds every `SegmentedControl`'s option list directly
from the domain catalogs in `generation-controls.ts`, so a catalog change needs no parallel edit
there. `set-control-event.ts` defines the one shared `SetControlPayload` union (a mapped type over
every settable control key except `instrumentProfileId`, which has its own dedicated
`select-instrument-profile` event).

## Session wiring

`src/components/workspace/create-workspace-session.ts` builds the root-created
`WorkspaceSession` that `App.vue` owns for the tab's lifetime:

- **Providers.** `nextRequestId` is a monotonically increasing per-session counter
  (`workspace-request-<n>`); `nextSeed` draws a fresh 32-bit unsigned seed from
  `crypto.getRandomValues`. Both are injected into `createGenerationSession` as
  `GenerationIntentProviders`, so no domain code ever reaches for browser randomness itself.
- **Generate.** One long-lived `createBrowserGenerationWorker()` port is wrapped by
  `createGenerationWorkerClient`, and `createWorkspaceGenerate` adapts its `generate` seam: a
  successful `GenerationOutcome` becomes the session's `WorkspaceSessionResult` (the outcome plus
  the intent that produced it); a `generation_failure` outcome is thrown as a typed
  `GenerationFailedError` carrying the orchestration failure code, never defaulted to an empty or
  partial result.
- **Notate.** `createNotationCoordinator` implements the session's `notate(result, mode)` seam by
  driving one `PhraseScore` instance: it computes the `WrittenPhrase` and publishes it as
  `pendingPhrase` for `PhraseScore` to render, then settles the returned promise from that same
  instance's next `engraved`/`notation-error` event. When `PhraseScore` fires those events without
  a pending request behind them (a viewport resize, a breakpoint crossing), the coordinator routes
  them through `reportNotationFailure`/`reportNotationRecovered` instead of settling a promise
  nothing is waiting on.
- **Profile switch.** `evaluateWorkspaceProfileSwitch` adapts the domain `evaluateProfileSwitch`
  policy to the session's typed `retain`/`regenerate` decision, reading the unchanged concert
  timeline, the current register selection, the existing seed, and the newly resolved instrument
  profile off the prior result and the caller's next controls.
- **Dispose.** `WorkspaceSession.dispose()` terminates the worker client (`client.dispose()`).
  `App.vue` calls it from `onUnmounted`.

`create-workspace-session.ts` is isolated in its own module — rather than inlined in `App.vue` —
so a test can replace the whole factory and never spin a real `Worker` in jsdom.

## State map

`createGenerationSession` (`src/composables/use-generation-session.ts`) owns one
`shallowReactive` state object with these fields, each driving specific UI:

| State field                                                         | UI it drives                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `operation` (`'idle' \| 'generating' \| 'notating'`)                | Every configuration control (all four `ControlPanel` groups, and the header's notation-mode segmented control) is read-only-but-focusable whenever `operation !== 'idle'` (`WorkspaceShell`'s `controlsReadonly`, `WorkspaceHeader`'s `operationRunning`). The primary action is disabled while an operation runs. `ScorePanel`'s `staff-loading` frame class and the `generation-status` live region text ("Generating phrase") only apply while `operation === 'generating'`.                                                                                                           |
| `notationError` / `generationError` / `result`                      | Together they decide the primary action's label, in this priority: **Retry notation** (a `notationError` is set) > **Retry generation** (a `generationError` is set, no `notationError`) > **Regenerate** (`result` is set, no error) > **Generate** (nothing yet). `WorkspaceHeader`'s `primaryActionKind` computed implements exactly this order.                                                                                                                                                                                                                                       |
| `controls` (rhythm subset)                                          | `isUnsupportedRhythmSetting(state.controls)` blocks every primary action **except** Retry notation: retrying the engraving of an already-generated phrase replays that phrase's own stored request, so it never depends on the current rhythm-control combination the way starting a new generation does. `WorkspaceHeader`'s `blockedByUnsupportedRhythm` computed encodes this exemption explicitly.                                                                                                                                                                                    |
| `result` across a generation failure or an unsupported-rhythm block | The previously generated result is retained: `generate`/`regenerate` never clear `state.result` on a rejected attempt, and the unsupported-rhythm block never calls `run` at all, so `ScorePanel` keeps showing the last successful phrase underneath the failure banner.                                                                                                                                                                                                                                                                                                                 |
| `notationError` (in-operation)                                      | `ScorePanel` shows an inline alert ("Notation error: …") layered over the still-mounted `PhraseScore`, and the header exposes Retry notation. `retryNotation()` replays the retained `failedNotationMode` against the retained `result` without touching generation providers.                                                                                                                                                                                                                                                                                                            |
| `notationError`/`notationError` recovery (out-of-operation)         | A `PhraseScore` redraw that fires outside any session operation (a resize, a breakpoint crossing) reports through `reportNotationFailure`/`reportNotationRecovered` instead of settling a promise — this is how a later successful redraw clears a stale notation error without a new `notate()` call.                                                                                                                                                                                                                                                                                    |
| `profileSelection` switch outcomes                                  | `selectInstrumentProfile` resolves to `'retained'` (prior phrase kept, redrawn at its current notation mode — no new generation), `'regenerated'` (a full generation ran with a fresh seed and succeeded), `'regeneration_failed'` (that generation failed; the prior result is preserved exactly as any other generation failure does), or `'regeneration_blocked'` (the switch would land on an unsupported rhythm setting, so generation never starts and the prior result stays). `'applied'`/`'unchanged'`/`'rejected'` cover the no-prior-result, same-id, and mid-operation cases. |
| `presentation.theme`                                                | In-memory only: `setTheme` never touches `result`, `latestIntent`, or any generation/notation field, and `applyThemePreference` is a pure DOM side effect (`data-theme` on `document.documentElement`) that never regenerates or redraws the phrase.                                                                                                                                                                                                                                                                                                                                      |

Every `set-control`/`select-musical-profile`/`select-instrument-profile` request is rejected
(returns `false`/`'rejected'`) whenever `state.operation !== 'idle'`, which is what makes the
control groups' read-only visual state match the session's actual acceptance behavior rather than
being a purely cosmetic lock.

## Generation Worker protocol

`src/generation-worker/` implements one typed, correlated request/response protocol between the
session and one long-lived `Worker`:

- **Message types.** `GenerationWorkerRequest` is `{ type: 'generate', id, intent }`.
  `GenerationWorkerResponse` is a closed union of `{ type: 'outcome', id, outcome }` and
  `{ type: 'crash', id, name, message }`.
- **Id correlation.** `generation-worker-client.ts` assigns a monotonically increasing integer
  `id` per `generate()` call and keeps a `Map<number, PendingRequest>`; an incoming response
  resolves or rejects exactly the pending request with the matching `id`, and an unmatched id is
  a thrown `GenerationWorkerProtocolError`.
- **Boundary re-validation and deep-freeze.** `structuredClone` (the `postMessage` transport)
  strips branding and freezing but preserves plain-object/array shape. `generation-worker-protocol.ts`
  re-validates every field crossing the wire in both directions through the same domain
  constructors/parsers the orchestrator itself uses wherever one exists (`makeRequestId`,
  `makeSeed`, `makeGenerationControls`, `parseGenerationRequest`, `parseConcertEventTimeline`), and
  reconstructs the `GenerationIntent` via `makeGenerationIntent` before asserting the rebuilt value
  deep-equals the received record field-for-field. `GenerationProvenance` and
  `GenerationDiagnostics` have no existing boundary parser (nothing upstream ever accepted them as
  untrusted input before this worker boundary existed), so they get a minimal structural check
  instead. A parsed outcome is deep-frozen before being returned to the session.
- **`kind` tags cross the wire unchanged.** `makeGenerationRequest` nests `ActiveConcertRange`
  and `RegisterWindow` values that carry their runtime `kind` discriminant, and
  `parseGenerationRequest` accepts that tag when it equals the expected literal (and rejects any
  other value), so a retained `GenerationOutcome.request` is re-parsed exactly as the domain built
  it, with no protocol-side stripping.
- **Crash vs. transport errors.** A `crash` response (the worker's `generatePhrase` call, or its
  own request parsing, threw) rejects that one pending request with a typed
  `GenerationWorkerCrashError` carrying the original error's name/message; the worker itself stays
  usable for the next request. A port-level `error`/`messageerror` event is different in kind: once
  raised, the worker is considered unusable for the rest of the session — every still-pending
  request is rejected with a `GenerationWorkerTransportError`, and every subsequent `generate()`
  call rejects immediately with the same error, without posting to the port.
- **One long-lived worker.** `createBrowserGenerationWorker()` creates exactly one module
  `Worker` per session, reused across every generation and regeneration, because the worker's
  rhythm-domain memo (below) only pays off when the same worker instance handles every request.
  `generation.worker.ts` keeps that memo alive in module scope for the worker's whole lifetime by
  registering exactly one `message` listener that delegates to the pure
  `handleGenerationWorkerMessage` handler (itself never touching `self`/`postMessage` directly, so
  it can be exercised in a plain Vitest environment) and posts back its response.

## Canonical rhythm-domain memo

`src/domain/generation/orchestration/canonical-rhythm-domain.ts` memoizes the seed-independent
canonical rhythm domain `makeRhythmCandidateDomain` expands, so a repeated generation or
regeneration against an already-seen rhythm setting skips the expensive Step 6 enumeration.

- **Key.** The memo key is built from the grammar version plus the four rhythm-relevant fields of
  the _normalized_ input: note density, silence density, syncopation, and tension arc (all taken
  from `intent.controls`, normalized by `normalizeRhythmExpansionInput`).
- **What's stored.** A miss materializes a fresh `RhythmCandidateDomain`'s lazy iterator exactly
  once, in its canonical iterator order, and stores either the complete, deep-frozen candidate
  list (`{ kind: 'canonical_rhythm_domain', grammarVersion, input, candidates }`) or the typed
  `NoLegalRhythmPlan` result, memoized as-is. A hit returns the exact same frozen instance without
  touching the grammar again.
- **Per-seed ranking.** The memo never ranks anything — ranking is seed-dependent and stays outside
  it. `generation-orchestrator.ts` looks the domain up via `buildRhythmDomain`, then calls
  `rankMaterializedRhythmCandidates(domain.grammarVersion, domain.candidates, intent.seed)`
  (`candidate-ranking.ts`) fresh for every call, over the already-materialized candidate list, so a
  memo hit still produces a correct seed-specific search order without re-expanding the grammar.
- **Lifetime and bound.** `SHARED_CANONICAL_RHYTHM_DOMAIN_MEMO` is the module-level instance
  `generatePhrase` defaults to (`options.rhythmDomainMemo` can override it, which the perf harness
  and golden tests use to get a fresh, empty memo per measurement). It lives for the worker's whole
  lifetime — the worker module never reconstructs it — and needs no eviction policy: the finite v1
  control catalog carries only `4 (note density) × 3 (silence density) × 3 (syncopation) × 4
(tension arc) = 144` distinct rhythm settings per grammar version, so the keyspace the memo can
  ever be asked to fill is bounded.
- **Byte-identical proof.** `tests/unit/domain/generation/orchestration/generation-outcome-golden.spec.ts`
  replays a golden fixture of 8 intents — `GENERATION_OUTCOME_GOLDEN_V2`, recorded from the
  pre-memo baseline orchestrator and re-recorded (v1 → v2) for the signed-off tension-binding
  correction, which changed exactly two of the eight hashes — against the current orchestrator and asserts
  `fnv1a32(JSON.stringify(outcome))` matches exactly in three ways: a cold call on a fresh, empty
  memo; a warm call (second `generatePhrase` call for the same intent on the same memo instance,
  i.e. a memo hit); and, for every success case, that a warm-memo call with a _different_ seed
  produces the exact same hash and deep-equal outcome as a fresh-memo cold call for that same
  seed. Together these prove the memo changes only what work is repeated, never what
  `generatePhrase` returns.
- **Memo is independent of enumeration speed.** The memo caches the _result_ of
  `makeRhythmCandidateDomain`; Step 9 itself did not touch the Step 6 enumeration. The later
  enumeration speed package (see
  [rhythm-phrase-structure.md](music/rhythm-phrase-structure.md) and
  [generation-latency.md](generation-latency.md)) makes that first materialization faster with
  byte-identical output, so the memo and the golden fixture are unaffected by it.

## Unsupported rhythm settings

`src/domain/controls/unsupported-rhythm-settings.ts` names the six note-density + silence-density

- syncopation combinations that have no legal four-bar plan under grammar `rhythm-mvp-v1` for any
  tension arc (Quarter+Sparse+Active displacement, Quarter+Breath-heavy+Active displacement,
  Sixteenth+Sparse+Active displacement, Sixteenth+Conversational+Active displacement,
  Sixteenth+Breath-heavy+Occasional offbeats, Sixteenth+Breath-heavy+Active displacement), as a
  single deep-frozen constant, `UNSUPPORTED_RHYTHM_SETTINGS`. This is a documented grammar limit, not
  a musical judgment: deleting the constant and the block it powers is the whole migration once a
  grammar fix makes these settings playable.

* **`isUnsupportedRhythmSetting(setting)`** is the single predicate every consumer (the session's
  `generate`/`regenerate`/`selectInstrumentProfile`, and `RhythmControls`' own inline check) calls
  against the current `{ noteDensity, silenceDensity, syncopation }`.
* **Message.** `UNSUPPORTED_RHYTHM_SETTING_MESSAGE` is the fixed, calm sentence shown when blocked:
  "This mix of note density, silence, and syncopation can't form a four-bar phrase yet. Try a
  lighter syncopation, a different note density, or another silence setting."
* **Suggestion.** `suggestNearestSupportedRhythmChange(setting)` names the deterministic
  single-control nearest supported change — syncopation one step lighter first, then silence
  density by catalog distance, then note density by catalog distance — and
  `describeRhythmSettingSuggestion` renders it as one sentence ("Suggested change: … instead of
  …"). The suggestion is text only: nothing in the workspace ever applies it for the player.
* **Where shown.** `RhythmControls.vue` renders the message plus suggestion as an
  `.inline-alert.alert-notice` directly under its three rhythm fields, `v-show`n only while
  blocked.
* **Live region.** The same paragraph is always rendered (`role="status"` `aria-live="polite"`
  `aria-atomic="true"`), with its text emptied rather than the element removed whenever the setting
  is supported, so assistive technology reliably hears the transition in and out of the blocked
  state rather than missing an element that was never mounted.
* **Presets never land on them.** Neutral and Jazz are frozen replacement bundles
  (`Static/Quarter/Straight/Sparse/Arch/Middle` and
  `Gentle diatonic/Eighth/Occasional offbeats/Conversational/Wandering/Varying` respectively); by
  construction neither preset's density/silence/syncopation triple is in
  `UNSUPPORTED_RHYTHM_SETTINGS`.

## Accessibility

- **Radiogroup roving tabindex.** `SegmentedControl.vue` renders `role="radiogroup"` /
  `role="radio"` with `aria-checked` on each segment. Exactly one segment carries `tabindex="0"`
  (the roving tab stop) and the rest `tabindex="-1"`. Arrow keys move the roving stop and the
  selection together (`ArrowRight`/`ArrowDown` next, `ArrowLeft`/`ArrowUp` previous, wrapping);
  `Home`/`End` jump to the first/last option. Arrow/Home/End navigation always moves focus, even
  while read-only — only pointer/keyboard _selection_ is suppressed for a read-only group, per the
  "read-only but focusable" rule below.
- **Read-only-but-focusable during operations.** `SegmentedControl` and `TempoStepper` render
  `aria-readonly="true"` and their `select()`/`moveTo()` handlers become no-ops while
  `state.operation !== 'idle'` (each control group's wrapping `.field-group` carries a matching
  `is-readonly` CSS class for the same condition) — but the control stays in the tab order and
  keeps its keyboard navigation, matching the "read-only but focusable" requirement rather than
  removing focusability outright.
- **Tempo spinbutton.** `TempoStepper.vue` is `role="spinbutton"` with `aria-valuenow`/
  `aria-valuemin`/`aria-valuemax`/`aria-valuetext` (`"<n> BPM"`), plus `ArrowUp`/`ArrowRight` to
  increment, `ArrowDown`/`ArrowLeft` to decrement, and `Home`/`End` to jump to the catalog's
  bounds.
- **Live regions.** `ScorePanel`'s `.generation-status` (`role="status"` `aria-live="polite"`
  `aria-atomic="true"`) announces exactly three transitions — "Generating phrase" on the start of a
  full generate/regenerate/retry-generation cycle, "Phrase ready" on that cycle's success, and
  "Generation failed. Try again." on its failure — never for a standalone notation-mode switch,
  profile-switch redraw, or Retry notation, each of which only ever passes through the `notating`
  operation state silently. `RhythmControls`' unsupported-setting notice and `FoundationControls`'
  preset-status paragraph are each their own always-mounted, always-`aria-live="polite"` region
  (see Unsupported rhythm settings above and the preset-status copy in `FoundationControls.vue`).
- **44px targets.** `.segment`, `.stepper-button`, and `.btn` all set `min-block-size: 2.75rem`
  (44px), and `.segment` also sets `min-inline-size: 2.75rem` so a single-letter pitch-class
  segment stays a full-size target (`components.css`).
- **Focus visibility.** `theme.css`'s `:focus-visible` rule applies `--shadow-focus` (a
  `0.1875rem` ring in `--color-focus-ring`) and removes the native outline, uniformly across every
  interactive element.
- **Reduced motion.** `components.css`'s `@media (prefers-reduced-motion: reduce)` rule collapses
  every animation/transition duration to `--duration-reduced` (1ms) and removes the primary
  button's `:active` press transform.
- **Portrait notice below 90rem.** `@media (max-width: 89.9375rem) and (orientation: portrait)`
  hides `.layout-app` and reveals `.orientation-notice` instead; `OrientationNotice.vue` itself
  carries no responsive logic, only the static copy. A desktop-width portrait (≥90rem) is left
  usable rather than blocked, since the guard is a device-orientation problem, not a viewport-width
  one.
- **Theme via `data-theme`.** `applyThemePreference` sets/clears `document.documentElement.dataset.theme`
  (`'light'` / `'dark'` / removed for System); `theme.css` defines the full light/dark token
  palette under `[data-theme='dark']`, `[data-theme='light']`, and the `prefers-color-scheme: dark`
  media query scoped to `:root:not([data-theme])`, so an explicit choice always wins over the OS
  preference.
- **Axe coverage in both themes.** `tests/e2e/accessibility.spec.ts` runs an `AxeBuilder` scan
  against the running app. Workspace-specific Playwright coverage for the behaviors above —
  roving-tabindex navigation, read-only-but-focusable state, the tempo spinbutton, live-region
  announcements, 44px targets, focus visibility, reduced motion, the portrait notice, and axe scans
  in both themes — lives under `tests/e2e/workspace/` (a work in progress at the time of writing;
  consult that directory directly for the current file names and coverage).

## Styling source of truth

`src/styles/theme.css` (Tailwind 4 `@theme` tokens: typography, the 8pt spacing grid, radii,
shadows, motion durations, the three named responsive breakpoints, and the full light/dark color
palette) and `src/styles/components.css` (`@layer components`: every component class this
workspace renders, its interactive states, and its breakpoint/portrait/reduced-motion rules) are
the canonical, buildable production styling source, imported through `src/styles/index.css`.
`ui_ux/ui_common.css` is a frozen design reference kept only for the `ui_ux/mockups/` prototype; it
is not imported by the application and is not buildable truth. Per `ui_ux/index.md`, a token or
component-style change is decided in the `ui_ux` handoff documents first, then applied to
`theme.css`/`components.css` as the canonical production source; application code consumes those
classes and tokens and never inlines a raw visual value, and `ui_ux/mockups/`/`ui_common.css` are
updated only when they themselves need to stay representative — otherwise their staleness relative
to a later production styling decision is expected, not an error.
