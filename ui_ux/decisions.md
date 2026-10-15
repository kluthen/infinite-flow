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
- **D224 — No save retried while saving is off (2026-10-07; `ux-critic`'s narrow pass on ux
  D221-D223).** The pass found the edits aligned with master spec v1.4 §4.3 and §4.4 (spec D223,
  D225, D226) and one low gap: a session held in memory because saving is off was said to be held
  "as after a failed save", and a session whose save failed retries its save at each change, so
  a builder could read that a pin or favorite in an outdated tab tries a save, which §4.3
  forbids. Fixed: the review's Saving off state (`screens/last-session-review/handoff.md`) says
  no change made there tries a save and that the keep line reads "Not saved on this device:
  export it to keep it."; `flows/kept-sessions/handoff.md`, Keeping at a Session's End, says the
  same; the retry rule in `flows/review-and-export/handoff.md`, Saving the Session, applies while
  saving is on. A cross-reference to `flows/saved-data/handoff.md`'s existing "every save is
  skipped", not a new rule. Also corrected: D223 says every "absent in an outdated tab" about the
  list's deletions now reads "while saving is off"; `screens/session-list/` rightly keeps "in an
  outdated tab", since a failed-read visit's list has no rows, and only its two citations of the
  renamed section changed.

## v3.1 (presets and embellishment figures) and v3.2 (Jam) design, 2026-10-08

Inputs: `specs/versions/v3/master-spec.md` Part B (v3.1, cited "§Bn") and Part C (v3.2, cited
"§Cn"), approved by the owner on 2026-10-08; `specs/personas.md`; the lexicon. The owner asked for
both releases in one pass, settled by `ux-writer` under the standing delegation (D119, D135,
archived): minor issues settled here, phones low priority, a running session never asks the
player anything, one full owner review at the end. Implementation is paused: nothing in `src/` is
edited. Entries marked **(spec, provisional)** carry a recommendation on a spec gap logged for
`spec-writer` (Q70-Q72).

- **D225 — v3.0 frozen; v3.1 and v3.2 marked on top of v3.0's marks (2026-10-08).** The approved
  v3.0 design (D218, with the spec alignments D219-D224) is copied, marks included, into
  `versions/v3.0/` with a summary README, before any v3.1 edit at the root; only link paths were
  adjusted in the copy. The root keeps v3.0's marks (`[v3 new]`, `[v3 changed]`, the Changes since
  v2 blocks): v3.0, v3.1 and v3.2 are three releases of one version, designed back to back while
  v3.0 is still unbuilt, and the owner asked for them to be marked alike so each can be built on
  its own. So, at the root: a v3.0 change keeps `[v3 new]` / `[v3 changed]` and an unprefixed
  change-block item; a v3.1 change is tagged `[v3.1 new]` / `[v3.1 changed]` and listed in the
  change block as `_v3.1 new:_`, `_v3.1 changed:_` or `_v3.1 removed:_`; v3.2 likewise with
  `v3.2`. In code blocks and diagrams the same words go in the annotation or a `%%` comment. A
  document new in one of them carries `> **New in v3.1.**` (or v3.2). Removals link to the old
  wording in `versions/v3.0/`, which also holds every unchanged v2 wording. **v3.1 is built before
  v3.2**, so a v3.2 change to text v3.1 added is written as its own tagged paragraph or item,
  leaving the v3.1 text whole: a v3.1 builder reads everything but the `v3.2` tags. A v3.1 change
  to v3.0 or v2 text replaces it in place, the old wording being in `versions/v3.0/`. Every mark:
  `grep -rn "v3\(\.[12]\)\? \(new\|changed\)" ui_ux --include=*.md`. All three releases' marks are
  cleared together when v4's design starts. The v3.0 build plan links the root documents by
  section; it should point at `versions/v3.0/` instead (for `spec-writer`, reported).
- **D226 — v3.1 and v3.2 tokens and classes go in `token-source-v3.1-v3.2.md` (2026-10-08).** As
  D179 did for v3.0, while implementation is paused: one Tier 2 document in two parts, v3.1 then
  v3.2, so each release's token-source pass can be applied alone. `token-source-v3.md` stays as it
  is. No new colour, type or spacing value; a few sizes only.

### v3.1

- **D227 — The preset selector is a native select, at the top of the controls (2026-10-08;
  §B6.3, §B10).** The owner's direction: a combo box placed higher. It takes the first row of
  `control-section`, a `preset-bar` under the section's title, copy and summary and before the
  musical groups (choosing a starting point comes before fine-tuning); the "Musical profile
  preset" field leaves the foundation group. The control is a native `select` (a select-only combo
  box: one closed box, a list on demand), styled as `preset-select` at a fixed inline size, so a
  long name never moves anything. Native, because it is the most familiar and robust dropdown,
  keyboard and touch included, and 8 to 58 entries (eight built-ins, up to 50 player presets) fit
  no segmented control. Its list is grouped with `optgroup`s, which also tell built-in presets from
  the player's own: **Practice** (Neutral, Gentle, Speed drill), **Styles** (Jazz, Bebop, Pop song,
  Reel, Modal (Dorian)) and **Your presets** (the player's, alphabetical ignoring case, duplicates
  listed as they are; the group absent while there are none). In Custom the box shows "Custom,
  based on {name}" or "Custom" through a selected option that is `disabled` and `hidden`, so it can
  never be chosen from the list: only choosing a preset leaves Custom (§B6.4). Re-choosing the
  preset already selected outside Custom changes nothing, which is the spec's rule for an identical
  preset. Read-only like every control during **Loading** and a session: the box keeps its value at
  full strength under the read-only ring, focusable, and a change is refused. Rejected: a segmented
  control (cannot hold the list), a custom listbox (more code for the bundle budget, §B12, and less
  familiar), a filterable text combo box (nothing to type for at most 58 names).
