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

## In Progress

**v3.0 wave 2: the Clef design and Sessions design gates** (build plan v8 §1), from spec
D293-D296 (master spec Part A v1.10), on branch `v3.0-w2`. Started 2026-10-12. Written into
`versions/v3.0/` as a recorded correction and at the root (ux D280). Settled: ux D280-D293; Q76
closed (ux D285); Q80 raised for `spec-writer`.

- **Clef design gate** (before chunk 20): the clef control, the range bound's refusal, the
  staff-reach note in the chosen clef, the clef on screen and in the check note, the interval
  name (ux D281-D285). Written 2026-10-12.
- **Sessions design gate** (before chunk 20c): the erase warning in the sheet and in the check,
  the delete confirmation's count, the landing, the outdated tab's withheld form, the review's
  room for a phrase in another clef (ux D286-D290). Written 2026-10-12.
- **Stale treble-only lines and the token source's sizing comment** (ux D291, D292); chunk 4's
  carry-overs (ux D293). Written 2026-10-12.
- **Validation.** `ux-critic` on both gates: DRIFT, five findings, all fixed (ux D294); recheck: three leftovers,
  fixed (ux D295). The
  gates are passed from the design side; chunk 5's save policy needs the storage port to report
  why a tab became outdated (ux D294), noted with Q80.
- **Stale phrase design gate** (before chunk 24b-2; spec D297, master spec Part A v1.12 §16):
  the out-of-date phrase prompt, `screens/stale-phrase-prompt/` (new), with the play-session,
  workspace, generate-phrase, strategy and motion lines it touches, in both trees (ux
  D296-D304). Written 2026-10-13. Validation: `ux-critic` DRIFT, four findings, all fixed
  (ux D305); recheck: one leftover, fixed (ux D306). The gate is passed from the design side.

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
spec gaps for `spec-writer`: Q70-Q73 (provisional answers designed).

- **Unit W0 — Tier 1 and Tier 2, the registers.** `strategy.md`, `motion.md`, `README.md`,
  `token-source-v3.1-v3.2.md` (new), `versions/v3.0/` (new). Written.
- **Unit P — v3.1 core** (delegated): `flows/presets/` and `screens/preset-sheet/` (new);
  `screens/phrase-workspace/`, `flows/play-session/` and `flows/generate-phrase/` for v3.1.
  Governing: ux D227-D232. Written 2026-10-08 (details: ux D246).
- **Unit R — the review side, both releases** (delegated, alongside P):
  `screens/last-session-review/`, `flows/review-and-export/`, `screens/session-list/`,
  `flows/kept-sessions/`, `flows/saved-data/`, `screens/your-data/`. Governing: ux D231 (the
  refused-save notice), D233, D234, D239-D241. Written 2026-10-08 (details: ux D246, D247).
- **Unit J — v3.2 core** (delegated, after P): `flows/jam/` (new); `screens/phrase-workspace/`,
  `flows/play-session/` and `flows/generate-phrase/` for v3.2. Governing: ux D235-D244, D246, D247. Written 2026-10-08 (details: ux D248).
- **Validation.** `ux-critic` on v3.1 and on v3.2: DRIFT both, findings fixed (ux D249, D250); recheck: two small slips, fixed (ux D251). Validated for the owner's review.

**v3.0 (Storage) design**, from `specs/versions/v3/master-spec.md` (v3.0 only; v3.1 and v3.2 are
not specified yet). Started 2026-10-07; the root's v2 marks are cleared (ux D178) and v3's are
marked from the first edit. The owner asked for the whole v3.0 design in one pass and reviews it
once at the end: every settled recommendation is in `decisions.md` (ux D178-D217), and what needs
the owner or `spec-writer` was in `open-questions.md` (Q66, Q67, both closed). **Approved by the
owner on 2026-10-07 (ux D218)**; the outdated tab was then aligned with master spec v1.3 (ux
D219) and v1.4 (ux D221: no deletion of any kind).

- **Unit V0 — Tier 1 and Tier 2.** `strategy.md` (v3 changes), `token-source-v3.md` (new),
  `README.md`. Written.
- Units V1-V4 below: written 2026-10-07 by delegates (details they settled: ux D210-D213).
- All of V0-V4 validated by `ux-critic` on 2026-10-07: DRIFT with five findings, all fixed (ux
  D215, D216), recheck clean (ux D217). Approved by the owner (ux D218).
- **Unit V1 — Kept sessions and the review.** `flows/kept-sessions/` and `screens/session-list/`
  (new); `flows/review-and-export/` and `screens/last-session-review/` (changed: any kept
  session, favorites, export scope, comment, pin and delete, "Keep my played notes", per-session
  played-notes deletion, very short notes, the keep line). Governing decisions: ux D180-D193,
  D196, D204, D205.
- **Unit V2 — Saved data.** `flows/saved-data/` and `screens/your-data/` (new): what is kept
  without asking, loading, the notices, the Your data sheet and its deletions. Governing: ux
  D191, D192, D194-D197.
- **Unit V3 — My instrument and the controller.** `flows/my-instrument/` and
  `screens/my-instrument/` (new); `flows/controller-connection/` and
  `screens/controller-connection/` (changed: "Use this for my instrument", the remembered
  controller). Governing: ux D198-D202, D206.
