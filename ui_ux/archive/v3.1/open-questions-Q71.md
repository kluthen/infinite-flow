# Open Questions

> **Archived 2026-10-21.** Q71, raised for v3.1, is closed, and v3.1 is released as version
> 3.1.0. Kept verbatim with its section heading and intro, which stay live over the v3.2
> questions. Live summary: [README.md](README.md). Text was written from `ui_ux/`.

## v3.1 and v3.2, for `spec-writer` (raised 2026-10-08)

Each is a gap or contradiction in master spec Part B or Part C. The design is built on the
recommended answer, marked provisional in `decisions.md`; the tier documents state it as designed
and change only if `spec-writer` settles otherwise.

- **Q71 — What does `Save changes` do to a player preset's key and mode restriction?** **Closed 2026-10-08 by ux D249** (spec D242, master spec updated: as recommended). §B6.6
  says "Saving asks for the restriction" under a table covering both save actions, while §B10
  lists the restriction choice for save as new only, and save changes as "replacing its values;
  no confirmation". When the player has opted out of the preset's restriction (key or mode
  outside it, so the selection is Custom based on it), keeping the old restriction would save a
  preset whose own key and mode lie outside it: it would show as selected now, but load as Custom
  after a reload under §B7's "values win" rule. Recommended: **`Save changes` asks nothing and
  keeps the preset's restriction while the key and mode are inside it** (the restriction in force
  is the preset's own, so "as now" is unchanged); **when they are outside it, `Save changes` asks
  the restriction with §B6.6's choices** ("as now", which is then any key and mode, the default,
  or "only this key and mode"), and the answer replaces the old restriction. Provisional design:
  ux D231.
