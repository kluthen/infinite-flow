# v3.4 — The Lexicon Page

Status: draft v2.2 (2026-10-21; scoping, D393–D395; 2026-11-22, D548; the owner's validation of
the design and its answers, D549; the tag, D550; the API moved into v3.4, D555; the wave driver's
rulings under the owner's delegation, D556: the order, D558, the API's shape, D559, the lexicon
pass, D560; a lexicon backend some day, D561). The page's behaviour (D549), its order (D558) and
the API's shape (D559) are settled and written as fact; what is still `(proposed)` is how the page
is built and checked (§5) and the definition of done (§8), which the master spec part settles.
Open: only where the API lives once the split is built (O315).

A small side project in two steps, both in v3.4, next to the
[structural review](structural-review.md) and independent of it: step one is the page (D393);
step two, turning the lexicon into an API, was planned for v4 or v5 (D395) and is now v3.4's too
(D555; §9).

Serves P1, the Curious Improviser, between sessions: G1, "get to know the possibilities rather
than study theory" ([personas](../../personas.md#p1--the-curious-improviser-primary-d48); D549).
A player who meets a word in the controls, a preset or the review (Leapiness, Figure level,
enclosure) can look it up without leaving the app or going online. P2 and P3 use it the same way;
no new persona goal.

Plain words used here:

- **The lexicon**: [`docs/music/lexicon.md`](../../../docs/music/lexicon.md), the project's one list
  of music words, written for a reader with no music theory.
- **Entry**: one word in the lexicon, with its fields (below).
- **The page**: the lexicon page this draft specifies.
- **The design**: `ux-writer`'s design of the page in `ui_ux/` (the screen and the "look up a
  word" flow; ux D487), validated by the owner on 2026-11-22 (D549). Layout, the letter row,
  focus order and the states are there, not here.

## 1. In the owner's words

Recorded 2026-10-21 (D393): "shape a side project that shouldn't be too onerous: we have a lexicon
that sits mostly idle here, have a side page to our app reference all words in there, it must
allow alphabetical exploration, simple search. Note it must use existing md files and not
duplicate information. That's for step one (include it in 3.4). For later (v4 or v5 depending on
how they goes) we will turn this in a proper API."

On 2026-11-22, after `ux-writer`'s design and its proposed answers (D548): "OK i validate lexicon
view." (D549)

## 2. Settled

- **A side page in the app lists the lexicon's entries** (D393), with:
  - **alphabetical exploration:** the letters A to Z, each listing its words;
  - **a simple search** over the words (§4).
- **It is part of v3.4** (D393). That makes v3.4's first player-facing item: D389's "no
  player-facing behaviour" now describes the structural review only. v3.4 is tagged `3.4.0`
  (D550).
- **One source: the lexicon file** (D394). The page reads `docs/music/lexicon.md` and nothing
  else. No hand-copied list, no second list, and no generated file committed to the repository.
  An edit to the lexicon shows on the page at the next build with no other change, and a check
  proves it (§5).
- **What the code already requires** (D393, from the code read on 2026-10-21, §6):
  - it is **lazy-loaded**: none of its code or text goes into the entry chunk (300 KiB budget,
    D359), beyond the few bytes of the button that opens it;
  - it **works offline**, like the rest of the app;
  - it uses **only the classes and tokens in `src/styles/`**;
  - it can be **used with the keyboard alone**, and the search field has a visible label.
- **The page's behaviour** (§4) and **how its text reaches it** (§5, first two items) (D549).
- **Out of step one** (D393): editing entries; word popups inside the app's other screens (not
  built today, §3); the API, which is step two, in v3.4 too (D555, §9).
- **Step two, the lexicon API, is part of v3.4** (D555), after the page (§9).

## 3. What the lexicon holds today

Read 2026-11-22 (lexicon v1.8). Facts, not decisions.

- **334 entries** in 12 themed groups (Basics, Pitch and notation, Rhythm and meter, Melody,
  Harmony, Scales and modes, Styles, Style and identity, Texture and arranging, Instruments and
  transposition, App controls, Internal). The entries are alphabetical inside each group only, so
  an A–Z view needs one sort over all of them.
