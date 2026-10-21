# Open Questions

Only questions that are truly open appear here, with the closed questions of releases not yet
shipped (Q70 and Q72–Q75 for v3.2, Q77 for v3.3), which are archived at their own release. IDs
are stable; numbering continues from Q88 (Q65, Q78 and Q79 were never used). Closed questions are
archived verbatim:

- First release (v1.0): [Q15](archive/v1/open-questions-Q15.md), closed by D37.
- v2 (released as version 2.0.0): [Q17–Q64](archive/v2/open-questions-Q17-Q64.md), every one
  closed; each entry names what closed it.
- v3.0 (released as version 3.0.0): [Q66–Q69](archive/v3.0/open-questions-Q66-Q69.md),
  [Q76](archive/v3.0/open-questions-Q76.md) and [Q80](archive/v3.0/open-questions-Q80.md), every
  one closed; each entry names what closed it.
- v3.1 (released as version 3.1.0): [Q71](archive/v3.1/open-questions-Q71.md), closed by D249.

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
  itself); Idle shows the same phrase 1 again, as after any count-in end. Provisional design: ux D251, in `flows/jam/handoff.md`, The Held Doodle.
- **Q75 — Is the "no mode fits" note shown once, or in every review of that Jam?** **Closed
  2026-10-21 as recommended (ux D341; spec jam-mode §8.3: Part C's wording stands).** §C6.3 says the
  review "says so plainly, once", and §C12 "the plain, once-only note". The design reads "once" as
  one plain statement, never repeated per note, shown in every review of that Jam session, kept
  ones included, like the doodle's engraving it sits under. The other reading, shown only the
  first time the review opens, would need a stored "seen" flag on the kept session and would leave
  a later look at the session unexplained. Recommended: **every review, one sentence**.
  Provisional design: ux D251 (first settled in D246), in `screens/last-session-review/`.

## v3.2 after the re-scope, for `spec-writer` (raised 2026-10-21)

Behaviour gaps in `specs/versions/v3/jam-mode.md` found while designing Jam mode. Each is designed
on its recommended answer, marked provisional in `decisions.md`; the tier documents state it as
designed and change only if `spec-writer` settles otherwise.

- **Q81 — Arpeggio chaos in Jam.** jam-mode §3's table places every musical control but arpeggio
  chaos: it is neither Jam's own, nor taken from the doodle, nor listed as not in Jam.
  Recommended: **held at its default (Varied), not shown**, which keeps Jam's set small. Designed
  in `screens/phrase-workspace/` (Jam's controls; ux D333).
- **Q82 — Phrase 1 after a Jam setting changes, with a kept doodle.** D408 replaced the held
  doodle's list of changes that drop it: the doodle now stays through setting changes. Nothing says
  what happens to phrase 1 on screen, written from it under the old settings. Recommended: **any
  change of a Jam setting phrase 1 is written from (all but the tempo) rewrites phrase 1 from the
  kept doodle at once**, so Start never plays a phrase 1 the settings no longer describe and a Jam
  never meets the out-of-date phrase prompt; Jam's prepared phrases are discarded with it. Designed
  in `flows/jam/` (ux D336).
- **Q83 — The defaults of Jam's own settings.** jam-mode §3 says Jam's key and mode start from
  session mode's values the first time, and Part C gives Drift `Near`; nothing else is given.
  Recommended: **tempo from session mode's the first time, kept within 60–180 BPM; the rhythm lock
  off with no rhythm change allowed; Harmonic motion `Gentle diatonic`; Tension `Lift`;
  Embellishments `Rarely`** (one level for all seven figures, ux D333), the same values the
  session's defaults use where one exists. Designed in `flows/saved-data/` and the workspace.
  Also "Jam's defaults" for the controls taken from the doodle where it does not show them
  (§3: contour, leapiness, register, and any other of the seven a doodle may leave unsaid):
  recommended **session mode's first-visit values** (Arch, Shaped, Middle, and so on), shown in
  the readings as "{value} (default)" (ux D346).
- **Q84 — A doodle read as Sixteenth note density on a phone.** Below `bp-tablet-landscape`
  session mode never offers Sixteenth (the staff would not fit). Taken from the doodle (D406), the
  density could be Sixteenth there. Recommended: **taken as Eighth below `bp-tablet-landscape`**,
  the readings list saying "Eighth (Sixteenth on larger screens)". Designed in
  `screens/phrase-workspace/` (From your doodle).
- **Q85 — The instrument changed in Jam mode.** The instrument is shared (§3), and session mode
  returns "exactly as it was left" (§2), but its phrase on screen was written for the old
  instrument. Recommended: **on returning to session mode, an instrument changed meanwhile acts as
  an instrument switch made there**: the phrase regenerated, prepared phrases discarded, as session
  mode's idle rules already do. My instrument's range or clef saved from Jam mode likewise.
  Designed in `flows/jam/` (Leaving Jam mode).
- **Q86 — v3.3's Seventh chords in Jam.** Part D (v3.3) says a Jam gets seventh chords when the
  player raises the level; with Jam's own settings set (D406) the level is either Jam's own or
  absent. Recommended: **Jam's own level, after Harmonic motion in Jam's Foundation, default
  `Off`**, as Harmonic motion is Jam's own. Designed as a `v3.3 new` paragraph in
  `screens/phrase-workspace/`.

- **Q87 — Which kept session the kept doodle "comes from" once a Jam has been played on it.**
  D408 lets the doodle go when "the kept session it came from is deleted"; every session end
  deletes the unpinned sessions before it, so a Jam on the kept doodle would delete the session it
  came from and, read literally, let the doodle go after the second round. Recommended: **the
  doodle comes from the latest session played on it** (that session holds the same doodle as its
  own), so the save's replacement of an unpinned session never lets it go, and only the player's
  deletion of that latest session (or `Delete everything`) does. Designed in `flows/jam/` (What
  lets the kept doodle go) and `flows/kept-sessions/` (Deleting a Session); ux D346.

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
