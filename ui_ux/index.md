# Infinite Flow UI/UX

This design set defines the first-release interface for generating and reading one four-measure phrase for a C MIDI keyboard, B-flat tenor saxophone, or E-flat alto saxophone profile. The phrase is the product: controls support it, and notation receives the largest share of space at every supported landscape viewport.

## Map

- `strategy.md` explains the product shape, visual direction, and shared state policy.
- `src/styles/theme.css` and `src/styles/components.css` (in the application repo, imported by `src/styles/index.css`) are the canonical themeable token and component vocabulary. `ui_common.css`, in this tree, is a frozen design reference kept only for the mockups; it is not imported by the app and is not buildable truth.
- `motion.md` defines the limited motion policy.
- `mockups/` contains the interactive phrase-workspace review prototype, styled from the frozen `ui_common.css` reference.
- `flows/generate-phrase/` specifies the explicit four-measure generation journey.
- `screens/phrase-workspace/` specifies the shared workspace screen.
- `qna.md`, `decisions.md`, and `todo.md` are working registers. Read `todo.md` before extending this set.
- `archive/v1/` holds the closed first-release (v1.0) working record: the complete decision log
  (D1-D44), the closed question that record answers, and the finished work tracker. The live
  registers above stay current; the archive is kept verbatim and is never edited further.

## How future UI changes flow

- A token or component-style change is decided here, in the `ui_ux` handoff documents (this design set).
- The ux-writer then updates `src/styles/theme.css` and `src/styles/components.css`, which it owns as the canonical production token and component-class source from this point forward.
- Application code consumes those classes and tokens and never inlines a raw visual value.
- `mockups/` and `ui_common.css` are updated only when the mockups themselves need to stay representative of the current design; otherwise a decision that changes production styling leaves the mockups and `ui_common.css` stale, and that staleness is expected rather than an error.
