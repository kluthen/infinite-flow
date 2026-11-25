# Open Questions

Only questions that are truly open appear here. IDs are stable; new numbers come from
`doc-ids next ux Q` (Q65, Q78, Q79, Q88 and Q89 were never used). Closed questions are archived
verbatim:

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
- v3.3 (released as version 3.3.0): [Q77](archive/v3.3/open-questions-Q77.md), closed by spec
  D275 (ux D264).
- v3.4 (released as version 3.4.0) raised no question in this register: the lexicon page's
  questions were the spec tree's (spec O239–O246).

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

- **Q90 — does a short tablet still show both staff systems once the mix takes two lines?** The
  two fixed rows (D500) add one toolbar line above the staff from bp-tablet-landscape up, where
  the staff has no height fit (its frame keeps a fixed minimum) and the session's start jumps only
  when the staff's top is out of view. Rough sums from the token source put a landscape Android
  tablet in Chrome (about 720 CSS px tall) some 30 px short of the staff frame's bottom with the
  second line, and just inside it without. A bottom system cut at a session's start is a
  real-time reading failure (P1.G2): the hands are on the instrument. See
  `screens/phrase-workspace/handoff.md` (Responsive Behavior: The mix's lines; Start jump on the
  phone) and `flows/play-session/handoff.md` (What the Start Does: Jump). To settle by measuring
  the built toolbar on the reference tablet before the owner's approval, or at the latest at the
  token-source pass. If it fails, the remedy is `ux-writer`'s and must keep Stop in view at
  tablet sizes, where there is no compact Stop: a widened start jump that sends the header above
  was tried and dropped for that reason (D507). Candidates: the mix's rows beside the title only
  (never a third line), a tighter toolbar gap, or a smaller staff-frame minimum at tablet heights.
  Emulated at T0 (D508; headless Chromium, v3.4's built app with the second row injected, a
  1280 × 720 viewport): the rows stack beside the title from bp-tablet-landscape to about
  1470 px wide (side by side above that), so the toolbar grows by one `btn` plus `--spacing-2`
  (52 px) and the staff frame's bottom moves from 749 px (already 29 px below the viewport in
  v3.4) to 801 px; at 1280 px a phrase is one system, its ink ending at 621 px. The session's two
  systems were not measured (no session runs headless): the reference tablet still settles it.
