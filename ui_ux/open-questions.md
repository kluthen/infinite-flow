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
