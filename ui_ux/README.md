# Infinite Flow UI/UX

This design set defines the interface for Infinite Flow, a client-side web practice partner for a
monophonic instrumentalist. Its first release (v1.0) generates and reads one four-measure phrase
for a C MIDI keyboard, B-flat tenor saxophone, or E-flat alto saxophone profile; the phrase is the
product, controls support it, and notation receives the largest share of space at every supported
landscape viewport. v2 ("Rolling Phrase," `specs/versions/v2/master-spec.md`) turns that static
phrase into a continuous, MIDI-acknowledged session with backing audio and a review/export step,
built as an extension of the same screen and flow rather than a new top-level IA. v2 design work is
in progress; see `todo.md` for exactly what is written, what is designable now, and what is blocked
on `spec-writer`.

## Released versions and work in progress

- `versions/<version>/` holds each released version's design exactly as it shipped, frozen, with a
  `README.md` summarizing the decisions worth keeping. `versions/v1/` is the first release.
- Everything outside `versions/` and `archive/` is work in progress toward the next version. It
  covers the whole interface, not only what the next version adds: a screen the next version
  extends is specified here in full, old behavior included. When a version's design is approved,
  a copy of it goes into `versions/<version>/`, and the work at the root continues toward the one
  after.
- What the version in progress adds, changes and removes is marked, so the unchanged part never
  has to be read to find it. A document that differs from its copy in `versions/` opens with a
  **Changes since v1** block, one line per item linking to where it sits; the spot itself carries
  a **[v2 new]** or **[v2 changed]** tag (in a code block or stylesheet, the same words as an
  annotation or comment). Removals are listed only in that block, pointing to the old wording in
  `versions/`. A document new in v2 says so under its title. `grep -rn "v2 new\|v2 changed"`
  finds every mark. The marks stay until design work on the version after starts; the copy in
  `versions/` keeps them.

## Map

- `strategy.md` explains the product shape, visual direction, and shared state policy.
- `src/styles/theme.css` and `src/styles/components.css` (in the application repo, imported by `src/styles/index.css`) are the canonical themeable token and component vocabulary. `versions/v1/ui_common.css` is a frozen design reference kept only for the v1 mockup; it is not imported by the app and is not buildable truth.
- `motion.md` defines the limited motion policy.
- `versions/v1/mockups/` contains the interactive v1 phrase-workspace review prototype, styled from the frozen `versions/v1/ui_common.css` reference.
- `flows/generate-phrase/` specifies the explicit four-measure generation journey.
- `screens/phrase-workspace/` specifies the shared workspace screen.
- `flows/controller-connection/` specifies the MIDI controller connection and transposition-check journey.
- `screens/controller-connection/` specifies the connection sheet screen that flow traverses.
- `open-questions.md`, `decisions.md`, and `todo.md` are working registers. Read `todo.md` before extending this set.
- `archive/v1/` holds the closed first-release (v1.0) working record: the complete decision log,
  the closed question that record answers, and the finished work tracker. The live registers above
  stay current; the archive is kept verbatim and is never edited further.

## How future UI changes flow

- A token or component-style change is decided here, in the `ui_ux` handoff documents (this design set).
- The ux-writer then updates `src/styles/theme.css` and `src/styles/components.css`, which it owns as the canonical production token and component-class source from this point forward.
- Application code consumes those classes and tokens and never inlines a raw visual value.
- The v1 mockup and its `ui_common.css` are frozen with the rest of `versions/v1/` and are never updated; a later production styling decision leaves them stale, and that staleness is expected rather than an error.
