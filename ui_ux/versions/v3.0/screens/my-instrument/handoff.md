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
      sheet-title (id="sheet-title"; "Create my instrument", "My instrument", or "Delete my instrument?")
      sheet-close (btn, "Close")
    sheet-body (one of the two blocks below)
      -- Form (Creating or Editing)
        field-group (template; Creating only)
          field-label ("Start from")
          segmented-control (C MIDI keyboard, B-flat tenor saxophone, E-flat alto saxophone)
          field-note ("Fills in the range and the transposition below.")
        sheet-hint ("Made from: {template}"; Editing only)
        field-group (name)
          field-label (a label element for the text-input: "Name")
          text-input (maxlength="30")
          field-note ("Left empty, it is called My instrument.")
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
          range-alert (role="status"; present only while the range spans under 24 semitones)
          profile-range-summary (present only while the range is valid; the range-alert takes its place otherwise)
          field-note (staff-reach note; present only while the written range reaches further above or below the staff than any built-in profile's)
        sheet-section (transposition)
          h3 ("Transposition")
          field-group
            field-label ("Sounds")
            note-stepper (role="spinbutton"; value "{n} lower", "Same" or "{n} higher")
            field-note ("A written C4 sounds as {note}.")
        sheet-actions-destructive (Editing only)
          btn btn-error ("Delete my instrument")
      -- Delete confirmation
        p (what is deleted; see States)
        p ("This can't be undone.")
        inline-alert alert-error (only after a deletion that failed: "That couldn't be deleted. Try again.")
    sheet-actions
      -- Form: btn btn-primary ("Save"), btn ("Cancel")
      -- Delete confirmation: btn btn-error ("Delete my instrument"), btn ("Cancel")
```

## Components and Content

- `sheet-backdrop`, `sheet`, `sheet-header`, `sheet-close`, `sheet-body` and `sheet-actions` are
  the connection sheet's own (see `screens/controller-connection/handoff.md`): `--z-sheet`,
  `--color-scrim`, a centered panel that scrolls vertically inside itself, `Close` always present
  and enabled. `sheet-wide` widens it to `--sheet-wide-max-inline-size`, so the two range
  steppers sit side by side.
- **Title.** "Create my instrument" while creating, "My instrument" while editing, "Delete my
  instrument?" in the confirmation. The dialog is named by `sheet-title`.
- **Template** (Creating only). A `segmented-control` of the three built-in profiles, labelled as
  in the workspace's instrument control. It starts on the built-in profile selected in the
  workspace. Choosing a segment refills the range and the transposition with that profile's own
  (written range and how it sounds) and never touches the name field. It is not shown when
  editing: the template only sets starting values, so changing it later would mean nothing. In
  its place, editing shows the `sheet-hint` "Made from: {template}", the profile it was made from,
  which is also the profile the instrument control returns to when it is deleted.
- **Name.** A `text-input` with `maxlength="30"`: typing stops at 30 characters and a paste is cut
  there, so the field has no error state. It starts empty when creating. Spaces at its start and
  end are removed on `Save`; a name left empty, or of spaces only, is saved as "My instrument".
  The name labels the instrument control's fourth segment and appears in the check's copy.
- **Note names.** Every note in this sheet, and in its `field-note`, is a name from C, C♯, D, E♭,
  E, F, F♯, G, A♭, A, B♭, B followed by its octave number, the number going up by one at each C
  (C4 is middle C), as the starting-note line spells it. One spelling per key, never a double
  sharp or flat, whatever the key of the phrase.
- **Range.** Two `note-stepper`s in `range-row`, "Lowest note" and "Highest note", in written
  pitch. Each step is one semitone. When creating they start at the template's written range (C3
  to C5 for the C MIDI keyboard, C4 to C6 for both saxophones). Each stepper stops only at its own
  bound: the last note whose sounding note, after the transposition, is still inside the MIDI note
  range (MIDI 0 to 127); its `stepper-button` toward that bound then takes `disabled`. The
  steppers are never stopped at the two-octave limit, and the lowest note may pass the highest:
  the player can move a whole range by one end, then the other.
- **Range refused.** While the highest note is fewer than 24 semitones above the lowest, lowest
  above highest included, `range-alert` is present under `range-row`, `Save` is disabled, and
  `profile-range-summary` is absent. Text:
  - span from 0 to 23 semitones: "The range needs at least two octaves (24 semitones) between its
    lowest and highest notes. It has {n}."
  - lowest note above the highest: "The range needs at least two octaves (24 semitones) between
    its lowest and highest notes. Its lowest note is above its highest."

  It is a polite live region, so a keyboard player stepping a note into a refused range hears why
  `Save` went unavailable; it updates in place while the span stays under 24 and leaves when the
  span reaches 24.
- **Windows.** While the range is valid, `profile-range-summary` shows the same text the
  workspace's instrument control shows for a built-in profile: the active range and its Low,
  Middle and High whole-phrase windows, derived as for the built-in profiles from the range in
  concert pitch (the written range moved by the transposition). It updates live on every step of
  either range stepper or of the transposition. It is read-only: windows are never set by hand.
- **Staff-reach note.** The workspace gives its staff systems one height, sized for the
  instrument whose written range reaches furthest above or below the staff, my instrument
  included (`screens/phrase-workspace/handoff.md`, Notation Contract). While the written range
  entered here reaches further than every built-in profile's, a `field-note` under the windows
  says what that costs, before anything is saved: "This range reaches further from the staff than
  the built-in instruments do, so the staff gets taller for every instrument, and may no longer
  fit a phone's screen." It updates live with the steppers, never blocks `Save`, and is not a
  live region (the range is still valid; the player reads it when they look).
- **Transposition.** A `note-stepper` labelled "Sounds": how a written note sounds, in semitones,
  one semitone per step, reading "{n} lower", "Same" or "{n} higher". The built-in templates give
  14 lower (B-flat tenor saxophone), 9 lower (E-flat alto saxophone) and Same (C MIDI keyboard).
  Its bound is the last value at which both range notes still sound inside the MIDI note range.
  The `field-note` under it reads "A written C4 sounds as {note}.", `{note}` being the note C4
  sounds as, spelled as above (B♭2 at 14 lower, E♭3 at 9 lower, C4 at Same), and updates on every
  step. Changing the transposition never moves the written range: the steppers keep their notes,
  and the sounding range, the windows and the `field-note` follow.
- **Delete.** Editing only: `sheet-actions-destructive` at the end of `sheet-body`, after every
  section, holding `btn btn-error` "Delete my instrument". It opens the delete confirmation; it
  never deletes by itself.
- **Actions.** `Save` (`btn btn-primary`), then `Cancel` (`btn`), primary first in markup, visual
  and focus order. `Save` is disabled only while the range is refused. `Cancel` discards every
  change and closes the sheet, asking nothing: nothing kept is deleted by leaving a form.
- No raw value: every visual value comes from `src/styles/theme.css`, `src/styles/components.css`
  and `ui_ux/token-source-v3.md` through the classes above.

## What Save Does

- **Creating.** My instrument is saved and selected: the instrument control gains its fourth
  segment, labelled with the name, checked; `instrument-actions` reads `Edit my instrument`. The
  phrase is replaced as on any instrument switch (see `screens/phrase-workspace/handoff.md`): a
  fresh seed, the written key, collection and every other control kept; with no phrase shown, only
  the selection changes; under an unsupported rhythm combination the phrase clears.
- **Editing, my instrument selected, range or transposition changed.** Saved, and the phrase is
  replaced as on an instrument switch.
- **Editing, only the name changed, or my instrument not selected.** Saved; the fourth segment's
  label follows the name; the phrase is not touched and the selection does not change.
- **Editing, nothing changed.** The sheet just closes.
- **While the review shows.** The same rules apply to the phrase under the review, the one the
  staff gets for the next session; the review itself is not touched.
- **While a phrase is being generated** (a window change can start one behind the open sheet):
  the save happens at once, and its effect on the selection and the phrase is applied when that
  generation ends, as an instrument switch made at that moment would be.
- Nothing confirms a save. A save the browser refuses is told by the workspace's notice row after
  the sheet closes (`flows/saved-data/`); the instrument still applies for the visit. The first
  save of my instrument also asks the browser to protect the app's data; nothing shows that
  request.
- The sheet closes after `Save`.

## Focus and Keyboard

- **On open:** Creating, focus goes to the template's checked segment; Editing, to the name
  `text-input`.
- **Order:** `sheet-close`, the template (one tab stop, arrow keys moving between segments as in
  every `segmented-control`), the name, the lowest note, the highest note, the transposition,
  `Delete my instrument` (Editing), `Save`, `Cancel`. Focus is trapped in `sheet`.
- **`note-stepper`:** the existing stepper's keyboard model, exactly as the workspace's tempo
  stepper: one tab stop on the `role="spinbutton"` element; Up and Right one semitone up, Down and
  Left one semitone down; Home and End to the stepper's own bounds; its `stepper-button`s take no
  tab stop. Accessible names "Lowest note", "Highest note" and "Sounds"; `aria-valuetext` the
  note with its octave ("C4"), or the transposition in full ("14 semitones lower", "Same pitch",
  "9 semitones higher"). Button labels: "Lowest note one semitone down", "Lowest note one semitone
  up", and the same for "Highest note"; "One semitone lower" and "One semitone higher" for the
  transposition.
- **Enter in the name field** does what `Save` does when it is enabled, and nothing otherwise.
- **Escape, the backdrop and `Close`** in the form do what `Cancel` does.
- **On close** after `Save` or `Cancel`, focus goes to the `instrument-actions` button, which is
  always there between sessions (its label may have changed). After a delete it goes to the same
  button, which then reads `Create my instrument`.
- **Delete confirmation:** focus goes to `Cancel` when it opens, never to the deleting action.
  `Cancel`, Escape, the backdrop and `Close` are the way back: they return to the form with every
  unsaved edit as it was, and focus goes back to `Delete my instrument` in
  `sheet-actions-destructive`.

## Responsive Behavior

- At `bp-mobile-landscape`: `sheet-wide` behaves as `sheet` does there, filling the inline size
  left by the backdrop's padding; `range-row` stacks the two steppers; the template's
  `segmented-control` wraps as the workspace's instrument control does; `sheet-actions` stacks
  full-width, `Save` on top; the sheet scrolls vertically inside itself, so `range-alert` may sit
  below the fold, which is why it is a live region and why `Save` carries the refusal too.
- At `bp-tablet-landscape` and `bp-desktop`: centered, up to `--sheet-wide-max-inline-size`;
  `range-row` puts the two steppers side by side; `sheet-actions` is one row aligned to the end,
  `Save` first.
- Every breakpoint gets every field and action: the phone loses nothing.

## States

- **Creating.** Opened from `Create my instrument`. Template on the selected built-in profile;
  name empty; range and transposition the template's; windows shown. `Save` enabled.
- **Editing.** Opened from `Edit my instrument`. "Made from: {template}"; the saved name, range
  and transposition; windows shown; `Delete my instrument` present. `Save` enabled.
- **Range refused** (within Creating or Editing). `range-alert` present, `profile-range-summary`
  absent, `Save` disabled; every field still editable. Leaves as soon as the span reaches 24.
- **Delete confirmation.** `sheet-title` "Delete my instrument?". Body, a first paragraph: "{name}
  will be deleted, with its range and transposition." then, only when my instrument is selected,
  "The instrument goes back to {template}, the profile it was made from."; a second paragraph:
  "This can't be undone." `sheet-actions`: `Delete my instrument` (`btn btn-error`), `Cancel`
  (`btn`), focus on `Cancel` at open. While the deletion runs, `Delete my instrument` takes
  `is-loading` and the way back does nothing. If it fails, the confirmation stays open with
  `inline-alert alert-error` "That couldn't be deleted. Try again." under the body, nothing is
  changed, and `Delete my instrument` tries again. On success: my instrument is deleted, the sheet closes, the fourth segment leaves
  the instrument control and `instrument-actions` reads `Create my instrument`; when it was
  selected, `{template}` is selected and the phrase is replaced as on an instrument switch;
  otherwise the selection and the phrase are not touched. The remembered controller is not
  touched.
- **Empty:** none. The form always holds a whole instrument, from the template or the saved one.
- **Loading:** none of its own. Saving is local and immediate; the case of a phrase being
  generated behind the sheet is under What Save Does.
- **Error:** the refused range is a notice, not an error; a save the browser refuses is told
  outside the sheet. The one error-toned line is a failed deletion, in the delete confirmation.
- **Never during a session:** `instrument-actions` is disabled for the whole session, so the
  sheet cannot open, and no session can start while it is open: no MIDI note starts one, the
  starting note included.
