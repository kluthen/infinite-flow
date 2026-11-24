> **Archived 2026-11-24.** Closed range for the v3.4 milestone: v3.4 is released as version 3.4.0
> (tag `v3.4.0`, 17e631e4). These decisions added the lexicon page to v3.4, gave it its one
> source, and placed the lexicon API later (D395, superseded by D555). Archived IDs keep their
> meaning and may be cited anywhere; each decision's content is now stated as settled fact in a
> live document, or is history, as the "where it now lives" table in
> [archive/v3/README.md](README.md#v34-release-archived-2026-11-24) records. Relative links were
> written from `specs/`; their paths were repaired on 2026-11-24 so they resolve from this folder.

- **D393 (2026-10-21): v3.4 also builds a lexicon page, step one of a side project; D389 is
  amended.** The owner: "have a side page to our app reference all words in there, it must allow
  alphabetical exploration, simple search … That's for step one (include it in 3.4)". Lazy-loaded,
  offline, `src/styles/` only, keyboard use; out: editing, word popups, the API. D389's "no
  player-facing behaviour" now describes the structural review only. Opens O239–O246. Now in:
  [lexicon page](../../versions/v3/lexicon-page.md#2-settled), [v3.4](../../versions/v3/README.md#the-lexicon-page-d393).

- **D394 (2026-10-21): the lexicon page's only source is `docs/music/lexicon.md`.** The owner: "it
  must use existing md files and not duplicate information". Read at build time; no hand-copied
  list, no second list, no generated file committed; a lexicon edit shows with no other change,
  and a check proves it. Now in: [lexicon page §5](../../versions/v3/lexicon-page.md#5-the-single-source-d394).

- **D395 (2026-10-21): the lexicon becomes "a proper API" in v4 or v5, the version decided
  later.** The owner: "For later (v4 or v5 depending on how they goes) we will turn this in a
  proper API." Not specced. Now in:
  [roadmap](../../roadmap.md#the-lexicon-api--in-v34-d555).
