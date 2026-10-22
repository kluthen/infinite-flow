# UI/UX Work Status

## Complete

- First-release (v1.0) UI/UX: strategy, token system, motion policy, the generate-phrase flow and
  phrase-workspace screen, the review mockup, and the ISS-003/004/005 v1.0 gate updates (retired
  notation-mode/display-convention, unconditional profile-switch regenerate-or-clear, "Written
  key," "Rhythmic variety," dropped `Mixed` density, B-flat tenor saxophone default). Validated
  ALIGNED by `ux-critic` and confirmed implemented in production code. Archived record:
  [`archive/v1/todo.md`](archive/v1/todo.md); archived decisions:
  [`archive/v1/decisions-D1-D44.md`](archive/v1/decisions-D1-D44.md); archived closed question:
  [`archive/v1/open-questions-Q15.md`](archive/v1/open-questions-Q15.md).
- `versions/v1/` (2026-09-28, D60): the v1 design as shipped, frozen, with a summary README; the
  mockup and `ui_common.css` moved into it. The stale path in the comment in
  `src/notation/notation-layout-policy.ts` was fixed by `coding-executor` in the same change (it now
  names `src/styles/theme.css`, the breakpoint's real source).
- v2 (Rolling Phrase), released as version 2.0.0 after the v2.0 release gate (build plan chunk
  21, passed 2026-10-07; spec D183 had folded v2.1, v2.2 and v2.4 into the one release): units 1-8,
  10 and 11 (controller connection; the session core loop with the locked settings,
  acknowledgement and audio mix folded in; the Review and its exports, played notes included; the
  session options Vary settings, Rising tempo and Tension across phrases), the `strategy.md`
  persona pass and the change-marking convention. Each unit validated ALIGNED by `ux-critic` and
  built. Frozen design: [`versions/v2/`](versions/v2/README.md). Archived record:
  [`archive/v2/todo.md`](archive/v2/todo.md); archived decisions:
  [`archive/v2/decisions-D45-D176.md`](archive/v2/decisions-D45-D176.md); archived questions:
  [`archive/v2/open-questions-Q17-Q64.md`](archive/v2/open-questions-Q17-Q64.md).
- v2.0 milestone archive (2026-10-07, after the spec tree's, spec D208): the v2 record moved to
  `archive/v2/` (index: [`archive/v2/README.md`](archive/v2/README.md)), `versions/v2/` taken from
  the root, and ux Q31's resolution applied to the tier documents first (D177). The root's v2
  change marks were cleared when v3 design started (D178).
- v3.0 (Storage), released as version 3.0.0 (tag `v3.0.0` at e288d98, 2026-10-16, deployed):
  units V0-V4 (kept sessions and the review, saved data, my instrument and the controller, the
  workspace), the owner's approval and the token-source pass, then the design gates and
  corrections of the build, waves 2 to 9 (my instrument's clef and its sessions, the stale phrase
  prompt, very short notes, damaged sessions, another tab's `Delete everything`, small
  follow-ups). Each validated by `ux-critic` and built. Frozen design:
  [`versions/v3.0/`](versions/v3.0/README.md). Archived record:
  [`archive/v3.0/todo.md`](archive/v3.0/todo.md); archived decisions:
  [`archive/v3.0/decisions-D177-D224.md`](archive/v3.0/decisions-D177-D224.md) and
  [`archive/v3.0/decisions-D280-D322.md`](archive/v3.0/decisions-D280-D322.md); archived
  questions: Q66-Q69, Q76 and Q80 (index: [`archive/v3.0/README.md`](archive/v3.0/README.md)).
- v3.0 milestone archive (2026-10-16, after the spec tree's, spec D348): the v3.0 record moved to
  `archive/v3.0/`; `token-source-v3.md` left the root, its tokens and classes being in
  `src/styles/`, and the handoffs cite the token source alone (D323). The root keeps v3.0's
  change marks, layered under v3.1's to v3.3's, until v4's design starts.
- v3.1 (presets and embellishment figures), released as version 3.1.0 (tag `v3.1.0` at 55364e7,
  2026-10-21): unit P and its share of units W0 and R, validated by `ux-critic`, approved by the
  owner and frozen (D324), then the token-source pass (D325) and the release gate's class check
  (D326). Frozen design: [`versions/v3.1/`](versions/v3.1/README.md). Archived record:
  [`archive/v3.1/todo.md`](archive/v3.1/todo.md); archived decisions:
  [`archive/v3.1/decisions-D227-D234.md`](archive/v3.1/decisions-D227-D234.md) and
  [`archive/v3.1/decisions-D323-D326.md`](archive/v3.1/decisions-D323-D326.md); archived
  question: Q71 (index: [`archive/v3.1/README.md`](archive/v3.1/README.md)).
- v3.1 milestone archive (2026-10-21, alongside the spec tree's): the v3.1 record moved to
  `archive/v3.1/`; `versions/v3.1/` records the release and its preset sheet cites the token
  source alone, as the root's does (D327). The entries v3.1 shares with v3.2 (D225, D226, D246,
  D249, D250, units W0 and R) stay live, and so does `token-source-v3.1-v3.2.md` until v3.2's
  part is applied. The root keeps v3.0's and v3.1's change marks until v4's design starts.

## In Progress

**v3.3 (richer chords) design**, from master spec Part D (§D1-§D17, proposed for the owner's
approval with spec D264-D274), on branch `v3.3-chord-research`. Started 2026-10-12; marked on top
of v3.0's, v3.1's and v3.2's marks, every v3.3 change its own tagged paragraph (ux D252). Owner's
standing delegation: settled here, no question to the owner. Settled decisions: ux D252-D264;
Q77 closed by spec D275 as recommended (ux D264). No `src/` edits; no new token (ux D261).

- **Unit S — the whole of v3.3, in one pass** (ux D262): the Seventh chords level (foundation
  group, after Harmonic motion; Off, Sometimes, Often, Mostly; its note), presets holding it and
  three descriptions suggesting it, Vary settings' note, saved settings and loading, the seventh
  chord symbols' look, fit and spoken words, and the review's and files' chords. Files:
  `strategy.md`, `README.md`, `screens/phrase-workspace/`, `flows/presets/`,
  `screens/preset-sheet/handoff.md`, `flows/play-session/`, `flows/generate-phrase/handoff.md`,
  `flows/saved-data/handoff.md`, `flows/review-and-export/handoff.md`,
  `screens/last-session-review/handoff.md`. Written 2026-10-12.
- **Validation.** `ux-critic` on v3.3: DRIFT, four copy and marking findings, all fixed (ux D263).
  Validated for the owner's review.
- **Build plan review** (`specs/versions/v3/build-plan-v3.3.md`, draft v1), 2026-10-12: the label
  mapping written into the workspace handoff; five asks of the plan recorded (ux D264), the plan's
  edits left to its owners.

**v3.1 (presets and embellishment figures) and v3.2 (Jam) design**, from master spec Parts B and C
(approved 2026-10-08). Started 2026-10-08; v3.0's approved design was frozen in `versions/v3.0/`
first, and the root keeps v3.0's marks with v3.1's and v3.2's layered on them (ux D225). Owner's
standing delegation: settle and record; one full review at the end. Implementation is paused: no
`src/` edits; tokens in `token-source-v3.1-v3.2.md` (ux D226). Settled decisions: ux D225-D245;
spec gaps for `spec-writer`: Q70-Q73, all since closed (ux D249, D341). v3.1 shipped as version
3.1.0 on 2026-10-21; its own items (unit P, its approval, its token-source pass, its release gate)
are archived in [`archive/v3.1/todo.md`](archive/v3.1/todo.md). The items below are shared with
v3.2 or are v3.2's.

- **Unit W0 — Tier 1 and Tier 2, the registers.** `strategy.md`, `motion.md`, `README.md`,
  `token-source-v3.1-v3.2.md` (new), `versions/v3.0/` (new). Written.
- **Unit R — the review side, both releases** (delegated, alongside P):
  `screens/last-session-review/`, `flows/review-and-export/`, `screens/session-list/`,
  `flows/kept-sessions/`, `flows/saved-data/`, `screens/your-data/`. Governing: ux D231 (the
  refused-save notice), D233, D234, D239-D241. Written 2026-10-08 (details: ux D246, D247).
- **Unit J — v3.2 core** (delegated, after P): `flows/jam/` (new); `screens/phrase-workspace/`,
  `flows/play-session/` and `flows/generate-phrase/` for v3.2. Governing: ux D235-D244, D246, D247. Written 2026-10-08 (details: ux D248).
- **Validation.** `ux-critic` on v3.1 and on v3.2: DRIFT both, findings fixed (ux D249, D250); recheck: two small slips, fixed (ux D251). Validated for the owner's review.

**v3.2 re-scope: Jam as its own mode** (2026-10-21), from `specs/versions/v3/jam-mode.md` (spec
D400–D408; §8 is the brief), which wins over master spec Part C until Part C is rebuilt from it.
The v3.2 design above is reworked in place under its `v3.2` marks (ux D328). Settled decisions:
ux D328–D346. Q70 moot, Q73–Q75 closed (ux D341); behaviour gaps Q81–Q87, designed on their
recommended answers, closed by spec D411 as recommended (ux D347). No `src/` edits here.

- **Tier 1, Tier 2 and the registers.** `strategy.md`, `motion.md`, `README.md`,
  `token-source-v3.1-v3.2.md` part 2, `decisions.md`, `open-questions.md`; spec D399's browser
  cleanup (ux D343). Written 2026-10-21.
- **Unit A** (delegated): `flows/jam/`, `screens/phrase-workspace/`. Written 2026-10-21.
- **Unit B** (delegated, after A): `flows/play-session/`, `flows/generate-phrase/`,
  `screens/stale-phrase-prompt/`, `flows/presets/`, `flows/controller-connection/`. Written
  2026-10-21.
- **Unit C** (delegated, after A): `screens/last-session-review/`, `flows/review-and-export/`,
  `screens/session-list/`, `flows/kept-sessions/`, `flows/saved-data/`, `screens/your-data/`.
  Written 2026-10-21. Details settled while writing A, B and C: ux D345.
- **Validation.** `ux-critic` on the re-scope: DRIFT, five findings, all fixed (ux D346), Q87
  logged for `spec-writer`; recheck: one stale diagram label, fixed. Validated for the owner's
  review.
- **Owner's approval** (2026-10-21): design gate D0 granted and token pass T2 allowed (spec D412,
  ux D347); master spec Part C is v1.2, approved. "The kept doodle" is the spec's term too (spec
  D413); phones a third-rate client, now in `strategy.md` (spec D414, ux D348).

## Remaining

Standing working rules (ux D119, D135, archived; still in force):

- Minor design issues, including `ux-critic` findings that change no flow, no product rule and
  nothing the player sees of a session's behaviour, are `ux-writer`'s to settle and record in
  `decisions.md` without asking the owner. The phone is not a main customer: the simplest
  acceptable phone behaviour is enough, and the larger screen wins a conflict; every device still
  gets the review's functions, the phone's review being their plain baseline. During a session
  the player is never expected to act; any problem ends it as Stop does, after the 30-second
  window if it can be put right, at once if not. Restated 2026-10-21 (spec D414, ux D348): phones
  are a third-rate client, and a capability may be reduced on a phone when keeping it there costs
  more than it is worth.
- The Review stays simple: no side tools; per-phrase tools at the end of each phrase's line,
  whole-session tools beside the export.

Carried forward from v3.0:

- **A stricter range check for my instrument** (master spec §14, spec O180, still open): if one
  comes, only the range refusal's wording changes (`screens/my-instrument/handoff.md`).

Not scheduled:

- **Q16** (`open-questions.md`): a generation action reachable from the notation-error states,
  replacing the undiscoverable instrument-profile-switch escape. Idle-only, lower priority.

## Next Unit

v3.3: the owner's approval of Part D and of this design (the build plan's D0). At the build, the
recorded seventh-chord shares come back here twice to confirm the labels, "Mostly" above all (ux
D254, D264): after the first measurement, before the control is built, and on the final shares at
the release gate. A symbol calibration failure, or a triad layout that counting the symbols' widths
would move, also comes back here (ux D258, D264).

v3.2: approved (gate D0 granted, T2 allowed; ux D347). The token-source pass is done (build plan
v3.2's chunk 1, ux D349): D342's classes are in `src/styles/components.css` under `v3.2 new`, and
`token-source-v3.1-v3.2.md` is deleted. One item remains:

- **`versions/v3.2/`**: take it from the root without the v3.3 parts, as D324 did for v3.1. With
  no token-source document left, its README points at the token source's `v3.2 new` blocks, whose
  shipped state is the release tag's (ux D349).
