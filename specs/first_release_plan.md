# Infinite Flow First-Release Implementation Plan

Status: approved for implementation

> Historical plan for v1.0-rc1. The v1.0 gate amendments (2026-09-26: instrument-carried transposition and written-key selection, rhythmic variety replacing Mixed density, capability flags) live in the [master spec](first-release-master-spec.md) draft v2.0; where this plan describes a display-convention selector or Mixed density, the master spec supersedes it.

## Objective and Scope

Implement the approved first release as a browser-only Vue application that generates and engraves one four-measure musical phrase. Each delivery step is test-first and includes implementation, verification, documentation, and business-focused ATD stewardship.

The authoritative product inputs are [the first-release master specification](first-release-master-spec.md), [the roadmap](roadmap.md), [the generator contract](generator-contract.md), [the generator architecture](generator-architecture.md), and the UI/UX set beginning at [`ui_ux/README.md`](../ui_ux/README.md). The release excludes persistence, a backend, MIDI access, playback, scoring, adaptation, and microphone input. End-user state exists only in memory for the active session.

## Technology and Delivery Decisions

- Use Vue 3, strict TypeScript, Vite, Tailwind 4, Vitest, Vue Test Utils, Playwright, and `@axe-core/playwright`.
- Use pinned VexFlow 5 through a narrow SVG engraving adapter. Written notation is derived from the immutable concert timeline and must fail explicitly when it cannot satisfy the legibility contract: one staff system, or two aligned two-measure systems on the landscape phone layout (below `64rem`).
- Use hand-written boundary parsers and invariant validators for the closed internal event model, plus a small documented deterministic 32-bit PRNG with golden tests.
- Keep session coordination in a root-created composable. Do not add Pinia unless later scope introduces independent global stores.
- Use `vite-plugin-pwa` only to precache immutable application assets. Do not place end-user or session state in localStorage, sessionStorage, IndexedDB, or cache entries.
- Tailwind becomes the production styling authority. Preserve the approved UI/UX visual language while consolidating runtime tokens and utilities into the Tailwind theme/style files.
- Update the UI/UX index and handoffs when production styling moves, so future design alterations point to the correct source of truth.
- Tool and library choices do not create ATD atoms. ATD stewardship traces business intent and behavior through precise implementation and test links.
- Every source file must have an honest, precise implementation link. Co-locate passive labels/constants with an owning linked module when they do not represent an independent business boundary; never add catch-all or phantom links.
- The implementation-facing musical guides are [Harmony Planner Policy](../docs/music/harmony-planner-policy.md), [Rhythm and Phrase-Structure Policy](../docs/music/rhythm-phrase-structure.md), and [Pitch Planner and Validation Policy](../docs/music/pitch-planner-validation.md). Their numerical calibration policies remain subject to listening tests.

## Pre-Execution Gates

- Create a dedicated git worktree from the default branch for this major greenfield feature, verify it starts from the intended clean baseline, and perform all ten implementation steps there. Do not disturb unrelated changes in the primary checkout.
- Run documentalist Trigger E before source creation for only the settled, business-intent-bearing generator orchestration, control/request behavior, workspace state-flow, and verification boundaries. Carry the resulting atom IDs into precise implementation/test links. Do not create atoms for Vue, Tailwind, VexFlow, package configuration, file layout, or other tooling choices.

## 1. Establish the executable client and quality gates

**Tests:** Scaffold Vitest, Vue Test Utils, Playwright, and `@axe-core/playwright`; add smoke tests for app mount, an empty workspace route, and production startup. Define scripts for typecheck, lint, unit/component tests, E2E tests, build, and ATD checks.

**Implement:** Create the Vue 3 + strict TypeScript + Vite application, Tailwind 4 pipeline, ESLint/formatting configuration, and browser-only entry point. Establish domain, component, composable, style, test, and public-asset directories. Add `vite-plugin-pwa` only for immutable application assets; prohibit application APIs for localStorage, sessionStorage, IndexedDB, or persisted user-state caches.