- **D228 — The selection's display and the description line (2026-10-08; §B6.4, §B6.5, §B10).**
  The box itself names the selection; v2's `preset-status` line and its "grammar retained" text go,
  and so does its live announcement. Under the box, a `field-note` describes the selection:
  for a built-in, its description (below); for a player preset, "Your preset." then what its key
  and mode restriction holds in words ("Meant for G Dorian.", or nothing for any); in Custom,
  "Changed from {name}. Save as a new preset to keep these settings under a name." (adding ", or
  save the changes into {name}" when the base is the player's), or, with no base, "Your own
  settings. Save them as a preset to keep them under a name." Built-in descriptions: Neutral
  "Plain lines in the key, in quarter notes: the app's starting point."; Gentle "One chord,
  quarter notes, steps only, nothing tense. A warm-up, or a first try at improvising."; Speed drill
  "Dense, changing rhythms with every embellishment favored, to read fast in any key."; Jazz
  "Eighth notes, offbeats, and short notes from outside the key."; Bebop "Fast jazz lines that
  circle chord notes from outside the key. It uses Major rather than Ionian: the same notes, with
  chords that lead home through the chord on the 5th note."; Pop song "Song-like phrases over
  familiar chords. It uses Major rather than Ionian: the same notes, with chords that lead home the
  way songs do."; Reel "A fast folk dance in steady eighth notes, in Mixolydian or Dorian. Also
  try it in Ionian (a major key)."; Modal (Dorian) "A steady two-chord bed in Dorian, so its color
  note is heard in the melody." During a session the line keeps the text it had at the start,
  whatever Vary settings does, and the box alone shows Custom (D232): nothing below the staff
  changes length during a session. `control-summary`'s second segment reads the preset's name,
  "Custom, based on {name}" or "Custom" ("C Mixolydian · Custom, based on Reel · Lift · Shaped").
- **D229 — The key and mode highlight: a mark and a sentence, never a block (2026-10-08; §B6.4,
  §B10, the owner's direction).** While a restriction is in force and its half is a list, each
  allowed segment of that control (Written key for the keys half, Collection for the modes half)
  takes `is-marked`: a small filled dot at the segment's top inline-end corner, `--color-accent` on
  an unselected segment and `--color-accent-text` on the selected one. A shape, so colour is never
  the only signal, and distinct from the selected fill and from `toggle-button`'s block-end bar.
  Under that control a `field-note`, named by the `radiogroup`'s `aria-describedby`, says it in
  words: "{preset} is meant for {list}, marked. Any {mode/key} works; another one makes your
  settings Custom." ({list} in the control's own labels, "Mixolydian or Dorian"; {preset} is the
  selection, or Custom's base.) With "any", or no restriction in force, nothing is marked and the
  note is absent. No segment is ever disabled for a restriction. The mark and the note change only
  at Idle (a session's Vary settings stays inside the restriction, §B8.1), so they never move
  anything during a session. Rejected: a dimmed "outside" style (reads as disabled), colour alone.
- **D230 — Embellishment figures: a group of seven level controls (2026-10-08; §B5, §B10).** A new
  control group, **Embellishments**, after the four musical groups and before "During a session",
  in a row of its own from `bp-tablet-landscape` up with its fields in columns, as "During a
  session" is: the figures are many and alike, and a column each keeps them comparable. An intro
  line under its heading: "How often the app decorates the melody with each figure. A preference,
  never a promise: the rhythm decides where a figure fits." Seven fields in the spec's order, each
  a `segmented-control` of four levels with plain labels: **Off**, **Rarely**, **Often**, **Very
  often** (the spec's Off, As today, Favored, Strongly favored: "As today" now means "only when
  nothing plainer fits", which a beginner hears as rarely). Each field's `field-note` says what the
  figure is, with an example, and what rhythm it needs: Passing tone "A scale note filling the gap
  between two notes, like C–D–E. Needs three notes in a row."; Accented passing tone "The same,
  landing on beat 1 or 3, so it sounds tenser. Needs a note on beat 1 or 3."; Neighbor tone "A step
  away from a note and straight back, like E–F–E. Needs three notes in a row."; Appoggiatura "A
  leap to a note outside the chord on beat 1 or 3, then a step down or up onto a chord note. Needs
  a note just before beat 1 or 3."; Diatonic enclosure "The scale notes just above and below a
  chord note, then that note, like F–D–E. Needs three back-to-back notes under one chord, so it's
  rare with quarter notes."; Chromatic approach "A note from outside the key, a half step from the
  next note, like D♯–E. Needs two back-to-back notes."; Chromatic enclosure "Notes a half step
  above and below a chord note, then that note, like F–D♯–E. Needs three back-to-back notes under
  one chord, so it's rare with quarter notes." Always shown, never collapsed: a hidden group would
  hide what a preset changed. **The passing-and-neighbor rule** (§B5.6) is designed but ships only
  if the cost guard requires it: while one of the two is Off, the other's `Off` segment is
  disabled with a `field-note`, "Passing tone and neighbor tone can't both be off: one of them
  keeps the melody moving.", like Note density's `Sixteenth` on a phone. The labels differ from
  the spec's working names and the lexicon's entry; `documentalist` aligns the lexicon.
- **D231 — Saving, renaming and deleting presets (2026-10-08; §B6.6, §B7, §B10).** A
  `preset-actions` row in the preset bar, plain `btn`s: `Save as new preset` always; `Save changes`
  only in Custom based on a player preset; `Rename preset` and `Delete preset` only while the
  selection is a player preset or Custom based on one (they act on that preset); `Delete preset`
  absent while saving is off. Enabled at Idle and in the review mode, during **Loading** too
  (saving changes no setting, §B6.6); disabled during a session, the row then holding exactly what
  it held at the start, so Vary settings' Custom never adds a button mid-session. **Save as new**
  opens a sheet (`screens/preset-sheet/`): a name field, prefilled "My preset" (numbered, "My preset
  2", when taken) and selected; a **Key and mode** choice of §B6.6's three, as a vertical
  radiogroup (`choice-list`): "As now: {restriction in words}" (the default), "Only {key} {mode}"
  and "Any key and mode"; when no restriction is in force "As now" is any key and mode, so the two
  merge into one option, "Any key and mode", the default. **Save changes** is one click, no
  confirmation, while the key and mode are inside the preset's restriction; **(spec, provisional,
  Q71)** when they are outside it, it opens the same sheet without the name field, asking the
  restriction (as now, then any key and mode, the default; or only this key and mode).
  **Rename** opens the sheet with only the name field, prefilled with the current name.
  **Delete** opens the shared confirmation ("Delete the preset “{name}”?", "Your settings stay as
  they are.", "This can't be undone.", `Delete preset` in `btn-error`, `Cancel`). A refused name
  says why, live, in a notice-toned alert under the field, and `Save` waits: "Give it a name.",
  "There's already a preset called “{name}”." (ignoring case, built-ins included), "“Custom” is
  used by the app. Choose another name."; the field's `maxlength` holds 40 characters after
  trimming. At 50 or more player presets `Save as new preset` is disabled, with a `field-note`:
  "You have 50 presets of your own, the most the app keeps. Delete one to save a new one." A save
  refused by the browser raises the save-problem notice in a preset wording ("Your preset
  “{name}” couldn't be saved on this device. You can use it until this page closes."), at once,
  since preset management happens outside a session. While saving is off, presets made or changed
  last for the page under the visit's existing notice, with no wording of their own.
- **D232 — Presets during a session (2026-10-08; §B8.1, §B8.2).** A Vary settings move of a
  preset-held setting (a control or a figure level) turns the box to "Custom, based on {name}" at
  the moment the first phrase built with it starts sounding, as every automatic change shows, and
  the end of the session restores the selection with the settings; Tension across phrases never
  does. A figure step shows as the figure's level changing in place. Vary settings' note gains a
  sentence: "Keys and modes stay within what your preset is meant for." (§B8.1). Nothing is
  announced.
- **D233 — The preset label in kept sessions (2026-10-08; §B9).** The session list's detail line
  and the review's summary write `{preset}` where they wrote `{profile}`: the label the session
  recorded at its start, as `control-summary` writes it ("Bebop", "Custom, based on Bebop",
  "Custom"); a session kept by v3.0 shows "Neutral", "Jazz" or "Custom, based on Jazz". A
  snapshot: a later rename or deletion never changes it.
- **D234 — Your data lists the player's presets (2026-10-08; §B7, §B16).** A **Presets** section
  after My instrument: "{n} presets of your own." ("1 preset", "None.") and a hint, "Delete one with
  Delete preset, in the controls. Delete everything removes them all." The Settings line names
  "the preset" instead of "the musical profile". A failed-read visit lists none; Delete everything
  removes them, unreadable records included.

### v3.2

- **D235 — Jam lives with the session options; Start reads `Start Jam` (2026-10-08; §C5.1,
  §C12).** Jam is the first field of "During a session": the group already gathers "what the app
  will do once I start", and Jam is the biggest change to that. `Off`/`On`, note "Start by playing
  a doodle, an idea of one to four measures, after the count-in. The phrases then continue it."
  Without a controller it is unavailable exactly as Rising tempo is (`On` disabled, `Off` shown,
  "Needs a connected controller.", the choice kept). While Jam mode is in effect the session
  action reads **`Start Jam`** (same fixed inline size), so the mode shows where the player acts.
  **Dependent options sit under their switch, in its column, only while it shows `On`**: Drift
  under Jam, Allowed rhythm changes under the rhythm lock, What may vary under Vary settings (which
  also shows while Vary settings cannot be turned on, so its cause can be fixed: D244). A hidden
  dependent keeps its values. Rejected: Jam beside the session action (the header's widths are
  fixed and full), in the score toolbar (its audio mix is never locked; Jam is).
- **D236 — Idle in Jam mode (2026-10-08; §C5.1, §C5.2).** Without a held doodle the staff takes a
  new state, `staff-jam`: the top system shows an empty staff with the clef, the key signature of
  the selected written key and collection, and the time signature, and the bottom system's place
  holds one instruction, "After the count-in, play your doodle: one to four measures. The app
  continues it." The phrase action reads `Generate phrase`, disabled, secondary (there is nothing
  to generate); `Start Jam` is primary. `start-note-line` names the home note in its usual wording
  (§C5.2), with no `start-note-marker` (no note to mark). The idle phrase rules do not run; the
  unsupported-rhythm alert, the no-room notice and the orientation guard still block the start, as
  for any session. Turning Jam on, or a controller attaching with Jam on, discards the phrase on
  screen, any generation-failure banner and notation error, and shows `staff-jam`. **(spec,
  provisional, Q70)** Leaving Jam mode at Idle (the switch off, the controller lost, a held doodle
  dropped with Jam out of effect) shows **Empty**, generating nothing until the player asks.
- **D237 — The Jam's cue row and staff before phrase 1 (2026-10-08; §C5.3-§C5.7, §C12).** The
  count-in is v2's. During the capture, `session-cue-row` holds `jam-capture`: the label "Your
  doodle" and four measure numbers, 1 to 4, lit as each measure begins (`is-current`, `is-past`),
  styled as the count-in's beats; measures after the doodle's end never light. During the
  generation measure and any extended wait it holds `jam-writing`, "Writing your first phrase",
  static (no animated ellipsis). During the read-in measure it holds the count-in's four beats
  again, phrase 1 now on screen. The staff keeps `staff-jam`, instruction included, until phrase 1
  enters, at the read-in measure, with the ordinary `staff-content` fade (top system; bars 1-2 top
  and 3-4 below in the split layout); phrase 2 then fills the bottom system as after v2's count-in.
  No playhead and no doodle note are drawn before phrase 1. On a phone `jam-capture`'s label
  shortens to "Doodle" and `jam-writing` to "Writing". A Jam on a held doodle is a v2 start in
  every respect.
- **D238 — A Jam that ends before phrase 1 sounds (2026-10-08; §C5.7, §C5.13).** It ends as a
  count-in end: the workspace returns to Jam mode's Idle, focus on `Start Jam`. Only one cause is
  told: when every attempt at phrase 1 failed, `staff-jam` adds a notice-toned line under its
  instruction, "The app couldn't continue your doodle with these settings. Try again, or change a
  setting.", until the next start or a change of any setting; never error-toned (nothing is the
  player's fault). Stop, no doodle note within 30 seconds, a lost controller, a hidden tab and a
  staff that can no longer be shown say nothing more, as a v2 count-in end.
- **D239 — A held doodle at Idle, and its suggestion (2026-10-08; §C5.11, §C6.4, §C6.5).** While a
  doodle is held, a `jam-bar` sits between the score toolbar and the cue row: "Jamming again on
  your doodle: phrase 1 continues it. Changing a setting other than the tempo lets it go." and,
  when there is a suggestion, the suggestion row of D240. It is held still during the Jam started
  from it (buttons disabled), like the notice row, so a start never moves the staff; it appears and
  leaves at Idle only, with the player's action. The staff shows phrase 1 written from the doodle,
  every v2 idle rule applying; `Regenerate phrase` writes a new one from it. **(spec, provisional,
  Q72)** The doodle stays held after the Jam played on it, so the Idle after its review shows a new
  phrase 1 from it. A fresh Jam's doodle is never held by itself.
- **D240 — The review's doodle section and the suggestion (2026-10-08; §C5.15, §C6, §C12).** A
  Jam's review opens with a `review-doodle` section before the phrase list: a header like a
  phrase's ("Your doodle", its capture tempo "{tempo} BPM", and at its trailing end, where
  per-phrase tools go, `Jam again on this doodle`, disabled with "Needs a connected controller."
  without one), then the doodle engraved from the quantized doodle in written pitch, in the key
  signature the Jam started with, no chord symbols, no number, no favorite, its measures at a
  phrase's measure width from the system's start (so a two-measure doodle looks two measures long),
  and the played-notes lane under it when shown. Then `review-suggestion`, when there is one: "Your
  doodle sounds like {key} {mode}." with **`Use {key} {mode}`** and **`Keep {current key and
mode}`** (the spec's Use it and Keep mine, named by what they do), the answer named in the
  player's family (§C6.5). When the answer lies outside the restriction in force, a second line
  says so in the highlight's words: "{preset} isn't meant for {key} {mode}: using it makes your
  settings Custom." After `Use`, the row reads "Key and mode set to {key} {mode}." until the review
  closes (the controls are out of view below the review); after `Keep`, it goes. When under 80 %
  of the doodle fits any mode, the row is one sentence instead, with no action: "Your doodle uses
  notes outside the app's keys and modes, so no key is suggested." The same row, minus the 80 %
  sentence, is the `jam-bar`'s at Idle. `Jam again on this doodle` closes the review mode; focus
  follows `Close review`'s rule.
- **D241 — Jam sessions in the list and the review summary (2026-10-08; §C5.15).** The detail line
  begins with the word "Jam" for a Jam session ("Jam · 12 min · 9 phrases · …"), and so does the
  review's summary, which writes the same line. A word, not an icon.
- **D242 — The rhythm lock and its allowed changes (2026-10-08; §C7, §C12).** A "During a session"
  field after Jam: **Rhythm lock**, `Off`/`On`, note "Every phrase keeps the rhythm of the first
  one, so your eyes can stay on the notes. In a Jam, the rhythm nearest your doodle." Under it,
  while `On`: **Allowed rhythm changes**, five `toggle-button`s in a wrapping `toggle-list`, all off
  by default: "Move a note", "Move a rest", "Split a note", "Merge two notes", "Add or remove a
  rest"; note "Now and then one phrase changes the rhythm in one of these ways, and the next goes
  back to it. What's possible depends on your rhythm settings: with Strict variety and Straight
  syncopation, almost nothing." While the lock is off the list is hidden and kept (D235). No rhythm
  change and no forced bend is ever marked, anywhere.
- **D243 — Drift (2026-10-08; §C8).** Under Jam while it shows `On`: **Drift**, a segmented
  control `Close`, `Near` (default), `Free`, note "How far the phrases wander from your doodle:
  Close follows its rhythm and its moves, Near its ups and downs, Free only starts where it
  ended."
- **D244 — Vary settings' allowed groups (2026-10-08; §C9).** Under Vary settings: **What may
  vary**, six `toggle-button`s in a `toggle-list`, all on by default: "Key and mode", "Harmony",
  "Tension", "Rhythm", "Melody shape", "Embellishments". Shown while Vary settings shows `On`, and
  also while it cannot be turned on for lack of a legal move. While the rhythm lock is on, "Rhythm"
  is disabled, its choice kept, with "The rhythm lock holds the rhythm." With no legal move, Vary
  settings' `On` is disabled, the choice kept, with a `field-note` naming the fix: "Nothing is
  allowed to vary with these choices. Turn on another group below." (judged at Idle and in the
  review, as Rising tempo's availability is). The option's note becomes "Every 2 to 4 phrases, one
  setting from the groups below moves one step. Never the instrument or the tempo. Your settings
  come back when the session ends."
- **D245 — How the write-up is split (2026-10-08).** Three units, each written by a fresh
  `ux-writer` delegate from these entries: **P** (v3.1 core: `flows/presets/` and
  `screens/preset-sheet/` new; `screens/phrase-workspace/`, `flows/play-session/` and
  `flows/generate-phrase/` for v3.1), **R** (both releases on the review side:
  `screens/last-session-review/`, `flows/review-and-export/`, `screens/session-list/`,
  `flows/kept-sessions/`, `flows/saved-data/`, `screens/your-data/`) and **J** (v3.2 core:
  `flows/jam/` new; `screens/phrase-workspace/`, `flows/play-session/` and
  `flows/generate-phrase/` for v3.2). P and R touch no file in common and run together; J follows
  P. `strategy.md`, `motion.md`, `README.md` and the token document are written here.
- **D246 — Details settled while writing units P and R (2026-10-08; minor, D119's standing
  rule).** Unit P (presets): the box's label is "Preset", its `title` holding the full selection;
  a restriction is put in words one way everywhere ("{modes} in any key", "{keys} in any mode",
  "{keys}, in {modes}", "only {key} {mode}", lists "A, B or C"); Save as new merges any two
  options meaning the same restriction (also when the restriction in force is exactly the current
  key and mode); sheet titles "Save as a new preset" / "Save changes to “{name}”" / "Rename
  “{name}”" with `Save` / `Save changes` / `Rename`; the Save changes sheet and the Key and mode
  choice each carry one explaining sentence; one refusal reason at a time (empty, then "Custom",
  then a duplicate, quoted as the existing preset writes it; a change of capitals alone is a
  rename); focus returns to the opener when it is still shown and enabled, else to the preset box
  (a one-click `Save changes` too); the marks and their notes keep their session-start state
  during a session; with the passing-and-neighbor rule shipped, a stored "both off" loads the
  neighbor tone at `Rarely`; `control-summary` may reach its ellipsis with a long preset name;
  `no_legal_harmony_plan` names written key, collection, harmonic motion and tension. Unit R (the
  review side): the suggestion row is judged when the review opens and again on any key, mode or
  restriction change while it shows, leaving once the current key and mode are a close answer;
  the "set" form lasts until the review closes or the key or mode changes again; after `Use` or
  `Keep`, focus goes to `Jam again on this doodle` if enabled, else `review-title`; the doodle is
  laid out as a four-measure system whose staff lines end at its last barline, and on a phone a
  one- or two-measure doodle reserves the top system position only; a doodle that cannot be
  drawn says so in `review-phrase-note`; its lane is labelled "Played notes, your doodle", empty
  in a Jam on a held doodle; raw doodle notes count as played notes for the export and the view;
  the doodle is exported under Favorites only too, at its capture tempo, marked "Doodle"; "Jam"
  follows the date in the summary; the no-fit sentence shows in every review of that Jam (one
  plain statement, not "the first time only"); `Use` keeps a held doodle only when it is that
  review's; `Jam again on this doodle` replaces a doodle already held, and an unanswered
  suggestion is offered again at Idle; a decline carried by a held doodle is recorded in the
  session played on it too; played-notes deletion copy for Jam sessions says the doodle stays as
  the app wrote it; only a new preset or `Save changes` triggers the persistent-storage request;
  Your data counts the presets the box lists (more than 50 included, unreadable records not), and
  shows no Presets section while saving is off; documents new in v3.0 open with a separate
  "Changes since v3.0" block for their v3.1 and v3.2 items. Reconciled by the parent: a failed
  preset deletion keeps its confirmation open with the shared retry line and raises no notice,
  like every deletion (Unit R's Save-failed wording for it is dropped). Correction to D240: the
  suggestion's class is `suggestion-row`, not `review-suggestion`.
- **D247 (spec, provisional, Q73) — Deleting a Jam session lets go a doodle held from it
  (2026-10-08).** The spec's list of what drops a held doodle (§C5.11) does not name the deletion
  of its session, and §C5.14 says deleting a kept Jam session deletes its doodle in both forms.
  Designed: the held doodle goes with the session, as a setting change lets it go; Idle then
  shows Jam mode without a held doodle. Applied in `flows/kept-sessions/handoff.md`.
- **D248 — Details settled while writing unit J (2026-10-08; minor, D119's standing rule).** The
  doodle's measure "1" lights with its first note; at a silent barline the cue row shows
  `jam-writing` at once, and a note in that measure brings `jam-capture` back with it lit. The home
  note is spelled as the empty staff's key signature spells it, with its octave ("G4"). The failed
  Jam's notice clears on the next start or a change in the controls section (tempo and session
  options included, not the theme or the audio mix); it is not a live region, `Start Jam` names it
  with `aria-describedby`, and below `bp-tablet-landscape` it takes the instruction's place.
  `jam-bar` hides with the generation-failure banner while the review mode shows; its sentence and
  the suggestion's "set" sentence take focus (`tabindex="-1"`) after `Keep` and `Use` at Idle; the
  "set" sentence lasts until the key or mode changes again, the doodle is let go, or a session on
  it ends. The disabled "Rhythm" toggle under the lock shows off, its choice kept; each toggle list
  is a labelled `role="group"`, one tab stop per toggle. An empty system that fails to engrave
  takes the ordinary Notation error. Turning Jam on also discards a too-many-notes notice and a
  generation in flight; a no-room notice stays and gives way to `staff-jam` when it clears. A
  fresh Jam's phrase 1 must fit the session staff layout, a misfit counting as a failed attempt.
  A controller lost before phrase 1 ends the Jam as a count-in end and takes Jam mode out of
  effect, so Idle is Empty, focus on the phrase action. Readings of the spec, conservative: a
  controller away when a held-doodle Jam ends lets the doodle go (Jam mode is out of effect at
  Idle); a preset save or deletion that changes the restriction in force lets a held doodle go (it
  discards pre-generated phrases); a held doodle stays held under an unsupported rhythm
  combination, `staff-jam` showing with the alert, and under the ordinary generation-failure
  states, `Retry generation` writing from it; a controller attaching or lost during Loading
  changes Jam mode at once, cancelling the generation silently; at load with Jam stored on, the
  page opens Empty and a remembered controller attaching puts Jam mode in effect. **Vary
  settings' note** keeps v3.1's sentence in v3.2's rewrite (correcting D244, whose copy dropped
  it by mistake): "Every 2 to 4 phrases, one setting from the groups below moves one step. Never
  the instrument or the tempo. Keys and modes stay within what your preset is meant for. Your
  settings come back when the session ends."
- **D249 — Q70, Q71 and Q72 closed by the spec as recommended (2026-10-08; spec D242, D243,
  D244).** `spec-writer` settled all three while the design was being written: `Save changes`
  asks the restriction only when the key or mode lies outside the preset's restriction (spec D242,
  confirming D231); leaving Jam mode at Idle leaves the workspace empty (spec D243, confirming
  D236); a Jam played on a held doodle keeps it (spec D244, confirming D239). The provisional
  marks on D231, D236 and D239 no longer apply; the tier documents already state these as
  designed. Also applied from the spec the same day, already followed by unit J: the home note and
  the doodle's notes never start the silence timer (spec D240); a controller lost during a fresh
  Jam's count-in ends it at once (spec D241). Logged from `ux-critic`'s v3.2 pass: Q74 (a
  held-doodle Jam ended in its count-in keeps the doodle) and Q75 (the no-fit note in every
  review), both designed as recommended. Q73 stays open.
- **D250 — `ux-critic`'s v3.1 and v3.2 passes: DRIFT both, findings resolved (2026-10-08).**
  v3.1: (1) a player at the 50-preset limit could only free a slot by choosing a preset to delete
  it, which throws away the unsaved Custom settings they wanted to keep (§B6.6 lets any player
  preset be deleted): **Your data's Presets section now lists every player preset by name, each
  with its own `Delete`** (the shared confirmation, absent while saving is off), as §B7's "lists
  the player presets" also reads, and the limit's note reads "You have 50 presets of your own, the
  most the app keeps. Delete one, here or in Your data, to save a new one."; deleting from there
  never changes the selection's values (deleting the selected or base preset leaves Custom with no
  base, as anywhere). (2) Two descriptions overstated their presets: Speed drill becomes "Dense,
  changing rhythms with most embellishments favored, to read fast in any key."; Jazz becomes
  "Eighth notes and offbeats, now and then with a short note from outside the key." (B5.3: Jazz
  still sounds nearly free of decorations). (3) Q71 closed (D249). (4) `strategy.md`'s removed P3
  sentence is now listed as a v3.2 removal and the new P3.C3 bullet tagged `[v3.2 new]`; "Three
  actions" in the presets intent corrected to four. v3.2: (1) registers updated (D249). (2) The
  read-only state of `toggle-list` and of `field-dependent` inside a read-only field is defined
  in the token document (activation refused by script, one dashed ring). (3) Q74 and Q75 logged
  with provisional designs (D249). (4) The held doodle's sentence names what keeps it: "Jamming
  again on your doodle: phrase 1 continues it. Changing any setting except the tempo, Rising
  tempo, the audio mix or the theme lets it go."; `strategy.md` matches. (5) Four `changed`/`new`
  tags corrected (session list, Your data, the workspace intent's change block, `strategy.md`).
- **D251 (spec, provisional, Q74 and Q75) — Two readings of Part C, designed as recommended
  (2026-10-08; `ux-critic`'s recheck).** **Q74:** a Jam on a held doodle that ends during its
  count-in (Stop, a hidden tab, a staff that can no longer be shown) keeps the doodle held, and
  Idle shows the same phrase 1 again, as after any count-in end (`flows/jam/handoff.md`, The Held
  Doodle); §C5.13's "the doodle is not held" is read as describing a fresh Jam's doodle, never
  held by itself. **Q75:** the "no mode fits" note is one plain sentence shown in every review of
  that Jam, kept ones included (first settled in D246). The recheck's other finding, a leftover
  "Speed drill favors the chromatic figures" in `flows/presets/intent.md`, is corrected to §B6.5
  (Speed drill favors the chromatic approach only). Recheck otherwise clean: v3.1 and v3.2
  validated for the owner's review.

## v3.3 (richer chords) design, 2026-10-12

Inputs: `specs/versions/v3/master-spec.md` Part D (v3.3, cited "§Dn"), proposed for the owner's
approval with spec D264-D274; `docs/music/chord-research.md`; the lexicon's chord entries and their
popup lines; the v3.1 and v3.2 design above (ux D225-D251), still awaiting the owner's review. The
owner's standing delegation applies (D119, D135, archived; restated for this pass): minor design
issues settled here, phones low priority, a running session never asks anything. Nothing in `src/`
is edited. The design follows Part D as proposed; an entry changes only if the owner's approval of
Part D changes what it rests on.

- **D252 — v3.3 is marked on top of v3.0's, v3.1's and v3.2's marks (2026-10-12).** v3.1 and v3.2
  are not frozen yet (they wait for the owner's review, D251), so, as D225 did for them, v3.3's
  changes are layered at the root: `[v3.3 new]` / `[v3.3 changed]` inline, `_v3.3 new:_` /
  `_v3.3 changed:_` items in the change blocks, `v3.3 new` / `v3.3 changed` in code-block
  annotations. **v3.3 is built after v3.2, so every v3.3 change is its own tagged paragraph, item
  or annotation**, never a rewrite of earlier text in place: where v3.3 replaces a sentence it says
  "reads instead" or "also", leaving the earlier text whole for a v3.0, v3.1 or v3.2 builder. A
  document new in v3.1 gains a "Changes since v3.1" block for its v3.3 items, as D246 did for
  documents new in v3.0. v3.3 removes nothing. Every v3 mark:
  `grep -rn "v3\(\.[123]\)\? \(new\|changed\)" ui_ux --include=*.md`; `README.md` says so.
- **D253 — The Seventh chords level sits in the foundation group, right after Harmonic motion
  (2026-10-12; §D5.2, §D11).** One `field-group`, label **Seventh chords**, between Harmonic motion
  and Tension: it shapes the chords, as Harmonic motion does, so the two harmony settings read
  together, and a player who has just picked how the chords move picks next how rich they are. It
  takes the same `segmented-control` of four segments as the seven figure levels (§D11's "four-step
  look"). Rejected: inside the Embellishments group (its heading and intro speak of decorating the
  melody; seventh chords are not a decoration, and a reader would look for them by the staff's
  chord symbols, which the foundation group governs); a group of its own (one field, and a
  "Harmony" group would pull Harmonic motion out of the foundation group, reshaping v3.1's
  controls for one setting); a switch in "During a session" (it is a generation setting held by
  presets, not a session option).
- **D254 — The level's four labels: Off, Sometimes, Often, Mostly (2026-10-12; §D5.2).** For the
  spec's Off, Sometimes, Favored and Strongly favored. Named, like the figure levels (D230), for
  what the player will hear, in the same plain register. Not the figure labels themselves: the
  figure level "Rarely" means "only when nothing plainer fits", which is not this level's second
  step (about one chord in four), and "Mostly" says honestly that a seventh comes on nearly every
  chord, a triad only where none fits. "Often" means the same rank in both controls. The label
  "Mostly" rests on the share the build records at Strongly favored (§D10, done item 5) being a
  clear majority of chords; see Q77.
- **D255 — The level's note and behaviour (2026-10-12; §D5, §D8, §D11).** One `field-note`, named
  by the `radiogroup`'s `aria-describedby`: "How often a chord gets a fourth note on top, as G7 (G,
  B, D, F) instead of G (G, B, D): a richer, jazzier sound. A preference, never a promise." Built
  from the lexicon's popup lines for seventh chord and triad; "a preference, never a promise" is
  the Embellishments intro's own phrase, so the two level controls speak alike. Behaviour, every
  part of it an existing rule applied: first-visit value `Off`; editable at Idle and in the review
  mode, read-only in **Loading** and for a whole session; changing it never regenerates the phrase
  on screen (the player hears it with `Regenerate phrase`, as for every setting), discards the
  prepared phrases and lets a held doodle go, both unseen; saved when changed; preset-held, so a
  change makes Custom and choosing a preset sets it (every built-in to `Off`); never moved by Vary
  settings, so it never changes during a session and never makes Custom then. Nothing announces
  it. No message ever says a phrase has fewer sevenths than the level suggests.
- **D256 — Three built-in descriptions suggest raising the level (2026-10-12; §D8.1, §D11).** Each
  gains one sentence, after the existing text, in the way Reel's suggests Ionian: Jazz and Bebop
  "Also try raising Seventh chords, the usual chords of jazz."; Modal (Dorian) "Also try raising
  Seventh chords, for a richer, jazzier bed." No other description changes; a player preset's and
  Custom's lines are unchanged ("Changed from {name}" already covers a raised level). No built-in
  changes its values.
- **D257 — Vary settings' note says the level is never varied (2026-10-12; §D8.3, §D11).** The
  note reads, from v3.3: "Every 2 to 4 phrases, one setting from the groups below moves one step.
  Never the instrument, the tempo or Seventh chords. Keys and modes stay within what your preset
  is meant for. Your settings come back when the session ends." What may vary keeps its six
  toggles, "Harmony" unchanged: the note's "never" sentence is where the player looks for what is
  left out, and a seventh toggle that could never be turned on would be a control that does
  nothing.
- **D258 — Seventh chord symbols: letters on one line, never shrunk, and their fit (2026-10-12;
  §D7.1, §D11).** A symbol is its root, in written pitch with its accidental as the music font's
  glyph, then its suffix, on one baseline at the one chord-symbol size: `maj7`, `m7`, `7` and
  `m7♭5`, the ♭ in `m7♭5` drawn with the same glyph as a root's flat. No superscript (a smaller
  size falls under the legibility floor first), no signs (Δ, −, ø), never abbreviated, wrapped or
  cut. Each symbol's full width counts toward the minimum width of its measure, so a symbol never
  touches the next one (at least one staff space between them) and never runs past its measure's
  closing barline. The longest symbol is a root with an accidental plus `m7♭5` ("G♯m7♭5",
  "E♭m7♭5"). The engraving calibration gains the case: a measure holding two two-beat chords with
  the longest symbols, at the densest rhythm each layout allows (Sixteenth in the one-system
  layout, Eighth in the split layout), at the narrowest width of each named breakpoint and the
  legibility floor, must fit without the symbols alone making the phrase too wide; the shared
  system position size includes the new symbols' ink, measured as today. A calibration failure at
  a supported width comes back to `ux-writer`; the build never shrinks a symbol to pass it. On a
  phone, a phrase that still fails to fit takes the too-many-notes path like any phrase
  (regenerated unseen), never an overlap. The review and kept sessions follow the same contract,
  which they already apply in full.
- **D259 — The spoken words for the new suffixes (2026-10-12; §D7.1).** The score's text
  description reads `maj7` as "major seventh", `m7` as "minor seventh", `7` as "dominant seventh"
  and `m7♭5` as "half-diminished seventh" ("chord B half-diminished seventh"): each names the
  chord's quality as the lexicon names it, so the four read alike and match the lexicon's headings.
  The spec's alternative "minor seventh flat five" spells the symbol rather than naming the chord.
  A suffix is read as one whole, never letter by letter and never with its ♭ read as "flat" on its
  own. Triad words are unchanged ("minor", "diminished", nothing for major).
- **D260 — Review, exports, kept sessions and Your data: no new control and no new copy
  (2026-10-12; §D7.2, §D9, §D11, §D17).** No text of the review, the export dialog, the session
  list or Your data says "triads" today, so none changes; the backing toggle has no description to
  update. The review and a kept session's review draw the symbols as stored, so a session kept
  before v3.3 shows its triads. The level is not shown in the review's summary, the list's detail
  line or a phrase's header, as the figure levels are not. Your data's Settings line ("The phrase
  controls, the preset, ...") already covers the level, and Delete everything's first-visit state
  puts it at `Off`. The handoffs gain one line each where the content of a file or a kept session
  is listed: MusicXML carries the new chord kinds, the MIDI backing track the chords as the backing
  played them, a kept phrase's inputs the level.
- **D261 — No new token, class or motion (2026-10-12).** The level reuses `field-group`,
  `segmented-control` and `field-note`; the symbols reuse `chord-symbol` and the engraver's size.
  Nothing animates. `token-source-v3.1-v3.2.md` and `motion.md` are unchanged; `README.md` says
  v3.3 adds none.
- **D262 — Written in this thread, one pass (2026-10-12).** Small enough not to delegate: the tier
  changes are the level's field and its rules, three descriptions, one note, the symbols' contract
  and the spoken words, applied in `strategy.md`, `README.md`, `screens/phrase-workspace/`,
  `flows/presets/`, `screens/preset-sheet/handoff.md`, `flows/play-session/`,
  `flows/generate-phrase/handoff.md`, `flows/saved-data/handoff.md`,
  `flows/review-and-export/handoff.md` and `screens/last-session-review/handoff.md`. Unchanged, as
  §D11 says: `flows/jam/`, the suggestion, the rhythm lock, `flows/kept-sessions/`,
  `screens/session-list/`, `screens/your-data/` (its wording already covers the level).
- **D263 — `ux-critic`'s v3.3 pass: DRIFT, four findings fixed (2026-10-12).** (1) The workspace
  Layout Tree gains the v3.3 Vary settings note, as Components and Content had it, and the change
  block links the tree. (2) The presets handoff's change block links Routing Rules, where its v3.3
  paragraphs sit. (3) **The Seventh chords note reads, correcting D255:** "How often a chord gets
  one more note stacked on top, as G7 (G, B, D, F) instead of G (G, B, D): a richer, jazzier sound.
  A preference, never a promise." Under the label "Seventh chords", "a fourth note" could be read as
  the interval of a fourth; "one more note stacked on top" is the lexicon popup's own wording. The
  intent prose in `strategy.md`, `screens/phrase-workspace/intent.md` and `flows/presets/intent.md`
  follows. (4) Correcting D255's "unseen": changing the level lets a held doodle go announcing
  nothing, `jam-bar` leaving at once, as `flows/jam/` says; and `flows/generate-phrase/handoff.md`
  now says the change builds no request by itself but, as any setting change, starts a round under
  the too-many-notes notice. Not findings, noted: the formatter's `*…*` to `_…_` in
  `flows/saved-data/handoff.md` renders the same; the lexicon's "in Infinite Flow" lines for the
  chord terms ("Only triad symbols appear") are `documentalist`'s to update at the build.
- **D264 — Q77 closed by spec D275; the v3.3 build plan reviewed from the design side
  (2026-10-12; master spec §D5.2, build plan v3.3 draft v1).** Spec D275 settled Q77 as
  recommended: the fallback is per phrase, and Strongly favored must reach at least 3 in 4 chords
  as sevenths, measured and reported here. The design stands; the workspace handoff's `Mostly` line
  now says the phrase falls back "as a whole". **The label mapping is written where a coder reads
  it:** the workspace handoff's Seventh chords item says the four segments are §D5.2's levels in
  order (`Off` Off, `Sometimes` Sometimes, `Often` Favored, `Mostly` Strongly favored), that what
  is saved and sent names the spec's level, never the label (spec D277), and that they are not the
  figure levels' options (whose second step is `Rarely` and whose top step `Very often`), since a
  coder told to give it "a figure level's look" could otherwise reuse the wrong list. **What the
  design asks of the plan** (the plan is `coordination-leader`'s and `spec-writer`'s; the edits are
  in the review's report): (1) the three built-in descriptions' sentences ship with the control in
  chunk 19, not chunk 11, so no line on screen ever suggests raising a control that does not exist
  yet; (2) the labels are confirmed twice, on chunk 18's first shares before chunk 19 and on the
  final shares at the release gate, after chunk 20 if built and L2's tuning; (3) hand check H6
  regenerates at `Mostly`, so it runs once the control has shipped, not at chunk 14; (4) counting
  each symbol's width toward its measure's minimum width must leave every triad layout at Off as
  v3.2 draws it; if it would move one, chunk 14 brings it here before any snapshot is updated;
  (5) chunk 19's checks add what its scope already says: editable in the review mode, a round
  under the too-many-notes notice, `jam-bar` leaving at once, nothing announced.

## v3.0 wave 2: my instrument's clef and its sessions, 2026-10-12

Inputs: master spec Part A v1.10 (§4.3, §4.4, §5.1, §7.1, §7.2, §14), spec D290-D296 and O180,
build plan v8 §1 (the **Clef design** gate before chunk 20, the **Sessions design** gate before
chunk 20c), `docs/storage.md` (chunk 4), `docs/notation-engraving.md` (M3). The owner's standing
delegation applies (D119, D135, archived): minor design issues settled here, phones low priority.
Nothing in `src/` is edited but the token source's comment (D292). Ux numbers D280+ and Q80+ are
this wave's; D252-D264 and Q77 are v3.3's.

- **D280 — Where the two gates are written (2026-10-12).** The owner added the clef and the
  sessions' belonging to v3.0 while it is being built from `versions/v3.0/` (the build plan's
  design links point there). So the gates are written into `versions/v3.0/` as a recorded
  correction to match what v3.0 ships, the exception its README allows, and the same text is
  applied at the root, which holds v3.0's behaviour under v3.1-v3.3. Being v3.0 changes from v2,
  they carry v3.0's own marks in both trees (`[v3 new]` / `[v3 changed]`, unprefixed change-block
  items); documents new in v3 take no inline tag. Files: `strategy.md`, `motion.md`,
  `flows/my-instrument/`, `screens/my-instrument/`, `flows/controller-connection/`,
  `screens/controller-connection/`, `screens/phrase-workspace/handoff.md` (Notation Contract),
  `screens/last-session-review/handoff.md`, `flows/kept-sessions/`,
  `flows/review-and-export/intent.md`, `flows/generate-phrase/intent.md`, `flows/saved-data/`,
  and `versions/v3.0/README.md` (status and two decisions worth keeping). Root only, in v3.2
  paragraphs: Jam's empty staff and the review's doodle staff take the instrument's clef.
- **D281 — The clef control (Clef design gate; spec D293; supersedes D214's "§7.1 keeps no clef
  choice") (2026-10-12).** A `field-group` labelled "Clef" with a two-segment
  `segmented-control`, "Treble clef" and "Bass clef" (in full: "Bass" alone reads as the bass
  instrument), between the name and the Range section, since the range is read on the staff it
  chooses and its bound depends on it. `field-note`: "Bass clef suits low instruments. The clef
  changes where notes are drawn, never which notes." **Default treble, confirmed:** every template
  is in treble clef, and the personas' instruments (saxophones, keyboards, wind controllers) read
  treble; a bass-clef player makes one deliberate choice. Choosing a template never changes the
  clef (the player's choice, like the name). The check's "Use this for my instrument" creates my
  instrument in treble clef and keeps an existing one's clef. One tab stop, after the name; the
  phone keeps both segments on one row. The score's text description says "bass clef" where it
  says "treble clef" today (chunk 19b's word, confirmed). The check note is drawn in the selected
  instrument's clef. No new token or class.
- **D282 — The range bound's refusal (Clef design gate; spec D294) (2026-10-12).** Refused live in
  `range-alert`, `Save` disabled, like the two-octave refusal; one `p` per reason, the span's
  first. Wording: "In {treble clef|bass clef}, the range must stay between {C2 and C7|E0 and E5}.
  {lowest} is too low." / "... {highest} is too high." / "... {lowest} is too low and {highest}
  too high.", followed by "It fits in {other clef}." only when both ends lie inside the other
  clef's bound. The steppers are not stopped at the bound (only at the MIDI range, as before), so
  a clef change never moves the player's notes: it re-checks at once, and the refusal names the
  clef. Profile-range summary and staff-reach note are absent while refused.
- **D283 — The staff-reach note reads the chosen clef (Clef design gate) (2026-10-12).** Shown
  while the range is valid and the size it sets in its clef exceeds the built-in 16 staff spaces,
  computed by the same rule that sizes the staff (not "reaches further than the built-ins": M3
  shows that almost every range wider than two octaves grows the staff, through beam widths as
  well as reach). Wording: "In {clef}, this range makes the staff taller for every instrument, and
  it may no longer fit a phone's screen." plus "In {other clef}, it would not." when the other
  clef accepts the range and keeps 16. The Notation Contract now says the shared size is 16 staff
  spaces unless a saved my instrument, in its clef, needs more, at most 24 within the bound.
- **D284 — What a clef change does on screen (spec D293, D296) (2026-10-12).** Saved with no
  warning, every session kept. With my instrument selected, the phrase on screen stays and is
  redrawn at once in the new clef, with no fade (not a phrase replacement; `motion.md`); that
  redraw is an idle engraving, so Room for the staff applies should it no longer fit. A save
  that changes the shared size re-checks the phrases prepared in the background, showing
  nothing.
- **D285 — Q76 closed: the transposition's interval name (2026-10-12; spec D253, D257).** The
  transposition's `field-note` reads "{interval}: a written C4 sounds as {note}.", updated on
  every step: "No transposition" at Same; "A minor second lower" ... "A major seventh higher" (6:
  always "An augmented fourth"); "One octave lower", "Two octaves lower"; from 13 to 23 the
  compound name with its octave in brackets, "A major ninth lower (an octave and a major
  second)", since "ninth" says nothing to a beginner; past two octaves, "Two octaves and a major
  second lower". The stepper's `aria-valuetext` adds the name ("14 semitones lower, a major
  ninth"). The check's confirmation uses the same line ("No transposition: a written C4 will
  sound as C4."). Never chosen by name; `screens/my-instrument/intent.md`'s rejection of names
  now rejects choosing by name only.
- **D286 — The erase warning (Sessions design gate; spec D295, D296) (2026-10-12).** `Save`, when
  the range or the transposition differs from the saved one and my instrument has sessions,
  opens a warning in the sheet's place (as the delete confirmation does): title "Save and erase
  sessions?"; "Changing the range or the transposition erases the {N} sessions played with
  {name}, with their favorite phrases, comments and played notes." (one: "the session ... with
  its favorite phrases, comment and played notes."); when the review on screen is one of them,
  "The session reviewed on screen is one of them, so its review closes." (one: "It is the session
  reviewed on screen, so its review closes."); "This can't be undone."; hint "To keep a session,
  cancel, then export it from its review first."; actions `Save and erase` (`btn btn-error`),
  `Cancel` (focused). Cancel returns to the form with the edit unsaved; the save and the erasing
  are one step, a failure keeping the warning with "That couldn't be saved, and nothing was
  erased. Try again." {N} counts the kept sessions of my instrument and the session that just
  ended with it, held in memory after a failed save; 0 in a visit started from the defaults.
  **No warning at 0, as spec-writer proposed:** nothing is erased, and a warning that names
  nothing would teach the player to click through it. The check's "Use for my instrument"
  confirmation carries the same paragraphs ("Changing the transposition erases ..."), its action
  becoming `Use and erase` (`btn btn-error`).
- **D287 — The delete confirmation names the sessions (Sessions design gate) (2026-10-12).** After
  "{name} will be deleted, with its range and transposition.": "The {N} sessions played with it
  go too, with their favorite phrases, comments and played notes." (one: "The session played
  with it goes too, ..."), the review sentence of D286 when it applies, then the template line
  when selected; "This can't be undone."; the same hint. Unchanged when {N} is 0.
- **D288 — Where the player lands (Sessions design gate; spec D295 item 4) (2026-10-12).** Exactly
  as after `Delete session`: a review of an erased session gives way to the session list, its
  empty state included; a list showing loses their rows; the session that just ended, if one of
  them, leaves memory and `Review last session` goes. The sheet that did it keeps focus and
  returns it to its opener (`instrument-actions`; the connection sheet goes to Connected and its
  own close rule). Nothing else announces it: the warning said so.
- **D289 — The outdated tab withholds them (Sessions design gate; spec D295 item 5) (2026-10-12).**
  While my instrument has kept sessions (rows this tab read), its sheet opens with an
  `inline-alert alert-notice`: "Reload this page to change the range or the transposition, or to
  delete {name}: either would erase the sessions played with it, and this page can't delete
  anything until it is reloaded."; the three steppers disabled, values in full contrast; `Delete
  my instrument` absent; name and clef still apply for the visit. The check offers no `Use this
  for my instrument` and adds "To use this for {name}, reload the page first: changing its
  transposition would erase the sessions played with it." Shown disabled rather than refused at
  `Save`, so the player is not invited to make a change the tab cannot keep. A tab outdated while
  the sheet is open closes an open warning or confirmation, erasing nothing, and returns range
  and transposition to their saved values.
- **D290 — A review's room for a phrase in another clef (Sessions design gate; spec D296)
  (2026-10-12).** As proposed: the review's system positions take, in staff spaces, the larger of
  the shared size and the size the session's own instrument needs in the clef its phrases were
  played in, turned into a block size at the workspace staff's scale (same notation size, a
  taller position), one size for the whole review, set before the first engraving so the scroll
  never jumps. Rejected: shrinking the phrase into the shared size (smaller notes than the staff,
  possibly below the legibility floor), and redrawing it in today's clef (the review must show it
  as it was displayed, `req_last_session_review`).
- **D291 — The stale "treble only" lines (2026-10-12).** Revised in both trees: `strategy.md`'s
  clef trade-off (now `[v3 changed]`), its my-instrument trade-off, edge cases and flow index;
  `screens/my-instrument/intent.md`'s staff-height paragraph; the check note in
  `screens/controller-connection/handoff.md`; the review's `review-staff` and, at the root, Jam's
  empty system and the review's doodle staff; the Notation Contract's clef and size; the clef
  sentence of `flows/generate-phrase/intent.md`, split into its own tagged paragraph.
- **D292 — The token source's sizing comment (2026-10-12).** `src/styles/theme.css` is this tree's
  to maintain (README, How future UI changes flow; ux D218, D220), so its comment over
  `--staff-systems-phone-block-budget` now reads "16 staff spaces tall unless a saved my
  instrument needs more", names `planSystemPositionUnits`, and adds the 24-space ceiling's 366 px.
  Comment only; no token changes. `prettier --check` passes.
- **D293 — Chunk 4's two carry-overs (2026-10-12; `docs/storage.md`).** (1) **Another tab's
  `Delete everything`** outdates every other open tab (the storage port closes on the
  `versionchange`). Designed as an outdated tab in every respect, with its own notice wording,
  since "a newer version has saved data" would send the player looking for an update: "Everything
  this app kept on this device was deleted in another tab. Reload this page to start afresh; until
  then, nothing here is saved." It replaces any notice and is never replaced, except that a tab
  already outdated by a newer version keeps that wording. `Reload` then brings the first visit.
  §4.3 does not name this trigger: Q80. (2) **The Load text** treated a database upgraded by a
  newer version as a failed read; the storage design reopens it for reading only. The saved-data
  handoff now sends it down the "data written by a newer version" branch (saved values used,
  saving off, the saved-data wording); a failed read with newer data known remains for a
  read-only reopening that fails, or a late read that reveals newer data. The saved-data intent's
  "may refuse to open at all" is gone.
- **D294 — `ux-critic`'s pass on the two gates: DRIFT, five findings, all fixed (2026-10-12).**
  (1) **The example note agrees with the interval's name** (corrects D285): the transposition
  line's `{note}` is C4 moved by the interval's letter-name steps (master spec §7.1's table), so
  "A minor second higher: a written C4 sounds as D♭4", an augmented fourth lower G♭3, a major
  seventh lower D♭3, never C♯4, F♯3 or C♯3, which would name other intervals; from C no double
  sharp or flat arises. It is the sheet's one note outside the one-spelling list; it spells
  nothing written (spec D291 still governs the written part). The check's confirmation follows.
  (2) **The treble default's reasoning** (corrects D281): every template is in treble clef and the
  personas' grounding setup (tenor saxophone, MIDI wind controller) reads treble; P1 is not tied to
  an instrument, P2 is often on a keyboard, and keyboard players read both clefs. The clefs are
  named "the G clef on the second line" and "the F clef on the fourth line", never "F4 clef",
  which reads as the note F4 (the bass clef's F is F3). (3) **Sessions held in memory while
  saving is off** are never counted and keep their review, in an outdated tab as in a visit
  started from the defaults (an outdated tab counts only the kept rows it read); "a review never
  shows music its instrument can no longer play" now says "a kept session's review"; the review's
  room also covers that held session after a range change. (4) **Another tab's `Delete
  everything`** (refines D293): the storage port's outdated report carries no cause today, so the
  handoff asks chunk 5's save policy to get it from the port (a deletion's `versionchange` has no
  new version); until then the newer-version wording shows. A visit whose read failed may hold no
  connection and keeps its unusable-data notice. (5) **The warnings say "this instrument"** (the
  check's, "my instrument") instead of the current name, since the list shows each session under
  the name it was played under (corrects D286, D287, D289's paragraph). Also: "four words" fixed;
  the delete confirmation names the clef too ("with its clef, range and transposition").
- **D295 — `ux-critic`'s recheck: DRIFT, three leftovers, fixed (2026-10-12).** The five D294
  findings were resolved in both trees, every spelled example checked. (1) "Treble G2 clef"
  becomes "treble clef (the G clef on the second line)" in the three paragraphs this wave
  touched (`strategy.md`, the Notation Contract, `flows/generate-phrase/intent.md`). (2) The
  saved-data handoff's "One notice at a time" now lets Unusable data give way to the deletion
  wording too, and says the deletion wording replaces a save-problem or unusable-data notice,
  never an outdated-tab one. (3) The my-instrument flow handoff says a session held in memory
  while saving is off is never counted. Correction to D294 (5): D287's sessions sentence never
  named the instrument; D287 changed only by the clef in its first sentence.

## v3.0 wave 2: the stale phrase prompt, 2026-10-13

Inputs: master spec Part A v1.12 (§16, §14), spec D297 with its 2026-10-13 ruling note (O182
closed: Regenerate stays at Idle; the starting note asks first, CONTRACT 5.0), build plan v9
(chunk 24b and the **Stale phrase design** gate, before chunk 24b-2; hand check H9). The owner's
standing delegation applies (D119, D135, archived): minor design issues settled here, phones low
priority. No `src/` edit; no new token, class or motion. Ux numbers D296+ and Q81+ are this
gate's.

- **D296 — Where the gate is written (2026-10-13).** As D280: chunk 24b is v3.0's and is built
  from `versions/v3.0/` (the build plan's design links point there), so the design is written into
  `versions/v3.0/` as a recorded correction to match what v3.0 ships, and the same text at the
  root, with v3.0's own marks in both trees (`[v3 new]`, unprefixed change-block items); the
  root alone adds tagged v3.1, v3.2 and v3.3 paragraphs. A new screen,
  `screens/stale-phrase-prompt/` (intent and handoff), rather than a section of the workspace
  handoff: it is a sheet with its own content, focus and states, like the preset sheet. Files, in
  both trees: `screens/stale-phrase-prompt/` (new), `flows/play-session/` (the diagram's start
  steps; a bullet "A phrase made before the settings changed"; the starting-note bullet; the
  intent's Starting section), `screens/phrase-workspace/handoff.md` (`start-note-line` hidden
  while it shows; **Ready**; Automatic changes), `flows/generate-phrase/handoff.md`
  (pre-generation runs while the phrase is out of date), `strategy.md`, `motion.md`; root
  `README.md` (map); `versions/v3.0/README.md` (status, two decisions worth keeping). The player
  never reads "stale": the screen is titled "Out-of-Date Phrase Prompt".
- **D297 — The prompt's form (2026-10-13).** A modal sheet of the standard width
  (`sheet-backdrop`, `sheet`, the connection sheet's classes), `role="alertdialog"` with
  `aria-describedby` on the body, over the workspace, which stays in **Ready**. **Other controls
  cannot be used while it shows, as `spec-writer` proposed**: the controls, the header, the theme
  and the mix are all behind the backdrop. Reasons: a live control could change the very settings
  the prompt lists; a player who wants to change something first closes it, which changes
  nothing. Pre-generation goes on. If the workspace leaves **Ready** while it shows (a window
  change leaving no room, regenerating a too-wide phrase 1, or bringing `orientation-notice`), it
  closes as if dismissed. Nothing marks an out-of-date phrase before a start: `start-note-line`
  keeps naming the note that begins the start (rejected: changing the line or marking the staff
  on every edit, which would change under the player's hands while setting the controls).
- **D298 — The wording (2026-10-13).** Plain words, no "stale", "generate" or "carry-in"; the
  lexicon's **phrase** and **settings** as the app uses them. Title (`sheet-title`): "This phrase
  is from before your changes" (a statement: a question title would favour one of two good
  answers). Body: "Since it was made, you changed {changed settings}." then "A new phrase follows
  your current settings. If you start with this one, only the phrases after it will." **Opened by
  the starting note**, the player being at the instrument: a first paragraph, "Your note didn't
  start the session. Nothing you play will until you choose.", and a closing `sheet-hint`, "A new
  phrase starts on a new note: the line above the staff names it.", since a player who regenerates
  and plays the old note would hear nothing and not know why. No values, no "don't ask again".
- **D299 — The two labels: `Regenerate phrase` and `Start with this phrase` (2026-10-13).** The
  owner's Regenerate is the header's own `Regenerate phrase`, and the prompt's button runs exactly
  that action, so it takes exactly that label: a player who learns it here learns the header
  button, and can press it before Start next time. The owner's Use it becomes `Start with this
  phrase`, which says what happens and on which phrase. **The clash with Part C §C6.5's Use it** is
  resolved by naming both by what they do: the design already shows C6.5's Use it as `Use
  {answer}` ("Use G Dorian", D240), so no
  on-screen "Use it" exists, and a bare one here would leave "it" unclear. The spec's names stay
  the names of the two choices in the spec and the atoms. `Regenerate phrase` is `btn-primary`
  (the player's last act was changing a setting, which says they want what it makes, and it
  starts nothing); `Start with this phrase` is a plain `btn`; neither is error-toned.
- **D300 — The prompt names the settings that changed (2026-10-13).** Yes: by each control's
  visible `field-label`, in page order; one, two or three named ("Written key, Register and
  Leapiness"); four or more, the first two and a count ("Written key, Register and {n} other
  settings"). It shows the prompt is about the player's own edit, and lets them check it was the
  one they meant; a full list after a preset choice would bury the choice. Never values; never
  the preset's name (a preset counts through the values it set). Musical profile preset counts
  when Neutral or Jazz differs, its customized mark alone never; Note density by the value the
  player chose; Instrument profile when the instrument differs, which in practice never happens.
  From v3.1 the seven figure levels by their labels and no Musical profile preset; from v3.3
  Seventh chords after Harmonic motion. Computed at open; it cannot change while the prompt shows.
  The pure stale check of chunk 24b-1 returns the differing settings, which this needs.
- **D301 — Dismissing, focus, keyboard and accessibility (2026-10-13).** Dismissed by `Close`,
  Escape and a press on the backdrop, as every sheet; no third `Cancel` button. **Focus on open:
  `Regenerate phrase`**, whichever start opened it (it starts no sound and deletes nothing, so
  Enter on it is always safe, and a player at the instrument with a computer keyboard in reach
  presses Enter, reads the new note and plays it). Rejected: focus on `Close` (the confirmations'
  "way back" rule guards a deletion; here it would make Enter a dead end). Opening closes the
  `Volume` popover. Order `Close`, `Regenerate phrase`, `Start with this phrase`; trapped. On
  close: after `Start with this phrase`, the session action (now `Stop`), as after a Start click;
  after `Regenerate phrase`, the phrase action, as a press on it in the header, no move when the
  phrase lands; after a dismissal or closing by itself, the connection sheet's rule (session
  action, else phrase action, else `controller-status`). No MIDI note starts anything while it
  shows; `start-note-line` hidden as for any sheet. `Start with this phrase` is the start click
  (sound unlock, locks, jump), the start conditions checked again; if one fails, nothing starts
  and the prompt closes.
- **D302 — What the controls show after `Start with this phrase` (2026-10-13; spec §16).** The
  existing rule (the count-in shows phrase 1's values; a value changes when the first phrase made
  with it starts sounding) applies: through the count-in and phrase 1 each control the player
  changed shows its earlier value again, read-only, and from phrase 2 the session's, with no
  highlight, as any automatic change. Root only: **v3.1**, the preset bar keeps what it showed at
  the start throughout, neither change turning the selection to Custom or back; **v3.2**, a Jam
  never asks (a fresh Jam has no phrase 1; any such change lets a held doodle go), and the rhythm
  lock locks phrase 1's rhythm, out of date or not; **v3.3**, the Seventh chords control shows
  phrase 1's level through the count-in and phrase 1, then the session's, fixed to the end (the
  v3.3 "fixed for the whole session" sentence now says so).
- **D303 — The phone (2026-10-13).** Minimal: the same sheet filling the width, the answers stacked
  full width with `Regenerate phrase` on top, the paragraphs wrapping, the sheet scrolling inside
  itself on a short screen. Nothing dropped, nothing added.
- **D304 — The policy lines it revises (2026-10-13).** `strategy.md`, both trees: the change
  block's "starting a session never is" now "asks only about a phrase made before the settings
  changed"; the "Keeping and starting again" trade-off says a start never asks about the session
  it replaces; a new trade-off, "An out-of-date phrase is told at Start, not as it happens"
  (rejected: regenerating on every edit, marking the phrase or line live, regenerating silently
  at Start or starting as soon as a regenerated phrase shows); the Deleting edge case's "Nothing
  else asks" makes the exception; a new edge case, "A phrase made before the settings changed".
  `versions/v3.0/README.md`: "Starting never asks" becomes "Starting never asks about the last
  session", plus "A start on an out-of-date phrase asks first". `motion.md`: the prompt opens and
  closes as the sheets do.
- **D305 — `ux-critic`'s pass on the gate: DRIFT, four findings, all fixed (2026-10-13).** No
  business rule contradicted or invented. (1) **The controls at a session's end after `Start
  with this phrase`** were unspecified: however the session ends, they show the session's settings
  again, silently, with the end's other returns; after a count-in end phrase 1 is still out of
  date and the next start asks again; after an end once phrase 1 has sounded the next phrase is
  made from the session's settings (both trees: play-session's bullet, Ended before phrase 1
  sounds and End; the workspace's two end states and its Automatic changes). The session's values
  show from the first phrase generated under them that starts sounding, so a phrase 2 that repeats
  phrase 1 keeps phrase 1's values, as any automatic change. Showing either set is not an edit:
  v3.0's musical profile custom state and `preset-status` keep what they showed at the start. (2)
  **Root workspace layers**: tagged v3.1 (the preset bar holds still, no Custom) and v3.3 (Seventh
  chords shows phrase 1's level, then the session's) paragraphs and change-block items, matching
  play-session; play-session's change-block item is `_v3.3 new:_`. (3) **Copy** (corrects D298):
  the answers' sentence names each answer, "Regenerate phrase makes a new phrase with your current
  settings. Start with this phrase plays this one first; the phrases after it use your current
  settings." ("follows" could read as "comes after"); the hint reads "A new phrase may start on a
  different note: the line above the staff names it." (4) The root intent's v3.1 paragraph states
  the naming rule as the handoff does (up to three, or two and a count).
- **D306 — `ux-critic`'s recheck: DRIFT, one leftover, fixed (2026-10-13).** The four D305 fixes
  were confirmed in both trees. Leftover: "phrase 1 is still out of date and the next start asks
  again" was said of every count-in end, but a window change can regenerate phrase 1 under the
  current settings. Now limited to a phrase 1 still on screen (Stop, the tab hidden); a phrase 1
  regenerated after a window change asks nothing; and after a full end the next start asks nothing
  unless a setting changes again meanwhile (both trees: play-session's bullet, the workspace's two
  end states). The by-value check stays the rule; these lines only describe it.

## v3.0 wave 6: very short notes and damaged sessions, 2026-10-15

Inputs: master spec Part A v1.15 (§5.1, §9), spec D310, D311, D315 and spec O210, build plan v16 §1
(the **O210** gate before chunk 25, the **Damaged session design** gate before chunk 28b). The
owner's standing delegation applies (D119, D135, archived): minor design issues settled here,
phones low priority, no question to the owner. Nothing in `src/` is edited.

- **D307 — Where the two gates are written (2026-10-15).** As D280 and D296: chunks 25 and 28 are
  v3.0's and are built from `versions/v3.0/`, so both designs are written there as a recorded
  correction to match what v3.0 ships, and the same text at the root, with v3.0's own marks in
  both trees (inside paragraphs already tagged `[v3 new]` / `[v3 changed]`, or a new tagged
  paragraph; documents new in v3 take no inline tag). The root alone adds that a Jam's raw doodle
  notes count toward "the file would hold no note" (its v3.2 paragraphs). Files, both trees:
  `flows/review-and-export/` and `screens/last-session-review/` (O210); `flows/saved-data/`,
  `flows/kept-sessions/`, `screens/session-list/`, `screens/your-data/handoff.md`,
  `screens/phrase-workspace/handoff.md` (the notice row, `sessions-link`) and `strategy.md` (the
  damaged sessions); `versions/v3.0/README.md` (status, decisions worth keeping).
- **D308 — Spec O210 closed: `Export played notes` is disabled whenever its file would hold no
  note (2026-10-15; spec D315, master spec §9).** spec-writer's proposal, generalised: under the
  current scope and `Include very short notes`, a file that would hold no note is never offered;
  the button is disabled and named by `aria-describedby` to its `field-note`, so the export error
  is never reached that way. The reason, by precedence: (a) under `Favorites only` with no played
  note at all in a favorite phrase, the existing "No played notes in your favorites." (turning the
  option on would not help, so it is not suggested); (b) otherwise, with the option off and every
  played note the scope selects very short, "Every note you played is very short. Turn on Include
  very short notes to export them." under `Whole session`, and "Every note you played in your
  favorites is very short. Turn on Include very short notes to export them." under
  `Favorites only`. The proposal's "include very short notes to export them" is reworded to name
  the toggle as it reads, so the player finds it just above. The toggle stays live (it already
  did); turning it on enables the button at once and the note leaves, focus staying on the
  toggle; turning it off disables it again. A change of scope or option while the file builds
  does not touch that build; when it ends the button takes the state the current choices give,
  and focus, which is on the control the player changed, does not move. The lane needs nothing
  more: its lanes show no bar, as under a phrase in which nothing was played, and the `Played
  notes` and `Keep my played notes` switches stay. Rejected: hiding the played-notes group (it
  holds the option that is the cure); turning the option on by itself (it would change the file
  without asking); exporting an empty file (it gives nothing, and the encoder refuses it); a
  line in the lane (§9 gives the lane no switch, and the export's reason already says it). Root,
  v3.2: in a Jam the doodle's raw notes count with the phrases' in both scopes, with no wording of
  their own.
- **D309 — The apology for damaged sessions (2026-10-15; spec D310, master spec §5.1).** A fourth
  notice in the notice row, "Damaged sessions deleted": "Sorry: a kept session was damaged and
  couldn't be read, so it was deleted." for one; "Sorry: {n} kept sessions were damaged and
  couldn't be read, so they were deleted." for several, {n} in figures. Calm, as every notice
  (`alert-notice`, never error-toned, no focus, no announcement); no session date, since a
  damaged summary may have none; no "on this device", which would blame the device for what may
  be the app's own fault. Action: `Dismiss` only; nothing can be done about it. Shown once the
  deletion has committed, outside a running session (held during one, as every notice). Lifetime:
  until dismissed or the page closes; while it shows, a further deletion of damaged sessions adds
  its count in place (one becomes several); after `Dismiss` it comes back only with a new
  deletion, counting that one alone. **Its place in "one notice at a time":** the two persistent
  notices (Outdated tab, Unusable data) replace it and are never replaced by it; it and the
  save-problem notice (Save failed, Storage full) are the dismissible ones, and the latest
  replaces the other in place, since both say something just happened. In practice they rarely
  meet: the deletion is one batch, so a refused one shows the save-problem notice and no
  apology. An apology whose deletion commits after the tab became outdated is not shown (the
  reload comes first, and the session is already gone from the list). Rejected: one notice per
  session (several damaged sessions are one event); a confirmation before deleting (the owner's
  ruling deletes; there is nothing to choose); naming the sessions (the summary may be the
  damaged part).
- **D310 — Where the player lands (2026-10-15; spec D310, D311).** As the build plan proposed.
  **`review-link`** whose kept session reads as damaged: the link keeps `is-loading` until the
  deletion settles, then the review mode shows the list without that session (its empty state
  when none is left), focus on the list's title, and the apology shows; it never shows the
  failed-open row. **A list row** whose session reads as damaged: `session-row-open` keeps
  `is-loading` until the deletion settles, then the row leaves and focus moves as after that
  row's deletion (the next row's `session-row-open`, else the previous row's, else the list's
  title over `sessions-empty`), and the apology shows. The list and the notice change together,
  once, rather than the list first and the notice a moment later. **After it,** the most recent
  session is the readable kept session that started last: its row takes " · Last session", and
  `review-link` follows its rule at `Close review` (absent when none is left). **A refused
  deletion** lands the same way (the session stays unlisted for the visit) but shows the
  save-problem notice instead of the apology. No line in the list explains it: the notice sits
  first in the reading order, above the list, as every notice does, and moving focus to it would
  break the rule that notices never take focus. **While saving is off** nothing is deleted: in an
  outdated tab a damaged body keeps the failed-open row ("This session couldn't be opened. Try
  again."), as spec D310 says; a visit started from the defaults lists no row and has no
  `review-link` to a kept session.
- **D311 — The session list aligned (2026-10-15; spec D310, D311).** A kept session whose summary
  cannot be read has no row, saving on or off (with saving on it is deleted at load anyway, with
  the apology; a refused clean-up leaves it unlisted until the next load). A row saved by a newer
  version keeps its row and note: that is not damage (§4.3). `sessions-link` shows while the list
  has at least one row (it counted kept sessions "readable or not"); `Your data` counts the same
  sessions the list shows. The failed-open note ("This session couldn't be opened. Try again, or
  delete it.", unchanged) now means the device refused or failed the read, or the session was
  deleted meanwhile by another tab, never damage, except in an outdated tab. `Delete every
  session` removes every kept session, an unlisted one included.
- **D312 — The policy lines the gates revise (2026-10-15).** `strategy.md`, both trees: the
  "Saving shows nothing; its problems are told outside a session" edge case gains the apology,
  and "Kept sessions at the edges" gains the damaged session (deleted, with the apology) beside
  the one only failed to read (never deleted; its row says it couldn't be opened); the played
  notes' edge case gains the disabled export with its reason. `versions/v3.0/README.md`: status,
  and two decisions worth keeping (the export never offers an empty file; a damaged session is
  deleted with an apology).
- **D313 — `ux-critic`'s pass on the two gates: DRIFT, four findings, all fixed (2026-10-15).** No
  contradiction of spec D310, D311, D315 or master spec §5.1, §9, and no business rule invented;
  the two trees agree. (1) **A refused deletion of damaged sessions** showed the Save failed copy
  ("this change may be lost when the page closes"), wrong at load (no change made) and at an
  opening (nothing says the session couldn't be opened): the save-problem notice gains a wording
  of its own, "Damaged session not deleted", under the same rules (as v3.1's Preset not saved):
  "A kept session was damaged and couldn't be read, and this device refused to delete it. It
  stays hidden until the page is reloaded." / "{n} kept sessions were damaged and couldn't be
  read, and this device refused to delete them. They stay hidden until the page is reloaded."
  No "Sorry": spec D310 says a refused deletion shows no apology, and nothing was deleted. Storage
  full keeps its own wording; at a session's save the keep line tells it, as any failed session
  save. (2) **Counts follow the rows**: Your data and the list's rows leave out a session left
  unlisted after a refused deletion too, not only one whose summary is damaged; `Delete every
  session` still deletes it, though its {n} does not count it (rare; the next load cleans up).
  (3) **"Damaged" defined as spec D310's codec verdict** (an unreadable record, refused content,
  records that disagree, a missing body or kept played notes). (4) **Root, v3.2:** under
  `Favorites only` in a Jam, the very-short reason reads "Every note you played in your favorites
  and the doodle is very short. Turn on Include very short notes to export them."
- **D314 — `ux-critic`'s recheck: DRIFT, two leftovers and a note, all fixed (2026-10-15).** The
  four D313 fixes were confirmed in both trees. Leftovers: (1) root, Preset not saved is now "a
  further wording" of the save-problem notice (it had become the fourth); (2) Your data's layout
  tree shows `Delete every session` "only when {n}, the sessions the list shows, is at least 1",
  as its Sessions bullet says. The note, an older rule meeting the new wording: the save-problem
  notice's after-`Dismiss` suppression would have hidden the only explanation for a row that left
  the list after a refused deletion, so the Damaged session not deleted wording is exempt from it
  and shows at every refusal (both trees, saved-data handoff, After `Dismiss`). Validation of the
  two gates is complete.
- **D315 — The lane's minimum bar width, reworded (2026-10-15; master spec §9, D193, D308).**
  Found while building chunk 25. `screens/last-session-review/handoff.md`, both trees (a recorded
  correction to `versions/v3.0/`, as D307), Played-notes lane, Time: "a bar is never narrower than
  `--played-note-min-inline-size`, so a very short note stays visible" was v2 wording and now read
  as contradicting the lane's rule, since "very short note" is the defined term for a note under
  the stray-note threshold, which the lane leaves out. It now says the minimum width gives a
  visible bar to a brief note the lane shows, one at or just above the very-short-note threshold,
  and the sentence takes its own `[v3 changed]` paragraph. Wording only: no behaviour, token or
  threshold changes; the threshold's value stays out of the design set (it is chunk 25's tuning,
  `docs/midi-tuning.md`). `versions/v2/` keeps the old wording, true of v2.
- **D316 — A deletion under way finishes when its sheet is closed (2026-10-15; owner's ruling).**
  Found by documentalist's wave-6 sync: the design said nothing about closing a Review
  confirmation (Delete session, this session's played notes, the played notes already kept) while
  its deletion runs; as built in wave 6 the deletion finishes anyway. Asked, the owner ruled on
  2026-10-15: "Let the delete finish." Written in both trees (a recorded correction to
  `versions/v3.0/`, as D307), in documents new in v3 or inside paragraphs already tagged
  `[v3 new]`, so no new mark: `flows/kept-sessions/handoff.md`, The Confirmation Pattern (so a
  row's `Delete` in the list follows the same rule once built), and
  `screens/last-session-review/handoff.md`, Confirmations and Focus and Keyboard. As built: while
  it runs the confirming action takes `is-loading` and is disabled, and the way back (the way-back
  action, `Close`, Escape, the backdrop) stays live; taken then, it closes the sheet as the way
  back does, focus returning to the opening button, but no longer cancels. **What the player sees
  afterwards:** the page changes as after the same deletion confirmed with its sheet open, with no
  message (the Review announces no change it makes; the change is what tells it). A deletion
  refused after its sheet closed changes nothing and nothing tells it: spec and module intent say
  only its sheet tells a refusal, never the notice row, and the undeleted session or played notes
  still show, with the button that tries again. Not settled here as new behaviour: no "Deleting…"
  notice, no undo, no stop. **Focus** (settled here, minor): focus still on a control the change
  removes moves by that deletion's own rule (`review-title`, the list's title after
  `Delete session`); focus anywhere else stays. What is built moves focus to `review-title` in
  every case once such a deletion ends (a refusal included, or when the player has moved focus
  meanwhile); the two differ only in those cases, inside a window as long as the device's write.
  Reported to the wave driver as a small build follow-up, not an owner question. Unchanged:
  `Your data`'s confirmations, whose way back is disabled while a deletion runs
  (`screens/your-data/handoff.md`), a different sheet with a deletion of every session in it;
  the owner's ruling was about the Review's.
