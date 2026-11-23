# Lexicon Page Handoff

> **New in v3.4.**

Why the page is shaped this way is in [`intent.md`](intent.md); how it opens and closes, and what
the browser's Back button does, in
[`flows/look-up-a-word/handoff.md`](../../flows/look-up-a-word/handoff.md). The page shows the
entries of [`docs/music/lexicon.md`](../../../docs/music/lexicon.md) and nothing else: no
text below is a copy of an entry, and every entry's words come from that file at build time.

## Layout Tree

```text
lexicon-view (role="dialog" aria-modal="true" aria-labelledby="lexicon-title"; new class;
              covers the whole viewport at --z-sheet; the workspace beneath is inert)
  lexicon-bar (new class; stays at the top while lexicon-body scrolls under it)
    lexicon-bar-row (new class; one row that wraps)
      sheet-title lexicon-title (h2, id="lexicon-title", tabindex="-1"; "Lexicon")
      sheet-hint (p; "{n} words")
      lexicon-search (role="search"; new class)
        field-label (label for the field; "Find a word")
        text-input (input type="search", autocomplete="off", spellcheck="false")
      btn lexicon-letters-button (Letters; below bp-tablet-landscape only; new class)
      sheet-close (btn, "Close")
    nav lexicon-letters (aria-label="Letters"; new class)
      ul
        li (one per letter A to Z, in order; "#" first only when a word starts with no letter)
          a lexicon-letter (a letter with words: href to its letter heading)
          span lexicon-letter is-empty (a letter with none: plain text, not focusable)
  lexicon-body (new class; the reading column, centred)
    p sheet-hint (intro)
    -- Browsing (the search field is empty)
    section lexicon-section (one per letter with words; aria-labelledby its heading)
      h3 lexicon-letter-heading (id="lexicon-letter-{a}", tabindex="-1"; the letter)
      ul lexicon-list (new class; no markers)
        li lexicon-entry (id="lexicon-{entry id}"; new class)
          lexicon-entry-head
            h4 lexicon-word (tabindex="-1"; the word as the lexicon heads it)
            span lexicon-group (the entry's group)
          p lexicon-popup (the plain line)
          p sheet-hint (Also called …; absent when the entry has no other names)
          details lexicon-more
            summary ("More" or "Less"; accessible name "More about {word}")
            lexicon-detail
              p (the definition)
              h5 ("In Infinite Flow") + p (the app meaning; both absent when the entry has none)
              p lexicon-related ("Related: " then lexicon-link a, …; absent when none is shown)
    -- Searching (the search field holds text)
    p lexicon-result-count (role="status")
    ul lexicon-list (the matches, best first; each li a lexicon-entry as above)
    section lexicon-mentions (from three characters; absent when it would be empty)
      h3 ("Mentioned in other words"), p sheet-hint, ul lexicon-list
    lexicon-empty (no match; new class)
      p, p sheet-hint, btn ("Clear search")
```

- **New classes.** `lexicon-view`, `lexicon-title`, `lexicon-bar`, `lexicon-bar-row`, `lexicon-search`,
  `lexicon-letters-button`, `lexicon-letters`, `lexicon-letter` with its `is-empty` state,
  `lexicon-body`, `lexicon-section`,
  `lexicon-letter-heading`, `lexicon-list`, `lexicon-entry`, `lexicon-entry-head`,
  `lexicon-word`, `lexicon-group`, `lexicon-popup`, `lexicon-more`, `lexicon-detail`,
  `lexicon-related`, `lexicon-link`, `lexicon-result-count`, `lexicon-mentions` and
  `lexicon-empty` are the page's own. Each is specified below from existing tokens only (the page
  needs no new token), and is added to `src/styles/components.css` at v3.4's token-source pass,
  before the page is built.
- **Reused classes.** `sheet-title`, `sheet-hint`, `sheet-close`, `btn`, `field-label`,
  `text-input` and `app-notice` keep their own rules and states.

## Components and Content

- **The view.** `lexicon-view` is a full-viewport surface on `--color-canvas`, above the
  workspace at `--z-sheet`, with no backdrop and no scrim: it reads as a page, not a box. It
  scrolls vertically inside itself, never horizontally. The workspace beneath is `inert` and
  hidden from the accessibility tree while it shows.
- **The bar.** `lexicon-bar` is a `--color-surface` band across the view's full width, with a
  `--color-border` hairline under it and `--spacing-3` padding, that stays at the top while the
  body scrolls under it. Its rows are `--spacing-2` apart.
