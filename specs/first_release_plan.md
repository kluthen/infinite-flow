# Infinite Flow First-Release Implementation Plan

Status: approved for implementation

## Objective and Scope

Implement the approved first release as a browser-only Vue application that generates and engraves one four-measure musical phrase. Each delivery step is test-first and includes implementation, verification, documentation, and business-focused ATD stewardship.

The authoritative product inputs are [the first-release master specification](first-release-master-spec.md), [the roadmap](roadmap.md), [the generator contract](generator-contract.md), [the generator architecture](generator-architecture.md), and the UI/UX set beginning at [`ui_ux/index.md`](../ui_ux/index.md). The release excludes persistence, a backend, MIDI access, playback, scoring, adaptation, and microphone input. End-user state exists only in memory for the active session.

## Technology and Delivery Decisions

- Use Vue 3, strict TypeScript, Vite, Tailwind 4, Vitest, Vue Test Utils, Playwright, and `@axe-core/playwright`.
- Use pinned VexFlow 5 through a narrow SVG engraving adapter. Written notation is derived from the immutable concert timeline and must fail explicitly when it cannot satisfy the one-system legibility contract.
- Use hand-written boundary parsers and invariant validators for the closed internal event model, plus a small documented deterministic 32-bit PRNG with golden tests.
- Keep session coordination in a root-created composable. Do not add Pinia unless later scope introduces independent global stores.
- Use `vite-plugin-pwa` only to precache immutable application assets. Do not place end-user or session state in localStorage, sessionStorage, IndexedDB, or cache entries.
- Tailwind becomes the production styling authority. Preserve the approved UI/UX visual language while consolidating runtime tokens and utilities into the Tailwind theme/style files.
- Update the UI/UX index and handoffs when production styling moves, so future design alterations point to the correct source of truth.
- Tool and library choices do not create ATD atoms. ATD stewardship traces business intent and behavior through precise implementation and test links.
- Every source file must have an honest, precise implementation link. Co-locate passive labels/constants with an owning linked module when they do not represent an independent business boundary; never add catch-all or phantom links.
- The implementation-facing musical guides are [Harmony Planner Policy](../docs/music/harmony-planner-policy.md), [Rhythm and Phrase-Structure Policy](../docs/music/rhythm-phrase-structure.md), and [Pitch Planner and Validation Policy](../docs/music/pitch-planner-validation.md). Their numerical calibration policies remain subject to listening tests.

## Pre-Execution Gates

Before Step 1:

1. Create a dedicated git worktree from the default branch for this major greenfield feature, verify the intended baseline, and perform all implementation there without disturbing the primary checkout.
2. Obtain human signoff for implementing the STABLE instrument range/register-window invariant.
3. Capture only settled, business-intent-bearing generator orchestration, control/request behavior, workspace state-flow, and verification boundaries needed for traceability. Do not create ATD content for Vue, Tailwind, VexFlow, package configuration, file layout, or other tooling choices.

## 1. Establish the Executable Client and Quality Gates

**Tests:** Scaffold Vitest, Vue Test Utils, Playwright, and `@axe-core/playwright`. Add smoke tests for application mount, the empty workspace, and production startup. Define scripts for formatting, lint, typecheck, unit/component tests, E2E tests, build, and traceability checks.

**Implement:** Create the Vue 3, strict TypeScript, Vite, and Tailwind 4 client. Establish domain, component, composable, style, test, and public-asset boundaries. Add PWA support for immutable assets only and prohibit browser persistence APIs for user/session state.

**Verify:** Run typecheck, lint, smoke tests, Playwright startup, and the production build. Confirm required behavior has no server runtime or persisted user-data dependency.

**Documents:** Update the root README with prerequisites, commands, directory boundaries, browser-only constraints, and a release verification matrix.

**ATD stewardship:** Confirm the pre-execution business-boundary capture and stable-contract signoff, validate the documentation structure, and retain governing atom IDs for later precise links. Do not link generic tooling configuration.

## 2. Define the Immutable Musical Contract and Deterministic Foundations

**Tests:** Add failing tests for request/result construction, exact four-measure 4/4 shape, immutable concert events, exact duration arithmetic, invalid input rejection, fixed PRNG sequences, and exclusion of display/session fields from generator data.

**Implement:** Define the event schema, exact duration representation, request/result types, boundary parsers, invariant validators, immutable constructors, seed identity, and named deterministic random streams.

**Verify:** Run focused contract and PRNG tests, typecheck, immutability assertions, and golden-seed reproduction across repeated runs.

**Documents:** Finalize event shapes, duration semantics, validation failures, seed behavior, and ownership boundaries in the generator documents.

**ATD stewardship:** Place precise implementation and test links for four-measure completion and deterministic reproduction. Keep browser and presentation state outside those boundaries.

## 3. Implement Declarative Instrument Profiles and Register Policy

