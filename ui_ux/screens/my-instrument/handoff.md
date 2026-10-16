# My Instrument Handoff

> **New in v3.**

The sheet where the player makes, changes and deletes their own instrument. It opens from
`instrument-actions` in the instrument profile's `field-group` on `screens/phrase-workspace/`
(`Create my instrument` when none exists, `Edit my instrument` once it does), at idle and while
the review shows, never during a session. The flow around it is `flows/my-instrument/`; the
transposition check's own way into my instrument is in `screens/controller-connection/`.

## Layout Tree

```text
sheet-backdrop
  sheet sheet-wide (role="dialog" aria-modal="true" aria-labelledby="sheet-title")
    sheet-header
      sheet-title (id="sheet-title"; "Create my instrument", "My instrument", "Save and erase sessions?" or "Delete my instrument?")
      sheet-close (btn, "Close")
    sheet-body (one of the three blocks below)
      -- Form (Creating or Editing)
        inline-alert alert-notice (reload line; Editing only, only in a tab that must be reloaded while my instrument has kept sessions; see States)
        field-group (template; Creating only)
          field-label ("Start from")
          segmented-control (C MIDI keyboard, B-flat tenor saxophone, E-flat alto saxophone)
          field-note ("Fills in the range and the transposition below.")
        sheet-hint ("Made from: {template}"; Editing only)
        field-group (name)
          field-label (a label element for the text-input: "Name")
          text-input (maxlength="30")
          field-note ("Left empty, it is called My instrument.")
        field-group (clef)
          field-label ("Clef")
          segmented-control (Treble clef, Bass clef)
          field-note ("Bass clef suits low instruments. The clef changes where notes are drawn, never which notes.")
        sheet-section (range)
          h3 ("Range")
          sheet-hint ("In written notes, the way you read them. C4 is middle C.")
          range-row
            field-group (lowest note)
              field-label ("Lowest note")
              note-stepper (role="spinbutton")
                stepper-button (one semitone down)
                input-stepper-value (a note name with its octave number, e.g. "C4")
                stepper-button (one semitone up)
            field-group (highest note)
              field-label ("Highest note")
              note-stepper (as above)
          range-alert (role="status"; present only while the range is refused; one p per reason, see Range refused)
          profile-range-summary (present only while the range is valid; the range-alert takes its place otherwise)
          field-note (staff-reach note; present only while the range is valid and, in the chosen clef, makes the staff taller than the built-in instruments need)
        sheet-section (transposition)
          h3 ("Transposition")
          field-group
            field-label ("Sounds")
            note-stepper (role="spinbutton"; value "{n} lower", "Same" or "{n} higher")
            field-note ("{interval}: a written C4 sounds as {note}.")
        sheet-actions-destructive (Editing only; absent while the reload line shows)
          btn btn-error ("Delete my instrument")
      -- Erase warning (Save, when the range or the transposition changed and my instrument has sessions)
        p (what is erased; see States)
        p ("This can't be undone.")
        sheet-hint (how to keep one)
        inline-alert alert-error (only after a save that failed: "That couldn't be saved, and nothing was erased. Try again.")
      -- Delete confirmation
        p (what is deleted; see States)
        p ("This can't be undone.")
        sheet-hint (how to keep one; only when sessions go)
        inline-alert alert-error (only after a deletion that failed: "That couldn't be deleted. Try again.")
    sheet-actions
      -- Form: btn btn-primary ("Save"), btn ("Cancel")
      -- Erase warning: btn btn-error ("Save and erase"), btn ("Cancel")
      -- Delete confirmation: btn btn-error ("Delete my instrument"), btn ("Cancel")
```

## Components and Content

- `sheet-backdrop`, `sheet`, `sheet-header`, `sheet-close`, `sheet-body` and `sheet-actions` are
  the connection sheet's own (see `screens/controller-connection/handoff.md`): `--z-sheet`,
  `--color-scrim`, a centered panel that scrolls vertically inside itself, `Close` always present
  and enabled. `sheet-wide` widens it to `--sheet-wide-max-inline-size`, so the two range
  steppers sit side by side.
