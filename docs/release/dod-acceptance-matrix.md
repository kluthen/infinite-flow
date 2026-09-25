# Definition-of-Done Acceptance Matrix

Each row quotes one Definition-of-Done bullet from
[`specs/first-release-master-spec.md`](../../specs/first-release-master-spec.md) ("Definition of
Done"), in source order, with its verifying evidence: specific test files/names, the gate command
that runs them, and the governing ATD atom id(s) where one exists. Status is one of **Verified**,
**Partially verified** (states what is missing), or **Manual** (states the manual step). All 15
items are currently **Verified**.

## 1. Full control surface generates a complete phrase; documented first-load defaults

> "A user can select every chromatic tonal center; major, minor, and each church mode; a 60-240 BPM
> tempo in 10 BPM increments; and all other first-release controls, then generate a complete
> four-measure 4/4 phrase. First load uses 90 BPM, C Ionian, the neutral preset, `Lift` tension, and
> `Shaped` leapiness."

- **Status: Verified.**
- Evidence: `tests/unit/domain/controls/generation-controls.spec.ts` — `'exhausts every closed
selectable catalog and accepts every literal value'`, `'uses the literal first-load defaults'`,
  `'rejects an invalid closed value rather than selecting a default'`.
- `tests/e2e/release/defaults-and-controls.spec.ts` — `'the empty workspace shows the spec-default
control summary and empty-state copy'`, and the per-group `` `"${groupLabel}" supports keyboard
and pointer selection of every option with a roving tab stop` `` parameterized test.
- `tests/e2e/workspace/generate-flow.spec.ts` — `'generates a phrase: status announces, the score
engraves, and the action becomes Regenerate'`.
- Gates: `npm run test:unit`, `npm run test:e2e`.
- ATD atoms: `module_generation_control_catalog`, `req_four_measure_phrase`,
  `rule_complete_four_four_measures`, `user_story_controlled_phrase_generation`.

## 2. Preset selection replaces all six preset-controlled values

> "Selecting neutral sets harmonic motion, note density, syncopation, silence density, contour, and
> register to neutral's complete bundle; selecting jazz sets each of those six controls to jazz's
> complete bundle. The selection replaces every one of the six values even when one or more values
> were manually changed beforehand."

- **Status: Verified.**
- Evidence: `tests/unit/domain/controls/generation-controls.spec.ts` — `'applies each complete
immutable bundle and reselecting replaces arbitrary custom values'`.
- `tests/e2e/release/defaults-and-controls.spec.ts` — `'the Neutral preset sets its six controlled
values'`, `'the Jazz preset sets its six controlled values'`.
- Gates: `npm run test:unit`, `npm run test:e2e`.
- ATD atoms: `rule_profile_presets_apply_defined_controls`, `module_generative_profile_selection`.

## 3. Custom configuration after a preset edit; workspace layout support

> "After a preset selection, manually changing one or more of those six controls produces a custom
> current configuration without changing either preset's defined bundle or the selected profile's
> musical grammar. A later selection of neutral or jazz restores every value in the newly selected
> preset's complete bundle. Jazz applies `Varying`; for a given complete request and seed, it
> selects exactly one eligible `Low`, `Middle`, or `High` policy for the complete phrase while
> retaining all hard musical constraints. The workspace supports landscape mobile and tablet views;
> a portrait mobile or tablet view shows a rotate-device notice instead of interactive phrase
> controls."

- **Status: Verified.**
- Evidence (custom configuration): `tests/unit/domain/controls/generation-controls.spec.ts` —
  `'retains grammar identity on controlled custom edits and never mutates preset definitions'`,
  `'does not mark a profile custom after a non-profile-controlled edit'`.
  `tests/e2e/release/defaults-and-controls.spec.ts` — `'manually editing a preset-controlled value
clears the preset selection to custom'`.
- Evidence (`Varying` register resolution): `tests/unit/domain/profile/register-window-derivation.spec.ts`,
  `tests/unit/domain/profile/register-intent.spec.ts`, and the orchestrator's window search
  (`tests/unit/domain/generation/orchestration/window-search.spec.ts`).
- Evidence (layout/portrait notice): `tests/e2e/workspace/portrait-notice.spec.ts` — `'portrait
viewport narrower than bp-desktop shows the rotate notice, not the workspace'`, `'landscape
viewport hides the rotate notice and shows the workspace'`. `tests/e2e/workspace/viewports.spec.ts`
  — parameterized `` `${viewport.name} (${viewport.width}x${viewport.height}): no overflow, score
visible, controls reachable` ``.
- Gates: `npm run test:unit`, `npm run test:e2e`.
- ATD atoms: `rule_profile_control_customization`, `module_profile_control_customization`,
  `req_landscape_phrase_workspace`.

## 4. Every measure complete; every pitch inside the profile's active range/window

> "Every generated measure is complete, and every generated concert pitch falls inside the selected
> profile's inclusive active range... The selected whole-phrase register window is respectively one
> of..."

- **Status: Verified.**
- Evidence: `tests/unit/domain/validation/generation-result-validator.spec.ts` — the `'validateGenerationResult:
timeline structure'` group (`'reports a timeline that does not have exactly four measures'`,
  `'reports measures out of canonical 0..3 order'`, `'reports a measure whose event durations do
not sum to one whole note'`) and the `'validateGenerationResult: range and window'` group
  (`'reports a pitch outside the resolved register window'` and its active-range sibling).
- `tests/unit/domain/profile/instrument-profile.spec.ts`, `tests/unit/domain/profile/active-concert-range.spec.ts`,
  `tests/unit/domain/profile/register-window.spec.ts` — declarative profile/window data validation
  for all three instrument profiles.
- `tests/unit/domain/generation/orchestration/generation-outcome-golden.spec.ts` — byte-identical
  regression coverage across a fixed intent matrix.
- Gate: `npm run test:unit`.
- ATD atoms: `rule_instrument_profile_range`, `rule_complete_four_four_measures`,
  `entity_instrument_profile`, `module_register_window_resolution_primitives`,
  `service_generation_result_validation`.

## 5. Tension-arc and leapiness caps, budgets, recovery, and open ending

> "Every result satisfies the selected tension-arc and leapiness caps, budgets, arpeggio-run rules,
> recovery rules, local-resolution requirement, and open-ending requirement."

- **Status: Verified.**
- Evidence (tension arc / resolution): `tests/unit/domain/pitch/validation/figure-rules.spec.ts` —
  the `'pitch validation: bound tension figures'` and `'pitch validation: rests around the
resolution delay'` groups (e.g. `'accepts an appoggiatura entered by skip or leap on a strong
onset'`, `'requires the bound target to precede the final sounding attack'`, `'rejects a target
rest pushing it past the next-beat-or-bar deadline'`).
- Evidence (open ending): `tests/unit/domain/pitch/pitch-planner.spec.ts` — `'enforces the static
open degree-five endpoint through DFS and rejects a tonic closure endpoint'`.
- Evidence (leapiness caps/recovery/arpeggio runs): `tests/unit/domain/pitch/pitch-planner.spec.ts`
  — `'defers a large leap inside a recognized run to the note after the run, which must recover'`,
  `'finalizes a large-leap run with contrary recovery without overlapping a second run'`, `'tries
every chord tone before any non-chord tone at each step under every arpeggio chaos'`.
- Gate: `npm run test:unit`.
- ATD atoms: `rule_tension_arc_level_policy`, `rule_tension_arc_settled`, `rule_tension_arc_lift`,
  `rule_tension_arc_build`, `rule_tension_arc_edge`, `rule_tension_resolution_delay_permits_rests`,
  `rule_tension_ranking_respects_constraints`, `rule_leapiness_interval_budget`,
  `rule_leap_recovery`, `rule_leapiness_arpeggio_run_limits`, `rule_open_phrase_ending`,
  `rule_arpeggio_chaos_respects_constraints`.

## 6. Neutral profile stays diatonic

> "The neutral profile contains no chromatic pitches outside its selected collection, substitutions,
> altered dominants, or chromatic enclosures."

- **Status: Verified.**
- Evidence: `tests/unit/domain/pitch/validation/figure-rules.spec.ts` — `'pitch validation: diatonic
vocabulary'` group (`'keeps Neutral pitches inside the collection'`, `'requires every free
non-chord tone to be a passing tone or neighbor'`).
- Gate: `npm run test:unit`.
- ATD atoms: `rule_neutral_profile_diatonic_pitches`, `rule_neutral_profile_diatonic_harmony`.

## 7. Jazz preset/profile stay diatonic-harmony with bounded chromatic ornament

> "The jazz preset sets gentle diatonic harmonic motion. The jazz profile adds only bounded
> chromatic approaches and enclosures that immediately resolve to chord-tone targets; its harmony
> remains diatonic."

- **Status: Verified.**
- Evidence: `tests/unit/domain/pitch/validation/figure-rules.spec.ts` — `'pitch validation: Jazz
chromatic ornaments'` group (`'accepts a semitone approach into the next chord tone'`, `'accepts
an enclosure and covers its diatonic member'`, `'rejects a chromatic pitch without an immediate
chord-tone target'`, `'rejects an approach separated from its target by a rest'`, `'rejects an
approach longer than its target'`).
- Preset bundle: `tests/unit/domain/controls/generation-controls.spec.ts` — `'applies each complete
immutable bundle and reselecting replaces arbitrary custom values'` covers Jazz's `Gentle
diatonic` harmonic-motion value.
- Gate: `npm run test:unit`.
- ATD atoms: `rule_jazz_chromatic_resolution`, `rule_profile_presets_apply_defined_controls`.

## 8. Deterministic reproduction; regeneration draws a new seed

> "Re-generating changes the seed while preserving controls; supplying the same full request and
> seed reproduces the same result."

- **Status: Verified.**
- Evidence: `tests/unit/domain/generation/orchestration/generation-seed-matrix.spec.ts` —
  `'generatePhrase seed matrix'` / `'is fully deterministic across the two passes gathered while
running every cell'`.
- `tests/unit/domain/generation/orchestration/generation-outcome-golden.spec.ts` — cold-vs-warm
  memo and cross-seed byte-identical hash assertions (see
  [`docs/phrase-workspace.md`](../phrase-workspace.md), "Canonical rhythm-domain memo").
- `tests/e2e/release/deterministic-replay.spec.ts` — `'the same seed and controls reproduce an
identical timeline across two generations'`, `'a different seed under the same controls produces
a different timeline'`.
- `tests/e2e/workspace/generate-flow.spec.ts` — `'regenerating replaces the score with a different
phrase'`.
- Gates: `npm run test:unit`, `npm run test:e2e`.
- ATD atoms: `rule_seeded_phrase_reproduction`, `module_named_stream_pseudorandomness`.

## 9. Notation: clef, display transposition, and minimal-accidental enharmonic spelling

> "For every supported tonal center, collection, and Concert, B-flat, or E-flat display mode,
> standard staff notation uses treble G2 clef and the enharmonic spelling requiring the fewest
> accidentals; equal minima use sharps. The resulting tonal-center label, key signature, note
> accidentals, chord roots, and slash bass use the same spelling convention; chord quality remains
> unchanged. B-flat notation is selected on first load, and changing display modes changes only
> these written display values; it cannot change the concert timeline or the profile-derived
> generator policy."

- **Status: Verified.**
- Evidence: `tests/unit/domain/notation/pitch-spelling.spec.ts` — `'spellWrittenKey — fewest-accidental
enharmonic spelling'` group (`'is minimal, sharp-on-tie, for every tonal center and collection'`
  and the named tie-break/edge-case tests), `'spellWrittenKey — label/key/scale consistency'` /
  `'spells every scale degree consistently with the reported signature membership'`,
  `'spellPitchClassInKey — chromatic spelling rule'` group.
- `tests/unit/domain/notation/written-phrase.spec.ts`, `tests/unit/domain/notation/notation-input.spec.ts`
  — transposition and chord-root/slash-bass spelling under the three display conventions.
- `tests/e2e/release/notation-modes.spec.ts` — `'B-flat notation is selected on first load'`,
  parameterized `` `switching to ${label} notation engraves the phrase without changing the seed,
request identity, or timeline` ``.
- `tests/e2e/notation/notation-display-switch.spec.ts`, `tests/e2e/notation/notation-elements.spec.ts`
  — engraved clef/key/accidental checks in the browser.
- Gates: `npm run test:unit`, `npm run test:notation`, `npm run test:e2e`.
- ATD atoms: `module_notation_display_convention`, `rule_notation_display_preserves_phrase`.

## 10. Instrument-profile switch: retain-vs-regenerate validation

> "Switching instrument profiles validates every unchanged concert event against the new active
> range and the resolved whole-phrase register window... Tests cover retention and regeneration for
> each fixed register selection, `Varying` resolution with a fixed seed, active-range and
> register-window failures independently, and preservation of the original event values on
> retention."

- **Status: Verified.**
- Evidence: `tests/unit/domain/generation/profile-switch.spec.ts` — `'evaluateProfileSwitch:
explicit Low/Middle/High resolution'` group (`'never transposes source events: a retained
timeline is byte-identical to the input'`, `'regenerates when an event falls outside the new
active concert range'`, `'uses the corresponding new-profile window for Middle/High, not the old
profile window'`), `'evaluateProfileSwitch: Varying resolution'` group (`'resolves from the new
non-keyboard profile with the existing seed (minimum tie key)'`, `'regenerates with the
caller-supplied fresh seed when its selected candidate fails containment'`, `'is deterministic:
repeated evaluation with the same seed resolves the same candidate'`), plus the rest-event and
  display-mode-independence groups.
- `tests/unit/composables/generation-session-workspace.spec.ts` — the `'selectInstrumentProfile
outcomes'` group (7 tests covering reject-while-busy, unchanged, no-prior-result, retain,
  regenerate, regeneration-failure, and the unsupported-rhythm clear outcome).
- `tests/e2e/release/profile-switch.spec.ts` — `'a profile switch retains the phrase when every
event fits the new profile'`, `'a profile switch regenerates the phrase with a fresh seed when it
no longer fits'`, `'a profile switch clears the phrase to the empty workspace when regeneration is
needed but the rhythm settings are unsupported'`.
- Gates: `npm run test:unit`, `npm run test:e2e`.
- ATD atoms: `rule_profile_switch_validates_phrase`, `module_phrase_generation_profile_policy`.

## 11. Theme: system default, manual override, no effect on generation

> "The initial theme uses the system preference, and a manual light or dark override changes
> presentation without changing the phrase request or result."

- **Status: Verified.**
- Evidence: `tests/unit/composables/generation-session-workspace.spec.ts` — `'theme during an
operation'` / `'changes only presentation.theme while a generation operation is in progress'`.
- `tests/unit/components/workspace/apply-theme-preference.spec.ts` — system/light/dark DOM
  side-effect behavior.
- `tests/e2e/workspace/theme.spec.ts` — `'Light/Dark set data-theme and never redraw or regenerate
the score'`, `'System removes the data-theme override'`.
- `tests/e2e/release/theme-isolation.spec.ts` — `'a theme change never alters the session
snapshot'`, `'the theme control keeps working while a generation is gated in flight'`.
- Gates: `npm run test:unit`, `npm run test:e2e`.
- ATD atom: `rule_presentation_preference_preserves_phrase`.

## 12. Browser-only operation, no server dependency

> "The application operates entirely in the browser for its required first-release behavior,
> without server dependency."

- **Status: Verified.**
- Evidence: `scripts/verify-boundaries.mjs` (run as `npm run verify:boundaries`) — static scan of
  every authored `src/**` file for forbidden persistence and optional-scope/network identifiers,
  plus PWA `runtimeCaching: []` and precache-completeness checks.
- `eslint.config.js`'s `no-restricted-globals`/`no-restricted-properties`/`no-restricted-imports`
  rules mirror the same boundary at lint time (`npm run lint`).
- `tests/e2e/release/optional-scope-absence.spec.ts` — `'MIDI, audio, and microphone access are
never requested'`, `'no network request travels beyond this origin, and none is XHR, fetch,
WebSocket, or SSE'`, `'no playback, scoring, or MIDI control is ever rendered'`.
- `tests/e2e/release/persistence-absence.spec.ts` — `'no customized control, generated phrase, or
notation mode survives a reload'`, `'a retryable generation failure does not survive a reload'`,
  `'the PWA precache exists and holds only immutable static assets, never user or session state'`.
- `tests/e2e/release/offline-and-fonts.spec.ts` — `'after the service worker installs, the workspace
reloads and completes a full generation while offline'`.
- Gates: `npm run lint`, `npm run verify:boundaries`, `npm run test:e2e`.
- ATD atoms: `req_browser_only_first_release`, `specification_browser_only_operation_verification`,
  `rule_ephemeral_session_state`, `specification_ephemeral_state_verification`,
  `rule_optional_midi_privacy`.

## 13. One active operation at a time; failure retention; sole automatic regeneration

> "The workspace permits at most one active generation or notation operation. During generation, the
> action is disabled; configuration controls remain focusable read-only context and cannot change
> values; a prior valid phrase remains visible. Initial generation failure retains the empty
> workspace; later failure retains the valid phrase; notation failure retains phrase data but
> replaces score content with a retryable error. An incompatible instrument-profile switch is the
> sole automatic full-phrase regeneration; under a blocked rhythm setting it clears the phrase
> instead."

- **Status: Verified.** The single-operation state machine, focusable-read-only controls, and
  failure-retention behaviors are verified (below). The doubled "Generation failed:" prefix and raw
  failure-code defect is fixed per D29: `src/composables/generation-failure-alert.ts`'s
  `generationFailureAlertText` maps each typed `GenerationFailureCode` (and every other error) to
  the exact calm string the handoff defines, through an exhaustive switch with no default case, so
  an unhandled future code fails the typecheck rather than silently falling through.
  `src/components/workspace/ScorePanel.vue` renders only that mapped text; `GenerationFailedError`
  (`workspace-session-result.ts`) keeps its own `Generation failed: ${code}` message for
  developer-facing contexts only, and the UI no longer concatenates it.
- Evidence (D29 mapping): `tests/unit/composables/generation-failure-alert.spec.ts` — one test per
  `GenerationFailureCode` asserting the exact D29 string, plus the generic-fallback tests for a
  Worker crash, a Worker transport failure, and any other unrecognized error.
  `tests/unit/components/workspace/ScorePanel.spec.ts` — `'shows the D29 generic alert banner for
an unrecognized error...'`, `'shows the D29 typed-code alert banner for a GenerationFailedError,
never the raw code or a doubled prefix'`. `tests/e2e/release/errors-and-retry.spec.ts` now asserts
  the exact rendered alert text with `toHaveText` (both the initial `no_legal_harmony_plan` failure
  and the later `search_limit_exceeded` failure).
- Evidence (state machine / focusable-read-only / retention): `tests/unit/composables/generation-session-workspace.spec.ts`
  — the top-level `'generation session workspace flow'` describe block, including `'observes
generating -> notating -> idle across one successful generate-then-engrave operation'`, `'keeps
the freshly generated result when the post-generation engrave fails, and retryNotation recovers
it'`, `'keeps the prior result and prior notation state untouched when a later generation attempt
fails'`.
- `tests/e2e/release/concurrent-operation-prevention.spec.ts` — `'every control group is read-only,
and the primary action is disabled, while a generation is gated'`, `'a second click while a
generation is gated never starts a second request'`.
- `tests/e2e/release/errors-and-retry.spec.ts` — `'an initial generation failure shows the empty
workspace with an error, and Retry generation builds a fresh request with a new seed'`, `'a later
generation failure keeps the prior valid phrase visible'`, `'a notation failure keeps the phrase
data but replaces the score with a retryable error, and Retry notation recovers'`. Retry generation
  builds a brand-new request from the current controls/profile with a fresh seed and identity, the
  same construction as Regenerate, rather than replaying the failed intent unchanged (user decision,
  2026-09-25; D30 in `ui_ux/decisions.md`).
- `tests/e2e/release/profile-switch.spec.ts` (the three tests listed under item 10) covers the sole
  automatic-regeneration behavior and the unsupported-rhythm clear exception.
- Gates: `npm run test:unit`, `npm run test:e2e`.
- ATD atoms: `service_workspace_session_flow`, `rule_unsupported_rhythm_settings_block_generation`.

## 14. Keyboard operability, live-status announcements, focus/target/reduced-motion

> "Every control can be operated by keyboard with the defined radiogroup, roving-tab-stop, and
> arrow-key behavior. A polite live-status region announces generation start, completion, and
> failure. Controls have visible focus indication and at least 44 CSS-pixel targets; reduced-motion
> preference disables nonessential animation."

- **Status: Verified.** Keyboard operability, live-region announcements, focus visibility, 44px
  targets, and reduced motion are each covered by a passing test below. The read-only-control
  contrast defect is fixed per D28: `.segmented-control.is-readonly` and `.field-group.is-readonly`
  (`src/styles/components.css`) no longer dim with `opacity: 0.7` (which pushed label and
  dark-theme selected-segment text below the 4.5:1 text floor); read-only now renders every label,
  selected-segment, and border color exactly as the active state, and signals "temporarily locked"
  with the new `--readonly-ring` token (`0.125rem dashed var(--color-text-muted)`,
  `src/styles/theme.css`) applied as an `outline`, which clears the 3:1 non-text floor. The
  previously-failing axe test now passes.
- Evidence (keyboard/roving tabindex): `tests/e2e/release/defaults-and-controls.spec.ts` — the
  per-group roving-tab-stop test (see item 1). `tests/e2e/workspace/generate-flow.spec.ts` —
  `'controls stay read-only but focusable during generation: arrows move focus, not selection'`,
  which now also asserts the read-only field-group and segmented-control compute `opacity: 1` and
  `outline-style: dashed`.
- Evidence (live-status region): `tests/unit/components/workspace/ScorePanel.spec.ts` — `'shows the
loading state and announces "Generating phrase" while generation runs'`, `'reaches the ready
state, mounts PhraseScore with the pending phrase, and announces "Phrase ready"'`, `'shows the D29
generic alert banner for an unrecognized error and announces "Generation failed. Try again."'` —
  plus the same generate-flow e2e test's status assertions.
- Evidence (focus visibility): `tests/e2e/workspace/focus-visibility.spec.ts` — `'the first several
tab stops each show a visible focus indicator'`, `'an element loses its focus indicator once focus
moves elsewhere'`. The read-only dashed ring and the `:focus-visible` box-shadow ring are drawn on
  different elements (the ring on the `field-group`/`segmented-control` container, the focus
  box-shadow on the individual focused `segment`) and do not collide: `--readonly-ring`'s
  `outline-offset` (`--spacing-1`, 0.25rem) exceeds `--shadow-focus`'s spread (0.1875rem), leaving a
  small visible gap, so a focused read-only segment still shows a clearly visible focus ring inside
  the locked ring.
- Evidence (44px targets): `tests/e2e/workspace/target-size.spec.ts` — parameterized `` `${viewport.name}:
every interactive control is at least 44x44px` ``.
- Evidence (reduced motion): `tests/e2e/workspace/reduced-motion.spec.ts` — `'staff-content entrance
and button feedback resolve to about 0 duration'`.
- Evidence (axe scans): `tests/e2e/accessibility.spec.ts` — `'has no detectable axe violations in
the empty shell'`, `'... after generation, in Light and Dark theme'`, `'... in the
unsupported-rhythm-setting state'`, `'... while a generation is gated in flight'` (previously
  failing on the read-only contrast defect, now passing), `'... in the generation-failed error
state'`, `'... in the notation-failed error state'`. `npm run test:a11y` is 6/6 passing.
- Gates: `npm run test:unit`, `npm run test:e2e`, `npm run test:a11y`.
- ATD atoms: none found governing keyboard/live-region/focus/target/reduced-motion behavior
  specifically; the closest parent is `req_landscape_phrase_workspace` (layout/interaction
  requirement), but no atom traces these accessibility behaviors directly. This is a gap worth a
  future ATD atom, not something this docs-only task can add.

## 15. Offline operation; breakpoint/layout behavior; unrenderable-phrase error

> "Required phrase generation and notation function offline without a server or optional browser
> capability. At `64rem` and `90rem`, layout changes preserve all four measures in a single
> non-scrolling, unclipped staff system. Below `64rem`, the four measures appear in one such system,
> or in two aligned two-measure systems when one does not fit at the legibility floor. Below `90rem`
> in portrait, the application shows a rotate-device notice; desktop at or above `90rem` remains
> interactive in either orientation. An unrenderable valid phrase shows a retryable notation error
> rather than partial or substitute notation."

- **Status: Verified.**
- Evidence (offline): `tests/e2e/release/offline-and-fonts.spec.ts` — `'after the service worker
installs, the workspace reloads and completes a full generation while offline'`, `'the two
self-hosted UI typefaces load without any network request'`.
- Evidence (breakpoints/single-system/two-system layout): `tests/e2e/workspace/viewports.spec.ts`
  (see item 3) and `tests/e2e/notation/notation-two-system.spec.ts` — `'two-system phone layout
matches its baseline'` plus its companion engraving-element checks.
- Evidence (portrait notice): `tests/e2e/workspace/portrait-notice.spec.ts` (see item 3).
- Evidence (unrenderable-phrase notation error): `tests/e2e/release/errors-and-retry.spec.ts` —
  `'a notation failure keeps the phrase data but replaces the score with a retryable error, and
Retry notation recovers'`. `tests/e2e/accessibility.spec.ts` — `'has no detectable axe violations
in the notation-failed error state'`.
- Evidence (visual baselines): `tests/e2e/notation/notation-visual.spec.ts` — parameterized `` `staff-content
matches its baseline for a generated ${mode} phrase` ``, `'two-system phone layout matches its
baseline'` (snapshots under `tests/e2e/notation/notation-visual.spec.ts-snapshots/`).
- Gates: `npm run test:e2e`, `npm run test:notation`.
- ATD atoms: `req_landscape_phrase_workspace`, `module_notation_layout_preflight`,
  `specification_ephemeral_state_verification` (offline/ephemeral overlap).

## Summary

- All 15 Definition-of-Done items are fully **Verified** by automated evidence. Items 13 and 14
  were **Partially verified** pending D28 (read-only contrast) and D29 (generation-failure alert
  copy); both are now implemented, tested, and re-verified (see items 13 and 14 above).
- No item in this matrix has zero automated evidence; the build-artifact size check, offline manual
  DevTools check, and license review remain manual steps tracked in
  [`release-checklist.md`](release-checklist.md) rather than DoD items themselves.