**Tests:** Cover all C keyboard, B-flat tenor, and E-flat alto ranges/windows; invalid profiles; fixed Low/Middle/High resolution; canonical window identities; deterministic register-stream keys; display-state independence; and no mid-phrase window changes. Do not test complete Varying feasibility before the full planner exists.

**Implement:** Create declarative profiles, range/window value objects, an outer register intent, deterministic window-order/key primitives, and core requests that always contain one resolved window. Implement profile-switch retain/regenerate validation without instrument-specific planner branches. Step 7 owns complete Varying feasibility.

**Verify:** Test boundary MIDI values, window identities, seeds, and presentation variants. Prove that every core request has one contained resolved window and obtain stable-contract signoff.

**Documents:** Document profile extension, outer intent versus resolved core request, canonical window identities, and profile-switch behavior. Preserve the policy in [Register-Window Research](../docs/music/Saxophone%20profile%20ranges/register-windows.md).

**ATD stewardship:** Link profile definitions, validators, switch policy, and tests to the governing profile/range business behavior and review coverage of the STABLE invariant.

## 4. Implement Controls, Presets, and Request Construction

**Tests:** Cover every control and default, tempo bounds/steps, complete Neutral/Jazz bundle replacement, custom configuration, retained grammar, fresh-seed regeneration, and exclusion of theme/notation from generation requests.

**Implement:** Build typed control catalogs, normalization, preset bundles, the request factory, seed renewal, and a root-created in-memory session composable with readonly state and explicit actions.

**Verify:** Run focused mapping/session tests, typecheck, and lint. Inspect representative requests for completeness and absence of presentation/browser data.

**Documents:** Record defaults, normalization, preset/custom transitions, request creation, and session-only state ownership.

**ATD stewardship:** Link controlled generation, presets, seeded reproduction, and presentation isolation at their behavior boundaries. Ensure every source file has one honest precise link without inventing boundaries for passive labels.

## 5. Build the Harmony and Tension Planner

**Tests:** From [Harmony Planner Policy](../docs/music/harmony-planner-policy.md), cover every collection and derived triad; tonal/modal static, gentle, and active templates; event limits; Neutral/Jazz domain parity; abstract tension requirements; open endpoints; complete domain expansion; stable identities/indices; empty-domain failure; and seed-independent reproduction.

**Implement:** Implement the collection/triad vocabulary, tonal/modal templates, quarter-boundary harmony events, endpoint classes, abstract tension requirements, and a complete immutable `HarmonyCandidateDomain`. Do not bind rhythm onsets or return only one selected plan.

**Verify:** Sweep all tonal centers, collections, motion levels, tension arcs, and profiles. Reconstruct every triad independently and verify event limits, parity, stable enumeration, modal safeguards, and open endpoints without altered/borrowed harmony.

**Documents:** Keep Harmony Planner Policy synchronized with implementation, including its authority/evidence/inference distinction, event mapping, candidate order, failures, and calibration questions.

**ATD stewardship:** Trace governed neutral harmony, tension, and open-ending behavior. Keep template tables, candidate order, evidence, calibration, and tooling outside ATD.

## 6. Build the Rhythm and Phrase-Structure Planner

**Tests:** From [Rhythm and Phrase-Structure Policy](../docs/music/rhythm-phrase-structure.md), cover 16-tick bars and 64-tick phrases; every density grid and attack band; rest budgets; Straight/Occasional/Active syncopation; signed boundary movement for note-to-note and interior-rest translation; tied sustain; unchanged attack/rest totals; exact tiling; tick-0-or-8 anchors; gesture/answer behavior; canonical order; failures; and reproduction.

**Implement:** Build the nominal skeleton and joint density/silence allocator, algebraic syncopation transformations, tie intents, exact anchors, and bars 3-4 as a transformed answer to bars 1-2. Return the complete finite rhythm domain without inspecting harmony or assigning pitches.

**Verify:** Retile every generated measure and property-test every density, silence, and syncopation combination. Confirm positive durations, exact totals, legal ties, anchors, answer similarity/variation, and deterministic failure.

**Documents:** Keep Rhythm and Phrase-Structure Policy synchronized with representation, grids/budgets, displacement/ties, phrase construction, ordering, failures, and listening-test calibration.

**ATD stewardship:** Trace exact 4/4 completion, metrical anchors, and governed phrase behavior. Keep tick representation, candidate enumeration, calibration, and tooling outside ATD.

## 7. Build Pitch Planning, Orchestration, and Final Validation

**Tests:** From [Pitch Planner and Validation Policy](../docs/music/pitch-planner-validation.md), cover canonical enumeration; Neutral/Jazz vocabulary; contours; leap budgets; recognized two- and three-note arpeggio runs; recovery; ranges/windows; abstract-tension binding; low-chaos nearest-note preference; legal ranking; reachable seeded ties; fallback exhaustion; typed failures; open endpoints; and complete intent/seed reproduction.

