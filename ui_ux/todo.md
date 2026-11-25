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
- v3.2 (Jam), released as version 3.2.0 (tag `v3.2.0` at f93e552d, 2026-11-09): the v3.1 and
  v3.2 design of 2026-10-08 (units W0, R and J), reworked in place by the re-scope of 2026-10-21
  (Jam as its own mode; units A, B and C), each validated by `ux-critic`, approved by the owner
  (gate D0, ux D347), then the token-source pass (ux D349), the design questions of the build
  (waves 3 to 7, gate GD's guide controls) and the release gate's class check (ux D483). Frozen
  design: [`versions/v3.2/`](versions/v3.2/README.md) (ux D480). Archived record:
  [`archive/v3.2/todo.md`](archive/v3.2/todo.md); archived decisions:
  [`archive/v3.2/decisions-D225-D251.md`](archive/v3.2/decisions-D225-D251.md) and
  [`archive/v3.2/decisions-D327-D475.md`](archive/v3.2/decisions-D327-D475.md); archived
  questions: Q70, Q72-Q75 and Q81-Q87 (index: [`archive/v3.2/README.md`](archive/v3.2/README.md)).
- v3.2 milestone archive (2026-11-09, alongside the spec tree's): the v3.2 record moved to
  `archive/v3.2/`, the entries v3.1 shared with v3.2 with it. D480 and D483 stay live until the
  owner's hand checks after the tag are done. `versions/v3.2/` is unchanged. The root keeps v3.0's
  to v3.3's change marks until v4's design starts.
- v3.3 (richer chords), released as version 3.3.0 (tag `v3.3.0` at b2a0e3fa, 2026-11-18): unit S,
  validated by `ux-critic` (ux D263), refreshed against v3.2 as built and validated again (ux
  D477-D481), approved by the owner at gate D0 and frozen (ux D482), then gate U1a on the build's
  first measured shares (ux D485, the top label `Always`). Its hand and listening checks follow
  the tag (spec D541). Frozen design: [`versions/v3.3/`](versions/v3.3/README.md). Archived
  record: [`archive/v3.3/todo.md`](archive/v3.3/todo.md); archived decisions:
  [`archive/v3.3/decisions-D252-D264.md`](archive/v3.3/decisions-D252-D264.md) and
  [`archive/v3.3/decisions-D477-D479.md`](archive/v3.3/decisions-D477-D479.md); archived
  question: Q77 (index: [`archive/v3.3/README.md`](archive/v3.3/README.md)).
- v3.3 milestone archive (2026-11-22, alongside the spec tree's): the v3.3 record moved to
  `archive/v3.3/`. D480 and D483 stay live for v3.2's hand checks, D482 and D485 for v3.3's
  checks after the tag (a finding may correct `versions/v3.3/`), D486 until it is built, and
  D481 and D484 between them. `versions/v3.3/` is unchanged. The root keeps v3.0's to v3.3's
  change marks until the next version's design starts.
- v3.4 (the lexicon page), released as version 3.4.0 (tag `v3.4.0` at 17e631e4, 2026-11-24): the
  page and the look-up-a-word flow, drafted, validated by the owner (spec D549) and adopted at the
  root, the v3.0 to v3.3 marks cleared first (ux D487-D491), then the token-source pass, gate T0
  (ux D492-D495), and the build's two design questions (ux D496, D497). The owner's look at the
  built page (H1) follows the tag (spec D578). Frozen design:
  [`versions/v3.4/`](versions/v3.4/README.md) (ux D498). Archived record:
  [`archive/v3.4/todo.md`](archive/v3.4/todo.md); archived decisions:
  [`archive/v3.4/decisions-D487-D497.md`](archive/v3.4/decisions-D487-D497.md); no question
  (index: [`archive/v3.4/README.md`](archive/v3.4/README.md)).
- v3.4 milestone archive (2026-11-24, alongside the spec tree's): the v3.4 record moved to
  `archive/v3.4/`, and `versions/v3.4/` taken at the release, the copy not having been taken at
  approval (ux D498, which stays live until H1 is done). The prototype and research of the
  lexicon page stay at the root. D480-D486 stay live as before. The root keeps v3.4's change
  marks until the next version's design starts.

## In Progress

**v4.0 (accompaniment with roles), master spec `specs/versions/v4/master-spec.md` (spec D596),
§12's design set**, on branch `v4.0-design`. Started 2026-11-24; v3.4's marks cleared (D499).
Written and self-checked (D500-D505):

- the four part switches in the mix's second row, each with its playing light; the `Volume`
  panel's eight sliders; the parts' unavailable and loading states; the parts' lexicon words and
  popup lines (`screens/phrase-workspace/`);
- the parts in a session, a fresh Jam and the session's end (`flows/play-session/`, `flows/jam/`);
- the export option `Accompaniment tracks` and its line (`screens/last-session-review/`,
  `flows/review-and-export/`); the saved mix (`flows/saved-data/`);
- `strategy.md` (goals, context, trade-off, edge-case policy) and `motion.md`.

Validation: `ux-critic`, DRIFT with four findings, settled (D506); a re-check passed them and
rejected D506's widened tablet jump, withdrawn (D507), the tablet fit now open as Q90. The owner
approved the design (gate D0, spec D601, D510). Token-source pass, gate T0, done on branch
`v4.0-t0-tokens` (D508, D509). Next: the `versions/v4.0/` copy.

The side work below is paused.

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

v4.0, after the owner approves the design:

- **The lexicon entries** (D501): the four App controls entries and the app-meaning updates of
  Accompaniment, Counter-melody, Fill, Groove and Parallel thirds and sixths, added with the build
  by whoever keeps the lexicon, from the popup lines in `screens/phrase-workspace/handoff.md`.
- **The listening check** (master spec §13 item 11) retunes D503's starting levels; a change is
  a token value only.
- **Two looks on the reference tablet on its stand**: the light's size, `--part-light-size`
  (is a filled disc and a hollow ring told apart at 70 to 100 cm?), and Q90, both staff systems
  in view under the two-row toolbar (to measure before the owner's approval if a build of the
  toolbar exists, at the latest at the token-source pass). A failure changes a token or comes
  back here.

Carried forward from v3.2:

- **The owner's hand checks after the `v3.2.0` tag** (spec D521): v3.2 H3 (Vary settings' groups),
  H4 and H5 (listening to Jam: its settings, drift and lock; the doodle-to-controls mapping), H6
  (the suggestion), H7 (a Jam with tap-in), H8 (a Jam's files) and HG (the guide playback). Their
  design is at the root and, as v3.2 shipped, in [`versions/v3.2/`](versions/v3.2/README.md):
  `flows/jam/` (tap-in, the kept doodle, the suggestion at Idle), `screens/phrase-workspace/`
  (Vary settings, Jam's controls; `mix-controls` with the guide switches and the `Volume`
  popover), `screens/last-session-review/` and
  `flows/review-and-export/` (the suggestion row, the played notes). The decisions behind them
  are archived in [`archive/v3.2/decisions-D327-D475.md`](archive/v3.2/decisions-D327-D475.md)
  (tap-in ux D335; the guides ux D459-D463, whose four volume tokens HG's ear may retune). A
  finding that changes the design corrects the root and `versions/v3.2/` alike, recorded in
  `decisions.md` (ux D480).

Carried forward from v3.4 (after the `v3.4.0` tag, spec D578):

- **H1, the owner's look at the lexicon page**: on the built app, opened from the footer, browsed
  A to Z, an entry opened with `More`, a word searched, the page closed (Close, Escape or Back);
  the result goes in `docs/release/v3.4-release-notes.md`. Its design is at the root and, as v3.4
  shipped, in [`versions/v3.4/`](versions/v3.4/README.md): `screens/lexicon-page/`,
  `flows/look-up-a-word/`, the footer in `screens/phrase-workspace/`. A finding that changes the
  design corrects the root and `versions/v3.4/` alike, recorded in `decisions.md` (ux D498).

Carried forward from v3.3 (after the `v3.3.0` tag, spec D541):

- **U1b, the Seventh chords labels on the final shares** (build plan v3.3's U1b; ux D254, D264,
  D485): after the owner's listening check L2 (v3.3 H2), on the release gate's final M1 if L2
  tunes nothing, or on the 3.3.x patch's M1 if it tunes the Sometimes or Favored share (and after
  chunk 20 too, should gate DP reopen). The labels are in `screens/phrase-workspace/handoff.md`
  (Seventh chords). A label that changes is corrected at the root and in `versions/v3.3/` alike,
  and recorded (ux D482).
- **Hand check v3.3 H6, the symbols at the narrowest widths**: a calibration failure at a
  supported width, phones included, comes back here (ux D258, D481); the build never shrinks a
  symbol to pass it. The other checks after the tag (H3-H5, M3) carry no design question.
- **The space between a chord's root and its suffix** (ux D486): VexFlow draws "C maj7", "A m";
  a later chunk sets the suffix against the root, and the Notation Contract
  (`screens/phrase-workspace/handoff.md`, Seventh chord symbols) then says so.

Carried forward from v3.0:

- **A stricter range check for my instrument** (master spec §14, spec O180, still open): if one
  comes, only the range refusal's wording changes (`screens/my-instrument/handoff.md`).

Not scheduled:

- **Q16** (`open-questions.md`): a generation action reachable from the notation-error states,
  replacing the undiscoverable instrument-profile-switch escape. Idle-only, lower priority.

Side work, not part of a version (paused):

- **The options panel rework** (`ui_ux/side/options-panel/`: `intent.md`, `handoff.md` and a
  `prototype/`; in the `options-panel-refactor` worktree, not yet committed or on `main`): a
  reorganised options panel, with its own open question OPQ1, still open.
  - 2026-11-22: the owner reviewed the prototype: "nicer than the current version, but not quite
    there yet". To be revisited later; nothing is decided from it yet.

## Next Unit

v4.0: validated by `ux-critic`, its findings settled (D506, D507), Q90 open (the tablet fit,
by measurement). Next: the owner's approval (gate), then the `versions/v4.0/` copy and the
token-source pass (Remaining).

v3.4: released as version 3.4.0 and archived (`archive/v3.4/`). Next here is any design finding
of H1, the owner's look at the lexicon page (Remaining, Carried forward from v3.4).

v3.3: released as version 3.3.0 and archived (`archive/v3.3/`). Next here is U1b, once the
owner's listening check L2 has run, and any design finding of hand check v3.3 H6 (Remaining,
Carried forward from v3.3).

v3.2: released as version 3.2.0 and archived (`archive/v3.2/`). Only the owner's hand checks
after the tag remain (Remaining, Carried forward from v3.2).
