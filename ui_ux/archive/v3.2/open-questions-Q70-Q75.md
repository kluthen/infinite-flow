# Open Questions

> **Archived 2026-11-09.** Q70 and Q72-Q75, raised for v3.2 on 2026-10-08, are closed, and
> v3.2 is released as version 3.2.0. Kept verbatim with their section heading and intro (Q71 is
> archived with v3.1). Live summary: [README.md](README.md). Text was written from `ui_ux/`; it
> holds no link.

## v3.1 and v3.2, for `spec-writer` (raised 2026-10-08)

Q71, the one v3.1 question, is archived with v3.1's release (see the list above).

Each is a gap or contradiction in master spec Part B or Part C. The design is built on the
recommended answer, marked provisional in `decisions.md`; the tier documents state it as designed
and change only if `spec-writer` settles otherwise.

- **Q70 — Turning Jam off "generates a phrase as at first load", but nothing is generated at
  first load.** **Moot since 2026-10-21 (ux D341):** leaving Jam mode now
  returns session mode as it was (spec jam-mode §2). **Closed 2026-10-08 by ux D249** (spec D243, master spec updated: as recommended). Part C §C5.1 and done item 2 (and §C5.11 for a held doodle dropped with Jam out of
  effect) say that leaving Jam mode at Idle generates a phrase "as at first load". At first load
  the app generates nothing by itself: the workspace opens empty and the player asks for the first
  phrase with `Generate phrase` (v2 master spec's idle rules, "the player generates a phrase by
  hand"; `screens/phrase-workspace/handoff.md`, States, At load and Empty). The two readings
  differ: an automatic generation, or the empty workspace. Recommended: **the empty workspace,
  generating nothing until the player asks**, which is literally "as at first load", keeps v2's
  rule that at Idle only an instrument switch generates by itself, and costs one click. Applies to
  every way Jam mode leaves at Idle: the switch turned off, a controller lost, and a held doodle
  dropped while Jam is out of effect. Provisional design: ux D236.
- **Q72 — Does a held doodle stay held after the Jam played on it ends?** **Closed 2026-10-08 by ux D249** (spec D244, master spec updated: as recommended). §C5.11 lists what drops
  a held doodle (a change that discards pre-generated phrases, a lost controller, a reload) and
  says a session's end generates the next phrase; it does not say whether a Jam started from a held
  doodle drops it when it ends. Recommended: **it stays held** (nothing in §C5.11's list happens),
  so after that Jam's review the workspace again shows a phrase 1 written from it, with a fresh
  seed, ready to go round again; the review of that Jam also offers "Jam again on this doodle",
  which then simply keeps it. A doodle captured by a fresh Jam is never held by itself; only
  "Jam again on this doodle" holds one. Provisional design: ux D239.
- **Q73 — Does deleting a Jam session let go a doodle held from it?** **Closed 2026-10-21 by
  spec D408 as recommended (ux D341):** the doodle Jam mode keeps goes when its kept session is
  deleted. §C5.11 lists what drops a
  held doodle and does not name the deletion of the kept session it came from; §C5.14 says
  deleting a kept Jam session deletes its doodle "in both forms", and v3.0's rule is that deleted
  data is gone. Recommended: **yes, the held doodle goes with its session** (Idle then shows Jam
  mode without a held doodle), so a deletion never leaves the doodle alive in memory, where a
  later Jam could put it back into a kept session. Provisional design: ux D247.
- **Q74 — Does a Jam on a held doodle that ends during its count-in keep the doodle?** **Closed
  2026-10-21 by spec D408 as recommended (ux D341):** a Jam on the kept doodle that ends before
  phrase 1 keeps it. §C5.13
  defines "ends as a count-in end" as including "the doodle is not held", and its Stop, hidden-tab
  and staff bullets are not limited to a fresh Jam; spec D244 says a Jam played on a held doodle
  keeps it. Recommended: **it keeps it** (the doodle was held before that Jam, nothing in §C5.11's
  list happened, and "not held" in §C5.13 describes a fresh Jam's doodle, which is never held by
  itself); Idle shows the same phrase 1 again, as after any count-in end. Provisional design: ux D251, in `flows/jam/handoff.md`, The Kept Doodle (so named since the re-scope).
- **Q75 — Is the "no mode fits" note shown once, or in every review of that Jam?** **Closed
  2026-10-21 as recommended (ux D341; spec jam-mode §8.3: Part C's wording stands).** §C6.3 says the
  review "says so plainly, once", and §C12 "the plain, once-only note". The design reads "once" as
  one plain statement, never repeated per note, shown in every review of that Jam session, kept
  ones included, like the doodle's engraving it sits under. The other reading, shown only the
  first time the review opens, would need a stored "seen" flag on the kept session and would leave
  a later look at the session unexplained. Recommended: **every review, one sentence**.
  Provisional design: ux D251 (first settled in D246), in `screens/last-session-review/`.
