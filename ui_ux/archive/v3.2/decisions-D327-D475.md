# UI/UX Decisions

> **Archived 2026-11-09.** v3.2 (Jam) is released as version 3.2.0 (tag `v3.2.0` at f93e552d, 2026-11-09). These are the decisions D327-D475, kept verbatim
> with their section headings: v3.1's archive pass, the v3.2 re-scope, its approval and
> token-source pass, and the design questions of its build, waves 3 to 7 and gate GD (IDs not
> listed were never used in this tree). Live summary: [README.md](README.md). Text was written
> from `ui_ux/`; it holds no link.

## The v3.1 release, 2026-10-21

- **D327 — `versions/v3.1/` records its release; its preset sheet cites the token source alone
  (2026-10-21; applies D325, as D323 did for v3.0).** v3.1 shipped as version 3.1.0 (tag `v3.1.0`
  at 55364e7), so a recorded correction gives `versions/v3.1/README.md` the released status and
  points it at the archived record, and makes `screens/preset-sheet/handoff.md`, in the copy and
  at the root, cite `src/styles/theme.css` and `components.css` alone: every v3.1 class is there
  (D326). `token-source-v3.1-v3.2.md` stays at the root until v3.2's part is applied (D226).

## The v3.2 re-scope: Jam as its own mode, 2026-10-21

Inputs: `specs/versions/v3/jam-mode.md` (settled by spec D400–D408; §8 is the design brief), which
wins over master spec Part C until Part C is rebuilt from it; `specs/personas.md` (Chrome the one
supported browser, spec D399). The owner's standing delegation applies (D119, D135, archived):
minor design issues settled here, phones low priority, a running session never asks anything.
Nothing in `src/` is edited; the token pass waits for the owner's go (gate T2). Entries marked
**(spec, provisional)** rest on a recommended answer to a behaviour gap logged for `spec-writer`.

- **D328 — The re-scope rewrites v3.2's design in place (2026-10-21).** v3.2 is not frozen, so its
  marked text is rewritten under the same `v3.2` marks, and what the re-scope drops is deleted, not
  listed as a removal, since no version shipped it: the Jam switch among the session options, a
  controller switching Jam mode in or out, Idle in Jam inside session mode's controls, Drift in
  session mode, the held doodle's list of changes that let it go, the suggestion's restriction line.
  A removal of shipped v3.1 text links to `versions/v3.1/`. v3.3 paragraphs that lean on the old
  design are corrected in place. Superseded: D235, D243's placement, D247, D249's Q70 reading, and
  the parts of D236, D239, D240, D246, D248 and D251 the entries below replace. Kept as designed:
  the count-in, the capture's cue row, the writing and read-in measures, a Jam ended before phrase 1
  (D237, D238, D248's cue-row details), the review's doodle section (D240, D246), the session list's
  "Jam" (D241), the rhythm lock's changes list (D242) and What may vary (D244).
- **D329 — The mode shows as a two-segment switch in the header (2026-10-21; jam-mode §2, §8.1).**
  `segmented-control mode-switch`, accessible name "Mode", segments `Session` and `Jam`, in
  `layout-header` after `brand`: below `bp-desktop` at the trailing end of the brand row, from
  `bp-desktop` between the brand and `header-actions`. Pressing the other segment, or an arrow key,
  switches. Read-only (`is-readonly`) during **Loading**, a session (count-in included) and while
  the review mode shows (a review or the session list), with no note: `Close review` is in view.
  The switch is instant, with no animation; focus stays on the segment. At Idle the mode also shows
  in the session action (`Start session` / `Start Jam`), the staff and the controls' title (D332).
  Rejected: a single "Jam mode" toggle (names one mode only), a tab row over the workspace (a whole
  row for one choice, pushing the staff down), the score toolbar (it holds the never-locked mix).
- **D330 — The first press loads Jam's code: the wait and the failure (2026-10-21; jam-mode §2,
  D402).** At once `Jam` is checked and the switch takes `is-loading` and `aria-busy="true"`; the
  workspace is held as in **Loading** (controls read-only, both header actions disabled, the cue
  row empty, the starting note ignored), session mode still drawn. `Session` stays pressable and
  cancels: session mode as it was, the load finishing unseen. Loaded: Jam mode's Idle at once.
  Later presses in the visit wait for nothing. **Failure** (offline before the files were kept):
  session mode as it was, `Session` checked, and in `app-notice-row`: "Jam mode couldn't open
  because part of the app didn't load. Check that you're online, then try again." with `Try again`
  and `Dismiss`, focus on `Try again`; it leaves when Jam mode opens or on `Dismiss`. Never
  error-toned.
