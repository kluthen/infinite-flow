# Open Questions

Only questions that are truly open appear here. Closed questions from the first release are
archived verbatim: [Q15](archive/v1/qna-Q15.md), closed by D37 (see `decisions.md`). IDs are
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