- **Unit V4 — The workspace.** `screens/phrase-workspace/` (changed: the instrument control's
  fourth choice and its button, the cue row's two links, the notice row, the footer, the load
  wait, the starting-note line before the first click, pre-generation's absence of UI, saved
  settings), `flows/play-session/` and `flows/generate-phrase/` (the save at a session's end, the
  first phrase waiting for saved settings, pre-generation), `motion.md`. Governing: ux D181,
  D194, D196, D197, D198, D202, D203, D206.
- **Validation.** Done (ux D215-D217), the phone staff-height check carried from v2 included:
  that text is unchanged from v2 apart from its cleared tags.

## Remaining

Standing working rules (ux D119, D135, archived; still in force):

- Minor design issues, including `ux-critic` findings that change no flow, no product rule and
  nothing the player sees of a session's behaviour, are `ux-writer`'s to settle and record in
  `decisions.md` without asking the owner. The phone is not a main customer: the simplest
  acceptable phone behaviour is enough, and the larger screen wins a conflict; every device still
  gets the review's functions, the phone's review being their plain baseline. During a session
  the player is never expected to act; any problem ends it as Stop does, after the 30-second
  window if it can be put right, at once if not.
- The Review stays simple: no side tools; per-phrase tools at the end of each phrase's line,
  whole-session tools beside the export.

v3.0, after the units above:

- **Token-source pass** (build plan chunk 1, ux D220): applied on branch `v3-c1-token-source`,
  waiting for the owner's merge. After the merge: delete `token-source-v3.md` and point
  `README.md` and the handoffs that cite it (`screens/session-list/`, `your-data/`,
  `my-instrument/`, `last-session-review/`) at the token source alone. The build plan no longer
  links it (spec D223's change), so nothing else waits.
- **Q68:** closed by ux D221 (spec D223): an outdated tab offers no deletion of any kind;
  applied to the kept-sessions, review and saved-data flows and their screens.
- **spec D225** (newer data wins over a failed read): applied by ux D222 to `flows/saved-data/`,
  `screens/your-data/`, `flows/kept-sessions/`, the load lines of `flows/generate-phrase/` and
  `screens/phrase-workspace/`, and `strategy.md`. The narrow `ux-critic` pass on ux D221-D223
  ran on 2026-10-07: DRIFT, one low finding, fixed (ux D224); one build-plan scoping note handed
  to `spec-writer` (chunk 15's tests and done item 14 do not name spec D226's review change).
- **Q69:** closed by ux D223 (spec D226): a visit whose saved data couldn't be read offers no
  deletion in the review either; one "While Saving Is Off" rule for both saving-off visits,
  applied to the kept-sessions, review and saved-data flows, their screens and `strategy.md`.
- **Deferred inside v3.0's spec, no design needed now:** the stray-note threshold and a stricter
  range check for my instrument (master spec §14) are build-plan measurements; a stricter range
  rule, if one comes, only changes the refusal's wording.

Carried forward from v2 (see the addendum of [`archive/v2/todo.md`](archive/v2/todo.md)):

- **Unit 7's owner confirmation.** The design of the Review's played notes and their export (ux
  D161-D166) was built and passed the v2.0 gate; take the owner's approval of the `v2.0.0` tag
  as the confirmation unless the final v3.0 review says otherwise.
- **The narrow `ux-critic` pass on the phone staff-height edits** (ux D127-D129): done in the
  v3.0 validation, no finding.

Not scheduled:

- **Q16** (`open-questions.md`): a generation action reachable from the notation-error states,
  replacing the undiscoverable instrument-profile-switch escape. Idle-only, lower priority.

Dropped (ux D207): the end-of-measure chord-fit presentation (old unit 9), since master spec §2
drops the check.

## Next Unit

v3.0 wave 2: the Clef and Sessions gates are passed (ux D280-D295); Q80 waits for `spec-writer`.
The Stale phrase design gate is written (ux D296-D304); for `spec-writer`: the lexicon's
**Starting note** and **Count-in** entries still say the starting note starts the count-in, with
no word of the prompt an out-of-date phrase opens first (CONTRACT 5.0). At chunk 19b's calibration, if the bass-clef bound E0-E5 needs more than
24 staff spaces, the bound's figures in the refusal and the Notation Contract come back here.

v3.3: the owner's approval of Part D and of this design (the build plan's D0). At the build, the
recorded seventh-chord shares come back here twice to confirm the labels, "Mostly" above all (ux
D254, D264): after the first measurement, before the control is built, and on the final shares at
the release gate. A symbol calibration failure, or a triad layout that counting the symbols' widths
would move, also comes back here (ux D258, D264).

The owner's full review of the v3.1 and v3.2 design (ux D225-D251), and `spec-writer`'s answers to Q73-Q75. After approval, take `versions/v3.1/` (and `versions/v3.2/`) copies when each is approved as complete.

Still waiting, from v3.0: after the owner merges `v3-c1-token-source`, delete
`token-source-v3.md` and point `README.md` and the four handoffs that cite it at the token source
alone (the build plan no longer links it); the same paths in `versions/v3.0/` are corrected too,
as a recorded correction to match what v3.0 ships.
