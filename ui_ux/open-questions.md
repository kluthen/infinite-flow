# Open Questions

Only questions that are truly open appear here. IDs are stable; numbering continues from Q65.
Closed questions are archived verbatim:

- First release (v1.0): [Q15](archive/v1/open-questions-Q15.md), closed by D37.
- v2 (released as version 2.0.0): [Q17–Q64](archive/v2/open-questions-Q17-Q64.md), every one
  closed; each entry names what closed it.

Decision IDs cited here (D37, D100, …) refer to this tree's decision log; archived ones resolve
through the header of [`decisions.md`](decisions.md).

- **Q16 — the guaranteed exit Q15/D37 relies on (switching instrument profile) is not signposted from either notation-error state, and is a heavy action for a player who does not want to change instruments.** Both **Notation error** and **Notation error over a retained generation failure** in `screens/phrase-workspace/handoff.md` name only `Retry notation` as their action; nothing in either state's copy tells the player that switching instrument profile (available the whole time, since controls stay editable) will also clear the error, one way or another. A tenor player stuck on a repeatedly-failing `Retry notation` has no visible hint that switching to another profile and back is an available escape, and doing so costs two full regenerations to get back to their own instrument. Not decided here — options range from leaving it undocumented (current state, technically correct but undiscoverable) to adding a hint in the notation-error copy pointing at instrument profile as a fallback, to a dedicated "start over" action. Lower priority than Q15 was, since a way out now exists either way; this is about whether players can find it.

  **User input (2026-09-26).** Instrument-switch-as-escape "makes little to no sense from the
  user's point of view when he doesn't change instrument" — it is not an acceptable player-facing
  answer to a recurring notation error, even though it technically clears the state. The direction
  the user wants explored instead is a **generation action reachable from the notation-error
  states themselves** (rather than routing the player through an unrelated control). Q16 stays
  open: this narrows the design space but does not decide it. Deferred past v1.0; `ux-writer`
  designs the actual action and copy. Also logged as a deferred v2 item in
  [`specs/versions/v2/README.md`](../specs/versions/v2/README.md) (Direction, not yet scoped).
  Confirmed standalone (2026-09-27): the earlier note tying this to Q20 was a mistake — Q20 is now
  resolved, and an in-session notation failure structurally cannot occur at all (see the closed Q20
  entry, archived in [archive/v2/open-questions-Q17-Q64.md](archive/v2/open-questions-Q17-Q64.md)), so there is no in-session recovery path to reconcile this against. Q16 is entirely
  about the pre-session, Idle-only static workspace. **Updated 2026-09-28:** an in-session misfit
  can occur after all; ux D100 handles it as a failed generation attempt (retried, never a
  notation-error display), so Q16 stays Idle-only.

- **Q66 — May `ux-writer` apply v3.0's token-source pass to `src/styles/`?** **Closed
  2026-10-07 by ux D218** (the owner allows it; applied as build plan chunk 1, ux D220). The token source
  (`src/styles/theme.css`, `components.css`) is this tree's to maintain, but the v3.0 design pass
  was barred from application files. v3.0's new classes and tokens are therefore specified in
  `token-source-v3.md` (ux D179), and three earlier token-source chores wait with them: clearing
  the `v2 new` / `v2 changed` comments (ux D178), and the audio-mix comment fix (ux D177). Needs
  the owner's go-ahead for one `ux-writer` pass that edits those two files only; until then the
  build of v3.0's screens cannot style its new components.
- **Q67 — Behaviours the v3.0 master spec leaves open, settled here for `spec-writer` to confirm.**
  **Closed 2026-10-07 by ux D218** (confirmed into the master spec, spec D219, and approved by
  the owner, spec D221).
  Each is a recommendation the design is built on; the owner reviews them, and `spec-writer`
  writes the confirmed ones into the master spec:
  - ux D183: every unpinned session, not only the previous most recent one, is deleted when the
    next session is saved (§5.1).
  - ux D185: removing a session's last favorite never unpins it (§6).
  - ux D191: switching "Keep my played notes" on while reviewing the session that just ended keeps
    that session's played notes too (§5.3).
  - ux D195: `Delete everything` reloads the page into its first-visit state (§4.1).
  - ux D197: the first phrase waits for the saved settings; a read that fails or exceeds a short
    start-up wait starts from the defaults and saves nothing for that visit (§4.4).
  - ux D199: changing my instrument's transposition keeps its written range (§7.1, §7.2).
  - ux D201: the remembered controller is reattached at load only when the browser already allows
    MIDI access, never with a prompt (§7.3).
  - ux D214: my instrument's written range counts toward the staff's shared height; a bound on
    that range, with §14's stricter range check, would spare every instrument a taller staff
    (§7.1).
  - ux D209: `Disconnect` also forgets the remembered controller (§7.3).
  - ux D216: theme and audio-mix changes made during a session are saved at its end (§4.2 meets
    §13 item 7).
  - ux D202: after a load, the starting note starts nothing until the page's first click, tap or
    key press, because browsers do not let a page play sound before one (§7.3 meets v2's
    audio-unlock rule).