- **16 entries sit under "Internal (no popup)"**, which the lexicon says are "never shown in the
  UI"; the page shows the other **318** (§4). 59 `related` links in 51 shown entries point to an
  Internal entry (Phrase's links to Gesture and answer and Open ending among them).
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
  and once as the app control (`contour` and `control-contour`, and so on). The page tells them
  apart (§4).
- **No word starts with U, X, Y or Z**; Q has five. One word has an accent: "Compás".
- **Formatting inside the fields is light**: a few code marks (backticks) and some emphasis; no
  links inside entries.
- **Some app meanings are written for developers too**: 59 cite spec decisions ("spec decision
  D214"), about 45 describe something planned or not built, a few name code files. Eight are
  single paragraphs over 1,200 characters (Vary settings, Doodle, Jam, Key and mode suggestion,
  Drift, Allowed rhythm changes, Rhythm lock, Starting note). The page shows them as written (§4).
- **Size:** the file is 345 KB; the fields the page shows, Internal entries left out, came to
  about 297 KB on v1.7 (§5).
- **The lexicon already expects to be read by the app:** its "How to use" calls entries "meant to
  be parsed", with the popup as hover text (the "v2 plan"). Nothing in the app reads it yet, and
  no word popups are built.

## 4. The page (D549)

The behaviour the design supports. Settled by the owner's validation of the design and of
`ux-writer`'s answers to O239–O244 and O246 (D549).

- **The entries shown:** every entry outside the Internal group (318 on lexicon v1.8); the page
  states how many it holds. A related link to an Internal entry is left out.
- **What one entry shows:**
  - always: the word, its group as a small label (on every entry), the popup line as the first
    thing read, and its other names with it ("also called"), so a word found by another name
    shows why;
  - behind a "More" control on the entry, opened in place: the definition; the app meaning
    under a plain heading, "In Infinite Flow", when the entry has one; the related words as links
    that move to those entries on the page;
  - not shown: the `sources`; the `id` serves only as the entry's address on the page.
- **Text as written:** every field shows the lexicon's words as written, app meanings included,
  with no rewording and no part hidden by a rule. A line that reads badly is reworded in the
  lexicon itself, and the next build shows it (D394).
- **The four doubled words:** in a related link, a doubled word is named with its group, "Tempo
  (App controls)"; two entries with the same word sort in the lexicon's group order, so the music
  word comes first. A word that becomes doubled later needs no extra text.
- **A–Z:** one sort over every shown entry, ignoring case and accents ("Compás" sorts under C). A
  letter with no word (U, X, Y, Z today) is shown but cannot be chosen. Each entry is reachable
  by its `id`, which is stable, unlike the heading.
- **Search:**
  - it matches the word and its other names, anywhere in them, ignoring case, accents, hyphens
    and apostrophes ("compas" finds Compás, "semitone" finds Half step);
  - matches are ranked: the word equal to the query, then another name equal to it, then the
    word starting with it, then a word inside starting with it, then anywhere;
  - results update as the player types; exactly one match opens; an empty result says so;
    clearing the search returns to A–Z;
  - **"Mentioned in other words":** from three characters on, a separate group under the matches
    lists the entries whose popup line has a word starting with the query;
  - the definition and the app meaning are never searched.
- **Opening and closing:** a "Lexicon" button in the footer, after "Your data", opens a
  full-window page built from the sheet parts, loaded at its first use. "Close" or Escape closes
  it and gives the focus back to the button. It cannot be opened while a session runs (count-in
  included), and a MIDI note starts nothing while it is open. The page changes no setting and
  saves nothing on the device.
- **The browser's Back button:** while the page is open, it holds one entry in the browser's
  history, with the address `#lexicon`; Back closes the page as "Close" does, and "Close" and
  Escape step back over that entry. Jumps to a letter or a related word inside the page add no
  history entry. Opening the app at `#lexicon` opens the workspace, then the page. This is the
  app's first use of the address bar and the browser's history (§6).

## 5. The single source (D394)

- **How the text reaches the page** (D549): a small build step, a Vite plugin, reads
  `docs/music/lexicon.md` at build time, parses its entries, and hands the page the fields it
  shows as a module that exists only in the build. Nothing is written into `src/` or committed.
  The rejected alternative, importing the raw file (`?raw`) and parsing it in the browser, ships
  the whole file, Internal entries and sources included.
- **What the parser hands the page** (D549): the shown entries only, each with the fields §4
  shows plus its group's name and its group's place in the lexicon's order (for the label, the
  doubled-word qualifier and the tie order). Whether a word is doubled is worked out on the page.
  The search reads only the words, their other names and the popup lines, so no full-text index
  ships.
- **Its size** (D549): the parsed text goes into a file of its own with a named budget of
  448 KiB, room for the lexicon to grow by half; any other file keeps the 100 KiB limit. The
  owner accepts the extra download, about 300 KB, roughly 85–90 KB compressed, which the service
  worker fetches for every visitor at install or update, page opened or not. The structural
  review counts it with the rest (its Q2).
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
- **Reuse by the API** (D559): the parser is a plain module with no Vite or browser code in it
  (text in, entries out), so the API of step two (§9) reuses it as it is.

## 6. What the code says (blast radius, 2026-10-21)

Read on branch `v3.1-release` at 56aea52, through `codebase-explorer`. To be read again against
`main` before the build plan's **Files** lines are written: v3.2 and v3.3 came after it.

- **No router and no second page.** `App.vue` renders `WorkspaceShell.vue` only; there is no
  `vue-router`, no `pushState` and no hash routing. The sheets (connection, my instrument, presets,
  Your data, confirmation) are modal dialogs opened beside the workspace; the review is a mode
  inside it. The page is a full-window view on the sheet pattern (D549); its `#lexicon` history
  entry is the app's first, which makes it an architecture capture at the build.
- **The sheet pattern** (`src/components/workspace/use-your-data.ts`): `open()` loads the sheet's
  code by `import()` once, keeps it, and is refused while a session runs; `close()` hides it and
  the sheet gives the focus back. The page follows it.
- **Where the button fits:** `LayoutFooter.vue` holds only the "kept on this device only" note and
  the Your data button. The header is full.
- **No network in `src/`.** `npm run verify:boundaries` (`scripts/verify-boundaries.mjs`) forbids
  `fetch(` in `src/`, so the page cannot download the lexicon while running: its text has to be
  in a built JavaScript file.
- **Offline.** The service worker precaches every `js`, `css` and font file (`vite.config.ts`,
  `globPatterns`), and `verify:boundaries` fails if one is missing. A new lazy file is therefore
  offline with no extra work, and **every visitor's browser downloads it when the app installs or
  updates, whether or not the page is ever opened** (accepted, D549).
- **Size budgets** (`verify-boundaries.mjs`): entry 300 KiB, generation worker 150 KiB, VexFlow
  engraver 800 KiB, **any other file 100 KiB**. The lexicon's shown text is about three times
  that, hence its own named budget (§5). Its file name must not start with `index-`, or it is
  judged as the entry chunk.
- **Styles.** `src/styles/` holds `theme.css` (the tokens) and `components.css`, both
  `ux-writer`'s; the rule that styling lives there is written in `README.md` and `ui_ux/README.md`,
  not checked by a tool. The design adds no token; its classes are the page's own.
- **Tests.** Unit tests in `tests/unit/` (Vitest); end-to-end tests in `tests/e2e/` (Playwright,
  Chromium), where a new spec file must be added to the `test:e2e` list in `package.json`;
  accessibility checks in `tests/e2e/accessibility.spec.ts`; offline in
  `tests/e2e/release/offline-and-fonts.spec.ts`.
- **Nothing reads the lexicon today**; no Markdown is imported anywhere; no Markdown parser is a
  dependency (the format is regular enough that a small parser of its own needs none, proposed;
  D547 adds no runtime dependency besides Tone.js).
- **Declared intent:** no atom covers the lexicon. `req_browser_only_first_release` (everything
  runs in the browser, no server) holds for the page.

## 7. Out of scope for step one

- Editing entries in the app.
- Word popups or links from other screens to the page (not built; the parser makes them cheap
  later).
- The API: step two, specified in §9 (D555).
- Browsing by group (the twelve themes); a later step if wanted.
- An address for one entry or for a search: the page has one address, `#lexicon` (D549).
- Searching the definitions and the app meanings (D549).

## 8. Its place in v3.4 and who does what

- **Independent of the structural review**: it neither waits on the analysis nor feeds it,
  except that the analysis measures the app with the page in it, the new budget included (D558).
  The design touches nothing outside the page but the footer's button.
- **Order** (D558): the page and the API are their own small part of v3.4; the analysis's
  measurement pass runs once the page is built, so the page is measured with the app in it. The
  lexicon pass (§10) comes before the page's build.
- **A release:** v3.4 is tagged `3.4.0` (D550).
- **`spec-writer`**: a short master spec part for the page (Part E of the
  [v3 master spec](master-spec.md), proposed) covering both steps, for approval (the owner's,
  or the wave driver's under D556); then the page's and the API's part of the v3.4 build plan.
- **`ux-writer`**: the design, validated by the owner (D549), moved from its draft into the
  `ui_ux/` root with v3.4's change marks: the page's screen, the "look up a word" flow and the
  footer's button. Any new class goes into `components.css`. `ux-critic` validates it there
  before the build's design gate clears (proposed).
- **`documentalist`**: one small BUSINESS atom (the player can look up every shown lexicon word,
  A–Z and by search, offline) and ARCHITECTURE atoms for the single-source rule (D394) and the
  page's `#lexicon` history entry, captured at the wave's preflight (proposed). The parser's
  tests, the size budget and the build step are tooling and get no atom (the project's ATD scope:
  business behaviour only).
- **Coding** (`coding-leader`, chunk mode), two chunks run one after the other (proposed):
  1. the parser, the build step, the named budget, the single-source checks (§5);
  2. the page, the footer button, the `#lexicon` history entry, the end-to-end test (A–Z,
     search, Back, keyboard, axe, offline).

  Step two adds its own chunk (§9, D559), after chunk 1, whose parser it reuses; it does not need
  the page.

**Definition of done** (proposed): every lexicon entry outside the Internal group is on the page,
under its letter and found by search; a lexicon edit shows at the next build with no other
change, and the check proves it; the entry chunk grows only by the button; the page works offline
and with the keyboard alone, and Back closes it; `npm run quality` and the end-to-end tests pass;
the owner has seen the page.

## 9. Step two: the lexicon API (D555)

- **In the owner's words** (2026-10-21, D395): "For later (v4 or v5 depending on how they goes) we
  will turn this in a proper API." On 2026-11-22: "lexicon is for this version": the API moves
  into v3.4, beside the page (D555).
- **Settled:** it is part of v3.4 (D555); its source is the lexicon file alone, as for the page
  (D394); it adds no runtime dependency (D547).
- **What it is** (D559, the wave driver's ruling under D556, standing unless the structural
  review's report finds a reason against it):
  - a plain TypeScript module: the page's build-time parser (§5), reused as it is, and a typed
    read interface over the parsed entries, so the page and the API read the lexicon the same way
    and no second parser exists;
  - no server and no network: the browser-only rule (`req_browser_only_first_release`) and
    "nothing is sent" hold as they are;
  - shaped so that a backend can serve it later without its callers changing (D561): callers use
    only the typed read interface, and the API module itself makes no browser-only assumption
    (no DOM, no browser storage, no Vite-only import inside it);
  - its first caller is this app: the page, and the word popups when they are built (§7);
  - its read interface is describable as a language-neutral contract: the parsed entry's shape
    written down as plain data (a JSON schema or a plain data format), so that a service in
    another language could serve the same data later (D561). The parser stays TypeScript.
- **Where it lives** once the three-way split is built, in the library's repository or in this
  app's, follows the [structural review](structural-review.md#q4-should-the-app-split-into-several-libraries-or-packages)'s
  split recommendation (O315). Until then it lives in this repository.
- **A lexicon backend, some day** (D561, a direction, not scheduled): the owner: "we will need to
  have a backend at some point anyway", and "currently, the backend is only for lexicon which
  doesn't contains any user information so that's super ok." Such a backend would send nothing
  about the player, and the owner sees no privacy concern with it. It would still be the app's
  first network request, which the browser-only rule and `verify:boundaries` (no `fetch(` in
  `src/`) forbid today: their wording is revised when a backend is specced, not now (O316). When
  it is, the owner prefers Go to a JavaScript runtime: "i'm usually more of a go team than
  whateverjs for the backend." Not a v3.4 build item.

## 10. The lexicon pass (D560)

Both edits are taken (D560, the wave driver's ruling under D556): a docs-only pass on the lexicon
inside v3.4, before the page's build, made by the lexicon's owners as they decide between them
(`documentalist`, `ux-writer`). The page then shows it with no code change (D394). Not started.

- **Player-worthy words in the Internal group:** Gesture and answer, Open ending, Recovery,
  Register window and Signature figure are words a curious player would like. Moving one out of
  the Internal group, with its popup line rewritten for a player, puts it on the page.
- **The eight longest app meanings** (§3): split or shorten them so they read less like walls of
  text.

## 11. Open

O315 (where the API lives once the split is built), in the
[register](../../open-questions.md#v34-lexicon-page-o239). After v3.4: O316 (the lexicon
backend).
