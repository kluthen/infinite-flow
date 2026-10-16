# Open Questions

> **Archived 2026-10-16.** Q66-Q69, the v3.0 design's questions, are closed, and v3.0 is released
> as version 3.0.0. Kept verbatim; each entry names what closed it. Q65 was never used. Live
> summary: [README.md](README.md). Text was written from `ui_ux/`.

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
