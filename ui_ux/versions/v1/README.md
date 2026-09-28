# v1 — First Release: UI/UX Design

Status: **released as `v1.0`** (2026-09-26). This folder is the design as it shipped, frozen: it
is never edited again. Work on later versions happens outside `versions/`, at the `ui_ux/` root.
The product scope of this version is in
[`specs/versions/v1/`](../../../specs/versions/v1/README.md); the working record that produced
this design (decision log, closed question, work tracker) is in
[`archive/v1/`](../../archive/v1/README.md).

## What v1 is

One screen, one flow. The player sets a musical direction, generates one four-measure phrase,
reads it on a staff in their instrument's own written pitch, and regenerates the whole phrase when
they want another idea. There is no time pressure and no scoring.

## The decisions worth keeping, and why

Each line is a v1 choice that later versions build on. Where a later version keeps the choice,
its own documents restate it; this list is the quick way to see where the v1 foundation lies.

- **The phrase is the screen's focal point.** The staff takes the full width of the first row on
  every supported landscape screen; controls sit below it and never take score width. A player
  reads from a distance, so engraving size wins over chrome.
  ([strategy](strategy.md#trade-offs), [screen intent](screens/phrase-workspace/intent.md))
- **One continuous staff over four measure cards.** It keeps the rhythm, harmony and
  question-and-answer shape of the phrase readable as one line.
  ([strategy](strategy.md#trade-offs))
- **Real engraving, never an approximation.** A notation font and conventional rules: key
  signature, accidentals, beams, ties, barlines, 4/4. A result that fails validation never
  replaces a good phrase, and a notation failure shows an error panel, never letter names posing
  as a score. ([strategy](strategy.md#engraving-policy),
  [screen handoff](screens/phrase-workspace/handoff.md#notation-contract))
- **Written pitch everywhere, with no display toggle.** Notes, key signature and chord symbols
  all read in the selected instrument's written pitch; the key is chosen in written pitch too.
  Every profile uses treble clef. ([strategy](strategy.md#trade-offs),
  [flow intent](flows/generate-phrase/intent.md))
- **Whole-phrase generation only.** A control change never touches the phrase on screen until the
  player asks for a new one; the replacement arrives complete, never measure by measure.
  ([flow intent](flows/generate-phrase/intent.md), [flow handoff](flows/generate-phrase/handoff.md))
- **Switching instrument always regenerates.** The old phrase is never carried over or transposed
  to fit; the written key and every other control are kept, with a fresh phrase in the new
  instrument's range. ([strategy](strategy.md#edge-case-policy),
  [flow handoff](flows/generate-phrase/handoff.md))
- **Controls named by musical outcome.** Grouped by the musical decision they shape (foundation,
  rhythm, melodic shape, character), with named choices instead of knobs or unlabelled sliders.
  ([strategy](strategy.md#mental-model), [screen handoff](screens/phrase-workspace/handoff.md#components-and-content))
- **Failures keep what the player already has.** A failed generation keeps the previous phrase
  with a retry beside it; loading never blanks the staff.
  ([strategy](strategy.md#edge-case-policy), [screen handoff](screens/phrase-workspace/handoff.md#states))
- **Landscape only on phones and tablets.** Portrait shows a rotate-device message rather than an
  unreadable staff. ([screen handoff](screens/phrase-workspace/handoff.md#responsive-behavior))
- **Motion only to show a phrase being replaced.** A short fade, with the frame never moving; no
  animated notes, no scrolling staff; instant under reduced motion. ([motion](motion.md))
- **A themeable token system.** Light and dark palettes carried by semantic tokens, an 8pt grid,
  named breakpoints, and a state matrix for every component.
  ([mockup stylesheet](ui_common.css))

## Contents

| Document | What it is |
| --- | --- |
| [strategy.md](strategy.md) | Product shape, mental model, visual direction, trade-offs, engraving and edge-case policy |
| [motion.md](motion.md) | Motion and effects rules |
| [flows/generate-phrase/](flows/generate-phrase/intent.md) | The generate-and-regenerate flow: [intent](flows/generate-phrase/intent.md), [handoff](flows/generate-phrase/handoff.md) |
| [screens/phrase-workspace/](screens/phrase-workspace/intent.md) | The one workspace screen: [intent](screens/phrase-workspace/intent.md), [handoff](screens/phrase-workspace/handoff.md) |
| [mockups/](mockups/README.md) | Interactive review prototype of the workspace |
| [ui_common.css](ui_common.css) | The design-token and component reference the mockup uses |

The styles v1 actually shipped with are `src/styles/theme.css` and `src/styles/components.css` at
the `v1.0` tag; `ui_common.css` is the earlier design reference the mockup still uses, and differs
from them in places. The screen handoff here includes one correction made after the tag so that it
matches the shipped code.
