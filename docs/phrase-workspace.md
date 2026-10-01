# Phrase Workspace

This document records how the Step 9 browser workspace turns one root-composed session into the
responsive, accessible screen a player generates and reads a four-measure phrase from: the
component tree and its props/events contracts, how the session is wired together at the
application root, the state-to-UI map, the generation Worker protocol, the seed-independent
canonical rhythm-domain memo, the unsupported-rhythm-settings block, the idle fit run and the room
notice, the session screen (the session action, the cue row, the audio mix, the locks and focus),
accessibility behavior, and the styling source of truth. The header's `controller-status` and the
connection sheet it opens are in [`docs/controller-connection.md`](controller-connection.md).

## Component tree

```
App.vue
  WorkspaceShell.vue
    WorkspaceHeader.vue
      ControllerStatus.vue        (controller-status: Connect controller or a badge)
      ThemeControl.vue
      SegmentedControl.vue        (notation-mode)
      <button class="btn">          (phrase action)
      <button class="session-action">  (Start session / Stop)
    ScorePanel.vue
      MixControls.vue
        MixVolumeButton.vue       (toolbar Volume)
          MixVolumePanel.vue      (the one volume popover)
      SessionCueRow.vue
        MixVolumeButton.vue       (compact Volume, phone, during a session)
      PhraseScore.vue
    ControlPanel.vue
      FoundationControls.vue
      RhythmControls.vue
      MelodicShapeControls.vue
      CharacterControls.vue
    ConnectionSheet.vue           (lazy chunk, while the connection sheet is open)
    OrientationNotice.vue
```

