# UI/UX Decisions

Append-only record of settled UI/UX decisions. Earlier logs are archived verbatim:

- D1–D44 (first release, v1.0): [archive/v1/decisions-D1-D44.md](archive/v1/decisions-D1-D44.md)
- D45–D176 (v2, released as version 2.0.0):
  [archive/v2/decisions-D45-D176.md](archive/v2/decisions-D45-D176.md)
- D177–D224 (v3.0's design, released as version 3.0.0):
  [archive/v3.0/decisions-D177-D224.md](archive/v3.0/decisions-D177-D224.md)
- D280–D322 (v3.0's design gates and corrections during its build):
  [archive/v3.0/decisions-D280-D322.md](archive/v3.0/decisions-D280-D322.md)

Archived IDs keep their meaning; a citation to one by ID elsewhere in this repository stays valid
through this header. D225–D264 (v3.1, v3.2 and v3.3, not yet released) stay here; D265–D279 were
never used. Numbering continues from D326.

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

## After the v3.0 release, 2026-10-16

- **D323 — `token-source-v3.md` leaves the root; its correction in `versions/v3.0/` (2026-10-16;
  applies D220).** Every token and class it names is in `src/styles/`, shipped in 3.0.0, so the
  root copy is removed (frozen in `versions/v3.0/token-source-v3.md`) and the handoffs cite the
  token source alone: root `screens/` session-list, your-data, my-instrument, last-session-review
  and preset-sheet, `token-source-v3.1-v3.2.md`, `README.md`. A recorded correction gives the four
  `versions/v3.0/` handoffs the same wording and its `README.md` the released status.

## The v3.1 approval, 2026-10-19

- **D324 — v3.1's design approved and frozen in `versions/v3.1/` (2026-10-19; the owner's ruling,
  the v3.1 build plan's gate D0).** The owner approved the v3.1 design: D225-D251's v3.1 part,
  everything marked `[v3.1 new]`, `[v3.1 changed]` or `_v3.1 …:_` at the root. v3.2 (Q73-Q75
  open) and v3.3 are not approved. The copy, as D225 took v3.0's: every tier document, marks
  kept, with v3.2's and v3.3's tagged parts and the sections they open left out, `flows/jam/`
  omitted, the flow index's two rows v3.2 rewrote in place restored to v3.0's goals, and link
  paths adjusted; `token-source-v3.1.md` holds the v3.1 part of the token source document. The
  root and its marks are unchanged (cleared with v4, D225). Not allowed: the token pass (T1).
  The v3.1 build plan's links should point at `versions/v3.1/` (spec-writer, on its branch).

## The v3.1 build, 2026-10-20

- **D325 — v3.1's token-source pass allowed and applied (2026-10-20; the owner's ruling, spec
  D382, reversing spec D355; the v3.1 build plan's gate T1 and chunk 1).** As for v3.0 (Q66, D218,
  D220): part 1 of `token-source-v3.1-v3.2.md` is in `src/styles/theme.css` and `components.css`
  under `v3.1 new` / `v3.1 changed` comments, and marked applied there. Unchanged: v3.0's `v3 new`
  comments (cleared with v4) and `preset-status` (chunk 13 removes it). `choice-*` and
  `control-group-figures` join the selectors of the rules they copy, so the copies cannot drift.
  Settled while writing it: the row's `preset-actions` sits a label line plus the field gap
  lower, and keeps that offset if it wraps under the field; `control-group-intro` takes
  `--spacing-3` below it, as the group's `h3`.

- **D326 — v3.1 release gate: no v3.1 handoff names a class or token missing from `src/styles/`
  (2026-10-21; the v3.1 build plan's chunk 21).** Every class and token in `versions/v3.1/`'s
  handoffs and `token-source-v3.1.md` is in `theme.css` or `components.css`, and so is every class
  the components use (chunks 13, 14, 17, 18 included); `preset-status` is gone from `src/`.
  Recorded correction, in `versions/v3.1/` and the root alike (allowed by the wave driver): the
  preset during "After `Start with this phrase`" now names `preset-select`, not `preset-status` and
  the musical profile's `radiogroup` (`screens/phrase-workspace/`, `flows/play-session/`
  handoffs), and the passing-and-neighbor rule spec D378 rejected is gone: every level is always
  selectable (the Embellishments section and change block, the figure step).
