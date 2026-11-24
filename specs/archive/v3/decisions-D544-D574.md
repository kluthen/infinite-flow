> **Archived 2026-11-24.** Closed range for the v3.4 milestone: v3.4 is released as version 3.4.0
> (tag `v3.4.0`, 17e631e4). These decisions are v3.3's archive event, the owner's first rulings
> on v3.4 and his direction for this app's horizon, his delegation of v3.4 to the wave driver, and
> the driver's rulings under it: Part E and the build plan approved, the lexicon page's last
> choices, and the structural review's report ruled. D566 was never issued. D575–D578, which
> follow them, stay live (the build plan's open points after the review, with the revision of
> `prerequisites.md` that is v4.0's first task; `NotationError`; O230's close; v3.4 tagged before
> its hand check H1). Archived IDs keep their meaning and may be cited anywhere; each decision's
> content is now stated as settled fact in a live document, or is history, as the "where it now
> lives" table in [archive/v3/README.md](README.md#v34-release-archived-2026-11-24) records.
> Relative links were written from `specs/`; their paths were repaired on 2026-11-24 so they
> resolve from this folder.

- **D544 (2026-11-22): v3.3 is released as version 3.3.0; its working record is archived.** The
  owner's go of 2026-11-18 ("Merge, tag v3.3.0, push"; the wave log's release gate entry): the tag
  `v3.3.0` is on `main` at b2a0e3fa. Moved verbatim to
  [archive/v3/](README.md#v33-release-archived-2026-11-22): D261–D288, D349–D352,
  D511–D520 and D524–D536, the register's notes on the questions closed during v3.3 (O310's
  included), and the former status snapshots of the spec index and the v3 README. Part D, the v3.3
  build plan and its wave log stay in place. Still live: D537–D542 and the checks after the tag
  ([v3.3.x notes](../../versions/v3/README.md#v33x-notes-after-the-tag)). No question was decided.

- **D545 (2026-11-22): v3.4 delivers the structural review's report and the refactors the owner
  takes, built as a v3.4 build plan; closes O234, its tag sub-question split off as O312.** The
  owner: "it's both the report and the corrective measures should they arise." He did not answer
  the tag; its proposed rule (`3.4.0`, since code ships) waits in O312. Now in:
  [structural review §6](../../versions/v3/structural-review.md#6-deliverables).
- **D546 (2026-11-22): the review looks at the code as it is now and does not plan for or review
  v4's scope; closes O237.** The owner: "we wont work on reviewing V4.0 right now. we will focus on
  v3.4". Q1's v4 bullets stay as out-of-scope notes. Now in:
  [structural review §3](../../versions/v3/structural-review.md#3-what-it-is-not),
  [Q1](../../versions/v3/structural-review.md#q1-is-the-architecture-sound-for-expansion).
- **D547 (2026-11-22): no new runtime dependency besides Tone.js; narrows O238.** The owner: "the
  only dependency we should plan for is tone.js otherwise we don't have need to add a new one."
  The review may weigh Tone.js's weight and where it loads against the start-up budget. O238 keeps
  the rest of its proposal and whether the dev-only analysis tools are covered. Now in:
  [structural review §3](../../versions/v3/structural-review.md#3-what-it-is-not),
  [Q2](../../versions/v3/structural-review.md#q2-should-the-entry-budget-be-lowered-and-how).
- **D548 (2026-11-22): the lexicon page's questions O239–O246 go to `ux-writer` first; none is
  ruled.** The owner: "as for lexicon integration i'll let the ux writer look at it and do some web
  research." `ux-writer` researches and proposes the design and an answer to each; `spec-writer`
  checks them against the spec, personas and lexicon and takes them to the owner. Now in:
  [register](../../open-questions.md#v34-lexicon-page-o239), [lexicon page](../../versions/v3/lexicon-page.md).
- **D549 (2026-11-22): the lexicon page's design is validated, and `ux-writer`'s answers to
  O239–O244 and O246 are taken as written; closes those seven.** The owner: "OK i validate lexicon
  view." This includes the four choices put to him: the 16 Internal entries hidden (318 shown);
  Back closes the page through one `#lexicon` history entry, the app's first use of the address
  bar; the "Mentioned in other words" group over popup lines from three characters, definitions
  never searched; app meanings shown as written. O245 stays open. Now in:
  [lexicon page §4](../../versions/v3/lexicon-page.md#4-the-page-d549), [§5](../../versions/v3/lexicon-page.md#5-the-single-source-d394).
- **D550 (2026-11-22): v3.4 is released with a tag, `3.4.0`; closes O312.** The owner: "v3.4 will
  be tagged." Now in: [structural review §6](../../versions/v3/structural-review.md#6-deliverables),
  [lexicon page §8](../../versions/v3/lexicon-page.md#8-its-place-in-v34-and-who-does-what).
- **D551 (2026-11-22): the endgame's game is a separate app; the owner favours a three-way split
  (a library, this app, the game); closes O236.** The owner: "I'm in favor of a 3 way split, this
  app would remain neutral or student oriented. the lib itself, the game on the other side. The
  game and this app don't quite share the same personas." The review's Q4 evaluates this shape;
  the personas and vision are revised later (O313). Now in:
  [structural review, Q4](../../versions/v3/structural-review.md#q4-should-the-app-split-into-several-libraries-or-packages).
- **D552 (2026-11-22): the owner's direction, not a ruling: v4.0 is most probably this app's last
  update, perhaps in a repository of its own.** The owner: "the last update for this app will most
  probably be v4.0 with basic accompaniments (if i remember well). We may need to create new repo
  to enforce this." Hedged, so nothing is re-scoped: what it leaves to settle is O314, and the
  roadmap and the version folders carry a dated note only. Now in:
  [roadmap](../../roadmap.md), [versions](../../versions/README.md),
  [structural review, Q4](../../versions/v3/structural-review.md#q4-should-the-app-split-into-several-libraries-or-packages).
- **D553 (2026-11-22): v4.0 is Tone.js and accompaniment with roles; v4's other items move to
  v5.** The owner: "ok move rhythm ratio and editors, etc to v5. keep tonejs and accompaniment
  with roles on v4.0"; asked, he confirmed "etc" as the wider rhythm mutation options (D232) and
  the whole-file seed. O100–O102 follow the rhythm ratios to v5. His direction, not ruled: "v5+
  will probably be moved to the game app instead of here, we will have to review this later"
  (O314). Answers O314 (b). Now in: [v4](../../versions/v4/README.md#settled-direction),
  [v5+](../../versions/v5-plus/README.md#moved-from-v4-d553), [roadmap](../../roadmap.md#3-v4--accompaniment-with-roles).
- **D554 (2026-11-22): microphone input is out of scope in any version.** The owner: "microphone
  input is still out whichever the version." Now in:
  [v5+](../../versions/v5-plus/README.md#out-of-scope-microphone-input-d554).
- **D555 (2026-11-22): the lexicon API moves into v3.4, as step two of the lexicon page.** The
  owner: "lexicon is for this version." Replaces D395's "v4 or v5". Where it lives once the
  split is built is for the structural review's Q4 (O315). Now in:
  [lexicon page §9](../../versions/v3/lexicon-page.md#9-step-two-the-lexicon-api-d555),
  [roadmap](../../roadmap.md#the-lexicon-api--in-v34-d555).
- **D556 (2026-11-22): the owner delegates the resolution of v3.4's questions to the wave
  driver.** The owner: "you're free to handle the resolution of v3.4, i'll bow to your
  suggestions." The driver rules v3.4's open questions and the report's recommendations; the
  owner keeps the tag's go, the pushes he asks for and the VPS deploys. D557–D560 are the
  driver's first rulings under it. Now in:
  [structural review §7](../../versions/v3/structural-review.md#7-who-does-what-proposed).
- **D557 (2026-11-22, the driver under D556): the bounds of a refactor and the analysis tools;
  closes O238.** Behaviour-preserving only, guarded by the existing tests; atom IDs unchanged,
  links moved with the code; no calendar budget: the build plan takes only refactors ranked as
  preparing the three-way split or v4's Tone.js seam, or clearing a recurring gate friction, the
  rest deferred and listed; dev-only analysis tools run in a throwaway worktree, nothing
  committed, keeping one decided with its recommendation. Now in:
  [structural review §3](../../versions/v3/structural-review.md#3-what-it-is-not),
  [Q3](../../versions/v3/structural-review.md#q3-which-refactoring-opportunities-are-worth-taking),
  [§7](../../versions/v3/structural-review.md#7-who-does-what-proposed).
- **D558 (2026-11-22, the driver under D556): the lexicon page and API are their own small part
  of v3.4, and the measurement pass runs after the page is built; closes O245.** So the page is
  measured with the app. Now in:
  [lexicon page §8](../../versions/v3/lexicon-page.md#8-its-place-in-v34-and-who-does-what).
- **D559 (2026-11-22, the driver under D556): the lexicon API is a plain TypeScript module over
  the page's parser, with a typed read interface, no server and no network; narrows O315 to its
  home.** This app is its first caller; it holds no browser-only assumption and its entry shape
  is written as a language-neutral contract, so a backend (D561) could serve it later without
  its callers changing. Stands unless the structural review's report finds a reason against it.
  Now in: [lexicon page §9](../../versions/v3/lexicon-page.md#9-step-two-the-lexicon-api-d555).
- **D560 (2026-11-22, the driver under D556): the two lexicon follow-ups are taken, as a
  docs-only lexicon pass inside v3.4 before the page's build.** Player-worthy words moved out of
  Internal, and the eight longest app meanings shortened, by the lexicon's owners as they decide.
  Now in: [lexicon page §10](../../versions/v3/lexicon-page.md#10-the-lexicon-pass-d560).
- **D561 (2026-11-22): the owner's direction, not scheduled: a backend some day, for the lexicon
  only, in Go.** The owner: "we will need to have a backend at some point anyway"; "currently,
  the backend is only for lexicon which doesn't contains any user information so that's super
  ok"; "i'm usually more of a go team than whateverjs for the backend." No rule changes now; the
  browser-only rule's wording and the rest are O316. Now in:
  [lexicon page §9](../../versions/v3/lexicon-page.md#9-step-two-the-lexicon-api-d555).
- **D562 (2026-11-22, the driver under D556): the lexicon page works in any orientation.** The
  landscape-only rule covers the phrase workspace only; the rotate-device notice does not replace
  the page, a list of words being readable in portrait. `documentalist`'s wave preflight checks
  that the portrait wordings (first-release master spec, `req_landscape_phrase_workspace`,
  `rule_session_ends_on_portrait_view`) still read true. Now in:
  [Part E §E7](../../versions/v3/master-spec.md#e7-opening-and-closing).
- **D563 (2026-11-22, the driver under D556): an empty or malformed lexicon fails the build.**
  Malformed is the template's own rules: a required field missing, fields not the template's or
  out of its order, an id twice, a related id naming no entry; empty is no shown entry. The page
  needs no empty state. Now in: [Part E §E5.3](../../versions/v3/master-spec.md#e53-the-build-fails-on-an-empty-or-malformed-lexicon).
- **D564 (2026-11-22, the driver under D556): master spec Part E v1.0, the lexicon page and the
  lexicon API, is approved.** Consolidated from the draft v2.3 and the design at the `ui_ux/`
  root, with its code facts read again on `main` 828ab396. It also settles: the read interface
  takes its entries as input and leaves A to Z and search to the page; the entry contract's nine
  fields; the Lexicon button does not wait for the session controller; a typed `#lexicon` is a load
  at `#lexicon`. Now in: [Part E](../../versions/v3/master-spec.md#part-e--v34).
- **D565 (2026-11-22, the driver under D556): the v3.4 build plan's lexicon wave is approved.** One
  wave of three chunks; the read interface is built with the parser in chunk 1, so the page
  (chunk 2) and the API's contract (chunk 3) each follow chunk 1 by one edge, as the in-wave edge
  rule allows. Now in: [build plan v3.4](../../versions/v3/build-plan-v3.4.md).
- **D567 (2026-11-23, the driver under D556): `#lexicon` reached under an open sheet opens
  nothing; only the address is replaced, the sheet staying as it was.** Gate T0 settled the case
  §E8 left uncovered (ux D495); closing the sheet first was rejected, as it could discard what the
  player typed. Now in: [Part E §E8](../../versions/v3/master-spec.md#e8-the-browsers-history-and-the-address)
  (v1.1) and [build plan v3.4](../../versions/v3/build-plan-v3.4.md) chunk 2.
- **D568 (2026-11-23, the driver under D556): the stale-phrase prompt counts as an open sheet for
  `#lexicon`, and a sheet opened during the page's first load stops its opening.** Two choices
  chunk 2's owner made where Part E was silent, extending D567: the page never stacks over a sheet
  or the prompt, as it never opens over a session. Now in:
  [Part E §E7, §E8](../../versions/v3/master-spec.md#e7-opening-and-closing) (v1.2) and
  [build plan v3.4](../../versions/v3/build-plan-v3.4.md) chunk 2.
- **D569 (2026-11-23, the driver under D556): v3.4 takes R1, R2 and R3 from the structural review.**
  R1 enforces the library line (a resolving import check in `verify-boundaries.mjs`, a no-DOM
  tsconfig over `domain/`, the README boundary map corrected); R2 makes `session/` import only
  session plus the library set; R3 moves the Jam host wiring out of `WorkspaceShell.vue`. Now in:
  [report §7](../../versions/v3/structural-review-report.md#7-rulings) and
  [build plan v3.4](../../versions/v3/build-plan-v3.4.md) waves 2 and 3.
- **D570 (2026-11-23, the driver under D556): R4, the atom-spread limit above 10 is a warning for
  test files only.** Source files keep warn above 5 and error above 10. This relaxes a quality
  gate, knowingly: every atom-limit gate failure so far involved a test file, and broad specs
  legitimately cover many atoms. Chunk reports still name any link they left out because of the
  limit. Now in: [report §7](../../versions/v3/structural-review-report.md#7-rulings) and
  [build plan v3.4](../../versions/v3/build-plan-v3.4.md) chunk 4.
- **D571 (2026-11-23, the driver under D556): R5, the start-up budget stays at 400 KiB (409,600 B,
  D536), and an overrun takes a lever, not a raise.** The first lever is R6 (lazy audio voices),
  the second R7 (lazy migration codecs). Raising the budget again is the owner's call only; no
  wave driver or chunk may do it. Answers the review's Q2. Now in:
  [report §3](../../versions/v3/structural-review-report.md#3-q2-the-start-up-budget) and
  [build plan v3.4](../../versions/v3/build-plan-v3.4.md).
- **D572 (2026-11-23, the driver under D556): the review's other recommendations are deferred or
  dropped as the principal-advisor's ranking says.** Deferred: R6–R11, R13–R15, R18, R19. Dropped:
  R12 (regrouping `components/workspace/`), and R13's unification of the settings key list, whose
  order feeds the replay-key contract. R16: the doc line is corrected now, the code deferred. No
  analysis tool is kept in the repository (the point D557 left to the report). Now in:
  [report §6, §7](../../versions/v3/structural-review-report.md#6-ranked-recommendations).
- **D573 (2026-11-23, the driver under D556): the split's form, Q4.** Now: folders with enforced
  boundaries in one package, with no file moves. At game start: a new repository holding the
  library and the game as npm workspaces, seeded from the enforced library folders, with its own
  ATD record; the order of steps is the report's. Informs O314 (c); does not decide O314 (a), on
  which the game-start form depends. Now in:
  [report §5](../../versions/v3/structural-review-report.md#5-q4-the-split) and O314.
- **D574 (2026-11-23, the driver under D556): the lexicon API's home is this app, not the
  library.** It has no edge to `domain/`, this app is its only caller, and the library is the
  music core; being self-contained, it can move later at no cost. A Go backend (D561) would sit
  beside this app. Closes O315. Now in:
  [report §5](../../versions/v3/structural-review-report.md#5-q4-the-split).