- **Title row.** `lexicon-bar-row` holds, in this order, `sheet-title` "Lexicon", the count
  `sheet-hint` "{n} words" ("1 word" for one), `lexicon-search`, `Letters` below
  `bp-tablet-landscape` only, then `Close`, at the inline end. The search field takes the space
  left, never less than `--control-group-min-inline-size`; the field in it grows up to
  `--text-input-max-inline-size`. The row is one line from `bp-mobile-landscape` up; below it, it
  takes two lines, the title, the count and `Close` on the first, `Close` at its end, the search
  and `Letters` on the second.
- **Search field.** `lexicon-search` is a `field-label` "Find a word" and a `text-input` of
  type `search`, the label before the field on one line. The field has no placeholder: the label
  says what it is for, and the intro says what to type. Chrome's own clear button in the field
  is kept.
- **Letter row.** `lexicon-letters` is a `nav` labelled "Letters" holding one item per letter,
  A to Z, in one row that wraps, `--spacing-1` apart. A letter with words is an `a`
  `lexicon-letter`: a square at least `btn`'s minimum target, the accessibility floor's, in
  `--font-ui` at `--text-md`, bold and underlined, `--radius-sm`, in `--color-accent` with no
  border; hover gives it `--color-surface-muted`, `:focus-visible` the `--shadow-focus` ring,
  active `--color-accent-hover`. A letter with no word is a `span` `lexicon-letter is-empty`: the
  same square, in `--color-text-muted`, regular weight and not underlined, not a link and never
  focusable. The weight and the underline, not the colour alone, tell the two apart (the two
  colours are close in lightness). A `#` item comes first only when some
  word starts with no letter (none does today).
- **Intro.** The body opens with a `sheet-hint` paragraph: "The music words and the controls
  Infinite Flow uses, each in plain words. Choose a letter, or type part of a word in Find a
  word." It stays in both browsing and searching.
- **Reading column.** `lexicon-body` is centred, its text at most `--sheet-wide-max-inline-size`
  wide (a comfortable reading line at `--text-md`), with `--spacing-4` padding on each side and
  at its top, and `--spacing-6` at its end. Its blocks (the intro, then the letter sections; or
  the matches, `lexicon-empty` and `lexicon-mentions`) are `--spacing-6` apart.
- **Letter section.** `lexicon-section` opens with `lexicon-letter-heading`, the letter in
  `--font-display` at `--text-2xl`, with a `--color-border` hairline under it; its entries
  follow `--spacing-3` below it, `--spacing-5` apart, each but the first with a hairline above it
  and `--spacing-5` between that hairline and its head.

### One entry

- **Head.** `lexicon-entry-head` is one row that wraps: `lexicon-word`, the entry's heading word
  exactly as the lexicon writes it, in `--font-display` at `--text-lg`, then `lexicon-group`, the
  entry's group exactly as the lexicon names it ("Harmony", "App controls"), in `--text-sm`,
  `--color-text-muted`, on the word's baseline.
- **Plain line.** `lexicon-popup` is the entry's popup line, at `--text-md` in `--color-text`:
  always shown, the first thing read under the word.
- **Other names.** A `sheet-hint` "Also called {names}." lists the entry's other names, in the
  lexicon's order, separated by commas; absent when the entry has none.
- **More.** `details lexicon-more` closed by default; its `summary` reads "More", and "Less"
  while open, with Chrome's own disclosure marker, at `btn`'s minimum target height, in
  `--color-accent`; hover `--color-accent-hover`, `:focus-visible` the `--shadow-focus` ring,
  active as hover; its accessible name is "More about {word}" ("Less about {word}" open). Each
  entry opens and closes on its own; several may be open at once.
- **Detail.** Inside `lexicon-detail`, `--spacing-3` apart: the definition as one paragraph;
  then, when the entry has an app meaning, an `h5` "In Infinite Flow" (`--text-md`, bold) and the
  app meaning as one paragraph; then `lexicon-related`.
- **Related words.** `lexicon-related` reads "Related: " followed by one `lexicon-link` per
  related entry shown on the page, in the lexicon's order, separated by commas. A link's text is
  the related entry's word, with its qualifier when the word is doubled (below). A related id
  whose entry is not shown on the page is left out with no gap; when none is left, the line is
  absent.
- **Text link.** `lexicon-link` is an inline `a` in `--color-accent`, underlined; hover
  `--color-accent-hover`; `:focus-visible` the `--shadow-focus` ring; active as hover. Its href
  points to the entry's own id on the page.
- **Focus targets.** `lexicon-title` (the page's `sheet-title`, which is never a focus target
  elsewhere), `lexicon-letter-heading` and `lexicon-word` take focus only
  from the page (`tabindex="-1"`), never from Tab. Under `:focus-visible` each shows the
  `--shadow-focus` ring with `--radius-sm` and no outline, as `review-title` does; no other
  highlight. Each lexicon class's states are those stated in its item; a class with none named
  is layout only.

### Doubled words

