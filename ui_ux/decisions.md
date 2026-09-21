# UI/UX Decisions

- **D1 — Phrase-first landscape workspace.** The four measures occupy the primary canvas, with controls in a secondary rail or bottom sheet, so reading notation is never displaced by setup. No prior question.
- **D2 — Four measures remain together.** The first release presents all measures in one non-scrolling phrase strip; it never turns the result into a rolling staff. No prior question.
- **D3 — Conventional, transposition-aware engraving.** The notation renderer receives semantic events and uses a SMuFL music font, correct rhythmic values, rests, beams, barlines, ties, accidentals, time signature, clef, and chord symbols; noteheads are never positioned from raw screen coordinates. No prior question.
- **D4 — Theme architecture separates semantic from palette tokens.** Light and dark modes swap semantic color values without changing component classes, leaving room for future themes. No prior question.
- **D5 — Fade-only phrase replacement.** Regeneration crossfades rendered phrase content after successful generation, while the staff frame stays stable to preserve reading position. No prior question.
- **D6 — Full-width phrase-first workspace.** The score occupies the complete primary row and receives maximum available width for distant reading. Controls follow it as a vertically scrolling, reoriented section rather than taking a desktop side rail. No prior question.
- **D7 — Warm music-desk visual direction.** Retain the warm paper, graphite, and brass identity for light mode, with its dark ink counterpart for dark mode; revise the workspace hierarchy to make the score still more dominant. Closes Q1.
