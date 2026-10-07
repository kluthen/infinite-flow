# UI/UX Decisions

Append-only record of settled UI/UX decisions. Earlier logs are archived verbatim:

- D1–D44 (first release, v1.0): [archive/v1/decisions-D1-D44.md](archive/v1/decisions-D1-D44.md)
- D45–D176 (v2, released as version 2.0.0):
  [archive/v2/decisions-D45-D176.md](archive/v2/decisions-D45-D176.md)

Archived IDs keep their meaning; a citation to one by ID elsewhere in this repository stays valid
through this header. Numbering continues from D177.

- **D177 — The audio mix's levels are final as built (2026-10-07; applies spec D188, which closed
  Q31).** The owner accepted the click and backing volume ranges and default levels by ear, in
  real sessions (spec D188, 2026-10-05). The tier documents no longer call them placeholders
  awaiting listening tests: `strategy.md` (Context of Use, Sound), `flows/play-session/intent.md`
  (The Audio Mix) and `screens/phrase-workspace/handoff.md` (the `Volume` popover) now say they
  were set by ear in real sessions. Applied during the v2.0 milestone archive so the frozen
  `versions/v2/` copy matches what shipped. Not yet applied: the comment over the audio-mix block
  in `src/styles/theme.css` still says "proposed ... none is final"; it is corrected at the next
  edit of the token source (that pass edited `ui_ux/` only). No value changes.

## v3.0 (Storage) design, 2026-10-07

Inputs: `specs/versions/v3/master-spec.md` (v3.0, cited "§n" below) and `specs/personas.md`. The
owner asked for the whole v3.0 design in one pass, with `ux-writer` settling its own
recommendations and the owner reviewing everything at the end: every entry below is a settled
recommendation awaiting that review. Entries marked **(spec)** settle a behaviour the master spec
leaves open; they are listed together in Q67 for `spec-writer`.

- **D178 — v3 design starts; the root's v2 marks are cleared (2026-10-07).** Every Changes-since-v1
  block, `New in v2` line and v2 inline tag was removed from the root tier documents in one
  mechanical pass, and v3's changes are marked from the first edit on (`[v3 new]`,
  `[v3 changed]`, Changes-since-v2 blocks). Two leftovers, both outside this pass's reach: the
  `v2 new` / `v2 changed` comments in `src/styles/theme.css` and `components.css` (this pass may
  not edit application files; see D179), and one `%% end v2 new` comment line in
  `flows/generate-phrase/handoff.md`'s mermaid diagram, whose removal the session's permission
  check refused; it is cleared at the next edit of that file.
- **D179 — v3.0's token-source additions are specified in `ui_ux/token-source-v3.md` until they can
  be applied (2026-10-07).** The token source (`src/styles/theme.css`, `components.css`) is
  `ux-writer`'s, but this pass was barred from application files. The new component classes,
  their state matrices and the few new tokens are therefore written as a Tier 2 document of their
  own, which the handoffs cite by class name exactly as they cite the token source. The
  token-source pass that moves them into `src/styles/` (with the v2 comment clearing and the D177
  comment fix) needs the owner's go-ahead (Q66); the document is deleted in that pass.