- **Title.** "Create my instrument" while creating, "My instrument" while editing, "Save and erase
  sessions?" in the erase warning, "Delete my instrument?" in the delete confirmation. The dialog
  is named by `sheet-title`.
- **Template** (Creating only). A `segmented-control` of the three built-in profiles, labelled as
  in the workspace's instrument control. It starts on the built-in profile selected in the
  workspace. Choosing a segment refills the range and the transposition with that profile's own
  (written range and how it sounds) and never touches the name field or the clef. It is not shown
  when editing: the template only sets starting values, so changing it later would mean nothing.
  In its place, editing shows the `sheet-hint` "Made from: {template}", the profile it was made
  from, which is also the profile the instrument control returns to when it is deleted.
- **Name.** A `text-input` with `maxlength="30"`: typing stops at 30 characters and a paste is cut
  there, so the field has no error state. It starts empty when creating. Spaces at its start and
  end are removed on `Save`; a name left empty, or of spaces only, is saved as "My instrument".
  The name labels the instrument control's fourth segment and appears in the check's copy.
- **Clef.** A `segmented-control` labelled "Clef", with two segments, "Treble clef" and "Bass
  clef", between the name and the range, since the range is read on the staff it chooses. Creating
  starts on "Treble clef", the clef of every template; editing shows the saved clef. Choosing a
  template never changes it. Its `field-note` reads "Bass clef suits low instruments. The clef
  changes where notes are drawn, never which notes." Changing the clef checks the range again at
  once against the new clef's bound (Range refused), and reads the staff-reach note again; the
  steppers keep their notes.
- **Note names.** Every note in this sheet, and in its `field-note`s and refusals, except the
  transposition's example note (below), is a name from
  C, C♯, D, E♭, E, F, F♯, G, A♭, A, B♭, B followed by its octave number, the number going up by
  one at each C (C4 is middle C), as the starting-note line spells it. One spelling per key, never
  a double sharp or flat, whatever the key of the phrase.
- **Range.** Two `note-stepper`s in `range-row`, "Lowest note" and "Highest note", in written
  pitch. Each step is one semitone. When creating they start at the template's written range (C3
  to C5 for the C MIDI keyboard, C4 to C6 for both saxophones). Each stepper stops only at its own
  bound: the last note whose sounding note, after the transposition, is still inside the MIDI note
  range (MIDI 0 to 127); its `stepper-button` toward that bound then takes `disabled`. The
  steppers are never stopped at the two-octave limit or at the clef's bound, and the lowest note
  may pass the highest: the player can move a whole range by one end, then the other, and change
  the clef before or after.
- **Range refused.** The range is refused while it spans under two octaves, or while either end
  lies outside its clef's bound: written C2 to C7 in treble clef, written E0 to E5 in bass clef,
  both ends included. While it is refused, `range-alert` is present under `range-row`, `Save` is
  disabled, and `profile-range-summary` and the staff-reach note are absent. `range-alert` holds
  one `p` for each reason that applies, the span first:
  - span from 0 to 23 semitones: "The range needs at least two octaves (24 semitones) between its
    lowest and highest notes. It has {n}."
  - lowest note above the highest: "The range needs at least two octaves (24 semitones) between
    its lowest and highest notes. Its lowest note is above its highest."
  - outside the clef's bound, `{clef}` being "treble clef" or "bass clef", `{bottom}` and `{top}`
    its bound (C2 and C7, or E0 and E5):
    - lowest note too low: "In {clef}, the range must stay between {bottom} and {top}. {lowest}
      is too low."
    - highest note too high: "In {clef}, the range must stay between {bottom} and {top}.
      {highest} is too high."
    - both: "In {clef}, the range must stay between {bottom} and {top}. {lowest} is too low and
      {highest} too high."

    followed in the same `p`, only when both ends lie inside the other clef's bound, by "It fits
    in {other clef}."

  Examples: "In treble clef, the range must stay between C2 and C7. B1 is too low. It fits in bass
  clef." (written B1 to B3); "In treble clef, the range must stay between C2 and C7. C♯7 is too
  high." (written C♯5 to C♯7); "In bass clef, the range must stay between E0 and E5. F5 is too
  high. It fits in treble clef." (written F3 to F5, after switching to bass clef).

  It is a polite live region, so a keyboard player stepping a note or switching the clef into a
  refused range hears why `Save` went unavailable; it updates in place while the range stays
  refused and leaves when the range is valid.
