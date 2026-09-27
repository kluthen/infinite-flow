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
   verdict 2026-09-27: BLOCKED — not done.** The unit is committed as work in progress (90fec80;
   the migration in a2025c0 followed), not as finished. Findings to address, all still open:
   (a) "controller falls silent" is conflated with "controller disconnected". Master-spec §7 keeps
   the 30-second timer running on silence; only an unplug (§8) disarms it. Fix the flow's
   intent/handoff and phrase-workspace's "Controller lost mid-session" state. **User input
   2026-09-27 changes the §8 rule itself (a 30-second reconnection window, a clearly visible
   disconnection, no connecting during a session) — logged as Q23 for `spec-writer`; the
   mid-session-loss state waits on it. The silence/unplug split can be fixed now.**
   (b) Spec gaps to route to `spec-writer`: whether the check note (or any note played while the
   sheet is open) starts a session and count-in; when exactly a device counts as "connected";
   and mid-session reconnect rules (timer re-arm, whether check notes are recorded, a modal
   hiding Stop and the audio mix). Also state explicitly that the `Connect controller` click is
   the §6 audio-unlock click. **Now logged as Q23 (reconnect rules) and Q24 (which note starts a
   session; user input differs from §6), both for `spec-writer`.**
   (c) Sheet accessibility: arrow keys commit a device choice; focus on state changes is
   undefined; Unsupported browser is never announced; the badge has no defined accessible name,
   and a mid-session loss is visual-only. **Settled by D49 (user's call): screen readers are not a
   target; arrows only move; focus goes to the new state's main action, and to Start/Stop on
   close; "announced" means a clear visible message.**
   (d) Check-result copy: no up/down direction; the octave suggestion can never be met (no
   profile has a whole-octave offset); profiles are not named; the octave-vs-semitone rule is
   unstated. **Settled by D50: wording rules within the three existing profiles.**
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
   design call for `ux-writer`, not something this migration pass resolves. **Settled by D48
   (2026-09-27, user's call): button until actually connected, or an error-toned badge once
   permission is refused. The tier docs still need updating to match.**
   (h) Missing states: a device plugged in or unplugged while the sheet is open; Requesting
   access while the browser's own permission prompt is waiting.
   Re-run `ux-critic` after (a)-(e), (g) (apply D48 to the tier docs), and (h) are fixed, and after
   `spec-writer` answers Q23/Q24. `spec-writer` was briefed on Q23/Q24 on 2026-09-27; the
   fix pass itself waits on the user confirming how the mid-session disconnect notice looks.
   **Update 2026-09-27:** the user answered everything (disconnect banner with live countdown,
   ux D51; count-in and start-note direction, ux D52, which belongs to unit 2). Spec D111–D118
   carry the rules; spec O78–O83 are being closed by `spec-writer`. Once it reports back, hand the
   whole unit-1 fix pass — (a), (c), (d), (e), (g) per D48, (h), and the D51 disconnect banner — to
   a fresh `ux-writer` delegate, then re-run `ux-critic`.
   **Status 2026-09-27: fixes applied, awaiting `ux-critic` re-run.** The delegate rewrote
   `flows/controller-connection/` and `screens/controller-connection/` (intent and handoff), the
   `controller-status` paragraph and component entry plus the silence / mid-session-loss /
   disconnect-slot states in `screens/phrase-workspace/`, and `src/styles/theme.css` /
   `components.css`. Execution details in D54. Per finding:
   (a) **fixed** — silence and unplug separated everywhere; loss state rewritten per D51/D53.
   (b) **fixed** — connect only between sessions, the check and anything played in the sheet never
   start a session, the Connect click unlocks audio, connected/lost defined, re-check only between
   sessions.
   (c) **fixed** — arrows only move in `device-picker` (now plain buttons, D54), focus to each
   state's main action and to Start/Stop on close; visible messages replace the hidden
   `connection-status` region, which is dropped.
   (d) **fixed** — D50 wording with direction, profile name, octave breakdown, controller setting
   first, full suggested-profile table.
   (e) **fixed** — `.sheet-actions` stacks by default and becomes a row from bp-tablet-landscape;
   `connection-status` removed; `.sheet-body` defined; `--color-scrim` has a dark value; new
   error-toned badge, disabled in-session badge, disconnect slot and banner classes.
   (f) fixed earlier. (g) **fixed** — D48 applied to all tier docs (button until connected or
   refused; MIDI-blocked badge in error tone; how to re-allow MIDI in the browser).
   (h) **fixed, proposed** — device plug/unplug while the sheet is open, and the "Waiting for your
   browser" sub-state of Requesting access; behaviors await confirmation as Q28.
   New open questions: Q26 (unplug/replug between sessions), Q27 (when the disconnect slot
   appears; settle with unit 2), Q28 (confirm (h)). Not done yet: `strategy.md`'s "Optional MIDI"
   edge-case bullet still says every connection state, including a mid-session loss, is neutral
   and never error-coloured — it contradicts D48/D51/D53 and must be updated before the re-run
   (outside this fix pass's file scope).
   **`ux-critic` re-run 2026-09-27: DRIFT** (nothing blocked). Findings: (1) D55 / spec D125
   (between-sessions reattach) not applied, and seven stale (proposed) tags from Q26/Q28; (2) the
   disconnect banner rendered "Session ends in23 s." (`.session-alert` flex split the sentence);
   (3) badge width not fixed across forms (D56); (4) flow intent called MIDI-blocked "the one
   error-toned state", and the post-MIDI-blocked header form contradicted D56; (5) the flow's
   "whose flow this is" did not name P1.G2 / P2.S1.
   **Status 2026-09-27: `ux-critic` third pass DRIFT (3 small findings) → fixed (ux D59); narrow
   confirmation pass found 2 placement slips → fixed, the critic's stated condition for ALIGNED.
   Confirmed done by the user 2026-09-27 and committed; unit 1 is complete.** Second fix pass
   (historical): All five fixed:
   (1) between-sessions unplug/replug written into the flow intent (new section), the flow
   handoff's header table, routing rules and a new diagram, and phrase-workspace's no-controller
   badge; the seven Q26/Q28 tags removed; Q29's two cases written as (proposed); Q27's slot tag
   kept. (2) New `session-alert-text` wrapper (Layout Tree and CSS) holds the sentence as one
   inline run, countdown inline in it. (3) `--controller-status-label-max-inline-size` replaced by
   `--controller-status-label-inline-size` (24ch, fixed); stated in phrase-workspace intent,
   handoff (Components and Responsive). (4) both fixed. (5) personas named. New: Q30 (selection
   kept or not when unplugged while the sheet is open). `decisions.md` D54 still names the old
   token; not yet logged: the token rename and `.session-alert-text`.
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

- **`strategy.md` persona alignment** (found by `ux-critic`, 2026-09-27): the strategy predates
  `specs/personas.md` and cites no persona or goal. Its problem-alignment, context-of-use and
  trade-off sections need a pass naming P1 (the Curious Improviser, primary) and P2 (the Speed
  Builder), their goals, and where they pull apart. A Tier 1 revision, done in dialogue with the
  user, not delegated. Do it before or alongside unit 2.
- Revalidate only if a specification refinement changes settled UI behavior, controls, or states.
- **Q16** (`open-questions.md`): design a generation action reachable from the notation-error states
  themselves, replacing the undiscoverable instrument-profile-switch escape. Stands alone — it does
  **not** intersect with Q20 (Q20 is resolved: an in-session notation failure structurally cannot
  occur, so there is nothing to reconcile against). Still open, still lower priority, still about
  the Idle-only static workspace.

## Next Unit

Unit 1 (controller connection & transposition check) is **done** — `ux-critic` ALIGNED after
three passes, confirmed by the user, committed 2026-09-27. Next, in this order:

1. **`strategy.md` persona pass** (see the Remaining list): short, in dialogue with the user.
2. **Settle Q17** (rolling-display presentation) with the user — ux-writer proposes a default.
3. **Unit 2** (session core loop + rolling display, extending `screens/phrase-workspace/`). It now
   also carries ux D52 (on-screen count-in beats, the starting-note line — hidden when no
   controller is connected, as proposed to the user), Q27 (when the disconnect slot appears), and
   the Start/Stop button that the controller-connection sheet sends focus to.

**ux-critic plan read (2026-09-27), to weigh before continuing:**

- Q17 is on the critical path and is less open than it looks. §4 requires part of the next phrase
  to be visible while the current phrase's last measure plays, which rules out replacing the
  single system in place. `motion.md`'s "do not scroll the staff" will need a v2 revision.
- D45's grounds support keeping Idle and the session on one screen, but not the Review. Revisit
  the Review part before unit 6.
- Unit 8 (adaptive tempo) depended on unit 1's meaning of "connected" — now defined (spec §8).