- **D180 — Kept sessions live inside the review mode, at two levels (2026-10-07; §5.4).** The
  review keeps its v2 shape (it takes the staff's place; no session starts while it shows; the
  session action reads `Close review`) and gains a second level: the **session list** ("All
  sessions"), drawn in the same place. A session's review and the list switch with one press
  each; `Close review` leaves the whole mode from either level. Rejected: a separate page or
  route (a new top-level place for a function P1 and P2 rarely use), a side rail (the staff keeps
  the full width), a modal sheet for the list (a long list scrolls badly inside a dialog, and the
  review it opens is not a dialog). Screens: `screens/session-list/` (new),
  `screens/last-session-review/` (changed).
- **D181 — Two entry links at idle, in the cue row (2026-10-07).** `Review last session` stays,
  shown whenever the most recent session can be reviewed (kept, or only in memory after a failed
  save), so v2's one-press way back is unchanged and now also works after a reload. A second link,
  `All sessions`, is shown whenever at least one session is kept, and opens the list. Below
  `bp-tablet-landscape` they read `Last session` and `All sessions`, so the row still holds the
  starting-note line on one line. Rejected: one `Sessions` link (costs the one-press way back),
  links in the header (its widths are fixed and full).
- **D182 — The session list's rows (2026-10-07; §5.4).** Newest first. Each row: a title button
  (the date and time, opening the session; the most recent session's row adds "Last session"),
  one detail line (length, phrases, instrument, musical profile), one status line (pinned or not,
  the number of favorites, and "Played notes kept" when they are), the start of the comment on
  one line, cut with an ellipsis, then `Pin` / `Unpin` and `Delete`. No figure about how the
  player played, ever (§5.4). "Played notes kept" is the one field beyond §5.4's list: it is
  what makes a session's most private content visible where it can be deleted.
- **D183 (spec) — Every unpinned session is deleted when the next session is saved (2026-10-07;
  §5.1).** §5.1 deletes "the previous most recent session unless it is pinned" and says only one
  session is ever kept without the player asking; it does not say what happens to an older
  session the player unpins. Read with "only one session ever kept without asking" and the
  unpin confirmation's own wording, the design treats every unpinned session alike: it goes when
  the next session is saved. Rows and the review say so ("Not pinned: deleted when your next
  session is saved."). Recommended to `spec-writer` as a one-line clarification.
- **D184 — Pinning is two action buttons, not an on/off switch (2026-10-07; §5.1, §6).** `Pin` and
  `Unpin` name what happens; the state is written beside them in words. Unpinning a session with
  favorites opens a confirmation ("Unpin this session?" ... "Unpin" / "Keep pinned"); unpinning
  one without favorites does not ask, since it still survives until the next session and its
  status line says so.
- **D185 (spec) — Removing a session's last favorite never unpins it (2026-10-07; §6).** Marking a
  favorite pins; the reverse would make un-marking a favorite silently schedule a deletion. The
  player unpins by hand.
- **D186 — Deleting a session (2026-10-07; §5.4).** From its row or its review, after a
  confirmation ("Delete this session?" naming what goes with it: favorites, comment, played
  notes; "Delete session" / "Cancel"). Deleting from a review shows the list afterwards, its
  empty state included. Deleting the session that just ended also removes it from memory, and
  `Review last session` goes with it.
- **D187 — A kept session's review header (2026-10-07; §5.4, §5.5, §6).** In order: an
  `All sessions` button; the title ("Last session" for the most recent session, otherwise its
  date and time) with a summary line (date and time, length, phrases, instrument, profile,
  favorites) and a keep line (pinned, not pinned, or not saved, see D196); `Pin`/`Unpin` and
  `Delete session` at the row's end; the comment; the export row; the view row; then the phrases.
  The phone drops the summary and the keep line, as v2 dropped its summary, and keeps every
  control (the phone's review is the plain baseline of the review's functions).
- **D188 — Favorites are a star toggle at the end of each phrase's number-and-tempo line
  (2026-10-07; §6).** The place v2 reserved for per-phrase tools. A pressed button
  (`aria-pressed`) with a star shape, outline when off and filled when on, so colour is never the
  only signal; it reads "Favorite" beside the star from `bp-tablet-landscape` up and is the star
  alone on the phone, its accessible name "Favorite phrase {n}" everywhere. The first favorite
  pins the session; the keep line and the pin button change in place, with no toast and no
  message.
- **D189 — The export scope (2026-10-07; §6).** A `Whole session` / `Favorites only` segmented
  control, first in the export row because it governs both exports. It starts at
  `Whole session` every time a review opens and is not saved (§4.2 does not list it, and a
  remembered `Favorites only` would quietly export part of the next session). With no favorite,
  `Favorites only` is disabled with the field note "No favorites in this session yet." Under
  `Favorites only`, when no favorite phrase holds a played note, `Export played notes` is disabled
  with the note "No played notes in your favorites." File names add `-favorites` to the stem
  (`...-generated-favorites.musicxml`, `...-played-favorites.mid`).
- **D190 — The session comment (2026-10-07; §5.5).** Collapsed by default: `Add a comment` when
  empty; the comment's text with `Edit comment` when not. Editing shows a multi-line text field
  with a live "{n}/500" count and `Done`. The 500-character limit is a hard limit of the field
  (typing stops, a paste is cut at 500), so there is no error state. Saved on `Done`, when the
  field loses focus, and when the review is left or replaced; never exported (§5.5).
- **D191 (spec) — "Keep my played notes" (2026-10-07; §5.3).** One setting, shown in two places:
  `Your data`, and the review's view row next to `Played notes` (only when the session holds
  played notes), where the choice is most meaningful. Turning it on while reviewing the session
  that just ended, whose played notes are still in memory, keeps that session's played notes too:
  the player who sees their notes and switches "keep" on expects these to be kept. Turning it off
  keeps nothing new and, when any are kept, opens a confirmation offering to delete them
  ("Delete them" / "Keep them"); the switch is off either way.
- **D192 — Deleting played notes (2026-10-07; §5.3).** One session's: `Delete played notes` in
  that session's view row, shown only when its played notes are kept, after a confirmation; the
  lane, the switch and the played-notes export leave that review at once. Every session's:
  `Delete all played notes` in `Your data`, after a confirmation. Neither touches the sessions.
- **D193 — "Include very short notes" (2026-10-07; §9).** A toggle button in the played-notes
  export group, before `Export played notes`, off by default. It changes the played-notes file
  only (the lane follows the default, with no switch of its own, §9). It holds for the page visit
  and is not saved (§4.2 does not list it).
- **D194 — "Your data" is a sheet, opened from a page footer and from the session list
  (2026-10-07; §4.1, §4.5).** A one-line footer after the control section ("Kept on this device
  only." and a `Your data` button) is reachable at idle and in the review, never during a session;
  the session list's header has the same button. The sheet lists what is kept (settings, my
  instrument, the remembered controller, sessions with pinned and favorite counts, played notes),
  the space used, whether the browser protects the data, and the actions: the
  `Keep my played notes` switch, `Delete all played notes`, `Delete every session`,
  `Delete everything`. Rejected: a header button (the header's widths are fixed and full, and this
  is a rarely visited place).
- **D195 (spec) — After `Delete everything`, the page reloads (2026-10-07; §4.1).** The
  confirmation names everything that goes; then the saved data is deleted and the page reloads
  into its first-visit state. Resetting every control, the review and the controller in place
  would be a long list of special cases to get exactly right; a reload is the honest picture of
  "nothing is kept". `Delete every session` does not reload.
- **D196 — Saving problems are told outside a session, in one notice row (2026-10-07; §4.1, §4.3,
  §5.1).** An `app-notice` row at the top of the workspace, above the score panel, outside a
  session only: a notice present when a session starts stays, unchanged, so nothing moves; one
  that arises during a session waits for its end. Three notices: a save that failed (dismissible;
  when the storage is full it says so and offers `Your data`); an outdated tab ("A newer version
  ... Reload"), persistent; saved data that cannot be used at load (defaults, nothing saved,
  `Reload`), persistent. A session whose own save failed says it in its review's keep line
  instead ("Not saved on this device: export it to keep it."), since the review is where the
  player already is. Nothing ever confirms a successful save. Storage protection is shown in
  `Your data` only, never as a notice: the player can do nothing about a refusal except export.
- **D197 (spec) — The first phrase waits for the saved settings (2026-10-07; §4.4).** At load the
  workspace shows its loading state, with no controls changing under the player's eyes, until the
  saved settings are read, so the first phrase is generated from them and the saved theme applies
  before anything is drawn. If they cannot be read within a short start-up wait (proposed: 2
  seconds, a build constant), the app starts from the defaults, in memory, saves nothing, and
  shows the unusable-data notice (D196), so a stuck read never leaves a blank page and never
  overwrites kept data with defaults.
- **D198 — My instrument (2026-10-07; §7.1).** A `Create my instrument` button under the
  instrument control (`Edit my instrument` once it exists); the fourth segment appears only once
  it exists, labelled with its name. Creating and editing use a sheet: the template (three
  built-in profiles, at creation only, defaulting to the selected one; editing shows "Made from:
  {template}"); the name (at most 30 characters; left empty, it is "My instrument"); the range as
  two note steppers in written pitch, a semitone per step, notes named with their octave number;
  the transposition as a stepper reading "{n} lower", "Same" or "{n} higher", with the line "A
  written C4 sounds as {note}."; the derived Low, Middle and High windows, live. A range under two
  octaves is refused live: a notice gives the reason and the span ("The range needs at least two
  octaves (24 semitones) between its lowest and highest notes. It has {n}."), and `Save` is
  disabled until it is fixed. The steppers are not stopped at 24, so the player can move a whole
  range by one end then the other. Saving a new instrument selects it; saving changes to the
  selected one regenerates the phrase as a profile switch does. Deleting (in the sheet, after a
  confirmation) selects its template only if it was selected.
- **D199 (spec) — Changing the transposition keeps the written range (2026-10-07; §7.1, §7.2).**
  The range is entered in written pitch and stored in concert pitch (§7.1); when the
  transposition changes, in the sheet or from the check, the written range the player entered
  stays and the concert range follows. That is what the player knows of their instrument, and for
  a controller sending written notes untransposed it is what makes the check's fix correct.
- **D200 — "Use this for my instrument" in the transposition check (2026-10-07; §7.2).** On every
  result that is not a match, a plain button after `Continue`. It opens a confirmation inside the
  sheet stating the change ("A written C4 will sound as {note}", and, when there is no instrument
  yet, that one is made from the selected profile) with `Use for my instrument` and `Back`. On
  confirmation my instrument is saved, selected (the phrase regenerates as on a profile switch),
  and the sheet goes to `Connected` with the line "{name} now matches your controller." v2's
  other-profile hint stays as written.
- **D201 (spec) — The remembered controller at load (2026-10-07; §7.3).** The app asks for MIDI
  access at load only when the browser already allows it, so a load never raises a browser
  prompt; otherwise `Connect controller` shows as in v2. While the remembered controller is not
  plugged in, the header shows the no-controller badge, and it reattaches by itself with no check,
  exactly as v2's within-page reattachment. Through the sheet, a remembered controller among the
  inputs is chosen directly and the sheet goes to `Connected`, skipping the picker and the check
  (`Run check again` stays there).
- **D202 (spec) — Sound needs one click after a load, whatever reattached (2026-10-07; §7.3).**
  v2 relied on the `Connect controller` click to let the page play sound; browsers do not count a
  MIDI note. A controller reattached at load has had no click, so until the page has had its first
  click, tap or key press the starting note does not start a session, and the starting-note line
  reads "Click the page once, then play this note to start: {note}". Any click anywhere lifts it;
  `Start session` works as always. Surfaced rather than designed around: without this rule the
  first session of a visit could start silent.
- **D203 — Pre-generation has no interface (2026-10-07; §8).** Checked against every idle state:
  phrase 1, the starting note, the actions' availability and labels, `generation-status` and
  `notation-status` never change because of it; nothing shows it runs. No indicator was added.
- **D204 — Saved review preferences (2026-10-07; §4.2).** Format, the MIDI backing-track option
  and the `Played notes` switch are saved when changed, and return after a reload. The "Last
  session reached {n} BPM." note under the tempo stays memory-only, as in v2 (the reached tempo
  belongs to its session, §4.2).
- **D205 — `screens/last-session-review/` keeps its name (2026-10-07).** It now reviews any kept
  session; renaming the folder would break every inbound link and the frozen copies' parallel
  paths for no reader benefit. Its intent says what it covers.
- **D206 — Sheets block the starting note, and none opens during a session (2026-10-07).** As the
  connection sheet already does: while `My instrument`, `Your data` or a confirmation is open, no
  MIDI note starts a session; their openers are disabled during a session, like every control.
- **D207 — `todo.md` reworked for v3.0 (2026-10-07; §2).** The end-of-measure chord-fit
  presentation (old unit 9, ux D154) is dropped, because §2 drops the check itself. The v3.0
  units replace it.
- **D208 — One pattern for every confirmation (2026-10-07).** A confirmation is a `sheet` of its
  own when asked from the page (a list row, the review), or a state of the sheet already open
  (`Your data`, `My instrument`, the connection sheet). Its title is the question ("Delete this
  session?"); its body names what goes with it and, for a deletion, ends "This can't be undone.";
  its actions are the confirming action first, then the way back (`Cancel`, `Keep pinned`,
  `Keep them`, `Back`), in markup, visual and focus order as in every sheet. A deleting action is
  `btn btn-error`; a confirming action that deletes nothing (unpinning, using the check's result)
  is a plain `btn`, or `btn btn-primary` where it is the sheet's main step. On open, focus goes to
  the way back, never to a deleting action, so an Enter pressed out of habit deletes nothing;
  Escape, the backdrop and `Close` are the way back. Every label in v3.0 reads "All sessions" for
  the list: the cue-row link, the review's back button and the list's title.
- **D209 (spec) — `Disconnect` forgets the remembered controller (2026-10-07; §7.3).** The app
  remembers the last controller the player chose; `Disconnect` in the connection sheet is the
  player choosing none, so it clears the remembered one too, and the next load does not reattach
  it. Choosing another device in the picker replaces it. Deleting my instrument does not touch
  it; `Delete everything` clears it (§7.3).
- **D210 — Details settled while writing the kept sessions and the review (2026-10-07; unit V1).**
  Dates read in the browser's locale, short weekday, day, short month, year, hours and minutes
  ("Tue 6 Oct 2026, 18:42"), the same in titles, summaries and rows. "Most recent session" is the
  last session that ended with a review, while it exists; deleting it removes `review-link` until
  the next one. A session whose save failed has no row; any change in its review retries the
  save. A row that fails to open says "This session couldn't be opened. Try again, or delete
  it."; a row saved by a newer version has no `Pin`/`Unpin`; with saved data unusable, the empty
  list reads "Kept sessions can't be read in this visit." Removing the last favorite while
  `Favorites only` is chosen returns the scope to `Whole session`. Escape in the comment acts as
  `Done`; the comment is trimmed when saved. Row buttons carry the session's date in their
  accessible names. Deleting this session's played notes clears them from memory too and focuses
  the review's title. "Holds a played note" counts very short ones; including them does not
  change the file name.
- **D211 — Details settled while writing saved data and Your data (2026-10-07; unit V2).**
  Nothing of the workspace is drawn before the saved settings are read or the start-up wait
  ends (only the page background shows), and a read finishing after the wait is ignored for that
  visit. Data written by a newer version at load: the readable values are used, nothing is saved,
  and the outdated-tab notice shows (unusable-data is only for a failed or timed-out read). My
  instrument failing the profile rules at load loads as absent, and a selection of it falls back
  to the default. The persistence request is made at the first pin, favorite or saved instrument
  of each visit while the data is not protected. One notice at a time: save-failed and
  storage-full are one notice worded by its latest cause, the two persistent notices replace it;
  after `Dismiss` it returns only on a failure following a success. Notice buttons are disabled
  during a session; after `Dismiss`, focus goes to the session action, else the phrase action,
  else `controller-status`. In a visit where saving is off, sessions are not saved and Your data
  shows only the space, the protection and `Delete everything`. `Delete every session` also drops
  the most recent session from memory. Turning `Keep my played notes` on from either place keeps
  the played notes of the session that just ended (extends D191); `Delete all played notes`
  leaves the setting as it is. While a deletion runs, the way back does nothing. Space is
  rounded in KB, then MB. Your data opens with focus on `Done`, at its top. Added by the lead: a
  session save refused because storage is full also raises the storage-full notice, as the
  review opens, since the keep line cannot offer to free space.
- **D212 — Details settled while writing my instrument and the check (2026-10-07; unit V3).**
  The name field starts empty with the note "Left empty, it is called My instrument."; it is
  trimmed, and spaces alone count as empty; Enter in it saves. A range whose lowest note is above
  its highest says so in the refusal. A range stepper stops where its note would sound outside
  MIDI 0-127, the transposition stepper where either range note would; `Use this for my
  instrument` is not offered when the result would sound outside that range. Changing only the
  name of the selected instrument keeps the phrase. A save made while a phrase generates applies
  when that generation ends. Leaving the form discards its changes without asking. Focus opens on
  the template (creating) or the name (editing) and returns to the `instrument-actions` button;
  `Back` from the check's confirmation returns it to `Use this for my instrument`. Escape, the
  backdrop and `Close` are the way back in both confirmations. With my instrument selected, the
  check reads "your instrument, {name},"; the other-profile hint considers only the three
  built-in profiles. The remembered controller is replaced as soon as a new device enters the
  check; a load never shows the MIDI-blocked badge, and a failed request at load falls back to
  `Connect controller`.
- **D213 — Details settled while writing the workspace (2026-10-07; unit V4).** The app opens in
  **Empty** and generates nothing at load, as in v2, so there is no loading state to wait in: the
  workspace is drawn once the saved settings are read (D211), and the load wording of D197 and
  `strategy.md` was aligned to that. Footer: "Your settings and sessions are kept on this device
  only." Phone wording before the first click: "Click once, then play to start: {note}" (the
  longer wording's clauses " the page" and " this note" are `cue-clause` runs, hidden on the
  phone); `review-link`'s two labels are `cue-label-wide` / `cue-label-narrow` (added to
  `token-source-v3.md` by the lead, with the panels' row gap). A session ended in its count-in
  leaves the most recent session reviewable, and both links return; a session start discards
  nothing. Theme and mix changes made during a session are saved at its end. The
  `instrument-actions` button is disabled in **Loading** too, as every control is. The header
  starts in its badge forms when the remembered controller is expected (D201).
- **D214 (spec) — My instrument's range counts toward the staff's one system-position size
  (2026-10-07; §7.1).** The workspace sizes its two system positions for the tallest reach of any
  one instrument's written range; my instrument joins that rule, so a range reaching far above or
  below the treble staff makes the staff area taller for every choice, re-sized only when my
  instrument is saved or deleted, and on a phone the height-fit scale absorbs it. The cost is
  real: every instrument is in treble clef (§7.1 keeps no clef choice), so a low custom range
  means many ledger lines and a smaller phone staff. Recommended to `spec-writer` with §14's
  open "stricter range check": bounding my instrument's written range to what the treble staff
  shows legibly would remove the cost.
- **D215 — `ux-critic`'s v3.0 milestone pass: DRIFT, five findings, all resolved
  (2026-10-07).** (1) A session whose save failed is told on every device: the review's keep line
  stays on the phone in its "Not saved" form (the pin button's label cannot say it), and a save
  refused for full storage also raises the storage-full notice; `screens/phrase-workspace/`,
  `screens/last-session-review/`, `flows/review-and-export/` and `strategy.md` aligned with
  `flows/saved-data/`. (2) Theme and audio-mix changes made during a session are saved at its end
  (with the session's save, or alone when the session ends in its count-in); `flows/saved-data/`
  aligned; logged as D216 for `spec-writer`. (3) Row summaries of kept sessions are read during
  the load wait and a full session when opened; after `Delete every session` focus returns to
  the sheet's opener, as from every sheet; the my-instrument delete confirmation now follows the
  shared pattern (a separate "This can't be undone." paragraph, a failed-deletion line). (4) The
  my-instrument sheet shows a staff-reach note while the written range reaches further from the
  staff than every built-in profile's, saying the staff gets taller for every instrument and may
  no longer fit a phone; the range bound itself stays with `spec-writer` (D214). (5) Version tags
  corrected in `strategy.md` and `screens/last-session-review/handoff.md`. Also, on the critic's
  note: the starting-note line's before-the-first-click wording is kept as a safeguard and says
  so, since opening in **Empty** means a phrase normally appears only after a click or key press.
- **D216 (spec) — Theme and audio-mix changes made during a session are saved at its end
  (2026-10-07; §4.2, §13 item 7).** §4.2 saves a setting "when the player changes it" and §13
  item 7 forbids any write between Start and the session's end; the two meet by deferring that
  write to the session's end. Values the app changes by itself during a session are never saved.
- **D217 — `ux-critic`'s recheck of the v3.0 fixes (2026-10-07).** Every D215 finding resolved;
  three places fix (1) had missed were corrected the same way (the review flow's keep-line bullet,
  the review intent's keep-line paragraph, the review handoff's change block). The v3.0 set is
  validated for the owner's review.

## v3.0 owner review and token-source pass, 2026-10-07

- **D218 — The owner approves the v3.0 design (2026-10-07; spec D221).** At his final review of
  v3.0 the owner approved every v3.0 design decision, D178-D217, as presented. His three explicit
  answers that touch this tree: ux Q66 is allowed (one `ux-writer` pass on
  `src/styles/theme.css` and `components.css`, build plan chunk 1; see D220), closing Q66; the
  stale `%% end v2 new` line in `flows/generate-phrase/handoff.md` is removed, completing D178;
  and the behaviours listed in Q67, written into the master spec by `spec-writer` (spec D219,
  master spec v1.2), are approved with the rest, closing Q67.
- **D219 — An outdated tab offers no Delete everything (2026-10-07; applies spec D220 (5), master
  spec v1.3 §4.3 and done item 14).** The design offered `Delete everything` in both visits where
  saving is off (D211). The spec, which wins, has an outdated tab save and delete nothing, Delete
  everything included, the notice asking for a reload first. `screens/your-data/` now drops
  `sheet-actions-destructive` in an outdated tab and says in the sheet's notice that nothing can
  be deleted until the page is reloaded; a visit started from the defaults after unreadable data
  keeps `Delete everything`, its way back from data damaged for good. `flows/saved-data/` says the
  same. The rest of §4.3's outdated-tab rule (it reads what it can; a kept session saved by a
  newer version is listed as such and does not open) was already designed. Whether the other
  deletions are offered in an outdated tab is Q68.
- **D220 — The token-source pass (2026-10-07; build plan chunk 1, allowed by the owner, D218).**
  Applied on branch `v3-c1-token-source` (worktree `infinite_flow-v3-c1`), one commit, for the
  owner to merge: every token and class of `token-source-v3.md` is in `src/styles/theme.css` and
  `components.css` under `v3 new` / `v3 changed` comments; the `v2 new` / `v2 changed` comments
  are cleared (D178); the audio-mix comment says the levels were set by ear and are final (D177).
  Details settled while writing it, none visible as a design change: `textarea` joins the base
  rule that makes form controls inherit the page font; the panel rows of `review-panel` and
  `sessions-panel` are spaced by one rule on the panels' children, so `review-header` loses its
  own bottom margin (the v2 review's header-to-list space goes from `--spacing-4` to
  `--spacing-3` until the v3 markup lands); `sessions-header` wraps on the phone rather than
  stacking, per `screens/session-list/`; `favorite-toggle`'s word is the button's one `span`
  (hidden below `bp-tablet-landscape`) and the star's outline or fill is set by the class, so one
  SVG serves both states; field groups inside `sheet-section` and `review-comment` drop their
  bottom margin, the container's gap spacing them. `token-source-v3.md` stays until the branch is
  merged: deleting it then, and pointing `README.md` and the four handoffs that cite it at the
  token source alone, needs the build plan's two links to it repointed by `spec-writer` first.
- **D221 — An outdated tab offers no deletion of any kind (2026-10-07; applies spec D223, master
  spec v1.4 §4.3 and done item 14; closes Q68).** `spec-writer` settled Q68 as recommended: from
  the moment a tab is outdated, the session list's rows have no `Delete`, a review has no
  `Delete session` and no `Delete played notes` (the session held in memory included), and
  turning `Keep my played notes` off changes the switch for the visit only, saves nothing and
  opens no confirmation; `Delete everything` was already absent (D219). The reload notice is the
  way forward. Rejected, by the spec: a deletion that only hides a session for the visit. Applied
  to `flows/kept-sessions/` (a new section, In an Outdated Tab, routing all of it; a session's
  end while saving is off saves and deletes nothing), `screens/session-list/`,
  `screens/last-session-review/`, `flows/review-and-export/`, `flows/saved-data/` and
  `screens/your-data/`. Details settled here, as minor design issues (D119's standing rule):
  a row saved by a newer version, met only in an outdated tab, now has no `session-row-actions`
  at all (its `Pin` was already absent), and the intents no longer say it can still be deleted;
  a row whose opening failed reads "This session couldn't be opened. Try again." in an outdated
  tab, without "or delete it"; when a tab becomes outdated while the page is open, the deletion
  buttons leave with the notice's arrival, an open deletion confirmation closes deleting nothing,
  and focus that was on a button that left or in that confirmation goes to `review-title` in a
  review, the list's title in the list, and `Done` in Your data (whose Overview takes its
  outdated form in place). The focus rule after a row's deletion drops "that row's `Delete` when
  it cannot be opened", a case that can no longer occur. Pin, unpin, favorites and the comment
  still work in memory only, unchanged.
- **D222 — Newer data wins over a failed read (2026-10-07; applies spec D225, master spec v1.4
  §4.4).** Checked, no change needed: the unusable-data notice already tells the player, outside
  a running session, that the saved data couldn't be read, that the visit saves nothing and that
  reloading may fix it; a read slower than the start-up wait is already treated as a failed one,
  `Delete everything` included; no copy calls the data "damaged" (the reason given in
  `screens/your-data/` and `flows/saved-data/` is reworded from "damaged for good" to "the way out
  when reloading does not help, whether the data is unreadable or only slow to read"). Changed:
  the old rule "Unusable data, set at load, is never replaced" goes. A visit started from the
  defaults after a failed or too-slow read becomes an outdated tab in every respect the moment
  data written by a newer version is known to exist: found at load (for example a database a
  newer version upgraded, refusing to open), revealed by a read that finished after the start-up
  wait, or written by a newer version while the tab is open. Its `Delete everything` goes with
  every other deletion (ux D221's In an Outdated Tab rules apply as written: an open deletion
  confirmation closes deleting nothing, focus to `Done` in Your data). Settled here, as a minor
  design issue (D119's standing rule): **which notice shows** — the outdated-tab notice, in a
  second wording for a visit started from the defaults: "Your saved data couldn't be read, and a
  newer version of Infinite Flow has saved data on this device. This visit started from the
  defaults and saves nothing. Reload this page to use the newer version." It replaces the
  unusable-data notice in place (held to the session's end if detected during one, like any
  notice), and is used from the first frame when both are found at load. Rejected: keeping the
  unusable-data notice alone (it would leave the missing `Delete everything` unexplained and not
  ask for the reload as an outdated tab's notice must, §4.3); switching to the plain outdated-tab
  notice (it would leave the reset controls unexplained and drop §4.4's "couldn't be read"). Your
  data's sheet notice gets the matching third wording. Also settled: no deletion starts once
  newer data is known; one already running is not interrupted and its outcome is told as usual.
  Applied to `flows/saved-data/` (handoff: Saving off, a new "Newer data wins" paragraph, the
  load diagram, the late read, the notices table and one-at-a-time rule, the session-hold rule,
  the Your Data diagram; intent), `screens/your-data/` (handoff and intent),
  `flows/kept-sessions/handoff.md` (In an Outdated Tab), `flows/generate-phrase/handoff.md` and
  `screens/phrase-workspace/handoff.md` (the notice at load), and `strategy.md` (Edge-Case
  Policy). Logged Q69 for the one spec contradiction found.
- **D223 — A visit that couldn't read its saved data offers no deletion in the review (2026-10-07;
  closes Q69; applies spec D226, master spec v1.4 §4.4).** As recommended in Q69: in a visit
  started from the defaults because the saved data couldn't be read, or not within the start-up
  wait, the review of the session held in memory offers neither `Delete session` nor
  `Delete played notes`, as in an outdated tab, and turning `Keep my played notes` on or off
  there applies to the visit only and opens no confirmation. `Delete everything`, in Your data,
  stays that visit's only deletion until data written by a newer version is known (ux D222).
  Settled here, as a minor design issue (D119's standing rule): one shared rule for both
  saving-off visits. `flows/kept-sessions/handoff.md`'s section In an Outdated Tab becomes While
  Saving Is Off, covering both visits and stating their one difference (`Delete everything`);
  every handoff that cited the old section now cites the new one, and every "absent in an
  outdated tab" about the list's and the review's deletions reads "while saving is off".
  Rejected: a second section for the failed-read visit, which would repeat every rule but one.
  Applied to `flows/kept-sessions/` (handoff: the diagram, Deleting a Session, While Saving Is
  Off; intent: Deleting, At the Edges), `screens/last-session-review/` (handoff: the layout
  tree, the session tools, `Keep my played notes`, `Delete played notes`, the Saving off state,
  which replaces Outdated tab, and the change block, which now lists that state; intent),
  `flows/review-and-export/` (handoff: the diagram, Delete session, the played-notes rules;
  intent), `flows/saved-data/` (handoff: Saving off and the load diagram; intent: the
  unusable-data notice, the played-notes switch), `screens/your-data/intent.md`,
  `screens/session-list/handoff.md` (its two citations) and `strategy.md` (Edge-Case Policy:
  loading saved settings). Also fixed in `strategy.md`, a leftover of ux D221: a session this
  version cannot read is no longer said to be deletable from the list; it can be neither opened
  nor deleted from the outdated tab that meets it.
