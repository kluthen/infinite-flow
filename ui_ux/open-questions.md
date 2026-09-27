# Open Questions

Only questions that are truly open appear here. Closed questions from the first release are
archived verbatim: [Q15](archive/v1/open-questions-Q15.md), closed by D37 (see `decisions.md`). IDs are
stable; numbering continues from Q17.

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
  entry below), so there is no in-session recovery path to reconcile this against. Q16 is entirely
  about the pre-session, Idle-only static workspace.

## v2 (Rolling Phrase) — opened 2026-09-27, reviewing `specs/versions/v2/master-spec.md`

Numbering continues from Q17. Q17 is a self-directed design question — `ux-writer` resolves it in
a future session, no `spec-writer` input needed. Q18–Q21 were routed to `spec-writer`; Q22 was
`ux-writer`'s own presentation call. All five were answered 2026-09-27 (see spec D109–D110 in
[`specs/decisions.md`](../specs/decisions.md), ux D46 in this tree's `decisions.md`, and the
master-spec passages cited below). Only Q17 remains open in this section.

- **Q17 — how the rolling display actually presents the phrase sequence on screen.** The master
  spec requires at least one measure of the next phrase visible as read-ahead at all times
  (`master-spec.md` §4), and requires that an automatic control change apply "with no highlight,
  scroll, or screen shift" (§5), but never states the spatial presentation itself: does the
  existing single four-measure staff system get replaced in place at each phrase turnover (closest
  to the v1 `phrase-workspace` pattern, per ux D45 in `decisions.md`), or does the session show a wider
  multi-phrase strip that a new phrase enters and an old one leaves? And however that's answered,
  is the read-ahead phrase visually distinguished at all from the currently-sounding one (e.g. by
  position alone vs. some quiet visual state), or does it read identically until its own turn
  comes? This blocks starting the Session core-loop flow and screen work. `ux-writer` will
  propose a default and settle it, not `spec-writer` — logged here only so it isn't lost.

### Closed — Q18–Q22 (answered 2026-09-27)

- **Q18 — is a failure-ladder repeat ever shown to the player, in the review or otherwise?**
  Answered: no. **Spec D109** — the review never visibly marks a repeated phrase; it stays internal
  bookkeeping (session history and export data already carry it per §7). No repeat-marker element
  is needed anywhere in the review screen. Closes the "can be stubbed" item on todo.md unit 6.

- **Q19 — does the settings-mutation flag (§5, v2.1) get any player-facing affordance beyond "it
  just changes"?** Answered: this was already settled in `master-spec.md` §5 itself and the
  question was raised in error — the settings UI "updates to stay truthful about what's currently
  in effect, but with no highlight, scroll, or screen shift." No affordance beyond the plain on/off
  toggle plus the settings panel reflecting the new value, unannounced. Nothing further to design
  beyond the toggle itself (todo.md unit 10) and the panel already reading correctly.

- **Q20 — how does an engraving (notation) failure behave inside a running session?** Answered: it
  cannot occur — no in-session notation-failure recovery path needs designing at all. Grounds:
  `master-spec.md` §5 (nothing manual can change settings mid-session — the settings lock) plus
  DoD item 11, §11 ("a rhythm-setting combination v1 already disallows can neither start nor be
  applied during a session") together mean any settings combination that would trigger v1's
  notation-error mode is either blocked at session start or never reached by an automatic
  mutation. §4's failure ladder is solely about generation failure (the algorithm not finding a
  valid phrase), a different, already-fully-specified thing. This does **not** intersect with Q16
  — Q16 (the static-workspace escape hatch) stays a separate, still-open, lower-priority item about
  the Idle screen only; the earlier note tying the two together was a mistake, now corrected.

- **Q21 — does the multi-phrase tension arc (§3, confirmed v2.2 scope) have any visible surface at
  all?** Answered: yes. **Spec D110** — it gets its own visible on/off toggle, on the same footing as
  the settings-mutation flag and adaptive tempo, not an invisible generation behavior like the
  existing single-phrase arc. The master spec only settles that a control must exist; the
  control's placement, copy, and any further presentation detail are `ux-writer`'s to design (see
  todo.md unit 11 — now an unblocked design task, not an open question).

- **Q22 — does the idle screen reference the tempo reached in the last session (adaptive tempo,
  §10, v2.2)?** This was `ux-writer`'s own call (pure presentation, no business-rule content).
  Resolved: yes, with a quiet, non-comparative reference — see `decisions.md` D46 (ux).
