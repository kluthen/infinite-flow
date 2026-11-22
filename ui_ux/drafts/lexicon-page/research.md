# Lexicon Page Research Note

> **Draft.** Research for the lexicon page's first design draft, gathered 2026-11-22 through
> `web-researcher`, with no personal or project data in any request. Each finding names its
> source; **[A]** marks published guidance (W3C/WAI, WCAG, WHATWG, GOV.UK, NN/g, Material,
> Baymard, MDN reference), **[O]** what one site was seen doing. The sources are interface
> references, not music research, so they are numbered here and not added to the music source
> register (`docs/music/research-sources.md`).

## The Lexicon as the Page Will Read It

Read on 2026-11-22 from `docs/music/lexicon.md` (v1.8, 345 KB). Facts, not decisions.

- **Entries.** 334 entries in 12 groups; 16 in "Internal (no popup)", so 318 would be shown.
- **Letters.** No shown word starts with U, X, Y or Z; Q has five (Quantize, Quarter note,
  Quarter tone, Quartal harmony, Quick change); one heading has an accent (Compás).
- **Doubled words.** Contour, Register, Syncopation and Tempo head two entries each (the music
  word, then the App controls entry); each pair already links both ways in `related`.
- **Names shared through other names.** Several other names equal another entry's word:
  "tension" is another name of Chord extension and of Tension and resolution, beside the Tension
  control; "collection" of Scale and Mode, beside the Collection control; "register" of Octave;
  "key" of Written key. Search ranking must put the entry named exactly first.
- **Links to Internal entries.** 51 shown entries list 59 related ids that are Internal (Phrase
  links Gesture and answer and Open ending, for example). If the Internal group stays hidden,
  those links must be dropped from the page.
- **Length.** Popup lines are at most 186 characters; definitions average 361 characters, at
  most 525; app meanings average 267 characters, but eight run past 1,200 (Vary settings 2,435,
  Doodle 1,806, Jam 1,688) as one paragraph each. 10 shown entries have no app meaning.
- **Markup.** 85 bold runs and a few code marks inside fields; no links inside entries.

## A–Z Browsing

- **Letter row, empty letters.** [O] The NHS "Conditions A to Z" [1] puts the letters in one
  `nav` as plain in-page links, each a normal Tab stop; a letter with nothing is a grey `span`,
  not a link. [A] The NICE design system's Alphabet [2] is a horizontal row of letters. No
  design system found backs a side rail. Design consequence: one horizontal row, all 26 letters
  shown, empty ones as grey text that cannot be focused.
- **Links, not a toolbar.** [A] The APG toolbar pattern [3] (one Tab stop, arrow keys) is for
  groups of controls; a row of in-page jumps is navigation. Design consequence: each letter is a
  link and a Tab stop, in a `nav` labelled "Letters" ([A] the APG landmark guidance [4]: a unique
  label, without the word "navigation").
