# Open Questions

> **Archived 2026-11-22.** Q77, raised for v3.3 on 2026-10-12, was closed by spec D275 and kept
> live until v3.3's release; v3.3 is released as version 3.3.0 (tag `v3.3.0` at b2a0e3fa,
> 2026-11-18). Kept verbatim with its section heading. Live summary:
> [`archive/v3.3/README.md`](README.md). Text written from `ui_ux/`.

## v3.3, for `spec-writer` (raised 2026-10-12)

- **Q77 — At Strongly favored, does a triad replace one chord or the whole plan?** **Closed
  2026-10-12 by spec D275** (master spec Part D v1.1 updated: as recommended, the fallback is per
  phrase; Strongly favored must reach at least 3 in 4 chords as sevenths, measured and reported to
  `ux-writer`, done item 5). §D5.2 says
  Strongly favored "tries the seventh form first at every event; a triad appears only where the
  seventh form leads to no phrase", which reads per chord. §D5.3's search tries each plan "with its
  drawn seventh forms first, then the same plan as triads only", which falls back per plan: at
  Strongly favored a phrase is then either all seventh chords or all triads, finer fallbacks being
  `coding-leader`'s option only if the cost guard asks. The two read differently to a player, and
  the level's top label, **Mostly** (ux D254), promises a seventh on nearly every chord.
  Recommended: §D5.2 says "a phrase falls back to triads only where its seventh forms lead to no
  phrase", matching §D5.3, and the share of harmony events in their seventh form that the build
  records at Strongly favored (§D10, done item 5) is reported to `ux-writer`: if it is not a clear
  majority, the label is revisited (for example "Often" and "Very often" for the top two steps).
  No design change until then; the design stands on the recommended reading.
