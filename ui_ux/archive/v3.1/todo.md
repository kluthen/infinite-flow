# v3.1 UI/UX Work Record (Archived)

> **Archived 2026-10-21.** v3.1 (presets and embellishment figures) is released as version 3.1.0
> (tag `v3.1.0` at 55364e7). The live [`todo.md`](../../todo.md) points here. The text below this
> notice, up to "Archiving-pass addendum," is kept verbatim from the live tracker: from
> `## In Progress`, the v3.1-only items of the v3.1 and v3.2 block (unit P, the approval, the
> token-source pass, the release gate's class check); from `## Next Unit`, the v3.1 paragraph.
> The block's shared items (units W0 and R, the validation), the v3.2 and v3.3 work, the standing
> working rules and the items still pending stayed live. Paths were written from `ui_ux/`; one
> link path was repaired. A citation like "ux D324" or "Q71" refers to this tree's decision log
> and question register, archived here as [decisions-D227-D234.md](decisions-D227-D234.md),
> [decisions-D323-D326.md](decisions-D323-D326.md) and
> [open-questions-Q71.md](open-questions-Q71.md), or live in
> [`decisions.md`](../../decisions.md); "spec D…" refers to the spec tree's.

## In Progress

**v3.1 (presets and embellishment figures) and v3.2 (Jam) design** (v3.1-only items)

- **Unit P — v3.1 core** (delegated): `flows/presets/` and `screens/preset-sheet/` (new);
  `screens/phrase-workspace/`, `flows/play-session/` and `flows/generate-phrase/` for v3.1.
  Governing: ux D227-D232. Written 2026-10-08 (details: ux D246).
- **v3.1 approved and frozen** (2026-10-19, ux D324): the owner approved the v3.1 design (the
  v3.1 build plan's gate D0); `versions/v3.1/` taken from the root without the v3.2 and v3.3
  parts, with `token-source-v3.1.md`. v3.2 still waits for the owner's review.
- **v3.1 token-source pass (T1)** (2026-10-20, ux D325): allowed by the owner (spec D382);
  applied as the v3.1 build plan's chunk 1, part 1 of `token-source-v3.1-v3.2.md` written into
  `src/styles/theme.css` and `components.css` and marked applied there. `preset-status` and
  `preset-status-text` stay until chunk 13 removes them.
- **v3.1 release gate, class check** (2026-10-21, ux D326, chunk 21): confirmed, nothing missing.
  Its recorded correction (stale `preset-status` wording, the rejected passing-and-neighbor rule)
  is applied in both `versions/v3.1/` and the root.

## Next Unit

v3.1: approved and frozen in [`versions/v3.1/`](../../versions/v3.1/README.md) (ux D324); its build reads
that copy. A correction to match what v3.1 ships goes into both the copy and the root, recorded in
`decisions.md`. Its token-source pass is applied (ux D325).

## Archiving-pass addendum (2026-10-21)

New text, written during the archiving pass. Everything above is unchanged; this records what was
found true when the record was archived.

- **Released.** v3.1 passed its release gate (build plan chunk 21) and shipped as version 3.1.0,
  tag `v3.1.0` at 55364e7, on 2026-10-21 (spec D397). Every chunk was merged and built; chunk 20
  was dropped (spec D378).
- **`preset-status` and `preset-status-text`** ("stay until chunk 13 removes them") are gone:
  chunk 13 removed them from `components.css`, which the release gate's class check confirmed (ux
  D326).
- **"its build reads that copy"** (`## Next Unit`): the build is over. `versions/v3.1/` is now
  the design as v3.1 shipped; this pass recorded its released status and pointed its preset sheet
  at the token source alone, with the same change at the root (ux D327).
- **Still to come after the release:** the owner's hand checks v3.1 H3, H4 and H5 (spec D397).
  A finding that changes the design is corrected in `versions/v3.1/` and the root, recorded in
  `decisions.md`; the live `todo.md` carries the item.