- **A–Z alone fails beginners.** [A] NN/g [5]: an alphabetical list helps only users who already
  know the item's name. Design consequence: search matches other names, each entry shows its
  group, and the "Mentioned in other words" group (an owner's choice) finds a word from a word in
  its plain line.

## Search as You Type

- **Status messages.** [A] WCAG 2.2 SC 4.1.3 [6]: a result count or "no results" is a status
  message, announced without moving focus; `role="status"` is sufficient. Design consequence: one
  polite status line for the count and the no-match sentence.
- **No results.** [A] NN/g [7]: say plainly that nothing was found, keep the query editable,
  offer a way on. Design consequence: "No word matches “…”.", a spelling hint, `Clear search`,
  the field untouched.
- **Accents and case.** [A] MDN on `Intl.Collator` [8]: `sensitivity: "base"` makes a, á and A
  equal for sorting; contains and prefix matching need the strings folded first. Design
  consequence: sort with the collator, match on folded text.
- **Showing why an alias matched.** [O] The Kubernetes glossary [9] shows other names under the
  term ("Also known as: …"). Design consequence: the "Also called" line is always shown, the
  matched name first and in bold.
- **Not found.** No authoritative source gives a debounce value or the exact > prefix > contains
  ranking; both are common practice. With 318 entries in memory, filtering needs no debounce;
  only the spoken count waits for a pause.

## Related Words, Back and Deep Links

- **Back closes an overlay.** [A] Baymard [10]: users expect Back to exit an overlay they see as
  a page, back to the page beneath; use `history.pushState()` for such views. [A] NN/g [11]: Back
  returns to the previous page, so support both a visible Close and Back. [A] Material's
  full-screen dialog [12] (the older guidance; the current page could not be read): the system
  Back acts as Close. Design consequence: the proposal of one history entry while the page is
  open, which is the owner's choice since it is the app's first use of the address bar.
- **In-page links add history.** [A] WHATWG HTML [13]: following a `#fragment` link adds a history
  entry. Design consequence: jumps inside the page are handled by the page and add none, so Back
  never has to retrace a trail of related words.
- **Landing below a sticky bar.** [A] MDN `scroll-margin-top` [14] (widely available). Design
  consequence: every jump target clears the bar's current height; the target heading takes
  `tabindex="-1"` and the focus, as WHATWG's fragment focusing does [13].
- **Stable anchors.** [O] Kubernetes [9] and MDN [15] anchor terms by a stable slug. Design
  consequence: each entry's page address is its lexicon `id`, never its heading.

## Doubled Words

- **Qualifiers.** [A] Wikipedia's disambiguation guideline [16]: a short parenthetical
  qualifier naming the context ("Mercury (element)"); [O] MDN's glossary [15] does the same for
  doubled terms ("Block (CSS)", "Block (scripting)"). [A] Wiktionary's numbered senses [17] suit
  one word with several meanings in one entry, not two separate entries. Design consequence: two
  entries, each with its group shown, and links naming the group in parentheses. A shorter
  singular qualifier ("Tempo (app control)") reads better, but it is a word the page would have
  to hold itself; the group name needs nothing new.

## Accessibility

- **Modal page.** [A] APG modal dialog [18]: focus moves in on open (for long content, to a
  static element at the top with `tabindex="-1"`), Tab wraps inside, Escape closes, focus returns
  to the opener; `aria-modal` only when what is behind is blocked and covered, which a
  full-window page is. Design consequence: as designed, with focus on the search field when a
  fine pointer is present (typing is the likely next act), on the title on touch.
- **Disclosure.** [A] APG disclosure [19]: a button with `aria-expanded`, Enter and Space toggle
  it. A native `details`/`summary` gives the same. [A] Chrome opens a closed `details` on a
  find-in-page or fragment match since Chrome 97 [20]; `hidden="until-found"` since Chrome 102
  [21]. Design consequence: `details`, so the browser's own find reaches every definition.
- **Target size.** [A] WCAG 2.2 SC 2.5.8 [22]: at least 24 by 24 CSS px; links inside sentences
  are exempt; SC 2.5.5 asks 44 px. Design consequence: the letters keep the app's 44 px floor,
  which makes the row wrap on a tablet; related links sit in a sentence-like line.

## Plain Line First

- **Progressive disclosure.** [A] NN/g [23]: show the most important part first, the rest on
  request, behind a reveal with a clear label. [A] GOV.UK [24][25]: most important first;
  people read a fifth to a quarter of a page; explain a term in plain English. Design
  consequence: word, plain line and other names always shown; definition and app meaning behind
  `More`.
- **Accordions.** [A] NN/g [26]: suited when readers need few sections at once; let several be
  open; offer Expand all for long sets. [A] GOV.UK [27]: never hide what most people need. Design
  consequence: several entries may be open; no Expand all, since opening 318 entries would undo
  the scan the plain lines give.
- **List and detail.** [A] Android's list-detail guidance [28] suits in-depth reading of large
  collections on wide screens. `web-researcher`'s reading leaned to it for a laptop. Not taken:
  this page's collapsed entry already carries the line most readers need, which an accordion of
  bare headings does not; and in place, several words stay open side by side. Recorded in
  `screens/lexicon-page/intent.md`.
- **Tooltips.** [A] NN/g [29]: brief, never essential, open on focus too. For the later word
  popups the plain line is the tooltip, the page holds the rest.

## Sources

1. NHS England, "Conditions A to Z", https://www.nhs.uk/conditions/ [O]
2. NICE Design System, "A to Z list" and "Alphabet", https://design-system.nice.org.uk/components/a-z-list/, https://design-system.nice.org.uk/components/alphabet/
3. W3C WAI, ARIA APG, "Toolbar Pattern", https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/
4. W3C WAI, ARIA APG, "Landmark Regions", https://www.w3.org/WAI/ARIA/apg/practices/landmark-regions/
5. NN/g, J. Nielsen, "Alphabetical Sorting Must (Mostly) Die" (2010), https://www.nngroup.com/articles/alphabetical-sorting-must-mostly-die/
6. W3C, WCAG 2.2, Understanding SC 4.1.3 Status Messages, https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html
7. NN/g, K. Whitenton, "3 Guidelines for Search Engine 'No Results' Pages" (2014), https://www.nngroup.com/articles/search-no-results-serp/
8. MDN, "Intl.Collator() constructor", https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/Collator/Collator
9. Kubernetes documentation, "Glossary", https://kubernetes.io/docs/reference/glossary/ [O]
10. Baymard Institute, "4 Design Patterns That Violate 'Back' Button UX Expectations" (2020), https://baymard.com/blog/back-button-expectations
11. NN/g, R. Budiu et al., "Accidental Dismissal of Overlays" (2022), https://www.nngroup.com/articles/accidental-overlay-dismissal/
12. Material Design (M1), "Dialogs: full-screen dialogs", https://m1.material.io/components/dialogs.html
13. WHATWG, HTML Living Standard, "Scrolling to a fragment", https://html.spec.whatwg.org/multipage/browsing-the-web.html#scroll-to-the-fragment-identifier
14. MDN, "scroll-margin-top", https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/scroll-margin-top
15. MDN Web Docs, "Glossary", https://developer.mozilla.org/en-US/docs/Glossary [O]
16. Wikipedia, "Wikipedia:Disambiguation" and "Wikipedia:Piped link", https://en.wikipedia.org/wiki/Wikipedia:Disambiguation, https://en.wikipedia.org/wiki/Wikipedia:Piped_link
17. Wiktionary, "Wiktionary:Entry layout", https://en.wiktionary.org/wiki/Wiktionary:Entry_layout
18. W3C WAI, ARIA APG, "Dialog (Modal) Pattern", https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
19. W3C WAI, ARIA APG, "Disclosure (Show/Hide) Pattern", https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
20. Chrome for Developers, "New in Chrome 97", https://developer.chrome.com/blog/new-in-chrome-97
21. Chrome for Developers, "hidden=until-found", https://developer.chrome.com/docs/css-ui/hidden-until-found; MDN, "hidden", https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/hidden
22. W3C, WCAG 2.2, Understanding SC 2.5.8 Target Size (Minimum), https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
23. NN/g, J. Nielsen, "Progressive Disclosure" (2006), https://www.nngroup.com/articles/progressive-disclosure/
24. GOV.UK, "Create a clear structure", https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/clear-structure/
25. GOV.UK, "Use clear language", https://guidance.publishing.service.gov.uk/writing-to-gov-uk-standards/writing-guidelines/clear-language/
26. NN/g, "Accordions on Desktop" (2023), https://www.nngroup.com/articles/accordions-on-desktop/
27. GOV.UK Design System, "Accordion" and "Details", https://design-system.service.gov.uk/components/accordion/, https://design-system.service.gov.uk/components/details/
28. Android Developers, "List-detail", https://developer.android.com/develop/adaptive-apps/guides/list-detail
29. NN/g, "Tooltip Guidelines" (2019), https://www.nngroup.com/articles/tooltip-guidelines/

Not verified: Merriam-Webster refused the request; Cambridge, Wiktionary's browse pages, GOV.UK's
A–Z pages and music-learning apps' glossaries were not checked; Material 3's dialog page did not
render.
