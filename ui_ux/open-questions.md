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
