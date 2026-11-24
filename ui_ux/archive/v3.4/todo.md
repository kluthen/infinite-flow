# v3.4 UI/UX Work Record (Archived)

> **Archived 2026-11-24.** v3.4 (the lexicon page) is released as version 3.4.0 (tag `v3.4.0` at
> 17e631e4, 2026-11-24). The live [`todo.md`](../../todo.md) points here.
> The text below this notice, up to "Archiving-pass addendum," is kept verbatim from the live
> tracker: the whole `## In Progress` section, which held only v3.4's work, and from
> `## Next Unit`, the v3.4 paragraph. What v3.4 still owes after the tag (the owner's look at the
> page, H1) is carried forward in the live tracker. Text written from `ui_ux/`; four link paths
> repaired.

## In Progress

v3.4's design is in progress at the root (D488). v3.3's checks after the tag are in Remaining;
the side work below is paused.

- **v3.4's lexicon page** (D487, D489, D490): the owner validated the design on 2026-11-22 and
  ruled yes on all four choices (spec D549; spec O239–O246 closed by spec D549 and D558);
  adopted at the root, the v3.0 to v3.3 marks cleared first
  (D488). Written: [`screens/lexicon-page/`](../../screens/lexicon-page/intent.md),
  [`flows/look-up-a-word/`](../../flows/look-up-a-word/intent.md), the footer's `Lexicon` in
  `screens/phrase-workspace/handoff.md`, the lexicon's notice in `flows/saved-data/handoff.md`,
  a Flow Index row and an Edge-Case Policy item in `strategy.md`; prototype in
  [`mockups/lexicon-page/`](../../mockups/lexicon-page/index.html), research in
  [`research/lexicon-page.md`](../../research/lexicon-page.md). `ux-critic`: DRIFT, five findings, all
  settled (D491).
  Token-source pass (gate T0) done on branch `v3.4-t0` (D492-D495): the `lexicon-*` classes and
  `footer-actions` in `src/styles/components.css`, Part E's two flow points in the flow;
  `ux-critic` DRIFT, three findings, all settled (D495).
  Build gap from wave 1 chunk 2, on branch `v3.4-t1` (D496): the matches' visually hidden `h3`
  "Matching words", class `lexicon-matches-heading`; and spec D568 mirrored in the flow (D497).
  Then: the owner's approval of v3.4's design as a whole and its `versions/v3.4/` copy.
- **The lexicon follow-ups, taken as a docs-only lexicon pass in v3.4 before the build** (spec
  D560; D489): moving a few player-worthy words out of the lexicon's Internal group (Gesture and
  answer, Open ending, Recovery, Register window, Signature figure), each with its line
  rewritten; shortening the eight app meanings over 1,200 characters (Vary settings, Doodle, Jam,
  Key and mode suggestion, Drift, Allowed rhythm changes, Rhythm lock, Starting note). Both are
  lexicon edits (`docs/music/lexicon.md`), not this tree's; the page needs no change for either.
- **The lexicon API in v3.4** (spec D555): it moves into v3.4 with the page. If it gives entries
  addresses or reaches the page, `flows/look-up-a-word/intent.md` (What Was Left Out: a web
  address per word, which says the API step defines its own addresses) is revisited then.

## Next Unit

v3.4's lexicon page: the owner's approval of v3.4's design and its `versions/v3.4/` copy (In
Progress); the token-source pass is done (D492-D495).

## Archiving-pass addendum (2026-11-24)

New text, written by this pass; the record above is unchanged. What the pass found true:

- **Released.** v3.4 is released as version 3.4.0 (tag `v3.4.0` at 17e631e4, 2026-11-24), on the
  owner's go to tag before H1, his look at the built page (spec D578). H1 follows the tag as a
  v3.4.x follow-up; the live tracker carries it.
- **The approval and the copy.** No separate approval of "v3.4's design as a whole" was asked:
  the owner validated the lexicon page (spec D549) and delegated v3.4's resolution to the wave
  driver (spec D556), who approved Part E, consolidated from this design (spec D564). The
  `versions/v3.4/` copy was not taken then; this pass takes it, at the release (ux D498).
- **Branches `v3.4-t0` and `v3.4-t1`** are merged into `main`: D492-D497 are in the live log
  there, and the classes in `src/styles/components.css`.
- **The lexicon follow-ups** were made before the build, as the lexicon's v1.9 pass (commit
  32868c5d, the build plan's gate L0).
- **The lexicon API** was built in wave 1 (chunk 3) as a read interface with a JSON Schema and no
  network: it gives entries no web address and does not reach the page, so the revisit the item
  above foresaw was not needed. The flow intent's sentence "the API defines its own addresses"
  was put right at the root and in `versions/v3.4/` before the copy (ux D498).
