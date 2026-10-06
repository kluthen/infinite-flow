# Infinite Flow v2 — Build Plan

Status: draft v0.7 (2026-10-06). Chunk 0 is done. Build plan for v2, released as one v2.0 since
spec D183, its parts still labelled v2.0, v2.1, v2.2 and v2.4,
written from [master spec v1.20](master-spec.md) and kept in step with it since (v1.28). Not yet
approved for execution. Change in v0.3: the spec gaps are resolved, so the phrase-boundary change
and the key change's harmonic drop move from chunks 7 and 8 to chunk 24 in v2.1, and each chunk is
blocked only by what is still open. Change in v0.4, the owner's decisions of 2026-10-03 (spec
D173–D180): the real-hardware checks leave the v2.0 and v2.1 gates (chunks 21 and 26) for a
new release, v2.4, with its own gate, [chunk 35](#chunk-35--v24-release-gate-real-hardware-checks); the chord-fit check
(chunks 32–34, the former v2.3) leaves v2 for v3 as a nice-to-have, and its chunks stay below as
notes, out of every wave; and the answers to O77, O93, O98 and O99 unblock chunks 24, 25 and
27–30, apart from their designs. Change in v0.5, the owner's decisions of 2026-10-05 (spec
D183–D186): v2.1, v2.2 and v2.4 are compacted into one release, v2.0, with one gate,
[chunk 21](#chunk-21--v20-release-gate), which absorbs chunks 26, 31 and 35, the real-hardware
checks included; the backing (O57) and chunk 17's silence-timer choices are accepted as built.
Change in v0.6 (spec D187–D189): chunk 21 gains the wake lock asked for again when the browser
drops it mid-session (O87), a code unit after the ISS-006 fix; the audio mix is final as built
(ux Q31). Change in v0.7 (spec D191, D193), the owner's answers after the hardware sitting of
2026-10-06: Bluetooth MIDI is best-effort and USB the tested path (O71), and the real-program
export checks follow the v2.0 tag as a v2.0.x hand-check note instead of blocking it (O105).

This plan cuts v2 into chunks that one owner can build, test and document at a time, and puts
them in order. It adds no behaviour. What the app does is in the [master spec](master-spec.md);
what the interface looks like is in the UI/UX design set, starting at
[`ui_ux/README.md`](../../../ui_ux/README.md). Where this plan disagrees with either, they win, and
the plan is corrected.

It is read by whoever builds v2, and by the owner. Music terms are explained where they first
appear, with a link to the project [lexicon](../../../docs/music/lexicon.md) when it has an entry.

> **Read first:** [the notation-layout caveat](#2-read-first-the-notation-layout-caveat). Two v2
> design decisions change the layout planner v1 shipped, and the stylesheet on `main` already
> assumes them.

## 1. Overview

### Release sequence

v2 ships as one release, v2.0 (spec D183). It was planned as four releases, v2.0, v2.1, v2.2 and
v2.4, each with its own gate; on 2026-10-05 the owner compacted them into one.
[Chunk 21](#chunk-21--v20-release-gate) is the single release gate. It checks the whole
[definition of done](master-spec.md#11-definition-of-done), the real-hardware checks included,
and chunks 26, 31 and 35, the former gates of v2.1, v2.2 and v2.4, are folded into it. The labels
v2.1, v2.2 and v2.4 stay on the chunks below, in master spec §11 and in the atoms' tags, as names
for parts of v2.0's scope; none is a release. v2.3 is empty: the chord-fit check it held is a v3
nice-to-have (spec D174), and the number is not reused.

| Release | Delivers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Chunks                  |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| v2.0    | The core loop (chunks 0–20): phrases that keep coming and join smoothly, backing, click and count-in, sessions, MIDI note acknowledgement and the controller check, the last-session review, the export of the generated notes, settings locked during a session, and the three changes to v1 at Idle. Part v2.1 (22–25): the played notes in the review, with their own MIDI export; the settings-mutation flag. Part v2.2 (27–30): adaptive tempo; the multi-phrase tension arc. Part v2.4: the real-hardware checks. One gate, chunk 21, absorbing the former gates 26, 31 and 35. | 0–35 without 32–34 (33) |

Chunks 0 and 1 are prerequisites. They are counted in v2.0.

With one release, no chunk waits for a release to ship: each waits for the chunks it depends on
and, for an interface chunk, its design. Every chunk but the gate is done.

### Prerequisites

[Master spec §11](master-spec.md#prerequisites-that-must-already-be-in-place) lists two
prerequisites. The code and the registers add three more.

- **The v1.0 gate: done.** Instrument templates carry their own written-pitch transposition,
  rhythmic variety replaced the old "Mixed" setting, and profile behaviour runs on capability
  flags. v1.0 was tagged on 2026-09-26.
- **Generation latency, re-measured: done in [chunk 1](#chunk-1--baseline-checks) on 2026-09-29,
  on a cloud virtual machine, for reference only, and re-run on the owner's reference machine on
  2026-09-30.** The owner decided on 2026-09-29 that no performance figure from a virtual machine
  gates the plan (see [step 4](#3-workflow-for-every-chunk)); the 2026-09-30 figures are the ones
  that gate. The look-ahead deadline must keep comfortable headroom at 240 BPM, the fastest
  tempo, including a cold generation. A generation is "cold" when it is the first one for a combination of settings,
  before the generator's caches for that combination are warm. The spec asks for the cold run
  after a mid-session control change from v2.1, when the settings-mutation flag can cause one:
  nothing changes a setting during a v2.0 session. Chunk 1 measures it with the rest, since the
  harness is the same, and its figure gates [chunk 24](#chunk-24--settings-mutation-engine).
  - At 240 BPM one bar lasts one second. A look-ahead phrase normally has three bars: it is
    requested when the phrase before it starts sounding, and is due when that phrase's last bar
    starts ([§4](master-spec.md#4-look-ahead-and-failure-handling)).
  - Two cases have only one bar. Phrase 2 is generated during the one-bar count-in. From v2.1, a
    look-ahead phrase regenerated after an automatic settings change needs at least one bar left
    ([§5](master-spec.md#5-control-changes-during-a-session)).
  - A failed attempt is retried up to four times inside that window.
  - The [open-questions register](../../open-questions.md#v2-spec-questions-o50) sets the working
    target: the cold worst case stays under a quarter of one bar at 240 BPM, 250 ms in Chromium.
  - The reference-machine figures in
    [`docs/generation-latency.md`](../../../docs/generation-latency.md#v2-re-run-on-the-reference-machine-2026-09-30)
    miss that target on the worst case: 1,016 ms cold in Node, and 829-951 ms from click to
    "Phrase ready" in Chromium for the densest settings. The medians are far lower (17.8 ms cold
    in Node). The deadline itself holds everywhere except a v2.1 regeneration after a
    rhythm-control change that needs retries. On 2026-09-30 the owner decided that the 250 ms
    target is, for now, a goal to aim for and not a gate: `rule_look_ahead_deadline` is the gate,
    so the session engine ([chunk 8](#chunk-8--session-engine)) and
    [chunk 10](#chunk-10--audio-transport) may start. The v2.1 case still goes to
    [chunk 24](#chunk-24--settings-mutation-engine).
- **Engraving on the main thread against the audio scheduler: measured by chunk 1, applied by
  [chunk 10](#chunk-10--audio-transport).** Engraving runs on the page's main thread. If it blocks
  longer than the audio scheduler's look-ahead window (200 ms proposed), sound could come late.
  The spec's default is to run the scheduler's wake-up timer in a Web Worker
  ([§12](master-spec.md#12-open-questions-carried-forward)). Chunk 1 checks whether that is
  enough.
- **The v2 business atoms: done in [chunk 0](#chunk-0--atd-ingestion-of-the-master-spec) on
  2026-09-29.** The master spec is ingested into ATD: 90 new atoms, each tagged with its release,
  and the v1 atoms v2 contradicts revised in place. The same day, nine atoms were revised to match
  master spec v1.19, and the two about applying a setting change at a phrase boundary moved to
  v2.1. Two things remain, both assigned: the owner's sign-off on the revised product vision, and
  small drifts between the code and the new atoms, each fixed by the chunk that changes that code.
- **The browser boundaries: [chunk 2](#chunk-2--browser-boundaries).** v1's lint rules and
  boundary script forbid Web Audio and Web MIDI anywhere in `src/`. Chunk 2 allows them in named
  places only, before any audio or MIDI code lands.

### Waves

Chunks are grouped in waves. A wave starts when every chunk it depends on has merged. Chunks in
one wave touch different source files, so separate owners can build them side by side, each in
its own worktree. Shared documents (the README, a doc under `docs/`) may be touched by several
chunks in different sections; the second to merge rebases on the first.

| Wave | Chunks                                                                                                                                                                                                                                                                                                                                                                        | Waits for                                                                     |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 0    | 0 ATD ingestion (done 2026-09-29) · 1 Baseline checks (done 2026-09-29), follow-up Performance: cold generation (done 2026-09-30)                                                                                                                                                                                                                                             | Nothing                                                                       |
| 1    | 2 Browser boundaries (done 2026-09-29) · 3 Notation layout v2 (done 2026-09-29), follow-up 3b Phone staff height (done 2026-09-29) · 4 Note density on small screens (done 2026-09-29) · 7 Generator continuation (done 2026-09-29) · 14 Note acknowledgement (done 2026-09-29) · 18 MusicXML encoding (done 2026-09-29) · 19 Generated-notes MIDI encoding (done 2026-09-29) | Chunk 0 (done). Start chunk 3 first (see the caveat).                         |
| 2    | 5 Idle fit retries and the room notice (done 2026-09-30) · 6 Note identity and session overlays (done 2026-09-30) · 8 Session engine (done 2026-09-30) · 10 Audio transport (done 2026-09-30)                                                                                                                                                                                 | Wave 1. Chunk 1's verdict: given (2026-09-30).                                |
| 3    | 9 Session history (done 2026-09-30) · 11 Backing (done 2026-09-30) · 12 MIDI input (done 2026-10-01)                                                                                                                                                                                                                                                                          | Wave 2                                                                        |
| 4    | 15 Session screen: start and end (done 2026-10-01)                                                                                                                                                                                                                                                                                                                            | Wave 3                                                                        |
| 5    | 13 Controller connection (done 2026-10-01) · 16 Rolling display (done 2026-10-01)                                                                                                                                                                                                                                                                                             | Chunk 15                                                                      |
| 6    | 17 MIDI in the session (done 2026-10-02)                                                                                                                                                                                                                                                                                                                                      | Wave 5                                                                        |
| 7    | 20 Review and generated-notes export (done 2026-10-02; its hand checks are in chunk 21)                                                                                                                                                                                                                                                                                       | Chunk 17                                                                      |
| 8    | 22 Played-notes MIDI encoding (done 2026-10-03) · 24 Settings-mutation engine (done 2026-10-03)                                                                                                                                                                                                                                                                               | Chunks 4, 7, 8, 9 and 19                                                      |
| 9    | 23 Review: played notes (done 2026-10-04) · 25 Settings-mutation control (done 2026-10-05)                                                                                                                                                                                                                                                                                    | Wave 8, waves 0–7, and their designs                                          |
| 10   | 27 Adaptive tempo engine (done 2026-10-03) · 29 Multi-phrase tension arc (done 2026-10-04)                                                                                                                                                                                                                                                                                    | Waves 0–7, and chunk 24 for chunk 29                                          |
| 11   | 28 Adaptive tempo control (done 2026-10-05) · 30 Tension arc control (done 2026-10-05)                                                                                                                                                                                                                                                                                        | Wave 10, wave 9, and their designs                                            |
| 12   | 21 v2.0 release gate, the single gate: it absorbs the former gates 26 (v2.1), 31 (v2.2) and 35 (v2.4, the real-hardware checks)                                                                                                                                                                                                                                               | Every other v2 chunk, and the reference hardware for the real-hardware checks |

The chord-fit chunks 32–34 are in no wave: they left v2 (spec D174) and are kept below as notes
for v3. The gate waves of the four planned releases (former waves 8, 11, 14 and 15) are now the
one final wave, 12 (spec D183), and the waves between them are renumbered 8–11. The core loop's critical path ran through chunks 0, 7, 8, 9, 15,
16, 17, 20 and 21; every chunk but the gate is done. The graph below shows the core loop's
dependencies; each chunk's **Depends on** line is the reference.

```mermaid
flowchart LR
  C0[0 ATD] --> C2[2 Boundaries]
  C0 --> C3[3 Layout v2]
  C0 --> C4[4 Density]
  C0 --> C7[7 Continuation]
  C0 --> C14[14 Acknowledgement]
  C0 --> C18[18 MusicXML]
  C0 --> C19[19 Generated MIDI]
  C1[1 Baseline] --> C8[8 Session engine]
  C1 --> C10[10 Audio transport]
  C3 --> C5[5 Idle fit and notice]
  C4 --> C5
  C3 --> C6[6 Overlays]
  C4 --> C8
  C7 --> C8
  C2 --> C10
  C7 --> C9[9 History]
  C8 --> C9
  C18 --> C9
  C19 --> C9
  C10 --> C11[11 Backing]
  C2 --> C12[12 MIDI input]
  C10 --> C12
  C5 --> C15[15 Session screen]
  C8 --> C15
  C9 --> C15
  C11 --> C15
  C12 --> C13[13 Connection sheet]
  C15 --> C13
  C3 --> C16[16 Rolling display]
  C6 --> C16
  C15 --> C16
  C13 --> C17[17 MIDI in session]
  C14 --> C17
  C16 --> C17
  C17 --> C20[20 Review and export]
  C9 --> C20
  C20 --> C21[21 v2.0 gate]
```

## 2. Read first: the notation-layout caveat

The first chunk that touches notation, [chunk 3](#chunk-3--notation-layout-v2), carries this
caveat. It sits near the top because it changes code v1 shipped, and because `main` is already in
an in-between state.

**Two design decisions change v1's layout planner.** Both apply below `bp-tablet-landscape`, the
width (64rem) where the design switches to its tablet-landscape layout; below it is the landscape
phone. A staff system is one line of [staff](../../../docs/music/lexicon.md#staff), read left to
right.

- **(a) The score is always engraved split.** Bars 1–2 go on the top system and bars 3–4 on the
  one below, at idle as in a session. The planner never tries one system first, as v1 does. This
  is what lets a session start without moving a single note.
- **(b) The scale fits both the width and the height.** The engraving scale is the largest that
  fits both, never below the legibility floor (5 px per staff space). The engraver reads the
  height budget from `staff-frame`'s computed `max-block-size`, which is built from
  `--staff-systems-phone-block-budget` and the small viewport height (`100svh`, the height with the
  browser's toolbars showing). So a toolbar showing or hiding never causes a redraw. The reserved
  system positions there therefore depend on the viewport height.

**Related changes in the same area:**

- One `staff-content` unit per system position, each its own engraving. v1 draws a split phrase
  as one SVG (`drawTwoSystems` in `src/notation/vexflow-two-system-engraver.ts`).
- The staff area always reserves two systems, in every state.
- A window with no room for the staff shows `room-notice` instead of the notation error.
- At idle, a phrase too wide for the room is quietly regenerated, with up to three fresh-seed
  retries.
- `Sixteenth` note density is unavailable below `bp-tablet-landscape`.

The design is in the phrase-workspace handoff,
[Notation Contract](../../../ui_ux/screens/phrase-workspace/handoff.md#notation-contract) and
[Responsive Behavior](../../../ui_ux/screens/phrase-workspace/handoff.md#responsive-behavior),
and in the [generate-phrase handoff](../../../ui_ux/flows/generate-phrase/handoff.md).

**Where v1 does it today.** `planSystemLayout` in `src/notation/notation-layout-policy.ts` tries
one system, tries two only when the phone media query matches, and throws
`notation_below_legibility_floor` when neither fits. `PhraseScore.vue` passes the container's
width only. No code reads a height: the engraved height comes from the content. The comment in
`src/styles/components.css` that says the notation layout reads `max-block-size` describes the
target, not the code.

**Documents that still state the v1 rule.** Their owners update them when chunk 3 lands:

- [`specs/generator-architecture.md`](../../generator-architecture.md), by `spec-writer`;
- [`docs/notation-engraving.md`](../../../docs/notation-engraving.md#sizing-and-failure-policy), by
  the chunk's owner;
- [`docs/module_notation_layout_preflight.atom.md`](../../../docs/module_notation_layout_preflight.atom.md),
  by `documentalist`;
- [`docs/release/browser-and-offline-limits.md`](../../../docs/release/browser-and-offline-limits.md#minimum-viewport-and-responsive-breakpoints),
  by the chunk's owner.

**The live interim state.** `main` already carries the v2 stylesheet. Below
`bp-tablet-landscape`, `.staff-frame` has lost v1's fixed minimum block size and is capped at the
phone budget, while the v1 engraver still sizes by width only and draws whatever height its
content needs. `npm run quality` passed, but no test looks at a real phone window. So:

- the phone layout is checked by hand early, in [chunk 1](#chunk-1--baseline-checks) (wave 0);
- chunk 3 is scheduled early: it is in wave 1, and starts first.

## 3. Workflow for every chunk

Each chunk runs in its own git worktree next to the repository
(`/home/bastien/work/infinite_flow-<chunk>`), on a branch from `main`. It ends with one commit and
a `--no-ff` merge into `main`, made when the owner asks. The six steps run in this order. **A
chunk isn't finished until step 6 is done.**

1. **ATD preflight.** `documentalist` finds the atoms that govern the chunk's area, starting from
   the chunk's **Atoms** line. It checks that the change is grounded in them and flags conflicts
   or missing coverage. A missing or conflicting atom stops the chunk until it is resolved.
   - The v2 business atoms exist: [chunk 0](#chunk-0--atd-ingestion-of-the-master-spec) created
     them from master spec v1.18, and they were brought in line with v1.19 the same day. An atom
     still missing goes back to `documentalist` for ingestion.
   - If the gap is in the spec itself, it goes back to `spec-writer`; if it is in the UI/UX
     design, to `ux-writer`.
   - ATD covers business behaviour only. Technical choices (module structure, data formats,
     libraries, how the audio and MIDI adapters are built, tooling) don't go through it: they are
     recorded in the project documentation in step 5.
   - `documentalist` never runs `atd audit` while tests are running: it saturates the machine and
     makes timing-sensitive tests fail.
2. **Tests first, red to green.** Write the tests for the chunk's **Done when** criteria first,
   and see them fail for the right reason: an assertion about the missing behaviour, not an
   import or setup error.
   - **Pure logic** gets Vitest unit tests under `tests/unit/`, mirroring `src/`: session
     scheduling, look-ahead and the failure ladder, note matching, the chord-fit rule, export
     encoding, backing rendering, the density rules.
   - **Behaviour** gets scripted Playwright scenarios. The workspace harness
     (`vite.workspace-harness.config.ts`, driven through `window.__workspaceHarness`) runs the real
     app with deterministic seams: queued seeds, held or failed generations, failed engravings.
     The notation harness (`vite.notation-harness.config.ts`, run by `npm run test:notation`)
     engraves a fixture or a generated phrase in a container of a given size.
   - **Web MIDI and the audio clock are replaced by fakes**, so every test is deterministic: a
     fake MIDI access that plugs, unplugs and plays notes on command, and a fake clock the test
     advances by hand. Both now exist: [chunk 10](#chunk-10--audio-transport) created the fake
     clock and fake audio output, [chunk 12](#chunk-12--midi-input) the fake MIDI access, and both
     added them to the workspace harness. [`docs/testing.md`](../../../docs/testing.md#fake-midi-access)
     says how to drive them.
   - **Generation is seeded.** Tests queue seeds so that "same seed, same result" can be asserted.
   - A fixture that doesn't exist yet is created here, and added to the fixture list (step 5).
   - A new Playwright spec outside `tests/e2e/notation/` must be added to the `test:e2e` file list
     in `package.json`. That list is explicit: a spec left out never runs in `npm run quality`.
3. **Implement** until the tests pass. Don't change a test to make it pass unless the test itself
   was wrong, and say so in the commit message when that happens. Follow
   [`CODING_RULE.md`](../../../CODING_RULE.md): crash early, no silent fallbacks, dependency
   injection seams instead of test-only branches, an injected clock instead of direct time calls,
   and its file-size limits.
4. **Verify.**
   - The chunk's **Done when** criteria hold.
   - `npm run quality` passes on an idle machine: the whole suite, with no regression in earlier
     chunks.
   - **Performance on a virtual machine never gates.** A cloud or other virtual machine is too
     slow and too noisy to judge latency, main-thread time or any other timing budget. A chunk
     run on one checks that its measuring code runs, takes one measurement for reference, records
     it with the machine and date, and moves on; a missed figure stops nothing. The budgets are
     checked on a real computer, by the owner, before the release gate that names them. Decided by
     the owner on 2026-09-29.
   - The run is repeatable: the same seed gives the same result, and the same script on the fake
     clock and fake MIDI gives the same outcome on a second run.
   - A debug run shows the behaviour on screen: `npm run dev` in Chromium for the real app (with a
     real controller when the chunk reads MIDI), or the workspace or notation harness for a
     scripted case. Anything the chunk changes below `bp-tablet-landscape` is also looked at in a
     landscape phone-sized window.
5. **Documents.** Keep the project documentation current:
   - [`README.md`](../../../README.md): commands, directory boundaries, runtime constraints,
     architecture overview.
   - The technical choices made in the chunk, and why, in the document that owns the area:
     [`docs/phrase-workspace.md`](../../../docs/phrase-workspace.md),
     [`docs/notation-engraving.md`](../../../docs/notation-engraving.md),
     [`specs/generator-architecture.md`](../../generator-architecture.md) (through `spec-writer`),
     or a new document for a new area: audio, MIDI, the session, export.
   - How to run the tests, including any new script or harness option.
   - Harness setup: every new seam on `window.__workspaceHarness` or `window.__notationHarness`,
     and every fake (clock, audio output, MIDI access), with how a test drives it.
   - The fixture list: every fixture the chunk adds, where it lives and what it holds. There is no
     central list today; [chunk 1](#chunk-1--baseline-checks) starts one in a new
     `docs/testing.md`, together with the test layers, harnesses and scripts.
   - A place where the code had to differ from the spec, or from the UI/UX design, is reported to
     `spec-writer` or `ux-writer`, not fixed silently in either one.
6. **ATD stewardship.** For the business behaviour the chunk built, `documentalist` checks that
   every atom the chunk touched has `@spec-link` tags on the code that implements it and
   `@test-link` tags on the tests that verify it. Each tag sits directly above the function, type,
   `describe` or `it` it covers, never at the top of a file. It confirms the atoms still describe
   what the code does, and advances their status only with the owner's agreement.
   `npm run atd:lint` and `npm run atd:check` pass (both run inside `npm run quality`).

## 4. Chunks

Each chunk names its release, what it builds, where that is specified and designed, the atoms it
touches, what it waits for, how to tell it is done, and what blocks it.

- Since spec D183, a chunk's **Release** line names the part of v2.0 it belongs to (v2.0, v2.1,
  v2.2 or v2.4); every part ships in the one v2.0 release, through chunk 21's gate.
- **Atoms** are named by id; the file is `docs/<id>.atom.md`. "v1" marks an atom that existed
  before v2: the chunk changes the code it governs or must keep it true.
- "Item _n_" is item _n_ of the
  [v2.0 definition of done](master-spec.md#v20-is-done-when-all-of-the-following-hold).
- A **spec gap** is a hole or a contradiction in master spec v1.18, found while its atoms were
  written. The eleven gaps are resolved: master spec v1.19 settles eight of them, one only in
  part, and leaves three open for the owner in
  [§12](master-spec.md#12-open-questions-carried-forward).
  [Chunk 0](#chunk-0--atd-ingestion-of-the-master-spec) records how each was resolved. No chunk
  waits on a gap any more; a chunk blocked by an open question builds everything else first.
- "In part" means the chunk can start, but the criteria that the blocker names can't be signed
  off until it is settled.

### Chunk 0 — ATD ingestion of the master spec

**Release:** v2.0, prerequisite. **Done on 2026-09-29.**

**Goal.** Turn master spec v1.18 into ATD business atoms, so every later chunk has atoms to check
its plan against and to tag its code with.

**What it produced.** `documentalist` created 90 atoms, all DRAFT, and revised the v1 atoms that
v2 contradicts in place: four tagged `revised-for-v2`, and the product vision, now version 0.4.
`docs/` holds 173 atoms. Each v2 atom carries a release tag, `release-v2.0` to `release-v2.3`:
`atd query --field tags --search release-v2.0 --paths-only` lists one release. The atoms for the
three changes at Idle also carry `v1-change`. The master spec's acceptance criteria are in the
atoms' EXPECTATION sections, except item 15 (the main-thread budget), which is technical.

**Spec sections:** all, [§1](master-spec.md#1-core-concept) to
[§13](master-spec.md#13-access-model).

**Design docs:** none.

**Atoms:** every atom tagged `release-v2.0` … `release-v2.3`; v1: `req_four_measure_phrase`,
`req_browser_only_first_release`, `rule_optional_midi_privacy`,
`rule_unsupported_rhythm_settings_block_generation`, `vision_infinite_flow_first_release`.

**Depends on:** nothing.

**Done when** (all hold):

- every section of the master spec maps to atoms, and `npm run atd:lint` and `npm run atd:check`
  pass on `main`;
- the atoms v1 left unchanged on purpose are unchanged: `user_story_controlled_phrase_generation`,
  `req_landscape_phrase_workspace`, `rule_ephemeral_session_state`,
  `rule_seeded_phrase_reproduction`, `rule_tension_arc_level_policy`, `rule_leap_recovery`,
  `rule_open_phrase_ending`, `rule_instrument_profile_range`.

**What stays for the build.**

- **The owner's sign-off on VISION v0.4** (`vision_infinite_flow_first_release`). It is needed
  before the v2.0 gate, [chunk 21](#chunk-21--v20-release-gate), at the latest.
- **Drift between the code and the new atoms.** The code still states v1 rules in places. Each
  item is fixed in step 6 of the chunk that changes that code:

  | Drift                                                                                                                                                                                                                           | Fixed by                                                  |
  | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
  | `rule_optional_midi_privacy` and `specification_browser_only_operation_verification` tags in `scripts/verify-boundaries.mjs` and `tests/e2e/release/optional-scope-absence.spec.ts` still assert that MIDI and audio are absent | [Chunk 2](#chunk-2--browser-boundaries)                   |
  | `module_notation_layout_preflight` states the v1 planner: one system first, a retryable notation error for layout                                                                                                               | [Chunk 3](#chunk-3--notation-layout-v2)                   |
  | `rule_unsupported_rhythm_settings_block_generation`: 9 code tags and 12 test tags judge the chosen density, not the density generated with                                                                                      | [Chunk 4](#chunk-4--note-density-on-small-screens)        |
  | `module_generation_request_construction` says browser state cannot alter the generation intent; the density now follows the window's width                                                                                      | [Chunk 4](#chunk-4--note-density-on-small-screens)        |
  | `module_generation_control_catalog` and `module_rhythm_variety_grammar` don't know that `Sixteenth` is unavailable below `bp-tablet-landscape`                                                                                  | [Chunk 4](#chunk-4--note-density-on-small-screens)        |
  | `service_workspace_session_flow` makes a layout failure a retryable notation error                                                                                                                                              | [Chunk 5](#chunk-5--idle-fit-retries-and-the-room-notice) |
  | `rule_generation_failure_alert_copy` has no session case: a session never shows a blocking alert                                                                                                                                | [Chunk 15](#chunk-15--session-screen-start-and-end)       |

- **Eleven spec gaps**, routed to `spec-writer` on 2026-09-29 and resolved the same day in master
  spec v1.19. Eight are settled, one of them only in part; three are open questions for the owner,
  listed in [§12](master-spec.md#12-open-questions-carried-forward). The chunks an open question
  blocks say so:

  | #   | Gap                                                                                                                                                                                                                              | How it was resolved                                                                                                                                                                                                                                                                                                                       | Lands in                        |
  | --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
  | 1   | Tense-note resolution at a session's end (§3): "full resolution at Stop or the session's end" can't be enforced one phrase ahead; a tense ending or a pending leap recovery before a standalone fallback or a repeat is unstated | **Answered** by the owner on 2026-09-29 (D167, v1.21): the carry-over stays, and a session's last phrase may end owing. The proposed answer keeps the carry-over between phrases; its alternative, every phrase ending as v1 requires, would remove it altogether. The part about a standalone fallback or a repeat is settled with gap 3 | 7 (the carry-over), 21 (item 2) |
  | 2   | May a session phrase end with a pending leap recovery or an unresolved tense note (§3), when v1 forbids debt on the final sounding event?                                                                                        | **Settled in part** (§3): a phrase generated with carry-in may end owing either, and the next phrase settles it; a phrase generated without carry-in obeys v1 in full. The rest is gap 1's open question                                                                                                                                  | 7                               |
  | 3   | The standalone fallback's join (§4 step 2 against §11 item 2): "isn't smoothed", yet "every join obeys"                                                                                                                          | **Settled** (§3, §4, items 2 and 3): a join made without carry-in, into the standalone phrase or into a repeat, isn't smoothed and settles nothing the phrase before owed. Item 2 covers joins made with carry-in; item 3 names the standalone phrase                                                                                     | 7, 8, 21                        |
  | 4   | The review shows "every phrase shown" (§7), but the history excludes a read-ahead phrase that never sounded                                                                                                                      | **Settled** (§7): the review shows every phrase that started sounding                                                                                                                                                                                                                                                                     | 9, 20                           |
  | 5   | Discarding a look-ahead phrase at a boundary change (§5) against "no note on screen ever changes" (§11 item 4), when that phrase is already on screen as read-ahead                                                              | **Settled** (§5, §11 v2.1): a look-ahead phrase partly on screen is never discarded; the change applies from the phrase after it. It moves to v2.1 with gap 6                                                                                                                                                                             | 24, 25                          |
  | 6   | The phrase-boundary change in v2.0 (§11 table against §5): v2.0 has no automatic source of change before v2.1, yet its atoms are tagged v2.0                                                                                     | **Settled** (§5, §11): applying a change at a phrase boundary ships in v2.1 with the settings-mutation flag, and its two atoms are now tagged `release-v2.1`. v2.0 has the settings lock only                                                                                                                                             | 24, moved there from 7 and 8    |
  | 7   | Played notes in the v2.0 review (§11 table): "already partly true in v2.0" is not specified                                                                                                                                      | **Settled** (§11): v2.0 records the played notes in the session history and doesn't show them; the review shows them from v2.1                                                                                                                                                                                                            | 17, 20, 23                      |
  | 8   | Multi-phrase tension arc (§3): mechanics and default unspecified                                                                                                                                                                 | **Open** for the owner: how the arc runs, and its default (§12)                                                                                                                                                                                                                                                                           | 29, 30                          |
  | 9   | Adaptive tempo (§10): a controller lost mid-session, and the flag's default, unstated                                                                                                                                            | **Open** for the owner: adaptive tempo while the controller is away, and its default (§12)                                                                                                                                                                                                                                                | 27, 28                          |
  | 10  | When the "generator is struggling" notice clears (§4)                                                                                                                                                                            | **Settled** (§4, item 1): the notice stays until a newly generated phrase, the standalone one included, starts sounding, and goes when the session ends                                                                                                                                                                                   | 8, 15                           |
  | 11  | Where a tense note at a join resolves: the v2 README and the master spec (§3) disagree                                                                                                                                           | **Settled** (§3): onto the next phrase's first note, never later; the v2 README now says so                                                                                                                                                                                                                                               | 7                               |

- **Three contradictions** found while writing this plan were settled too, in master spec v1.20
  and the [v2 README](README.md). The rolling display is two alternating staff systems with no
  display-mode toggle, which is what [chunk 16](#chunk-16--rolling-display) builds. Item 12's
  MuseScore check covers each of the three instrument templates: the two saxophones, which
  transpose, with their `<transpose>` element, and the C keyboard without one. The README's
  session-start line now follows §6: from MIDI, only phrase 1's first note, at its exact pitch,
  starts a session.

**Blocked by:** nothing.

### Chunk 1 — Baseline checks

**Release:** v2.0, prerequisite. **Done on 2026-09-29.**

**Progress** (updated as each step lands):

| Step                                 | State | Notes                                                                                                                      |
| ------------------------------------ | ----- | -------------------------------------------------------------------------------------------------------------------------- |
| 1. ATD preflight                     | Done  | PROCEED. No atom changes, no tags on measurement harnesses; `rule_look_ahead_deadline` is the reference                    |
| Latency re-run and the new cold case | Done  | Figures and verdicts in [`docs/generation-latency.md`](../../../docs/generation-latency.md#v2-baseline-chunk-1-2026-09-29) |
| Main-thread engraving                | Done  | New `npm run measure:engraving`; same document                                                                             |
| Phone layout check                   | Done  | One overflow at 740 × 360; see below                                                                                       |
| `docs/testing.md`                    | Done  | Test layers, both harnesses and their seams, scripts, 23 fixtures                                                          |
| 4. Verify (`npm run quality`)        | Done  | All passes except 4 notation visual snapshots, which fail identically on an unchanged checkout here (below)                |
| Re-run on the reference machine      | Done  | 2026-09-30; [figures and verdicts](../../../docs/generation-latency.md#v2-re-run-on-the-reference-machine-2026-09-30)      |
| 6. ATD stewardship                   | Done  | No tags changed; `atd lint` and `atd check` pass. One atom conflict for the owner, below                                   |

**Results on the reference machine (2026-09-30).** The owner's 12-thread machine, bare metal, on
`main` at `adf8d34`. These figures gate; the cloud figures below stay for reference.

- **Working target (cold worst case under 250 ms in Chromium): missed.** Cold worst case
  829-951 ms; the first generation after a rhythm-control change up to 842 ms. Changes that keep
  the rhythm setting stay under 200 ms. The owner decided on 2026-09-30 that the target is, for
  now, a goal to aim for and not a gate, so the miss doesn't stop chunks 8 and 10.
- **The deadline itself (`rule_look_ahead_deadline`):** the three-bar window is met for every
  setting, four retries included (about 1.55 s of 3 s); Edge is not slower than Build here.
  Phrase 2's one-bar window is met, retries included, when phrase 1 has warmed the cache (about
  0.75 s). A v2.1 regeneration after a rhythm-control change fits its one bar on the first
  attempt (842 ms at worst) but not with retries. So the conflict between the three DRAFT atoms
  named below is real, but narrower: only retries, and the slowest settings, don't fit.
- **Main-thread engraving: under 200 ms.** Worst task 90 ms (103.5 ms by the heartbeat), in the
  noisier of two runs; the other had no task of 50 ms or more. A Worker wake-up timer is enough.
- **Visual snapshots:** the four baselines recorded in the cloud container pass unchanged here.
- `npm run measure:engraving` had broken with chunk 3's layout (it looked for the old
  `.staff-content__score` element) and is fixed. It is not in `npm run quality`.

**Results on the cloud machine (2026-09-29, reference only).** Measured on a 4-vCPU cloud
container, about twice as slow as the reference machine on the cold worst case.

- **Working target (cold worst case under 250 ms in Chromium): missed.** Cold worst case
  1.43–1.44 s; the first generation after a rhythm-control change up to 1.59 s. Changes that keep
  the rhythm setting (key, register) stay near 250 ms. These are virtual-machine figures, for
  reference only: by the owner's decision of 2026-09-29, they don't stop chunks 8, 10 or 24, and
  the check is re-run on a real computer (see [step 4](#3-workflow-for-every-chunk)).
- **The deadline itself (`rule_look_ahead_deadline`, generation and engraving):** the normal
  three-bar window (3 s at 240 BPM) is met, retries included, for the worst setting measured in
  Chromium. A slower setting in Node (Edge tension, 2.06 s cold) could exceed it with four retries,
  and still has to be measured in Chromium. Phrase 2's one-bar window is met when
  phrase 1 has warmed the generator's cache, as it does in the same Worker. The one-bar window for
  a v2.1 regeneration after a rhythm-control change is missed (1.59 s). This puts three DRAFT
  business atoms at odds with the generator as measured: `rule_look_ahead_deadline` expects every
  phrase on time, `req_settings_mutation_flag` lets rhythm controls change, and
  `rule_session_change_applies_at_phrase_boundary` regenerates with one measure left. It is
  settled once the re-run on a real computer shows whether the conflict is real: relax the
  expectation for that case, raise the one-measure threshold, or require faster generation.
- **Main-thread engraving: under 200 ms.** The longest task was 83 ms (93 ms by a timer heartbeat),
  for the first phrase in a fresh page; later phrases stayed under 50 ms. A Worker wake-up timer is
  enough for [chunk 10](#chunk-10--audio-transport), as long as every main-thread task stays shorter
  than the scheduler's window.
- **The old browser figures overstate long generations.** Playwright polls the status text every
  500 ms, so a wall-clock time lands on the next poll: 457 ms in the page read as 866 ms. The
  harness now also times inside the page.

**The visual snapshots on the cloud machine.** (Resolved on 2026-09-30: the baselines re-recorded
by chunk 3b pass unchanged on the owner's machine too.) The four notation visual snapshots
(`tests/e2e/notation/notation-visual.spec.ts`) differ by about 1 % of their pixels (265–608
pixels) in the cloud container, on an unchanged checkout too, with the same counts: its Chromium
renders the staff slightly differently from the machine that made the reference images. Every
other step of `npm run quality` passes. A chunk run in that container reports these four as known
and leaves the reference images alone unless its layout really changes them.

**What the phone check saw, for [chunk 3](#chunk-3--notation-layout-v2).** The v1.0 code, as a
preview build in Chromium, at 740 × 360 and 844 × 390, with six phrases each of Sixteenth /
Strict / Sparse, Sixteenth / Heavily varied / Sparse and Eighth notes / Heavily varied / Sparse
(36 engravings).

- No horizontal overflow anywhere. `staff-frame`'s computed `max-block-size` is 252 px at
  740 × 360 and 282 px at 844 × 390, and its overflow is visible.
- 35 of 36 phrases were engraved on one system, 117–232 px tall, and fit the frame. One of them,
  at 740 × 360, came within 3 px of the frame's bottom.
- **One overflowed.** At 740 × 360, a Sixteenth / Heavily varied phrase didn't fit one system, so
  v1 drew two. The drawing is 357 px tall in a frame capped at 252 px: the second system runs
  122 px past the frame's bottom edge, over the content below it. This is the in-between state
  [the caveat](#2-read-first-the-notation-layout-caveat) describes: the stylesheet caps the height,
  and the engraver doesn't read it.
  - [The staff frame](phone-check-2026-09-29/740x360-overflow-staff-frame.png): the second system
    cut off at the frame's border.
  - [The window](phone-check-2026-09-29/740x360-overflow-page.png).

**Goal.** Measure what the session engine depends on, before anyone builds it: generation latency
against the look-ahead deadline, and main-thread engraving against the audio scheduler's window.
Check the live phone layout by hand. Start the testing document.

**Spec sections:** [§4](master-spec.md#4-look-ahead-and-failure-handling),
[§6](master-spec.md#6-backing-click-count-in-and-tempo),
[§11 prerequisites](master-spec.md#prerequisites-that-must-already-be-in-place),
[§12](master-spec.md#12-open-questions-carried-forward) (the latency and main-thread items).

**Design docs:** [phrase-workspace handoff, Responsive Behavior](../../../ui_ux/screens/phrase-workspace/handoff.md#responsive-behavior),
for the hand check.

**Atoms:** none. These are technical measurements. `rule_look_ahead_deadline` states the deadline
they are measured against.

**Depends on:** nothing.

**Done when** (all hold):

- `npm run measure:latency` and `npm run measure:latency:browser` have been re-run on the v1.0
  code, and a new cold case has been added and measured: the first generation after a change to
  one setting, as a mid-session change will cause from v2.1. The figures, with the machine and
  date, are in [`docs/generation-latency.md`](../../../docs/generation-latency.md).
- The same document states a verdict against the working target: the cold worst case stays under
  250 ms in Chromium, a quarter of one bar at 240 BPM. If it doesn't, the plan stops before
  chunks 8 and 10, and the owner decides how to proceed. If only the case after a setting change
  misses, the plan stops before [chunk 24](#chunk-24--settings-mutation-engine) instead.
- The longest main-thread task while engraving a phrase in Chromium is measured for the densest
  settings and the largest staff. The document says whether it stays under 200 ms, the proposed
  scheduler window, and so whether moving the scheduler's wake-up timer into a Web Worker is
  enough. [Chunk 10](#chunk-10--audio-transport) applies the answer.
- The phone layout on `main` has been looked at by hand in a landscape phone-sized Chromium
  window (at least 740 × 360 and 844 × 390 CSS pixels) with a dense phrase. What was seen is
  written down for [chunk 3](#chunk-3--notation-layout-v2), with a screenshot for any overflow.
- `docs/testing.md` exists: the test layers, the two harnesses and their seams, the scripts, and
  the fixture list, started with the fixtures that exist today.

**Blocked by:** nothing. It answers two of §12's open items: re-measuring generation latency, and
main-thread engraving against the scheduler.

#### Performance follow-up: cold generation

**Release:** v2.0, follow-up of chunk 1. **Done on 2026-09-30** on branch `v2-perf-cold-generation`, merged
into `main` (`b59b220`). The owner signed off on 2026-09-30.

**Goal.** Chunk 1 found the first ("cold") generation for a rhythm setting at 829-951 ms in
Chromium on the reference machine, against the 250 ms goal. Almost all of it is building that
setting's rhythm domain (every legal four-bar rhythm the grammar allows) and ranking it by seed.
Make that faster **without changing any output**: the same seed still gives the same phrase, byte
for byte. The owner approved five remedies on 2026-09-30:

1. Reject before building: per-gesture selectors, per-bar caches, and the per-bar and per-list
   checks (template feasibility, disjointness, anchor ratio, ending signature) before a full
   four-bar candidate is assembled.
2. Drop the redundant full validator from the fast enumeration, keeping it on the exact re-run
   path and in the independent result check, once an exhaustive test over all 324 settings proves
   it rejects nothing and the owner approves the atom amendment.
3. Faster seeded tie-key hashing with identical tie keys.
4. Freeze only at yield, build identities from cached per-bar fragments, no per-template spreads.
5. Pre-warm: the generation Worker builds the current setting's domain in the background, in
   interruptible slices, at start and after a rhythm control changes; a real request preempts it.

Out of scope: budgeted or partial picks, and anything that changes which phrase a seed gives.

**Atoms:** `api_rhythm_domain_expansion`, `module_ranked_candidate_ordering`,
`entity_rhythm_candidate_domain`, `module_generation_worker_protocol`,
`rule_seeded_phrase_reproduction`, `rule_no_carry_in_output_matches_v1`.
`rule_look_ahead_deadline` is the reference the figures are judged against.

**Done when** (all hold):

- A golden fixture recorded on the unchanged code (all 324 rhythm settings × seeds 1-10, plus
  carry-in and other non-rhythm samples, the memo's canonical order and the ranked order for seeds
  1-20 on a sample including the worst settings) passes unchanged after every remedy.
- Each remedy is kept or dropped with its reason recorded; none changes output.
- Pre-warm works for the idle screen and the session runner, can be disabled through a seam, and
  its completed memo equals the one a direct build gives.
- `npm run quality` passes.
- [`docs/generation-latency.md`](../../../docs/generation-latency.md) has the before → after
  figures on the reference machine (cold without and with pre-warm, warm, memo memory) and updated
  verdicts against the 250 ms goal and `rule_look_ahead_deadline`, including the v2.1 one-bar
  case.

**Progress** (updated as each step lands):

| Step                          | State | Notes                                                                                                                                                              |
| ----------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. ATD preflight              | Done  | PROCEED-WITH-SIGNOFF-PENDING; four architecture atoms amended before code (tie keys, Worker protocol, workspace flow, session runner)                              |
| 2. Golden fixture             | Done  | Recorded on unchanged `main`: 3,240 phrases, 72 carry-in and 72 other-control hashes, memo list and ranked order for 10 settings; never regenerated                |
| 3. Remedies 1-4               | Done  | 1, 3 and 4 kept; 2 dropped (see below)                                                                                                                             |
| 3. Pre-warm                   | Done  | Worker slices of one gesture unit, about 8 ms; `?prewarm=off` switch; Idle and the runner share it                                                                 |
| 4. Verify (`npm run quality`) | Done  | Passes; goldens unchanged                                                                                                                                          |
| Measurements                  | Done  | [Figures and verdicts](../../../docs/generation-latency.md#cold-generation-speed-up-on-the-reference-machine-2026-09-30)                                           |
| 5. Documents                  | Done  | Latency, phrase workspace, session engine, testing, README, rhythm phrase structure; specs synced by `spec-writer`                                                 |
| 6. ATD stewardship            | Done  | Tags added on the planner and publication; `atd lint` and `atd check` pass. Owner sign-off 2026-09-30: speed-up wording approved, both lowered atoms now at REVIEW |

**Outcome.**

- **Output:** unchanged. The golden fixture and the older oracles pass unchanged, and so do the
  same-seed rule and the byte identity with v1 without carry-in.
- **Remedy 2 dropped.** With the second full validation removed, the fast enumeration would yield
  46 invalid candidates in 20 Quarter and Eighth settings with Breath-heavy silence (answer
  similarity and attack band), which would change their output. The validator stays; the
  exhaustive test that found this stays as a guard. (Retried in step 2 below.)
- **Figures** (reference machine, in-page Chromium):
  - Worst case cold, true cold: 423-440 ms (was 829-951).
  - The same click right after the change: 390 ms.
  - Once pre-warm has finished: 66-102 ms.
  - Warm: 44-47 ms (was 143-148).
  - Node cold maximum: 522 ms (was 1,016).
  - Largest memo entry: 49.4 MiB (was 58.5).
- **Verdicts:** the 250 ms goal is still missed for true cold and an immediate click (about 2×
  closer), and met when the player pauses. `rule_look_ahead_deadline` is met in every window,
  retries included, including the v2.1 one-bar regeneration after a rhythm-control change.

##### Step 2: drop the redundant validator from the fast enumeration

**Done on 2026-09-30** on branch `v2-perf-validator`; the merge waits for the owner's acceptance
of the `api_rhythm_domain_expansion` amendment.

**Goal.** Remedy 2, retried. The full validator (`validateRhythmCandidate`) is now the largest
remaining cold cost, about 250-370 ms on the worst setting. Move the checks only it makes (answer
similarity, the attack band, the silence budget, and anything else the exhaustive comparison
reveals) into the early per-bar and per-list filter of the fast enumeration, run as early as their
inputs allow. Then drop the validator from the fast enumeration; it stays on the exact re-run path
(the no-plan codes are unchanged) and in the independent result check. Out of scope: anything that
changes which phrase a seed gives.

**Done when** (all hold):

- The exhaustive test shows the fast path alone yields exactly the validated domain for all 324
  settings: no invalid candidate and none missing. It stays as a permanent guard.
- The golden fixture and every older oracle pass unchanged; same seed, same result.
- The owner approves the `api_rhythm_domain_expansion` amendment before the merge.
- `npm run quality` passes.
- [`docs/generation-latency.md`](../../../docs/generation-latency.md) has the before → after
  figures, including Sixteenth / Heavily varied / Sparse / Straight / Edge in Chromium, with
  verdicts against the 250 ms goal and `rule_look_ahead_deadline`.

**Progress:**

| Step                          | State   | Notes                                                                                                                                                                                |
| ----------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. ATD preflight              | Done    | PROCEED-WITH-SIGNOFF-PENDING: `api_rhythm_domain_expansion` needs a signed-off amendment                                                                                             |
| 2. Tests first                | Done    | With the validator skipped and no new checks, the exhaustive specs found 46 invalid candidates in 20 settings (red)                                                                  |
| 3. Early checks, drop         | Done    | Two early checks (attack band per gesture, answer similarity per template) bring the count to 0; the validator is dropped from the fast path; the exhaustive specs stay as the guard |
| 4. Verify (`npm run quality`) | Done    | Passes; goldens and older oracles unchanged                                                                                                                                          |
| Measurements                  | Done    | [Figures and verdicts](../../../docs/generation-latency.md#validator-free-fast-enumeration-on-the-reference-machine-2026-09-30)                                                      |
| 5. Documents                  | Done    | Latency, testing, rhythm phrase structure                                                                                                                                            |
| 6. ATD stewardship            | Done    | `api_rhythm_domain_expansion` amendment at DRAFT, awaiting the owner; tags checked; `atd lint` and `atd check` pass                                                                  |
| Owner acceptance              | Pending | The owner accepts the amendment; then the merge                                                                                                                                      |

**Outcome.**

- **Output:** unchanged. The golden fixture and the older oracles pass unchanged.
- **Validator dropped from the fast path.** The attack band is checked once per gesture and answer
  similarity once per syncopation template; with them the exhaustive specs find no invalid
  candidate and the manifest's count in all 324 settings. The validator still runs on the exact
  re-run (no-plan codes unchanged) and in the independent result check.
- **Figures** (reference machine, shared with another session's load; in-page Chromium):
  - Worst case cold, true cold: 319-381 ms (was 423-440).
  - The same click right after the change: 273-295 ms (was 390).
  - Straight / Edge, first measured in Chromium: 290-320 ms true cold, 247-284 ms right after the
    change.
  - Once pre-warm has finished: about 95-112 ms.
  - Node cold maximum: 328 ms (was 522); 4 settings (was 6) over 250 ms.
- **Verdicts:** the 250 ms goal is still missed for true cold (about 1.2-1.5× over) and narrowly
  for an immediate click, and met when the player pauses. `rule_look_ahead_deadline` is met in
  every window, retries included, including the v2.1 one-bar regeneration after a rhythm-control
  change.

### Chunk 2 — Browser boundaries

**Release:** v2.0. **Done on 2026-09-29.** Audio contexts are allowed only under `src/audio/` and MIDI access only
under `src/midi/`, in both checks, with a fixture tree proving each case. The absence spec asserts
v2's rule. `specification_browser_only_operation_verification` is rewritten for v2; the chunk 0
drift for this chunk is fixed. `npm run quality` passes but for the four known snapshots (see
[chunk 1](#chunk-1--baseline-checks)). With the owner's agreement, the stale note in
`rule_optional_midi_privacy` now says the rule isn't built yet. The microphone ban stays without a
business rule of its own: the owner ruled it out of scope.

**Goal.** Let Web Audio and Web MIDI into the code, in named places only, before any audio or MIDI
code lands. Everything else v1 forbids stays forbidden: browser storage, network calls, the
microphone.

**Spec sections:** [§6](master-spec.md#6-backing-click-count-in-and-tempo) (starting audio),
[§7](master-spec.md#7-sessions-review-export-and-privacy) (privacy),
[§8](master-spec.md#8-midi-input-and-note-acknowledgement) (Chromium only),
[§13](master-spec.md#13-access-model).

**Design docs:** none.

**Atoms:** `rule_optional_midi_privacy` (v1, revised), `rule_session_data_never_sent_or_stored`,
`rule_audio_unlocked_by_player_click`, `rule_chromium_only_support`, `rule_single_local_user`,
`req_browser_only_first_release` (v1, revised); v1: `specification_browser_only_operation_verification`,
`rule_ephemeral_session_state`, `specification_ephemeral_state_verification`.

**Depends on:** [chunk 0](#chunk-0--atd-ingestion-of-the-master-spec).

**Done when** (all hold):

- `eslint.config.js` and `scripts/verify-boundaries.mjs` allow `AudioContext` only under one audio
  directory and `requestMIDIAccess` only under one MIDI directory (`src/audio/` and `src/midi/`
  are proposed). The same identifier anywhere else still fails both checks. A test fixture file
  proves each case.
- `getUserMedia`, `mediaDevices`, `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`,
  `sendBeacon`, `document.cookie`, `localStorage`, `sessionStorage`, `indexedDB` and `caches`
  still fail everywhere in `src/`.
- `tests/e2e/release/optional-scope-absence.spec.ts` asserts v2's rule instead of v1's: nothing
  creates an `AudioContext` or requests MIDI access before a player click on Start or on
  "Connect controller", and no request leaves the origin. Its tags name the v2 atoms.
- `npm run quality` passes.
- Step 6 fixes the drift from chunk 0: the `rule_optional_midi_privacy` and
  `specification_browser_only_operation_verification` tags in `scripts/verify-boundaries.mjs` and
  in the absence spec, and the "without MIDI input, playback" wording of
  `specification_browser_only_operation_verification`.

**Blocked by:** nothing.

### Chunk 3 — Notation layout v2

**Release:** v2.0. Carries [the caveat](#2-read-first-the-notation-layout-caveat). Starts first in
its wave. **Done on 2026-09-29.** The v2 planner splits every phrase below `bp-tablet-landscape`
and keeps one system from it up; the scale fits the width and, below it, the height budget read
from `staff-frame`'s `max-block-size`, never below 5 px per staff space. "No room for the staff"
and "notes too wide" are two typed failures. Each system position is its own `staff-content`
engraving, and two positions are always reserved. The phone check now passes 36 of 36, including
the phrase that overflowed in [chunk 1](#chunk-1--baseline-checks). `npm run quality` passes in
full on the merged code. The four visual baselines were recorded in the cloud container; chunk 3b
re-recorded them (below). Two findings went to `ux-writer`: a phone needed about
317 px of small-viewport height for two systems at the legibility floor, since the tallest phrases
need 17.5 staff spaces per system against the design's 12–14; and from `bp-tablet-landscape` up
the staff frame was about 70 px taller than v1's. Both are settled by chunk 3b below.

**Follow-up, chunk 3b: done on 2026-09-29.** `ux-writer` answered the height question (UX
D127–D130), and the owner accepted about 276 px as the phone minimum. One system position is now
one size for every instrument, sized for one instrument's reach: 16 staff spaces instead of 17.5.
The staff sits in it from the phrase's written range, lower for the saxophones and higher for the
keyboard. It leaves room for the start marker, and at least about 0.8 of a staff space clear at
each end. Below 64rem the staff frame's top and bottom padding shrinks to 8 px. Two systems fit
at the 5 px floor from 286 px of small-viewport height (was 317). The 276 px target needed 15
spaces, but every stem is drawn up, so the start marker didn't fit: issue ISS-006. The owner
accepted 286 px for now; fixing stem direction later should bring it back to about 276 px. From
64rem up the frame is 418 px (v1: 384). The owner signed off `module_notation_layout_preflight`
v0.6, which stays REVIEW. The four visual baselines were re-recorded in the container, and pass
unchanged on the owner's machine (checked 2026-09-30). `npm run quality` passes in full on the
merged code.

**Goal.** Replace v1's layout planner with v2's: split below `bp-tablet-landscape`, one system per
phrase from it up, a scale that fits the height as well as the width on the phone, one
`staff-content` unit per system position, and two system positions always reserved. The planner
tells "no room for the staff" apart from "these notes don't fit", which chunk 5 needs.

**Spec sections:** [§4](master-spec.md#4-look-ahead-and-failure-handling) (a phrase must fit),
[§6](master-spec.md#6-backing-click-count-in-and-tempo) (which layout, width and height).

**Design docs:** [phrase-workspace handoff: Notation Contract](../../../ui_ux/screens/phrase-workspace/handoff.md#notation-contract),
[Responsive Behavior](../../../ui_ux/screens/phrase-workspace/handoff.md#responsive-behavior),
[Layout Tree](../../../ui_ux/screens/phrase-workspace/handoff.md#layout-tree);
`src/styles/components.css` (`staff-frame`, `staff-content`, the phone block budget).

**Atoms:** `req_four_measure_phrase` (v1, revised), `rule_session_layout_fixed_at_start` (the
layout depends on width alone; the session holds it in chunk 16); v1:
`module_notation_layout_preflight`, `req_landscape_phrase_workspace`,
`rule_notation_display_preserves_phrase`.

**Depends on:** [chunk 0](#chunk-0--atd-ingestion-of-the-master-spec).

**Done when** (all hold):

- `planSystemLayout` in `src/notation/notation-layout-policy.ts` takes the width and, below
  `bp-tablet-landscape`, the height budget. It returns the split layout below that width and the
  one-system layout from it up, never trying one before the other. Unit tests cover both sides of
  the breakpoint.
- The scale is the largest that fits both the width and the height, never below 5 px per staff
  space. Unit tests show a short window lowering the scale, and a window too short for the floor
  giving "no room".
- Its failures are two distinct typed outcomes: "no room for the staff" (the window) and "notes
  too wide" (this phrase). A notation-harness test engraves a dense fixture and a sparse one in
  the same small container and gets one outcome each.
- `PhraseScore.vue` reads the height budget from `staff-frame`'s computed `max-block-size`. A
  notation-harness test changes only the browser toolbar's height (`100vh` against `100svh`) and
  sees no re-engraving.
- Each system position that shows notes is its own `staff-content` engraving, and
  `drawTwoSystems` is gone. The staff area reserves two system positions in every state. The
  visual snapshots in `tests/e2e/notation/` are updated, and the two-system phone snapshot shows
  the split layout at idle.
- The phone check from chunk 1 is repeated on the result: no overflow in a landscape phone window.
- Step 5 updates `docs/notation-engraving.md` and `docs/release/browser-and-offline-limits.md`,
  and asks `spec-writer` to update `specs/generator-architecture.md`.
- Step 6 rewrites `module_notation_layout_preflight` to the v2 planner (the chunk 0 drift).

**Blocked by:** nothing.

### Chunk 4 — Note density on small screens

**Release:** v2.0. **Done on 2026-09-29.** One pure function, `resolveGeneratedNoteDensity`, gives
the density a phrase is generated with; the session reads the window's width through an injected
provider each time it builds an intent, and a crossing never generates. Below
`bp-tablet-landscape`, `Sixteenth` is disabled with its field-note and a stored `Sixteenth` is
kept. The unsupported-rhythm check judges the generated density; the chunk 0 drift for this chunk
is fixed. `npm run quality` passes but for the four known snapshots (see
[chunk 1](#chunk-1--baseline-checks)).
The owner accepted every ATD change the same day. Three REVIEW atoms gained the v2 density rule and
lost their older claim that an instrument-profile switch never generates;
`rule_profile_switch_validates_phrase` judges a blocked combination on the density a phrase would be
generated with; `rule_sixteenth_unavailable_below_tablet_width` and
`module_generation_control_catalog` moved to REVIEW.
The session's step-down memory is chunk 8's; the idle fit retries on a crossing are chunk 5's.

**Goal.** Below `bp-tablet-landscape`, `Sixteenth` can't be chosen, a stored `Sixteenth`
generates as `Eighth`, and unsupported rhythm combinations are judged on the density a phrase is
generated with. Provide the density rule the session engine uses: once a session generates with
`Eighth`, it stays there. [Note density](../../../docs/music/lexicon.md#note-density) is the
setting for the shortest common note value in a phrase.

**Spec sections:** [Changes to v1 at Idle](master-spec.md#changes-to-v1-at-idle),
[§5](master-spec.md#5-control-changes-during-a-session) (note density below the tablet-landscape
width), [§6](master-spec.md#6-backing-click-count-in-and-tempo) (when a session can start).

**Design docs:** [phrase-workspace handoff: Components and Content](../../../ui_ux/screens/phrase-workspace/handoff.md#components-and-content)
(Note density's disabled `Sixteenth` and its `field-note`),
[Responsive Behavior](../../../ui_ux/screens/phrase-workspace/handoff.md#responsive-behavior).

**Atoms:** `rule_sixteenth_unavailable_below_tablet_width`,
`rule_generated_density_follows_window_width`, `rule_session_density_only_steps_down` (the
density rule; the session applies it in chunk 8), `rule_unsupported_rhythm_settings_block_generation`
(v1, revised); v1: `module_generation_control_catalog`, `module_generation_request_construction`,
`module_rhythm_variety_grammar`, `user_story_controlled_phrase_generation`.

**Depends on:** [chunk 0](#chunk-0--atd-ingestion-of-the-master-spec).

**Done when** (all hold):

- One pure function gives the density a phrase is generated with, from the chosen density,
  whether the window is below `bp-tablet-landscape`, and whether the session has stepped down.
  Unit tests cover every case of §5, including "a session that stepped down stays down when the
  window widens".
- The width is read when each phrase is generated, through an injected provider. The chunk
  doesn't touch `src/notation/`, which chunk 3 owns in the same wave. The generation intent
  receives the resolved density and stays free of browser state.
- The unsupported-rhythm check in `src/domain/controls/unsupported-rhythm-settings.ts` judges the
  resolved density. Unit tests show a `Sixteenth` combination blocked from `bp-tablet-landscape`
  up and allowed below it.
- `RhythmControls.vue` disables `Sixteenth` below `bp-tablet-landscape` with its `field-note`,
  and keeps a stored `Sixteenth` selected as chosen. A workspace-harness test resizes the window
  across the breakpoint at idle and checks item 27: the next phrase generated below the width is
  generated with `Eighth`, and the chosen value applies again above it.
- A resize never regenerates the phrase on screen (item 27).
- Step 6 fixes the chunk 0 drift: the 21 tags of `rule_unsupported_rhythm_settings_block_generation`
  now sit on code and tests that judge the density generated with, and
  `module_generation_request_construction`, `module_generation_control_catalog` and
  `module_rhythm_variety_grammar` state the v2 rule.

**Blocked by:** nothing.

### Chunk 5 — Idle fit retries and the room notice

**Release:** v2.0. **Done on 2026-09-30** on branch `v2-chunk-5` (not merged). At idle each generated attempt is checked against the staff's current room with the engraver's own planning (`planWrittenPhraseFit`, no drawing) before it is shown, so a phrase too wide for the room is never drawn and a phrase kept on screen stays visible through the Loading. A run is the first attempt plus up to three fresh-seed retries (at most four, for every trigger: UX D134), one seed and one request id each, with the note density the window gives at that moment. "No room" shows `room-notice` with no retries; only the other notation failures keep the retryable notation error. The notice's two causes, what starts a round (a wider staff, a change to a setting the phrase is generated from, a profile switch under the too-many-notes cause, `Regenerate phrase` or `Retry generation`), what never does, the room check under the no-room cause (window or setting change, with the current written key's signature) and the unsupported-rhythm give-ways are in `src/composables/generation-session-fit-round.ts` and `generation-session-room-notice.ts`. A width crossing that blocks the rhythm combination stops a run at once while retries run or no score is kept; the first attempt of a run from a phrase on screen carries on (item 26: a phrase that fits stays). Chunk 15 reads `roomNotice`, `retriesRunning` and `roomNoticeAnnouncements`. Sixteen workspace-harness scenarios cover every path of item 26, with queued seeds, forced fit verdicts and real resizes. The four notation baselines and the chunk 6 overlay baselines pass unchanged, and so does the cold-generation golden fixture. An intermittent baseline failure that also happens on `main` (the screenshot sometimes caught the staff's entrance fade part-way, about one full run in five) is fixed on the test side by waiting for the fade to end; no baseline was re-recorded. Two ARCHITECTURE atoms await the owner: the new `module_idle_fit_round` (DRAFT) and `service_workspace_session_flow`, revised and back to DRAFT. So do wording proposals for the BUSINESS rules (mainly the attempt count, UX D134).

**Goal.** At idle, a phrase too wide for the room is quietly replaced, with up to three fresh-seed
retries. A window with no room for the staff, or a round whose retries all failed, shows
`room-notice` instead of the notation error. The notation error stays only for failures a retry
can cure. This is the part of the three changes at Idle that the workspace sees.

**Spec sections:** [Changes to v1 at Idle](master-spec.md#changes-to-v1-at-idle),
[§4](master-spec.md#4-look-ahead-and-failure-handling) (at Idle),
[§6](master-spec.md#6-backing-click-count-in-and-tempo) (a staff with no room), item 26.

**Design docs:** [generate-phrase flow handoff](../../../ui_ux/flows/generate-phrase/handoff.md)
(its diagram owns the idle transitions) and
[intent](../../../ui_ux/flows/generate-phrase/intent.md);
[phrase-workspace handoff: States](../../../ui_ux/screens/phrase-workspace/handoff.md#states)
(**Needs more room**, Loading, **Empty**),
[Notation Contract](../../../ui_ux/screens/phrase-workspace/handoff.md#notation-contract)
(room for the staff); [phrase-workspace intent: When the Staff Has No Room](../../../ui_ux/screens/phrase-workspace/intent.md#when-the-staff-has-no-room).

**Atoms:** `rule_idle_phrase_too_dense_is_replaced`, `rule_retry_round_window_changes`,
`rule_staff_needs_room_notice`, `rule_staff_notice_gives_way_to_new_phrase`,
`rule_too_dense_notice_retry_rounds`, `rule_unsupported_rhythm_gives_way_to_no_phrase`,
`rule_unsupported_rhythm_settings_block_generation` (v1, revised); v1:
`service_workspace_session_flow`, `rule_generation_failure_alert_copy`,
`rule_seeded_phrase_reproduction`, `rule_profile_switch_validates_phrase`.

**Depends on:** [chunk 3](#chunk-3--notation-layout-v2),
[chunk 4](#chunk-4--note-density-on-small-screens).

**Done when** (all hold):

- In `src/composables/`, a "notes too wide" outcome from chunk 3 starts a round of up to three
  fresh-seed retries inside one Loading, each generated with the density the window gives at
  that moment. A "no room" outcome shows `room-notice`. A workspace-harness test with queued
  seeds shows the first fitting retry drawn, with its own seed.
- Every path of item 26 has a workspace-harness scenario, driven by queued seeds and window
  resizes: the notice's two causes and their sentences; clearing when the staff fits, which
  generates a new phrase; a wider window, a changed setting or `Regenerate phrase` starting a
  round; a narrower window never starting one; a wider window during a round starting nothing;
  a change that makes the rhythm combination unsupported, before a round or during one, giving
  way to **Empty** with the unsupported-rhythm alert; and a phrase that stops fitting under an
  unsupported combination.
- No path shows the notation error for a layout failure, and none draws a phrase shown before
  the notice.
- `Start session` doesn't exist yet. Chunk 15 reads this chunk's state to decide whether a session
  can start, so the state names "retries running" and "notice showing" explicitly.
- Step 6 fixes the chunk 0 drift in `service_workspace_session_flow` (a layout failure is no
  longer a retryable notation error), and checks `rule_generation_failure_alert_copy` still
  describes the idle alerts.

**Blocked by:** nothing.

### Chunk 6 — Note identity and session overlays

**Release:** v2.0. **Done on 2026-09-30.** A note's identity is acknowledgement's own `ExpectedNoteIdentity` (phrase number, measure, event index); a pure function gives every written glyph the identity of the attack it sounds as, so a tie continuation, across a barline or the system break, maps to its attack and a rest has none. The engraver tags each attack's own notehead, stem (a beamed stem too), flag, accidental and dot as `<g data-note-id>` parts, and records each measure's playhead band; the four visual baselines pass unchanged, so the idle rendering is pixel-identical. `applyScoreOverlays` in `src/notation/score-overlays.ts` draws the start marker, the playhead band and `note-ack` from an overlay state of identities and a measure index, with no pitch input, and rejects a note the phrase lacks before changing anything. `PhraseScore` takes the phrase number and the overlay state and re-applies it after every engraving. `ux-writer` settled the open details as UX D131–D133 (the dot lights with its notehead; ties, beams, ledger lines and chord symbols keep the ink; one band height per system; the marker's size and place). With every stem drawn up, the marker always sits above the chord symbol (25 of 25 phrases), at least 23 units inside the top position, so the layout reservation holds. Six new overlay snapshots cover both themes, desktop and phone. New issue ISS-007: ledger lines keep VexFlow's grey in both themes (pre-existing). New atom `module_notation_note_identity_overlays` (DRAFT; REVIEW proposed to the owner).

**Goal.** Give every engraved note an identity the session can address, and draw the three
overlays a session puts on the staff: the start marker, the playhead band and the acknowledgement
highlight. The overlays are driven from outside; this chunk only draws them.

**Spec sections:** [§6](master-spec.md#6-backing-click-count-in-and-tempo) (the starting note),
[§8](master-spec.md#8-midi-input-and-note-acknowledgement) (what's ever shown).

**Design docs:** [phrase-workspace handoff: Notation Contract](../../../ui_ux/screens/phrase-workspace/handoff.md#notation-contract)
(start marker, playhead band, acknowledgement); [play-session intent: The Rolling Display](../../../ui_ux/flows/play-session/intent.md#the-rolling-display);
[`motion.md`](../../../ui_ux/motion.md); the `--color-note-ack` token in `src/styles/theme.css`.

**Atoms:** `rule_acknowledgement_highlights_expected_note_only`, `rule_no_grading_or_mismatch_signal`,
`rule_starting_note_named` (the marker only); v1: `entity_concert_event_timeline`,
`rule_notation_display_preserves_phrase`, `rule_presentation_preference_preserves_phrase`.

**Depends on:** [chunk 3](#chunk-3--notation-layout-v2).

**Done when** (all hold):

- A note's identity is its phrase number, measure and event index. It survives engraving: each
  fresh attack's notehead, stem and flag in the SVG can be found from it. A tie continuation maps
  to its original attack. Unit tests cover ties across a barline and rests.
- The notation harness can set the start marker on a note, move the playhead band to a measure,
  and highlight a note by identity. Visual snapshots in both themes show each overlay.
- Highlighting changes only the colour of the note's notehead, stem, flag and own accidental;
  shared beams and ledger lines keep the staff ink. A test compares the SVG before and after and
  finds no other difference: nothing moves.
- No overlay ever draws a note that isn't in the phrase. The engraver has no input for a played
  pitch (item 7).

**Blocked by:** nothing.

### Chunk 7 — Generator continuation

**Release:** v2.0. **Done on 2026-09-29.** A typed, immutable carry-in (the last sounding concert
pitch with its leap state, the register window, the final chord and its endpoint class, the phrase
number) travels through the worker protocol and is validated there. The join obeys the in-phrase
rules; a phrase generated with carry-in may end owing a leap recovery or a tense note's resolution
(D167), and the next phrase settles it on its first note. A join matrix of 480 chained phrases
checks both. Without carry-in the output is v1's, byte for byte, and tempo reaches no generation
input. The carry-in isn't wired into the app yet: that is [chunk 8](#chunk-8--session-engine).
`npm run quality` passes in full on the merged code. v2.1 will need a partial carry-in: a key or
collection change drops only its harmonic part, and today the carry-in refuses settings it doesn't
fit.

**Goal.** Let the generator continue from the phrase before. A request may carry a **carry-in**:
the last sounding concert pitch with its leap state, the register window, the final chord and its
endpoint class, and the phrase number. The join then obeys the same rules as the inside of a
phrase, and a phrase generated with carry-in may end owing a leap recovery or a tense note's
resolution, which the next phrase settles. With no carry-in, the output stays byte-identical to
v1. A [leap](../../../docs/music/lexicon.md#leap) is a jump larger than a step; its
[recovery](../../../docs/music/lexicon.md#recovery) is the small move back the other way that must follow it. A tense
note is one that asks to [resolve](../../../docs/music/lexicon.md#tension-and-resolution).

**Spec sections:** [§3](master-spec.md#3-the-generation-unit-and-how-phrases-join), items 2 and 3.

**Design docs:** none.

**Atoms:** `rule_join_carry_in_limited`, `rule_join_inherits_leap_recovery`,
`rule_join_interval_obeys_phrase_rules`, `rule_join_tense_note_resolution`,
`rule_varying_register_once_per_session`, `rule_no_carry_in_output_matches_v1`,
`rule_tempo_never_affects_generation`, `req_rolling_practice_session` (a session phrase may end
owing); v1:
`rule_phrase_starts_on_downbeat`, `rule_leap_recovery`, `rule_open_phrase_ending`,
`rule_seeded_phrase_reproduction`, `rule_instrument_profile_range`,
`module_generation_request_envelope`, `service_generation_request_resolution`,
`module_register_intent_boundary`, `module_pitch_planner`, `module_harmony_candidate_domain`,
`module_generation_worker_protocol`.

**Depends on:** [chunk 0](#chunk-0--atd-ingestion-of-the-master-spec).

**Done when** (all hold):

- The carry-in is a typed, immutable value holding the four things of §3 and nothing else. It
  travels through `src/generation-worker/generation-worker-protocol.ts` and is validated there.
- The pitch planner in `src/domain/pitch/` treats the carry-in pitch as the note before beat 1: a
  pending leap recovery is inherited, and the first interval obeys the leapiness and interval
  rules. The harmony planner in `src/domain/harmony/` starts from the carried chord. Property
  tests over the seed matrix check every join made with carry-in against the same validators a
  phrase's inside uses (item 2).
- A phrase generated with carry-in may end owing a leap recovery or a tense note's resolution,
  and the next phrase generated with that carry-in settles it: the recovery under the in-phrase
  rules, the tense note resolving onto its first note and never later. Property tests over the
  seed matrix check both across the join.
- A phrase generated without carry-in never ends owing either. Nothing the generator does depends
  on whether the phrase before ended owing something: a join into a phrase generated without
  carry-in settles nothing.
- Every phrase with a carry-in still starts with a fresh attack on beat 1: no tie or rest crosses
  the join.
- `Varying` is resolved once, for phrase 1, and reused through the carried register window.
- The golden outcome tests (`generation-outcome-golden.spec.ts`, `generation-seed-matrix.spec.ts`)
  pass unchanged: no carry-in gives v1's bytes, for a session's first phrase, the failure
  ladder's standalone phrase and the phrase at Idle alike (item 3).
- Tempo reaches no generation input (a type-level test and a property test).
- `npm run measure:latency` shows no regression against chunk 1's figures.

**Blocked by:** nothing since 2026-09-29. The owner answered O97 (D167, master spec v1.21): the
carry-over between phrases stays, and a session's last phrase may end with a leap recovery or a
tense note's resolution still owed, since a session ends where it ends. Step 6 has
`documentalist` give the v1 atoms `rule_leap_recovery` and `rule_open_phrase_ending` their v2
scope.

### Chunk 8 — Session engine

**Release:** v2.0. **Done on 2026-09-30.** A pure engine in `src/session/` takes timed events
(start, count-in over, phrase started sounding, a generation, crash or fit result, a tick, an end)
with their audio time and returns what to request, what to show next and what ended; it never
reads a clock. Phrase 1 is the idle phrase; phrase 2 is requested at start and due when the
one-bar count-in ends; each later phrase is due at the start of the last measure of the one
sounding. The failure ladder (three carry-in retries, one standalone retry with the session's
register, a repeat decided at the deadline), the struggling notice, the frozen settings and the
density step-down are covered by 55 engine and runner tests on timed events, at 60, 120 and
240 BPM. A
runner executes the engine's requests on the same `generate` seam, so the same Worker, as the
Idle flow: phrase 2 reuses the rhythm-domain memo phrase 1 warmed, and a test asserts it. Nothing
starts a session on screen yet (chunks 10 and 15). `npm run quality` passes in full, the four
notation snapshots included. Technical choices: [`docs/session-engine.md`](../../../docs/session-engine.md).
Decided in the chunk, recorded in the atoms and awaiting the owner's acceptance: a rejected
generation request (a worker crash, even a dead worker) is a failed attempt and never ends the
session; the step-down memory is set when an `Eighth` request is built, a failed one included;
the struggling notice shows when the second repeat in a row is decided, at its deadline.

**Progress:**

| Step               | State | Notes                                                                                   |
| ------------------ | ----- | --------------------------------------------------------------------------------------- |
| 1. ATD preflight   | Done  | PROCEED; architecture atoms `service_session_engine` and `service_session_runner` added |
| 2. Tests first     | Done  | Red on assertions against a stub engine and runner                                      |
| 3. Implement       | Done  | `src/session/` (7 files) and the workspace wiring                                       |
| 4. Verify          | Done  | `npm run quality` passes; no screen to look at in this chunk                            |
| 5. Documents       | Done  | `docs/session-engine.md`, README, `docs/testing.md`, `docs/phrase-workspace.md`         |
| 6. ATD stewardship | Done  | Tags checked; four wording clarifications await the owner                               |

**Goal.** The session's logic, with no audio and no screen. A pure state machine, given the time,
never reading a clock: phrase 1 is the idle phrase; phrase _N+1_ is requested when phrase _N_
starts sounding and is due when its last measure starts; phrase 2 is requested during the
count-in; the failure ladder; settings locked; the density step-down; and the ends of a session
as events.

**Spec sections:** [§4](master-spec.md#4-look-ahead-and-failure-handling),
[§5](master-spec.md#5-control-changes-during-a-session),
[§6](master-spec.md#6-backing-click-count-in-and-tempo) (tempo, the session never pauses),
[§7](master-spec.md#7-sessions-review-export-and-privacy) (starting and ending), items 1, 4, 11,
25 and 27.

**Design docs:** [play-session flow handoff](../../../ui_ux/flows/play-session/handoff.md) (its
diagram gives the session's states and transitions).

**Atoms:** `req_rolling_practice_session`, `rule_look_ahead_deadline`,
`rule_phrase_one_is_idle_phrase`, `rule_look_ahead_phrase_must_fit_staff` (the fit check is an
injected seam; chunk 16 provides it), `rule_session_generation_failure_ladder`,
`rule_struggling_generator_notice`, `rule_session_settings_locked`,
`rule_session_density_only_steps_down`, `rule_tempo_never_affects_generation`,
`rule_session_never_pauses`,
`rule_repeat_phrase_marked_internally_only`; v1: `service_generation_orchestration`,
`module_generation_worker_protocol`, `rule_ephemeral_session_state`.

**Depends on:** [chunk 1](#chunk-1--baseline-checks),
[chunk 4](#chunk-4--note-density-on-small-screens),
[chunk 7](#chunk-7--generator-continuation).

**Done when** (all hold):

- The engine lives in its own directory (`src/session/` is proposed). It takes events (start,
  count-in over, phrase started sounding, a generation or fit result, a stop, a hidden tab) with
  their audio time, and returns what to request, what to show next and what ended. Unit tests
  drive it with a list of timed events and assert its outputs.
- The deadline is the start of the sounding phrase's last measure, at the session's tempo. Tests
  at 60, 120 and 240 BPM show the request and the deadline at the right times, including phrase 2
  during the one-bar count-in.
- The failure ladder, with failed generations and failed fit checks mixed: up to three retries
  with a fresh seed and the same carry-in while the deadline allows; one standalone retry, without
  carry-in; a repeat of the previous phrase at the deadline, marked in the phrase's record. The
  session never ends because of a failure (item 1).
- The struggling notice shows from the second repeat in a row, stays through further repeats, and
  clears when a newly generated phrase starts sounding, the standalone one included; it goes when
  the session ends (item 1). Engine tests on timed events cover each case.
- The settings are frozen at start, and nothing in the engine changes one during a session
  (item 4). The density a phrase is generated with comes from chunk 4's function; after the first
  `Eighth`, every later phrase uses `Eighth` (item 27). Applying a setting change at a phrase
  boundary is not built here: it arrives in v2.1, in
  [chunk 24](#chunk-24--settings-mutation-engine).
- Tempo is transport only: the same events at any tempo give the same generation requests.

**Blocked by:** nothing.

### Chunk 9 — Session history

**Release:** v2.0. **Done on 2026-09-30.** `createSessionHistory(settings, wallClock)` in
`src/session/` is fed every session-engine output in order and records one entry per phrase that
started sounding:
phrase 1 at the end of the count-in, then each later phrase. A read-ahead phrase that never
sounded is not recorded, and a session ended in the count-in records nothing. Each record keeps
the phrase exactly as shown (its timeline, and the harmony its chord symbols come from), the
inputs that reproduce it (the resolved request with the density actually generated with, the
seed, the carry-in), its tempo, the internal repeat mark, and empty slots for chunk 17's
acknowledgements and played notes. The history also keeps the session's start time (read once
from an injected wall clock) and instrument profile, for chunk 20's file names and summary line.
Records are deep-frozen and stay in memory. A property test
records a real five-phrase session through the runner for each of the 96 cells of the carry-in
seed matrix: every record regenerates to the timeline it stored, and for each of the three
instrument templates the recorded session encodes to the same MusicXML and MIDI bytes as the
regenerated phrases. `src/session/session-history-export.ts` builds those encoder inputs from the
stored phrases, never regenerated; the repeat mark never travels. A test spies on browser storage
and the network through a recorded session and its export, and sees neither touched. Nothing on
screen uses the history yet (chunks 15 and 20). Building and reading back 2 000 phrases (about
2 h 15 min at 60 BPM) has a 250 ms budget, checked in `test:unit`; it took 2.3 ms on the
reference machine on 2026-09-30. Technical choices:
[`docs/session-engine.md`](../../../docs/session-engine.md#session-history). Decided in the chunk,
awaiting the owner's acceptance: the record stores the whole shown outcome as well as the intent
(the intent reproduces the phrase, the outcome carries the harmony the chord symbols need); the
tempo comes from the session's locked settings, passed at creation, never from a default; the
history throws when the engine's ordering breaks (phrase order, time order, the repeat mark, the
sounded count at the end); the export adapter takes the instrument from the records and refuses a
mix.

**Progress:**

| Step               | State | Notes                                                            |
| ------------------ | ----- | ---------------------------------------------------------------- |
| 1. ATD preflight   | Done  | PROCEED; architecture atom `service_session_history` added       |
| 2. Tests first     | Done  | Red on assertions against stubs                                  |
| 3. Implement       | Done  | `src/session/session-history.ts` and `session-history-export.ts` |
| 4. Verify          | Done  | `npm run quality` passes; no screen to look at in this chunk     |
| 5. Documents       | Done  | `docs/session-engine.md`, `docs/testing.md`, README              |
| 6. ATD stewardship | Done  | Tags checked; atoms await the owner                              |

**Goal.** Record every phrase that started sounding: the timeline as shown, and the inputs that
reproduce it (the resolved request with the density generated with, the seed, the carry-in), with
its tempo and, internally, whether it is a repeat. Leave room for acknowledgements and played
notes, which chunk 17 fills. Everything stays in memory.

**Spec sections:** [§7](master-spec.md#7-sessions-review-export-and-privacy) (what's recorded,
privacy), items 12, 13 and 27.

**Design docs:** none.

**Atoms:** `rule_session_history_keeps_timeline_and_inputs`,
`rule_session_history_records_played_notes` (the structure),
`rule_repeat_phrase_marked_internally_only`, `rule_session_data_never_sent_or_stored`,
`rule_session_density_only_steps_down` (the density recorded); v1:
`rule_seeded_phrase_reproduction`, `rule_ephemeral_session_state`,
`specification_ephemeral_state_verification`, `entity_concert_event_timeline`.

**Depends on:** [chunk 7](#chunk-7--generator-continuation),
[chunk 8](#chunk-8--session-engine), [chunk 18](#chunk-18--musicxml-encoding),
[chunk 19](#chunk-19--generated-notes-midi-encoding).

**Done when** (all hold):

- The history takes the engine's "phrase started sounding" events. A phrase shown only as
  read-ahead that never sounded is not recorded, so it is in neither the review nor any export; a
  session ended in the count-in records nothing.
- For every recorded phrase, regenerating from its stored inputs gives a timeline equal to the
  one stored. A property test runs this over the seed matrix, with carry-in.
- Encoding a recorded session with chunks 18 and 19 gives the same bytes as encoding the phrases
  regenerated from the stored inputs.
- The recorded density is `Eighth` for every phrase generated with `Eighth` (item 27).
- A repeat is marked in the record and nowhere else: the encoders' output for a repeat is the
  same as for any phrase.
- A history of 2 000 phrases (about 2 h 15 min at 60 BPM) is built and read back within a set
  time budget, since the session length has no cap.
- Nothing is written to browser storage; `npm run verify:boundaries` passes.

**Blocked by:** nothing.

### Chunk 10 — Audio transport

**Release:** v2.0. **Done on 2026-09-30.** `src/audio/` holds the one `AudioContext`, created
only by the transport's `unlock()`, which chunk 15's Start and "Connect controller" click handlers
will call; it is never suspended or closed. A look-ahead scheduler plans sound 200 ms ahead on the
audio clock, woken every 25 ms by a Web Worker timer (chunk 1's verdict). The click plays quarter
notes with beat 1 accented; the one-measure count-in takes a route past the click on/off gain but
through the click volume, so it sounds with the click off, even when it is turned off during the
count-in. On/off and volume are gains, and muting never touches the clock. Stop fades the
session's own bus out over 0.1 s. The click volume's range and default are ux-writer's
placeholder design tokens (`--mix-*` in `src/styles/theme.css`), read at unlock; the lowest, 0.2,
is checked to be above zero. ux Q31 must settle the real values before the gate; it did on
2026-10-05: they are final as built (spec D188). The workspace
session exposes the transport as `WorkspaceSession.audio`. A fake audio clock and output
(`tests/unit/audio/fake-audio.ts`) back the unit tests and the workspace harness's `audio` seams
(`?audio=real` for the real context). Playwright scripts a count-in and eight bars at 120 BPM on
the fake clock, and plays a count-in on the real `AudioContext` in Chromium; no audio context
exists before the click in either. Technical choices:
[`docs/audio-transport.md`](../../../docs/audio-transport.md). Decided in the chunk: the count-in's
beat 1 is accented, inferred from the click rule; Stop during the count-in fades too; the
volume-to-gain mapping is linear, a placeholder; a browser interruption of the audio clock halts
the transport and tells its listeners (chunk 15 ends the session), and resuming after one is not
built.

**Progress:**

| Step               | State | Notes                                                                          |
| ------------------ | ----- | ------------------------------------------------------------------------------ |
| 1. ATD preflight   | Done  | PROCEED-WITH-SIGNOFF-PENDING; no architecture atoms (adapter choices in docs)  |
| 2. Tests first     | Done  | Red on assertions against stub modules                                         |
| 3. Implement       | Done  | `src/audio/` (12 files), the workspace wiring and the harness `audio` seams    |
| 4. Verify          | Done  | `npm run quality` passes; real-Chromium count-in test included                 |
| 5. Documents       | Done  | `docs/audio-transport.md`, `docs/testing.md`, README, `docs/session-engine.md` |
| 6. ATD stewardship | Done  | Tags checked; the atoms' status awaits the owner                               |

Needs chunk 1's main-thread verdict.

**Goal.** The audio clock and everything scheduled on it except the backing: the audio adapter,
the scheduler, the click, the count-in, the mix gains, the fade on stop, and the fake clock and
fake audio output every later test uses.

**Spec sections:** [§6](master-spec.md#6-backing-click-count-in-and-tempo) (click, count-in, the
audio clock, starting audio, a hidden tab), items 5, 6, 15 and 18.

**Design docs:** [play-session intent: The Count-In](../../../ui_ux/flows/play-session/intent.md#the-count-in),
[The Audio Mix](../../../ui_ux/flows/play-session/intent.md#the-audio-mix).

**Atoms:** `rule_click_track`, `rule_click_volume_never_silent`, `rule_count_in_always_clicks`,
`rule_playhead_follows_audio_clock`, `rule_audio_unlocked_by_player_click`,
`rule_session_never_pauses`, `req_session_audio_mix` (gains and mute).

**Depends on:** [chunk 1](#chunk-1--baseline-checks), [chunk 2](#chunk-2--browser-boundaries).

**Done when** (all hold):

- The only `AudioContext` is created in the audio directory chunk 2 named, on a player click. A
  test shows no context exists before that click.
- The scheduler plans sound a fixed window ahead on the audio clock. Its wake-up timer runs where
  chunk 1 decided (a Web Worker by default).
- The click plays quarter notes with beat 1 accented. The count-in is one measure of click that
  sounds even with the click off, including when it is turned off during the count-in, at the
  current click volume. The lowest click volume is still audible: its gain is above zero (item
  18).
- Muting sets a gain to zero and never suspends the clock. A test mutes and unmutes and sees the
  clock's time unaffected (item 5).
- Stop fades the output out over about 100 ms.
- A fake clock that the test advances by hand, and a fake audio output that records what was
  scheduled and when, are injected in the workspace harness. `docs/testing.md` says how to drive
  them. A scripted test plays a count-in and eight bars at 120 BPM on the fake clock and checks
  every click's time and accent.
- A real-Chromium test (the workspace harness with the real `AudioContext`) plays a count-in and
  checks the click's scheduled times against the audio clock.

**Blocked by:** in part, ux Q31: the click volume's range and default level are placeholders. Build
with them; the gate needs the real values. Closed on 2026-10-05: they are final as built (spec
D188).

### Chunk 11 — Backing

**Release:** v2.0. **Done on 2026-09-30.** `renderBacking(harmony, meter)` in
`src/domain/backing/backing-renderer.ts` is a pure function from a phrase's harmony events to a
bass line and block chords, as notes in whole notes from the phrase's start, the same shape as the
MIDI export's `MidiBackingNote`. Each harmony event is cut at the bar lines, so the backing attacks
at every chord change and every [downbeat](../../../docs/music/lexicon.md#downbeat). The bass plays
the root from C2 to B2 (MIDI 36 to 47), with the fifth (the chord tone five letter names above the
root) on beats 3 and 4 of a measure under one chord; the chords are the highest close-position
[triad](../../../docs/music/lexicon.md#triad) (the three chord notes stacked as tightly as
possible) whose top note is at or below E4. `BACKING_REGISTER` holds O57's proposed register.
Harmony that doesn't tile the 16 beats, a meter other than 4/4 or an inconsistent triad throws a
`BackingRenderError`. In `src/audio/`, `backing-track.ts` places the notes with the click's own
`beatAt`, so a note on a beat falls at exactly that click's time; the transport's
`queueBacking(phraseNumber, harmony)` takes phrases in order from 1 and throws with no session,
out of order, or once planning has passed the phrase's start; `phraseStartsAt` gives each phrase's
start. The voices are oscillators and gains on a third fade gain of the session bus, routed into
backing-enable and backing-volume, in a placeholder timbre. `npm run verify:boundaries` now
rejects any audio or sample file in `dist/` and the sampled-audio calls in `src/`. The workspace
harness gained `audio.queueBacking`, `backingNotes` and `audibleBacking`; Playwright checks eight
bars at 120 BPM on the fake clock and a short run on the real `AudioContext` in Chromium, and unit
tests put eight bars at 60, 120 and 240 BPM exactly on the click grid. For
[chunk 15](#chunk-15--session-screen-start-and-end): queue phrase 1 right after `start`, and each
later phrase on the engine's `phrase-ready`. For
[chunk 20](#chunk-20--review-and-generated-notes-export): the MIDI export's backing is
`renderBacking` of each recorded phrase's harmony. Technical choices:
[`docs/audio-transport.md`](../../../docs/audio-transport.md#the-backing). Decided in the chunk,
awaiting the owner's acceptance: a "four-beat harmony event" is every full measure under one
chord, so a chord held over two measures gets root then fifth in each; chords are attacked on
chord changes and downbeats only, never on beat 3 (O57's wording; the atom's "re-attacked in the
same way" is looser); the voicing is the highest close-position stack with its top at or below
E4, so the inversion varies and the top note always lies between F3 and E4; the bass fifth stays in the
MIDI 36 to 47 band, so it can sit below the root; notes are held for their whole segment with a
short release, and timbre and levels are placeholders; the transport API above (in-order queue, a
late queue throws, a phrase never queued stays silent until the next queue call throws), with the
renderer in `src/domain/backing/` for the export to reuse; `verify:boundaries` gained explicit
no-audio-asset and no-sample-API rules. Still open for the v2.0 gate: O57's listening test (the
voicing, register, attack pattern and timbre) and ux Q31 (the backing volume's range and default,
and the linear volume-to-gain mapping). _On 2026-10-05 the owner accepted the backing as built,
closing O57 (spec D185), and the audio mix as built, closing ux Q31 (spec D188)._

**Progress:**

| Step               | State | Notes                                                                                |
| ------------------ | ----- | ------------------------------------------------------------------------------------ |
| 1. ATD preflight   | Done  | PROCEED; no architecture atom                                                        |
| 2. Tests first     | Done  | Red on assertions against stubs                                                      |
| 3. Implement       | Done  | The renderer, the backing track, the voices, the transport API and the harness seams |
| 4. Verify          | Done  | `npm run quality` passes; real-Chromium backing run included                         |
| 5. Documents       | Done  | `docs/audio-transport.md`, `docs/testing.md`, README, `docs/export.md`               |
| 6. ATD stewardship | Done  | Tags checked; atoms await the owner                                                  |

**Goal.** A bass line and block chords that follow the phrase's own harmony, in pitch and on the
beat. A pure renderer from the harmony to note events, and plain Web Audio voices that play them.
No samples. A [chord tone](../../../docs/music/lexicon.md#chord-tone) is a note of the chord; the
[root](../../../docs/music/lexicon.md#root) is the note the chord is built on.

**Spec sections:** [§6](master-spec.md#6-backing-click-count-in-and-tempo) (backing, the mix),
items 5 and 14.

**Design docs:** [play-session intent: The Audio Mix](../../../ui_ux/flows/play-session/intent.md#the-audio-mix).

**Atoms:** `req_session_backing_track`, `req_session_audio_mix`; v1:
`module_harmony_candidate_domain`, `rule_neutral_profile_diatonic_harmony`.

**Depends on:** [chunk 10](#chunk-10--audio-transport).

**Done when** (all hold):

- The renderer is a pure function of a phrase's harmony events and meter. The bass plays the
  chord's root at each harmony event and on every beat 1, adding the fifth on beat 3 for a
  four-beat event. The chords are a close-position triad, attacked on each chord change and each
  downbeat. The default register is §12's proposed one. Unit tests cover one-chord and two-chord
  measures in every collection.
- The rendered notes are in the phrase's concert key: a test checks every rendered pitch class
  against the harmony event it plays under.
- The voices are built from oscillators and gains only. `npm run verify:boundaries` shows no new
  asset in the build.
- On the fake clock, the backing of eight bars at 60, 120 and 240 BPM lands on the beat grid
  exactly. Muting it changes no scheduled time (item 5).
- The backing plays only between the end of the count-in and the session's end, and keeps playing
  through silence.

**Blocked by:** in part, §12's backing voicing and register (O57): build the proposed default; the
listening test must settle it before the v2.0 gate. ux Q31: the backing level's range and default
are placeholders. Both closed on 2026-10-05 (spec D185, D188).

### Chunk 12 — MIDI input

**Release:** v2.0. **Done on 2026-10-01.** `src/midi/` reads one MIDI controller.
`parseMidiMessage` reads a note-on with non-zero velocity as a played note and a note-off, or a
zero-velocity note-on, as a note end, on any channel; control change, pitch bend, both kinds of
aftertouch, program change, SysEx and every system message are ignored, and a malformed note
message throws. The played-note tracker, keyed by pitch, ends a held pitch at a new note-on for
it, ignores a note-off for a pitch not held, and gives ended notes chunk 9's `RecordedPlayedNote`
shape. `createWebMidiAccessProvider(navigator)` makes the app's one `requestMIDIAccess` call,
`{ sysex: false }`, and maps the browser's refusals onto the typed states `denied` and
`unsupported`. `createMidiController` asks for access only in `connect()`, selects the only device
present or the player's pick, and derives its state (`unsupported`, `not-requested`, `requesting`,
`denied`, `no-device`, `choosing`, `opening`, `connected`, `away`) from the permission, the
selection and the selected port. A lost port is `away`, with its held notes ended at the unplug's
time; the same port coming back is reattached with no check; a different device is only listed.
`midiTimestampToAudioTime` maps each timestamp onto the audio clock through a fresh `ClockAnchor`
from the transport's new `clockAnchor()`, which the Web Audio output reads from
`getOutputTimestamp()` plus the output latency, on the scheduling timeline. The workspace session
holds the controller as `WorkspaceSession.midi`. The fake MIDI access
(`tests/unit/midi/fake-midi-access.ts`) plugs, unplugs and plays notes at given times; the
workspace harness gained `?midi=fake|unsupported|real` and the `midi` seams, and
`tests/e2e/midi/midi-input.spec.ts` runs 16 Playwright tests on the fake clock, plus a real-Chromium
smoke that only proves a typed state (headless Chromium answers `denied`). For
[chunk 13](#chunk-13--controller-connection): call `midi.connect()` right after `audio.unlock()` in
the "Connect controller" click, drive `select(id)` from the picker, and call `connect()` again when
a device is plugged in while `no-device`. For [chunk 17](#chunk-17--midi-in-the-session): suspend
reattaching for a session started while the selected controller is away
(`rule_start_while_controller_away`), end held notes with `releaseHeld(at)` at the session's end,
pass played notes to `compensatePlayedNote`, and decide whether the history and the export store
raw or compensated onsets (flagged by `documentalist`). Technical choices:
[`docs/midi-input.md`](../../../docs/midi-input.md#technical-choices-made-in-chunk-12). Decided in
the chunk, awaiting the owner's acceptance: a device is identified by its Web MIDI port id, with no
fallback on name or maker, so two identical keyboards stay distinct (Chromium keeps the port and
its id across a replug within a page); the selection lives in memory only; `connect()` picks the
only device present, and a device plugged in later is picked up only by the next `connect()`; held
notes end on an unplug (at its mapped time) and on a switch of device (at the current audio time);
a request that rejects for an unknown reason restores the stage it started from and rethrows; a
stale open changes nothing; `NotSupportedError` reads as `unsupported`; the anchor adds the output
latency, so compensation takes it off exactly once; a fresh anchor per message. Bluetooth MIDI
(O71) was settled on 2026-10-06 (spec D191): USB is the tested path, Bluetooth best-effort.

**Progress:**

| Step               | State | Notes                                                                                                       |
| ------------------ | ----- | ----------------------------------------------------------------------------------------------------------- |
| 1. ATD preflight   | Done  | PROCEED; no architecture atom: the port-id identity is a technical choice, recorded in `docs/midi-input.md` |
| 2. Tests first     | Done  | Red on assertions against stubs                                                                             |
| 3. Implement       | Done  | The parser, the tracker, the clock mapping and anchor, the adapter, the controller and the harness seams    |
| 4. Verify          | Done  | `npm run quality` passes; real-Chromium smoke included                                                      |
| 5. Documents       | Done  | `docs/midi-input.md`, `docs/testing.md`, `docs/audio-transport.md`, `docs/midi-acknowledgement.md`, README  |
| 6. ATD stewardship | Done  | Tags checked; atoms await the owner                                                                         |

**Goal.** Read one MIDI controller. The Web MIDI adapter, note-on and note-off parsing, choosing
one input, what "connected" and "lost" mean, the same device reattaching, and the timestamps
mapped onto the audio clock. Plus the fake MIDI access every later test uses. No screen yet.

**Spec sections:** [§8](master-spec.md#8-midi-input-and-note-acknowledgement) (reading the
controller, connected and lost, reattaching, Chromium only), items 10 and 19.

**Design docs:** [controller-connection flow intent: What "connected" and "lost" mean](../../../ui_ux/flows/controller-connection/intent.md)
and [A controller unplugged between sessions](../../../ui_ux/flows/controller-connection/intent.md).

**Atoms:** `req_midi_controller_input`, `rule_only_note_on_counts_as_played`,
`rule_controller_attached_definition`, `rule_same_controller_reattaches`,
`rule_midi_never_blocks_session`, `rule_chromium_only_support`.

**Depends on:** [chunk 2](#chunk-2--browser-boundaries), [chunk 10](#chunk-10--audio-transport).

**Done when** (all hold):

- `requestMIDIAccess` is called only in the MIDI directory chunk 2 named, and only when asked.
  Denied permission, no Web MIDI and no device each give a typed state, never an exception that
  reaches the page.
- Only a note-on with non-zero velocity is a played note, on any channel. A note-off, or a
  note-on at velocity zero, ends a held note; a new note-on for a held pitch ends the earlier one.
  Control change, pitch bend, aftertouch and SysEx are ignored. Unit tests cover each message.
- A controller is connected once permission is granted, one input is selected and its port is
  open; it is lost when that port reports it disconnected. The selection survives an unplug; the
  same device coming back is reattached with no check; a different device is not picked up. Tests
  drive this with the fake MIDI access (item 19, logic part).
- Each played note carries its onset and release on the audio clock, mapped from the MIDI
  timestamp. A unit test checks the mapping with a known offset between the two clocks.
- The fake MIDI access can plug, unplug and play notes at given times. It is injected in the
  workspace harness, and `docs/testing.md` says how to drive it.

**Blocked by:** nothing. Bluetooth MIDI (O71) was settled on 2026-10-06 (spec D191): USB is the
tested path, and Bluetooth stays best-effort, with the USB correction applied to every controller.

### Chunk 13 — Controller connection

**Release:** v2.0. **Done on 2026-10-01** on branch `v2-chunk-13` (not merged). The pure check in
`src/domain/controller-check/` shows the written C nearest the middle of the instrument profile's
written range (C4 for the C MIDI keyboard, C5 for both saxophones) and takes d, the played concert
pitch minus the expected concert pitch. It reports a match, a whole-octave offset (the device's
octave setting, no profile suggested) or a semitone offset (the device's transpose setting, plus a
suggested profile when another profile's transposition equals the current one minus d: the screen
handoff's six rows), with the handoff's Check result copy; unit tests inject 0, ±12, ±2, ±14, ±9
and ±5 semitones for each profile (item 8). The engraver's new `engraveCheckNote`
(`src/notation/vexflow-check-note-engraver.ts`) draws the one written note inside the engraver's
chunk: treble clef, no key or time signature, labelled "Written note C 5". The MIDI controller
gained `permission()`, a Permissions API read that makes the sheet show "Connecting…" or "Allow
MIDI access" (`unknown` reads as Connecting); `abandonConnect()`, for a sheet closed while access
is requested: the browser's answer is still recorded but selects nothing, and a later
`Connect controller` click adopts the pending request; and `disconnect()`, the player's
`Disconnect`, which clears the selection so nothing reattaches. `src/midi/controller-status.ts`
folds the facts into the header's form: `Connect controller`, connected, no controller, MIDI
access blocked, and the session-only disconnected form chunk 17 wires. The header's
`controller-status` (`src/components/workspace/ControllerStatus.vue`) is disabled during a session
with its contrast kept, and its form is frozen for the session; its click unlocks the audio, then
asks for MIDI access, then opens the sheet. The connection sheet
(`src/components/controller-connection/`, its own chunk, loaded on demand and warmed after mount)
is a pure reducer with effects that covers every state, action, focus rule and device-change rule
of the screen handoff. Focus on close goes to the session action, else the phrase action, else
`controller-status`; after a count-in end that regenerates phrase 1 it now goes to
`controller-status`, which resolves chunk 15's interim. The phrase replay announcer now loads on
demand too, in the same order. The entry chunk's size budget in `npm run verify:boundaries` rose
from 220 KiB to 224 KiB (the entry went from 224,133 B to 228,797 B; the sheet's chunk is 15.8 kB,
the announcer's 2.1 kB). The workspace harness gained `midi.setPermission` and the notation
harness `__notationCheckNote`. 48 Playwright tests in `tests/e2e/controller/` cover the states,
the check, device changes, closing, the layout and `controller-status`; `test:a11y` gained 22
scans (the sheet in 11 states, light and dark); 7 more tests are in
`tests/e2e/notation/notation-check-note.spec.ts`; and unit tests cover the controller's additions,
the check, the reducer, the status fold and the components. `ux-writer` settled three details in
the chunk: ux D146 (the `Connect controller` form has the badge's width, so no change of form moves
the header), ux D147 (Connected's four actions may wrap onto two rows) and ux D148 (spacing and
wording). For [chunk 17](#chunk-17--midi-in-the-session): no note may start a session while the
sheet is open (`connectionSheetOpen` on the shell; item 17's tests pass trivially until MIDI can
start a session); the header's form freeze must let the disconnected badge (`lostInSession`)
through; and suspending reattachment for a session started while the controller is away stays
with chunk 17. For [chunk 20](#chunk-20--review-and-generated-notes-export): the Review's half of
reattaching and of opening the sheet from the Review. Technical choices:
[`docs/controller-connection.md`](../../../docs/controller-connection.md) and
[`docs/midi-input.md`](../../../docs/midi-input.md#technical-choices-made-in-chunk-13). Atoms:
`documentalist` proposes REVIEW for `req_midi_controller_input`, `rule_chromium_only_support`,
`rule_midi_never_blocks_session`, `rule_controller_attached_definition` (after a fix to its notes),
`rule_same_controller_reattaches` and `entity_instrument_profile`; the others wait for chunk 17.
The owner's sign-off is needed on `rule_controller_transposition_check`'s wording ("instrument
template" becomes profile), the "used only by" clause in the STABLE `rule_instrument_profile_range`
and in the CONTRACT, the CONTRACT's outdated MIDI exclusion, and whether a Disconnect rule is
added. Decided in the chunk, awaiting the owner's acceptance: the check note is the written C
nearest the middle of the written range; closing the sheet while access is requested abandons the
attempt in both sub-states; a second click adopts a pending request; `Disconnect` clears the
selection; the header keeps its form for the whole session; and Checking or Waiting for your
browser is read from the Permissions API. Still open for the v2.0 gate: §12's controller check on
the reference hardware (which note a written middle C sends at each device setting decides whether
a manual input-transposition setting is also needed).

**Progress:**

| Step               | State | Notes                                                                                                                                      |
| ------------------ | ----- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. ATD preflight   | Done  | PROCEED-WITH-SIGNOFF-PENDING; no architecture atom                                                                                         |
| 2. Tests first     | Done  | Unit tests for the check, the reducer and the status fold; Playwright scenarios for every sheet state                                      |
| 3. Implement       | Done  | The check, the check note, the controller's additions, the status fold, `controller-status`, the sheet and the harness seams               |
| 4. Verify          | Done  | `npm run quality` passes; the leader confirms before commit                                                                                |
| 5. Documents       | Done  | `docs/controller-connection.md`, `docs/midi-input.md`, `docs/testing.md`, `docs/notation-engraving.md`, `docs/phrase-workspace.md`, README |
| 6. ATD stewardship | Done  | Tags checked; atoms await the owner                                                                                                        |

**Goal.** The connection step, between sessions only: the `Connect controller` click that also
unlocks audio, the connection sheet with its states and device picker, the transposition check,
and the `controller-status` badge in all its forms. A **transposition** is the fixed distance
between the [written pitch](../../../docs/music/lexicon.md#written-pitch) and the
[concert pitch](../../../docs/music/lexicon.md#concert-pitch) of a
[transposing instrument](../../../docs/music/lexicon.md#transposing-instrument).

**Spec sections:** [§6](master-spec.md#6-backing-click-count-in-and-tempo) (starting audio),
[§8](master-spec.md#8-midi-input-and-note-acknowledgement) (connecting, the transposition check,
reattaching between sessions), items 8, 17 (the connecting part) and 19.

**Design docs:** [controller-connection flow handoff](../../../ui_ux/flows/controller-connection/handoff.md)
(Entry and exit, Between-session unplug, Routing rules) and
[intent](../../../ui_ux/flows/controller-connection/intent.md);
[controller-connection screen handoff](../../../ui_ux/screens/controller-connection/handoff.md)
(all sections) and [intent](../../../ui_ux/screens/controller-connection/intent.md);
[phrase-workspace handoff: Components and Content](../../../ui_ux/screens/phrase-workspace/handoff.md#components-and-content)
(`controller-status`).

**Atoms:** `rule_controller_connects_between_sessions`, `rule_controller_transposition_check`,
`rule_audio_unlocked_by_player_click`, `rule_same_controller_reattaches` (at Idle and in the
Review), `rule_midi_never_blocks_session`, `rule_chromium_only_support`; v1:
`entity_instrument_profile`, `rule_readonly_controls_keep_contrast`.

**Depends on:** [chunk 12](#chunk-12--midi-input),
[chunk 15](#chunk-15--session-screen-start-and-end).

**Done when** (all hold):

- The check shows one written note from the instrument's range and compares the played note with
  its expected concert pitch. It reports a match, a whole-octave offset or a semitone offset, with
  the wording and the suggested template from the screen handoff's Check result copy. Unit tests
  inject offsets of 0, ±12, ±2, ±14 and ±9 semitones for each template and get the right report
  (item 8).
- Every sheet state in the screen handoff has a workspace-harness scenario on the fake MIDI
  access: unsupported browser, requesting access (and waiting for the browser), permission
  refused, no device, several devices, the check, its result, and devices plugged or unplugged
  while the sheet is open. Focus goes where the Focus Management section says.
- Nothing played while the sheet is open starts a session or changes the workspace, including
  phrase 1's first note (item 17).
- `Connect controller` is disabled during a session, and the badge shows status only.
- A controller unplugged at Idle keeps its selection and reattaches by itself with no check; the
  badge shows the forms the flow handoff lists (item 19).
- `npm run test:a11y` passes with the sheet open in each state.

**Blocked by:** in part, §12's controller check on the reference hardware: which note a written
middle C sends at each device setting decides whether a manual input-transposition setting is also
needed. Build the check; that verification closes before the v2.0 gate.

### Chunk 14 — Note acknowledgement

**Release:** v2.0. **Done on 2026-09-29.** It paused before any code: as first written,
`rule_expected_note_window` stopped an on-time note from matching when the next note starts less
than 150 ms later (sixteenths from 110 BPM, eighths from 210 BPM). The owner chose to split the gap
at the midpoint the same day (D168, master spec v1.22), and the chunk resumed. The pure logic in
`src/domain/acknowledgement/` lists each phrase's fresh attacks and places the windows over the
whole session, so a phrase's last note is bounded by the next phrase's first. It matches exact
concert pitch at most once, earliest first, after subtracting the latency. The output is note
identities only, enforced by the type checker. A property test covers 20 phrases at every tempo
from 60 to 240 BPM, over USB and Bluetooth LE. The latency constants are provisional (output 0,
Bluetooth LE 12.5 ms) until [chunk 17](#chunk-17--midi-in-the-session) tunes them.
Recording the other notes of a keyboard chord moves to chunk 17 with the rest of played-note
recording: this chunk has no session to record into. `npm run quality` passes in full on the merged
code. Waiting for the owner: `documentalist` proposes moving `rule_expected_note_window` from
DRAFT to REVIEW now that its code has landed, and keeping `rule_acknowledgement_exact_pitch`
(until chunk 17 records played notes) and `rule_no_grading_or_mismatch_signal` (until the
screens and exports it covers exist) at DRAFT.

**Goal.** The matching rule, as pure logic: each expected note's window, exact-pitch matching,
once per note, the earliest match first, and the latency correction of a played onset.

**Spec sections:** [§8](master-spec.md#8-midi-input-and-note-acknowledgement)
(expected-note acknowledgement, latency), item 7.

**Design docs:** none (chunk 6 draws the highlight).

**Atoms:** `rule_expected_note_window`, `rule_acknowledgement_exact_pitch`,
`rule_played_onset_latency_compensation`, `rule_no_grading_or_mismatch_signal`,
`rule_only_note_on_counts_as_played`; v1: `entity_concert_event_timeline`.

**Depends on:** [chunk 0](#chunk-0--atd-ingestion-of-the-master-spec).

**Done when** (all hold):

- Expected notes are the phrase's fresh attacks; a tie continuation belongs to its attack and a
  rest has none.
- Two consecutive expected notes share a boundary: the later of 150 ms before the second onset and
  the point halfway between the two onsets. A window opens 150 ms before its onset, or at the
  boundary with the note before if that is later, and closes at the later of 200 ms after the
  onset or the end of the note's tied span, but never after the boundary with the next note, so it
  always holds its own onset (D168). Unit tests cover a short note, a long tied note, sixteenths at
  120 BPM and eighths at 240 BPM, and the last note of a phrase against the next phrase's first.
- A played note matches only the exact concert pitch, octave included. Each expected note is
  matched at most once, by the earliest unmatched note whose window holds the played onset. On a
  keyboard chord, only the expected note is matched and the others are recorded.
- The played onset used is the MIDI time on the audio clock, minus the output latency and a
  constant for the connection type. The constants are named, with their source.
- The output is a list of matched note identities and nothing else: no miss, no wrong note, no
  score. A type-level test shows no such field can be produced.
- A property test over the fixture set: playing every expected note exactly on time matches
  every one; playing each a semitone off matches none.

**Blocked by:** nothing. The constants are tuned on the reference hardware in
[chunk 17](#chunk-17--midi-in-the-session).

### Chunk 15 — Session screen: start and end

**Release:** v2.0. **Done on 2026-10-01** on branch `v2-chunk-15` (not merged). The session
controller (`src/components/workspace/workspace-session-controller.ts`, loaded as its own chunk)
runs one session at a time. The `Start session` click unlocks the audio, asks for the screen wake
lock and the landscape lock (a refusal changes nothing and shows nothing), starts the transport,
queues phrase 1's backing, locks the settings, holds the staff layout the window's width selects,
opens a history and starts a runner on the Idle phrase. An audio-time agenda
(`src/session/session-agenda.ts`), woken by the controller's own wake-up Worker timer, lights the
count-in beats on the click's own beat grid, sends `count-in-over`, `phrase-started-sounding` and
the engine's ticks, and queues each readied phrase's backing; every runner output is recorded in
the history, and an engine time floor keeps the times the engine gets in order.
`sessionStartBlocker` (`src/session/session-start-conditions.ts`) judges item 22's conditions,
with no MIDI input. A session ends like Stop on Stop, a hidden tab, an audio interruption (engine
cause `stop`), a portrait-shaped view below `bp-desktop`, and a window too narrow or, below
`bp-tablet-landscape`, too short for the held layout at the legibility floor
(`src/session/session-window.ts`, with the new `planStaffWidthRoom` and the engraver's new
`measureStaffFixedParts`), heights read from the small viewport height so a browser toolbar ends
nothing. While a session runs, an Idle layout gate diverts the staff's reports from the Idle fit
retries, room notice and regeneration, and at the end re-applies the latest of them, so the Idle
rules decide in the layout the window gives afresh. On screen: the session action after the phrase
action, with one primary slot at a time; the start's one instant jump; `session-cue-row` (the
count-in, the struggling notice, and on the phone the compact `Stop` and `Volume`); the audio mix
in the score toolbar (`Backing`, `Click` and the `Volume` popover); every musical control read-only
at full contrast; and focus at each end. The workspace harness gained the `screenLocks`, `page`,
`windowShape` and `session` seams, `audio.mix`, `generationsSettled` and a `count` for
`failNextGeneration`. 40 Playwright tests in `tests/e2e/session/` and 14 in
`tests/e2e/audio/mix-controls.spec.ts` run on the fake audio clock, and `test:a11y` scans the open
volume popover. The entry chunk's size budget in `npm run verify:boundaries` rose from 200 KiB to
212 KiB for the screen's controls. For [chunk 16](#chunk-16--rolling-display): replace the interim
`checkFit` (`acceptEveryPhrase`: every look-ahead phrase fits, since none is drawn yet) with chunk
3's planner in the held layout (`state.heldLayout`), re-engrave in the held layout on a resize,
and add the "material waiting" window rule; the held one-system layout below
`bp-tablet-landscape` has no height rule in the planner. For
[chunk 17](#chunk-17--midi-in-the-session): the MIDI end causes, the starting note, the disconnect
banner in the cue row's top slot (it outranks the count-in), and `WorkspaceSession.midi`, still
unused. For [chunk 13](#chunk-13--controller-connection): focus `controller-status` after a
count-in end that regenerates phrase 1 (the session action stands in until then), and call
`audio.unlock()` in the "Connect controller" click. For
[chunk 20](#chunk-20--review-and-generated-notes-export): the Review and item 28's fresh phrase
replace the interim end after phrase 1 sounded. The closed history is `state.lastHistory`; the
`phrase_already_played` start blocker goes; focus goes to `Close review` instead of the phrase
action; and the start conditions gain "never while the Review shows". Technical choices:
[`docs/session-engine.md`](../../../docs/session-engine.md#the-session-controller) and
[`docs/phrase-workspace.md`](../../../docs/phrase-workspace.md#the-session-screen). Decided in the
chunk, awaiting the owner's acceptance: until the Review exists, a session ended after phrase 1
sounded leaves the played phrase on the staff with `Start session` disabled until a new Idle
result, generates nothing by itself and sends focus to the phrase action; any running Idle
generation blocks Start (generate, regenerate and the fit retries alike); the interim `checkFit`
above; an audio interruption ends the session with the cause `stop`; during a session the Idle
layout machinery never changes phrase 1, only the session window rule judges a window change, and
the Idle layout inputs are re-applied at the end. Still open for the v2.0 gate: ux Q31 (the mix's
ranges and default levels are placeholders) and O87 (a wake lock the browser drops mid-session is
not asked for again). Both closed on 2026-10-05: the mix is final as built (spec D188), and a
dropped wake lock is to be asked for again, in a code unit after the ISS-006 fix (spec D187,
[chunk 21](#chunk-21--v20-release-gate)).

**Goal.** Put the session on the workspace: `Start session` and `Stop`, when a session can start,
the session cue row with the count-in and the struggling notice, the locked settings, the audio
mix controls, the wake lock and landscape lock, and every way a session ends. The staff keeps
showing phrase 1 while running; chunk 16 makes it roll.

**Spec sections:** [§5](master-spec.md#5-control-changes-during-a-session) (the lock),
[§6](master-spec.md#6-backing-click-count-in-and-tempo) (count-in, when a session can start, the
wake lock, a hidden tab, landscape), [§7](master-spec.md#7-sessions-review-export-and-privacy)
(starting and ending, a session ended during the count-in), items 1, 4, 10, 11, 18, 21, 22, 23
and 24.

**Design docs:** [play-session flow handoff](../../../ui_ux/flows/play-session/handoff.md) and
[intent](../../../ui_ux/flows/play-session/intent.md) (Starting, The Count-In, The Session
Workspace, The Audio Mix, Ending); [phrase-workspace handoff](../../../ui_ux/screens/phrase-workspace/handoff.md)
(all its v2 marks outside the Notation Contract) and
[intent](../../../ui_ux/screens/phrase-workspace/intent.md) (Start and Stop, The Session Cue Row,
The Audio Mix, The Rest of the Workspace During a Session, The Phone and the Window During a
Session); [`motion.md`](../../../ui_ux/motion.md).

**Atoms:** `rule_session_start_conditions`, `rule_count_in_shown_on_screen`,
`rule_session_settings_locked`, `rule_stop_ends_session`, `rule_count_in_ending_returns_to_idle`,
`rule_hidden_tab_ends_session`, `rule_screen_wake_lock_during_session`,
`rule_landscape_lock_during_session`, `rule_session_ends_on_portrait_view`,
`rule_session_ends_when_staff_too_small` (the window part), `rule_session_layout_fixed_at_start`,
`rule_struggling_generator_notice`, `req_session_audio_mix`, `rule_click_volume_never_silent`,
`rule_audio_unlocked_by_player_click`, `rule_midi_never_blocks_session`; v1:
`service_workspace_session_flow`, `rule_generation_failure_alert_copy`,
`rule_readonly_controls_keep_contrast`, `req_landscape_phrase_workspace`.

**Depends on:** [chunk 5](#chunk-5--idle-fit-retries-and-the-room-notice),
[chunk 8](#chunk-8--session-engine), [chunk 9](#chunk-9--session-history),
[chunk 11](#chunk-11--backing).

**Done when** (all hold):

- `Start session` is enabled exactly when every condition of item 22 holds. One
  workspace-harness scenario per condition shows it disabled: no phrase yet, generating, fit
  retries running, notation error, a failure banner, an unsupported combination, the rotate-device
  notice, and `room-notice`.
- A Start click starts the count-in, shown beat by beat in the cue row in time with the click on
  the fake clock, with phrase 1's first measure fully visible. Phrase 1 is the idle phrase; nothing
  on the staff moves (items 18, 25).
- During a session, every generation setting is read-only with its contrast kept; the audio mix
  and `Stop` stay usable. Theme and tempo stay as the handoff says.
- `Backing`, `Click` and the `Volume` popover work at every breakpoint, and the click volume's
  lowest step is audible.
- The wake lock and the landscape lock are requested at start and released at every end. A
  refused or missing lock changes nothing and shows nothing (items 21, 24). Tests fake both APIs.
- A session ends like `Stop` on a hidden tab, on a portrait-shaped view below `bp-desktop`, and on
  a window too narrow or, below `bp-tablet-landscape`, too short for the held layout. A toolbar
  showing or hiding ends nothing (item 24). One scenario per cause, in the count-in and while
  running.
- A session ended in the count-in returns to Idle with phrase 1 on screen and focus as the flow
  handoff says (item 23). A session ended later reaches the engine's "ended" state with its
  history. The Review arrives in chunk 20.
- A session started with no controller runs until `Stop` and never ends by itself (item 10).
- The struggling notice shows in the cue row from the second repeat in a row and never blocks. It
  stays through further repeats, clears when a newly generated phrase starts sounding, the
  standalone one included, and goes when the session ends (item 1). One scenario per case, driven
  by failed generations on the fake clock. No blocking alert shows during a session.
- Step 6 fixes the chunk 0 drift in `rule_generation_failure_alert_copy`: a session has no alert.

**Blocked by:** in part, ux Q31: the audio mix's ranges and default levels are placeholders.
§12's screen wake lock dropped mid-session (O87): the proposed default, asking again silently, is
built only once confirmed. Still open after the chunk: both stay open for the v2.0 gate. Both
closed on 2026-10-05 (spec D187, D188).

### Chunk 16 — Rolling display

**Release:** v2.0. **Done on 2026-10-01** on branch `v2-chunk-16` (not merged). The pure placement
plan `src/session/rolling-display.ts` says where the playhead is, on heard time (`playheadAt`), what
each system position shows (`systemsAt`), what readied material waits (`waitingMaterial`), which
phrases are shown or waiting (`phrasesShownOrWaiting`), how many measures are read ahead
(`readAheadMeasures`) and whether any of a phrase is on screen (`isPhraseOnScreen`). The planner's
viewport is now the drawn layout plus the window's height budget (`null` from
`bp-tablet-landscape` up), and `heldViewport` gives a session's held layout that budget, so a held
one-system layout below `bp-tablet-landscape` now also ends the session for height: chunk 15's
hand-off gap, resolved in favour of `rule_session_ends_when_staff_too_small`. The engraver's new
`engravePhraseSystem` draws one system of a phrase from the whole phrase's plan. `PhraseScore`
gained a session mode (the `session` prop, `src/components/notation/session-staff*.ts`): it
refills one position at a time, the fade-out then the entrance fade, re-engraves in place on a
resize, and in a session never emits `engraved` or `notation-error`, only `session-staff-failed`,
which the Idle layout gate routes to the session alone. The controller's display
(`src/components/workspace/workspace-session-display.ts`) runs a frame loop through an injected
frame port, runs the session fit check (chunk 3's planner in the held viewport at the legibility
floor; the engine's `check-fit` and the runner's seam now carry the attempt's intent,
`FitCandidate`), applies the material rule on every layout report, and adds `sessionStaff` and
`latestReady` to the controller state, with `isPhraseOnScreen(n)` for chunk 25. The workspace
harness gained the session snapshot's `playhead`, `systems`, `waiting` and `latestReady` and the
audio seams `outputLatency`, `clockAnchor` and `phraseStartsAt`; the notation harness gained
`__notationSystems`. 14 Playwright tests in `tests/e2e/session/rolling-display-barlines.spec.ts`,
`rolling-display-fit.spec.ts` and `rolling-display-resize.spec.ts` run on the fake clock (eight
phrases per layout checked at every barline, a read-ahead of at least one measure, a phrase late
past its deadline included, a misfit retried and never drawn, resizes, and ends like Stop on shown
and waiting misfits), 6 more in `tests/e2e/notation/notation-phrase-systems.spec.ts`, and unit
tests cover the plan, `PhraseScore`'s session mode, the display and the controller. The entry
chunk's size budget in `npm run verify:boundaries` rose from 212 KiB to 220 KiB. Measured with
`npm run measure:rolling` on the reference machine on 2026-10-01 (figures in
[`docs/generation-latency.md`](../../../docs/generation-latency.md#rolling-display-chunk-16)):
for item 6, over two five-minute runs at 120 BPM the band's measure changed at most 17.2 ms from
the heard barline (none over 20 ms), but counted to the next painted frame it is up to 33.2 ms;
for item 15, at 240 BPM with the densest settings the longest main-thread block was 42.6 ms
against the 200 ms window. For [chunk 17](#chunk-17--midi-in-the-session): acknowledged notes are
filtered to the notes drawn on screen and apply per phrase, and the start marker is not drawn in
session mode. For [chunk 20](#chunk-20--review-and-generated-notes-export): the Review replaces
the redraw of phrase 1 at the end. For [chunk 25](#chunk-25--settings-mutation-control):
`isPhraseOnScreen(n)`. For ux-writer:
[Responsive Behavior](../../../ui_ux/screens/phrase-workspace/handoff.md#responsive-behavior)'s
example of waiting material, "a repeated phrase's bars 1–2", should read bars 3–4 (a repeat's bars
1–2 are drawn at the deadline into the top system, already cleared). Technical choices:
[`docs/session-engine.md`](../../../docs/session-engine.md#the-rolling-display) and
[`docs/notation-engraving.md`](../../../docs/notation-engraving.md#session-systems). Decided in the
chunk, awaiting the owner's acceptance: until chunk 20's Review, the staff leaves session mode at
every end and draws phrase 1 again in the window's layout; the playhead reads heard time
(`now - outputLatency`) once per animation frame, so the engine, on context time, can ready the
phrase after next while the band is still in the last measure, and that phrase counts as waiting
material; a session-mode engraving failure ends the session like Stop; and no start marker is
drawn in session mode. Still open for the v2.0 gate: whether item 6's 20 ms is judged at the
band's change (met) or at the painted frame (not met: about one frame later by construction).

**Goal.** Make the staff roll. Two systems alternate: the player reads one while the other is
refilled. The playhead band follows the audio clock. Each look-ahead phrase is checked against the
held layout before it is accepted. A window change re-engraves in the held layout, or ends the
session when what is shown or waiting no longer fits.

**Spec sections:** [§4](master-spec.md#4-look-ahead-and-failure-handling) (a look-ahead phrase
must fit), [§6](master-spec.md#6-backing-click-count-in-and-tempo) (the audio clock, the window
during a session), items 1, 6, 15, 24 and 25.

**Design docs:** [play-session intent: The Rolling Display](../../../ui_ux/flows/play-session/intent.md#the-rolling-display);
[phrase-workspace handoff: Notation Contract](../../../ui_ux/screens/phrase-workspace/handoff.md#notation-contract)
(session staff layout, playhead band),
[Responsive Behavior](../../../ui_ux/screens/phrase-workspace/handoff.md#responsive-behavior);
[`motion.md`](../../../ui_ux/motion.md) (the refill fade).

**Atoms:** `rule_look_ahead_phrase_must_fit_staff`, `rule_look_ahead_deadline`,
`rule_session_layout_fixed_at_start`, `rule_session_ends_when_staff_too_small` (material already
waiting), `rule_playhead_follows_audio_clock`, `rule_phrase_one_is_idle_phrase`; v1:
`module_notation_layout_preflight`.

**Depends on:** [chunk 3](#chunk-3--notation-layout-v2),
[chunk 6](#chunk-6--note-identity-and-session-overlays),
[chunk 15](#chunk-15--session-screen-start-and-end).

**Done when** (all hold):

- Where a phrase fits one system, whole phrases alternate between the top and bottom systems. In
  the split layout, bars 1–2 are always on top and bars 3–4 below. When the playhead leaves a
  system, that system clears and refills with what comes next. A workspace-harness scenario on
  the fake clock runs eight phrases in each layout and checks what each system shows at every
  barline.
- The read-ahead never drops below one measure (item 1).
- The fit check chunk 8 injects is the chunk 3 planner in the held layout. A queued phrase too
  wide for it is never drawn and counts as a failed attempt (item 25).
- A resize within the held layout re-engraves both systems at the new size and moves no note
  between systems. A resize that makes what is shown, or what is checked and waiting, no longer
  fit ends the session like Stop. No notation error ever shows in a session (items 24, 25).
- A note once drawn doesn't change until its system is refilled. Nothing in v2.0 discards a
  look-ahead phrase once it is drawn; from v2.1, [chunk 25](#chunk-25--settings-mutation-control)
  asks this chunk whether any of a look-ahead phrase is on screen yet.
- In real Chromium, over a five-minute session at 120 BPM, the playhead band's measure changes
  within 20 ms of the audio clock's barline (item 6).
- In real Chromium at 240 BPM with the densest settings, no main-thread task runs longer than the
  scheduler's window (item 15). The measurement method is chunk 1's.

**Blocked by:** nothing.

### Chunk 17 — MIDI in the session

**Release:** v2.0. **Done on 2026-10-02** on branch `v2-chunk-17` (not merged). The session
controller's MIDI side, `src/components/workspace/workspace-session-midi.ts`, loads with the
controller, outside the entry chunk. At Idle with a controller connected, only phrase 1's first
attacked note at its exact concert pitch starts the session, through the same `start()` as the
Start click; `startingNote` (the pure `src/session/starting-note.ts`) is non-null exactly when
playing it would start one, and drives the cue row's `start-note-line` ("Play this note to start:
B♭4", the written pitch spelled as on the staff) and the staff's start marker. Nothing starts while
the connection sheet is open: the shell emits `connection-sheet-open-change` from a synchronous
watcher, `App.vue` writes `WorkspaceSession.connectionSheetOpen`, and the controller reads it at
each note; chunk 13's item-17 tests now assert it against a control in which the same note starts
the count-in. The mode is fixed at the start: a session reads the controller only if it was
connected then. A Start click with the selection away gives a controller-less session, and the
MIDI controller's new `holdReattachment()` and `releaseReattachment()` keep the same device from
reattaching until the session ends (items 10, 20). A controller session acknowledges played notes
with chunk 14's matcher (the pure `src/session/session-acknowledgement.ts`, its windows re-placed
as each phrase is readied, with the USB latency correction); matched notes take `note-ack` through
`useScoreOverlays`, and a wrong note changes nothing on screen: a Playwright test compares
byte-identical screenshots before and after (item 7). The history gained `recordPlayedNote` and
`recordAcknowledgement`, placed into phrases by onset when it is read; the starting note and the
count-in's notes are in no phrase; stored times are latency-compensated; and held notes are
released (no earlier than the last mapped message) and recorded before the engine's end closes
the history (item 18). More than 30 s after the latest played note ends the session
(`silence-timeout`, §7); the starting note arms the count, and a session with no note played never
times out. A controller lost mid-session shows the disconnect banner in `session-cue-row` with its
countdown from 30, and the header's disconnected badge through the session freeze
(`useControllerStatus` takes `lostInSession`); the same device back within 30 s clears both,
restarts the silence count if it had begun, and leaves the notes that fell due during the gap
unacknowledged; otherwise the session ends at 30 s (`controller-lost`) (item 16). The timers are
pure, in `src/session/session-midi-timers.ts`. The session runner (the engine and the failure
ladder) now loads lazily with the controller (`WorkspaceSession.loadSessionRunner`), so the entry
chunk went from 228,797 B to 210,760 B; about 9 kB of shared domain code moved into a chunk the
entry still preloads at startup, and the budget in `npm run verify:boundaries` stays at 224 KiB.
Unit tests cover the reattachment hold, the history's placement, the starting note, the tracker,
the timers, the controller's MIDI side and the components (4,235 unit tests pass). Six new
Playwright specs, `tests/e2e/session/session-midi-*.spec.ts`, cover the start, the history, the
acknowledgement, the silence, the controller's loss and the controller away; the workspace
harness's `session.state()` gained `startingNote`, `controllerLost`, `acknowledged`,
`sessionHasController` and `lastHistoryPhrases`, and the harness gained `generatedTimelines()`;
`test:a11y` gained 4 scans (the start line and the banner, light and dark). The new
[`docs/midi-tuning.md`](../../../docs/midi-tuning.md) lists the constants, where they live, a
measurement procedure and an empty results table. Technical choices:
[`docs/session-engine.md`](../../../docs/session-engine.md#the-session-controllers-midi-side) and
[`docs/midi-input.md`](../../../docs/midi-input.md#technical-choices-made-in-chunk-17). Atoms:
`documentalist` proposes REVIEW for most of the chunk's atoms, with the owner's agreement, and
`service_workspace_session_flow` now describes the MIDI side. The owner's rulings are needed on
`rule_silence_timeout_ends_session` and `rule_controller_reconnection_window` (whether the starting
note counts as "in the session", and the re-arm on reattachment);
`rule_played_onset_latency_compensation` stays blocked by the tuning and O71. Decided in the chunk,
awaiting the owner's acceptance: the starting note arms the silence timer; a reattachment restarts
the silence count only if a note had armed it; the history stores compensated times; the USB
correction applies to every controller; the two end causes, `silence-timeout` and
`controller-lost`; reattachment is held only when the selection is away at a controller-less
start; and notes due during a loss are passed over even when their window is still open at the
reattachment. Still open: the last Done-when item, tuning the windows and latency constants on the
reference hardware (a breath controller over USB and a USB keyboard), could not be done here for
want of the hardware; the procedure is in `docs/midi-tuning.md` for the owner. Bluetooth stays
best-effort (O71), and §12's controller check on the reference hardware is still open for the v2.0
gate. _Since 2026-10-03 (spec D173), the tuning on the reference hardware and the controller check
there belong to the v2.4 gate, [chunk 35](#chunk-35--v24-release-gate-real-hardware-checks), not
the v2.0 gate; the owner's rulings above stay in the v2.0 gate. Since 2026-10-05 (spec D183)
chunk 35 is folded into [chunk 21](#chunk-21--v20-release-gate), so these checks are in the v2.0
gate again; the owner accepted the rulings above as built (spec D184). Since 2026-10-06 (spec
D191) O71 is closed: USB is the tested path and Bluetooth best-effort, so
`rule_played_onset_latency_compensation` waits only for the tuning._

**Progress:**

| Step               | State | Notes                                                                                                                                                                                               |
| ------------------ | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. ATD preflight   | Done  | PROCEED-WITH-SIGNOFF-PENDING                                                                                                                                                                        |
| 2. Tests first     | Done  | Unit specs for each pure module and the controller's MIDI side; six Playwright specs                                                                                                                |
| 3. Implement       | Done  | The starting note, the acknowledgement, the history's played notes, the silence and loss timers, the reattachment hold, the lazy session runner and the harness seams                               |
| 4. Verify          | Done  | `npm run quality` passes; the tuning on the reference hardware is still open                                                                                                                        |
| 5. Documents       | Done  | `docs/midi-tuning.md` (new), `docs/session-engine.md`, `docs/midi-input.md`, `docs/midi-acknowledgement.md`, `docs/controller-connection.md`, `docs/phrase-workspace.md`, `docs/testing.md`, README |
| 6. ATD stewardship | Done  | Tags checked; atoms await the owner                                                                                                                                                                 |

**Goal.** Bring the controller into the session: the starting note and its line, live
acknowledgement, played notes recorded in the history, the 30-second silence rule, a controller
lost mid-session with its banner and 30-second window, and the controller-less cases. Then tune
the windows and latency constants on the reference hardware.

**Spec sections:** [§6](master-spec.md#6-backing-click-count-in-and-tempo) (the starting note),
[§7](master-spec.md#7-sessions-review-export-and-privacy) (silence, what's recorded),
[§8](master-spec.md#8-midi-input-and-note-acknowledgement) (starting while the controller is
away, losing it mid-session, acknowledgement, latency), items 7, 9, 10, 16, 17 and 20.

**Design docs:** [play-session intent: Starting, Branches](../../../ui_ux/flows/play-session/intent.md#branches);
[controller-connection flow handoff: Mid-session controller loss](../../../ui_ux/flows/controller-connection/handoff.md)
and [intent: A controller lost during a session](../../../ui_ux/flows/controller-connection/intent.md);
[phrase-workspace handoff: States](../../../ui_ux/screens/phrase-workspace/handoff.md#states)
(the starting-note line, silent controller, lost controller),
[Notation Contract](../../../ui_ux/screens/phrase-workspace/handoff.md#notation-contract)
(acknowledgement).

**Atoms:** `rule_midi_starting_note`, `rule_starting_note_named`,
`rule_starting_note_only_starts_count_in`, `rule_silence_timeout_ends_session`,
`rule_controller_loss_mid_session`, `rule_controller_reconnection_window`,
`rule_controllerless_session_never_gains_controller`, `rule_start_while_controller_away`,
`rule_session_history_records_played_notes`, `rule_acknowledgement_highlights_expected_note_only`,
`rule_expected_note_window`, `rule_played_onset_latency_compensation`,
`rule_no_grading_or_mismatch_signal`.

**Depends on:** [chunk 13](#chunk-13--controller-connection),
[chunk 14](#chunk-14--note-acknowledgement), [chunk 16](#chunk-16--rolling-display).

**Done when** (all hold):

- At Idle with a controller attached, only phrase 1's first note at its exact pitch starts the
  count-in; the starting-note line names it exactly when playing it would start a session. Any
  other note, a note in any state of item 22, and a note with no controller attached start
  nothing, change nothing and name nothing (item 17). Workspace-harness scenarios on the fake
  MIDI access cover each case.
- The starting note is in no phrase of the history (item 18). Played notes whose onsets fall in a
  phrase are recorded in it with pitch, velocity, onset and release, together with the phrase's
  acknowledgements. v2.0 records them and shows them nowhere after the session; the review shows
  them from v2.1.
- A matched note lights up on the staff through chunk 6; an unmatched or wrong note changes
  nothing at all on screen. A test compares screenshots before and after a wrong note (item 7).
- With a controller attached, the session ends after more than 30 s without a note, counted from
  the first note played (§7).
- A controller lost mid-session shows the disconnect banner with its countdown. The same device
  back within 30 s reattaches with no check, and the silence timer restarts from the reconnection;
  otherwise the session ends at 30 s from the loss. Notes due while it was away stay unmatched
  (item 16).
- A Start click with the selected controller away starts a controller-less session that never
  gains a controller, count-in included; the device reattaches once the session ends (items 10,
  20).
- On the reference hardware (a breath controller over USB, and a USB keyboard), the windows and
  latency constants are tuned and documented in a new MIDI document under `docs/`, with the
  measurements (item 9).

**Blocked by:** in part, the controller check on the reference hardware. The tuning covers USB;
Bluetooth is best-effort, with no tuning of its own (O71, settled 2026-10-06, spec D191).

### Chunk 18 — MusicXML encoding

**Release:** v2.0. **Done on 2026-09-29.** `encodeGeneratedNotesMusicXml` in
`src/export/musicxml/` turns the instrument and the session's phrases (number, written phrase,
tempo) into one score-partwise 4.0 file. It has no field for played notes and rejects extra fields
at run time. Phrase numbers must run 1, 2, 3… with no gap, so the session history
([chunk 9](#chunk-9--session-history)) must number only the phrases that sounded. A phrase in a new key opens with a new key signature. Every
phrase ends with a double barline except the last, which ends with a final barline: the owner
decided this on 2026-09-29, and `rule_generated_notes_musicxml_export` v0.2 now states both. The MusicXML 4.0 schema is stored under
`tests/fixtures/musicxml/schema/`, and a unit test validates the output and three golden files
against it offline, so the unit tests now need `xmllint` (package `libxml2-utils`). The MuseScore
check stays in chunk 20. `npm run quality` passes in full on the merged code.

**Goal.** A pure encoder from a session's phrases to one MusicXML file. No screen and no download:
chunk 20 adds those.

**Spec sections:** [§7](master-spec.md#7-sessions-review-export-and-privacy) (export, generated
notes, MusicXML), item 12.

**Design docs:** none.

**Atoms:** `rule_generated_notes_musicxml_export`, `req_session_export` (the MusicXML part); v1:
`module_notation_display_convention`, `entity_instrument_profile`,
`rule_notation_display_preserves_phrase`.

**Depends on:** [chunk 0](#chunk-0--atd-ingestion-of-the-master-spec).

**Done when** (all hold):

- The encoder takes phrases in session order, each with its number, written phrase and tempo, and
  the instrument. It lives in its own directory (`src/export/` is proposed) and uses the same
  written-phrase model as the staff (`src/domain/notation/`).
- The output is score-partwise 4.0: one part in written pitch; a `<transpose>` element with the
  instrument's transposition, left out for the C template; chord symbols; a rehearsal mark and a
  double barline per phrase; a metronome mark at the start and at every tempo change. Phrases sit
  back to back from phrase 1.
- Golden-file tests cover the three instrument templates, one tempo change and a two-chord
  measure. The output is well formed and validates against the MusicXML 4.0 schema.
- It never takes a played note: its input type has none.

**Blocked by:** nothing. The MuseScore check is in [chunk 20](#chunk-20--review-and-generated-notes-export).

### Chunk 19 — Generated-notes MIDI encoding

**Release:** v2.0. **Done on 2026-09-29.** `encodeGeneratedNotesMidi` in `src/export/midi/` writes
one Standard MIDI File, type 1. Track 1 holds the 4/4 time signature, the tempo map and a
"Phrase n" marker per phrase. Track 2 holds the generated line at concert pitch, with each tied
note as one held note. The backing gets track 3 only when it is passed in. The input has no field
for played notes, and tempos must be whole numbers from 60 to 240 BPM. The resolution is fixed at
960 ticks per quarter note: at 60 BPM, rounding moves an onset by at most about 0.52 ms. MIDI
stores tempo in whole microseconds, so a tempo like 70 BPM drifts from the audio clock by at most
about 1 ms per 2000 quarter notes. A small SMF reader written for the tests reads the file back
and gets the same notes and tempo map. For [chunk 20](#chunk-20--review-and-generated-notes-export):
the backing needs a small adapter to `{ number, notes }` per phrase, and one channel can't sound
the same pitch twice at once. The check in a real MIDI tool stays in chunk 20. For chunk 22:
reuse the 960 ticks per quarter note and `conductorTrackEvents`. `rule_played_notes_export_unquantized_timing`
already links the resolution constant but must not count as implemented until chunk 22. An
optional architecture atom for the shared MIDI time grid could be recorded before then.
`npm run quality` passes in full on the merged code.

**Goal.** A pure encoder from a session's phrases to one Standard MIDI File, type 1: the generated
line at concert pitch, the tempo map, a marker per phrase, and an optional backing track. It fixes
the file's time resolution for chunk 22 too.

**Spec sections:** [§7](master-spec.md#7-sessions-review-export-and-privacy) (export, generated
notes, MIDI; played notes, lining up), item 12.

**Design docs:** none.

**Atoms:** `rule_generated_notes_midi_export`, `req_session_export` (the MIDI part),
`rule_export_contents_never_merged`; v1: `entity_concert_event_timeline`.

**Depends on:** [chunk 0](#chunk-0--atd-ingestion-of-the-master-spec).

**Done when** (all hold):

- The encoder takes phrases in session order with their numbers, concert timelines and tempos,
  and optionally the backing's note events. It doesn't render the backing: chunk 20 feeds it
  chunk 11's output.
- The file has the generated line on its own track, a full tempo map, one marker per phrase with
  its number, and the backing on its own track only when asked. Phrase 1 starts at time zero, with
  no gap between phrases.
- The time resolution is fixed and documented, fine enough that rounding moves no onset more than
  1 ms at 60 BPM, the slowest tempo.
- Golden-file tests cover a tempo change, a tie across a barline and the backing on and off. A
  parser test reads the file back and gets the same notes and tempo map.
- It never takes a played note: its input type has none.

**Blocked by:** nothing.

### Chunk 20 — Review and generated-notes export

**Release:** v2.0. **Done on 2026-10-02** on branch `v2-chunk-20` (not merged). A session ended
once phrase 1 has sounded opens the last-session Review in the staff area's place: every phrase
that started sounding, in order, engraved from its stored timeline with its number and tempo. A
phrase only ever drawn as read-ahead is absent, a repeat looks like any phrase, and no played note
is shown. Engraving is lazy, a window around what is in view, so a 2 000-phrase history stays
responsive: the reference measurement of 2026-10-02 opens it in 157 ms alone and 337 ms during the
full `test:e2e` run
([`docs/generation-latency.md`](../../../docs/generation-latency.md#last-session-review-chunk-20)),
a reference that never gates. `Close review` leaves it, the `review-link` reopens it, and the next
session start discards it without confirmation; a reload discards everything. While the Review
shows, neither a click nor a note starts a session and no starting note is named. A fresh phrase
is generated at every end once phrase 1 has sounded; the next session's phrase 1 is the phrase on
screen at Idle. The generated-notes export lets the player pick MusicXML or MIDI (the backing track
for MIDI off by default) and gives exactly one browser download, the same bytes when repeated, with
no played note; the encoders load lazily in their own chunk, and any failure shows
`review-export-error`. A network and storage spy across a MIDI session with played notes, the
Review and every export sees no request and no write (item 13). One fix came from the e2e specs: a
session ended by turning to portrait made the fresh phrase a notation error; now, in the fresh run
only, a staff not laid out counts as no room (ux D152). Design details settled during the build
are ux D149–D153 ([`ui_ux/decisions.md`](../../../ui_ux/decisions.md)). The entry chunk went from
210,760 B to 217,837 B; the budget stays at 229,376 B. `npm run quality` passes: 4,406 unit tests
in 250 files, 278 `test:e2e`, 43 `test:a11y` and 77 `test:notation` tests (plus 3 calibration
skips). Atoms: `module_idle_fit_round`, `module_session_rolling_display` and
`service_workspace_session_flow` are revised, the interim end after phrase 1 removed; `atd:lint`
and `atd:check` pass. Still open, for the owner: the hand checks of the fourth Done-when item,
MuseScore opening the three MusicXML templates (the B♭ tenor and E♭ alto saxophones with
`<transpose>`, the C keyboard without) and a MIDI tool opening the MIDI files (tempo map,
markers). The files are in `tests/fixtures/export-hand-check/`; the checklist and results table
are in [`docs/export.md`](../../../docs/export.md#hand-check). No atom's status was advanced:
`req_session_export` and the two generated-notes export rules wait for those checks. _Since
2026-10-03 (spec D173), these hand checks belong to the v2.4 gate,
[chunk 35](#chunk-35--v24-release-gate-real-hardware-checks); they no longer hold up v2.0. Since
2026-10-05 (spec D183) chunk 35 is folded into [chunk 21](#chunk-21--v20-release-gate): they are
in the v2.0 gate again, and whether they block its tag is O105. Since 2026-10-06 (spec D193) they
do not: they follow the tag, as a v2.0.x hand-check note._

**Progress:**

| Step               | State | Notes                                                                                                                                                                                    |
| ------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. ATD preflight   | Done  | PROCEED; one non-blocking finding: master spec §7's barline wording, corrected as D171                                                                                                   |
| 2. Tests first     | Done  | Unit specs for the Review state, its host and navigation, the export and the download; Playwright specs for the Review, the export and privacy                                           |
| 3. Implement       | Done  | The Review, `Close review` and the review link, the fresh phrase at the session end, the lazy export and the download, and the harness seams                                             |
| 4. Verify          | Done  | `npm run quality` passes; the MuseScore and MIDI-tool hand checks are still open, for the owner                                                                                          |
| 5. Documents       | Done  | `docs/export.md`, `docs/generation-latency.md`, `docs/session-engine.md`, `docs/notation-engraving.md`, `docs/phrase-workspace.md`, `docs/audio-transport.md`, `docs/testing.md`, README |
| 6. ATD stewardship | Done  | Tags checked; three atoms revised; status advances await the owner and the hand checks                                                                                                   |

**Goal.** The last-session review: every phrase that sounded, in order, engraved as it was shown,
with its number and tempo. The generated-notes export action, MusicXML or MIDI, as a browser
download. Leaving the review, and reopening it until the next session starts.

**Spec sections:** [§7](master-spec.md#7-sessions-review-export-and-privacy) (the review, export,
privacy, the next session's phrase 1), [§6](master-spec.md#6-backing-click-count-in-and-tempo)
(no session starts while the review shows), items 12, 13, 17 and 28.

**Design docs:** [review-and-export flow handoff](../../../ui_ux/flows/review-and-export/handoff.md)
and [intent](../../../ui_ux/flows/review-and-export/intent.md);
[last-session-review screen handoff](../../../ui_ux/screens/last-session-review/handoff.md) and
[intent](../../../ui_ux/screens/last-session-review/intent.md) (ux D135–D144).

**Atoms:** `req_last_session_review`, `rule_new_session_discards_review`,
`rule_session_end_generates_next_phrase_one`, `req_session_export`,
`rule_generated_notes_musicxml_export`, `rule_generated_notes_midi_export`,
`rule_repeat_phrase_marked_internally_only`, `rule_session_data_never_sent_or_stored`,
`rule_optional_midi_privacy`, `rule_no_grading_or_mismatch_signal`,
`rule_same_controller_reattaches` (in the Review); v1: `rule_ephemeral_session_state`.

**Depends on:** [chunk 9](#chunk-9--session-history), [chunk 17](#chunk-17--midi-in-the-session),
and its design.

**Done when** (all hold):

- A session ended after phrase 1 sounded opens the review, which shows every phrase that started
  sounding, in order, engraved from the stored timeline, with its number and tempo. A phrase only
  ever drawn as read-ahead is not in it. A repeat looks like any other phrase. A 2 000-phrase
  history stays responsive.
- The review shows no played note, although the history holds them since chunk 17: they appear
  from v2.1, in [chunk 23](#chunk-23--review-played-notes).
- The generated-notes action lets the player pick MusicXML or MIDI (and the backing track for
  MIDI, off by default) and downloads exactly one file, built from the history by chunks 18 and 19. Exporting twice gives identical bytes. No played note is in either file.
- MuseScore opens the MusicXML correctly for each of the three instrument templates: the B♭ tenor
  and E♭ alto saxophones, which transpose, with their `<transpose>` element, and the C keyboard
  without one. A MIDI tool opens the MIDI file with the right tempo map and markers. The checks
  are done by hand and written down. _Moved to the v2.4 gate, chunk 35 (spec D173), and with it
  into the v2.0 gate, chunk 21 (spec D183)._
- At every session end once phrase 1 has sounded, a fresh phrase is generated; phrase 1 of the
  next session is the phrase on screen at Idle when it starts (item 28). While the review shows,
  neither the Start click nor any note starts a session, the starting note included, and no
  starting note is named. Leaving the review keeps it reachable until the next session starts,
  which discards it without confirmation. Reloading the page discards everything.
- A network and storage spy across a full session, the review and both exports sees no request
  and no write (item 13).

**Blocked by:** nothing. The design is written (UX unit 6, ux D135–D144) and O84 is closed (spec
D169, with its start from the review replaced by spec D170, 2026-09-30). The session history must
carry the session's start time and instrument profile, for the export file names and the review's summary line (chunk 9).

### Chunk 21 — v2.0 release gate

**Release:** v2.0, its single release gate (spec D183). The former gates of v2.1
([chunk 26](#chunk-26--v21-release-gate)), v2.2 ([chunk 31](#chunk-31--v22-release-gate)) and v2.4
([chunk 35](#chunk-35--v24-release-gate-real-hardware-checks), the real-hardware checks) are
folded into this one; their criteria are below.

**Goal.** Check the whole definition of done on the merged code, its v2.1, v2.2 and v2.4 parts
included, run the real-hardware checks, close what the earlier chunks left open, and get the
owner's go.

**Spec sections:** [§11](master-spec.md#11-definition-of-done),
[§12](master-spec.md#12-open-questions-carried-forward), [§10](master-spec.md#10-adaptive-tempo),
[§8](master-spec.md#8-midi-input-and-note-acknowledgement) (the windows and latency).

**Design docs:** every handoff above.

**Atoms:** every atom tagged `release-v2.0` (since spec D183 this includes the former v2.1 and
v2.2 atoms, which also carry `part-v2.1` or `part-v2.2`). The tag `v2.4-check` marks the atoms
whose last check is a real-hardware one: the real-hardware checks govern `rule_played_onset_latency_compensation`,
`rule_expected_note_window`, `rule_playhead_follows_audio_clock`,
`rule_generated_notes_musicxml_export`, `rule_generated_notes_midi_export`,
`rule_controller_transposition_check` and `req_session_export`; no atom states item 15's
main-thread budget yet. v1: `vision_infinite_flow_first_release`,
`specification_behavioral_quality_gates`, `specification_browser_only_operation_verification`,
`specification_ephemeral_state_verification`, `contract_infinite_flow_first_release`.

**Depends on:** every other v2 chunk (0–20, 22–25 and 27–30). For the real-hardware checks, the
reference hardware: a breath controller over USB, a USB keyboard, and the owner's reference
machine.

**Done when** (all hold):

The definition of done, on the merged code:

- Every one of items 1–28, and every v2.1 and v2.2 criterion of §11, has a named test or a written
  hand check, listed in one table in the release notes under `docs/release/`. Items 6, 9 and 15,
  and item 12's opening of real files, are checked by the real-hardware checks below.
- Item 1: a sweep over the seed matrix and every supported combination at 60, 120 and 240 BPM, on
  the fake clock, meets every deadline and survives injected failures.
- Item 2: the property tests of chunk 7 check every join made with carry-in, and a join into the
  standalone phrase or into a repeat is held to no join rule. Item 3: the standalone phrase's
  output is v1's.
- Items 12 and 13: the export tests of chunks 18–20 and 22 pass; the privacy spy runs across a
  session, the review and both exports, and sees nothing.
- Item 14: every v1 release test still passes; offline use after first load works with no audio
  asset added.
- Item 21: a wake lock the browser drops while the session runs and the page is visible is asked
  for again, silently, and nothing shows whether it is granted or refused; tests fake the drop
  (spec D187). The code does not do this yet: a small code unit, after the ISS-006 fix, adds it to
  `createHeldLock` (`src/components/workspace/browser-screen-locks.ts`) and updates
  `rule_screen_wake_lock_during_session`.
- Part v2.1 (from chunk 26): a setting changed by the settings-mutation flag first shows at the
  first phrase that hasn't begun sounding, or at the phrase after it, and no note on screen ever
  changes.
- Part v2.2 (from chunk 31): adaptive tempo meets §10, with a flat, unconditional schedule, never
  an automatic decrease, the correct reset at the session's end, and generation provably
  unaffected; the multi-phrase tension arc meets the criteria its settled spec gives (§3, §11).

The real-hardware checks, part v2.4 (from chunk 35), on the reference machine and hardware:

- Item 9: the windows and latency constants are measured and tuned on the reference hardware by
  the procedure in [`docs/midi-tuning.md`](../../../docs/midi-tuning.md#measuring-on-the-reference-hardware),
  one results row per device. A window value other than 150 ms early and 200 ms late has the
  owner's sign-off, and `rule_expected_note_window` was revised first.
- The controller check on the reference hardware: with the device's transpose setting at C, B♭
  tenor and E♭ alto, the MIDI note a written middle C sends, whether an octave setting changes it,
  and the note-on velocity, are written down
  ([`docs/controller-connection.md`](../../../docs/controller-connection.md#the-verdict)). The
  owner decides from them whether a manual input-transposition setting is needed; if it is, it is
  new scope, specced on its own. Bluetooth MIDI (O71) was tried at the same sitting, on
  2026-10-06, and settled (spec D191): USB is the tested path, Bluetooth best-effort.
- Item 12, in real programs: MuseScore opens real MusicXML exports for the three instrument
  templates, the two saxophones with `<transpose>` and the C keyboard without; a MIDI tool opens
  real MIDI exports with the right tempo map and markers. The checklist and results table are in
  [`docs/export.md`](../../../docs/export.md#hand-check); the files are regenerated from the code
  the gate checks, as in `tests/fixtures/export-hand-check/`. This does not block the tag (spec
  D193): it may follow it, written down as a v2.0.x hand-check note.
- Items 6 and 15, measured in real Chromium on the reference machine and hardware: the playhead
  stays within 20 ms of the audio output over five minutes, and no main-thread task runs longer
  than the audio scheduler's look-ahead window during a 240 BPM session.
- Part v2.1, in a real program: imported together into a real DAW, the played-notes and
  generated-notes MIDI files of one session line up phrase by phrase, with the same tempo map and
  markers. This does not block the tag (spec D193): it may follow it, written down as a v2.0.x
  hand-check note.
- Part v2.1, on the reference machine: the first generation after an automatic setting change
  (the latency prerequisite's cold run, as in [chunk 1](#chunk-1--baseline-checks)) is
  re-measured on the code the gate checks, and the look-ahead deadline keeps its headroom at
  240 BPM. It is written down.
- Every automated test of the gate still passes with any tuned constant.

What the earlier chunks left open:

- Settled on 2026-10-05: the backing as chunk 11 built it, O57's listening test (spec D185); the
  owner's rulings on what chunk 17 left for acceptance, the starting note arming the silence timer
  and the silence count starting again at a reattachment, with the chunk's other choices (spec
  D184); and the atom wording chunks 8, 13, 20, 27 and 29 left open (spec D186). Starting from
  the Review was settled earlier: spec D170, no session starts while it shows.
- Closed on 2026-10-06: Bluetooth MIDI (O71), tried at the hardware sitting: USB is the tested
  path, Bluetooth best-effort, and Android Chrome is still to try, not blocking (spec D191).
  Closed on 2026-10-05: the wake lock dropped mid-session (O87), asked for again, as item 21's
  criterion above (spec D187); and the audio mix's levels (ux Q31): the click and backing volumes'
  ranges and defaults, and the linear volume-to-gain mapping, are final as built (spec D188).
- The owner has answered what a session's last phrase may owe (spec D167). Chunk 7's carry-over
  criteria hold under that answer, and `documentalist` has given `rule_leap_recovery` and
  `rule_open_phrase_ending` their v2 scope.
- The owner has signed off VISION v0.4. `documentalist` has settled the release tags of the
  v2.1, v2.2 and v2.4 atoms (merged into `release-v2.0` or kept as history, spec D183) and
  advanced the atoms' status with the owner's agreement.
- The owner decides the tag. v2.0 ships with the timing constants tuned on the reference hardware.
  Settled on 2026-10-06 (O105, spec D193): the real-program export checks (MuseScore, a MIDI tool,
  the DAW line-up) follow the tag as a v2.0.x hand-check note; the controller check, the windows
  and latency tuning, the playhead and main-thread measurements and the cold run block it.

**Blocked by:** every open item above, until closed: the VISION sign-off, and the real-hardware
checks that block the tag (O71 and O105 were closed on 2026-10-06, spec D191 and D193). The real-hardware checks wait for the reference hardware to be at hand; the owner runs them
when they have time. O97, which item 2's check depended on, was answered on 2026-09-29 (D167).

### Chunk 22 — Played-notes MIDI encoding

**Release:** v2.1. **Done on 2026-10-03.**
`encodePlayedNotesMidi` writes the history's played notes, through
`playedNotesMidiInputFromHistory`, as a two-track MIDI file: the generated-notes file's conductor
track, byte for byte, then the played notes at their concert pitch and original velocity, each
onset placed from its phrase's start at that phrase's tempo, unquantized; a seeded property test
over 500 random sessions finds no onset more than 1 ms off. One source fix came with it: the
session controller now records each sounding phrase in the history at the transport's scheduled
start, not at the engine's floored time, which could be 25 ms or more late and would have shifted
the played notes and broken the 1 ms rule. The played-notes file's name and its export action are
chunk 23's; the check of the two files in a real DAW is chunk 35's (D180)
([`docs/export.md`](../../../docs/export.md#played-notes-as-midi)). No atom's status was advanced.

**Goal.** A pure encoder from the history's played notes to one MIDI file that lines up with the
generated-notes MIDI file of the same session.

**Spec sections:** [§7](master-spec.md#7-sessions-review-export-and-privacy) (played notes),
[§11, v2.1](master-spec.md#added-by-v21-and-later).

**Design docs:** none.

**Atoms:** `req_played_notes_export`, `rule_played_notes_export_unquantized_timing`,
`rule_played_notes_export_aligns_with_generated_midi`, `rule_export_contents_never_merged`,
`rule_session_history_records_played_notes`.

**Depends on:** [chunk 9](#chunk-9--session-history),
[chunk 19](#chunk-19--generated-notes-midi-encoding).

**Done when** (all hold):

- The file holds exactly the played notes whose onsets fall in a phrase: not the starting note,
  nothing from the count-in. Pitch is the concert pitch as received; velocity is the original.
- Each onset keeps its time relative to its phrase, through the tempo map, unquantized. A
  property test over random onsets and tempos, including a tempo change, finds no onset more than
  1 ms from where it was played.
- A note lasts until its release; one still held at the session's end stops there.
- The tempo map, the phrase markers and the time resolution are those of chunk 19's file for the
  same session. A test encodes both and compares the tempo map and markers byte for byte.
- It never holds the backing or a generated note.

**Blocked by:** nothing.

### Chunk 23 — Review: played notes

**Release:** v2.1. **Done on 2026-10-04.** The Review gains a `Played notes` switch and an
`Export played notes` action, both hidden when the session holds no played note. With the switch
on, a lane under each staff line draws one neutral bar per played note, unquantized, on a time
axis anchored to the written notes, rests and barlines (ux D163, D166); nothing marks a note
matched or unmatched (ux D161). The action downloads one `-played.mid` file from chunk 22's
encoder, sharing the session's file stem with the generated-notes files. The privacy spy still
sees nothing. The real-DAW import check stays with chunk 35.

**Goal.** Played notes in the review, behind a toggle, unquantized and neutral, and the
played-notes export action beside the generated-notes one.

**Spec sections:** [§7](master-spec.md#7-sessions-review-export-and-privacy) (the review, played
notes, both contents), [§11, v2.1](master-spec.md#added-by-v21-and-later).

**Design docs:** the Review's v2.1 additions, unit 7 in [`ui_ux/todo.md`](../../../ui_ux/todo.md)
(ux D161–D166), in [`ui_ux/screens/last-session-review/`](../../../ui_ux/screens/last-session-review/)
and [`ui_ux/flows/review-and-export/`](../../../ui_ux/flows/review-and-export/).

**Atoms:** `rule_review_played_notes_toggle`, `req_played_notes_export`,
`rule_export_contents_never_merged`, `rule_no_grading_or_mismatch_signal`,
`rule_session_data_never_sent_or_stored`.

**Depends on:** [chunk 22](#chunk-22--played-notes-midi-encoding), v2.0, and its design.

**Done when** (all hold):

- Played notes show only when the toggle is on, unquantized and in a neutral colour. They come
  from the session history, which holds the played notes and the acknowledgements since v2.0
  (chunk 17); this chunk records nothing new. A matched note may be marked as matched; nothing
  ever marks a note that didn't match.
- The played-notes action downloads exactly one MIDI file from chunk 22. It is unavailable when
  the session holds no played note. Using both actions gives two files, whose names say which
  content each holds and that they come from the same session.
- The two MIDI files of one session share the tempo map and markers, as chunk 22's test checks.
  Importing both into a real DAW, by hand, is a v2.4 check:
  [chunk 35](#chunk-35--v24-release-gate-real-hardware-checks) (spec D180).
- The privacy spy of item 13 still sees nothing.

**Blocked by:** nothing (design unit 7 done, merged 2026-10-04).

### Chunk 24 — Settings-mutation engine

**Release:** v2.1. **Done on 2026-10-03.**
The owner accepted the scale of one grade per setting proposed while this chunk was built (spec
D181, master spec v1.27). The latency item is accepted as it stands (D181, D180): the 250 ms cold
target is a goal, not a gate; `rule_look_ahead_deadline` is the gate, and it holds because a
mutation always has 3 measures before its deadline. The re-measurement on real hardware is a v2.4
check: [chunk 35](#chunk-35--v24-release-gate-real-hardware-checks).

**Goal.** The logic of the settings-mutation flag, and of applying a setting change at a phrase
boundary, which the flag is the first thing to need: every few phrases, one eligible setting moves
by at most one step; an unsupported combination rerolls; the change applies at the next phrase
boundary, and never to a look-ahead phrase already partly on screen. A key or collection change
drops the harmonic part of the carry-in. In v2.0 the settings are only locked during a session;
this chunk adds the first way for one to change.

**Spec sections:** [§5](master-spec.md#5-control-changes-during-a-session) (the automatic sources,
the phrase boundary, a key change drops the harmonic part),
[§11 prerequisites](master-spec.md#prerequisites-that-must-already-be-in-place) (the cold run
after a mid-session change), [§11, v2.1](master-spec.md#added-by-v21-and-later),
spec D176 (cadence and default) and D177 (the flag with `Eighth`).

**Design docs:** none.

**Atoms:** `req_settings_mutation_flag`, `rule_mutation_rerolls_unsupported_combination`,
`rule_session_change_applies_at_phrase_boundary`, `rule_key_change_drops_harmonic_carry_in`,
`rule_varying_register_once_per_session`, `rule_sixteenth_unavailable_below_tablet_width`,
`rule_join_carry_in_limited`, `rule_look_ahead_deadline`, `rule_session_settings_locked`; v1:
`rule_unsupported_rhythm_settings_block_generation`, `module_generation_control_catalog`,
`module_generation_worker_protocol`, `module_pitch_planner`, `module_register_intent_boundary`.

**Depends on:** [chunk 1](#chunk-1--baseline-checks) (the cold case after a setting change),
[chunk 4](#chunk-4--note-density-on-small-screens),
[chunk 7](#chunk-7--generator-continuation), [chunk 8](#chunk-8--session-engine).

**Done when** (all hold):

- A mutation is a pure, seeded function: it picks one setting other than the instrument and tempo,
  and moves it one step up or down. Unit tests check every setting's steps.
- A mutation that lands on an unsupported combination, or on `Sixteenth` below
  `bp-tablet-landscape`, mutates again until it lands on a supported one. No cycle is skipped. A
  property test over every starting combination always ends on a supported one.
- The session engine of chunk 8 applies a change at the first phrase that hasn't started
  sounding. A look-ahead phrase generated with the old settings is discarded and regenerated only
  when none of it is on screen yet and at least a measure remains before its deadline; otherwise
  it stays as it is and the change applies from the phrase after it. Whether any of it is on
  screen is an injected seam; chunk 25 connects it to the rolling display. Engine tests on timed
  events cover the three cases: nothing drawn with a measure left, partly drawn, less than a
  measure left.
- With the flag off, nothing changes a setting during a session: chunk 8's lock tests still pass.
- The generator of chunk 7 accepts a carry-in without its harmonic part, after a key or collection
  change; its pitch is re-checked against the new range and register window. Unit tests cover a
  pitch that no longer fits. A register change re-resolves `Varying`. Engine tests on timed events
  show both.
- Chunk 1's figure for the first generation after a setting change meets the working target,
  including a regenerated look-ahead phrase with one measure left at 240 BPM, or the owner has
  decided how to proceed.
- Mutations come 2 to 4 phrases apart, the count before each one, the first included, drawn from
  a seeded source, so the same stored inputs give the same mutations; a property test replays
  sessions from their inputs. The range and the default (off) are named constants (spec D176).
- In a session generating with `Eighth` under the narrow-window rule, a note-density mutation
  steps from `Eighth`, and `Sixteenth` counts as unavailable whatever the window's width (spec
  D177). Unit tests cover a session that stepped down and whose window is wide again.

**Blocked by:** nothing. O77 and O93 were answered on 2026-10-03 (spec D176, D177).

### Chunk 25 — Settings-mutation control

**Release:** v2.1. **Done on 2026-10-05.** `Vary settings`, `Off` at load, sits in a new "During a
session" control group, settable at Idle and in the Review and read-only during a session; on, a
session runs chunk 24's mutations from a seed drawn at its start. The locked controls show what the
sounding phrase was generated with, changing at its first beat inside fixed boxes, with the preset
status silent; the player's own settings are never written, so every end shows them again before
the fresh phrase is generated from them. The engine reads the rolling display for a settings
change, which only the workspace harness sends, since a mutation never lands on a drawn phrase.

**Goal.** The flag's on/off control, the settings panel quietly showing each automatic change, and
the flag running in the real session: chunk 24's engine connected to the rolling display.

**Spec sections:** [§5](master-spec.md#5-control-changes-during-a-session),
[§11, v2.1](master-spec.md#added-by-v21-and-later).

**Design docs:** the settings-mutation flag UI, `Vary settings`, unit 10 in
[`ui_ux/todo.md`](../../../ui_ux/todo.md) (ux D155–D157, D167–D171), owner-confirmed on 2026-10-05,
in [`ui_ux/screens/phrase-workspace/`](../../../ui_ux/screens/phrase-workspace/) and
[`ui_ux/flows/play-session/`](../../../ui_ux/flows/play-session/).

**Atoms:** `req_settings_mutation_flag`, `rule_automatic_change_updates_controls_quietly`,
`rule_session_settings_locked`, `rule_session_change_applies_at_phrase_boundary`; v1:
`rule_readonly_controls_keep_contrast`.

**Depends on:** [chunk 24](#chunk-24--settings-mutation-engine), v2.0, and its design.

**Done when** (all hold):

- The flag can be set at Idle and in the Review, and is read-only during a session.
- When a change applies, the locked control shows the new value with no highlight, no scroll and
  no shift. A workspace-harness test compares the layout before and after.
- Chunk 24's "any of it on screen" seam is answered by the rolling display of chunk 16. A
  workspace-harness scenario on the fake clock makes a change while the next phrase is partly
  drawn as read-ahead: that phrase stays as drawn and the change first shows in the phrase after
  it. No note on screen changes (the v2.1 criterion of §11).
- The control starts off (spec D176).
- When a session ends, by any of its causes, every setting the flag changed returns to the value
  the player chose before the session, as adaptive tempo resets to the starting tempo (spec D182):
  a register mutated from `Varying` is `Varying` again, the musical profile's "customized" marking
  is back to what it was before the session (one a mutation set is cleared, one already there
  stays), and the flag's own on/off choice is untouched. The restore happens before the end asks
  Idle for its fresh phrase, so that phrase is generated from the restored settings.
  Workspace-harness scenarios end a session after a mutation by Stop and by a hidden tab, and
  check the controls and the fresh phrase's settings.
- The restore is this chunk's to build, in the session controller. Chunk 24's engine only reports
  each change as a `settings-changed` output carrying the complete new settings; it never writes
  the player's controls, so nothing restores them until the controller keeps the settings chosen
  at the start and puts them back at the end
  ([`docs/session-engine.md`](../../../docs/session-engine.md#in-the-workspace)).

**Blocked by:** nothing (design unit 10 done, owner-confirmed 2026-10-05). O77, its cadence and
default, was answered on 2026-10-03: spec D176.

### Chunk 26 — v2.1 release gate

**Release:** v2.1. **Folded into [chunk 21](#chunk-21--v20-release-gate) on 2026-10-05 (spec
D183):** v2.1 is a part of v2.0, not a release, and has no gate of its own. Its criteria are
checked there: each v2.1 criterion of §11 with a named test or a written hand check, the privacy
spy, a setting changed by the flag showing only from the first phrase that hasn't begun sounding,
and the v2.1 atoms advanced with the owner's agreement. Its two checks in a real program or on
the reference machine (the DAW line-up of the two MIDI files and the cold run, spec D180) are
among chunk 21's real-hardware checks.

### Chunk 27 — Adaptive tempo engine

**Release:** v2.2. **Done on 2026-10-03.** The session engine runs the flat schedule: +5 BPM every
two counted phrases, up to 240 BPM, never down, back to the starting tempo when the session ends; a
phrase counts when it starts sounding with the controller attached, and while the controller is away
a due rise waits. Each phrase's tempo is fixed at its look-ahead deadline, and the click, the
backing, the phrase starts, the playhead, note acknowledgement, the session history and the exports
follow a per-phrase tempo map. Generation and replay keys only see the locked starting tempo; the
control that turns the schedule on is chunk 28.

**Goal.** The flat tempo schedule: +5 BPM every two phrases, up to 240 BPM, never down, reset to
the starting tempo when the session ends. Generation never sees it.

**Spec sections:** [§10](master-spec.md#10-adaptive-tempo),
[§11, v2.2](master-spec.md#added-by-v21-and-later).

**Design docs:** none.

**Atoms:** `req_adaptive_tempo`, `rule_adaptive_tempo_flat_schedule`,
`rule_adaptive_tempo_resets_after_session`, `rule_tempo_never_affects_generation`,
`rule_controller_attached_definition`.

**Depends on:** the v2.0 chunks (8, 9, 10 and 17 in particular).

**Done when** (all hold):

- With the flag on, the tempo rises by 5 BPM every two phrases, whatever is played, and stops at
  240 BPM. Engine tests on timed events check each step and the ceiling.
- The change applies at a phrase boundary; the audio transport and the playhead follow it with no
  gap. The history records each phrase's tempo, and the exports carry the tempo map.
- The flag is available only with a controller attached, and starts off when the page loads; the
  player's choice is kept between sessions while the page stays open.
- While a controller lost mid-session is away, the tempo does not rise, and the phrases that start
  sounding meanwhile do not count toward the next rise; counting resumes where it stopped when it
  reconnects (spec D179). A session started while the selected controller is away runs no
  adaptive tempo. Engine tests on timed events cover a loss across a due rise.
- At the session's end, the tempo control goes back to the starting tempo; the review records the
  tempo reached.
- A property test shows the same seeds and settings generate the same phrases with the flag on or
  off.

**Blocked by:** nothing. O99 was answered on 2026-10-03 (spec D179): the rise pauses while the
controller is away.

### Chunk 28 — Adaptive tempo control

**Release:** v2.2. **Done on 2026-10-05.** `Rising tempo`, `Off` at load, comes first in the
"During a session" group, settable at Idle and in the Review and read-only during a session;
without an attached controller its `On` is disabled with "Needs a connected controller.", the
player's choice kept, and a session keeps the availability it started with. During a session the
header and the read-only tempo stepper show the sounding phrase's exact tempo, off the stepper's
list included, and after a session that ran it the tempo field notes "Last session reached {n}
BPM.", held in memory only; nothing about performance is shown, stored or exported.

**Goal.** The flag's control, shown as unavailable with its reason when no controller is attached,
the exact tempo during a session, and the quiet "reached tempo" note at Idle.

**Spec sections:** [§10](master-spec.md#10-adaptive-tempo).

**Design docs:** the adaptive-tempo UI, `Rising tempo`, unit 8 in
[`ui_ux/todo.md`](../../../ui_ux/todo.md) (ux D155, D156, D158, D159, D172–D174), owner-confirmed
on 2026-10-05, in [`ui_ux/screens/phrase-workspace/`](../../../ui_ux/screens/phrase-workspace/) and
[`ui_ux/flows/play-session/`](../../../ui_ux/flows/play-session/).

**Atoms:** `req_adaptive_tempo`, `rule_adaptive_tempo_resets_after_session`,
`rule_no_grading_or_mismatch_signal`.

**Depends on:** [chunk 27](#chunk-27--adaptive-tempo-engine), v2.1, and its design.

**Done when** (all hold):

- The control can be set at Idle and in the Review; without a controller it is unavailable and
  says why.
- During a session the exact tempo in effect is shown, even off the control's list.
- Nothing about performance is shown, stored or exported.

**Blocked by:** nothing (design unit 8 done, owner-confirmed 2026-10-05). O99 was answered on
2026-10-03: spec D179.

### Chunk 29 — Multi-phrase tension arc

**Release:** v2.2. **Done on 2026-10-04.** Behind a session-start flag, off by default, each phrase
is generated under a four-phrase cycle of its tension: as chosen, one step tenser, as chosen, one
step calmer, clamped along Settled, Lift, Build and Edge. The step never reaches the settings in
effect, the mutation draws or the settings-changed output; it rides in the phrase's intent, so
replay keys need no format change, and the join between two phrases treats a step as a tension
change. The control that turns it on is chunk 30.

**Goal.** An opt-in tension arc that rises and falls across several phrases, instead of each
phrase's own arc. [Tension](../../../docs/music/lexicon.md#tension) is the app's setting for how
much melodic tension a phrase builds, and where.

**Spec sections:** [§3](master-spec.md#3-the-generation-unit-and-how-phrases-join) (the
multi-phrase tension arc).

**Design docs:** none.

**Atoms:** `req_multi_phrase_tension_arc`, `rule_multi_phrase_tension_arc_cycle`; v1:
`rule_tension_arc_level_policy`,
`rule_tension_arc_settled`, `rule_tension_arc_lift`, `rule_tension_arc_build`,
`rule_tension_arc_edge`, `rule_tension_ranking_respects_constraints`.

**Depends on:** the v2.0 chunks (7 and 8 in particular), and
[chunk 24](#chunk-24--settings-mutation-engine) for the criterion with the mutation flag.

**Done when** (all hold), per spec D178:

- With the flag off, every phrase's output is unchanged: the golden tests pass.
- With it on, the arc runs in groups of four phrases counted from phrase 1: the first phrase of
  each group is generated with the chosen tension arc, the second one step tenser, the third as
  chosen, the fourth one step calmer, in the order Settled, Lift, Build, Edge, never past either
  end. Phrase 1, generated at Idle, is generated as chosen. Unit tests cover each starting value,
  Settled and Edge included.
- The tension-arc setting keeps showing the player's choice; only what each phrase is generated
  with changes.
- When the settings-mutation flag changes the tension arc, the arc steps around the value then in
  effect. This needs [chunk 24](#chunk-24--settings-mutation-engine); an engine test on timed
  events runs both flags together.
- The flag starts off. The same seeds give the same session.

**Blocked by:** nothing. O98 was answered on 2026-10-03 (spec D178).

### Chunk 30 — Tension arc control

**Release:** v2.2. **Done on 2026-10-05.** `Tension across phrases`, `Off` at load, sits between
`Rising tempo` and `Vary settings` in the "During a session" group, settable at Idle and in the
Review and read-only during a session; changing it regenerates nothing. Each session's start
carries it to the engine unchanged as `multiPhraseTensionArc`, so the phrases from 2 on step around
the tension in effect, while the Tension control keeps showing that tension, never a step.

**Goal.** The multi-phrase arc's on/off control.

**Spec sections:** [§3](master-spec.md#3-the-generation-unit-and-how-phrases-join).

**Design docs:** the tension-arc control, `Tension across phrases`, unit 11 in
[`ui_ux/todo.md`](../../../ui_ux/todo.md) (ux D155, D160, D175, D176), owner-confirmed on
2026-10-05, in [`ui_ux/screens/phrase-workspace/`](../../../ui_ux/screens/phrase-workspace/) and
[`ui_ux/flows/play-session/`](../../../ui_ux/flows/play-session/).

**Atoms:** `req_multi_phrase_tension_arc`, `rule_session_settings_locked`.

**Depends on:** [chunk 29](#chunk-29--multi-phrase-tension-arc), v2.1, and its design.

**Done when** (all hold):

- The control can be set at Idle and in the Review, and is read-only during a session. It starts
  off (spec D178).
- Its state reaches the session engine; a workspace-harness test runs a session with it on.

**Blocked by:** nothing (design unit 11 done, owner-confirmed 2026-10-05). O98 was answered on
2026-10-03: spec D178.

### Chunk 31 — v2.2 release gate

**Release:** v2.2. **Folded into [chunk 21](#chunk-21--v20-release-gate) on 2026-10-05 (spec
D183):** v2.2 is a part of v2.0, not a release, and has no gate of its own. Its criteria are
checked there: adaptive tempo meeting §10 (a flat, unconditional schedule, never an automatic
decrease, the correct reset at the session's end, generation provably unaffected), the tension arc
meeting its settled criteria, and the v2.2 atoms advanced with the owner's agreement. It never had
a check of its own on the reference hardware or in a real program.

> **Chunks 32–34 left v2 on 2026-10-03 (spec D174).** The end-of-measure chord-fit check, the
> former v2.3, is a v3 nice-to-have, not committed scope
> ([v3](../v3/README.md#end-of-measure-chord-fit-check-nice-to-have-not-committed)). These three
> chunks are kept as notes for when it is scheduled. They are in no wave and no v2 gate, and
> nothing in v2 waits for them. The v2.0 chunks they name are their dependencies then.

### Chunk 32 — Chord-fit engine

**Release:** none in v2: a v3 nice-to-have (spec D174). Planned as v2.3.

**Goal.** The end-of-measure chord-fit check, as pure logic: on a measure played differently from
the written phrase, does what was played fit the harmony? A
pitch class is a note name in any octave; a
[chromatic approach](../../../docs/music/lexicon.md#chromatic-approach) is a note a half step
from a chord tone that moves onto it.

**Spec sections:** [§9](master-spec.md#9-the-end-of-measure-chord-fit-check),
[§9's acceptance criterion](master-spec.md#9-the-end-of-measure-chord-fit-check).

**Design docs:** none.

**Atoms:** `req_chord_fit_acknowledgement`, `rule_chord_fit_only_off_script`,
`rule_chord_fit_measure_assignment`, `rule_chord_fit_criteria`,
`rule_no_grading_or_mismatch_signal`; v1: `rule_jazz_chromatic_resolution`,
`rule_neutral_profile_diatonic_pitches`.

**Depends on:** the v2.0 chunks (9, 14 and 17 in particular).

**Done when** (all hold):

- A played note belongs to the measure its corrected onset rounds to on the sixteenth-note grid;
  a held or tied note counts only where it was attacked. Unit tests cover notes near a barline
  above 160 BPM.
- The check runs only on a measure where what was played differs from the written measure.
- A measure fits when at least one note was played, one is a chord tone of the chord sounding at
  its onset, and every other is in the phrase's scale or a chromatic note that moves a half step
  onto a chord tone within the player's next two notes. Unit tests cover a two-chord measure and
  an approach that lands in the next measure.
- The output is "fits" or nothing: no near miss, no failure.
- The property test of §9's acceptance criterion (former §11 v2.3): over the whole fixture set
  and every supported combination, playing the generated phrase exactly never produces a
  chord-fit result.

**Blocked by:** nothing.

### Chunk 33 — Chord-fit presentation

**Release:** none in v2: a v3 nice-to-have (spec D174). Planned as v2.3.

**Goal.** Show a fitting measure on screen, quietly and positively, apart from the per-note
highlight.

**Spec sections:** [§9](master-spec.md#9-the-end-of-measure-chord-fit-check).

**Design docs:** not designed yet: the chord-fit presentation, unit 9 in
[`ui_ux/todo.md`](../../../ui_ux/todo.md).

**Atoms:** `req_chord_fit_acknowledgement`, `rule_no_grading_or_mismatch_signal`.

**Depends on:** [chunk 32](#chunk-32--chord-fit-engine), v2.2, and its design.

**Done when** (all hold):

- A fitting off-script measure is marked as the design says, on the audio clock, at the end of
  the measure.
- A script-perfect measure, an empty measure and a measure that doesn't fit show nothing. A
  workspace-harness test compares screenshots.

**Blocked by:** design: the chord-fit presentation, unit 9 in `ui_ux/todo.md`.

### Chunk 34 — v2.3 release gate

**Release:** none in v2: a v3 nice-to-have (spec D174). Planned as v2.3; v2.3 is now empty, and
the check gets the gate of whichever release takes it.

**Goal.** Check v2.3's definition of done and the earlier releases' still holding, and get the
owner's go.

**Spec sections:** [§9](master-spec.md#9-the-end-of-measure-chord-fit-check),
[§9's acceptance criterion](master-spec.md#9-the-end-of-measure-chord-fit-check).

**Design docs:** the v2.3 handoff.

**Atoms:** the four chord-fit atoms, tagged `release-v2.3` until 2026-10-03:
`req_chord_fit_acknowledgement`, `rule_chord_fit_criteria`, `rule_chord_fit_only_off_script`,
`rule_chord_fit_measure_assignment`.

**Depends on:** every v2.3 chunk (32–33).

**Done when** (all hold):

- The v2.3 property test passes over the fixture set.
- The v2.0 gate's tests all still pass (one gate since spec D183).
- `documentalist` has advanced the v2.3 atoms with the owner's agreement. The owner decides the tag.

**Blocked by:** what blocks chunk 33.

### Chunk 35 — v2.4 release gate: real-hardware checks

**Release:** v2.4. **Folded into [chunk 21](#chunk-21--v20-release-gate) on 2026-10-05 (spec
D183):** the real-hardware checks are part of the v2.0 gate again, and v2.0 no longer ships before
them (superseding spec D173 and D180 on that point). The checklist this chunk held is in chunk 21,
under "The real-hardware checks": item 9's tuning of the windows and latency constants, the
controller check on the reference hardware, item 12 in real programs, items 6 and 15 in real
Chromium, the DAW line-up of the two MIDI files and the cold run re-measured on the reference
machine. The real-program export checks do not block the v2.0 tag (spec D193). They still wait for
the reference hardware: a breath controller over USB, a USB keyboard, and the owner's reference
machine.
