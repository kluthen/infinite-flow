> **Archived 2026-11-09.** Closed range for the v3.2 milestone: v3.2 is released as version
> 3.2.0 (tag `v3.2.0`, f93e552d). These decisions are v3.1's release sync, the owner's go, its
> archive and the closing of its hand checks (D396–D399), then v3.2's Jam re-scope (D400–D405).
> D393–D395 (v3.4) stay live, and so does D406 (Jam's four answers, provisional until the owner's
> checks). Archived IDs keep their meaning and may be cited anywhere; each decision's content is
> now stated as settled fact in a live document, or is history, as the "where it now lives" table
> in [archive/v3/README.md](README.md) records. Relative links were written from `specs/`; their
> paths were repaired on 2026-11-09 so they resolve from this folder.

- **D396 (2026-10-21): the owner accepts every proposal of the v3.1 release sync; `v3.1-release`
  merges into `main` now and the `3.1.0` tag follows H3–H5.** The owner: "go with the proposals for
  all of them". The gate's automated part passed (chunk 21, merged as 6a25f27; final M1 and M2 at
  chunk 11's counts, DP stays closed; entry chunk 265,431 B); sync 1fa0bdf, 9dcc031. Promotions,
  applied by `documentalist`: 11 DRAFT→REVIEW (`rule_figure_level_orders_search` reworded, shares
  kept per D391), 30 REVIEW→STABLE, CONTRACT 7.0.0→7.1.0 (MINOR), MODULE and ENTITY atoms as at
  v3.0, `changes-in-v3.1` removed from 7 STABLE atoms. Still on the owner (D392): H3–H5, 11
  REVIEW→STABLE and 2 DRAFT→REVIEW promotions, his go, the tag on `main`. Now in:
  [chunk 21](../../versions/v3/build-plan-v3.1.md#chunk-21--v31-release-gate) (plan v22).

- **D397 (2026-10-21): the owner gives his go; `3.1.0` is tagged on `main` now, and v3.1 H3, H4
  and H5 become post-release hand checks; D392 and D396 are amended.** The owner: "you may tag when
  everything is done", then, asked about H3–H5, "Tag now, H3–H5 later". The tag follows the
  committed sync promotions (1bb3257, CONTRACT 7.1.0) and the merge into `main`, pushed. A finding
  from H3–H5 becomes an issue or a 3.1.x fix; as each check passes, its waiting promotions follow
  (11 REVIEW→STABLE, 2 DRAFT→REVIEW). D396's MODULE and ENTITY atoms: the nine new ones go on the
  contract surface, as all twelve v3.0 ones did, within the owner's "go with the proposals for all
  of them". Now in: [hand checks](../../versions/v3/build-plan-v3.1.md#hand-checks),
  [chunk 21](../../versions/v3/build-plan-v3.1.md#chunk-21--v31-release-gate) (plan v23).

- **D398 (2026-10-21): v3.1 is released as version 3.1.0; its working record is archived.** The
  tag `v3.1.0` is on `main` at 55364e7 (D397). Moved verbatim to
  [archive/v3/](README.md): D228–D231, D353–D388 and D390–D391, the register's notes on
  O231–O233, the two v3.1 drafts, and the former status snapshots of the spec index and the v3
  README. Master spec Part B, the v3.1 build plan and its wave log stay in place. Still live: v3.1
  H3–H5 and their 13 waiting promotions ([v3.1.x notes](../../versions/v3/README.md#v31x-notes-after-the-tag)).
  No question was decided.

- **D399 (2026-10-21): v3.1's hand checks after the tag close: H4 passed, H3 and H5 waived; the 13
  waiting promotions proceed; Chrome is the one supported browser.** The owner: "edge isn't
  supported anyway so who cares. v3.0 has no live customer so we may forget about migration issue.
  otherwise everything run fine." The spec had named Edge (Chromium-based browsers, "Chrome or
  Edge"); it now says Chrome is supported and other Chromium-based browsers, Edge included, are not
  tested. H5: the v3.0 upgrade code and its tests stay. The Edge checks of the v3.2 and v3.3 plans go
  at their next revision. Now in: [v3.1.x notes](../../versions/v3/README.md#v31x-notes-after-the-tag),
  [hand checks](../../versions/v3/build-plan-v3.1.md#hand-checks), [context of use](../../personas.md#context-of-use).

- **D400 (2026-10-21): Jam is its own mode, apart from the usual session mode; the app opens in
  session mode, and a button switches to Jam mode.** The owner: "consider the jam mode something
  that is distinctly different from usual session (website load on start the current session mode,
  click a button to switch in jam mode) … moving jam as separate from session should prevent much
  of the colision ui wise." Replaces Part C's Jam switch among the session options (C5.1). Opens
  O251. Now in: [Jam mode §2](../../versions/v3/jam-mode.md#2-two-modes).

- **D401 (2026-10-21): Jam has its own settings set.** The owner: "settings related to jam are
  probably a bit different (the app will follow what has been provided and will iterate and mutate
  over the provided motif)." Which settings it holds, shares or drops is O247, O248 and O253. Now in:
  [Jam mode §3](../../versions/v3/jam-mode.md#3-jams-settings-set).

- **D402 (2026-10-21): Jam's code loads on demand, outside the first-load (entry) chunk.** The
  owner: "This may reduce initial load cost." The entry chunk carries only the button that opens
  Jam mode. Bundle policy: O258. Now in: [Jam mode §2](../../versions/v3/jam-mode.md#2-two-modes).

- **D403 (2026-10-21): Jam's footprint in the generator is kept as small as possible: one shared
  generator, Jam's steering at its edges.** The owner: "we must aim at reducing impact of jam on
  generator work as much as possible, but it is inescapable." The seam is proposed in
  [Jam mode §4](../../versions/v3/jam-mode.md#4-the-generator-seam) (O252).

- **D404 (2026-10-21): Jam's tempo target is 120 to 180 BPM; 240 BPM is best effort, worked on
  last, and may be dropped.** The owner: "working at 240 bpm should be considered best effort
  (leave it for last). aim for 120 to 180 at maximum. None of our persona are expert at these
  level. (i'll accept the sacrifice of 240bpm should it come up)." How the tempo is set is O249;
  the exact ceiling O250. Now in: [Jam mode §5](../../versions/v3/jam-mode.md#5-tempo-in-jam).

- **D405 (2026-10-21): v3.2 is re-scoped around D400–D404; Part C's Jam is reopened, and the
  v3.2 build plan's rewrite waits for the re-scope.** Part C (approved by D239) stays the record
  until the re-scope is settled and consolidated into it; where [Jam mode](../../versions/v3/jam-mode.md) differs, Part C is
  to change. The plan's corrections found against v3.1 still apply at the rewrite. The rhythm lock
  and Vary settings' allowed groups are not reopened beyond what the mode split touches. Now in:
  [Jam mode §6](../../versions/v3/jam-mode.md#6-blast-radius).
