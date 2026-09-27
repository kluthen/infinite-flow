# UI/UX Work Status

## Complete

- First-release (v1.0) UI/UX: strategy, token system, motion policy, the generate-phrase flow and
  phrase-workspace screen, the review mockup, and the ISS-003/004/005 v1.0 gate updates (retired
  notation-mode/display-convention, unconditional profile-switch regenerate-or-clear, "Written
  key," "Rhythmic variety," dropped `Mixed` density, B-flat tenor saxophone default). Validated
  ALIGNED by `ux-critic` and confirmed implemented in production code. Archived record:
  [`archive/v1/todo.md`](archive/v1/todo.md); archived decisions:
  [`archive/v1/decisions-D1-D44.md`](archive/v1/decisions-D1-D44.md); archived closed question:
  [`archive/v1/open-questions-Q15.md`](archive/v1/open-questions-Q15.md).

## In Progress

- **v2 (Rolling Phrase) UI/UX — review/kickoff started 2026-09-27.** `specs/versions/v2/master-spec.md`
  (the sole, self-sufficient v2 handoff artifact, covering v2.0–v2.3) has been read in full against
  the existing v1.0 `ui_ux/` tree. D45 (`decisions.md`) fixes the information architecture: v2
  session mode extends the existing `screens/phrase-workspace/` screen and `flows/generate-phrase/`
  flow rather than forking a new top-level screen. No flow or screen documents have been written
  yet for v2 — this pass is grounding and open-question triage only. Six open questions were raised
  (`open-questions.md` Q17–Q22): Q17 is self-directed and still open. **Update 2026-09-27:**
  `spec-writer` answered Q18–Q21 (spec D109–D110 in `specs/decisions.md`, plus master-spec passages
  already covering Q19/Q20); `ux-writer` resolved Q22 itself (ux D46 in this tree's `decisions.md`).
  All five units that were waiting on them are now unblocked — see the list below. Q16, already open
  from v1.0, does **not** intersect with Q20 (that earlier note was a mistake, now corrected in
  `open-questions.md`); it remains its own separate, lower-priority item about the Idle screen only.

## Remaining — v2 design units, roughly in build order

Units below are not yet started. None is blocked on anything **except** where noted.

1. **Controller connection & transposition-check flow** (master-spec §8). **Written up
   2026-09-27** per `decisions.md` D47: `flows/controller-connection/intent.md` and `handoff.md`,
   `screens/controller-connection/intent.md` and `handoff.md`, plus the `phrase-workspace` header
   addition (`controller-status`, its three states, and the mid-session-loss state) in that
   screen's own `intent.md`/`handoff.md`. New Tier 2 surface added to `src/styles/components.css`
   (`.sheet`, `.sheet-backdrop`, `.sheet-header`/`.sheet-title`/`.sheet-close`,
   `.device-picker`/`.device-option`, `.controller-status`/`.status-dot`, `.sheet-actions`) and a
   new `--sheet-max-inline-size` token plus `--color-scrim` in `src/styles/theme.css`. **`ux-critic`
   verdict 2026-09-27: BLOCKED — not done.** Nothing in `ui_ux/` is committed yet (only `specs/`
   was, in b0951a7). Findings to address, all still open:
   (a) "controller falls silent" is conflated with "controller disconnected". Master-spec §7 keeps
   the 30-second timer running on silence; only an unplug (§8) disarms it. Fix the flow's
   intent/handoff and phrase-workspace's "Controller lost mid-session" state.
   (b) Spec gaps to route to `spec-writer`: whether the check note (or any note played while the
   sheet is open) starts a session and count-in; when exactly a device counts as "connected";
   and mid-session reconnect rules (timer re-arm, whether check notes are recorded, a modal
   hiding Stop and the audio mix). Also state explicitly that the `Connect controller` click is
   the §6 audio-unlock click.
   (c) Sheet accessibility: arrow keys commit a device choice; focus on state changes is
   undefined; Unsupported browser is never announced; the badge has no defined accessible name,
   and a mid-session loss is visual-only.
   (d) Check-result copy: no up/down direction; the octave suggestion can never be met (no
   profile has a whole-octave offset); profiles are not named; the octave-vs-semitone rule is
   unstated.
   (e) CSS: the `.sheet-actions` column stack sits in the wrong media block and is inverted
   across breakpoints; `.connection-status` is not visually hidden; `.sheet-body` is undefined;
   `--color-scrim` barely dims the page in dark theme.
   (f) **Fixed by the 2026-09-27 document-tree migration:** decision-ID leaks removed from
   `README.md` (was `index.md`), `flows/controller-connection/intent.md`,
   `screens/controller-connection/handoff.md`, `theme.css`, and `components.css`.
   (g) **Partly fixed by the same migration:** the ui_ux/specs decision-number collision is
   resolved — the two ui_ux decisions that had been numbered D111/D112 (accidentally continuing
   the _specs_ tree's counter instead of ui_ux's own D45) are renumbered D46/D47, and the
   Q18/Q21 citations now correctly point at spec D109–D110 in `specs/decisions.md` rather than at
   this tree's `decisions.md`. `README.md`'s Map now lists the controller-connection flow and
   screen. The two small errors in `open-questions.md` (was `qna.md`) are fixed: the v2 header
   wrongly said Q18–Q22 were all routed to `spec-writer` (Q22 was `ux-writer`'s own call; now
   says Q18–Q21), and Q17 cited "D45 below" when D45 lives in `decisions.md` (now "ux D45 in
   `decisions.md`"). **Still open, not a migration fix:** D47 (`decisions.md`) says the header badge
   converts to its permanent form "once ever connected", but the tier docs
   (`screens/phrase-workspace/intent.md` and `handoff.md`, `flows/controller-connection/intent.md`)
   say "once a connection has ever been attempted" — these are two different behaviors (a failed
   permission/no-device attempt vs. an actual successful connection) and picking between them is a
   design call for `ux-writer`, not something this migration pass resolves.
   (h) Missing states: a device plugged in or unplugged while the sheet is open; Requesting
   access while the browser's own permission prompt is waiting.
   Re-run `ux-critic` after (a)-(e), (g)'s remaining open item (attempted vs. connected; its other parts are fixed), and (h) are fixed.
2. **Session core-loop flow + rolling-display screen extension** (master-spec §3, §4, §6, §7 start/
   end mechanics; extends `screens/phrase-workspace/`). Blocked on **Q17** only (self-directed —
   ux-writer must settle the spatial presentation before writing this screen's handoff). **Q20 is
   resolved and no longer a blocker**: an in-session notation failure can structurally never occur
   (settings lock, §5, plus DoD item 11, §11), so there are no failure-state variants beyond the
   generation-failure ladder (§4), which is fully specified.
3. **Locked settings-sheet-during-session state** (§5). Mechanically specified (read-only controls,
   automatic changes apply with no highlight/scroll/shift); not blocked, but is a variant of unit 2
   and should follow it rather than precede it.
4. **Per-note acknowledgement live view** (§8: highlight-only, positive-only, played note never
   rendered). Fully specified; a state within unit 2's screen, not a separate unit.
5. **Audio mix controls** (backing/click on/off + volume, always reachable, §6). Fully specified;
   small, folds into unit 2.
6. **Last-session review + export, v2.0 slice** (§7). Fully specified for the base review (every
   phrase shown in order, favorites, MusicXML/MIDI export scopes) and the discard-with-confirmation
   rule. **Q18 resolved (spec D109): no repeat-marker element at all** — a failure-ladder repeat reads
   identically to any other phrase in the review. Not blocked.
7. **Review v2.1 additions**: played-notes toggle and the export-time played-notes opt-in checkbox
   (§7). Fully specified; extends unit 6.
8. **Adaptive tempo UI** (§10, v2.2). Mostly specified (unavailable-with-reason when no controller;
   flat schedule; ceiling; reset-on-end). **Q22 resolved (ux D46)**: the Idle screen carries a quiet,
   non-comparative "reached tempo" reference from the previous session when adaptive tempo was
   used; placement, copy, and the empty case are this unit's own to settle when written up.
9. **End-of-measure chord-fit check presentation** (§9, v2.3). Master spec explicitly hands this
   presentation decision to `ux-writer` ("a UI/UX design decision, not specified here") — fully
   ours to design, sequenced last since it ships in v2.3.
10. **Settings-mutation flag UI** (§5, v2.1). Scope, magnitude, and invalid-combination handling are
    settled; the flag's own on/off control and locked-sheet behavior are covered by unit 3. **Q19
    resolved** — this was already answered in `master-spec.md` §5 itself (the settings panel just
    reflects the new value, unannounced, with no highlight/scroll/shift): no affordance beyond the
    plain toggle to design. Still blocked on the master spec's own still-open cadence/default-state
    item (§12) for copy that mentions cadence.
11. **Multi-phrase tension arc** (§3, v2.2). **Q21 resolved (spec D110): yes, it gets a visible on/off
    control**, on the same footing as the settings-mutation flag and adaptive tempo. No longer
    blocked on whether a surface exists — the open design task is now the control's placement, copy,
    and presentation, which is entirely ours to settle when this unit is written up.

- Revalidate only if a specification refinement changes settled UI behavior, controls, or states.
- **Q16** (`open-questions.md`): design a generation action reachable from the notation-error states
  themselves, replacing the undiscoverable instrument-profile-switch escape. Stands alone — it does
  **not** intersect with Q20 (Q20 is resolved: an in-session notation failure structurally cannot
  occur, so there is nothing to reconcile against). Still open, still lower priority, still about
  the Idle-only static workspace.

## Next Unit

All of Q18–Q22 are now resolved (spec D109–D110, ux D46), unblocking units 6, 8, 10 (partially), and 11. Unit 1
— the controller connection & transposition-check flow — is now written up (see above) and awaits
an `ux-critic` pass. Unit 2 (session core-loop flow + rolling-display screen extension) is next in
build order but stays blocked on Q17 (self-directed) — settle that before or alongside it.

**ux-critic plan read (2026-09-27), to weigh before continuing:**

- Q17 is on the critical path and is less open than it looks. §4 requires part of the next phrase
  to be visible while the current phrase's last measure plays, which rules out replacing the
  single system in place. `motion.md`'s "do not scroll the staff" will need a v2 revision.
- D45's grounds support keeping Idle and the session on one screen, but not the Review. Revisit
  the Review part before unit 6.
- Unit 8 (adaptive tempo) depends on unit 1's still-undefined meaning of "connected".
