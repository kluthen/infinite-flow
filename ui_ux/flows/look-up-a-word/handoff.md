# Look Up a Word Handoff

> **New in v3.4.**

The page itself, its entries, its search and its keys, are in
[`screens/lexicon-page/handoff.md`](../../screens/lexicon-page/handoff.md).

## Flow

```mermaid
flowchart TD
  W["phrase-workspace, idle or review mode: footer Lexicon enabled"]
  S["phrase-workspace, session running or count-in: footer Lexicon disabled"]
  L{"First opening in this visit?"}
  LD["Lexicon is-loading; workspace usable"]
  F["app-notice-row: the lexicon's load-failure notice; focus on Try again"]
  P["lexicon-page: Browsing, or as left earlier in the visit"]
  Q["lexicon-page: Searching / No match"]
  E["lexicon-page: an entry opened, focus on its word"]
  W -->|"Lexicon"| L
  L -->|"yes"| LD
  L -->|"no"| P
  LD -->|"loaded"| P
  LD -->|"failed"| F
  LD -->|"a session started meanwhile"| S
  F -->|"Try again"| L
  P -->|"types in Find a word"| Q
  Q -->|"empties the field, or chooses a letter"| P
  P -->|"a letter"| P
  P -->|"More / a related word"| E
  Q -->|"More / a related word"| E
  E -->|"a letter, or types"| P
  P -->|"Close, Escape, or Back"| W
  Q -->|"Close, or Back; Escape empties the field first"| W
  E -->|"Close, Escape, or Back"| W
  S -.->|"no opening during a session"| S
```

## Routing Rules

- **Opening.** The footer's `Lexicon` opens the page from the workspace at idle, in either mode,
  or in the review mode, with or without a sheet having been open before; never during a session,
  count-in included, where it is disabled.
- **Loading once.** The page's part of the app loads at the first opening of a visit and stays
  loaded; later openings show the page at once, as it was left.
- **A session during the load.** A session that starts while the page is loading (by `Start
  session` or the starting note) cancels the opening; the page does not open when the load ends.
- **Load failure.** A failed load opens nothing and shows the lexicon's load-failure notice in
  `app-notice-row`, whose `Try again` is a press of `Lexicon`.
- **Closing.** `Close`, or Escape outside a search field holding text, closes the page and
  returns focus to the footer's `Lexicon`. The workspace is as it was: the page changes no
  setting, no phrase and no kept data.
- **The browser's Back button.** The page has one history entry of its own, with the address
  `#lexicon`, and no other. Back closes the page as `Close` does.
  - **Its entry.** Every opening adds that entry, marked as the page's own, on top of the
    workspace's bare address, so Back from the page always lands on the workspace and never
    leaves the app.
  - **Closing by `Close` or Escape.** Closing steps back over the page's entry, so the
    browser's history holds no lexicon visit and Back next goes where it would have before the
    page opened.
  - **Forward.** After the page closed, Forward onto its entry opens the page on that entry, as
    the footer's `Lexicon` would but adding no entry. Wherever the footer's `Lexicon` is
    disabled (a session, count-in included), Forward onto it opens nothing and the address is
    replaced with the bare one.
  - **A load at `#lexicon`.** A load or reload at `#lexicon` replaces the address with the bare
    one, opens the workspace, then, once the saved settings are read, opens the page as a press
    of `Lexicon` does, adding its entry.
  - **Jumps inside the page.** A letter or a related word moves within the page without
    navigating: its link's own navigation is cancelled, so it adds no history entry and leaves
    the address at `#lexicon`. Its `href` stays, so it is still a link to assistive technology.
- **No MIDI start.** While the page is open, a MIDI note starts nothing: the page counts as an
  open sheet for the starting note, whose line under the staff is hidden, as under a sheet, and
  comes back as it was once the page is closed.
- **Nothing kept.** Opening, searching and reading save nothing on the device; the page's state
  lasts for the visit only.