- **D331 — Leaving Jam mode, and at load (2026-10-21; jam-mode §2, D400, D407).** `Session` at
  Idle returns session mode exactly as it was left (phrase, prepared phrases, any banner or notice)
  and lets a kept doodle go, silently: its kept session still offers it. The app always opens in
  session mode; the mode is never saved. A controller arriving or leaving never switches the mode.
- **D332 — Jam's controls (2026-10-21; jam-mode §3, §8.1).** In Jam mode `control-section` holds
  Jam's settings in place of session mode's: title "Shape your Jam"; copy "Set these before you
  start. Jam keeps its own key, mode and tempo; the rhythm and the melody's shape come from your
  doodle."; `control-summary` "{key} {mode} · Drift: {drift} · Rhythm lock: {On or Off}". No preset
  bar and no key and mode marks. Three groups: **Foundation** (Tempo with `Tap tempo`, Written key,
  Collection, Instrument profile with my instrument's button, shared with session mode, Harmonic
  motion, Tension, Embellishments), **Following your doodle** (Drift, D243's control and note; Rhythm
  lock, note "Every phrase keeps one rhythm, the one nearest your doodle, so your eyes can stay on
  the notes.", with Allowed rhythm changes under it while `On`, D242's list and note), **From your
  doodle** (D334). Editable at Idle, read-only in **Loading** and a session, saved when changed.
- **D333 — Jam's harmony and embellishments: few, not fixed (2026-10-21; jam-mode §3).** Harmonic
  motion (three options) and Tension (four) are session mode's controls with Jam's own values.
  Embellishments is one level, `Off`, `Rarely`, `Often`, `Very often`, given to all seven figures
  alike, note "How often the app decorates the melody with passing tones, neighbor tones and the
  other figures. A preference, never a promise." Seven figure rows would turn a small set back into
  a generator to tune. **(spec, provisional, Q81, Q83)** Arpeggio chaos is not shown, held at its
  default; the defaults of Jam's own settings are Q83's recommendation.
- **D334 — What came from the doodle shows as a read-only list (2026-10-21; jam-mode §3, §8.1).**
  The **From your doodle** group: `control-group-intro`, then `doodle-readings`, a `dl` of seven
  rows named as session mode's controls (Note density, Rhythmic variety, Syncopation, Silence
  density, Contour, Leapiness, Register) with values in their words; a value the doodle does not
  show reads "{value} (default)". Without a doodle: "The app reads these from your doodle, so the
  phrases move like it." and the note "They show here once you've played a doodle." The list fills
  silently when a fresh Jam's phrase 1 enters, and empties on `New doodle` or leaving Jam mode.
  Rejected: the seven controls shown read-only (they read as locked settings to unlock).
- **D335 — Tap-in (2026-10-21; jam-mode §5, §8.1).** `btn tap-tempo` "Tap tempo" after Jam's tempo
  stepper. Each press (key repeats ignored) is a tap and starts listening; while listening, every
  controller note is a tap too, the starting note included (`start-note-line` hidden; `Start Jam`
  still works). Listening ends 2 seconds after the last tap or when anything else is used. From the
  fourth tap the tempo is the last four taps' mean beat, rounded to a step of 10, kept in 60–180,
  shown in the stepper at once and updated by each further tap. Its `field-note`, a polite live
  region: "Tap the beat here, or press once and tap on your controller." ("Tap the beat here."
  without one); "Keep tapping: four beats set the tempo."; "Set to {tempo} BPM. Keep tapping to
  correct it."; at a limit "Set to 180 BPM, the fastest a Jam goes." (or "60 BPM, the slowest").
  Unevenness is never judged; nothing starts or sounds. Rejected: notes tapping without the button
  (warming up at Idle would keep moving the tempo).
