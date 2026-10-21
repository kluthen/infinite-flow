# UI/UX Decisions

> **Archived 2026-10-21.** v3.1 (presets and embellishment figures) is released as version 3.1.0
> (tag `v3.1.0` at 55364e7). These are the decisions D227-D234, kept verbatim with their
> subsection heading: the v3.1-only part of the v3.1 and v3.2 design of 2026-10-08. The entries
> shared with v3.2 (D225, D226, D246, D249, D250) stay live. Live summary: [README.md](README.md).
> Relative paths in the entries were written from `ui_ux/`.

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