**Verify:** Run typecheck, lint, smoke tests, Playwright startup test, and production build. Inspect the built client to confirm required behavior has no server runtime and no user-state persistence dependency.

**Documents:** Update the root README with prerequisites, commands, directory boundaries, browser-only constraints, and the release verification matrix.

**ATD stewardship:** Confirm the pre-execution business-boundary capture and range signoff are complete, then run structural ATD validation and record the governing atom IDs for later source/test links. Do not attach business atoms to generic tool configuration or create atoms for tooling.

## 2. Define the immutable musical contract and deterministic foundations

**Tests:** Add failing unit tests for request/result construction, exact four-measure/4/4 shape, immutable concert events, rational duration arithmetic, invalid boundary rejection, fixed-seed PRNG sequences, and separation of display/session fields from generation data.

**Implement:** Define the closed TypeScript event schema, exact duration representation, generation request/result types, hand-written boundary parsers and invariant validators, immutable constructors, seed identity, and a small documented 32-bit deterministic PRNG with named streams.

**Verify:** Run focused contract and PRNG tests, typecheck, mutation/immutability assertions, and golden-seed reproduction checks across repeated runs.

**Documents:** Update the generator contract/architecture docs with the final event shapes, duration model, seed semantics, validation failures, and ownership boundaries.

**ATD stewardship:** Place precise links at behavior-bearing contract and determinism boundaries and corresponding tests, primarily for `req_four_measure_phrase`, `rule_complete_four_four_measures`, and `rule_seeded_phrase_reproduction`; audit that presentation and browser state remain outside those links.

## 3. Implement declarative instrument profiles and register policy

**Tests:** Add table-driven tests for all C keyboard, B-flat tenor, and E-flat alto ranges/windows; invalid profile definitions; fixed Low/Middle/High resolution; canonical `Low, Middle, High` candidate identities/indices; stable register-stream key fixtures and display-state independence; and no mid-phrase window changes. Do not assert complete-phrase Varying eligibility in this step.

**Implement:** Create validated declarative profile data, active-range/window value objects, an outer register-intent descriptor, deterministic canonical window-order/key primitives, and construction of core requests that always carry one resolved window. Implement profile-switch retain/regenerate validation without instrument-specific planner branches. Do not run or duplicate harmony/rhythm/pitch feasibility here; Step 7 owns complete-phrase Varying eligibility and selection.

**Verify:** Run profile/property tests across boundary MIDI values, window identities, register-key seeds, and display/theme variants, plus typecheck and lint. Prove every core request has one resolved contained window and no unresolved `Varying`; require explicit human signoff that ranges/windows match the STABLE contract before closing this step.

