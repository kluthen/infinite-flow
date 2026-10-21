# v3.4 — The Lexicon Page

Status: draft v1 (2026-10-21; scoping, D393–D395). What follows from the owner's words is settled
and cites its decision; the rest is `(proposed)` and waits on O239–O246.

The first step of a small side project, added to v3.4 next to the
[structural review](structural-review.md) and independent of it (D393). The second step, turning
the lexicon into an API, is planned for v4 or v5 (D395; [roadmap](../../roadmap.md#planned-v4-or-v5--the-lexicon-api)).

Serves (proposed, O246) P1, the Curious Improviser, between sessions: G1, "get to know the
possibilities rather than study theory"
([personas](../../personas.md#p1--the-curious-improviser-primary-d48)). A player who meets a word
in the controls, a preset or the review (Leapiness, Figure level, enclosure) can look it up
without leaving the app or going online.

Plain words used here:

- **The lexicon**: [`docs/music/lexicon.md`](../../../docs/music/lexicon.md), the project's one list
  of music words, written for a reader with no music theory.
- **Entry**: one word in the lexicon, with its fields (below).
- **The page**: the lexicon page this draft scopes.

## 1. In the owner's words

Recorded 2026-10-21 (D393): "shape a side project that shouldn't be too onerous: we have a lexicon
that sits mostly idle here, have a side page to our app reference all words in there, it must
allow alphabetical exploration, simple search. Note it must use existing md files and not
duplicate information. That's for step one (include it in 3.4). For later (v4 or v5 depending on
how they goes) we will turn this in a proper API."

## 2. Settled

- **A side page in the app lists the lexicon's entries** (D393), with:
  - **alphabetical exploration:** the letters A to Z, each listing its words;
  - **a simple search** over the words (what it matches is O244).
- **It is part of v3.4** (D393). That makes v3.4's first player-facing item: D389's "no
  player-facing behaviour" now describes the structural review only.
- **One source: the lexicon file** (D394). The page reads `docs/music/lexicon.md` and nothing
  else. No hand-copied list, no second list, and no generated file committed to the repository.
  An edit to the lexicon shows on the page at the next build with no other change, and a check
  proves it (§5).
- **What the code already requires** (D393, from the code read on 2026-10-21, §6):
  - it is **lazy-loaded**: none of its code or text goes into the entry chunk (300 KiB budget,
    D359), beyond the few bytes of the link that opens it;
  - it **works offline**, like the rest of the app;
  - it uses **only the classes and tokens in `src/styles/`**;
  - it can be **used with the keyboard alone**, and the search field has a visible label.
- **Out of step one** (D393): editing entries; word popups inside the app's other screens (not
  built today, §3); the API (D395).

## 3. What the lexicon holds today

Read 2026-10-21 (lexicon v1.7). Facts, not decisions.

- **334 entries** in 12 themed groups (Basics, Pitch and notation, Rhythm and meter, Melody,
  Harmony, Scales and modes, Styles, Style and identity, Texture and arranging, Instruments and
  transposition, App controls, Internal). The entries are alphabetical inside each group only, so
  an A–Z view needs one sort over all of them.
- **16 entries sit under "Internal (no popup)"**, which the lexicon says are "never shown in the
  UI" (O239).
- **Each entry** is a `###` heading (the word as the reader sees it) followed by one-line fields,
  always in this order:
  - `id`: a unique short name, such as `half-step`;
  - `aliases`: other names (`none` in 32 entries), such as "semitone, half tone";
  - `popup`: one or two plain sentences, at most 200 characters;
  - `definition`: a short plain paragraph;
  - `in_infinite_flow`: what the word means or does in this app (missing in 11 entries);
  - `related`: the ids of other entries;
  - `sources`: research source IDs and repository paths, for checking facts.
- **Four words appear twice**: Contour, Register, Syncopation and Tempo, once as the music word
  and once as the app control (`contour` and `control-contour`, and so on). The page must tell
  them apart (O240).
- **No word starts with U, X, Y or Z**; Q has one. One word has an accent: "Compás".
- **Formatting inside the fields is light**: a few code marks (backticks) and some emphasis; no
  links inside entries.
- **Some app meanings are written for developers too** (O241): 59 cite spec decisions ("spec
  decision D214"), about 45 describe something planned or not built, a few name code files.
- **Size:** the file is 337 KB; the fields the page would show, Internal entries left out, come to
  about 297 KB (§6, O242).
- **The lexicon already expects to be read by the app:** its "How to use" calls entries "meant to
  be parsed", with the popup as hover text (the "v2 plan"). Nothing in the app reads it yet, and
  no word popups are built.

## 4. The page (proposed)

The screen design is `ux-writer`'s (§8). What follows is the behaviour the design must support.

- **What one entry shows** (proposed, O240): the word; its other names ("also called"); the popup
  line as the opening sentence; the definition; the app meaning under a plain heading such as "In
  Infinite Flow", when the entry has one; the related words as links that move to those entries on
  the page; and the group as a small label, which tells the four doubled words apart. Not shown:
  the `id` and the `sources`.
- **A–Z:** one sort over every shown entry, ignoring case and accents ("Compás" sorts under C). A
  letter with no word (U, X, Y, Z today) is shown but cannot be chosen (proposed; the design may
  choose otherwise). Each entry is reachable by its `id`, which is stable, unlike the heading.
- **Search** (proposed, O244): matches the word and its other names, anywhere in them, ignoring
  case and accents ("compas" finds "Compás", "semitone" finds Half step); results update as the
  player types; an empty result says so; clearing the search returns to A–Z.
- **When it can be opened** (proposed, O243): from a link in the footer, beside "Your data"; not
  while a session runs, like Your data.

## 5. The single source (D394)

- **How the text reaches the page** (proposed, O242): a small build step, a Vite plugin, reads
  `docs/music/lexicon.md` at build time, parses its entries, and hands the page the fields it
  shows as a module that exists only in the build. Nothing is written into `src/` or committed.
  The alternative, importing the raw file (`?raw`) and parsing it in the browser, ships the whole
  337 KB file, Internal entries and sources included.
- **A malformed entry fails the build** (proposed): a missing required field (`id`, `popup`,
  `definition`), an `id` used twice or a `related` id that names no entry stops the build with
  the entry's word and line. These are the rules the lexicon's own template states. A lexicon edit
  can then break the app's build: whoever edits the lexicon runs `npm run quality`, as with any
  change.
- **The check** that an edit shows with no other change (D394), proposed:
  - the parser's tests run on the real lexicon file and compare against the file itself, never
    against a stored copy: every `###` entry outside the Internal group is in the parsed list,
    with the same `id` and fields; no snapshot of the lexicon's content is stored anywhere;
  - a test feeds the build step a small sample lexicon and checks that adding an entry to it adds
    it to the output with nothing else changed;
  - a check fails if a file holding the parsed lexicon is committed (in `src/`, `public/` or
    `tests/`).
- **Reuse by the API** (proposed, not a requirement; D395): the parser is a plain module with no
  Vite or browser code in it (text in, entries out), so the v4 or v5 API can reuse it as it is.

## 6. What the code says (blast radius, 2026-10-21)

Read on branch `v3.1-release` at 56aea52, through `codebase-explorer`.

- **No router and no second page.** `App.vue` renders `WorkspaceShell.vue` only; there is no
  `vue-router`, no `pushState` and no hash routing. The sheets (connection, my instrument, presets,
  Your data, confirmation) are modal dialogs opened beside the workspace; the review is a mode
  inside it. The page is either a full-screen view on the sheet pattern or the app's first real
  second page (O243).
- **The sheet pattern** (`src/components/workspace/use-your-data.ts`): `open()` loads the sheet's
  code by `import()` once, keeps it, and is refused while a session runs; `close()` hides it and
  the sheet gives the focus back. The page can follow it.
- **Where the link fits:** `LayoutFooter.vue` holds only the "kept on this device only" note and
  the Your data button. The header is full.
- **No network in `src/`.** `npm run verify:boundaries` (`scripts/verify-boundaries.mjs`) forbids
  `fetch(` in `src/`, so the page cannot download the lexicon while running: its text has to be
  in a built JavaScript file.
- **Offline.** The service worker precaches every `js`, `css` and font file (`vite.config.ts`,
  `globPatterns`), and `verify:boundaries` fails if one is missing. A new lazy file is therefore
  offline with no extra work, and **every visitor's browser downloads it when the app installs or
  updates, whether or not the page is ever opened** (O242).
- **Size budgets** (`verify-boundaries.mjs`): entry 300 KiB, generation worker 150 KiB, VexFlow
  engraver 800 KiB, **any other file 100 KiB**. The lexicon's shown text, about 297 KB, is three
  times that: the page's text needs its own named budget (O242). Its file name must not start
  with `index-`, or it is judged as the entry chunk.
- **Styles.** `src/styles/` holds `theme.css` (the tokens) and `components.css`, both
  `ux-writer`'s; the rule that styling lives there is written in `README.md` and `ui_ux/README.md`,
  not checked by a tool.
- **Tests.** Unit tests in `tests/unit/` (Vitest); end-to-end tests in `tests/e2e/` (Playwright,
  Chromium), where a new spec file must be added to the `test:e2e` list in `package.json`;
  accessibility checks in `tests/e2e/accessibility.spec.ts`; offline in
  `tests/e2e/release/offline-and-fonts.spec.ts`.
- **Nothing reads the lexicon today**; no Markdown is imported anywhere; no Markdown parser is a
  dependency (the format is regular enough that a small parser of its own needs none, proposed).
- **Declared intent:** no atom covers the lexicon. `req_browser_only_first_release` (everything
  runs in the browser, no server) holds for the page.

## 7. Out of scope for step one

- Editing entries in the app.
- Word popups or links from other screens to the page (not built; the parser makes them cheap
  later).
- The API (D395).
- Browsing by group (the twelve themes); a later step if wanted.
- A web address for the page, unless O243 settles otherwise.

## 8. Its place in v3.4 and who does what (proposed)

- **Independent of the structural review**: it neither waits on the analysis nor feeds it,
  except that the analysis measures the app with the page in it, the new budget included (O245).
- **Order** (proposed, O245): its own small part of v3.4, specced, designed and built before the
  analysis's measurement pass. It depends on nothing in v3.2 or v3.3, so the owner may pull it
  earlier. With it, v3.4 ships code, which bears on O234 (a `3.4.0` tag only if code ships).
- **`spec-writer`**: once O239–O246 are settled, a short master spec part for the page (Part E
  of the [v3 master spec](master-spec.md), proposed) and a build plan of one wave.
- **`ux-writer`**, first: the page's design in `ui_ux/`, as a screen of its own (proposed
  `ui_ux/screens/lexicon-page/`): the footer link; the page's layout on laptop, tablet and phone
  (phones low priority); the letter row and the empty letters; the search field, its label, the
  no-result state; one entry's layout and the doubled words; following a related word; opening,
  closing and where the focus goes; keyboard order. Any new class goes into `components.css`, its
  own file. `ux-critic` validates it.
- **`documentalist`**: one small BUSINESS atom (the player can look up every lexicon word, A–Z
  and by search, offline) and one ARCHITECTURE atom for the single-source rule (D394), captured
  at the wave's preflight. The parser's tests, the size budget and the build step are tooling and
  get no atom (the project's ATD scope: business behaviour only).
- **Coding** (`coding-leader`, chunk mode), one wave, two chunks run one after the other:
  1. the parser, the build step, the named budget, the single-source checks (§5);
  2. the page, the footer link, the end-to-end test (A–Z, search, keyboard, axe, offline).

**Definition of done** (proposed): every lexicon entry outside the Internal group is on the page,
under its letter and found by search; a lexicon edit shows at the next build with no other
change, and the check proves it; the entry chunk grows only by the link; the page works offline
and with the keyboard alone; `npm run quality` and the end-to-end tests pass; the owner has seen
the page.

## 9. Open

O239–O246, in the [register](../../open-questions.md#v34-lexicon-page-o239).
