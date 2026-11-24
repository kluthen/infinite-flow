# v3.4 (the lexicon page) Archive

Status: archived 2026-11-24. v3.4 passed its release gate and is released as version 3.4.0: the
tag `v3.4.0` is at 17e631e4, 2026-11-24. See the
[release notes](../../../docs/release/v3.4-release-notes.md). By the owner's go (spec D578, as
spec D541 for v3.3), H1, his look at the built lexicon page, follows the tag as a v3.4.x
follow-up; the live `todo.md` carries it. The spec tree archives the same milestone in its own
`specs/archive/`.

This is the UI/UX working record that belonged to v3.4: the lexicon page's design (its draft, the
owner's rulings, its adoption at the root and `ux-critic`'s pass), the token-source pass of gate
T0, and the two design questions of its build. v3.4 raised no question in this register; the
page's questions were the spec tree's (spec O239–O246). D498, which froze v3.4's design in
[`versions/v3.4/`](../../versions/v3.4/README.md) at the release, stays live until H1 is done,
since a finding there may correct the frozen copy. D480-D486 (v3.2's and v3.3's checks after
their tags, the root–suffix follow-up, the format rule) stay live as before. The same tier
documents stay live at the `ui_ux/` root as the cumulative design the next release builds on,
with v3.4's marks until the next version's design starts.

## Archived here

- [decisions-D487-D497.md](decisions-D487-D497.md): decisions D487-D497, kept verbatim with their
  section headings: the lexicon page's first draft, v3.4's design starting at the root, and the
  token-source pass with the build's design questions.
- [todo.md](todo.md): the finished v3.4 items of the work tracker (the whole `## In Progress`
  section, which held only v3.4's work, and the v3.4 `## Next Unit` paragraph), kept verbatim
  with four link paths repaired, plus a dated addendum recording what this pass found true.

## Where D487-D497 now live as settled fact

Documents are named from `ui_ux/`. Each lives at the root (the live, cumulative design) and, as
shipped in v3.4, in `versions/v3.4/`.

| Decisions                                                               | Live document                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D487 (the first design as a draft in `drafts/lexicon-page/`)            | **history**: the draft was adopted at the root by D490 and its folder is gone; its minor choices (entries opened in place, letters as links, focus by pointer type) are in `screens/lexicon-page/`                             |
| D488 (v3.4's design starts at the root; the v3.0 to v3.3 marks cleared) | `README.md` (Released versions and work in progress), `versions/v3.4/README.md`; the marks themselves in `versions/v3.3/`                                                                                                      |
| D489 (the owner's rulings: all four choices yes)                        | `screens/lexicon-page/handoff.md`, `flows/look-up-a-word/`; the two lexicon follow-ups are **history**, made as the lexicon's v1.9 pass (spec D560)                                                                            |
| D490 (the draft adopted at the root)                                    | `screens/lexicon-page/`, `flows/look-up-a-word/`, `screens/phrase-workspace/handoff.md` (Footer), `strategy.md`, `flows/saved-data/handoff.md`; the prototype `mockups/lexicon-page/`, the research `research/lexicon-page.md` |
| D491 (`ux-critic` on v3.4's design: five findings, then two more)       | `flows/look-up-a-word/handoff.md` (Routing Rules), `screens/lexicon-page/handoff.md`, `strategy.md`, `motion.md`, `flows/play-session/handoff.md`; the pass is history                                                         |
| D492 (the lexicon page's classes from existing tokens)                  | `screens/lexicon-page/handoff.md`, `src/styles/components.css` (its `v3.4 new` block)                                                                                                                                          |
| D493 (the footer's two buttons in `footer-actions`)                     | `screens/phrase-workspace/handoff.md` (Layout Tree; Responsive Behavior: Footer), `src/styles/components.css`                                                                                                                  |
| D494 (Part E's two flow points)                                         | `flows/look-up-a-word/handoff.md` (Routing Rules: Opening; The browser's Back button)                                                                                                                                          |
| D495 (`ux-critic` on gate T0: `#lexicon` under an open sheet)           | `flows/look-up-a-word/handoff.md` (Routing Rules), `README.md`; the ask to `spec-writer` is **history**, taken by spec D567                                                                                                    |
| D496 (the matches' visually hidden `h3`)                                | `screens/lexicon-page/handoff.md` (Layout Tree; How Search Works: Matches heading; Components and Content: Heading outline), `src/styles/components.css`                                                                       |
| D497 (spec D568 mirrored in the flow)                                   | `flows/look-up-a-word/handoff.md` (Flow; Routing Rules: A session during the load, Under an open sheet), `screens/lexicon-page/handoff.md` (States: Loading)                                                                   |

## Left in place

| Document                                                                     | Role                                                                                                                                                                                                                         | Referenced from                                                                          |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `strategy.md`, `motion.md`, every `flows/` and `screens/` folder at the root | The live, cumulative design, v3.4 included, that the next release extends; it keeps v3.4's change marks until the next version's design starts                                                                               | `specs/versions/v3/` (Part E, build plan v3.4), `docs/release/v3.4-release-notes.md`     |
| `mockups/lexicon-page/index.html`, `research/lexicon-page.md`                | The lexicon page's clickable prototype and the research behind its design. v3.4-only artifacts, but left at the root rather than moved into `versions/v3.4/`: the master spec names the prototype by its path                | `specs/versions/v3/master-spec.md` (§E11), `screens/lexicon-page/intent.md`, `README.md` |
| [`versions/v3.4/`](../../versions/v3.4/README.md)                            | The v3.4 design as shipped, frozen by this pass (D498). H1 reads it; a finding that changes the design corrects it and the root alike, recorded                                                                              | `README.md`, `todo.md`                                                                   |
| `decisions.md`, `open-questions.md`, `todo.md`                               | The live registers, trimmed: decisions D480-D486 and D498; Q16 open; the standing rules, the checks after the v3.2, v3.3 and v3.4 tags, the root–suffix follow-up, the items carried forward and the options-panel side work | `specs/` (ux decision IDs, resolved through the registers' headers), `docs/release/`     |