- **Windows.** While the range is valid, `profile-range-summary` shows the same text the
  workspace's instrument control shows for a built-in profile: the active range and its Low,
  Middle and High whole-phrase windows, derived as for the built-in profiles from the range in
  concert pitch (the written range moved by the transposition). It updates live on every step of
  either range stepper or of the transposition. It is read-only: windows are never set by hand.
- **Staff-reach note.** The workspace gives its staff systems one height: 16 staff spaces, the
  built-in instruments' need, unless my instrument's written range, placed on the staff in its
  own clef, needs more (`screens/phrase-workspace/handoff.md`, Notation Contract). While the range
  is valid and, in the chosen clef, needs more, a `field-note` under the windows says what that
  costs, before anything is saved: "In {clef}, this range makes the staff taller for every
  instrument, and it may no longer fit a phone's screen." followed, only when the same range in
  the other clef lies inside that clef's bound and needs no more than 16 staff spaces, by "In
  {other clef}, it would not." It is computed from the range and the clef on screen by the same
  rule that sizes the staff, updates live with the steppers and the clef, never blocks `Save`, and
  is not a live region (the range is still valid; the player reads it when they look).
- **Transposition.** A `note-stepper` labelled "Sounds": how a written note sounds, in semitones,
  one semitone per step, reading "{n} lower", "Same" or "{n} higher". The built-in templates give
  14 lower (B-flat tenor saxophone), 9 lower (E-flat alto saxophone) and Same (C MIDI keyboard).
  Its bound is the last value at which both range notes still sound inside the MIDI note range.
  The `field-note` under it reads "{interval}: a written C4 sounds as {note}.", updated on every
  step:
  - `{interval}` is the interval's name, derived from the count, never chosen, with its
    direction: "No transposition" at Same; from 1 to 11 semitones, "A minor second", "A major
    second", "A minor third", "A major third", "A perfect fourth", "An augmented fourth" (6, never
    "tritone" or "diminished fifth"), "A perfect fifth", "A minor sixth", "A major sixth", "A
    minor seventh", "A major seventh", then " lower" or " higher"; a whole number of octaves,
    "One octave", "Two octaves" (and so on, in words) then " lower" or " higher"; from 13 to 23,
    the compound name, then the direction, then the octave it holds in brackets: "A major ninth
    lower (an octave and a major second)", the names being minor ninth (13), major ninth (14),
    minor tenth (15), major tenth (16), perfect eleventh (17), augmented eleventh (18), perfect
    twelfth (19), minor thirteenth (20), major thirteenth (21), minor fourteenth (22) and major
    fourteenth (23); above 24 and not a whole number of octaves, the octaves then the simple name:
    "Two octaves and a major second lower".
  - `{note}` is the note C4 sounds as, spelled so that it agrees with the interval's name: C4
    moved by the interval's letter-name steps (master spec §7.1's table, one letter per step,
    seven per octave), so a minor second higher is D♭4, an augmented fourth lower G♭3, a major
    seventh lower D♭3 and a minor ninth higher D♭5. Starting from C, this never needs a double
    sharp or flat. It is the one note in the sheet not taken from the one-spelling list above,
    which would write C♯4 for "a minor second higher" and so contradict the name.

  So: "A major ninth lower (an octave and a major second): a written C4 sounds as B♭2." at 14
  lower, "A major sixth lower: a written C4 sounds as E♭3." at 9 lower, "No transposition: a
  written C4 sounds as C4." at Same, "One octave lower: a written C4 sounds as C3." at 12 lower,
  "An augmented fourth higher: a written C4 sounds as F♯4." at 6 higher. Changing the transposition
  never moves the written range: the steppers keep their notes, and the sounding range, the
  windows and the `field-note` follow.
