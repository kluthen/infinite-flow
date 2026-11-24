# UI/UX Decisions

> **Archived 2026-11-24.** v3.4 (the lexicon page) is released as version 3.4.0 (tag `v3.4.0` at
> 17e631e4, 2026-11-24). These are decisions D487-D497, the whole v3.4 design (its draft, its
> adoption at the root, its token-source pass and the build's design questions), kept verbatim
> with their section headings; D498, which froze the design in `versions/v3.4/`, stays in the live
> [`decisions.md`](../../decisions.md) until the owner's look at the page after the tag (H1) is
> done. Live summary: [`archive/v3.4/README.md`](README.md). Text written from `ui_ux/`.

## v3.4's lexicon page: the first design draft, 2026-11-22

- **D487 (2026-11-22): the lexicon page's first design is a draft in `drafts/lexicon-page/`, not
  at the root, until the owner rules on spec O239–O246.** The root holds v3.3 as shipped and
  v3.4's design has not started there; a draft keeps the v3.3 marks question and the footer
  change for adoption. Minor choices are settled in it under the standing delegation (ux D119,
  archived): entries opened in place rather than a list beside a detail pane; letters as links,
  empty ones grey text; focus on open by pointer type. Proposed answers to O239–O246, with the
  owner's choices, go to `spec-writer`. Now in: `drafts/lexicon-page/README.md`.

## v3.4's design starts at the root, 2026-11-22

- **D488 (2026-11-22): v3.4's design starts at the root; the v3.0 to v3.3 marks are cleared.**
  The owner's validation of the lexicon page starts v3.4's design, and `versions/v3.3/` holds
  v3.3 with every layer of marks, so the root's change blocks, inline tags and annotations, and
  the token source's `v3.x new` / `v3.x changed` comments, went in one mechanical pass, before
  any v3.4 edit; layout-tree notes were reworded to the shipped state. v3.4 is marked against
  `versions/v3.3/`. Now in: `README.md` (Released versions and work in progress).
- **D489 (2026-11-22): the owner's rulings on the lexicon page: all four choices yes.** "OK i
  validate lexicon view": the Internal entries stay hidden; Back closes the page through one
  `#lexicon` history entry; the "Mentioned in other words" group; app meanings shown as written.
  The proposed answers are accepted: spec O239–O244 and O246 closed by spec D549, O245 by spec
  D558, so the questions D487 left open are closed. The two follow-ups (player-worthy words out
  of Internal, the eight longest app meanings shortened) are a docs-only lexicon pass before the
  build (spec D560). Now in: `screens/lexicon-page/handoff.md`, `flows/look-up-a-word/`.
- **D490 (2026-11-22): the draft is adopted at the root as v3.4's design (closes D487's draft;
  spec D549).**
  Screen and flow moved as they were, rulings applied, draft notes dropped; the prototype is
  `mockups/lexicon-page/`, the research `research/lexicon-page.md`; `proposed-answers.md` went
  (its answers are spec-side now; commit 3157901a has it). Settled here: `btn`'s minimum target
  for the 44px letters, the lexicon notice's lifetime and its place after Jam's. Now in:
  `screens/phrase-workspace/handoff.md` (Footer), `strategy.md`, `flows/saved-data/handoff.md`.
- **D491 (2026-11-22): `ux-critic` on v3.4's design: DRIFT, five findings, all settled here.**
  The `#lexicon` entry's three gaps (a load at it, Forward, the in-page links) are now rules; the
  page counts as an open sheet for the starting note; letter, `More` and focus-target states are
  specified, empty letters told by weight and underline, not colour alone; `strategy.md` gains the
  page's goal and its portrait exception; the footer's tags match its change block. The mark
  clearing (D488) checked clean. A re-check found two more, settled too: every opening, a load at
  `#lexicon` included, adds the page's entry; the title takes focus as `lexicon-title`. Now in: `flows/look-up-a-word/handoff.md` (Routing Rules),
  `screens/lexicon-page/handoff.md`, `strategy.md`, `motion.md`, `flows/play-session/handoff.md`.

## v3.4's token-source pass (gate T0), 2026-11-23

- **D492 (2026-11-23): the lexicon page's classes are in the token source, from existing tokens
  only; the handoff's open details settled here.** `Letters` gets a class of its own
  (`lexicon-letters-button`), shown below bp-tablet-landscape by the token source; the result
  count is visually hidden; the title row takes two lines below bp-mobile-landscape, `Close` on
  the first; the lexicon's queries are width-only (it works in portrait); the body's blocks are
  `--spacing-6` apart, the mentions' heading `--text-xl`. The bar's height is a measurement the
  page sets on the view (`--lexicon-bar-block-size`, as `--played-note-pitch`), read by its
  scroll padding. Now in: `screens/lexicon-page/handoff.md`, `src/styles/components.css`.
- **D493 (2026-11-23): the footer's two buttons sit in `footer-actions`.** The handoff wants
  them `--spacing-2` apart and wrapping together under the note, which `layout-footer`'s one
  flex row cannot do, and chunk 2 may not touch `src/styles/`. Now in:
  `screens/phrase-workspace/handoff.md` (Layout Tree; Responsive Behavior: Footer).
- **D494 (2026-11-23): master spec Part E's two flow points are in the flow (spec §E11).**
  `Lexicon` does not wait for the session controller (§E7); `#lexicon` reached any other way,
  typed for one, is handled as a load at `#lexicon` (§E8). Now in:
  `flows/look-up-a-word/handoff.md` (Routing Rules: Opening; The browser's Back button).
- **D495 (2026-11-23): `ux-critic` on gate T0: DRIFT, three findings, settled here.** The
  classes match the handoff value by value. `#lexicon` reached under an open sheet (Forward, a
  load, typed) opens nothing and only replaces the address, since `Lexicon` cannot be pressed
  there; the rejected alternative, closing the sheet first, could discard what the player typed.
  §E8 does not cover this case; `spec-writer` to mirror it. The "unlike `Your data`" wording and
  the README's class line are fixed. Now in: `flows/look-up-a-word/handoff.md` (Routing Rules),
  `README.md`.
- **D496 (2026-11-23): the lexicon page's matches get a visually hidden `h3`, "Matching
  words".** The searching state put each match's `h4` right after the `h2` title (axe
  `heading-order`, wave 1 chunk 2). Rejected: the result count as the heading (a live region
  written after a pause, so the heading would be empty or stale while typing), and the words one
  level lower while searching (the matches would sit level with "Mentioned in other words", and
  an entry's markup would change by state). Now in: `screens/lexicon-page/handoff.md` (Layout
  Tree; How Search Works: Matches heading; Components and Content: Heading outline),
  `src/styles/components.css`.
- **D497 (2026-11-23): spec D568 mirrored in the flow.** The stale-phrase prompt counts as a sheet
  for `#lexicon` reached under it, and a sheet opened during the page's first load stops the
  opening, even if closed before the load ends; a later press of `Lexicon` opens the page. Now
  in: `flows/look-up-a-word/handoff.md` (Flow; Routing Rules: A session during the load, Under an
  open sheet), `screens/lexicon-page/handoff.md` (States: Loading).
