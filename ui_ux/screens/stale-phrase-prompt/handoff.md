# Out-of-Date Phrase Prompt Handoff

> **New in v3.**

> **Changes since v3.0**
>
> - _v3.1 changed:_ the named settings lose Musical profile preset and gain the seven figure
>   levels ([Components and Content](#components-and-content))
> - _v3.2 new:_ never in Jam mode ([States](#states))
> - _v3.3 changed:_ the named settings gain Seventh chords
>   ([Components and Content](#components-and-content))

The sheet that opens at Start, or at the starting note, when phrase 1, the phrase on screen in
**Ready**, was generated under settings that differ from the current ones (master spec §16). It
opens over `screens/phrase-workspace/`, which stays in **Ready** under it. When it opens, what
each answer does and what it closes on are in `flows/play-session/handoff.md` (A phrase made
before the settings changed).

## Layout Tree

```text
sheet-backdrop
  sheet (role="alertdialog" aria-modal="true" aria-labelledby="sheet-title" aria-describedby="sheet-body"; the standard width)
    sheet-header
      sheet-title (id="sheet-title"; "This phrase is from before your changes")
      sheet-close (btn, "Close")
    sheet-body (id="sheet-body")
      p (only when the starting note opened it: "Your note didn't start the session. Nothing you play will until you choose.")
      p ("Since it was made, you changed {changed settings}.")
      p ("Regenerate phrase makes a new phrase with your current settings. Start with this phrase plays this one first; the phrases after it use your current settings.")
      sheet-hint (only when the starting note opened it: "A new phrase may start on a different note: the line above the staff names it.")
    sheet-actions
      btn btn-primary ("Regenerate phrase")
      btn ("Start with this phrase")
```

## Components and Content

- `sheet-backdrop`, `sheet`, `sheet-header`, `sheet-title`, `sheet-close`, `sheet-body`,
  `sheet-hint` and `sheet-actions` are the connection sheet's own
  (`screens/controller-connection/handoff.md`): `--z-sheet`, `--color-scrim`, a centred panel at
  `--sheet-max-inline-size` that scrolls vertically inside itself, `Close` always present and
  enabled. No `sheet-wide`. No new token or class.
- **`role="alertdialog"`**, not the confirmations' `dialog`: it interrupts a start the player
  asked for, and `aria-describedby` makes a screen reader read the body with the title on open.
- **{changed settings}** names every setting whose value differs from phrase 1's, by the visible
  `field-label` of its control in `control-section`, as written there, in the order the controls
  appear on the page: Written key, Collection, Instrument profile, Musical profile preset,
  Harmonic motion, Tension, Note density, Rhythmic variety, Syncopation, Silence density, Contour,
  Register, Leapiness, Arpeggio chaos.
  - One: "Written key". Two: "Written key and Register". Three: "Written key, Register and
    Leapiness". Four or more: the first two and the count of the rest, "Written key, Register
    and {n} other settings" ({n} is 2 or more).
  - **[v3.1 changed]** From v3.1 the list has no Musical profile preset, the field being gone,
    and gains the seven figure levels after Arpeggio chaos, by their labels: Passing tone,
    Accented passing tone, Neighbor tone, Appoggiatura, Diatonic enclosure, Chromatic approach,
    Chromatic enclosure. The preset selection itself is never named: a preset counts through the
    values it set.
  - **[v3.3 changed]** Seventh chords counts too, named after Harmonic motion.
  - Musical profile preset counts when Neutral or Jazz differs; its customized mark alone never
    counts. Note density counts by the value the player chose, never the one a narrow window
    gives. The tempo, the session options, the audio mix, the theme, and my instrument's clef and
    name never count and are never named.
  - Instrument profile is named when the instrument differs (its id, or my instrument's range or
    transposition); in practice it never does, since those changes replace the phrase.
  - The list is computed when the prompt opens and does not change while it shows: nothing behind
    it can change a setting.
- **The answers.** `Regenerate phrase` (`btn btn-primary`), then `Start with this phrase`
  (`btn`), in markup, visual and focus order. Neither is error-toned: neither deletes anything.
  `Regenerate phrase` has the header phrase action's label, since it is that action.
- No raw value: every visual value comes from `src/styles/theme.css` and
  `src/styles/components.css` through the classes above.

## What Each Answer Does

- **`Regenerate phrase`** closes the prompt and runs the Idle Regenerate exactly, as the header's
  `Regenerate phrase` does: the workspace takes **Loading**, then **Ready** with a new phrase, or
  the ordinary generation-failure states. Nothing starts.
- **`Start with this phrase`** closes the prompt and is the start click: the session starts from
  phrase 1 as on screen (`flows/play-session/handoff.md`). If a start condition no longer holds at
  that moment, nothing starts and the prompt closes.
- **`Close`, Escape, a press on the backdrop** close it, changing nothing and starting nothing.
- **Closing by itself.** If the workspace leaves **Ready** while it shows (a window change leaves
  the staff no room, makes phrase 1 too wide and regenerates it, or brings `orientation-notice`),
  it closes as if dismissed.

## Focus and Keyboard

- **On open:** focus goes to `Regenerate phrase`, whichever start opened it. It starts no sound
  and deletes nothing, so Enter on it is always safe; it is also the recommended answer.
- **Opening** closes the `Volume` popover if it is open.
- **Order:** `sheet-close`, `Regenerate phrase`, `Start with this phrase`. Focus is trapped in
  `sheet`. Enter and Space press the focused button; there is no other shortcut.
- **On close:** after `Start with this phrase`, focus is on the session action, now `Stop`, as
  after a Start click. After `Regenerate phrase`, on the phrase action, as after a press on it in
  the header; no focus move when the new phrase lands. After a dismissal, or closing by itself,
  the connection sheet's rule: the session action if enabled, else the phrase action if enabled,
  else `controller-status`.
- **MIDI:** while it shows, no note starts anything, the starting note included, and
  `start-note-line` is hidden as for any open sheet.
- **Announcements:** none of its own beyond the dialog's name and description on open;
  `generation-status` announces a regeneration as usual.
- `:focus-visible` rings on the three buttons are `.btn`'s.

## Responsive Behavior

- At `bp-mobile-landscape`: the sheet fills the inline size left by the backdrop's padding;
  `sheet-actions` stacks both buttons full width, `Regenerate phrase` on top; the paragraphs wrap,
  and the sheet scrolls vertically inside itself on a short screen.
- At `bp-tablet-landscape` and `bp-desktop`: centred, up to `--sheet-max-inline-size`;
  `sheet-actions` one row aligned to the end, `Regenerate phrase` first.
- Every breakpoint gets the same title, paragraphs and answers.
- It opens and closes with the sheets' opacity transition (`motion.md`), and with none under
  `prefers-reduced-motion`.

## States

- **Opened by Start:** the title, the changed settings, the answers' sentence.
- **Opened by the starting note:** the same, with the note's paragraph first and the hint last.
- **Empty, loading, error:** none of its own. It opens filled; `Regenerate phrase` closes it before
  the generation's **Loading** begins, and a failed regeneration is told by the workspace's
  ordinary generation-failure banner.
- **Never during a session, never in the review mode, never over another sheet.** The session
  action reads `Close review` while the review shows and no note starts anything then, and no
  start is possible while another sheet is open.
- **[v3.2 new]** **Never in Jam mode.** `Start Jam` and the home note never open it: a fresh Jam
  has no phrase 1 on screen, and a held doodle is let go by any change of a setting phrases are
  made from, so its phrase 1 is never out of date.