| Component                  | Responsibility                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Props in / events out                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `App.vue`                  | Builds the one production `WorkspaceSession` for the tab's lifetime via `createWorkspaceSession`, loads its session controller once (a lazy chunk; `controller` is `null` until it arrives), applies the theme preference as a DOM side effect, and on unmount disposes of the controller, then the worker.                                                                                                                                                                                                                                                                                                                                          | No props/events; it is the composition root.                                                                                                                                                                                                                                                                                                                                                                              |
| `WorkspaceShell.vue`       | Lays out header, score panel, control panel, and the portrait guard around one already-constructed session; forwards `ControlPanel`'s typed events onto the session's own actions. Runs the screen's side of a practice session: the Start click (popover closed, session started, the one jump), Stop, the musical controls locked while a session runs, and focus at its end. Builds the one volume popover. Hosts the controller connection: the `controller-status` form it feeds the header (`useControllerStatus`), the click that opens the lazily loaded connection sheet (`useConnectionSheet`), and focus when the sheet closes.           | In: `session`, `pendingPhrase`, `handleEngraved`, `handleNotationError`, `handleSessionStaffFailed`, `handleLayoutInputs`, `audio`, `midi`, `controller`, optional `jumpView`. Out: none (it calls session and controller actions directly). Exposes `connectionSheetOpen`.                                                                                                                                               |
| `WorkspaceHeader.vue`      | Brand mark, `controller-status`, meter/tempo/notation-mode context (the tempo readout shows the session's locked tempo during a session), the theme override, and two action slots: the phrase action (`Generate phrase` / `Regenerate phrase` / `Retry generation` / `Retry notation`), including that label's priority and disabled policy (`Regenerate phrase` under the room notice, unless a banner shows), then the session action (`Start session` / `Stop`), with both slots' disabled and emphasis policy.                                                                                                                                  | In: `session`, `controller`, `controllerStatus` (the form `controller-status` shows). Out: `start-session`, `stop-session`, `open-connection-sheet` (the phrase action drives `session.actions` directly). Exposes `focusSessionAction`, `focusPhraseAction`, `focusControllerStatus`, `focusAfterConnectionSheet`.                                                                                                       |
| `ControllerStatus.vue`     | The header's `controller-status`: always one `btn controller-status` button, `Connect controller` or a badge (a decorative `status-dot` and one fixed-width label). Disabled during a session, at full contrast. See [`docs/controller-connection.md`](controller-connection.md#the-header-controller-status).                                                                                                                                                                                                                                                                                                                                       | In: `form`, `disabled`. Out: `open`. Exposes `focus`.                                                                                                                                                                                                                                                                                                                                                                     |
| `ConnectionSheet.vue`      | The connection sheet, a modal dialog in its own lazy chunk, rendered by `WorkspaceShell` while it is open. See [`docs/controller-connection.md`](controller-connection.md#the-sheet).                                                                                                                                                                                                                                                                                                                                                                                                                                                                | In: `midi`, `openAt`, `connecting`, `profile`, `profiles`, `seenDeviceCount`. Out: `close`.                                                                                                                                                                                                                                                                                                                               |
| `ThemeControl.vue`         | The header's System/Light/Dark segmented control.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | In: `theme`. Out: `select` (a `ThemePreference`).                                                                                                                                                                                                                                                                                                                                                                         |
| `ScorePanel.vue`           | The score toolbar (title, the `generation-status` and `notation-status` live regions, and a generation-failure banner) plus the staff viewport, whose `staff-frame` always holds `PhraseScore` and with it the two reserved staff system positions: empty (the instruction laid over the blank positions), loading, ready, a notation-error panel layered over the still-mounted `PhraseScore`, or the "staff needs more room" notice (`room-notice`) laid over the same positions; during a session, the rolling staff. The toolbar also holds the audio mix (`MixControls`), and `SessionCueRow` sits between the banner's position and the staff. | In: `session`, `pendingPhrase`, `handleEngraved`, `handleNotationError`, `handleSessionStaffFailed`, `handleLayoutInputs`, `audio`, `mixPopover`, `controller`. Out: `stop-session` (the cue row's compact `Stop`); mounts `PhraseScore`, passes it the controller's `sessionStaff` as `session`, and wires its events, `layout-inputs` and `session-staff-failed` included, straight through. Exposes `focusRoomNotice`. |
| `MixControls.vue`          | The audio mix in the score toolbar: the `Backing` and `Click` toggle buttons and the toolbar's `Volume`. Never locked. See [The audio mix](#the-audio-mix).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | In: `audio`, `popover`, optional `designTokens`. Out: none (calls the transport's mix setters).                                                                                                                                                                                                                                                                                                                           |
| `MixVolumeButton.vue`      | One `Volume` button in its anchor, the toolbar's or the phone's compact one; renders the volume popover while it has it open (the toolbar's holds it, hidden, while closed).                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | In: `popover`, `opener` (`toolbar` or `compact`), `audio`, optional `designTokens`. Out: none.                                                                                                                                                                                                                                                                                                                            |
| `MixVolumePanel.vue`       | The one volume popover: the `Backing volume` and `Click volume` sliders, with ranges and step from the `--mix-*` tokens.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | In: `audio`, `popover`, `open`, optional `designTokens`. Out: none (calls the transport's volume setters).                                                                                                                                                                                                                                                                                                                |
| `SessionCueRow.vue`        | `session-cue-row`: one cue at a time, the count-in or the struggling notice, and on the phone during a session the compact `Stop` and `Volume`. See [The cue row](#the-cue-row).                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | In: `controller`, `audio`, `mixPopover`. Out: `stop`.                                                                                                                                                                                                                                                                                                                                                                     |
| `ControlPanel.vue`         | The full below-score control sheet: Foundation, Rhythm, Melodic shape, and Character groups, each delegated to its own group component. Owns no control state; forwards every group's typed event upward unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                                  | In: `controls`, `profileSelection`, `readonly`. Out: `set-control`, `select-instrument-profile`, `select-musical-profile`.                                                                                                                                                                                                                                                                                                |
| `FoundationControls.vue`   | Tempo, tonal center, collection, instrument profile (with its range summary), musical-profile preset (with its status region), harmonic motion, and tension.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | In: `controls`, `profileSelection`, `readonly`. Out: `set-control`, `select-instrument-profile`, `select-musical-profile`.                                                                                                                                                                                                                                                                                                |
| `RhythmControls.vue`       | Note density, syncopation, silence density, plus the unsupported-rhythm-setting notice and its live region.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | In: `controls`, `readonly`. Out: `set-control`.                                                                                                                                                                                                                                                                                                                                                                           |
| `MelodicShapeControls.vue` | Contour, register, leapiness.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | In: `controls`, `readonly`. Out: `set-control`.                                                                                                                                                                                                                                                                                                                                                                           |
| `CharacterControls.vue`    | Arpeggio chaos, inside the always-visible `character-static` wrapper.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | In: `controls`, `readonly`. Out: `set-control`.                                                                                                                                                                                                                                                                                                                                                                           |
| `SegmentedControl.vue`     | Generic presentational single-select radiogroup with roving tabindex; carries no domain or session knowledge.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | In: `label`, `options`, `modelValue`, `readonly`. Out: `update:modelValue`.                                                                                                                                                                                                                                                                                                                                               |
| `TempoStepper.vue`         | Generic presentational spinbutton stepper over a fixed ordered catalog.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | In: `modelValue`, `values`, `readonly`. Out: `update:modelValue`.                                                                                                                                                                                                                                                                                                                                                         |
| `OrientationNotice.vue`    | Static portrait-rotate copy; entirely CSS-driven (see Accessibility below), so it carries no responsive logic itself.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | No props/events.                                                                                                                                                                                                                                                                                                                                                                                                          |

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
- **Window width.** `createBrowserViewportWidth()` (`browser-viewport-width.ts`) is injected as
  the session's `viewport`: a `ViewportWidthProvider` backed by
  `matchMedia('(max-width: 63.9375rem)')`, the same condition the stylesheet uses for "below
  `bp-tablet-landscape`". See [Note density below `bp-tablet-landscape`](#note-density-below-bp-tablet-landscape).
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
- **Fit and room checks.** The same coordinator keeps the staff's latest layout inputs, which
  `PhraseScore` reports through its `layout-inputs` event (wired as `handleLayoutInputs`), and
  gives the session three more seams from them: `staffLayout`, which tells subscribers of every
  report; `checkFit(result)`, which checks the result's written phrase against the latest inputs
  without drawing it; and `checkRoom(signature)`, which checks whether the staff has room at all
  with a key signature. Both checks load the engraver module through the same lazy loader
  `PhraseScore` draws with and wait for the notation fonts, since the planning measures the chord
  symbols' text as drawing does. Before `PhraseScore` has reported once, both reject with a
  retryable `notation_container_unavailable`: there are no default inputs, because a check against
  a guessed width could let through a phrase the staff then cannot draw. See
  [Idle fit run and the room notice](#idle-fit-run-and-the-room-notice).
- **Profile switch.** `evaluateWorkspaceProfileSwitch` adapts the domain `evaluateProfileSwitch`
  policy to the session's typed `retain`/`regenerate` decision, reading the unchanged concert
  timeline, the current register selection, the existing seed, and the newly resolved instrument
  profile off the prior result and the caller's next controls.
- **Session runner.** `WorkspaceSession.createSessionRunner(...)` builds a session runner
  (`src/session/session-runner.ts`) bound to the same `deps.generate` the Idle flow uses, so a
  practice session's phrase 2 onward go through the one Worker that generated phrase 1 and reuse
  its warm rhythm-domain memo. See [`docs/session-engine.md`](session-engine.md).
- **The staff's reports pass a gate.** `handleLayoutInputs`, `handleEngraved` and
  `handleNotationError` are the handlers of an Idle layout gate (`createIdleLayoutGate`,
  `idle-layout-gate.ts`) in front of the coordinator's own. At Idle they pass straight on; while a
  practice session runs, the session diverts them, and gives the latest back at its end. The
  gate's fourth handler, `handleSessionStaffFailed`, takes `PhraseScore`'s `session-staff-failed`
  to the running session only, never to the coordinator. See
  [The Idle layout gate](session-engine.md#the-idle-layout-gate).
- **Session browser ports.** `WorkspaceSession.browser` carries the four browser capabilities a
  session uses (`src/session/session-browser-ports.ts`): the screen wake lock and the landscape
  orientation lock (`browser-screen-locks.ts`, over `navigator.wakeLock` and
  `screen.orientation`), the page becoming hidden (`browser-page-visibility.ts`, over
  `visibilitychange`), and the window's shape (`browser-window-shape.ts`: `innerWidth`, plus the
  small viewport height and the rem read from a hidden `100svh` probe element). Building them asks
  for nothing and listens to nothing. A refused, unsupported or dropped lock is an outcome value,
  never an error, and shows nothing; a lock granted after its release is given back at once.
- **Session controller.** `WorkspaceSession.createSessionController()` loads the controller's
  module as its own chunk and builds it over the Idle session, the audio transport, the browser
  ports, the runner factory, the gate and the session clock (`sessionClock`: a wake-up Worker
  timer, created at the first start, `Date.now` as the wall clock that stamps a session's
  history, and the browser's animation frames, in which the playhead is read). It also gets the
  written phrase Idle shows (the coordinator's `pendingPhrase`), which becomes a session's phrase
  1 on the staff, and the staff planner its fit checks use (`loadSessionStaffFitPlanner`, loaded
  with the controller's chunk). See
  [The session controller](session-engine.md#the-session-controller).
- **Pre-warm.** Unless the prewarm policy is `disabled`, the session also gets the same client's
  fire-and-forget `prewarm`, and posts it when it starts and whenever the rhythm setting a phrase
  would be generated with changes. See [Pre-warm](#pre-warm).
- **Dispose.** `WorkspaceSession.dispose()` stops the session listening for width crossings and
  for the staff's layout reports (`session.dispose()`) and terminates the worker client
  (`client.dispose()`). `App.vue` calls it
  from `onUnmounted`.

`create-workspace-session.ts` is isolated in its own module — rather than inlined in `App.vue` —
so a test can replace the whole factory and never spin a real `Worker` in jsdom.

## State map

`createGenerationSession` (`src/composables/use-generation-session.ts`) owns one
`shallowReactive` state object with these fields, each driving specific UI:

| State field                                                         | UI it drives                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `operation` (`'idle' \| 'generating' \| 'notating'`)                | Every configuration control (all four `ControlPanel` groups, and the header's notation-mode segmented control) is read-only-but-focusable whenever `operation !== 'idle'` (`WorkspaceShell`'s `controlsReadonly`, `WorkspaceHeader`'s `operationRunning`). The primary action is disabled while an operation runs. `ScorePanel`'s `staff-loading` frame class and the `generation-status` live region text ("Generating phrase") only apply while `operation === 'generating'`, which a fit run keeps from its start until it draws its phrase, however many attempts it makes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `notationError` / `generationError` / `result`                      | Together they decide the primary action's label, in this priority: **Retry notation** (a `notationError` is set) > **Retry generation** (a `generationError` is set, no `notationError`) > **Regenerate** (`roomNotice` or `result` is set, no error) > **Generate** (nothing yet). `WorkspaceHeader`'s `primaryActionKind` computed implements exactly this order.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `noteDensityContext`                                                | Where the window stood against `bp-tablet-landscape` at the last read or crossing, and whether a session has stepped down (always `false` until the session engine exists). `WorkspaceShell` hands it to `RhythmControls`, which disables `Sixteenth` below the width, shows the density a phrase would be generated with as the checked segment, and judges the unsupported-rhythm notice on it; `WorkspaceHeader` judges the phrase action's block on it. A crossing updates it and nothing else: it never generates, regenerates or redraws by itself.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `controls` (rhythm subset)                                          | `isRhythmSettingBlocked(state.controls, state.noteDensityContext)` blocks every primary action **except** Retry notation: retrying the engraving of an already-generated phrase replays that phrase's own stored request, so it never depends on the current rhythm-control combination the way starting a new generation does. `WorkspaceHeader`'s `blockedByUnsupportedRhythm` computed encodes this exemption explicitly.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `result` across a generation failure or an unsupported-rhythm block | The previously generated result is retained on a rejected generation/regeneration attempt: a fit run started by `generate`/`regenerate` keeps what the staff shows until it draws a replacement, so `ScorePanel` keeps showing the last successful phrase underneath the failure banner. A run that starts with no score shown (a replacement for a phrase that stopped fitting, or the no-room notice clearing) has no phrase to keep, and the room notice drops the phrase when it shows. The one exception is a profile switch that both invalidates the prior phrase and lands on an unsupported rhythm setting: `clearPhrase()` clears `result`/`latestIntent`/`generationError`/`notationError`/`failedNotationMode` and drops the presented phrase, so `ScorePanel` returns to its empty state instead — see the `profileSelection` switch outcomes row below.                                                                                                                                                                                          |
| `notationError` (in-operation)                                      | `ScorePanel` shows an inline alert ("Notation error: …") layered over the still-mounted `PhraseScore`, and the header exposes Retry notation. `retryNotation()` replays the retained `failedNotationMode` against the retained `result` without touching generation providers.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `notationError`/`notationError` recovery (out-of-operation)         | A `PhraseScore` redraw that fires outside any session operation (a change of the container width, the height budget or the breakpoint; a browser toolbar showing or hiding changes none of them) reports through `reportNotationFailure`/`reportNotationRecovered` instead of settling a promise — this is how a later successful redraw clears a stale notation error without a new `notate()` call. A staff layout failure (`notation_no_room`, `notation_notes_too_wide`) reported this way, or by a Retry notation, never becomes a `notationError`: it goes to the room notice or to a replacement run (see [Layout failures outside a run](#layout-failures-outside-a-run)).                                                                                                                                                                                                                                                                                                                                                                             |
| `profileSelection` switch outcomes                                  | `selectInstrumentProfile` resolves to `'retained'` (prior phrase kept, redrawn at its current notation mode — no new generation), `'regenerated'` (a full generation ran with a fresh seed and succeeded), `'regeneration_failed'` (that generation failed; the prior result is preserved exactly as any other generation failure does), or `'cleared_unsupported_rhythm'` (the switch would land on an unsupported rhythm setting: the profile switch still applies, but `clearPhrase()` discards the prior phrase — `state.result` and every field tied to it go back to null, and the presented phrase is dropped — instead of regenerating; `ScorePanel` shows its empty state and the unsupported-rhythm notice, and the primary action reads "Generate phrase"). `'applied'`/`'unchanged'`/`'rejected'` cover the no-prior-result, same-id, and mid-operation cases. The regeneration is a fit run. Under the room notice, the switch starts a round with the too-many-notes cause, and only changes the selection (`'applied'`) with the no-room cause. |
| `roomNotice` (`'no_room' \| 'notes_too_wide' \| null`)              | Whether the "staff needs more room" notice shows, and why. `ScorePanel` gives `staff-frame` the `staff-no-room` class (with `staff-loading` too while a run under the notice is running, which dims it), lays `room-notice` over the reserved positions with the cause's sentence, hides the instruction and never shows the notation error under it. No phrase is shown while it is set. See [The room notice](#the-room-notice).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `retriesRunning` / `roomNoticeAnnouncements`                        | `retriesRunning` is true while a run's fresh-seed retries run; the session controller reads it to block `Start session`. `roomNoticeAnnouncements` goes up each time the notice must be announced; `ScorePanel` then empties `notation-status` and sets the visible sentence again, so a screen reader hears the same sentence twice. See [State for the session screen](#state-for-the-session-screen).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `presentation.theme`                                                | In-memory only: `setTheme` never touches `result`, `latestIntent`, or any generation/notation field, and `applyThemePreference` is a pure DOM side effect (`data-theme` on `document.documentElement`) that never regenerates or redraws the phrase.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

Every `set-control`/`select-musical-profile`/`select-instrument-profile` request is rejected
(returns `false`/`'rejected'`) whenever `state.operation !== 'idle'`, which is what makes the
control groups' read-only visual state match the session's actual acceptance behavior rather than
being a purely cosmetic lock.

## Generation Worker protocol

`src/generation-worker/` implements one typed, correlated request/response protocol between the
session and one long-lived `Worker`:

- **Message types.** The worker accepts two messages (`GenerationWorkerInboundMessage`):
  `GenerationWorkerRequest` is `{ type: 'generate', id, intent }`, and `GenerationWorkerPrewarm` is
  `{ type: 'prewarm', intent }`, which carries no `id` and is never answered (see
  [Pre-warm](#pre-warm)). `GenerationWorkerResponse` is a closed union of
  `{ type: 'outcome', id, outcome }` and `{ type: 'crash', id, name, message }`. A malformed
  message of either kind, or one with an unknown `type`, throws a `GenerationWorkerProtocolError`
  in the worker.
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
  registering exactly one `message` listener that hands every message to the worker runtime
  (`createGenerationWorkerRuntime`, `generation-worker-runtime.ts`) and posts back the response it
  returns, if any. The runtime answers a `generate` at once through the pure
  `handleGenerationWorkerRequest` handler and runs pre-warm work in slices between messages. Neither
  touches `self`/`postMessage` directly: the clock, the slice scheduler, the memo and the generator
  are injected, so both run in a plain Vitest environment.

## Phrase replay key

Every accepted phrase gets a **phrase replay key**: one self-contained text string holding exactly
the inputs that reproduce it. The app prints the key in the developer console when the phrase is
accepted, and `npm run replay:phrase` turns it back into the same generation request outside the
app. It is a debugging aid for the generator.

### When a key is printed

One console line is printed per accepted phrase, in production builds too:

```text
[Infinite Flow] phrase replay key · <context> · seed1-xxxxxxxx · ifk1.…
```

`<context>` is `workspace phrase`, `session phrase N (carry-in)` or `session phrase N
(standalone)`. The seed is shown in its `seed1-` text form (`encodeSeed`: the unsigned 32-bit seed
as eight lowercase hex digits).

- **Workspace.** A fit-run attempt that ends published (drawn, or kept as a retryable notation
  error) prints its key, whatever started the run: Generate, Regenerate, Retry, a profile switch or
  the room notice's replacement run. `useGenerationSession` reports it through its
  `onPhraseAccepted` option. Attempts the run discards (too wide, no room, stale) print nothing.
- **Session.** A phrase the session engine readies with origin `carry-in` or `standalone` prints
  its key when its `phrase-ready` output passes through the composition root, a look-ahead phrase
  readied but never sounded included (`announcingSessionOutputs`,
  `src/components/workspace/phrase-replay-announcement.ts`). A failed attempt prints nothing, and
  neither does a repeat: it generates nothing new, and the phrase it repeats already printed its
  key. Phrase 1 is the Idle phrase, whose key the workspace printed when it was accepted.
- **Loaded on demand.** The announcement module and the key encoder are a lazy chunk, kept out of
  the entry chunk; `phrase-replay-announcer.ts` is their only door. The console order is
  unchanged: an Idle phrase accepted before the module has loaded is announced as soon as it
  loads, in acceptance order, and the session controller waits for it before starting any runner.
  See [The replay announcer behind a dynamic import](controller-connection.md#the-replay-announcer-behind-a-dynamic-import).

The sink is injected at the composition root as `WorkspaceSessionDependencies.logPhraseReplayKey`;
production and the e2e workspace harness both pass `console.info`. The key is never sent over the
network or stored.

### Key format

A key is the prefix `ifk1.` followed by the unpadded base64url encoding of the UTF-8 JSON of a
7-tuple:

```text
[requestId, seed, controls, musicalProfile, isCustom, phraseNumber, carryIn]
```

- `requestId` is kept because it appears in the generation result, which a byte-identical replay
  needs.
- `seed` is the unsigned 32-bit integer.
- `controls` is an array of the 14 generation controls in the fixed order
  `PHRASE_REPLAY_KEY_CONTROL_ORDER`. Its tonal-center slot holds the **written** tonal center, the
  form the generation intent takes as input; the concert tonal center is rebuilt from it.
- `musicalProfile` and `isCustom` are the musical profile selection.
- `phraseNumber` is replay context, not a generation input: 1 for a workspace phrase, the session
  phrase number for a session phrase. It only serves to derive the phrase's carry-out. With a
  carry-in it must equal the carry-in's own phrase number plus one.
- `carryIn` is the phrase's carry-in, or `null`.

The key stores only owning inputs: the instrument profile, register intent, concert tonal center,
measure count and meter are rebuilt from them. It holds no played notes and nothing beyond the
existing controls, no worker message id (replay always uses id 1, which never affects the
outcome), and no app version or commit, so a later generator change may replay an older key
differently.

`encodePhraseReplayKey` and `announcePhraseReplayKey`
(`src/generation-worker/phrase-replay-key.ts`) build the key and its console line; that module also
owns the prefix, the control order and `PhraseReplayKeyError`.

### Decoding

`decodePhraseReplayKey` (`src/generation-worker/phrase-replay-key-decode.ts`) checks the prefix and
version first, rejecting an unsupported version such as `ifk2.`. A payload that is not strict,
canonical, unpadded base64url, not UTF-8, not JSON, or not the 7-tuple with the right slot types
throws a typed `PhraseReplayKeyError`. The owning fields are then validated and the full
`GenerationIntent` rebuilt by `rebuildGenerationWorkerIntent`, the same validation
`parseGenerationWorkerIntent` runs on a `generate` message (see
[Generation Worker protocol](#generation-worker-protocol)). There is no parallel schema and no
default: a missing or invalid field, or a phrase number that does not follow its carry-in, is
rejected, never repaired.

### Replaying a key

```sh
npm run replay:phrase -- 'ifk1.…'
npm run replay:phrase < console-line.txt   # the key, or a whole copied console line, on stdin
```

`scripts/replay-phrase.mjs` loads `src/generation-worker/phrase-replay.ts` through Vite's
`runnerImport`, so replay adds no dependency. It picks the single `ifk<N>.` token out of its input
(none, or more than one, is an error), decodes it, builds the envelope
`{ type: 'generate', id: 1, intent }`, round-trips it through JSON as a worker message's structured
clone would, and hands it to `createGenerationWorkerRuntime(...).handleMessage`: the same runtime,
protocol parser, request handler and generator the browser worker runs, from a cold rhythm-domain
memo, which gives the same result as a pre-warmed one. Replaying the same key twice prints the same
JSON.

It prints one JSON document `{ key, keyVersion, phraseNumber, input, output }`:

- **`input`**: every intent field verbatim, plus readable additions: the seed in `seed1-` form, the
  written and concert tonal centers with their key names, the instrument's concert range and the
  register windows with note names, the carry-in with named pitches, and the exact worker envelope
  replayed.
- **`output`, phrase** (`kind: 'generation_success'`): the resolved request with its register and
  register window; the bars numbered from 1, each with its chords (1-based start beat, duration,
  concert and written chord symbols, roles) and every note and rest in order (1-based onset beat,
  duration, concert and written pitch as MIDI number and name, ties); the selected harmony; the
  ending (endpoint class, final chord, last sounding note); the carry-out derived with the key's
  phrase number, or the reason there is none; the provenance; the diagnostics; and the raw outcome
  verbatim. Written pitches and names come from the existing notation path, so they match what the
  staff shows; replay adds no transposition of its own.
- **`output`, generation failure** (`kind: 'generation_failure'`): the failure code, the
  diagnostics and the raw outcome.
- **`output`, crash** (`kind: 'crash'`): the crash response's id, error name and message.

The exit code is `0` when the replay ran, whether it produced a phrase or a generation failure; `1`
when no key was given, the key is malformed or unsupported (a one-line message on stderr, nothing
on stdout, no generation run), or an unexpected internal error occurred; `2` when the worker path
crashed, the JSON still being printed with output kind `crash`.

## Canonical rhythm-domain memo

`src/domain/generation/orchestration/canonical-rhythm-domain.ts` memoizes the seed-independent
canonical rhythm domain `makeRhythmCandidateDomain` expands, so a repeated generation or
regeneration against an already-seen rhythm setting skips the expensive Step 6 enumeration.

- **Key.** The memo key is built from the grammar version plus the five rhythm-relevant fields of
  the _normalized_ input: note density, rhythmic variety, silence density, syncopation, and
  tension arc (all taken from `intent.controls`, normalized by `normalizeRhythmExpansionInput`).
- **What's stored.** A miss builds the setting's domain exactly once, in its canonical iterator
  order, and stores either the complete, deep-frozen candidate list
  (`{ kind: 'canonical_rhythm_domain', grammarVersion, input, candidates }`) or the typed
  `NoLegalRhythmPlan` result, memoized as-is. A hit returns the exact same frozen instance without
  touching the grammar again.
- **Build jobs.** Every entry is built by a build job over the planner's stepped builder
  (`createRhythmDomainBuilder` in `rhythm-planner.ts`). One step is at most one gesture unit: one
  gesture (the rhythmic idea of measures 1-2, which measures 3-4 answer with a varied copy) with
  all its answer lists and syncopation templates. The builder produces exactly what
  `makeRhythmCandidateDomain` plus a full drain of its candidates would. A lookup miss runs the job
  to the end at once; `beginBuild` starts a resumable, cancellable job that the Worker's pre-warm
  runs in slices (see [Pre-warm](#pre-warm)). Both store an identical entry. A lookup of a setting
  whose pre-warm job is unfinished finishes that job synchronously rather than starting over; a
  lookup of another setting leaves the unfinished job to resume later. At most one unfinished job
  exists per memo: beginning one for a new setting cancels the old one, which writes nothing.
- **Per-seed ranking.** The memo never ranks anything — ranking is seed-dependent and stays outside
  it. `generation-orchestrator.ts` looks the domain up via `buildRhythmDomain`, then calls
  `rankMaterializedRhythmCandidates(domain.grammarVersion, domain.candidates, intent.seed)`
  (`candidate-ranking.ts`) fresh for every call, over the already-materialized candidate list, so a
  memo hit still produces a correct seed-specific search order without re-expanding the grammar.
- **Lifetime and bound.** `SHARED_CANONICAL_RHYTHM_DOMAIN_MEMO` is the module-level instance
  `generatePhrase` defaults to (`options.rhythmDomainMemo` can override it, which the perf harness
  and golden tests use to get a fresh, empty memo per measurement). It lives for the worker's whole
  lifetime — the worker module never reconstructs it — and never evicts an entry. The number of
  entries is bounded: the finite v2 control catalog carries only 3 note densities × 3 rhythmic
  varieties × 3 silence densities × 3 syncopations × 4 tension arcs = 324 distinct rhythm settings
  per grammar version. Their bytes are not small, though. Measured as retained heap, the slowest
  setting to generate (Sixteenth / Heavily varied / Sparse / Active displacement / Build, 1,797
  candidates) holds about 37.1 MiB, and the largest domain (Sixteenth / Heavily varied / Sparse /
  Straight / Build, 2,932 candidates) about 49.4 MiB, down from 38.5 MiB and 58.5 MiB before the
  cold-generation speed-up. A long session that visits many large settings keeps them all resident.
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
  byte-identical output, so the memo and the golden fixture are unaffected by it. The
  cold-generation speed-up that followed (candidates rejected before they are assembled, freezing
  only when a candidate is published, rhythm tie keys hashed incrementally, build jobs) is
  byte-identical too; the cold-generation goldens prove it over the whole catalog (see
  [Testing](testing.md#unit-fixtures-goldens-and-manifests)).

### Pre-warm

Pre-warm builds the memo entry for the rhythm setting the player is on while the workspace sits
idle, so the first Generate on that setting finds it already built. It changes only when the work
is done, never what `generatePhrase` returns: a generation on a pre-warmed memo is byte-identical
to one on a cold memo.

- **Policy.** `src/components/workspace/prewarm-policy.ts` defines `WorkspacePrewarmPolicy`
  (`'enabled' | 'disabled'`). `App.vue` reads it once from the page URL through
  `prewarmPolicyFromSearch(window.location.search)`: no `prewarm` parameter or `?prewarm=on` is
  `enabled`, `?prewarm=off` is `disabled`, and any other value throws, so a mistyped URL never
  measures the wrong mode. `?prewarm=off` is the latency measurement switch: the only way to load
  the production page with cold generation. `composeWorkspaceSession` hands the session the
  client's `prewarm` only when the policy is `enabled`; `disabled` posts nothing at all.
- **Triggers.** `createGenerationSession` (`use-generation-session.ts`) posts a pre-warm for the
  controls a phrase would be generated with right now (note density already resolved against the
  window's width): once when the session is created, after every `setControl`, after a
  musical-profile switch, and after a width crossing.
- **Dedupe.** `createRhythmPrewarmTrigger` (`src/composables/generation-session-prewarm.ts`) posts
  only when the width-resolved rhythm setting differs from the last one it posted. Its key,
  `rhythmSettingKeyOf`, is the same five controls the memo is keyed by, so an edit to a non-rhythm
  control (tonal center, tempo, contour and so on), or a width crossing that leaves the generated
  note density unchanged, posts nothing. A unit test pins the key to the memo's rhythm input for
  every rhythm setting.
- **Fixed identity.** Every pre-warm intent carries seed 0 (`PREWARM_SEED`) and the request id
  `workspace-prewarm` (`PREWARM_REQUEST_ID`). The rhythm domain does not depend on the seed, so
  any fixed value works, and a fixed one means pre-warm never draws from the session's seed or
  request-id providers: a queued seed sequence is drawn exactly as it would be with pre-warm off.
- **In the worker.** The client's `prewarm(intent)` posts `{ type: 'prewarm', intent }`: no id is
  consumed, nothing is awaited, and it does nothing once the worker is unusable (the next
  `generate` reports that failure). The runtime calls `beginRhythmDomainPrewarm`
  (`rhythm-domain-prewarm.ts`), which starts the memo's build job for the intent's rhythm input.
  It starts nothing when the entry is already memoized, or when the intent's harmony has no legal
  plan (`generatePhrase` would never reach the rhythm domain). A newer pre-warm of another
  setting cancels the unfinished one. An exception inside a slice cancels the job and is rethrown,
  so the worker fails loudly.
- **Slices and preemption.** The runtime runs the current job in slices of about 8 ms
  (`DEFAULT_PREWARM_SLICE_BUDGET_MS`), checking the clock after each step, with at most one slice
  scheduled at a time. A `generate` that arrives meanwhile is served between two slices, so it
  waits for at most about one slice. If it asks for the setting being pre-warmed, its memo lookup
  finishes the remaining build at once; otherwise the unfinished job resumes afterwards.
- **Why a `MessageChannel`.** `generation.worker.ts` schedules each slice by posting to a private
  `MessageChannel`, which yields to the worker's message queue without a timer. Measured in
  Chromium, Firefox and WebKit on the slowest setting, with a small-setting `generate` posted
  40 ms into its pre-warm, the `generate` waited at most 3 ms, 4 ms and 9 ms respectively before
  the worker picked it up, and the whole pre-warm took at most 14 ms longer than its own work.
  `setTimeout(0)` preempted as well, but browsers clamp nested timers to 4 ms, which stretched the
  pre-warm by 180-270 ms.
- **Shared with the session runner.** The session runner uses the same worker and memo (see
  [Session wiring](#session-wiring)), so a setting pre-warmed at Idle is already built when a
  practice session generates on it.

## Unsupported rhythm settings

`src/domain/controls/unsupported-rhythm-settings.ts` names the six note-density + silence-density

- syncopation combinations that have no legal four-bar plan under grammar `rhythm-mvp-v1` for any
  tension arc (Quarter+Sparse+Active displacement, Quarter+Breath-heavy+Active displacement,
  Sixteenth+Sparse+Active displacement, Sixteenth+Conversational+Active displacement,
  Sixteenth+Breath-heavy+Occasional offbeats, Sixteenth+Breath-heavy+Active displacement), as a
  single deep-frozen constant, `UNSUPPORTED_RHYTHM_SETTINGS`. This is a documented grammar limit, not
  a musical judgment: deleting the constant and the block it powers is the whole migration once a
  grammar fix makes these settings playable.

* **`isUnsupportedRhythmSetting(setting)`** judges a setting as generated: its note density is the
  one the rhythm grammar receives. The list is keyed that way.
* **`isRhythmSettingBlocked(chosen, noteDensityContext)`** is the predicate every consumer (the
  session's `generate`/`regenerate`/`retryGeneration`/`selectInstrumentProfile`, the idle fit run
  before each attempt and on each width crossing, the room-notice reactions, `WorkspaceHeader`
  and `RhythmControls`) calls against the player's chosen rhythm setting. It resolves the note
  density first (`generatedRhythmSetting`), so below `bp-tablet-landscape` a combination
  unsupported only because of a chosen `Sixteenth` blocks nothing, and a crossing can block or
  unblock the same chosen setting. The suggestion is computed from the generated setting too, so
  it never proposes `Sixteenth` below the width.
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

## Note density below `bp-tablet-landscape`

Below the tablet-landscape layout's width (64rem), `Sixteenth` can't be chosen and a chosen
`Sixteenth` generates as `Eighth`; the chosen value is kept and applies again to the next phrase
generated at or above the width. The pieces, and why they are built this way:

- **One pure function decides the density.** `resolveGeneratedNoteDensity(chosen, context)` in
  `src/domain/controls/generated-note-density.ts` takes the chosen density and a
  `NoteDensityContext` — `belowTabletLandscape` and `sessionSteppedDown` — and returns the density
  a phrase is generated with. `resolveGeneratedControls` applies it to a whole controls object.
  The session engine will pass `sessionSteppedDown: true` once a session has generated a phrase
  with `Eighth` this way, so its density never steps back up; at Idle it is always `false`. Keeping
  the rule pure lets every case be unit-tested without a browser, and gives the session engine the
  same function the workspace uses.
- **The width comes through an injected provider, read at generation.** The session takes a
  `ViewportWidthProvider` (`src/composables/viewport-width.ts`) and reads it each time it builds a
  generation intent (`freshIntentFromControls`, once per attempt of a fit run, whatever started the
  run), so a phrase takes the width the window has when that phrase is generated. It also subscribes
  to the provider's crossings and mirrors them in `state.noteDensityContext`, so the controls and
  the unsupported-rhythm block follow the window at Idle without waiting for a generation.
- **The intent stays free of browser state.** The intent receives the resolved controls: its
  `controls.noteDensity` is a plain `Eighth` or `Sixteenth`, and nothing about the window reaches
  `createGenerationIntent`, the Worker or the generator. `state.controls.noteDensity` keeps the
  chosen value; the substitution is not a manual edit, so it never marks the musical profile
  preset custom.
- **A crossing never regenerates.** Neither the provider's crossing handler nor anything reading
  `noteDensityContext` starts a generation; only the player's actions do. A crossing can stop one:
  when it makes the rhythm combination blocked while a fit run is retrying or shows no score, the
  run stops at once (see [The run token](#the-run-token)). The phrase on screen is
  redrawn at the new size by `PhraseScore`, as for any resize, under its own
  `(max-width: 63.9375rem)` layout query.
- **The control shows the density generated with.** `RhythmControls` passes
  `SegmentedControl` a `Sixteenth` option with `disabled` and `describedBy` below the width, and
  checks the resolved density, so a stored `Sixteenth` shows as `Eighth`. The disabled segment is a
  native `disabled` button named by the `field-note` "Sixteenth isn't available on small screens."
  with `aria-describedby`; `SegmentedControl` skips unavailable options in arrow-key, Home and End
  selection and refuses to check one. Choosing the checked `Eighth` while it stands in for a stored
  `Sixteenth` emits nothing, so the stored `Sixteenth` is kept.

## Idle fit run and the room notice

At Idle, a phrase whose notes are too wide for the room the window gives the staff is never
drawn: the workspace generates another one with a fresh seed (the number that picks which phrase
the generator returns for the same settings) and shows the first that fits. A window with no room
for the staff at all, or a run whose attempts were all too wide, shows the "staff needs more room"
notice instead of the staff. The notation error is kept for the failures a retry of the drawing
can cure. Two sibling modules of `use-generation-session.ts` hold this:
`src/composables/generation-session-fit-round.ts` (the run) and
`src/composables/generation-session-room-notice.ts` (the reactions around the notice). Neither
owns session state: both read and write the shared state object the root composable builds.

### Fit before drawing

- **Every Idle generation is one fit run.** Generate, Regenerate phrase, Retry generation, the
  regeneration of an instrument-profile switch, the new phrase generated when the no-room notice
  clears, the replacement for a phrase a window change leaves too wide, and a round under the
  too-many-notes notice all call the runner's `run(start)`. `start` says what the staff shows
  meanwhile: `keep_screen` leaves it as it is (a phrase kept on screen, the notice kept for a
  round under it, or nothing); `no_score` drops the phrase and any notice first.
- **The check runs before anything is drawn.** Each generated attempt goes to `checkFit`, which
  runs the engraver's own planning (`planWrittenPhraseFit`, see
  [Pre-draw checks](notation-engraving.md#pre-draw-checks)) against the staff's latest layout
  inputs: the container width and, below `bp-tablet-landscape`, the height budget. It answers
  `fits`, `notes_too_wide` or `no_room`. Only a fitting attempt is set as `result` and handed to
  `notate`. A too-wide attempt drawn and then taken away would flash on screen; checked first,
  `PhraseScore` only ever receives a phrase it can draw, and a phrase kept on screen stays visible
  and untouched through the Loading until its replacement is drawn. The check is the planning code
  drawing runs, not an estimate, so the two never disagree about a phrase.
- **A draw that still fails.** The window can change between the check and the draw. A draw that
  then fails with `notation_notes_too_wide` counts as a too-wide attempt: the score is dropped and
  the run goes on to its next attempt. One that fails with `notation_no_room` ends the run on the
  no-room notice. Any other draw failure keeps that attempt as the result, with the retryable
  notation error.

### Attempts

- **Budget.** A run is the first attempt plus up to three fresh-seed retries: at most four
  attempts (`FIT_RUN_ATTEMPTS`), whatever started it (UI/UX decision D134). Each round under the
  too-many-notes notice starts a new count.
- **One seed and one request id per attempt.** Each attempt builds its own intent with
  `freshIntentFromControls`: one fresh seed and one fresh request id from the injected providers,
  so every attempt is a different phrase and the one drawn keeps its own seed, which reproduces
  it. `latestIntent` follows every attempt; `result` changes only for the attempt drawn.
- **Density read per attempt.** The same call reads the window's width, so each attempt is
  generated with the note density (the setting for the shortest common note value in a phrase)
  the width gives at that moment: a chosen `Sixteenth` generates as `Eighth` for an attempt made
  after the window crossed below `bp-tablet-landscape`, even mid-run.
- **One operation, one Loading.** `operation` stays `generating` from the run's start through
  every attempt and check, and turns `notating` only for the draw of a fitting attempt. So
  `ScorePanel` announces "Generating phrase" once per run and "Phrase ready" at most once, only
  when the run ends with a phrase shown (not on the notice, a notation error or Empty), and the
  controls stay read-only for the whole run.

### How a run ends

- **The first attempt that fits** is drawn, and any notice clears.
- **Every attempt too wide:** the notice shows with its `notes_too_wide` cause.
- **No room:** an attempt checked with `no_room` (the window narrowed during the run) ends the run
  on the notice with its `no_room` cause, with no further attempt, since no phrase can fit.
- **A generation failure** ends the run with the generation-failure banner and is not a counted
  retry: over the notice if one shows, with the kept phrase if one stayed on screen, and with no
  phrase if the Loading showed none.
- **A check that rejects** with a `NotationError` (the engraver module or its fonts did not load,
  or the staff has not reported its inputs yet) keeps that attempt as the result with the
  retryable notation error, so Retry notation can draw it once the cause is gone. Any other
  rejection is a programming error: it propagates, after the run has put the session back to idle.
- **A blocked rhythm combination:** before each attempt, and once the last attempt is too wide,
  the run checks the combination at the width now; when it blocks generation, the run ends with no
  phrase instead of another attempt or the notice (see [The run token](#the-run-token)).

### The run token

The generation Worker has no cancel: a request posted is always answered. The runner therefore
keeps a run token, which changes whenever a run starts or is stopped, and every step of an attempt
(after generating, after the check, after the draw) first checks that its run still owns the
token; a step of a stopped run does nothing.

When a width crossing makes the rhythm combination one that blocks generation while a run is
`generating`, `stopIfBlocked` decides by what the staff shows (v2.0 definition of done, item 26: a
phrase on screen stays while it fits):

- **Retries running, or no score kept.** When `retriesRunning` is true (an attempt was already too
  wide, or the run is a round under the too-many-notes notice), or no phrase is kept (`result` is
  `null`: a first Generate from Empty, or a run started with no score shown), it stops the run at
  once: the token changes, the operation returns to idle and `clearPhrase` leaves no phrase next
  to the unsupported-rhythm alert, the kept phrase, the notice and any generation-failure banner
  all gone. The Worker's response to the attempt in flight is discarded on arrival, and nothing
  from it is drawn. The workspace must show that empty state at once, not when the Worker answers,
  and the token is what lets the session stop waiting without a cancel.
- **The first attempt of a run with a phrase kept on screen** (Generate, Regenerate phrase or an
  instrument-profile switch from Ready) carries on, and the kept phrase stays visible through the
  Loading. If the attempt fits, it is drawn: the workspace is Ready, with the unsupported-rhythm
  alert since the combination is now blocked. If it is too wide, the check before the next attempt
  finds the combination blocked and ends the run on Empty.

A room check that is still waiting reads the same token (`epoch()`) to see that a run started or
stopped meanwhile.

### Layout failures outside a run

A redraw of the phrase on screen at Idle (a resize, a breakpoint crossing) or a Retry notation can
fail with a staff layout failure. `reportNotationFailure` hands it to `routeLayoutFailure` instead
of setting `notationError`:

- **`notation_no_room`** shows the notice with its no-room cause, starts no retries, and leaves a
  generation-failure banner in place.
- **`notation_notes_too_wide`** starts a replacement run with no score shown or, while the rhythm
  combination blocks generation, shows no phrase with the unsupported-rhythm alert, with no
  retries and no notice.
- **Any other code** keeps the retryable notation error.

### The room notice

`roomNotice` holds the notice's cause: `no_room` (the window has no room for the staff whatever
the notes: too narrow for the staff's fixed parts or, below `bp-tablet-landscape`, too short for
its two systems) or `notes_too_wide` (a run's attempts were all too wide). While it shows, no phrase
is shown; the phrase shown before it is dropped and never drawn again.

**Under the no-room cause.** Only the window or the key can bring room back, so the reactions run
the phrase-independent room check, `checkRoom` (`planStaffRoomForKey`). It plans from the height
budget and the width of the layout's fixed parts: the clef, key signature and time signature at
the start of the staff, and every measure at its narrowest width. The key signature (the sharps or
flats at the start of the staff that name the key) is the one the next phrase would have, spelled
from the current written tonal center and collection (`currentKeySignature`), because it sets that
leading width: seven sharps take more room than none. The check runs on:

- every change of the staff's layout inputs, that is every `layout-inputs` report;
- every change to a setting the phrase is generated from, a musical-profile switch included, but
  not an instrument-profile switch. Tempo, the audio mix and the theme change nothing the notes
  depend on, so they run nothing.

Once there is room, the notice clears and a run starts with no score shown; if the rhythm
combination blocks generation by then, no phrase shows, with the unsupported-rhythm alert, and
nothing generates until the player asks. An instrument-profile switch under this cause only
changes the selection: it runs no room check, and the notice and any banner stay (UI/UX decision
D134).

**Under the too-many-notes cause.** With no run active, each of these starts a round: a run with
the notice kept, dimmed, while it runs, and `retriesRunning` true from its start.

- **A wider staff container:** its width grew compared with the previous layout report. The
  reference width updates on every report, during a run too, so a widening during a run starts
  nothing and queues nothing. The room check runs first: with no room, the notice takes its
  no-room cause instead.
- **A change to a setting the phrase is generated from**, an instrument-profile switch included
  (tempo, the mix and the theme excluded).
- **Regenerate phrase**, or **Retry generation** under a banner.

If the change makes the rhythm combination one that blocks generation, no phrase shows, with the
unsupported-rhythm alert, and no round starts. A narrower window starts nothing, but it still runs
the room check, so a window narrowed to no room gives the notice its no-room cause.

**Stale room checks.** The room check is asynchronous: it may wait for the engraver module. Its
answer is dropped when a later check has started, a run has started or stopped, the operation is no
longer idle, or the notice has changed meanwhile, so only the latest check acts.

### State for the session screen

The session screen reads these read-only fields (the first two to decide whether a session can
start; see [The session screen](#the-session-screen)), so the state names them explicitly:

- **`roomNotice`**: `'no_room'`, `'notes_too_wide'` or `null`.
- **`retriesRunning`**: true from the first attempt found too wide, or from the start of a round
  under the too-many-notes notice, until the run ends.
- **`roomNoticeAnnouncements`**: goes up by one each time the notice begins and each time a round
  under it ends with every attempt too wide, and at no other time. It is a counter rather than a
  flag because the same notice must be announced again after a failed round: `ScorePanel` watches
  it, empties `notation-status`, lets the DOM update, then sets the visible sentence again.

### Decisions made while building

- **A phrase already being drawn stays.** A blocking width crossing stops a run only while it is
  `generating`. A phrase that has passed its check and is being drawn (`notating`) is drawn, and
  the workspace shows it as Ready.
- **A kept phrase outlives a blocking crossing during the first attempt.** Only the retries stop
  at once; the first attempt of a run from Ready is not a retry, so the phrase on screen, which
  still fits, is not wiped for it. The run ends on Empty only once an attempt is too wide.
- **Regenerate phrase and Retry generation under the no-room notice** run like a round: the notice
  stays while they run, and an attempt that finds no room lands back on it.
- **A change of cause is not announced.** Under the too-many-notes notice, a window narrowed to no
  room switches the cause and its sentence silently; only the notice beginning, or a failed round,
  is announced.
- **A check that rejects with a `NotationError`** keeps that attempt as a retryable notation error
  rather than retrying: the failure is the engraver's, not the phrase's, and another seed would
  meet it too.
- **The empty instruction** ("Generate a phrase to begin.") shows whenever no phrase and no notice
  show, as in v1, a Loading with no score included.

## The session screen

A practice session runs on the workspace itself: the staff starts from phrase 1, the Idle phrase,
and rolls on from there, and the header, the score toolbar and a cue row above the staff change.
The session controller decides what happens (see
[The session controller](session-engine.md#the-session-controller)); the components below only
show its state and pass on the player's clicks. Its `controller` prop is `null` until the
controller's lazy chunk has loaded, and no session can start then.

### The session action

- **The second header slot.** `button.btn.btn-lg.session-action`, right after the phrase action,
  reads `Start session` at Idle and `Stop` during a session, count-in included. Its width is fixed
  by the stylesheet, so the header doesn't shift when the label changes.
- **Enabled.** `Start session` is enabled only once the controller has loaded and every start
  condition holds (`controller.state.canStart`); `Stop` is always enabled. The phrase action is
  disabled during a session.
- **One primary slot.** `primaryHeaderAction` (`session-action-policy.ts`) gives the
  `btn-primary` emphasis to exactly one slot, the next useful step: the session action during a
  session, in Loading (disabled until the new phrase lands), in Needs more room without a banner
  (disabled until the notice clears) and in Ready; the phrase action in Empty, under a
  generation-failure banner or a notation error (its retry is the next step), and over the phrase
  the last session played, which only a new phrase makes startable again.
- **The Start click.** The header emits `start-session`, and `WorkspaceShell` handles it
  synchronously, inside the click: it closes the volume popover, calls `controller.start()`, which
  unlocks the audio and asks for the screen locks, then makes the start's one jump. Focus stays on
  the session action, which now reads `Stop`.
- **The jump.** Once, instantly, before the count-in's first click, `jumpForSessionStart`
  (`session-start-jump.ts`) scrolls the page for the layout the session holds. From
  `bp-tablet-landscape` up, it jumps to the top of the workspace only if the top edge of
  `staff-viewport` is outside the viewport. Below it, it moves by the least distance that puts the
  whole of `session-cue-row` and `staff-viewport` in view, never scrolling the cue row above the
  viewport. `WorkspaceShell` takes the scroll and the viewport's height through its `jumpView`
  prop (the window by default), so unit tests measure no real page.

### The cue row

`SessionCueRow.vue` renders `session-cue-row` between the generation-failure banner's position and
`staff-viewport`, always present at one fixed height, so nothing below it moves when a cue comes
or goes. It holds at most one cue, by priority: the count-in, then the struggling notice. (The
controller-disconnect banner, above the count-in, and the starting-note line, below the notice,
are chunk 17's.) It is not a live region, nothing in it is announced, and its content changes with
no animation.

- **The count-in.** `ol.count-in` of four `li.count-in-beat` reading `1 2 3 4`, all muted at
  first. The beat clicking now takes `is-current` and the beats before it `is-past`, on the audio
  clock (see [The audio-time agenda](session-engine.md#the-audio-time-agenda)); the row empties
  when the count-in ends.
- **The struggling notice.** `p.inline-alert.alert-notice.session-alert` holding
  `span.session-alert-text`, reading exactly "The generator is struggling with these settings.",
  while the controller's `strugglingNotice` is set and no count-in shows. It never blocks anything.
- **The phone's actions.** From a session's start to its end, `session-cue-actions` at the row's
  trailing end holds a compact `btn btn-primary` `Stop`, which does exactly what the header's
  does, and the phone's compact `Volume`. The stylesheet shows them only below
  `bp-tablet-landscape`.

### The audio mix

`MixControls.vue` sits in `score-toolbar`, after `generation-status`: on its own line below
`bp-tablet-landscape`, at the toolbar's trailing end from it up. It is never locked, at Idle or
during a session, and calls the audio transport's mix setters directly (see
[The mix](audio-transport.md#the-mix)).

- **Toggles.** `Backing` then `Click`, each a `btn toggle-button` with `aria-pressed` and an
  `aria-hidden` `toggle-button-state` reading `on` or `off`. Both start on.
- **The volume popover.** The toolbar's `Volume` button (`aria-expanded`, `aria-controls`) opens a
  `popover` with the `Backing volume` and `Click volume` sliders (`range-input`). Their ranges,
  step and first-load levels come from the `--mix-*` design tokens: backing from 0, click from
  0.2 so the click is never silent, up to 1, in steps of 0.05, both at 0.8 at first. These values
  are placeholders (ux Q31).
- **One popover, two openers.** `createMixVolumePopover` (`mix-volume-popover.ts`), built once by
  `WorkspaceShell`, holds which `Volume` opened the popover: the toolbar's, or the phone's compact
  one in the cue row. The popover opens anchored under that button, and exactly one popover
  element is ever in the page. Opening focuses the first slider. Escape closes it and returns focus
  to the `Volume` that opened it; a pointer press outside, or Tab out of it, closes it and leaves
  focus where it is; a click on the open `Volume` closes it.
- **Sessions.** A session start closes the popover, returning focus to its `Volume` only if focus
  was inside it, without scrolling. A session end closes a popover opened from the compact
  `Volume`, which leaves the page with the session.
- **Levels.** They live in the transport, so they hold for the page, survive closing and
  reopening the popover, and reset on reload.

### During a session

- **Locks on screen.** `WorkspaceShell`'s `controlsReadonly` is true during a session, count-in
  included, as during any Idle operation, so every musical control, tempo included, takes the
  same read-only treatment through the existing `readonly` prop: `is-readonly`, `aria-readonly`,
  still focusable, values at full contrast. The theme control stays interactive, `tempo-readout`
  shows the session's locked tempo, and the phrase action is disabled. The mix and `Stop` stay
  live.
- **Screen locks.** The screen wake lock and the landscape orientation lock are asked for inside
  the Start click and released at every end. A refusal, an unsupported browser or a lock the
  browser drops shows nothing and changes nothing; a dropped wake lock is not asked for again (O87
  is open).
- **The staff.** It rolls: `PhraseScore` takes the controller's `sessionStaff` through its
  `session` prop and, while it is set, draws that instead of the Idle phrase, in the layout held
  for the session (what goes where is in
  [The rolling display](session-engine.md#the-rolling-display)). The Idle fit retries, the room
  notice and the resize regeneration do not act on it (see
  [The Idle layout gate](session-engine.md#the-idle-layout-gate)).
  - **The start.** Phrase 1 is the very phrase Idle drew, in the same layout, so a start redraws
    nothing and no note moves.
  - **Two systems.** In the one-system layout whole phrases alternate between the top and bottom
    systems; in the split layout bars 1–2 are always on top and bars 3–4 below, each system
    refilled with half of the next phrase. From `bp-tablet-landscape` up, phrase 2 fades in below
    phrase 1 as soon as it is ready, usually during the count-in; in the split layout it waits
    until the playhead reaches phrase 1's bar 3.
  - **Refills.** A system whose content changes is refilled on its own, with the
    [motion rules](../ui_ux/motion.md#rules)' phrase-replacement fades: its `staff-content` unit
    takes `is-fading-out` at once (the `--duration-fade-fast` fade-out), loses its marks, is hidden
    from assistive technology, and leaves once its fade has finished; the new material, engraved
    off-screen meanwhile, enters as a new unit with the `--duration-fade` entrance. Under reduced
    motion both are instant. The system being read never changes. Each unit carries
    `data-phrase-number` and `data-system-part` (`whole`, `opening` or `closing`).
  - **A resize.** A change of the layout inputs re-engraves every system shown at the new size,
    in place, with no fade, swapping them only once every one has succeeded; the positions are
    sized for the held layout in the window's height budget. A browser toolbar showing or hiding
    redraws nothing.
  - **The playhead.** `rect.playhead-band` lies behind the measure being played, on the playhead's
    phrase only, and steps to the next measure at each barline without gliding (see
    [The playhead](audio-transport.md#the-playhead)). During the count-in there is none, and the
    session draws no start marker.
  - **Assistive technology.** Each phrase on screen is named once, on its first system shown, its
    other system hidden; the hidden description follows the playhead's phrase (phrase 1 during the
    count-in).
  - **Failures.** A session never shows the notation error. In its session mode `PhraseScore`
    emits neither `engraved` nor `notation-error`, only `session-staff-failed`, and a failure never
    clears the staff; the session then ends with `staff-not-shown`. A window change that leaves a
    phrase shown or waiting unable to fit ends it the same way (see
    [Ends](session-engine.md#ends)).
  - **The end.** Leaving session mode drops every refill under way and draws phrase 1, the Idle
    phrase, again in the layout the window now gives, which reports to Idle as usual. This is
    interim until chunk 20's Review.
  - **The code.** `PhraseScore.vue` keeps the Idle engraving and switches modes;
    `session-staff-positions.ts` keeps the two positions' content, at Idle and during a session
    (refills, the in-place re-engrave, the staging host); `session-staff-marks.ts` draws a
    session's overlays and accessible names; `session-staff.ts` holds the `SessionStaff` type and
    its small pure rules. All are in `src/components/notation/`.

### Focus at the end

`WorkspaceShell` watches the session end and, once the screen shows the Idle state it ends in,
moves focus to the target `sessionEndFocusTarget` (`session-end-focus.ts`) names:

- **`room-notice`** whenever the Idle rules show Needs more room, after any end;
- **the phrase action** once phrase 1 has sounded (the interim end until the Review: the played
  phrase is back on the staff and `Start session` waits for a new phrase);
- **the session action**, now `Start session`, after an end during the count-in;
- **`controller-status`** after an end during the count-in when the Idle rules regenerate phrase 1
  (Loading): both header actions are disabled then, and `controller-status` is always enabled
  outside a session.

After every end the staff draws phrase 1 again in the layout the window now gives. After a window
end, finding no room there can show Needs more room only after focus has moved.
`awaitsLateRoomNotice` keeps watch: when the notice then lands, focus moves to it once, unless the
player has moved focus since or an Idle operation has started. The same end closes a volume popover the compact `Volume`
opened.

## E2E workspace harness and DI seam

The session factory in `src/components/workspace/create-workspace-session.ts` is deliberately split
into an explicit-dependency builder and a production entry:

- **`composeWorkspaceSession(deps: WorkspaceSessionDependencies)`** takes the identity/seed
  providers (`GenerationIntentProviders`), the raw orchestration-outcome `generate` seam, and its
  teardown, and wires them to the same notation coordinator and profile-switch policy production
  always uses. It is the one seam a caller can vary; everything downstream of it is real production
  wiring.
- **`createWorkspaceSession({ prewarmPolicy })`** is the production entry: it calls
  `composeWorkspaceSession` with a real `createBrowserGenerationWorker()`-backed client (its
  `generate` and `prewarm`), the given prewarm policy, the cryptographic `nextCryptoSeed` provider
  (`crypto.getRandomValues`), and a monotonic request-id provider.
- **`WORKSPACE_SESSION_FACTORY`** is a Vue `InjectionKey<() => WorkspaceSession>` exported from the
  same module. `src/App.vue` reads it with `inject(WORKSPACE_SESSION_FACTORY, ...)`, whose default
  calls `createWorkspaceSession` with the prewarm policy read from the page URL, so any caller that never provides the key (production `src/main.ts`) gets the real production
  factory unchanged, while a caller that does provide it (a test, or an e2e harness's own entry
  point) can substitute a `composeWorkspaceSession` call built from deterministic or
  failure-injecting dependencies instead.

This is the one DI seam the whole workspace has, and it exists precisely so an e2e harness can
mount the real, unmodified `App` component tree while replacing only where randomness, timing, and
faults come from.

### `tests/e2e/workspace-harness/`

`tests/e2e/workspace-harness/main.ts` is the harness's own page entry point (built by
`vite.workspace-harness.config.ts`, served by Playwright on port 4175 as
`playwright.config.ts`'s third `webServer` entry). It mounts the exact same `App.vue` tree
production's `src/main.ts` does, and calls `app.provide(WORKSPACE_SESSION_FACTORY, ...)` with a
`composeWorkspaceSession` call wired to:

- **A deterministic seed queue and request-id provider.** `queueSeeds` pushes onto a queue
  `nextSeed()` drains first-in-first-out, falling back to a plain incrementing counter once the
  queue is empty; request ids are `workspace-harness-request-<n>`, monotonic per page load. A spec
  can queue an exact seed and later assert the exact seed/request id a generation produced.
- **A generation gate.** `holdGeneration()`/`releaseGeneration()` control a promise the harness's
  `generate` wrapper awaits before ever delegating to the real worker-backed client, so a spec can
  deterministically assert in-flight state (read-only controls, disabled primary action, the
  `generating` operation) without racing real generation latency.
- **One-shot generation failure injection.** `failNextGeneration(code, skip?)` arms exactly one
  call to return a real `{ kind: 'generation_failure', code, diagnostics }` outcome shape — the
  same shape orchestration itself produces, with a minimal but real `GenerationDiagnostics` value —
  instead of ever fabricating a component-level result. `skip` lets that many calls through for
  real first, so a spec can fail a fit run's second or third attempt.
- **One-shot notation failure injection.** `failNextNotation(code?)` arms exactly one forced
  failure, with `notation_engraving_failed` (the default) or one of the two staff layout failure
  codes, at the next `engraveWrittenPhrase()` call, injected through a harness-only substitute for
  `@/notation/vexflow-engraver-loader` that `vite.workspace-harness.config.ts`'s `resolve.alias`
  swaps in for every import of that loader. `tests/e2e/workspace-harness/vexflow-engraver-loader-seam.ts`
  always delegates to the real loader and its real dynamic `import()`, then wraps the resolved
  module's own `engraveWrittenPhrase` so the forced failure surfaces through `PhraseScore`'s genuine
  `redraw()` catch/`emit('notation-error')` path and its real Retry-notation path, rather than
  faking a component result. The wrap happens at the call, not at module load, because `PhraseScore`
  memoizes the loaded module after its first successful load — a load-time rejection could only ever
  be observed before any phrase had engraved.
- **Forced fit verdicts.** `queueFitVerdicts(verdicts)` queues `fits` or `notes_too_wide` answers
  for the next pre-draw fit checks, through the same loader seam, which wraps
  `planWrittenPhraseFit`; once the queue is empty the real planner answers. A forced
  `notes_too_wide` is what the real planner answers for a dense phrase in a small window, so a
  spec can drive the fit retries with any phrase; real no-room comes from real window sizes. The
  counters `seedsDrawn`, `fitChecks`, `engravings` and `roomChecks` let a spec prove how many
  attempts, checks and draws happened.
- **`snapshot()`.** Reads the mounted session's current `operation`, `presentation.notationMode`,
  and (when a result exists) the result's `requestId`, `seed`, and a `JSON.stringify` of its concert
  timeline — the read side every determinism/isolation assertion polls — plus `latestSeed` (the
  latest attempt's seed, drawn or not) and the room notice's state: `roomNotice`,
  `retriesRunning` and `roomNoticeAnnouncements`.
- **The production prewarm policy, counted.** The harness reads the prewarm policy from its page
  URL exactly as `App.vue` does (`?prewarm=off` disables it), forwards every pre-warm to the real
  worker client unchanged, and counts it for `prewarmCount()`, which stays 0 with `?prewarm=off`.

`tests/e2e/workspace-harness-window.d.ts` is the single ambient declaration of the published
`window.__workspaceHarness` API (`queueSeeds`, `holdGeneration`, `releaseGeneration`,
`failNextGeneration`, `failNextNotation`, `queueFitVerdicts`, the `seedsDrawn`/`fitChecks`/
`engravings`/`roomChecks` counters, `snapshot`, `prewarmCount`, and the `audio`, `midi`,
`screenLocks`, `page`, `windowShape` and `session` seams, which
[`docs/testing.md`](testing.md#the-workspace-harness) lists in full),
shared by the harness page and every spec
under `tests/e2e/release/` (via `tests/e2e/release/harness-helpers.ts`'s thin `page.evaluate`
wrappers) and `tests/e2e/accessibility.spec.ts`'s harness-backed cases.

The lazy VexFlow engraver, the real generation Web Worker, and real notation engraving all run for
real in this harness; only randomness, timing, and fault injection are made deterministic.
**Production code carries no test-only branches** — `WORKSPACE_SESSION_FACTORY` is an ordinary,
always-present Vue injection point with a real production default, not a conditional the harness
flips; the notation-failure seam is a build-time Vite alias substitution external to `src/`, not a
runtime flag inside it; and `composeWorkspaceSession` itself has no awareness that a harness or test
exists.

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
  `state.operation !== 'idle'` or a practice session runs (each control group's wrapping `.field-group` carries a matching
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
  operation state silently. A fit run announces once however many attempts it makes, and a run
  that ends on the room notice announces no "Phrase ready". The notice speaks through
  `.notation-status` instead: its visible sentence each time `roomNoticeAnnouncements` goes up
  (the region is emptied first, so the same sentence announced again is heard), and nothing when
  the notice clears. `RhythmControls`' unsupported-setting notice and `FoundationControls`'
  preset-status paragraph are each their own always-mounted, always-`aria-live="polite"` region
  (see Unsupported rhythm settings above and the preset-status copy in `FoundationControls.vue`).
  The session cue row is deliberately not a live region: the count-in and the struggling notice
  are never announced (see [The cue row](#the-cue-row)).
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
  one. The session controller applies the same condition in code (`isPortraitBelowDesktop`, with
  `BREAKPOINT_DESKTOP_REM`): while the notice shows, a session cannot start, and a running one
  ends.
- **Theme via `data-theme`.** `applyThemePreference` sets/clears `document.documentElement.dataset.theme`
  (`'light'` / `'dark'` / removed for System); `theme.css` defines the full light/dark token
  palette under `[data-theme='dark']`, `[data-theme='light']`, and the `prefers-color-scheme: dark`
  media query scoped to `:root:not([data-theme])`, so an explicit choice always wins over the OS
  preference.
- **Axe coverage in both themes.** `tests/e2e/accessibility.spec.ts` runs an `AxeBuilder` scan
  against the running app, one of them with the audio mix's volume popover open. Workspace-specific Playwright coverage for the behaviors above —
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
`ui_ux/versions/v1/ui_common.css` is a frozen design reference kept only for the `ui_ux/versions/v1/mockups/` prototype; it
is not imported by the application and is not buildable truth. Per `ui_ux/README.md`, a token or
component-style change is decided in the `ui_ux` handoff documents first, then applied to
`theme.css`/`components.css` as the canonical production source; application code consumes those
classes and tokens and never inlines a raw visual value, and `ui_ux/versions/v1/mockups/`/`ui_common.css` are
updated only when they themselves need to stay representative — otherwise their staleness relative
to a later production styling decision is expected, not an error.
