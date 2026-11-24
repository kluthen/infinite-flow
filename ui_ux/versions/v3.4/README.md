# v3.4 — The Lexicon Page: UI/UX Design

Status: **released as version 3.4.0** (tag `v3.4.0` at 17e631e4, 2026-11-24). The owner validated
the lexicon page's design on 2026-11-22; master spec Part E, consolidated from it, was approved
for the build under the owner's delegation the same day. This folder is the v3.4 design as it
shipped, frozen at the release, as v3.2's was, the copy not having been taken at approval. It is
never edited again, except to correct it to match what v3.4 actually ships: the owner's look at
the built page after the tag may still find something (each such correction is recorded in the
root `decisions.md`, and the same correction is applied at the root). The product scope is Part E
of [`specs/versions/v3/master-spec.md`](../../../specs/versions/v3/master-spec.md#part-e--v34).
The v3.3 design it extends is in [`versions/v3.3/`](../v3.3/README.md).

This copy is every tier document at the root as v3.4 shipped it, nothing left out and nothing
reworded. Link paths were adjusted to this folder. The page's clickable prototype
(`mockups/lexicon-page/`) and the research behind it (`research/lexicon-page.md`) stay at the
`ui_ux/` root, where the master spec names the prototype; the screen's intent links the research
there.

The documents keep v3.4's marks, one layer: a `[v3.4 new]` or `[v3.4 changed]` tag, and each
document's **Changes since v3.3** block, show what v3.4 changed from v3.3; the four documents new
in v3.4 say so under their title. v3.4 removes nothing. The earlier releases' marks were cleared
from the root when v3.4's design started; [`versions/v3.3/`](../v3.3/README.md) still shows them,
layer by layer. `grep -rn "v3.4 new\|v3.4 changed"` finds every mark.

v3.4 adds no token and no motion token. Its classes, the lexicon page's `lexicon-*` classes and
the footer's `footer-actions`, all built from existing tokens, are in
`src/styles/components.css`, in its `v3.4 new` block; their shipped state is the `v3.4.0` tag's,
so the token source is not copied here.

## What v3.4 is

One thing the player sees: the lexicon page. A `Lexicon` button in the footer, beside
`Your data`, opens every word of the project's lexicon (`docs/music/lexicon.md`) over the
workspace, A to Z and by search, between sessions, and closes back to the same workspace,
nothing changed. Each word shows its plain line, with its definition and what it means in the app
one press away. v3.4's other items, the lexicon API and the structural review's refactors, change
nothing in the interface.

## The decisions worth keeping, and why

- **The plain line first, the rest in place.** Each entry shows its word and its one plain line;
  `More` opens the definition and the app meaning under it, so several words can stay open side
  by side and the reader never loses their place. A list beside a detail pane was rejected: half a
  tablet's width, and a second layout on a phone.
  ([lexicon-page intent](screens/lexicon-page/intent.md#the-focal-point-the-plain-line))
- **Letters and search, both always in view.** A letter jumps, the search filters as the player
  types, and a letter empties the search, so the two never combine. Empty letters are shown greyed
  rather than hidden. Search forgives case, accents and hyphens, matches other names, and from
  three characters also lists the words whose plain line mentions what was typed, in a group of
  their own, "Mentioned in other words".
  ([lexicon-page intent](screens/lexicon-page/intent.md#letters-and-search-both-always-at-hand))
- **The lexicon's own words, never reworded by the page.** The Internal words stay hidden; a text
  that reads badly is mended in the lexicon, once.
  ([lexicon-page intent](screens/lexicon-page/intent.md#what-was-demoted-or-hidden))
- **A short detour from the footer, between sessions only.** The page cannot open during a
  session and no session starts while it is open, the Your data sheet's rule; it opens nothing
  over an open sheet or the stale-phrase prompt.
  ([look-up-a-word intent](flows/look-up-a-word/intent.md#why-it-is-a-short-detour),
  [why the footer](flows/look-up-a-word/intent.md#why-the-footer))
- **Back closes the page, through one history entry.** The app's first use of the address bar:
  one `#lexicon` entry while the page is open, none for the jumps inside it, so Back closes the
  page instead of leaving the app. Chosen by the owner over no history entry at all.
  ([look-up-a-word intent](flows/look-up-a-word/intent.md#why-back-closes-it))
- **A page of its own, built from the sheets' parts.** It fills the window, in a reading column
  the wide sheet's width. Being reading, not playing, it works in either orientation, where the
  workspace is landscape-only on phones and tablets.
  ([lexicon-page intent](screens/lexicon-page/intent.md#visual-weight),
  [strategy, Problem Alignment](strategy.md#problem-alignment))
