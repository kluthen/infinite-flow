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

## In Progress

**v3.3 (richer chords) design**, from master spec Part D (§D1-§D17; v1.2 of 2026-11-09, proposed
for the owner's approval with spec D264-D274 and D511-D518). Started 2026-10-12 on branch
`v3.3-chord-research`; refreshed 2026-11-09 on branch `v3.3-refresh` against v3.2 as built. Marked
on top of v3.0's, v3.1's and v3.2's marks, every v3.3 change its own tagged paragraph (ux D252).
Owner's standing delegation: settled here, no question to the owner. Settled decisions: ux
D252-D264, D477-D479; Q77 closed by spec D275 as recommended (ux D264). No `src/` edits; no new
token (ux D261). Approved by the owner at the build plan's gate D0 on 2026-11-09 (ux D482).

- **Unit S — the whole of v3.3, in one pass** (ux D262): the Seventh chords level (foundation
  group, after Harmonic motion; Off, Sometimes, Often, Mostly, the top label now Always, ux D485;
  its note), presets holding it and
  three descriptions suggesting it, Vary settings' note, saved settings and loading, the seventh
  chord symbols' look, fit and spoken words, and the review's and files' chords. Files:
  `strategy.md`, `README.md`, `screens/phrase-workspace/`, `flows/presets/`,
  `screens/preset-sheet/handoff.md`, `screens/stale-phrase-prompt/handoff.md`,
  `flows/play-session/`, `flows/generate-phrase/handoff.md`, `flows/saved-data/handoff.md`,
  `flows/review-and-export/handoff.md`, `screens/last-session-review/handoff.md`, and, for Jam's
  own level (Q86), `flows/jam/` (list corrected by ux D477). Written 2026-10-12.
- **Validation.** `ux-critic` on v3.3: DRIFT, four copy and marking findings, all fixed (ux D263).
  Validated for the owner's review.
- **Build plan review** (`specs/versions/v3/build-plan-v3.3.md`, draft v1), 2026-10-12: the label
  mapping written into the workspace handoff; five asks of the plan recorded (ux D264), the plan's
  edits left to its owners.
- **Refresh against v3.2 as built** (2026-11-09; Part D v1.2, plan v4): Jam's own level through
  `flows/jam/` and the review side, a level change keeping the kept doodle (ux D477); the phone's
  height and the symbols (ux D478, narrowed by D481); the guides, tap tempo, the
  suggestion row and the focus rules checked, nothing more to change (ux D479).
  `versions/v3.2/` taken first (ux D480). `ux-critic`: DRIFT, four findings, resolved (ux D481);
  the phone acceptance withdrawn. Asks for `spec-writer`: chunk 23's design docs add
  `flows/review-and-export/handoff.md`; §D8.3's "never switches" allows phrase 1 after
  `Start with this phrase`. Ready for the owner's D0.
- **Owner's approval** (2026-11-09): gate D0 granted, "Approve both" (Part D v1.2, build plan v4
  and this design); `versions/v3.3/` frozen the same day, the whole root, marks kept (ux D482).

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

Carried forward from v3.3's build:

- **The space between a chord's root and its suffix** (ux D486): VexFlow draws "C maj7", "A m";
  a later chunk sets the suffix against the root, and the Notation Contract
  (`screens/phrase-workspace/handoff.md`, Seventh chord symbols) then says so.

Carried forward from v3.0:

- **A stricter range check for my instrument** (master spec §14, spec O180, still open): if one
  comes, only the range refusal's wording changes (`screens/my-instrument/handoff.md`).

Not scheduled:

- **Q16** (`open-questions.md`): a generation action reachable from the notation-error states,
  replacing the undiscoverable instrument-profile-switch escape. Idle-only, lower priority.

## Next Unit

v3.3: approved at gate D0 (ux D482), frozen in `versions/v3.3/`; in its build. U1a done on chunk
18's first shares: Off, Sometimes, Often kept, the top label now Always (ux D485). Next here is
U1b: the labels confirmed again on the final shares, after chunk 20 if built and L2's tuning, at
the release gate (ux D254, D264, D485). A symbol calibration failure, or a triad layout that counting the symbols' widths
would move, also comes back here (ux D258, D264). A build correction to the design is applied at
the root and to `versions/v3.3/` alike, and recorded.

v3.2: released as version 3.2.0 and archived (`archive/v3.2/`). Only the owner's hand checks
after the tag remain (Remaining, Carried forward from v3.2).