- **Delete.** Editing only: `sheet-actions-destructive` at the end of `sheet-body`, after every
  section, holding `btn btn-error` "Delete my instrument". It opens the delete confirmation; it
  never deletes by itself.
- **Actions.** `Save` (`btn btn-primary`), then `Cancel` (`btn`), primary first in markup, visual
  and focus order. `Save` is disabled only while the range is refused. `Cancel` discards every
  change and closes the sheet, asking nothing: nothing kept is deleted by leaving a form.
- **The sessions of my instrument** are the kept sessions played with it, as the session list
  shows them, and the session that just ended when it was played with my instrument and is held
  in memory only because its save failed. `{N}` below is their number. While saving is off, a
  session held in memory is never counted and keeps its review whatever changes: in a visit
  started from the defaults because the saved data couldn't be read, {N} is always 0 (that visit
  has read no kept session); in a tab that must be reloaded, {N} counts only the kept rows the
  tab read, and those changes are withheld while there is one (States).
- No raw value: every visual value comes from `src/styles/theme.css`, `src/styles/components.css`
  and `ui_ux/token-source-v3.md` through the classes above.

## What Save Does

- **Creating.** My instrument is saved and selected: the instrument control gains its fourth
  segment, labelled with the name, checked; `instrument-actions` reads `Edit my instrument`. The
  phrase is replaced as on any instrument switch (see `screens/phrase-workspace/handoff.md`): a
  fresh seed, the written key, collection and every other control kept; with no phrase shown, only
  the selection changes; under an unsupported rhythm combination the phrase clears.
- **Editing, the range or the transposition changed, while my instrument has sessions** ({N} of
  1 or more): `Save` opens the erase warning instead of saving (States). Confirmed, it saves and
  erases them, then goes on as below; cancelled, nothing is saved or erased.
- **Editing, my instrument selected, range or transposition changed.** Saved, and the phrase is
  replaced as on an instrument switch.
- **Editing, only the clef changed (with the name or not), my instrument selected.** Saved; the
  phrase on screen stays and is redrawn at once in the new clef, with no fade, since its notes are
  the same; the fourth segment's label follows the name.
- **Editing, only the name changed, or my instrument not selected.** Saved; the fourth segment's
  label follows the name; the phrase is not touched and the selection does not change.
- **Editing, nothing changed.** The sheet just closes.
- **A name or clef change never warns** and keeps every session: each session's phrases stay in
  the clef they were played in, and the session list keeps the name the session was played under.
- **The staff's height** is set again from the saved range and clef (Notation Contract); when it
  changes, the phrases prepared in the background are checked again against it, as after a window
  change, showing nothing.
- **While the review shows.** The same rules apply to the phrase under the review, the one the
  staff gets for the next session. The review itself is not touched, unless it shows a session
  the save erases (States, Sessions erased).
- **While a phrase is being generated** (a window change can start one behind the open sheet):
  the save happens at once, and its effect on the selection and the phrase is applied when that
  generation ends, as an instrument switch made at that moment would be.
- Nothing confirms a save. A save the browser refuses is told by the workspace's notice row after
  the sheet closes (`flows/saved-data/`); the instrument still applies for the visit. The first
  save of my instrument also asks the browser to protect the app's data; nothing shows that
  request.
- The sheet closes after `Save`, or after `Save and erase` once it succeeds.

## Focus and Keyboard

- **On open:** Creating, focus goes to the template's checked segment; Editing, to the name
  `text-input`.
- **Order:** `sheet-close`, the template (one tab stop, arrow keys moving between segments as in
  every `segmented-control`), the name, the clef (one tab stop, the same way), the lowest note,
  the highest note, the transposition, `Delete my instrument` (Editing), `Save`, `Cancel`. Focus
  is trapped in `sheet`.
