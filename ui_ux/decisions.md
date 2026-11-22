# UI/UX Decisions

Append-only record of settled UI/UX decisions. Earlier logs are archived verbatim:

- D1–D44 (first release, v1.0): [archive/v1/decisions-D1-D44.md](archive/v1/decisions-D1-D44.md)
- D45–D176 (v2, released as version 2.0.0):
  [archive/v2/decisions-D45-D176.md](archive/v2/decisions-D45-D176.md)
- D177–D224 (v3.0's design, released as version 3.0.0):
  [archive/v3.0/decisions-D177-D224.md](archive/v3.0/decisions-D177-D224.md)
- D280–D322 (v3.0's design gates and corrections during its build):
  [archive/v3.0/decisions-D280-D322.md](archive/v3.0/decisions-D280-D322.md)
- D227–D234 (v3.1's own design decisions, released as version 3.1.0):
  [archive/v3.1/decisions-D227-D234.md](archive/v3.1/decisions-D227-D234.md)
- D323–D326 (after the v3.0 release; v3.1's approval, token-source pass and release gate):
  [archive/v3.1/decisions-D323-D326.md](archive/v3.1/decisions-D323-D326.md)
- D225–D251 (the v3.1 and v3.2 design of 2026-10-08, the entries v3.1 shared with v3.2 included;
  v3.2 released as version 3.2.0):
  [archive/v3.2/decisions-D225-D251.md](archive/v3.2/decisions-D225-D251.md)
- D327–D475 (v3.1's archive pass; v3.2's re-scope, approval, token-source pass and the design
  questions of its build): [archive/v3.2/decisions-D327-D475.md](archive/v3.2/decisions-D327-D475.md)
- D252–D264 (the v3.3 design of 2026-10-12; v3.3 released as version 3.3.0):
  [archive/v3.3/decisions-D252-D264.md](archive/v3.3/decisions-D252-D264.md)
- D477–D479 (the v3.3 design refreshed against v3.2 as built):
  [archive/v3.3/decisions-D477-D479.md](archive/v3.3/decisions-D477-D479.md)

Archived IDs keep their meaning; a citation to one by ID elsewhere in this repository stays valid
through this header. D480 and D483 (v3.2's frozen copy and its release gate) stay here until the
owner's hand checks after the `v3.2.0` tag are done, since a finding there may correct
`versions/v3.2/`. D482 and D485 (v3.3's frozen copy and its labels) stay until v3.3's checks after
the `v3.3.0` tag are done (U1b, the listening check L2 and hand check H6), since a finding there
may correct `versions/v3.3/`. D486 (the space between a chord's root and its suffix) stays until
it is built. D481 and D484 sit between them and stay with them; D484 is also the standing format
rule for the root's tier documents. D265–D279 were never used; D356–D446, D453, D455, D472, D473
and D476 appear in no log. New numbers come from `doc-ids next ux D`.

## The v3.3 design refreshed against v3.2 as built, 2026-11-09

Inputs: master spec Part D v1.2 and build plan v3.3 v4 (spec D511–D518), proposed for the owner's
approval at gate D0; v3.2 as merged on `main` (waves 1 to 7). The owner's standing delegation
applies (D119, D135, archived; spec D414).

- **D480 (2026-11-09): v3.2's design is frozen in `versions/v3.2/` before v3.3's gate D0.**
  Approved on 2026-10-21 (D347), it should have been frozen then; v3.3's change blocks speak of
  changes since v3.2, so the owner approves v3.3 against a fixed v3.2. Taken as D324 took v3.1's:
  every tier document as it stands at the root after v3.2's build corrections (D349–D475), marks
  kept, v3.3's tagged parts, change-block lines and annotations left out, link paths adjusted.
  The token source is not copied: its `v3.2 new` blocks are in `src/styles/`, their shipped state
  the `v3.2.0` tag's. Should the release gate change the design, the copy is corrected to match
  and the correction recorded. Now in: `versions/v3.2/README.md`.
- **D481 (2026-11-09): `ux-critic`'s refresh pass: DRIFT, four findings resolved; D478's phone
  acceptance withdrawn.** Accepting a phone failure in advance contradicted §D11, §D15 item 11 and
  the plan, and left the too-many-notes sentence naming a cure that would not help. So D258 holds
  at every width, phones included, and a failure comes back here, a phone reduction being the
  likely answer then. D478 keeps only the height note and the chunk 23 ask. "Never switches" now
  allows phrase 1 after `Start with this phrase` (ask: §D8.3 likewise). Now in: workspace handoff
  (Phone height), `strategy.md` (Engraving Policy), `flows/play-session/` (session rule, intent).

## The owner's approval of the v3.3 design, 2026-11-09

- **D482 (2026-11-09): v3.3's design approved at gate D0; frozen in `versions/v3.3/`.** Asked to
  approve Part D v1.2, build plan v4 and this design (D477–D481), the owner answered "Approve
  both". Frozen at approval, as D480 says v3.2 should have been: every tier document as it stands
  at the root, all marks kept, link paths adjusted; no token source (D261). Corrected only to match
  what v3.3 ships, or as v3.2's release gate corrects `versions/v3.2/`. The root keeps v3.3's marks
  until v4's design starts. Now in: `versions/v3.3/README.md`, `README.md` (Status).

## v3.2's release gate, 2026-11-09

- **D483 (2026-11-09): v3.2 release gate: no v3.2 handoff names a class or token missing from
  `src/styles/`; no phone reduction; `versions/v3.2/` needs no correction (build plan v3.2's
  chunk 27; spec D521).** Every class, token and layout-tree name in `versions/v3.2/`'s handoffs,
  and in the root's, is in `theme.css` or `components.css`. No chunk reduced a capability on a
  phone (20 and 31 record none; 24's scroll and 40's popover were accepted as built, D468, D475).
  The copy differs from the root only by v3.3's parts and link paths, and matches what ships.
  Nothing to restate in a tier document; the check is history. Recorded in `todo.md`.
- **D484 (2026-11-12): the root tier documents take the dev team's UI/UX document format; the
  frozen copies stay as they are.** The owner's request: every rule a builder follows sits in a
  section or a bold-labelled item, so `doc-get` can fetch it without a window of text around it.
  A format-only pass: labels and headings added, eight diagram headings moved under `## Flow`,
  change-block lines given their section and label; no wording changed. `versions/` is left as
  approved (owner, 2026-11-12), so v3.3's plan cites the frozen copy as it is. Left as warnings:
  routing kept in stage sections (kept-sessions, review-and-export, saved-data), and
  controller-connection's and phrase-workspace's focus rules outside a Focus and Keyboard section.
  Now in: the dev team's `references/ui-ux-docs.md`, checked by `doc-get lint ui`.

## v3.3's build: the first measured shares, 2026-11-13

- **D485 (2026-11-13): gate U1a: the top label becomes `Always`; Off, Sometimes and Often stay
  (corrects D254's top label; build plan v3.3's U1a).** Chunk 18's first run
  (`docs/generation-latency.md`): 25.3 % sevenths at Sometimes, 50.3 % at Often, 100 % at Strongly
  favored, no fallback; §D5.2 tries a seventh at every event, so the top step is every chord.
  "Mostly" promised triads the player never hears; a rare whole-phrase fallback stays covered by
  the note's "never a promise". Wording only (saved data names the spec's level), so applied at
  the root and in `versions/v3.3/` alike, before chunk 19. Now in:
  `screens/phrase-workspace/handoff.md` (Seventh chords), its `intent.md`, `strategy.md`,
  `versions/v3.3/README.md`. U1b rechecks on the final shares.
- **D486 (2026-11-13): the space VexFlow draws between a chord's root and its suffix is tolerated
  in v3.3 and left as a follow-up.** The Notation Contract writes a symbol as one word (`Cmaj7`,
  `G7`, `Bm7♭5`), as in print; "C maj7" is not that, but breaks no rule a player relies on: the
  symbol is whole, on one baseline, and its full width counts toward fit, so nothing overlaps.
  Shipped since v3.2 ("A m"); chunk 14 left it. A later chunk sets the suffix against the root
  (narrower symbols only ease fit), and the contract then says so. Now in: `todo.md` (Remaining).

## v3.4's lexicon page: the first design draft, 2026-11-22

- **D487 (2026-11-22): the lexicon page's first design is a draft in `drafts/lexicon-page/`, not
  at the root, until the owner rules on spec O239–O246.** The root holds v3.3 as shipped and
  v3.4's design has not started there; a draft keeps the v3.3 marks question and the footer
  change for adoption. Minor choices are settled in it under the standing delegation (ux D119,
  archived): entries opened in place rather than a list beside a detail pane; letters as links,
  empty ones grey text; focus on open by pointer type. Proposed answers to O239–O246, with the
  owner's choices, go to `spec-writer`. Now in: `drafts/lexicon-page/README.md`.
