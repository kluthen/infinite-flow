# UI/UX Decisions

> **Archived 2026-10-16.** v3.0 (Storage) is released as version 3.0.0 (tag `v3.0.0` at e288d98,
> deployed). These are the decisions D280-D322, kept verbatim: the design gates and corrections
> made while v3.0 was built (waves 2 to 9). D265-D279 were never used. Live summary:
> [README.md](README.md). Relative paths in the entries were written from `ui_ux/`.

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
- **D317 — The most recent session after a deletion: the player's leaves none, a damaged
  session's passes it on at once (2026-10-15; spec D304, D310; found by documentalist).** While
  capturing `module_kept_session_reach` (abddba4) documentalist found the kept-sessions handoff
  saying two things: Terms, "Deleting it leaves no most recent session until the next session
  ends with a review", unqualified; A Damaged Session (ux D310) and the session list's States, the
  readable kept session that started last "as after the player's own deletion". Settled from the
  spec, not chosen: master spec Part A is silent on the successor after a damaged deletion (§5.1
  only says, for my instrument's deletions, that `Review last session` goes); spec D304 settles
  the player's own deletion (none in that visit; after a reload, the readable kept session with
  the latest start) and spec D310 settles the damaged one explicitly (the most recent session
  "then becomes the readable kept session that started last"), as build plan chunk 28's scope
  repeats. Both stand, and they agree once read together: D304's after-reload rule picks the
  latest-started *readable* session, and a session whose body reads as damaged never was one, as
  the load already decides without damaged summaries (`flows/saved-data/handoff.md`). So:
  **any deletion the player makes** (one session, every session, my instrument's) leaves no most
  recent session in that visit until the next session ends with a review; **a damaged session's
  deletion** hands it at once to the readable kept session that started last. The only wrong
  words were "as after the player's own deletion", true only after a reload; spec D310 and chunk
  28's scope use the same loose clause, reported to `spec-writer` as wording only. Written in
  both trees (a recorded correction to `versions/v3.0/`, as D307 and D316), in documents new in
  v3, so no new mark: `flows/kept-sessions/handoff.md` (Terms names the exception; A Damaged
  Session's "most recent session afterwards" loses the loose clause),
  `flows/kept-sessions/intent.md` (why the two differ: the player chose the deletion and the link going confirms it; a damaged
  session was never one the app could open, and had its damage been found at load the next one
  would have been the last from the start), `screens/session-list/handoff.md` (States). No
  change to what is built or captured: the player's deletion already leaves none (chunk 10b,
  `module_kept_session_reach`), and the damaged deletion is chunk 28's, whose scope already says
  the started-last session; chunk 14's " · Last session" follows the controller's most recent
  session either way. When chunk 28 is captured, its atom states the successor.

## v3.0 wave 8: another tab's Delete everything, 2026-10-16

Inputs: master spec Part A v1.22 (§4.3, done item 14), spec D331, D300. Nothing in `src/` is
edited.

- **D318 — Q80 closed: another tab's `Delete everything` outdates every other open tab
  (2026-10-16; spec D331, D300).** Ruled by `spec-writer` as spec D331: once the player runs
  `Delete everything` in one tab, every other open tab is an outdated tab, saving and deleting
  nothing, offering no deletion and showing the reload notice outside a running session; in v3.0
  its notice shows the newer version's wording, since the storage port reports no cause (spec
  D300); a visit whose database never opened (its read failed) is not told and still offers
  `Delete everything`, as §4.4 says. This is the design of ux D293 and D294 as it stands: the
  deletion's own wording stays in the design for a later version, behind the port's cause. No
  design change. Two documents would have misled and gain a line, in both trees (a recorded
  correction to `versions/v3.0/`, as D307 and D316; both documents are new in v3, so no new
  mark): `flows/saved-data/intent.md`, whose deletion paragraph promised its own words with no
  word of the fallback, now says the newer-version wording shows until the port can say why;
  `screens/your-data/handoff.md`, States, Saving off this visit: the outdated form also follows
  another tab's `Delete everything` (with the newer-version wording, as the notice), and
  "Becoming outdated while the sheet is open" names that trigger. `flows/saved-data/handoff.md`
  (Notices, Outdated tab and `Delete everything` in another tab) and `strategy.md` already said
  it and are unchanged.

## v3.0 wave 9: small follow-ups, 2026-10-16

Inputs: chunk 24b-2 (65db2a4), the cosmetic notes the build plan's wave records left for
`ux-writer` (chunks 15b and 20b), the header's build id (10af03a, merged as c31e18b). The owner's
standing delegation applies (D119, D135, archived). Nothing in `src/` is edited. Every edit is
written in both trees, a recorded correction to `versions/v3.0/` to match what v3.0 ships (as
D296, D307), inside paragraphs or documents v3.0 already marks, except where a new mark is named.

