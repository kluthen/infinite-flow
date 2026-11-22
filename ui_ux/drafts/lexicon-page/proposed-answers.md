# Lexicon Page: Proposed Answers to the Spec's Open Questions

A working record, not a design document: it points into the draft, which carries no question
IDs. The questions are the spec register's
[v3.4 lexicon page entries](../../../specs/open-questions.md#v34-lexicon-page-o239), owned by
`spec-writer`, which takes them to the owner. Written 2026-11-22 by `ux-writer` with the first
design draft; every answer is proposed.

- **O239 (Internal entries).** Leave the 16 out, as the lexicon says; the bar counts the 318
  shown. Drop from the page each related link to an Internal entry (59 links in 51 entries,
  Phrase's links to Gesture and answer and Open ending among them). Why: their plain lines open
  with "Internal" and are written for developers. Follow-up for the owner, docs only: a few are
  words a curious player would like (Gesture and answer, Open ending, Recovery, Register window,
  Signature figure); moving one out of the Internal group, with its line rewritten, puts it on the
  page at the next build. Design: [screen handoff](screens/lexicon-page/handoff.md#what-the-page-shows-of-the-lexicon)
  (The entries shown; Related words).
- **O240 (what an entry shows).** As spec proposes, with two refinements: the other names are
  shown with the plain line (not behind `More`), so a search found by an alias shows why; and the
  definition, app meaning and related words sit behind `More`, opened in place. The group is
  shown on every entry; a doubled word is named "Word (Group)" in links, the music word first.
  Why: plain line first (NN/g, GOV.UK), and the list stays scannable for P1.G1's browsing.
  Design: [screen handoff](screens/lexicon-page/handoff.md#one-entry), [Doubled words](screens/lexicon-page/handoff.md#doubled-words).
- **O241 (app meanings written for developers).** Show them as written in step one, as spec
  proposes; the owner reads them on the built page or the prototype. Add to the docs pass, if the
  owner wants one: the eight app meanings over 1,200 characters (Vary settings, Doodle, Jam, Key
  and mode suggestion, Drift, Allowed rhythm changes, Rhythm lock, Starting note) are single
  paragraphs and read as walls; splitting or shortening them is a lexicon edit. Design: [screen
  handoff](screens/lexicon-page/handoff.md#what-the-page-shows-of-the-lexicon) (Text as written).
- **O242 (how the text reaches the page).** No design objection to spec's proposal (build-time
  parse, shown fields only, own budget). One design need for the parser's output: each entry's
  group name and group order (for the label, the qualifier and the tie order), and whether its
  word is doubled can be derived on the page. The search needs the other names and popup lines
  only, so no full-text index ships.
- **O243 (how it is reached, what kind of page).** A `Lexicon` button in the footer after
  `Your data`, opening a full-window page built from the sheet parts, loaded at first use,
  closed by `Close` or Escape, focus back on the button, not available during a session, as spec
  proposes. Plus, the owner's choice: one browser history entry (`#lexicon`) while it is open,
  so Back closes it rather than leaving the app; jumps inside add none. Why: Baymard and NN/g
  both find people press Back to leave an overlay that looks like a page, and a tablet's back
  gesture triggers it easily. Without it, the page still works. Design: [flow
  handoff](flows/look-up-a-word/handoff.md#routing-rules) (The browser's Back button).
- **O244 (what the search matches).** The word and its other names, anywhere, ignoring case,
  accents, hyphens and apostrophes, ranked exact, then starts-with, then a word inside, then
  anywhere; one match opens. On the popup line, the owner's choice, proposed yes in a limited
  form: from three characters, a separate group "Mentioned in other words" under the matches,
  for entries whose plain line has a word starting with the query; definitions and app meanings
  never searched. Why: NN/g finds A–Z lists fail people who don't know the word, which is the
  beginner's case; kept apart, the mentions never crowd the named matches. Design: [screen
  handoff](screens/lexicon-page/handoff.md#how-search-works).
- **O245 (its order in v3.4).** No design reason to change spec's proposal. The design adds no
  token, and its classes are confined to the page; the one change elsewhere is the footer's
  button (`screens/phrase-workspace/`), so it does not touch the structural review.
- **O246 (which goal it serves).** P1.G1, between sessions, as spec proposes; no new persona
  goal. P2 and P3 use it the same way. Design: [flow intent](flows/look-up-a-word/intent.md#whose-flow-it-is).
