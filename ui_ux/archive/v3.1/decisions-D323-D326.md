# UI/UX Decisions

> **Archived 2026-10-21.** v3.1 (presets and embellishment figures) is released as version 3.1.0
> (tag `v3.1.0` at 55364e7). These are the decisions D323-D326, kept verbatim with their section
> headings: the step after the v3.0 release, then v3.1's approval, token-source pass and release
> gate. Live summary: [README.md](README.md). Relative paths in the entries were written from
> `ui_ux/`.

## After the v3.0 release, 2026-10-16

- **D323 — `token-source-v3.md` leaves the root; its correction in `versions/v3.0/` (2026-10-16;
  applies D220).** Every token and class it names is in `src/styles/`, shipped in 3.0.0, so the
  root copy is removed (frozen in `versions/v3.0/token-source-v3.md`) and the handoffs cite the
  token source alone: root `screens/` session-list, your-data, my-instrument, last-session-review
  and preset-sheet, `token-source-v3.1-v3.2.md`, `README.md`. A recorded correction gives the four
  `versions/v3.0/` handoffs the same wording and its `README.md` the released status.

## The v3.1 approval, 2026-10-19

- **D324 — v3.1's design approved and frozen in `versions/v3.1/` (2026-10-19; the owner's ruling,
  the v3.1 build plan's gate D0).** The owner approved the v3.1 design: D225-D251's v3.1 part,
  everything marked `[v3.1 new]`, `[v3.1 changed]` or `_v3.1 …:_` at the root. v3.2 (Q73-Q75
  open) and v3.3 are not approved. The copy, as D225 took v3.0's: every tier document, marks
  kept, with v3.2's and v3.3's tagged parts and the sections they open left out, `flows/jam/`
  omitted, the flow index's two rows v3.2 rewrote in place restored to v3.0's goals, and link
  paths adjusted; `token-source-v3.1.md` holds the v3.1 part of the token source document. The
  root and its marks are unchanged (cleared with v4, D225). Not allowed: the token pass (T1).
  The v3.1 build plan's links should point at `versions/v3.1/` (spec-writer, on its branch).

## The v3.1 build, 2026-10-20

- **D325 — v3.1's token-source pass allowed and applied (2026-10-20; the owner's ruling, spec
  D382, reversing spec D355; the v3.1 build plan's gate T1 and chunk 1).** As for v3.0 (Q66, D218,
  D220): part 1 of `token-source-v3.1-v3.2.md` is in `src/styles/theme.css` and `components.css`
  under `v3.1 new` / `v3.1 changed` comments, and marked applied there. Unchanged: v3.0's `v3 new`
  comments (cleared with v4) and `preset-status` (chunk 13 removes it). `choice-*` and
  `control-group-figures` join the selectors of the rules they copy, so the copies cannot drift.
  Settled while writing it: the row's `preset-actions` sits a label line plus the field gap
  lower, and keeps that offset if it wraps under the field; `control-group-intro` takes
  `--spacing-3` below it, as the group's `h3`.

- **D326 — v3.1 release gate: no v3.1 handoff names a class or token missing from `src/styles/`
  (2026-10-21; the v3.1 build plan's chunk 21).** Every class and token in `versions/v3.1/`'s
  handoffs and `token-source-v3.1.md` is in `theme.css` or `components.css`, and so is every class
  the components use (chunks 13, 14, 17, 18 included); `preset-status` is gone from `src/`.
  Recorded correction, in `versions/v3.1/` and the root alike (allowed by the wave driver): the
  preset during "After `Start with this phrase`" now names `preset-select`, not `preset-status` and
  the musical profile's `radiogroup` (`screens/phrase-workspace/`, `flows/play-session/`
  handoffs), and the passing-and-neighbor rule spec D378 rejected is gone: every level is always
  selectable (the Embellishments section and change block, the figure step).
