# UI/UX Decisions

> **Archived 2026-11-22.** v3.3 (richer chords) is released as version 3.3.0 (tag `v3.3.0` at
> b2a0e3fa, 2026-11-18). These are decisions D477-D479, from the refresh of the v3.3 design
> against v3.2 as built, kept verbatim with their section heading and intro; D480 and D481, in
> the same section, stay in the live [`decisions.md`](../../decisions.md). Live summary:
> [`archive/v3.3/README.md`](README.md). Text written from `ui_ux/`.

## The v3.3 design refreshed against v3.2 as built, 2026-11-09

Inputs: master spec Part D v1.2 and build plan v3.3 v4 (spec D511–D518), proposed for the owner's
approval at gate D0; v3.2 as merged on `main` (waves 1 to 7). The owner's standing delegation
applies (D119, D135, archived; spec D414).

- **D477 (2026-11-09): Jam's own Seventh chords level reaches `flows/jam/` and the review side;
  D262's "Unchanged: `flows/jam/`" is corrected (spec D512, D513).** Since Q86 (D347) Jam has its
  own level, so D262's list and Unit S's file list were wrong: v3.3 also touches `flows/jam/` and
  `screens/stale-phrase-prompt/handoff.md`. A change of Jam's level rewrites phrase 1 and keeps the
  doodle; a Jam's kept phrases hold Jam's level; `Jam again on this doodle` uses it as it stands.
  Now in: `flows/jam/handoff.md` (Routing Rules), `flows/jam/intent.md` (Jam's Settings),
  `flows/review-and-export/handoff.md` (Saving the Session; The Doodle and the Suggestion),
  `strategy.md` (Edge-Case Policy).
- **D478 (2026-11-09): on a phone, a seventh-chord symbol calibration failure is accepted (minor,
  spec D414; narrows D258).** The phone's scale is bounded by the staff budget alone; the mix's
  second line and `jam-bar` push the staff down and never enter it. A failure below
  `bp-tablet-landscape` no longer comes back here: those phrases take the too-many-notes path.
  Rejected: a smaller symbol or a short form on phones (two engravings for a third-rate client).
  Asks of the plan (`spec-writer`'s): chunk 14's "passes at every named breakpoint" holds from
  `bp-tablet-landscape` up, a phone failure recorded, not blocking; chunk 23's design docs add
  `flows/review-and-export/handoff.md`. Now in: `screens/phrase-workspace/handoff.md` (Notation
  Contract, On a phone), `strategy.md` (Engraving Policy).
- **D479 (2026-11-09): v3.2's later features need nothing more from v3.3.** The guides (D459–D463)
  keep their switches and volumes, the backing alone sounding the seventh (spec D518); tap tempo
  and the suggestion row are untouched (§D11); a Jam-level change at Idle is a Loading like any Jam
  setting, so D465, D471 and D474 apply as written; D470 stands. Jam has no Vary note or presets to
  change. Now in: master spec §D7.3, §D11; the handoffs as they stand.