- **Qualifier.** A word that heads more than one shown entry (today Contour, Register,
  Syncopation and Tempo, each once as the music word and once as the app control) is named with
  its group in parentheses wherever it is named apart from its own head. Today that is only a
  related link: "Tempo (App controls)", "Tempo (Rhythm and meter)". The qualifier is the group's
  name as the lexicon writes it, so a new doubled word needs no copy of its own.
- **Order.** Two entries with the same word sort in the lexicon's group order, so the music word
  comes before the app control today.
- **Head.** The entry head needs no qualifier: its `lexicon-group` already says which one it is.

## What the Page Shows of the Lexicon

- **The entries shown.** Every entry outside the lexicon's Internal group, the one the lexicon
  says is never shown in the interface. The count in the bar counts exactly these. An entry the
  lexicon moves out of the Internal group shows at the next build, with nothing else to change.
- **Fields shown.** The word, the group, the popup line, the other names, the definition, the app
  meaning and the related words. The `id` is used only as the entry's address on the page; the
  `sources` are not shown.
- **Text as written.** Every field shows its words as the lexicon writes them, app meanings
  included, with no rewording and no part hidden by a rule (an app meaning
  that reads as written for developers is reworded in the lexicon itself, and the next build
  shows it).
- **Inline marks.** `**bold**` shows as bold and `_emphasis_` as italic; a `` `code` `` mark shows
  its words as plain text, the marks dropped; any other Markdown shows as written.
- **Sorting.** One A–Z order over every shown entry, by the word, ignoring case and accents
  ("Compás" sorts under C, among the Cs), with doubled words by the rule above. A word sorts under
  the letter its first character reduces to with its accent removed.

## How Search Works

- **What it matches.** The word and each of its other names. A query matches when its text
  appears anywhere in them, ignoring case and accents, with hyphens, apostrophes and repeated
  spaces counted as one space: "compas" finds Compás, "semitone" finds Half step, "b flat" finds
  B-flat instrument.
- **When it runs.** On every change to the field, from the first character, with no wait and no
  submit: the page holds every entry, so a search is instant.
- **Order of the matches.** Best first, in five tiers, A–Z inside each: the word equals the
  query; another name equals it; the word starts with it; a word inside the word or another name
  starts with it ("step" finds Half step and Whole step); it appears anywhere else.
- **One match.** When exactly one entry matches, it opens, so its detail shows with no further
  press.
- **The match shown.** Each match is a full `lexicon-entry`, closed, as in browsing; a match found
  by another name shows that name first in its "Also called" line, in bold.
- **Result count.** `lexicon-result-count` (`role="status"`, polite) reads "{n} words match
  “{query}”." ("1 word matches …"). It is written once the typing pauses for half a second, so a
  screen reader is not read every keystroke; the list itself follows every keystroke. It is
  visually hidden, as the workspace's generation status is: the list shows the matches, and the
  no-match state shows its own sentence.
- **Mentioned in other words.** From three characters on,
  `lexicon-mentions` lists below the matches every other entry whose popup line contains the
  query as the start of a word, under the `h3` "Mentioned in other words" (`--font-display` at
  `--text-xl`) and the `sheet-hint` "Their name doesn't contain “{query}”, but their short line
  does.", with a `--color-border` hairline above the group. Absent when it would be empty. The
  definition and the app meaning are never searched.
- **Leaving the search.** Emptying the field, by Chrome's clear button, by Escape in the field,
  or by deleting its text, returns to browsing at the top of the list.
- **A letter while searching.** The letter row stays usable while searching: choosing a letter
  empties the field and moves to that letter, so a letter always means "browse from here".

## Moving Around the Page

- **To a letter.** Choosing a letter jumps, with no smooth scroll, so its heading sits just under
  the bar, and moves focus to the heading.
- **To a related word.** Following a related link empties the search field if it holds text,
  jumps to the related entry so its head sits just under the bar, opens its detail, and moves
  focus to its word. The entry left stays open. No smooth scroll; no highlight beyond the focus
  ring.