- **D336 — Jam's Idle and the doodle it keeps (2026-10-21; jam-mode §2, D408).** Without a kept
  doodle: D236's `staff-jam`, instruction and home note, `Generate phrase` disabled (the header
  stays still across modes), `Start Jam` primary. With one: phrase 1 as in **Ready**,
  `Regenerate phrase` writing a new one from the doodle, and `jam-bar`: "Jamming again on your
  doodle: phrase 1 continues it. Leaving Jam mode lets it go." with `New doodle` (plain `btn`) at
  its inline end, then `suggestion-row`. `New doodle`, unconfirmed (the kept session still holds
  the doodle): the doodle and its suggestion go, `staff-jam` returns, the readings empty, focus on
  `Start Jam` (or the mode switch when it is disabled). **(spec, provisional, Q82)** A change to any
  Jam setting phrase 1 is written from (all but the tempo) rewrites phrase 1 from the kept doodle at
  once, through **Loading**, so a Jam never meets the out-of-date phrase prompt.
- **D337 — No controller in Jam mode (2026-10-21; D407).** Jam mode opens and every setting can be
  set; `Start Jam` is disabled and the cue row holds `jam-needs-controller` where `start-note-line`
  goes: "A Jam needs a connected controller. Connect one to start." ("Connect a controller to
  start." below `bp-tablet-landscape`), named by `Start Jam`'s `aria-describedby`. A kept doodle
  stays, phrase 1 still written. A controller lost before a fresh Jam's phrase 1 ends it as a
  count-in end onto Jam's Idle, focus on `Connect controller`; after phrase 1, the disconnect
  countdown as in any session. `Jam again on this doodle` no longer needs a controller.
- **D338 — The suggestion speaks of Jam's key and mode (2026-10-21; jam-mode §3, §8.1).** Judged
  against Jam's key and mode; buttons `Jam in {answer}` and `Keep {Jam's key} {mode}`; set sentence
  "Jams now play in {answer}." `Jam in {answer}` sets Jam's key and mode only, from a review over
  either mode, and at Jam's Idle rewrites phrase 1 from the kept doodle. No restriction line (Jam
  has no presets). Otherwise as D240 and D246: offered again at Idle when unanswered, the no-fit
  sentence in every review of that Jam, focus after `Use` or `Keep` as before.
- **D339 — The review side (2026-10-21; jam-mode §2, §8.1, D408).** `Jam again on this doodle`
  leaves the review onto Jam mode with that doodle kept (replacing one already kept), phrase 1
  written from it through **Loading**; from the review of the Jam just played it simply closes the
  review. A Jam session's doodle section and suggestion come with Jam's code: until it has loaded
  the section shows `review-phrase-note` "Loading your doodle."; if it fails, "Your doodle can't be
  shown: part of the app didn't load. Check that you're online, then open this session again.",
  `Jam again on this doodle` disabled with that reason, no suggestion, and that session's two
  exports unavailable with the same reason (they open with the doodle). The rest of the review works.
- **D340 — Session mode after the re-scope (2026-10-21; jam-mode §2, §3).** "During a session" holds
  four fields: Rhythm lock (note "Every phrase keeps the rhythm of the first one, so your eyes can
  stay on the notes."; Allowed rhythm changes under it), Rising tempo, Tension across phrases, Vary
  settings (What may vary under it). Session settings gain the lock, its changes and the groups;
  Jam's settings are their own saved record, reset by `Delete everything` with the rest. Nothing in
  Jam mode touches session mode's settings or prepared phrases, the shared instrument aside (Q85).
- **D341 — Questions after the re-scope (2026-10-21; jam-mode §8.3).** Q70 closed as moot; Q73 and
  Q74 closed by spec D408 as recommended; Q75 closed as recommended (the no-fit sentence in every
  review). New behaviour gaps for `spec-writer`, designed on their recommended answers: Q81 (arpeggio
  chaos in Jam), Q82 (phrase 1 after a Jam setting changes), Q83 (the defaults of Jam's settings),
  Q84 (a doodle read as Sixteenth on a phone), Q85 (the instrument changed in Jam mode), Q86 (v3.3's
  Seventh chords in Jam).
- **D342 — Tokens and classes (2026-10-21).** `token-source-v3.1-v3.2.md` part 2 gains
  `mode-switch`, `tap-tempo`, `doodle-readings` and `jam-needs-controller`; `jam-bar` gains its
  button; `suggestion-row` loses the restriction line; `field-dependent` serves Allowed rhythm
  changes and What may vary only. No new token value. Applied at the T2 pass, on the owner's go.
- **D343 — Chrome is the one supported browser (2026-10-21; spec D399).** `strategy.md`'s context
  of use and `flows/saved-data/intent.md` name Chrome alone (other Chromium browsers, Edge
  included, untested); the v3.1 hand checks H3 to H5 leave `todo.md` (H4 passed, H3 and H5 waived).
- **D344 — How the rework is written (2026-10-21).** Tier 1 and 2 and the registers here; three
  delegated units from D328–D343: **A** `flows/jam/` and `screens/phrase-workspace/`; then, side
  by side, **B** `flows/play-session/`, `flows/generate-phrase/`, `screens/stale-phrase-prompt/`,
  `flows/presets/`, `flows/controller-connection/`, and **C** the review side
  (`screens/last-session-review/`, `flows/review-and-export/`, `screens/session-list/`,
  `flows/kept-sessions/`, `flows/saved-data/`, `screens/your-data/`).
- **D345 — Details settled while writing units A, B and C (2026-10-21; minor, D119's standing
  rule).** A fresh Jam ended by a lost controller puts focus on `controller-status` (the badge,
  since `Connect controller` never returns once a controller has connected), correcting D337.
  While Jam mode shows, session mode keeps its prepared phrases and prepares no new ones. A
  reading "(default)" shows session mode's first-visit value for that control. The load-failure
  notice's `Try again` acts as a press of `Jam`, and the notice sits beside the saving notices,
  neither replacing the other. During **Opening Jam mode** the preset box is read-only and its
  actions behave as in **Loading**; deleting a player preset from Your data while Jam mode shows
  acts on session mode's selection, out of sight. A Jam session records no preset label, so its
  summary and list row have no preset part. An export pressed while Jam's code loads waits in
  `is-loading`; if the load fails both exports are disabled, the failure sentence as each one's
  `field-note`. After `Jam again on this doodle` onto another doodle, focus moves to
  `mode-switch`'s checked segment (both header actions are disabled while phrase 1 is written);
  from the review of the Jam just played it is `Close review`'s, focus included. Until Jam mode
  first opens, Jam's key and mode are session mode's current ones, so `Jam in {answer}` from a
  review before then starts Jam's record from them.
- **D346 — `ux-critic`'s pass on the re-scope: DRIFT, five findings, all resolved (2026-10-21).**
  (1) **(spec, provisional, Q87)** The kept doodle comes from the latest session played on it, so
  the save that replaces an unpinned session never lets it go; only the player's deletion of that
  session, or `Delete everything`, does (`flows/jam/handoff.md`, What lets the kept doodle go;
  `flows/kept-sessions/handoff.md`, Deleting a Session). (2) Focus never lands on `mode-switch`,
  where an arrow key would leave Jam mode and drop the doodle: after `Jam again on this doodle` it
  goes to `jam-bar`'s sentence; after `New doodle`, to `Start Jam`, else `controller-status`
  (correcting D345). (3) **(spec, provisional, Q83)** The readings' "(default)" values are Jam's
  defaults for the controls a doodle leaves unsaid, recommended as session mode's first-visit
  values, now part of Q83. (4) `strategy.md`'s Device tag moved to the start of its bullet.
  (5) In the review, `Jam in {answer}` moves focus to the set sentence, as at Idle.

## The owner's approval of the v3.2 design, 2026-10-21

- **D347 — Q81–Q87 closed as recommended; gate D0 granted, T2 allowed (2026-10-21; spec D411,
  D412).** The provisional marks on D333, D336 and D346 no longer apply; the tier documents
  already state these as designed. Jam's first values are Q83's with Drift `Near`, the lock and
  its changes off (master spec §C5.16). The token pass adds D342's classes, no new token value; it
  runs as build plan v3.2's chunk 1, not in this pass.
- **D348 — "The kept doodle"; phones a third-rate client (2026-10-21; spec D413, D414).** The
  design already says "the kept doodle"; "held doodle" in D236–D264 and the closed questions is
  Part C's earlier term, left as written. D414 restates D119's phone rule and adds that a
  capability may be reduced on a phone; now in `strategy.md`, Context of Use, Device.

## v3.2's token-source pass, 2026-10-21

- **D349 — Part 2 applied; the document deleted (2026-10-21; build plan v3.2 chunk 1, gate T2).**
  D342's classes are in `src/styles/components.css` under `v3.2 new`; `theme.css` is unchanged (no
  token value). `token-source-v3.1-v3.2.md` is deleted as it said (D226), the build plan's links
  repointed at the token source. Two details settled there: `doodle-readings` takes two columns
  from `bp-tablet-landscape` up as the phrase-workspace handoff says (an `auto-fill` grid gave one
  in a group's width), each row a `div` holding its `dt` and `dd`; `review-doodle`'s disabled
  button is named by `review-phrase-note`, as its handoff says, with no `field-note`.

## v3.2 wave 3, chunk 19's question, 2026-10-26

- **D350 — A read-only `toggle-list`'s toggles carry `aria-disabled="true"` (2026-10-26).**
  ARIA allows no `aria-readonly` on a group or a button; the tempo stepper's buttons already use
  `aria-disabled` while read-only, so the toggles do the same, focusable and unchanged in look.
  Rejected: a hidden "read-only during a session" description (every other read-only control has
  no such note, and it would be read on every toggle); nothing (the toggles would sound live).
  Now in `screens/phrase-workspace/handoff.md` (the "During a session" `toggle-list`s) and the
  token source's `toggle-list` comment.

## v3.2 wave 4, chunk 20's questions, 2026-10-27

Minor, settled under D119's standing rule; the owner sees only D352's opening line and D353's
title word.

- **D351 — The empty system is a named image (2026-10-27).** Built `aria-hidden`; corrected.
  Its key signature is the one thing it shows, and every phrase system is a named image, so the
  name follows the phrase summary's wording without the measures: "Empty staff, {clef} clef, key
  signature {signature} ({key label}), 4/4 time." Now in
  `screens/phrase-workspace/handoff.md`, Notation Contract, The empty system.
- **D352 — The empty system draws the opening line (2026-10-27).** "No barline" meant no measure
  and no end: phrase systems draw the line at the system's start, so the empty system does too,
  and phrase 1's entry adds only what follows the 4/4 signature. Built without it; corrected.
  Now in `screens/phrase-workspace/handoff.md`, Notation Contract, The empty system.
- **D353 — The score title reads `Jam` in Jam mode (2026-10-27).** "Four-measure phrase" over
  an empty staff whose instruction says "one to four measures" misleads, and a title that
  changed at the read-in would move the toolbar mid-session. One title per mode, following the
  mode the workspace shows (still "Four-measure phrase" while Jam's code loads); nothing for
  chunk 21 to add. Rejected: keeping it (wrong at Idle); "Your doodle" (wrong once phrases
  show). Now in `screens/phrase-workspace/handoff.md`, Components and Content.
- **D354 — What stays live while Jam's code loads (2026-10-27).** As built: what is live in
  Loading stays live (the theme, `controller-status`, the cue-row links, `Your data`). Two
  consequences settled: a kept session deleted meanwhile lets its doodle go, so Jam mode opens
  with none; the wait ending under an open sheet moves no focus out of it. Now in
  `screens/phrase-workspace/handoff.md`, States, Opening Jam mode, and `flows/jam/handoff.md`.

## v3.2 wave 4, chunk 28's question, 2026-10-27

- **D355 — A rhythmic variety the step raised is marked as raised (2026-10-27; minor, D119's
  standing rule).** The line shows the raised value, the one played, as "{value} (to work with
  the other rhythm values)", in place of "(default)", whether the doodle's value or the default
  was raised. "(default)" would call Heavily varied the default; the unraised value describes
  phrases never heard; an unmarked raised doodle value claims a variety the doodle lacked.
  Rejected: "Heavily varied (default)"; showing the unraised value. Now in
  `screens/phrase-workspace/handoff.md`, Components and Content, Jam's controls, and
  `intent.md`, Jam's Controls.

## v3.2 wave 5, spec D457's alignment, 2026-11-03

- **D447 — Phrase 2 at phrase 1's hand-over; a Jam whose rungs all fail ends at the deadline
  (2026-11-03; follows spec D457).** Phrase 2 is requested at the read-in measure's barline, where
  phrase 1 is handed to the session, not when phrase 1 is ready; the failed Jam keeps writing and
  clicking until the deadline. Nothing the player sees changes. Now in `flows/jam/handoff.md`,
  Routing Rules, Every rung failed and Read-in measure; `flows/play-session/handoff.md`, Phrase 1
  of a fresh Jam; `screens/phrase-workspace/handoff.md`, States, Jam ended before phrase 1.

## v3.2 wave 5, chunk 31's question, 2026-11-03

- **D448 — The narrow Sixteenth reading keeps the option words (2026-11-03; minor, D119's
  standing rule).** Below `bp-tablet-landscape` a doodle's Sixteenth reads "Eighth notes
  (Sixteenth on larger screens)", Note density's own labels on both sides, so it matches the wide
  "Eighth notes". Rejected: short words throughout (they would part from the controls' labels,
  "Conversational space" included). Now in `screens/phrase-workspace/handoff.md`, Components and
  Content, Jam's controls, and `intent.md`, Jam's Controls.

## v3.2 wave 6, chunk 30's alignment, 2026-11-04

- **D449 — A Jam session keeps its preset label; its row and summary show no preset part
  (2026-11-04; minor, D119's standing rule; corrects D345).** The contract keeps a preset label
  on every kept session, and the save always writes one; the design said a Jam records none.
  The design now states only what is shown. Now in `screens/session-list/handoff.md`,
  `screens/last-session-review/handoff.md`, `flows/kept-sessions/` and
  `flows/review-and-export/handoff.md`.

## v3.2 wave 6, chunk 21's follow-ups, 2026-11-04

- **D450 — The read-in is a true cross-fade (2026-11-04; minor, D119's standing rule).** While
  Jam's frame leaves, it draws no background or border, so phrase 1's identical frame beneath
  shows through, and `jam-instruction` fades out with the empty system. Stylesheet only: the
  leaving `staff-jam` block in `src/styles/components.css`. Now in
  `screens/phrase-workspace/handoff.md`, States, Jam read-in.
- **D451 — A portrait end leaves focus on the page (2026-11-04; minor, D119's standing rule).**
  In both modes, the end's focus target is hidden with the workspace and `orientation-notice` has
  nothing to focus; nothing restores focus when it returns. Accepted: a turned touch device, and
  the phone the third display. Now in `screens/phrase-workspace/handoff.md`, Responsive Behavior.
- **D452 — A start by the starting note jumps too, in both modes (2026-11-04; minor, D119's
  standing rule).** The design's "either kind of start" stands: a note-started player has both
  hands on the instrument and cannot scroll, the case the jump exists for. The build's missing
  jump on a note start (session mode's starting note, Jam's home note) is a code gap, not a
  ruling. Stated in `flows/play-session/handoff.md`, Jump, and `intent.md`, Where the eyes land.

## v3.2 wave 6, chunk 30's copy check, 2026-11-04

- **D454 — The Review's played notes already kept says the doodles stay too (2026-11-04; minor,
  D119's standing rule).** Its `Delete them` deletes every kept played note, Jam sessions' raw
  doodle notes included, as Your data's does; so it carries the same sentence under the same
  condition (a Jam session among those keeping played notes), not only in a Jam's review. Your
  data's built copy already matched its handoff. Now in `screens/last-session-review/handoff.md`,
  Components and Content, Confirmations.

## v3.2 wave 6, chunk 23's follow-ups, 2026-11-04

- **D456 — Jam again's focus, until `jam-bar`'s sentence exists (2026-11-04; minor, D119's
  standing rule).** Until chunk 24 (wave 7) builds `jam-bar`, `Jam again on this doodle` moves
  focus by Close review's rule in the mode then shown: with phrase 1 being written both header
  actions are disabled, so `controller-status`. Accepted as interim: a real control, never
  `mode-switch`, never the page. Chunk 24 brings the design's focus. The design is unchanged:
  `flows/review-and-export/handoff.md`, The Doodle and the Suggestion.
- **D457 — A set suggestion, once Jam's key changes again, stays gone for that Review
  (2026-11-04; minor, D119's standing rule).** No re-judging after "Jams now play in {answer}.":
  the player has answered; offering again would flicker under their own edits. The next Review of
  the session judges afresh (setting is not declining). Now in
  `screens/last-session-review/handoff.md`, Components and Content, `suggestion-row`, Set, and
  `flows/review-and-export/handoff.md`, The Doodle and the Suggestion.
- **D458 — The answer is named for the instrument selected now (2026-11-04; minor, D119's
  standing rule).** `Jam in {answer}` sets Jam's Written key, which reads in the selected
  instrument's written pitch, so the answer, `Keep {key} {mode}` and the family labels follow it,
  not the kept session's instrument, even where the doodle's key signature then differs. Now in
  `screens/last-session-review/handoff.md`, Components and Content, `suggestion-row`.

## v3.2 wave 7, gate GD: the guide playback's controls, 2026-11-04

Master spec Part C §C19.3 (spec D490-D494), a minor design call under the owner's delegation
(spec D491): settled here, heard by the owner at hand check v3.2 HG.

- **D459 — The guide switches follow `Click` in `mix-controls` (2026-11-04; minor, spec D491).**
  The order is `Backing`, `Click`, `Melody guide`, `Rhythm guide`, then `Volume`: each guide a
  `btn toggle-button` with `aria-pressed` and its `toggle-button-state` ("on" or "off"), the
  accessible name the name alone, both off by default. Appended, so the two controls players know
  keep their place. No separator, group label or new class. Rejected: the switches inside the
  `Volume` popover (on/off is what a player reaches for mid-session, and the spec puts them beside
  the backing and click); one `Off / Melody / Rhythm / Both` segmented control (the spec makes them
  two independent switches, and it would be a new pattern in the toolbar). Stated in
  `screens/phrase-workspace/handoff.md`, Layout Tree and Components and Content, `mix-controls`.
- **D460 — Full labels at every breakpoint; the mix's line wraps (2026-11-04; minor, spec
  D491).** "Melody guide" and "Rhythm guide", no short form: "Melody on" beside "Backing on" would
  read as muting the tune, and a short form would not keep a narrow phone's mix on one line anyway.
  From `bp-tablet-landscape` up the mix stays one line, the toolbar's own wrap taking it under the
  title when the title's line cannot hold it; below, on its own line, `mix-controls` wraps onto a
  second line in the same order. A phone loses only that line of staff room. Stated in `screens/phrase-workspace/handoff.md`, Responsive Behavior.
- **D461 — The `Volume` popover holds four sliders in the switches' order (2026-11-04; minor,
  spec D491).** `Backing volume`, `Click volume`, `Melody guide volume`, `Rhythm guide volume`;
  every popover rule unchanged (focus to the first slider, live while its switch is off, saved when
  changed, a session's change saved at its end). The phone's compact `Volume` opens the same
  popover. On a phone in landscape it may run past the viewport's bottom; the page scrolls to it,
  with no size cap and no new token. Stated in `screens/phrase-workspace/handoff.md`, Components
  and Content, `mix-controls` and `session-cue-actions`.
- **D462 — The guide tokens are named by channel (2026-11-04; minor, spec D491).**
  `--mix-melody-guide-volume-min: 0`, `--mix-rhythm-guide-volume-min: 0`,
  `--mix-melody-guide-volume-default: 0.8`, `--mix-rhythm-guide-volume-default: 0.6`; maximum and
  step shared (`--mix-volume-max`, `--mix-volume-step`). `--mix-{channel}-volume-*` follows the
  backing's and click's names and the mix looked up by channel (C19.6); the plan's `--mix-guide-*`
  was a placeholder. Both reach silence, as C19.3 allows. The melody's first level is the
  backing's; the rhythm's lower, so with both on the melody leads. A channel's full level is its
  voice's peak, set by ear in chunk 40a; HG's ear may retune these, the tokens being the only edit.
  Stated in `src/styles/theme.css`, the audio-mix levels.
- **D463 — Gate GD's validation: four findings fixed (2026-11-04; minor, D119's standing rule).**
  `ux-critic`: DRIFT. Fixed: the wrap described as the CSS does it (one line from
  `bp-tablet-landscape` up, moved under the title by the toolbar's wrap; D460 corrected); both
  intent docs' phone paragraphs name the four toggles and give the phone's low priority as the
  reason; the edited `session-cue-actions` item tagged; the saved-data mix row holds the guides.
- **D464 — At Idle the bar's suggestion is offered again once "Jams now play in" has gone
  (2026-11-05; minor, D119's standing rule; chunk 24's call confirmed).** After Jam's key or mode
  changes again, the row is judged by the offering rule; a decline still holds for good. Unlike the
  review (D457), the bar is the one place at Idle that says what the doodle sounds like, and the
  row moves with the Loading the change starts. Now in `screens/phrase-workspace/handoff.md`, The
  kept doodle's bar, and `flows/jam/handoff.md`, The suggestion at Idle.
- **D465 — The suggestion's buttons are disabled during Loading, with `New doodle` (2026-11-05;
  minor, D119's standing rule; overrides chunk 24's call).** `Jam in` is a key-and-mode change,
  and those controls are read-only then; as built it bypasses that, and an old-key phrase being
  drawn can flash before the new one. `Keep` follows so one row has one rule. Code change: disable
  both while Jam's phrase 1 is written. Now in `screens/phrase-workspace/handoff.md`, The kept
  doodle's bar, Offering, and `flows/jam/handoff.md`, The suggestion at Idle.
- **D466 — Focus left without its element in `jam-bar` goes to the bar's sentence (2026-11-05;
  minor, D119's standing rule; chunk 24's call confirmed and widened).** Any focused element of the
  bar that goes (a button's row leaving or changing form, the set sentence giving way) hands focus
  to the bar's sentence. A start by the starting note with a bar button focused moves focus to
  `Stop`, as for the cue row's links. Now in `screens/phrase-workspace/handoff.md`, The kept
  doodle's bar, Focus.
- **D467 — Jam's too-many-notes sentence names Jam's cure (2026-11-05; minor, D119's standing
  rule).** "These notes need more room. Make the window larger, or play a new doodle with fewer
  notes." Jam has no density control; its rhythm comes from the doodle, and `New doodle` sits in
  the bar above. Code change: a Jam string beside `ROOM_NOTICE_TOO_MANY_NOTES`, used by the kept
  doodle's staff. Now in `screens/phrase-workspace/handoff.md`, Needs more room, the sentence table.
- **D468 — On a phone, the bar may push the staff below the fold (2026-11-05; minor, spec D414:
  phones a third-rate client).** Accepted: the page scrolls; no short form, no cap; the session
  start's jump brings the cue row and both systems into view. Now in
  `screens/phrase-workspace/handoff.md`, Responsive Behavior, `jam-bar`.
- **D469 — The band under the bar during a Jam on the kept doodle is the cue row (2026-11-05;
  minor, D119's standing rule).** From `bp-tablet-landscape` up, `session-cue-row` keeps its fixed
  block, empty after the read-in, as in any running session, so nothing it shows moves the staff.
  Accepted; the row does not collapse in Jam mode. Now in `screens/phrase-workspace/handoff.md`,
  Responsive Behavior, `jam-bar`.
- **D470 — The review after a Jam offers `Jam again on this doodle` (2026-11-05; confirms the
  design; spec D236: offered in every kept Jam session's review).** There it does what `Close
  review` does, focus included, its doodle being the kept one. The atom
  `rule_jam_again_on_this_doodle` is the side to align, by `documentalist`. Stated in
  `flows/review-and-export/handoff.md`, The Doodle and the Suggestion, and `flows/jam/handoff.md`'s
  flowchart (the review of a Jam to the kept doodle's Idle).
- **D471 — A bar button disabled while focused hands focus to the bar's sentence (2026-11-05;
  minor, D119's standing rule; widens D466 to D465's Loading).** It counts as its element going,
  so focus never stays on a dead button nor drops to the page. Native `disabled` stays, as for
  every button in Loading. Rejected: `aria-disabled` (three dead tab stops in every Loading, a
  second disabled model beside the header's, D350's case being read-only, not Loading). `Jam in`'s
  own press is no case: the set sentence replaces the buttons. Now in
  `screens/phrase-workspace/handoff.md`, The kept doodle's bar, Focus.
- **D474 — A phrase action disabled by Loading while focused gets focus back when it ends
  (2026-11-05; minor, D119's standing rule; D471's counterpart in the header).** Native `disabled`
  stays; nothing moves during the Loading (tens of milliseconds warm); at its end focus returns to
  the phrase action if it is still there or on the page, else the session action, else
  `controller-status`. A starting-note start moves it to `Stop`. Rejected: a placeholder target
  (the header has no sentence; two moves for a blink), `controller-status` at once (a second Enter
  opens the sheet), `aria-disabled` (D471). Now in `screens/phrase-workspace/handoff.md`,
  Components and Content, Focus on a phrase action that becomes disabled.
- **D475 — The `Volume` popover keeps running past a landscape phone's viewport (2026-11-05;
  minor, D119's standing rule; confirms D461 after chunk 40).** At 844×390 only its first slider
  shows; the page scrolls to the rest. No cap, inner scroll, second column or upward opening:
  phones are third-rate (spec D414). Now in `screens/phrase-workspace/handoff.md`, Responsive
  Behavior, `mix-controls`.
