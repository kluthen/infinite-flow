# Lexicon Page Design (Draft)

> **Draft, proposed** (2026-11-22). The first design of v3.4's lexicon page, written before the
> owner's rulings on its open questions. Nothing here is approved or buildable.

## Status

The page is scoped by `spec-writer` in
[`specs/versions/v3/lexicon-page.md`](../../../specs/versions/v3/lexicon-page.md) (a side page
listing the lexicon's words, A–Z and by search, from `docs/music/lexicon.md` alone, lazy-loaded,
offline, keyboard-usable). This folder holds the design that scoping asks of `ux-writer`, kept
apart from the root because the root holds the interface as v3.3 shipped it and v3.4's design has
not started there. The answers it proposes to the spec's open questions are in
[`proposed-answers.md`](proposed-answers.md), for `spec-writer` to take to the owner.

## Map

- [`research.md`](research.md): what the lexicon holds as the page will read it, and how good
  glossary and reference pages handle A–Z, search, related words, doubled words, Back, deep
  links, accessibility and a plain line first, with sources.
- [`screens/lexicon-page/intent.md`](screens/lexicon-page/intent.md) and
  [`handoff.md`](screens/lexicon-page/handoff.md): the page.
- [`flows/look-up-a-word/intent.md`](flows/look-up-a-word/intent.md) and
  [`handoff.md`](flows/look-up-a-word/handoff.md): opening it from the footer, closing it, the
  browser's Back button.
- [`prototype/index.html`](prototype/index.html): a self-contained clickable prototype. It holds
  no copy of the lexicon: served from the repository root (any static server), it reads
  `docs/music/lexicon.md`; opened from disk, it asks for the file. Its panel switches the owner's
  choices on and off.
- [`proposed-answers.md`](proposed-answers.md): a proposed answer, with its reason, to each of the
  spec's lexicon page questions.

## What Adoption Changes at the Root

Once the owner has ruled, the draft moves to the root with v3.4's change marks:

- **The screen and the flow.** `screens/lexicon-page/` and `flows/look-up-a-word/` move as they
  are, the rulings applied and the draft notes removed.
- **The footer.** `screens/phrase-workspace/handoff.md` (Footer, in Components and Content and in
  Responsive Behavior): the `Lexicon` button after `Your data`, disabled during a session.
- **The strategy.** `strategy.md`: a Flow Index row ("Look up a word") and an Edge-Case Policy
  item for the page (opened only outside a session, no MIDI start while open, a load failure told
  in the notice row, nothing kept).
- **The token source.** The page's `lexicon-*` classes in `src/styles/components.css`, built from
  existing tokens; no new token. `motion.md` needs no change: the page uses the sheet's fade and
  the app's instant jumps.
- **The README.** The map gains the screen and the flow.
