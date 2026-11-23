---
id: req_lexicon_page
status: REVIEW
parents:
  - [[user_story_controlled_phrase_generation]]
type: REQUIREMENT
version: 0.1
tags: [v3, release-v3.4, lexicon, workspace]
dependents:
  - [[api_lexicon_read_contract]]
  - [[module_lexicon_page_history_entry]]
  - [[module_lexicon_single_source]]
layer: BUSINESS
priority: 1
human_name: The Lexicon Page
---

# The Lexicon Page

## INTENT
Let the player look up, inside the app and between sessions, every music word the project's lexicon holds for the player, in plain words, A to Z and by search, offline.

## THE RULE / LOGIC
From v3.4, a Lexicon button in the footer, after Your data, opens a full-window lexicon page over the workspace. The page shows every shown entry of the project's lexicon, its one list of music words written for a reader with no music theory, that is every entry outside its Internal group, whose project terms are never meant for the player, and nothing else: no list of words is kept anywhere but that file, and an edit to it shows on the page at the next build with no other change. The page says how many words it holds.

Each entry shows its word, its group's name, its plain line first and its other names; behind a More control, opened in place and several at once if the player likes, its definition, what it means in this app under the heading "In Infinite Flow" when it has such a meaning, and its related words, as links that move to those entries on the page. Every field shows the lexicon's words as written, never reworded or shortened by the app; the lexicon's sources are never shown.

The player browses A to Z, one order over every shown word ignoring case and accents, through a row of the letters A to Z in which a letter with no word is shown but cannot be chosen; or searches by typing: the search matches only the word and its other names, ignoring case, accents, hyphens, apostrophes and repeated spaces, ranks the matches best first, updates at every change with no submit, opens the only match when there is one, and says so when nothing matches; from three characters on it also lists, apart, the other words whose plain line has a word starting with the query. Definitions and app meanings are never searched.

The page is for between sessions: the button is enabled at Idle, in session mode or Jam mode, and while the review shows, and disabled while a session runs, count-in included, so the page never opens over a session. While the page is open no MIDI note starts a session, a count-in or a Jam. Close, Escape or the browser's Back button closes the page, gives the focus back to the Lexicon button and leaves the workspace as it was. The page changes no setting, phrase or kept data, saves nothing on the device and sends nothing anywhere; reopened in the same visit it is as the player left it, and a reload starts it fresh. It works offline, with the keyboard alone, and in portrait as well as landscape views.

## TECHNICAL INTERFACE
The footer's Lexicon button opens the lexicon page; the page offers its word count, a labelled search field, the A to Z letter row, each entry's More control and related-word links, and Close.

## EXPECTATION
- The page lists every lexicon entry outside the Internal group, and no other; its count equals their number in the file; an edit to the lexicon shows at the next build with no other change.
- Each entry shows its word, group, plain line and other names, and behind More its definition, its app meaning when it has one and its related words, every field as the lexicon writes it, never its sources.
- A to Z ignores case and accents; a letter with no word cannot be chosen.
- The search matches words and other names only, ignoring case, accents, hyphens, apostrophes and spaces, best match first; one match opens; no match says so; from three characters other words mentioning the query in their plain line are listed apart.
- The Lexicon button is disabled during a session, count-in included, and enabled at Idle in either mode and while the review shows; no MIDI note starts a session, a count-in or a Jam while the page is open.
- Close, Escape and Back close the page and give the focus back to the button; the page changes and saves nothing and sends nothing.
- The page works offline, by keyboard alone and in portrait views.