**Implement:** Separate stable enumeration from musical ranking. Implement octave expansion, hard filters, profile grammar, contour forward checking, leap/recovery/arpeggio state, chaos/tension ranking, seeded equal-rank ordering, and deterministic backtracking. For each fixed or Varying window, construct a resolved core request and exhaust harmony/rhythm/pitch candidates without replacement.

**Verify:** Run broad seed matrices for every profile/register and representative controls. Cover all eight successful-window subsets, seed-sensitive selection, no-success, and search-limit indeterminacy. Independently validate every result and distinguish proven no-plan from `search_limit_exceeded`.

**Documents:** Keep Pitch Planner and Validation Policy synchronized with ownership, ranking, state machines, orchestration, failures, and validation. Version search ceilings and regression-seed fixtures as engineering policy.

**ATD stewardship:** Trace governed pitch, Jazz, leap, recovery, arpeggio, tension, range, seed, and endpoint behavior. Keep search strategy, ordering, evidence, calibration, and tooling outside ATD.

## 8. Implement Written-Notation Transformation and VexFlow Engraving

**Tests:** Cover Concert/B-flat/E-flat transforms, enharmonic minimization, key/tonal/chord/slash-bass consistency, chord-quality preservation, source immutability, required notation elements, one SVG system, font readiness, resize, accessibility text, and explicit layout failure.

**Implement:** Pin VexFlow 5 and package required notation fonts. Build a pure display transformation and narrow SVG adapter with layout preflight at an agreed legibility floor. Return a notation error rather than scrolling, splitting, clipping, or shrinking indefinitely; provide semantic text alongside the SVG.

**Verify:** Run transform tests, browser integration, fixed-seed visual baselines, SVG/container bounds, production bundle inspection, offline assets, and assertions that display switches never mutate generation state.

**Documents:** Record the VexFlow boundary, font licenses/assets, domain-to-engraving mapping, sizing/failure policy, accessibility representation, and upgrade procedure.

**ATD stewardship:** Trace notation behavior and source-phrase preservation. Do not create tooling atoms for VexFlow.

## 9. Build the Responsive, Accessible Phrase Workspace

**Tests:** Cover roving-tabindex radiogroups, generation read-only behavior, presets, tempo, theme, generate/regenerate/retry flows, retained scores, profile switches, notation failures, live regions, landscape mobile/tablet, wide desktop, portrait notice, target size, focus visibility, reduced motion, and axe scans.

**Implement:** Build the approved workspace and state orchestration. Rewrite `ui_ux/ui_common.css` into the production Tailwind theme/component layers while preserving the validated visual direction, breakpoints, states, typography, and motion. Theme remains in-memory presentation state and never triggers generation.

**Verify:** Run component, E2E, and accessibility suites across specified viewports and themes. Manually inspect keyboard operation, score priority, portrait guard, overflow, reduced motion, and error transitions against the UI handoff.

**Documents:** Update the UI/UX index and handoffs to identify the production Tailwind files as the styling source of truth and document component/state and accessibility behavior.

**ATD stewardship:** Trace governed workspace, orientation, generation, and presentation behavior. Keep purely visual utilities outside ATD unless they enforce a governed requirement.

## 10. Complete End-to-End Release Hardening and Traceability

**Tests:** Exercise defaults, every control, generation/regeneration, deterministic replay, profile retention/regeneration, notation modes, theme isolation, initial/later generation errors, notation retry, concurrency prevention, offline reload, responsive layouts, accessibility, and explicit absence of MIDI, playback, scoring, and persistence.

**Implement:** Close integration gaps, add stable fixtures and failure injection at module seams, finalize asset caching and production configuration, optimize only measured bottlenecks, and remove accidental deferred-scope coupling.

**Verify:** In a clean production-like environment run formatting, lint, strict typecheck, unit/component/property tests, Playwright browser coverage, axe, visual baselines, production build, offline checks, traceability checks, and every master-spec definition-of-done item.

**Documents:** Finalize setup/operations, architecture and verification matrix, supported-browser/offline limits, third-party licenses, release checklist, and deferred scope. Reconcile implementation with the master spec, roadmap, and UI/UX handoffs without silently changing intent.

**ATD stewardship:** Run final source/test traceability and orphan checks, correct only verified links, synchronize affected business documentation to delivered behavior, and report remaining drift or signoff requirements.

## Known Implementation Risks

- Listening calibration remains necessary for harmony-template ordering, attack/rest bands, answer similarity, contour strictness, optional ornaments, and perceived spacing among controls.
- Stable hash encoding, named stream labels, candidate identities, and unsigned interpretation require versioned golden fixtures to preserve cross-runtime determinism.
- Finite search can be computationally expensive. A search ceiling must be explicit and versioned; reaching it is indeterminate and must never be reported as musical infeasibility.
- Preserve the distinction between outer `GenerationIntent` and the resolved core `GenerationRequest` whenever generator architecture documentation changes.