- **No navigation.** A letter or a related link moves within the page: its link's own navigation
  is cancelled, so the address stays `#lexicon` and no history entry is added
  (`flows/look-up-a-word/handoff.md`, Routing Rules: The browser's Back button).
- **Below the bar.** Every jump target, and every element focused by Tab, keeps clear of the
  part of the bar that stays at the top at its current height (one or two letter rows), with
  `--spacing-3` to spare, so no heading lands hidden under it. The page measures that part
  (`lexicon-bar`, or `lexicon-bar-row` below `bp-tablet-landscape`) and keeps its height on
  `lexicon-view` as `--lexicon-bar-block-size`, which the view's scroll padding reads.
- **The browser's find.** Chrome's own find in page searches the whole page, closed details
  included, and opens the one holding a found word: no extra behaviour is designed for it.

## Focus and Keyboard

- **Opener.** The footer's `Lexicon` button (`screens/phrase-workspace/`), disabled during a
  session as `Your data` is.
- **On open.** With a fine pointer (a mouse or a trackpad), focus goes to the search field, so
  the player can type at once. With a coarse pointer only (a touch screen), it goes to
  `lexicon-title`, so no on-screen keyboard covers half the page before the player asks for it.
- **Trap.** Tab and Shift+Tab stay inside the view, in this order, which is also the visual
  order: the search field, `Letters` when shown, `Close`, each letter with words, then the body:
  each entry's `More` and, in an open entry, its related links, in reading order; `Clear search`
  in the no-match state. Below `bp-mobile-landscape`, where `Close` sits on the line above the
  search, the order stays the same.
- **Letters.** Each letter with words is one tab stop, as a link; Enter follows it. A letter
  with no word is skipped.
- **More.** Enter or Space opens or closes the entry, focus staying on it.
- **Escape.** In the search field holding text, Escape empties it (and stays). Anywhere else,
  Escape closes the page.
- **On close.** By `Close`, Escape or the browser's Back button: focus returns to the footer's
  `Lexicon` button. Closed while the viewport is portrait-shaped below `bp-desktop`, focus stays
  on the page, as after a portrait end, since `orientation-notice` holds nothing to focus.
- **MIDI.** While the page is open, no MIDI note starts a session, a count-in or a Jam.

## Responsive Behavior

- **Desktop.** At `bp-desktop`: the title row is one line; the 26 letters fit one row under it.
- **Tablet landscape.** At `bp-tablet-landscape`, below `bp-desktop`: the title row is one line;
  the letters wrap onto a second row when the width cannot hold 26 targets, the first row
  holding as many as fit. The bar stays at the top as at `bp-desktop`.
- **Mobile landscape.** At `bp-mobile-landscape`, below `bp-tablet-landscape`: only the title
  row stays at the top, holding `sheet-title`, the count, the search field, `Letters` and
  `Close` on one line; the letter row sits at the head of the page, above the intro, and scrolls
  away with the words. `Letters` (a plain `btn`) jumps back to the letter row and moves focus to
  its first letter with words. The reading column takes the full width less its padding.
- **Every breakpoint.** At every breakpoint: one reading column, never two; long words and long
  app meanings wrap; the view scrolls vertically only; the letter targets keep `btn`'s minimum target.
- **Portrait.** The page works in any orientation: it is reading, not playing, so the portrait
  guard that replaces the workspace does not replace it.
- **Visual values and animation.** Every visual value comes from the token source; this handoff
  declares none of its own. The view opens and closes with the sheet's fade
  (`--duration-feedback`, `--ease-out-fast`, reduced under `prefers-reduced-motion` as every
  fade); jumps never scroll smoothly; opening an entry has no animation.

## States

- **Closed:** the footer's `Lexicon` button is shown, enabled outside a session.
- **Loading:** the first opening in a visit loads the page's part of the app. The `Lexicon`
  button takes `is-loading` and `aria-busy="true"` until it has loaded; everything else stays
  usable, and the page opens once it has. A session started meanwhile cancels the opening: the
  page never opens over a session.
- **Load failure:** the page's part of the app did not load. Nothing opens; `app-notice-row`
  shows an `app-notice`: "The lexicon couldn't open because part of the app didn't load. Check
  that you're online, then try again.", with `Try again` (a press of `Lexicon`) and `Dismiss`;
  focus moves to `Try again`, as Jam's load failure does. The notice leaves when the page opens
  or on `Dismiss`; like every notice it is held still during a session, and it is never
  error-toned.
- **Browsing:** the search field is empty; every shown entry is listed under its letter.
- **Searching:** the field holds text; the matches replace the letter sections.
- **No match:** the field holds text and nothing matches. In place of the list,
  `lexicon-empty`: "No word matches “{query}”." then the `sheet-hint` "Check the spelling, or
  type only the first letters of the word." then `Clear search` (a plain `btn`), which empties
  the field and puts focus in it. The result count reads the first sentence. When the
  "Mentioned in other words" group finds entries, the group follows this state's
  sentences.
- **Reopened in the same visit:** the page comes back as it was left: the same search, the same
  open entries, the same scroll position. A reload starts it fresh. Nothing about the page is
  saved on the device.
- **Session running:** the page cannot open; the `Lexicon` button is disabled, as `Your data`
  is. No session can start while the page is open.
- **Empty:** never. A lexicon with no shown entry, or a malformed one, fails the build, so the
  page always has words.
- **Offline:** the page works offline, its words being part of the app's own files.