- **Q68 — Are a session's deletions offered in an outdated tab?** **Closed 2026-10-07 by ux
  D221** (spec D223, master spec v1.4 §4.3 and done item 14: no deletion of any kind, as
  recommended). An outdated tab deletes nothing
  (master spec §4.3). Your data now offers it no deletion (ux D219), but the session list's
  `Delete`, the review's `Delete session` and `Delete played notes`, and the confirmation that
  turning `Keep my played notes` off can open still appear there (`screens/session-list/`,
  `screens/last-session-review/`, `flows/kept-sessions/`). Recommended: absent in an outdated
  tab, like `Delete everything`, the workspace's notice already asking for a reload; the
  alternative, a deletion that only hides the session for this visit, would show the player a
  result the device does not hold. Pin, favorites and comments already apply in memory only
  while saving is off, which the notice says.
- **Q69 — In a visit whose saved data couldn't be read, are the review's in-memory deletions
  offered?** **Closed 2026-10-07 by ux D223** (spec D226, master spec v1.4 §4.4: absent, as
  recommended). For `spec-writer`. Master spec v1.4 §4.4 says `Delete everything` "is the only
  deletion it offers", and spec D224 records that as what the design already does. It is not
  quite: such a visit holds the session that just ended in memory, as after a failed save
  (`flows/kept-sessions/handoff.md`, Keeping at a Session's End), and that session's review
  offers `Delete session` (removing it from memory) and, once `Keep my played notes` is turned on
  there, `Delete played notes` (`screens/last-session-review/handoff.md`, States;
  `flows/kept-sessions/handoff.md`, Deleting a Session). Neither touches anything kept on the
  device. Recommended: absent in such a visit, as in an outdated tab (ux D221 removed them there,
  the session held in memory included), so that §4.4's wording holds literally and the two
  saving-off visits differ only by `Delete everything`. The alternative, keeping them because
  they delete nothing kept, needs §4.4 to say "the only deletion of saved data". Not applied
  until `spec-writer` settles it. (Raised with ux D222.)

## v3.1 and v3.2, for `spec-writer` (raised 2026-10-08)

Each is a gap or contradiction in master spec Part B or Part C. The design is built on the
recommended answer, marked provisional in `decisions.md`; the tier documents state it as designed
and change only if `spec-writer` settles otherwise.

- **Q70 — Turning Jam off "generates a phrase as at first load", but nothing is generated at
  first load.** Part C §C5.1 and done item 2 (and §C5.11 for a held doodle dropped with Jam out of
  effect) say that leaving Jam mode at Idle generates a phrase "as at first load". At first load
  the app generates nothing by itself: the workspace opens empty and the player asks for the first
  phrase with `Generate phrase` (v2 master spec's idle rules, "the player generates a phrase by
  hand"; `screens/phrase-workspace/handoff.md`, States, At load and Empty). The two readings
  differ: an automatic generation, or the empty workspace. Recommended: **the empty workspace,
  generating nothing until the player asks**, which is literally "as at first load", keeps v2's
  rule that at Idle only an instrument switch generates by itself, and costs one click. Applies to
  every way Jam mode leaves at Idle: the switch turned off, a controller lost, and a held doodle
  dropped while Jam is out of effect. Provisional design: ux D236.
- **Q71 — What does `Save changes` do to a player preset's key and mode restriction?** §B6.6
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
- **Q72 — Does a held doodle stay held after the Jam played on it ends?** §C5.11 lists what drops
  a held doodle (a change that discards pre-generated phrases, a lost controller, a reload) and
  says a session's end generates the next phrase; it does not say whether a Jam started from a held
  doodle drops it when it ends. Recommended: **it stays held** (nothing in §C5.11's list happens),
  so after that Jam's review the workspace again shows a phrase 1 written from it, with a fresh
  seed, ready to go round again; the review of that Jam also offers "Jam again on this doodle",
  which then simply keeps it. A doodle captured by a fresh Jam is never held by itself; only
  "Jam again on this doodle" holds one. Provisional design: ux D239.
- **Q73 — Does deleting a Jam session let go a doodle held from it?** §C5.11 lists what drops a
  held doodle and does not name the deletion of the kept session it came from; §C5.14 says
  deleting a kept Jam session deletes its doodle "in both forms", and v3.0's rule is that deleted
  data is gone. Recommended: **yes, the held doodle goes with its session** (Idle then shows Jam
  mode without a held doodle), so a deletion never leaves the doodle alive in memory, where a
  later Jam could put it back into a kept session. Provisional design: ux D247.