**Documents:** Record profile-extension instructions, outer intent versus resolved core-request boundary, canonical window identities/key derivation, and the exact validation/switch algorithm, aligned with [Register-window research](../docs/music/Saxophone%20profile%20ranges/register-windows.md#how-should-varying-choose-a-phrase-wide-policy-deterministically-from-a-seed).

**ATD stewardship:** Link profile definitions, validators, switch policy, and focused tests to `rule_instrument_profile_range`, `entity_instrument_profile`, `module_phrase_generation_profile_policy`, and `rule_profile_switch_validates_phrase`; run semantic/coverage checks for the STABLE rule.

## 4. Implement controls, presets, and request construction

**Tests:** Add unit/component tests for every selectable value and default, tempo bounds/steps, complete Neutral/Jazz bundle replacement, custom-configuration behavior, retained profile grammar, fresh-seed regeneration, and exclusion of theme/notation from generation requests.

**Implement:** Build typed control catalogs, normalized control mapping, preset bundles, request factory, seed renewal, and a root-created in-memory session composable exposing readonly state and explicit actions. Keep it independent of Vue components and storage APIs.

**Verify:** Run focused mapping/session tests, typecheck, and lint; inspect representative serialized requests for completeness and absence of presentation/browser data.

**Documents:** Document defaults, normalization, preset/custom transitions, request creation, and session-only state ownership.

**ATD stewardship:** Link behavior and tests to `user_story_controlled_phrase_generation`, `rule_profile_presets_apply_defined_controls`, `rule_seeded_phrase_reproduction`, and `rule_presentation_preference_preserves_phrase`. Every source file must carry at least one precise link at the type/function/constant boundary it implements; if a passive option-label file has no honest independent business boundary, co-locate it with its owning linked module rather than adding a catch-all or phantom link.

## 5. Build the harmony and tension planner

**Tests:** Add failing deterministic tests from [Harmony Planner Policy](../docs/music/harmony-planner-policy.md): every collection offset/derived triad; tonal and modal static/gentle/active template; harmony-event count/boundary; Neutral/Jazz domain parity; abstract tension-requirement records with no rhythm/onset dependency; tonal, static, and modal open endpoints; complete finite-domain expansion; stable structural identities/zero-based indices; typed empty-domain failure; and seed-independent domain reproduction. Include every tonal center, Major/Minor versus each named mode, and fixed fixtures for optional split bars.

**Implement:** Implement the exact [collection/triad vocabulary](../docs/music/harmony-planner-policy.md#collection-and-chord-vocabulary), tonal/modal template tables, quarter-boundary harmonic events, endpoint classes, abstract tension requirements, and [candidate domain/indexing](../docs/music/harmony-planner-policy.md#candidate-domain-indexing-and-failure). Return the complete immutable canonically indexed domain, not a rhythm-bound target or one selected plan; return `no_legal_harmony_plan` only when that structural domain is empty.

**Verify:** Run focused fixtures plus property sweeps across all tonal centers, collections, motion levels, arcs, and profiles. Independently reconstruct every triad; assert event limits, Neutral/Jazz domain parity, abstract requirement validity, stable complete enumeration/indices independent of seed and rhythm, and the exact [open-ending endpoint class](../docs/music/harmony-planner-policy.md#open-ending) with no altered/borrowed harmony or tonic closure.

**Documents:** Treat [Harmony Planner Policy](../docs/music/harmony-planner-policy.md) as the Step 5 musical-policy source; keep its Authority/Evidence/Implementation-inference distinction, event schema mapping, candidate order, failure names, and calibration questions synchronized with implementation. Keep [Neutral Profile](../docs/music/neutral-profile.md) and [Jazz Profile](../docs/music/jazz-profile.md) subordinate to it.

**ATD stewardship:** Link narrow behavior-bearing planner functions/tests to the governed neutral-harmony, tension-level/ranking, and open-ending rules; use ATD only for business traceability. Do not encode template tables, candidate ordering, research evidence, calibration, or tooling choices as atom policy, and do not overload one implementation boundary with unrelated links.

## 6. Build the rhythm and phrase-structure planner

**Tests:** Add failing tests from [Rhythm and Phrase-Structure Policy](../docs/music/rhythm-phrase-structure.md) for 16-tick bars/64-tick phrases; exact Quarter/Eighth/Sixteenth/Mixed nominal boundaries, durations, attack bands, and Mixed-class coverage; each phrase rest budget/shape; Straight/Occasional/Active counts; signed `b'=b+delta` behavior for later/earlier `note -> note`; paired equal-delta interior `note -> rest -> note` translation; rejection of unpaired/leading/trailing rest displacement; tied-sustain splitting without reattack; positive durations; unchanged attack/rest totals; exact tiling; tick-0-or-8 anchors and Active anchor ratio; gesture/answer relation; canonical order; typed no-plan failure; and fixed-seed reproduction.

**Implement:** Build the nominal skeleton and joint density/silence allocator, apply the algebraic syncopation transforms without changing attack/rest totals, emit tie intents, enforce exact anchors, and derive bars 3-4 as the documented transformed answer to bars 1-2. Follow [Exact time model and grids](../docs/music/rhythm-phrase-structure.md#exact-time-model-and-grids) through [Four-bar gesture and answer](../docs/music/rhythm-phrase-structure.md#four-bar-gesture-and-answer); return the complete immutable, structurally identified/indexed finite rhythm domain (or equivalent finite iterator), expose phrase-position/grid provenance, inspect no harmony, and assign no pitches.

**Verify:** Independently retile every generated measure and run seeded property sweeps over every density/silence/syncopation combination. Assert the complete [candidate/failure/validation checklist](../docs/music/rhythm-phrase-structure.md#candidate-order-failure-and-validation), including algebraically correct transformed boundaries, positive durations, unchanged attack count and total rest ticks, exact bar/phrase totals, legal tie continuations, anchors, answer similarity plus ending variation, and deterministic failure when constraints cannot coexist.

**Documents:** Treat [Rhythm and Phrase-Structure Policy](../docs/music/rhythm-phrase-structure.md) as the Step 6 source for rhythm representation, exact grids/budgets, displacement/tie semantics, phrase construction, candidate order, and failures. Record listening-test results separately before changing explicitly labelled calibration bands; do not present the numeric bands as universal theory.

**ATD stewardship:** Link only behavior-bearing duration/anchor/phrase code and tests to `rule_complete_four_four_measures`, `rule_preserve_metrical_anchor`, and applicable phrase requirements; run targeted traceability checks. Keep tick representation, candidate enumeration, numerical calibration, and test tooling out of ATD.

## 7. Build pitch planning, orchestration, and final validation

**Tests:** Add failing unit/property suites from [Pitch Planner and Validation Policy](../docs/music/pitch-planner-validation.md): seed-independent canonical enumeration; Neutral/Jazz vocabulary; contour; leap caps/budgets; recognized two-note runs with one interval and three-note runs with two same-direction intervals; rejection of two same-direction leaps without the complete three-note chord-tone run; recovery; range/window boundaries; abstract-tension binding per harmony/rhythm pair; low-chaos nearest-note rank; legal tension/chaos re-ranking; equal-rank tie cases proving the seed tie-break is reachable, seed-sensitive, and reproducible with MIDI used only after a tie-key collision; stable harmony/rhythm indices, equal-rank stream ordering, and fallback exhaustion; every typed failure; open endpoints; and full same-intent/seed reproduction.

**Implement:** Separate stable candidate enumeration from legal musical ranking, then implement octave expansion/hard filters, Neutral/Jazz state, contour forward checking, corrected arpeggio/recovery state, low-chaos distance ranking, tension/chaos ranking, equal-rank seed keys, and deterministic backtracking per [Canonical enumeration, ranking, and deterministic search](../docs/music/pitch-planner-validation.md#canonical-enumeration-ranking-and-deterministic-search). The outer orchestrator receives `GenerationIntent`; for each fixed or Varying window candidate it constructs a resolved core request, iterates canonically indexed harmony then rhythm candidates, binds abstract tension requirements, runs pitch/validation, and exhausts without replacement per [Orchestration, Varying resolution, and failure](../docs/music/pitch-planner-validation.md#orchestration-varying-resolution-and-failure).

**Verify:** Run broad deterministic seed matrices for every profile/register and representative control combination. Add full-pipeline Varying fixtures for all eight successful-window subsets, selected-window seed sensitivity, identical-seed reproduction, no-success, and search-limit indeterminacy; assert only validated successful windows can be selected and the retained core request is resolved. Execute [Independent whole-result validation](../docs/music/pitch-planner-validation.md#independent-whole-result-validation), prove stable harmony/rhythm/pitch fallback order and tie-key behavior, distinguish exhausted no-plan from `search_limit_exceeded`, then run the complete domain suite, typecheck, lint, and coverage report.

**Documents:** Treat [Pitch Planner and Validation Policy](../docs/music/pitch-planner-validation.md) as the Step 7 source for ownership, candidate/ranking policy, state machines, orchestration, typed failures, and independent validation. Keep [Melodic Control Models](../docs/music/melodic-control-models.md), [Saxophone Profile Ranges](../docs/music/saxophone-profile-ranges.md), and profile summaries linked as rationale; document any finite search ceiling and regression-seed matrix as engineering policy, with unresolved musical weights/strictness labelled for listening tests.

**ATD stewardship:** Apply precise behavior/test links across governed pitch, Jazz, leapiness, recovery, arpeggio, tension, range, seed, and endpoint rules; run traceability/semantic checks with explicit review and required signoff for STABLE `rule_instrument_profile_range`. Keep search strategy, candidate ordering, evidence, calibration, and tooling outside ATD.

## 8. Implement written-notation transformation and VexFlow engraving

**Tests:** Add unit tests for Concert/B-flat/E-flat chromatic and diatonic transforms, enharmonic minimization with sharp tie-breaks, key/tonal/chord/slash-bass consistency, chord-quality preservation, and source-timeline immutability. Add browser/visual tests for clef, key/time signatures, notes, rests, beams, ties, accidentals, barlines, chord symbols, one SVG system, font readiness, resize, and explicit layout failure.

**Implement:** Pin VexFlow 5 and package its required notation font assets. Build a pure display transformation followed by a narrow VexFlow adapter and layout preflight that budgets all four measures at an agreed legibility floor, redraws after fonts/container readiness, and returns a typed notation error instead of scrolling, splitting, clipping, or indefinite shrinking. Provide a semantic text representation alongside the SVG.

**Verify:** Run transform tests, browser integration tests, fixed-seed screenshot baselines, SVG/container bound assertions, production bundle inspection, offline asset checks, and tests proving display switches never alter source events or generation state.

**Documents:** Record the pinned VexFlow API boundary, notation-font license/assets, mapping from domain events to engraving objects, sizing/failure policy, accessible score representation, and upgrade procedure.

**ATD stewardship:** Link transformation, engraving decisions that enforce product behavior, and tests to `module_notation_display_convention` and `rule_notation_display_preserves_phrase`; do not create atoms for VexFlow itself.

## 9. Build the responsive, accessible phrase workspace

**Tests:** Add component tests first for radiogroup roving tabindex, read-only-during-generation controls, presets, tempo, theme, generate/regenerate/retry flows, retained prior score, profile-switch outcomes, notation errors, and live-region announcements. Add Playwright cases for landscape mobile/tablet, wide desktop, portrait rotate notice, 44px targets, focus visibility, reduced motion, and axe scans.

**Implement:** Build the workspace/component tree and state orchestration from the approved handoff. Rewrite `ui_ux/ui_common.css` into the production Tailwind 4 theme/component layers while preserving the approved visual direction, breakpoints, state styling, typography, and motion. Implement theme as in-memory System/Light/Dark presentation state, with no phrase redraw or persistent preference.

**Unsupported rhythm settings:** Until a rhythm-grammar fix exists (tracked in [the roadmap](roadmap.md#explicitly-unresolved-decisions)), the workspace must not start generation for these note density + silence + syncopation settings, whatever the tension arc: Quarter + Sparse + Active displacement, Quarter + Breath-heavy + Active displacement, Sixteenth + Sparse + Active displacement, Sixteenth + Conversational + Active displacement, Sixteenth + Breath-heavy + Occasional offbeats, and Sixteenth + Breath-heavy + Active displacement. The controls stay selectable, so choosing values never feels locked. When the current selection matches one of these settings, disable Generate/Regenerate, keep any prior score visible, and show a calm inline message next to the rhythm controls, announced through the polite live region, for example: "This mix of note density, silence, and syncopation can't form a four-bar phrase yet. Try a lighter syncopation, a different note density, or another silence setting." Suggest the nearest supported change, such as Occasional offbeats instead of Active displacement, without applying it for the player. Presets never land on these settings. Source the unsupported list from one domain-owned constant that is checked against the rhythm planner's `no_legal_rhythm_plan` results, so the list cannot drift from the planner. Delete the constant and this block when a grammar fix makes the settings playable. Add component and E2E tests for the disabled state, the message, the live-region announcement, and recovery once a supported value is selected.

**Generation speed:** Step 7 generation averages about 0.57 s, but the worst case is about 12.5 s. The slow settings are Mixed density with Active displacement (Mixed/Conversational/Active is about 12 s), because each generation builds and ranks the full rhythm domain. The profile splits the time among `enumerateSyncopationTemplates` (about 7.6 s), `deepFreeze` (about 2.6 s) and `validateRhythmCandidate` (about 2.6 s); see [the generative process](generative-process.md) §10. Before wiring Generate and Regenerate, keep the UI responsive and bound the wait. First cache the seed-independent canonical rhythm domain per rhythm setting and reuse it across generations and regenerations. Also run generation off the main thread, for example in a Web Worker, so read-only-during-generation controls and the retained prior score stay interactive. Speeding up the Step 6 enumeration (pinned by its manifest) or switching to bounded-prefix ranking changes the documented design and needs explicit sign-off. Measure worst-case and typical latency on the target mobile/tablet and desktop devices, and record an agreed budget.

**Verify:** Run component/E2E/accessibility suites in all specified viewports and themes; manually inspect keyboard-only operation, responsive score priority, portrait guard, no overflow, reduced motion, and state/error transitions against the UI handoff.

**Documents:** Update `ui_ux/README.md` and relevant strategy/handoff files to name the production Tailwind theme/component files as the styling source of truth and explain how future UI/UX alterations flow into them. Document the component/state map and accessibility behavior.

**ATD stewardship:** Link behavior-bearing workspace/state/responsive code and tests to `req_landscape_phrase_workspace`, `user_story_controlled_phrase_generation`, and `rule_presentation_preference_preserves_phrase`; keep purely visual utility classes outside ATD unless they enforce a governed behavior.

## 10. Complete end-to-end release hardening and traceability

**Tests:** Expand Playwright into the full first-release journey: defaults, all controls, generate/regenerate, deterministic replay hooks, profile retain/regenerate paths, all notation modes, theme isolation, initial/later generation errors, notation retry, concurrent-operation prevention, offline reload, responsive layouts, accessibility, and explicit absence of MIDI/playback/scoring/persistence behavior.

**Implement:** Close integration gaps, add stable test fixtures/failure injection at module seams, finalize PWA asset caching and production configuration, optimize only measured bundle/layout bottlenecks, and remove any accidental server/storage/optional-scope coupling.

**Verify:** Run the complete quality gate in a clean production-like environment: formatting, lint, strict typecheck, unit/component/property tests, Playwright browser matrix, axe scans, visual baselines, production build, offline test, ATD lint/link/semantic coverage, and final acceptance against every master-spec definition-of-done item.

**Documents:** Finalize README setup/operations, architecture and verification matrix, supported-browser/offline limits, third-party licenses, release checklist, and known deferred scope. Reconcile the master spec, roadmap, and UI/UX handoffs with delivered behavior without silently changing product intent.

**ATD stewardship:** Run final source/test traceability and orphan checks, correct only verified links, synchronize affected business atoms to the delivered behavior through the documentalist workflow, and report any remaining drift or signoff requirement rather than rewriting intent to match code.

## Known Implementation Risks

- Listening calibration remains necessary for harmony-template ordering, attack/rest bands, answer similarity, contour strictness, optional ornaments, and perceived spacing among controls.
- Stable hash encoding, named stream labels, candidate identities, and unsigned interpretation require versioned golden fixtures to preserve cross-runtime determinism.
- Finite search can be computationally expensive. A search ceiling must be explicit and versioned; reaching it is indeterminate and must never be reported as musical infeasibility.
- Preserve the distinction between outer `GenerationIntent` and the resolved core `GenerationRequest` whenever generator architecture documentation changes.