- **D319 — After `Start with this phrase`, the musical profile preset shows the player's
  selection, never phrase 1's (2026-10-16; confirms chunk 24b-2's reading of D302 and D305).**
  The handoff's "keep what they showed at the start" meant the instant the player pressed Start,
  and chunk 24b-2 built it so; the words are now exact. From the start to the session's end the
  musical profile preset's `radiogroup` (checked `Neutral` or `Jazz`, or none in the custom
  state), `preset-status` (text and grammar word) and `control-summary`'s musical-profile segment
  show that selection, even when it is one of the settings the prompt named (a `Neutral`-to-`Jazz`
  change), changing only as an automatic change changes them (Vary settings, from phrase 2 on);
  every other changed control, Written key included, shows phrase 1's value through the count-in
  and phrase 1. Why: the selection names a set of values rather than one, and worked out from
  phrase 1's values it would turn to Custom or the other profile and back inside one phrase the
  player is not acting on; it keeps in view the choice the prompt said the next phrases follow;
  and it is the rule v3.1's preset bar already holds. Accepted cost: for one phrase, read-only,
  `Jazz` can be checked over `Neutral`'s values. Rejected: showing phrase 1's selection (more
  literal to "the controls show what sounds", but two flips per stale start for a derived mark).
  No code change. Files: `flows/play-session/handoff.md` (What the controls show),
  `flows/play-session/intent.md` (A phrase made before the settings changed: why),
  `screens/phrase-workspace/handoff.md` (Automatic changes, After `Start with this phrase`); root
  only, the v3.1 preset-bar lines in both handoffs now say "when the player pressed Start, their
  selection and never phrase 1's".
- **D320 — A button directly in a `sheet-section` keeps its own width (2026-10-16; chunk 15b's
  note).** `sheet-section` is a grid, so a `.btn` child stretched across it; chunk 15b wrapped
  Your data's section buttons in plain `div`s to stop that. The design already said those buttons
  keep their own width at the inline start (`screens/your-data/handoff.md`, Responsive); the class
  now carries it: `.sheet-section > .btn { justify-self: start }`, at every breakpoint, the
  `Keep my played notes` toggle included, so no wrapper is needed. Written in `token-source-v3.md`
  (`sheet-section`). **Code change to route:** add the rule to `src/styles/components.css`'s
  `sheet-section` block (its `v3 new` run); the wrappers in `YourDataSheet.vue` may then go.
- **D321 — A sheet is capped at every breakpoint; 36rem at 844 px is intended (2026-10-16;
  chunk 20b's note).** At 844 px (a phone in landscape, inside `bp-mobile-landscape`) the My
  instrument sheet stops at `--sheet-wide-max-inline-size`, as the connection sheet has always
  stopped at `--sheet-max-inline-size` there ("up to" its cap, v2's wording). That is the design:
  a label, a value and an action read as one row only within a measure, and a phone in landscape
  is short, not narrow, so a wider sheet gains it nothing. The later sheets' phone lines ("fills
  the inline size left by the backdrop's padding") had dropped the cap and now say "up to" it:
  `token-source-v3.md` (`sheet-wide`), `screens/my-instrument/handoff.md`,
  `screens/your-data/handoff.md`, `screens/stale-phrase-prompt/` (handoff and intent) and, root
  only, `screens/preset-sheet/handoff.md`. Rejected: putting the range steppers side by side in
  the 36rem phone sheet to save height (a code change for a few lines on a secondary display
  whose sheet scrolls inside itself; the stacking stays tied to `bp-tablet-landscape`, as built).
  No code change.
- **D322 — The build id in the header (2026-10-16; 10af03a, merged as c31e18b).** Written as
  built: `brand` holds `brand-mark` (the `h1`) then `build-id`, "{app version} · {short commit
  id}", the dot `aria-hidden`, `--text-xs`, `--color-text-muted`, tabular digits, on the brand
  mark's baseline, never wrapping inside itself, "unknown" when the build could not tell; static,
  not a control or a live region, the same in every mode. Below `bp-desktop` `header-actions`
  takes its own row, so the brand row has room for it on a phone. It is for the owner and bug
  reports, so it stays small and outside the `h1`. A new v3.0 item, so newly marked in both
  trees: a `_New:_` change-block item and `[v3 new]` tags in `screens/phrase-workspace/handoff.md`
  (Layout Tree, Components and Content, Responsive Behavior); the two classes in
  `token-source-v3.md` (Header). **Code change to route (token discipline only, no visible
  change):** `.brand` and `.build-id` are scoped styles in `WorkspaceHeader.vue`; they belong in
  `src/styles/components.css`, beside `brand-mark`, under a `v3 new` comment with their states
  comment, so every class lives in the token source.
