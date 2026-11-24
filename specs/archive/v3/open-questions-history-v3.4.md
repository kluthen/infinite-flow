> **Archived 2026-11-24.** The v3.4 milestone closed: v3.4 is released as version 3.4.0 (tag
> `v3.4.0`, 17e631e4). This file holds, moved verbatim from the live register
> `specs/open-questions.md`: its two header paragraphs on open and closed questions as they stood
> at draft v0.97; its sections "v3.4 structural review (O234+)" and "v3.4 lexicon page (O239+)",
> whose questions are all closed (both headings stay live in the register so their links hold);
> and the notes of the questions closed during v3.4, recovered from git as each stood in the
> register before the commit that closed it: O234 and O237 at draft v0.92 (parent of 0a359c78),
> O236, O238–O246 and O312 at draft v0.93 (parent of f7603973), O315 at draft v0.95 (parent of
> c42f06c5) and O230 at draft v0.96 (parent of ec0b43e1). Every question named here is closed
> except those the live [open-questions.md](../../open-questions.md) still lists, which these
> notes only mention. Where each closed question's answer now lives is in
> [archive/v3/README.md](README.md#where-each-closed-v34-question-now-lives). Relative links were
> written from `specs/`; their paths were repaired on 2026-11-24 so they resolve from this folder.

## The register's header paragraphs (draft v0.97)

Only questions that are truly open appear here. IDs are stable. Each question's full text lives in
exactly one place: here, or in the document named. When a question is resolved it leaves this
register and its answer goes to the [decisions log](../../decisions.md). Resolved questions from earlier
work are recorded in the archived logs:
[D1–D46](../v1/decisions-D1-D46.md),
[D47–D71](../2026-09-25-personas-and-vision/decisions-D47-D71.md),
[D72–D108](../v2/decisions-D72-D108.md),
[D109–D207](../v2/decisions-D109-D207.md),
[D208–D227](decisions-D208-D227.md),
[D252–D258](decisions-D252-D258.md),
[D290–D343](decisions-D290-D343.md),
[D228–D231](decisions-D228-D231.md),
[D353–D388](decisions-D353-D388.md),
[D390–D391](decisions-D390-D391.md),
[D232–D251](decisions-D232-D251.md),
[D392](decisions-D392.md),
[D396–D405](decisions-D396-D405.md),
[D407–D509](decisions-D407-D509.md),
[D261–D288](decisions-D261-D288.md),
[D349–D352](decisions-D349-D352.md),
[D511–D520](decisions-D511-D520.md) and
[D524–D536](decisions-D524-D536.md). The notes this register kept on the questions
closed during v2 (O24, O50–O99 and O104–O106, apart from O86) are archived verbatim in
[archive/v2/open-questions-history.md](../v2/open-questions-history.md), those on the
questions closed during v3.0 (O163, O164, O181, O182, O200, O201, O210, O211 and O220) in
[archive/v3/open-questions-history.md](open-questions-history.md), and those on the
questions closed during v3.1 (O231–O233) in
[archive/v3/open-questions-O231-O233.md](open-questions-O231-O233.md), those on the
questions closed during v3.2 (O247–O266, O268, O290 and O291) in
[archive/v3/open-questions-history-v3.2.md](open-questions-history-v3.2.md), the
note on O306 in [archive/v3/open-questions-O306.md](open-questions-O306.md), and those
on the questions closed during v3.3 (O165–O175, O235 and O310, with O310's own note) in
[archive/v3/open-questions-history-v3.3.md](open-questions-history-v3.3.md); each
archive's README says where each answer now lives.

Open on 2026-11-24: O48 and O49 (later and governance), O100–O102 (v5 rhythm ratios and editor),
O115 and O116 (v3.x learning), O176 (style packs and the chord level), O180 (octave signs, later),
O183 (the warm worker lost when pre-generation is cancelled), O190 (a newer version's database
whose read-only reopening fails), O313, O314 and O316 (the three-way split,
this app's horizon and a lexicon backend,
D551–D553, D561), and O267, O269 and O271 (v3.2's build,
answered by the checks that follow the `3.2.0` tag, D521). v3.3 is released (D544) and none of its
questions is open. O230 (a stale replay-key wording, numbered O177 on branch `plan-migration`,
D352) closed with D577. O270, O272–O289, O292–O305 and O307–O309 were never issued; the IDs
reserved for v3.0's waves and left unused stay unused, and O177 stays unused. O311, reserved
by `doc-ids` during the v3.3 archive, is unused. New IDs come from `doc-ids next spec O`.

## v3.4 structural review (O234+)

Opened 2026-10-21 by `spec-writer` with v3.4 (D389). The scoping draft is
[structural-review.md](../../versions/v3/structural-review.md); none of these blocked v3.1, v3.2 or v3.3.
D536 closed O235; the note recording it is in the
[v3.3 archive](open-questions-history-v3.3.md). On 2026-11-22 D545 closed O234 (v3.4
delivers the report and the refactors the owner takes, as a v3.4 build plan) and left its tag
sub-question open as O312; D546 closed O237 (the review looks at the code as it is, not at v4's
scope); D547 ruled the dependency part of O238 and narrowed it. The same day D550 closed O312
(v3.4 is tagged `3.4.0`) and D551 closed O236 (the game is a separate app: the owner favours a
three-way split, library, this app and the game). The owner then left the resolution of v3.4 to
the wave driver (D556), whose D557 closed O238 (the bounds of a refactor, and the analysis
tools). None of the review's own questions is open. On 2026-11-23 the report was written
([structural-review-report.md](../../versions/v3/structural-review-report.md)) and the driver ruled on
it (D569–D574).

## v3.4 lexicon page (O239+)

Opened 2026-10-21 by `spec-writer` with the lexicon page (D393). The scoping draft is
[lexicon-page.md](../../versions/v3/lexicon-page.md); none of these blocks v3.1, v3.2 or v3.3, nor the
structural review. On 2026-11-22 the owner left them to `ux-writer`, who researched the page and
proposed its design and an answer to each (D548); the same day the owner validated the design,
and D549 closed O239–O244 and O246 with `ux-writer`'s answers as written. The lexicon API joined
v3.4 the same day (D555). Under the owner's delegation (D556), the wave driver's D558 closed O245
(the page is built before the measurement pass) and D559 settled the API's shape. On 2026-11-23
the driver's D574 closed O315: the lexicon API lives in this app, not the library. None of the
lexicon page's questions is open.

## The notes of the questions closed during v3.4

- **O230 - A stale replay-key wording in `module_tension_arc_cycle`** _(D351; from the v3.3 build
  plan's owner questions; outside v3.3)_: the STABLE atom `module_tension_arc_cycle` (outside the
  contract surface) still says a session phrase's replay key keeps "the unchanged `ifk1.` format",
  which v3.0's `ifk2.` already breaks and neither earlier intent change set lists. The plan had
  proposed correcting it at v3.0 chunk 18's capture; that chunk is merged and the wording stands.
  Open: who corrects it, and when? Proposed: a wording-only revision (no guarantee changes) that
  names no key version, confirmed by the owner and applied by `documentalist` at the next intent
  pass that touches it, I0 at the latest; v3.3's
  [chunk 15](../../versions/v3/build-plan-v3.3.md#chunk-15--replay-key-ifk5) must not repeat it for
  `ifk5.`. It blocks no chunk.
- **O234 - What v3.4 delivers** _(D389)_: a report with ranked recommendations only, or also the
  refactors the owner takes, built as a v3.4 build plan before v4 starts? And is v3.4 a release with
  its own tag, or a milestone with no tag? Proposed: the report and the owner's rulings close the
  analysis; any refactor taken becomes a v3.4 build plan, approved separately; a tag (3.4.0) only if
  code ships.
- **O236 - Is the endgame the same app, or another app using Infinite Flow's generator?**
  _(D389; [endgame](../../vision/endgame.md))_: the endgame calls Infinite Flow "the music factory" of a
  game. If the game is a separate app, a generation-core library has a second consumer and a split
  pays off; if it grows inside this app, a split mostly buys clearer boundaries. Not ruled: asked
  on 2026-11-22, the owner sees it as a separate question still to resolve ("that's another
  question that need to be resolved"). Until it is, the review assumes neither answer: its Q4
  presents both, with its recommendation under each and where it changes
  ([structural review, Q4](../../versions/v3/structural-review.md#q4-should-the-app-split-into-several-libraries-or-packages)).
  It needs an answer before the owner rules on the Q4 recommendation, not before the analysis.
- **O237 - Which v4 the review plans for** _(D389; [v4](../../versions/v4/README.md))_: the owner says
  "starting v4 we truly begin working on endgame". The v4 folder holds accompaniment with roles, a
  sound library, the whole-file seed and the rhythm ratios and editor; style packs have no version.
  Does v4 grow toward the endgame beyond that? Proposed: plan for the v4 folder as written, plus
  style packs and the endgame's companions as the far horizon, and say where the answer would
  change.
- **O238 - How far a recommended refactor may go** _(D389, D547)_: D547 settled the dependency
  part (no new runtime dependency besides Tone.js). Still open, none of it answered on 2026-11-22:
  (a) behaviour-preserving only, guarded by the existing tests? (b) may a refactor move code across
  many files, moving atom links with it, atom IDs unchanged? (c) is there a time budget before v4?
  (d) does D547 cover the dev-only tools the analysis runs (bundle analyser, dependency-cruiser,
  jscpd)? Proposed: (a) yes; (b) yes, atom IDs unchanged and links moved with the code; (c) the
  owner sets it once the ranked list is in front of him; (d) no: D547 is about dependencies the app
  adds, and the analysis installs its tools in a throwaway worktree with nothing committed
  ([structural review §7](../../versions/v3/structural-review.md#7-who-does-what-proposed)); a tool the
  review recommends keeping is a dev dependency the owner rules on with that recommendation.
- **O239 - Are the Internal entries shown?** _(D393)_: the owner asks for "all words"; the lexicon
  says its 16 "Internal (no popup)" entries (forced bend, grammar and others) are "never shown in
  the UI". Proposed: leave them out, as the lexicon says; the page states how many words it holds.
- **O240 - What one entry shows** _(D393)_: proposed: the word, its other names, the popup line
  first, the definition, the app meaning under a plain heading ("In Infinite Flow") when there is
  one, the related words as links within the page, and the group as a small label, which tells
  apart the four words listed twice (Contour, Register, Syncopation, Tempo: the music word and the
  app control). Not shown: the `id` and the `sources`.
- **O241 - App meanings written for developers** _(D393, D394)_: 59 app meanings cite spec
  decisions ("spec decision D214"), about 45 describe things planned or not built, a few name code
  files. The page may not keep a second, cleaned copy (D394). Show them as written, hide parts by
  a rule, or reword the lexicon itself? Proposed: show them as written in step one; the owner reads
  them on the built page, and if they jar, a docs-only pass rewords those lines in the lexicon.
- **O242 - How the text reaches the page, and its download cost** _(D394, D359, D536)_: the app
  may not download anything while running (`verify:boundaries` forbids `fetch`), so the text goes
  into a built file; the service worker then downloads it for every visitor at install or update,
  page opened or not: about 300 KB, roughly 85–90 KB compressed. That is three times the 100 KiB
  any extra file may weigh, so it needs its own budget, and a budget that a lexicon edit can
  overflow makes a docs edit fail the build. Proposed: parse at build time and ship only the shown
  fields (Internal entries left out), in a file of its own with a named budget of 448 KiB, room for
  the lexicon to grow by half; the owner accepts the extra download; the structural review counts
  it with the rest (its Q2).
- **O243 - How the page is reached, and what kind of page it is** _(D393)_: the app has no router
  and no second page; everything else is the workspace and its sheets. Proposed: a "Lexicon" link
  in the footer beside "Your data", opening a full-screen view built like a sheet (loaded on
  first use, closed by a Close button or Escape, the focus back on the link), not available while
  a session runs, with no web address of its own. The alternative is the app's first real page,
  with its own address (for example `#/lexicon`) and the browser's Back button: a new pattern,
  more work and more design.
- **O244 - What the search matches** _(D393)_: proposed: the word and its other names, anywhere in
  them, ignoring case and accents ("compas" finds Compás, "semitone" finds Half step), results as
  the player types. The popup line is not searched in step one: searching it finds many words
  that merely mention the term. Should it be?
- **O245 - Its order in v3.4** _(D389, D393, D545)_: proposed: its own small part of v3.4 (master
  spec Part E, one design, a one-wave build plan of two chunks), built before the structural
  review's measurement pass so the review measures the app with it. It depends on nothing in v3.2
  or v3.3, so the owner may pull it earlier. v3.4 then ships code, which bears on its tag (O312).
- **O246 - Which goal the page serves** _(D393; [personas](../../personas.md))_: proposed: P1's G1
  ("get to know the possibilities rather than study theory"), between sessions: a word met in the
  controls, a preset or the review can be looked up without going online. No new persona goal.
- **O312 - Is v3.4 tagged?** _(D545; split from O234)_: a release with its own tag, or a milestone
  with no tag? Not answered on 2026-11-22. Proposed, the rule O234 proposed: a `3.4.0` tag only if
  code ships; since the lexicon page ships code whatever the review finds (D393, O245), v3.4 is
  tagged `3.4.0`.
- **O315 - Where the lexicon API lives once the split is built** _(D555, D559, D551;
  [lexicon page §9](../../versions/v3/lexicon-page.md#9-step-two-the-lexicon-api-d555))_: D559 settled
  what it is (a plain TypeScript module over the page's parser, a typed read interface, no
  server, this app its first caller) and left only its home: the library's repository or this
  app's. It follows the structural review's split recommendation
  ([Q4](../../versions/v3/structural-review.md#q4-should-the-app-split-into-several-libraries-or-packages));
  until then it lives in this repository. Needed before the split is built, not before v3.4's
  API chunk.