- **`note-stepper`:** the existing stepper's keyboard model, exactly as the workspace's tempo
  stepper: one tab stop on the `role="spinbutton"` element; Up and Right one semitone up, Down and
  Left one semitone down; Home and End to the stepper's own bounds; its `stepper-button`s take no
  tab stop. Accessible names "Lowest note", "Highest note" and "Sounds"; `aria-valuetext` the
  note with its octave ("C4"), or the transposition in full with its interval ("14 semitones
  lower, a major ninth", "Same pitch", "9 semitones higher, a major sixth", "12 semitones lower,
  one octave"). Button labels: "Lowest note one semitone down", "Lowest note one semitone up", and
  the same for "Highest note"; "One semitone lower" and "One semitone higher" for the
  transposition.
- **Enter in the name field** does what `Save` does when it is enabled, and nothing otherwise.
- **Escape, the backdrop and `Close`** in the form do what `Cancel` does.
- **On close** after `Save`, `Save and erase` or `Cancel`, focus goes to the `instrument-actions`
  button, which is always there between sessions (its label may have changed). After a delete it
  goes to the same button, which then reads `Create my instrument`.
- **Erase warning and delete confirmation:** focus goes to `Cancel` when either opens, never to
  the erasing or deleting action. `Cancel`, Escape, the backdrop and `Close` are the way back:
  they return to the form with every unsaved edit as it was, and focus goes back to the button
  that opened it, `Save` or `Delete my instrument`.

## Responsive Behavior

- At `bp-mobile-landscape`: `sheet-wide` behaves as `sheet` does there, filling the inline size
  left by the backdrop's padding up to `--sheet-wide-max-inline-size`, so a phone in landscape
  shows it at that cap; `range-row` stacks the two steppers; the template's
  `segmented-control` wraps as the workspace's instrument control does, and the clef's two
  segments stay on one row; `sheet-actions` stacks full-width, `Save` on top; the sheet scrolls
  vertically inside itself, so `range-alert` may sit below the fold, which is why it is a live
  region and why `Save` carries the refusal too.
- At `bp-tablet-landscape` and `bp-desktop`: centered, up to `--sheet-wide-max-inline-size`;
  `range-row` puts the two steppers side by side; `sheet-actions` is one row aligned to the end,
  `Save` first.
- Every breakpoint gets every field and action: the phone loses nothing.

## States

- **Creating.** Opened from `Create my instrument`. Template on the selected built-in profile;
  name empty; "Treble clef"; range and transposition the template's; windows shown. `Save`
  enabled.
- **Editing.** Opened from `Edit my instrument`. "Made from: {template}"; the saved name, clef,
  range and transposition; windows shown; `Delete my instrument` present. `Save` enabled.
- **Range refused** (within Creating or Editing). `range-alert` present, `profile-range-summary`
  and the staff-reach note absent, `Save` disabled; every field still editable. Leaves as soon as
  the range is valid again, by a step or by a clef change.
- **Erase warning.** Opened by `Save` when the range or the transposition differs from the saved
  one and {N} is 1 or more; with {N} at 0, `Save` saves at once, with no warning, since nothing is
  erased. `sheet-title` "Save and erase sessions?". Body:
  - first paragraph: "Changing the range or the transposition erases the {N} sessions played with
    this instrument, with their favorite phrases, comments and played notes." ({N} of 1: "Changing
    the range or the transposition erases the session played with this instrument, with its
    favorite phrases,
    comment and played notes."), then, only when the review on screen shows one of them, "The
    session reviewed on screen is one of them, so its review closes." ({N} of 1: "It is the
    session reviewed on screen, so its review closes.");
  - a second paragraph: "This can't be undone.";
  - `sheet-hint`: "To keep a session, cancel, then export it from its review first." ({N} of 1:
    "To keep it, cancel, then export it from its review first.").

  `sheet-actions`: `Save and erase` (`btn btn-error`), `Cancel` (`btn`), focus on `Cancel` at
  open. While it runs, `Save and erase` takes `is-loading` and the way back does nothing. The save
  and the erasing happen together or not at all: if they fail, the warning stays open with
  `inline-alert alert-error` "That couldn't be saved, and nothing was erased. Try again." under
  the body, nothing is changed, and `Save and erase` tries again. On success: my instrument is
  saved and its sessions are erased; the sheet closes, and the save goes on as in What Save Does.
  Where the player lands is under Sessions erased, below.
- **Delete confirmation.** `sheet-title` "Delete my instrument?". Body:
  - first paragraph: "{name} will be deleted, with its clef, range and transposition." then, when {N}
    is 1 or more, "The {N} sessions played with it go too, with their favorite phrases, comments
    and played notes." ({N} of 1: "The session played with it goes too, with its favorite phrases,
    comment and played notes."), then, only when the review on screen shows one of them, the same
    sentence as in the erase warning, then, only when my instrument is selected, "The instrument
    goes back to {template}, the profile it was made from.";
  - a second paragraph: "This can't be undone.";
  - when {N} is 1 or more, the erase warning's `sheet-hint`.

  `sheet-actions`: `Delete my instrument` (`btn btn-error`), `Cancel` (`btn`), focus on `Cancel`
  at open. While the deletion runs, `Delete my instrument` takes `is-loading` and the way back
  does nothing. If it fails, the confirmation stays open with `inline-alert alert-error` "That
  couldn't be deleted. Try again." under the body, nothing is changed, and `Delete my instrument`
  tries again. On success: my instrument and its sessions are deleted, the sheet closes, the
  fourth segment leaves the instrument control and `instrument-actions` reads `Create my
  instrument`; when it was selected, `{template}` is selected and the phrase is replaced as on an
  instrument switch; otherwise the selection and the phrase are not touched. The remembered
  controller is not touched.
- **Sessions erased** (after `Save and erase`, or a deletion with {N} of 1 or more). Every
  session of my instrument is gone, kept or held in memory, as if each had been deleted from its
  own review (`flows/kept-sessions/handoff.md`, Deletions Made Elsewhere): when the review mode
  shows the review of one of them, the session list replaces it, its empty state included, as
  after `Delete session`; when it shows the list, their rows leave; when the session that just
  ended is one of them, there is no most recent session until the next session ends with a
  review, and `Review last session` is not shown. The sheet then closes as usual, focus on
  `instrument-actions`, which the review mode leaves usable. Nothing else announces it.
- **In a tab that must be reloaded** (an outdated tab, `flows/saved-data/`), while my instrument
  has kept sessions (rows this tab read): the form opens in Editing with the reload line first in
  `sheet-body`, an `inline-alert alert-notice` reading "Reload this page to change the range or
  the transposition, or to delete {name}: either would erase the sessions played with this instrument, and
  this page can't delete anything until it is reloaded."; the three `note-stepper`s are disabled,
  as the tempo stepper is during a session, with their values in full contrast; `Delete my
  instrument` and its `sheet-actions-destructive` are absent. The name and the clef still change
  and `Save` still applies them, for the visit only, as every save in such a tab. With no kept
  session of my instrument, the sheet is as usual (its changes, for the visit only, erase nothing).
  When the tab becomes outdated while the sheet is open, the sheet takes this form at that moment:
  an open erase warning or delete confirmation returns to the form erasing and deleting nothing,
  focus on `Save`, and the range and the transposition go back to their saved values.
- **Empty:** none. The form always holds a whole instrument, from the template or the saved one.
- **Loading:** none of its own when nothing is erased: saving is local and immediate, and the case
  of a phrase being generated behind the sheet is under What Save Does. The erase warning and the
  delete confirmation show `is-loading` on their action while they run.
- **Error:** the refused range is a notice, not an error; a save the browser refuses is told
  outside the sheet. The error-toned lines are a failed save-and-erase, in the erase warning, and
  a failed deletion, in the delete confirmation.
- **Never during a session:** `instrument-actions` is disabled for the whole session, so the
  sheet cannot open, and no session can start while it is open: no MIDI note starts one, the
  starting note included.
