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
- `versions/v1/` (2026-09-28, D60): the v1 design as shipped, frozen, with a summary README; the
  mockup and `ui_common.css` moved into it. The stale path in the comment in
  `src/notation/notation-layout-policy.ts` was fixed by `coding-executor` in the same change (it now
  names `src/styles/theme.css`, the breakpoint's real source).

## In Progress

- **v2 (Rolling Phrase) UI/UX — review/kickoff started 2026-09-27.** `specs/versions/v2/master-spec.md`
  (the sole, self-sufficient v2 handoff artifact, covering v2.0, v2.1, v2.2 and v2.4; v2.3 was emptied by spec D174, and the real-hardware checks are v2.4's, spec D173, D180) has been read in full against
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
   end mechanics; extends `screens/phrase-workspace/`). **2026-09-28: written up** (ux D71–D85) as
   `flows/play-session/` plus the session states of `screens/phrase-workspace/`, with units 3, 4
   and 5 folded in; Tier 2 and `motion.md` updated. New questions Q38–Q43, all closed by the
   owner (ux D86–D92). **2026-09-28: D86–D92 applied** (delegate) to play-session, phrase-workspace,
   controller-connection, `strategy.md`, `motion.md` and the token source (new layout class
   `session-cue-actions`); new questions Q44–Q46, closed by the owner (ux D94–D97).
   **2026-09-28: D94–D97 applied** (delegate): one viewport-change rule (end when the staff can no
   longer be shown, else re-engrave in the held layout), focus order on sheet close, the phone's
   short disconnect wording (new class `session-alert-clause`), D93/D97 choices made settled. New
   question Q47 (a too-narrow end when the idle layout fails too). First `ux-critic` pass
   2026-09-28 found Q48, Q49 and two small marking/diagram fixes; the owner settled ux D98–D101.
   **2026-09-28: D98–D101 and the two critic fixes applied** (delegate): no start while the staff
   is not shown; `Retry notation` focus after a too-narrow count-in end (now settled, in the
   diagram); session staff layout fixed by breakpoint (split below `bp-tablet-landscape`) and a
   look-ahead misfit is a failed attempt with the normal retries; `--color-note-ack` has its own
   mid-tone green (ratios verified); banner-position mark; reattach-to-struggling edge. New
   question Q50 (phone phrase 1 on one system at Start), closed by the owner (ux D102, with D103
   settling three re-engrave behaviours). **2026-09-28: D102 applied** (delegate): below
   `bp-tablet-landscape` the staff is always engraved in the split layout, idle included, so
   Start never moves a note; the proposed Start re-engrave is gone from play-session,
   phrase-workspace, `motion.md` and `strategy.md` (phrase-workspace marked `[v2 changed]` against
   the v1 idle rule). Second `ux-critic` pass 2026-09-28 found Q51 (session view taller than a
   landscape phone), Q52 (waiting split-layout material not re-checked on a viewport change) and
   the misfit/struggling-notice wording; the owner settled ux D104–D106. **2026-09-28: D104–D106
   applied** (delegate): below `bp-tablet-landscape` the engraving scale fits the height (small
   viewport height) as well as the width, `staff-frame` loses v1's fixed minimum block size there
   (new tokens `--staff-systems-phone-block-budget`, `--staff-frame-padding`,
   `--staff-frame-border-width`, `--session-cue-row-gap`; phone rule in a width-only media block
   in `components.css`), and a floor that cannot fit the height counts as the staff not shown
   (idle Notation error, no start, a running session ends); a viewport change re-checks material
   already waiting; the misfit/notice wording corrected in both intents. Touched play-session,
   phrase-workspace, `strategy.md`, `motion.md` and both stylesheets. The critic-pass findings led
   the owner to settle ux D107–D112 (Q53 and Q54 closed). **2026-09-28: D107–D109 applied**
   (delegate), with D110 and D112 folded in where they settle the same text: a window with no room
   for the staff shows `room-notice` inside `staff-frame staff-no-room` instead of the
   notation error (new classes `staff-no-room`, `room-notice`; `orientation-notice` states
   comment), which is kept for retry-curable failures; an idle phrase too wide for the room is
   regenerated with up to three fresh-seed retries inside one Loading; below
   `bp-tablet-landscape` Note density's `Sixteenth` is disabled with a `field-note` (new class;
   `.segment:disabled` cursor and hover rules), following the current viewport, stepping down
   only during a session. Touched play-session, phrase-workspace, `strategy.md`, `motion.md` and
   both stylesheets. New questions Q55–Q57 hold the write-up's proposed details. D111 needed no
   handoff change (the per-phrase scale was already written). The owner closed Q57 with ux D113
   (one sentence per cause). **2026-09-28: D113 applied** (delegate): `room-notice` shows "The
   staff needs more room. Make the window larger." (no room, `bp-tablet-landscape` and up), "This
   screen is too small to show the staff." (no room, below it) or "These notes need more room.
   Make the window larger, or choose a lower note density." (every idle retry too wide, any
   breakpoint); the no-room pair are two spans shown by breakpoint (new classes
   `room-notice-wide`, `room-notice-narrow`, width-only query); `notation-status` announces the
   sentence shown. Same pass: the stale "kept phrase returns" wording removed (a cleared notice
   always generates a new phrase), and the handoffs checked against spec D147–D150 and O94 (phrase
   1 is generated at idle, so the session's step-down rule starts with phrase 2, now stated in
   both handoffs; the notice clearing under an unsupported rhythm combination lands on Empty, now
   also in the flow diagram). Touched phrase-workspace, play-session, `strategy.md`, `motion.md`
   and both stylesheets. The owner then settled ux D114–D116 (Q55–Q59 closed). **2026-09-28:
   D114–D116 applied** (delegate): the `(proposed)` tags on every Q55/Q56 detail and on spec O94's
   default removed (phrase-workspace, play-session, the phone `staff-frame` comment in
   `components.css`); a desktop window narrowed below `bp-tablet-landscape` gets the "too small"
   sentence, stated with its reason in the workspace handoff's sentence table, both intents,
   `strategy.md` and the `room-notice-narrow` comment; the too-many-notes notice now clears only
   on a phrase that fits, a widening, a musical-control change or `Regenerate phrase` starting a
   fresh round of idle retries at once (narrowing never does), written into the workspace
   handoff (**Needs more room**, Loading, **Room for the staff**), both intents, the flow
   diagram and start-conditions text, `strategy.md`, `motion.md` and the `staff-no-room` and
   `room-notice` comments. New Q60 holds two proposed details of that round (notice kept under
   `staff-loading`; a failed round re-announced). New Q61: the two **Needs more room** under a
   generation-failure banner lines stay tagged (proposed), since Q56's list did not name them.
   **2026-09-29: D117–D121 applied** (see Next Unit). **Third `ux-critic` pass 2026-09-29:
   DRIFT**; its findings settled by `ux-writer` under D119 as ux D122–D125 and **applied
   2026-09-29** (delegate): `flows/generate-phrase/` intent and handoff brought up to v2 (change
   blocks and tags; its diagram now owns the idle transitions: fit retries, **Needs more room**
   and its clearing, **Empty** with the unsupported-rhythm alert; the play-session diagram keeps
   only the start and points to it); the first retries stop on an unsupported combination
   (spec D155's reading); the session start closes the volume popover (D122); the phone toggles
   a scroll away (D123); one `staff-content` per system position, Layout Tree included (D124);
   the two audio-mix `(proposed)` tags removed (D125); `components.css`'s three width-only rules
   moved out of the landscape block; the controller-connection end list completed; the
   Generating policy, Flow Index and README map updated. **Next: a narrow `ux-critic`
   confirmation pass, then the owner's confirmation.** **Handoff note:** D102 changes the
   shipped v1 layout planner (it tries one system first); tell `coding-leader`, and have the owners
   update `specs/generator-architecture.md`, `docs/notation-engraving.md`,
   `docs/module_notation_layout_preflight.atom.md` (documentalist) and
   `docs/release/browser-and-offline-limits.md`, which still state the v1 rule. D104 adds a height
   input to the same planner (the engraver reads the budget from `staff-frame`'s computed
   `max-block-size`) and makes the reserved system positions below `bp-tablet-landscape` depend
   on the viewport height; tell `coding-leader` with the D102 note.
   Historical note: Blocked on **Q17** only (self-directed —
   ux-writer must settle the spatial presentation before writing this screen's handoff). **Q20 is
   resolved and no longer a blocker**: an in-session notation failure can structurally never occur
   (settings lock, §5, plus DoD item 11, §11), so there are no failure-state variants beyond the
   generation-failure ladder (§4), which is fully specified. (Corrected by ux D100: fit to the held
   layout is content-dependent, so a misfit can occur; it is handled as a failed generation
   attempt, not as a notation failure.)
3. **Locked settings-sheet-during-session state** (§5). **Folded into unit 2 (ux D80), written
   2026-09-28.** Mechanically specified (read-only controls,
   automatic changes apply with no highlight/scroll/shift); not blocked, but is a variant of unit 2
   and should follow it rather than precede it.
4. **Per-note acknowledgement live view** (**folded into unit 2 (ux D82), written 2026-09-28**; §8: highlight-only, positive-only, played note never
   rendered). Fully specified; a state within unit 2's screen, not a separate unit.
5. **Audio mix controls** (backing/click on/off + volume, always reachable, §6). **Folded into unit
   2 (ux D84), written 2026-09-28**; ranges and default levels still wait on Q31. Fully specified;
   small, folds into unit 2.
6. **Last-session review + export, v2.0 slice** (§7). **Written 2026-09-30** (branch
   `ux-review`) under the owner's delegation (ux D135): ux D136–D141, new
   `flows/review-and-export/` and `screens/last-session-review/` (intent and handoff each), the
   session-end and Review edits in `screens/phrase-workspace/`, `flows/play-session/` and
   `flows/generate-phrase/`, `strategy.md` (context of use, trade-offs, edge-case policy, flow
   index), `motion.md`, the README map, and the token source (`review-*` classes, `review-link`,
   `.session-action[aria-disabled='true']`, removed again by D144). Q25 closed by D137, Q47 by
   D139. **Revised 2026-09-30 by the owner's D143 and ux D144:** the Review is a mode, left by
   `Close review` before any session starts, and kept until the next session. Unblocks build-plan
   chunk 20. For `spec-writer`: spec O84 (phrase 1 and the starting note from the Review, D137);
   the file names and the export's default format are this design's (D141). For `coding-leader`:
   chunk 20 needs the session's start time (local wall clock) and instrument profile from the
   session history (chunk 9) for the file name and the summary line. `ux-critic` validation:
   see the Next Unit list.
7. **Review v2.1 additions** (§7; feeds build-plan chunk 23). **Written 2026-10-03** (branch
   `ux-v21-v22`, uncommitted), ux D161, D162: `Played notes` toggle in a new `review-view` row
   (absent when no played note in a phrase), a played-notes lane under each staff system (neutral
   bars, unquantized, no match marking), `Export played notes` after the generated group in
   `review-actions` (absent when nothing played; `-played.mid`). Touched
   `screens/last-session-review/` (intent, handoff), `flows/review-and-export/` (intent,
   handoff), `strategy.md`, `motion.md`, token source (`--played-notes-lane-block-size`,
   `--played-note-block-size`, `--played-note-min-inline-size`, `--color-played-note`;
   `.review-view`, `.played-notes-lane`, `.played-notes-divider`, `.played-note`,
   `.review-actions` column gap). **`ux-critic` 2026-10-03: DRIFT (4 findings), fixed (ux D163
   lane time axis anchored to the written notes, D164 no `aria-controls` on the switch, D165
   Tier 1 wording); confirmation DRIFT (inner barlines), fixed (D166); final confirmation
   ALIGNED.** Not yet owner-confirmed.
8. **Adaptive tempo UI** (§10, v2.2; feeds chunk 28). **Written 2026-10-03** (uncommitted), ux
   D155, D156, D158, D159: `Rising tempo` Off/On in the "During a session" group, `On` disabled
   with "Needs a connected controller." when no controller is attached (stored choice kept),
   frozen during a session; header `tempo-readout` and the read-only stepper show the sounding
   phrase's exact tempo (fixed width, `--tempo-value-inline-size`, new class
   `input-stepper-value`); reset at session end; "Last session reached {n} BPM." `field-note`
   under the stepper. Touched `screens/phrase-workspace/` (intent, handoff),
   `flows/play-session/` (intent, handoff), `strategy.md`, `motion.md`, token source. **`ux-critic`
   2026-10-03: DRIFT (4 findings), fixed (ux D172 a raised tempo shows with the first phrase that
   plays at it, a repeat included; D173 the shown `Off` of an unavailable `Rising tempo` changes
   nothing; D174 lexicon "Rising tempo" pause and "Tempo" v2 wording, `.field-note` comment);
   confirmation DRIFT, its only finding one missed sentence in `flows/play-session/intent.md`
   ("nothing else needs work"), fixed as specified; final confirmation (run with unit 11's pass,
   2026-10-03) ALIGNED: the fix closes the finding, no regression; the lexicon's "Rising tempo"
   pause wording checked against §10 and spec D179, correct.** Owner-confirmed 2026-10-05.
9. **Moved out of v2 (ux D154, spec D174): v3, not committed.** End-of-measure chord-fit check
   presentation (§9). Kept notes: the master spec hands this presentation to `ux-writer` ("a UI/UX
   design decision, not specified here"); positive-only and quiet, distinct from the per-note
   highlight. Design only if v3 schedules it.
10. **Settings-mutation flag UI** (§5, v2.1; feeds chunk 25). **Written 2026-10-03**
    (uncommitted), ux D155, D156, D157: `Vary settings` Off/On in the new "During a session"
    `control-group-session` (last in `control-group-row`, own row from `bp-tablet-landscape`);
    controls follow the phrase now sounding, changes silent and shift-free (`control-summary`
    one line; `preset-status` two stacked texts, `preset-status-text` / `is-reserve`, `is-custom`
    moved to the text; `preset-status` announcement off during a session); mutated settings
    return to the player's own at session end (Q64 closed by the owner 2026-10-03: yes, ux D167,
    spec D182). Touched `screens/phrase-workspace/`, `flows/play-session/`,
    `flows/generate-phrase/handoff.md` (session options start no round), `strategy.md`,
    `motion.md`, token source; lexicon "Vary settings" entry corrected. **`ux-critic`
    2026-10-03: BLOCKED (profile flip not shown as customized, against spec D181) plus 4 minor
    findings, fixed (ux D168 flip takes the custom path, D169 `aria-live="off"` during a session,
    back to polite after the end's restore, D170 density step-down timing and Tier 1 wording);
    confirmation DRIFT (grammar word after a flip), fixed (D171); final confirmation ALIGNED.**
    Owner-confirmed 2026-10-05.
11. **Multi-phrase tension arc** (§3, v2.2; feeds chunk 30). **Written 2026-10-03**
    (uncommitted), ux D155, D160: `Tension across phrases` Off/On in the "During a session"
    group; the Tension control shows the tension in effect (the player's choice, or a value
    `Vary settings` set), never a per-phrase step. Touched `screens/phrase-workspace/` (handoff,
    intent), `flows/play-session/handoff.md`, `strategy.md`; lexicon "Tension across phrases"
    and "Vary settings" entries. **`ux-critic` 2026-10-03: DRIFT (the Tension item and the
    general "controls show what the sounding phrase was generated with" rule each claimed too
    much), fixed (ux D175); lexicon DRIFT (Vary settings step wording against spec D181), fixed
    (D176); confirmation: unit 11 ALIGNED; lexicon wording refined (D176), final lexicon check
    ALIGNED.** Owner-confirmed 2026-10-05.

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

0. ~~Version-change highlighting convention~~ — done 2026-09-28 (D61), applied to every existing
   v2 edit. Every later v2 edit at the root carries its marks as it is written.
1. ~~**`strategy.md` persona pass**~~ — done 2026-09-28 (ux D62–D70, spec D127–D130), `ux-critic`
   ALIGNED after two fix rounds, owner-confirmed, merged `9958478`. Carried: Q36, Q37 to unit 2;
   Q25 to unit 6.
2. ~~**Settle Q17**~~ — done 2026-09-28 (ux D71: two alternating systems), recorded in
   `strategy.md` trade-offs. **Next session starts at item 3, unit 2.**
3. **Unit 2** (session core loop + rolling display, extending `screens/phrase-workspace/`). It now
   also carries ux D52 (on-screen count-in beats, the starting-note line — hidden when no
   controller is connected, as proposed to the user), Q27 (when the disconnect slot appears), and
   the Start/Stop button that the controller-connection sheet sends focus to.
   **2026-09-28: proposal confirmed (ux D72–D85) and written up** (branch `ux-session`, delegated
   write-up): new `flows/play-session/`; `screens/phrase-workspace/` intent and handoff extended
   (action table, session cue row, two reserved systems, start marker, playhead band,
   acknowledgement, audio mix, session states); `src/styles/theme.css` and `components.css`
   (`session-cue-row` replaces `session-alert-slot`); `motion.md`; `strategy.md` (flow index,
   edge-case policy, staff-only view dropped); README map; controller-connection docs now name the
   session action. Units 3, 4 and 5 are folded in. The draft is deleted.
   Q38–Q43 settled with the owner (ux D86–D92) and **applied 2026-09-28**; new Q44–Q46 logged,
   settled (ux D94–D97) and **applied 2026-09-28**; new Q47 logged (proposed default in the
   handoffs for the count-in end; the post-phrase-1 end goes to unit 6).
   First `ux-critic` pass run; the owner settled D98–D101 (Q47 narrowed, Q48 and Q49 closed), and
   **D98–D101 plus the two critic fixes were applied 2026-09-28**. New Q50 logged, then closed
   by the owner (ux D102: phones always use the split layout, idle included); **D102 applied
   2026-09-28**. Second `ux-critic` pass run; the owner settled D104–D106 (Q51, Q52 closed), and
   **D104–D106 were applied 2026-09-28**. The owner then settled D107–D112 (Q53, Q54 closed);
   **D107–D109, with D110 and D112, were applied 2026-09-28**; Q55–Q57 logged for the owner.
   The owner closed Q57 (ux D113); **D113 applied 2026-09-28**. The owner then confirmed Q55–Q59
   (ux D114–D116; **applied 2026-09-28**, spec D151–D152, master spec v1.16) and Q60, Q61 and spec
   O95 (ux D117), then, on 2026-09-29, ux D118; **D117 and D118 applied 2026-09-29** (delegated
   write-up), which logged Q62 for the owner (the notice beside the unsupported-rhythm alert on
   two paths no change starts; proposed default in the entry). Session ended 2026-09-28 here; all
   work is uncommitted in the `ux-session` worktree.
   **Next, in order:** (1) ~~delegate the D117 write-up: O95 option (b) replaces the "notice stays
   beside the unsupported-rhythm alert" text in the phrase-workspace handoff/intent and the
   play-session diagram; remove the `(proposed)` tags on the Q60 and Q61 details; fix "any musical
   control starts a round" to "a setting the phrase is generated from" (tempo, mix, theme do not;
   spec D152); apply ux D118 (2026-09-29: a widening during a running round starts nothing).~~
   **Done, applied 2026-09-29** (with D118); Q62 logged, then closed by `ux-writer` under the
   owner's D119 (ux D120, D121, applied 2026-09-29 to phrase-workspace, play-session and
   `strategy.md`; D119's session rule added to `strategy.md`'s edge-case policy).
   (2) ~~`spec-writer`: record ux D117 (1) and D118, close spec O95.~~ **Done 2026-09-29**: spec
   D153, D154, master spec v1.17; spec O96 opened, answered by ux D120. (2b) ~~`spec-writer`:
   record ux D120 (close spec O96) and D121.~~ **Done 2026-09-29**: spec D155, D156.
   (3) ~~Third `ux-critic` pass on unit 2 (flow + screen + Tier 2 + spec v1.17+); per ux D119,
   settle its minor findings without asking the owner.~~ **Done 2026-09-29: DRIFT**; findings
   settled as ux D122–D125 and **applied 2026-09-29** (delegated fix pass; see the unit-2 entry
   above). (3b) ~~Narrow `ux-critic` confirmation pass on that fix pass.~~ **Done 2026-09-29:
   DRIFT, three minor findings, all fixed the same day by `ux-writer`** (D126's second half carried
   into the workspace States and both session-end landing lists, the intent's "phrase already on
   screen" sentence qualified, the idle bottom position has no `staff-content`). Every finding of
   every pass is resolved; `specs/personas.md` corrected to the starting-note rule by
   `spec-writer`. Still open and not blocking the unit: Q31 (mix levels, placeholders in place),
   Q25 and Q47's Review part (unit 6; closed 2026-09-30 by ux D137, D139), Q16. (4) **Awaiting the owner's explicit confirmation of
   the unit**, then commit and `--no-ff` merge only when asked. The commit carries `ui_ux/`,
   `specs/` and `src/styles/`. With it, tell `coding-leader` the handoff note above (D102, D104:
   the shipped v1 layout planner). **Done 2026-09-29:** unit 2 merged and pushed (a218e38); the
   layout-planner note is carried by `specs/versions/v2/build-plan.md` (its notation-layout caveat,
   chunk 3). After that, unit 6 (Review), which carries Q47's Review part
   and Q25.
   (5) **Phone staff-height rework, 2026-09-29** (owner's request after chunk 3 measured 17.5
   staff spaces per system, so about 317 px of small viewport height, above a toolbar-showing
   360-px phone's about 300 px). Settled by `ux-writer` under D119: ux D127 (one system-position
   size for every profile, sized for one profile's reach, about 15 spaces; staff placed per
   profile from its written range), D128 (phone `staff-frame` block padding `--spacing-2` via a
   new `--staff-frame-padding-block-phone`), D129 (start marker kept inside the position).
   Together: about 276 px needed (291 px worst case with the marker), 5.8 px per space at 300 px.
   Written into `screens/phrase-workspace/handoff.md` (Notation Contract: new **System position
   size and staff placement**, **Scale below `bp-tablet-landscape`**, **Start marker**; Layout
   Tree; Responsive Behavior; change block) and `intent.md` (Focal Point and Header; change
   block). Q63 logged for the owner, then **closed 2026-09-29 by ux D130: the owner accepts the
   design** (about 276 px phone minimum; no `4rem` phone cue row; the 5 px floor stays).
   **Design accepted; build handed to a coding chunk**, which makes: (a) the token source change
   (add `--staff-frame-padding-block-phone: var(--spacing-2)`, subtract it in
   `--staff-systems-phone-block-budget`, set `padding-block` in the phone `staff-frame` block of
   `components.css`, correct the budget's "Rough sizing" comment); (b) the notation-layout
   constants (position 150 units, at most 160; top line per written range), engraver placement
   per profile, the calibration with the marker drawn, `docs/notation-engraving.md`, and the
   preflight atom via `documentalist`. Still to do here: (c) a narrow `ux-critic` pass on the
   phrase-workspace edits (see the result below, when run).

4. **Unit 6 (Review + export, v2.0), 2026-09-30.** Written under the owner's delegation (ux D135,
   D136–D141; see the unit-6 entry above). First `ux-critic` pass: **BLOCKED** on one spec item
   only (spec O84 still open in master spec §6 and §12 while D137 settles it; routed to
   `spec-writer`), plus three minor findings, fixed (ux D142). **Next:** (a) `spec-writer` records
   D137 (fresh phrase 1 at a session end; the Review changes no start condition; the starting note
   works there) in §6, §7 and §12 and closes O84; (b) a narrow `ux-critic` confirmation pass once
   the spec matches; (c) the owner's confirmation, then merge. **Superseded in part by the
   owner's D143 (ux D144 applied the same day):** `spec-writer` now records D143/D144 instead
   (spec D169 and §6, §7, §11 items 12 and 28 describe a start from the Review), `documentalist`
   follows in the atoms, then the `ux-critic` pass the coordinator runs. **D145 (same day)**: the
   controls stay usable while the Review shows (spec D170 found D144 hid them against §5, §6,
   §10); the Review takes only the staff area's place. Build-plan chunk 20 can start from
   these handoffs meanwhile. **D149 (2026-10-02, chunk 20 build):** `staff-viewport` stays laid
   out while the Review shows (`is-out-of-sight` + `inert`, not `hidden`), plus six build
   details (re-show scroll, lazy-engraving distances, review engraving width, silence, export
   failure, live no-room); handoffs and token source updated. **D150–D153 (2026-10-02, settled
   during the chunk 20 build, recorded):** live regions emptied at open and focus details
   (D150), the Review's code loading and the export choices' page-session lifetime (D151), a
   portrait session end's fresh phrase via the no-room path (D152), the phone's minimal Review
   confirmed (D153); handoffs updated.

5. **v2.1 and v2.2 units 7, 10, 8, 11, 2026-10-03** (branch `ux-v21-v22`, worktree
   `../infinite_flow-ux-v21-v22`, all uncommitted; session handed over mid-way at the owner's
   request). Done: decisions ux D154–D162 and Q64 logged; all four units written up in the tier
   docs and the token source; housekeeping (unit 9 to v3, the v2.0–v2.3 wording). Then, all
   done 2026-10-03: lexicon entries "Rising tempo", "Tension across phrases", "Vary settings"
   (with `related` links from Tempo and Tension); README map lines; the owner answered Q64 (yes,
   ux D167, spec D182); `ux-critic` validation, each unit ALIGNED: 7 (ux D163–D166), 10
   (ux D168–D171), 8 (ux D172–D174), 11 and the lexicon entries (ux D175, D176);
   `npm run lint:links` passes. **Next:** the coordinator commits; then the owner's confirmation
   of units 7, 10, 8, 11. Handoff note for `coding-leader`: chunk 23 must place played notes on
   the ux D163/D166 time axis (aligned to the written notes, each measure ending at its barline),
   not D161's measure-box mapping.

**ux-critic plan read (2026-09-27), to weigh before continuing:**

- Q17 is on the critical path and is less open than it looks. §4 requires part of the next phrase
  to be visible while the current phrase's last measure plays, which rules out replacing the
  single system in place. `motion.md`'s "do not scroll the staff" will need a v2 revision. (Superseded by ux D71: alternating systems need no scroll, the rule stands.)
- D45's grounds support keeping Idle and the session on one screen, but not the Review. Revisit
  the Review part before unit 6. (Settled by ux D136: a panel on the same page, after the
  controls.)
- Unit 8 (adaptive tempo) depended on unit 1's meaning of "connected" — now defined (spec §8).
