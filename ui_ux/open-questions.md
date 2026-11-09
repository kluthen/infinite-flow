# Open Questions

Only questions that are truly open appear here, with the closed question of a release not yet
shipped (Q77, for v3.3), which is archived at its release. IDs are stable; new numbers come from
`doc-ids next ux Q` (Q65, Q78 and Q79 were never used). Closed questions are archived verbatim:

- First release (v1.0): [Q15](archive/v1/open-questions-Q15.md), closed by D37.
- v2 (released as version 2.0.0): [Q17–Q64](archive/v2/open-questions-Q17-Q64.md), every one
  closed; each entry names what closed it.
- v3.0 (released as version 3.0.0): [Q66–Q69](archive/v3.0/open-questions-Q66-Q69.md),
  [Q76](archive/v3.0/open-questions-Q76.md) and [Q80](archive/v3.0/open-questions-Q80.md), every
  one closed; each entry names what closed it.
- v3.1 (released as version 3.1.0): [Q71](archive/v3.1/open-questions-Q71.md), closed by D249.
- v3.2 (released as version 3.2.0): [Q70 and Q72–Q75](archive/v3.2/open-questions-Q70-Q75.md)
  and [Q81–Q87](archive/v3.2/open-questions-Q81-Q87.md), every one closed; each entry names what
  closed it.

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
