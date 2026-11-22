# v3.3 UI/UX Work Record (Archived)

> **Archived 2026-11-22.** v3.3 (richer chords) is released as version 3.3.0 (tag `v3.3.0` at
> b2a0e3fa, 2026-11-18). The live [`todo.md`](../../todo.md) points here.
> The text below this notice, up to "Archiving-pass addendum," is kept verbatim from the live
> tracker: from `## In Progress`, the v3.3 block; from `## Next Unit`, the v3.3 paragraph. What
> v3.3 still owes after the tag (U1b, the follow-up on the space in a chord symbol) is carried
> forward in the live tracker. Text written from `ui_ux/`.

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

## Next Unit

v3.3: approved at gate D0 (ux D482), frozen in `versions/v3.3/`; in its build. U1a done on chunk
18's first shares: Off, Sometimes, Often kept, the top label now Always (ux D485). Next here is
U1b: the labels confirmed again on the final shares, after chunk 20 if built and L2's tuning, at
the release gate (ux D254, D264, D485). A symbol calibration failure, or a triad layout that counting the symbols' widths
would move, also comes back here (ux D258, D264). A build correction to the design is applied at
the root and to `versions/v3.3/` alike, and recorded.

## Archiving-pass addendum (2026-11-22)

New text, written during the archiving pass. Everything above is unchanged; this records what was
found true when the record was archived.

- **Released.** v3.3 passed its release gate's machine half (build plan v3.3's chunk 22) and
  shipped as version 3.3.0, tag `v3.3.0` at b2a0e3fa, on 2026-11-18. By the owner's ruling (spec
  D541, as spec D521 for v3.2), its hand and listening checks follow the tag.
- **"In its build":** done. Chunk 20, the finer fallback, was skipped, Strongly favored already
  reaching 3 in 4 (spec D534); chunk 21, endings on the seventh, was skipped with the listening
  check L1 (spec D540). So "after chunk 20 if built" no longer applies, unless gate DP reopens.
- **"Next here is U1b ... at the release gate":** moved after the tag (spec D541). U1b runs on the
  release gate's final M1, or, if the owner's listening check L2 tunes the shares, on that 3.3.x
  patch's M1. The live `todo.md` carries it.
- **"A symbol calibration failure ... also comes back here":** the automated width checks pass
  (release notes, item 11); hand check v3.3 H6, the symbols at the narrowest widths, follows the
  tag. The live `todo.md` carries it.
- **"Asks for `spec-writer`" (the refresh):** both were taken: build plan v3.3's chunk 23 lists
  `flows/review-and-export/handoff.md` among its design docs, and master spec §D8.3 allows phrase
  1 after `Start with this phrase` (spec D519).
