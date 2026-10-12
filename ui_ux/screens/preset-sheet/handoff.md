# Preset Sheet Handoff

> **New in v3.1.**

> **Changes since v3.1**
>
> - _v3.3 changed:_ a saved preset also holds the Seventh chords level
>   ([What the Main Action Does](#what-the-main-action-does))

The one sheet in which a player preset is saved as new, saved with a new restriction, renamed or
deleted. It opens from `preset-actions` in the preset bar of `screens/phrase-workspace/`, at Idle,
in the review mode and during **Loading**, never during a session. The flow around it, and what
each action does to the selection, is `flows/presets/`.

## Layout Tree

```text
sheet-backdrop
  sheet (role="dialog" aria-modal="true" aria-labelledby="sheet-title"; the standard width)
    sheet-header
      sheet-title (id="sheet-title"; per mode, see Components and Content)
      sheet-close (btn, "Close")
    sheet-body (one of the four modes below)
      -- Save as new
        field-group (name)
          field-label (a label element for the text-input: "Name")
          text-input (maxlength="40"; prefilled, its text selected)
          inline-alert alert-notice name-alert (role="status"; present only while the name is refused)
        field-group (key and mode)
          field-label (id; names the choice-list: "Key and mode")
          field-note ("Which keys and modes this preset is meant for. Choosing it moves you inside them; nothing is ever blocked.")
          choice-list (role="radiogroup", aria-labelledby the field-label, aria-describedby the field-note)
            choice-option x2 or x3 (role="radio", aria-checked)
      -- Save changes (asking the restriction)
        p (why it asks)
        field-group (key and mode)
          field-label (id; "Key and mode")
          choice-list (role="radiogroup")
            choice-option x2
      -- Rename
        field-group (name)
          field-label ("Name")
          text-input (maxlength="40"; prefilled with the current name, its text selected)
          inline-alert alert-notice name-alert (as above)
      -- Delete confirmation
        p ("Your settings stay as they are.")
        p ("This can't be undone.")
        inline-alert alert-error (only after a deletion that failed)
    sheet-actions
      -- Save as new: btn btn-primary ("Save"), btn ("Cancel")
      -- Save changes: btn btn-primary ("Save changes"), btn ("Cancel")
      -- Rename: btn btn-primary ("Rename"), btn ("Cancel")
      -- Delete confirmation: btn btn-error ("Delete preset"), btn ("Cancel")
```

## Components and Content

- `sheet-backdrop`, `sheet`, `sheet-header`, `sheet-close`, `sheet-body` and `sheet-actions` are
  the connection sheet's own (`screens/controller-connection/handoff.md`): `--z-sheet`,
  `--color-scrim`, a centred panel at `--sheet-max-inline-size` that scrolls vertically inside
  itself, `Close` always present and enabled. No `sheet-wide`: every mode is one column.
- **Modes.** One sheet, opened in the mode its button asks for:

  | Mode                | Opened by                                                                                    | `sheet-title`                 | Body                          | Actions                   |
  | ------------------- | -------------------------------------------------------------------------------------------- | ----------------------------- | ----------------------------- | ------------------------- |
  | Save as new         | `Save as new preset`                                                                         | "Save as a new preset"        | Name, then Key and mode       | `Save`, `Cancel`          |
  | Save changes        | `Save changes`, only while the written key and collection are outside the base's restriction | "Save changes to “{name}”"    | The reason, then Key and mode | `Save changes`, `Cancel`  |
  | Rename              | `Rename preset`                                                                              | "Rename “{name}”"             | Name                          | `Rename`, `Cancel`        |
  | Delete confirmation | `Delete preset`                                                                              | "Delete the preset “{name}”?" | Two paragraphs                | `Delete preset`, `Cancel` |

  `{name}` is the preset acted on: the selected player preset, or Custom's base. In every title
  and copy, a name is shown as the player wrote it, in typographic quotes.

- **Name** (Save as new, Rename). A `text-input` with `maxlength="40"`: typing stops at 40
  characters and a paste is cut there. Save as new prefills "My preset", or "My preset 2", "My
  preset 3" and so on, the first that no preset has (ignoring case); Rename prefills the current
  name. Either way the text is selected, so typing replaces it. Spaces at both ends are removed on
  the main action, so a saved name is 1 to 40 characters.
- **`name-alert`** (`inline-alert alert-notice name-alert`, a polite live region) is present under
  the field while the name, trimmed, is refused, and the main action (`Save` or `Rename`) is
  disabled meanwhile. It is checked on every input, the prefilled value included, and says one
  reason, the first that applies:
  1. empty, or spaces only: "Give it a name."
  2. "Custom", in any letter case: "“Custom” is used by the app. Choose another name."
  3. the name of another preset, ignoring case, built-in presets included, the preset being
     renamed excepted: "There's already a preset called “{existing name}”." (`{existing name}` as
     that preset writes it).

  Never error-toned: a name taken is not a fault. It updates in place while the name stays refused
  and leaves as soon as the name is accepted.

- **Key and mode** (Save as new, Save changes). A `choice-list` radiogroup of `choice-option`s,
  one checked, the default checked at open. Each option's label is one line of plain words:

  | Mode                                                                         | Options, in order (the default first)                                     |
  | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
  | Save as new, a restriction in force with a list on one half or both          | "As now: {restriction in words}", "Only {key} {mode}", "Any key and mode" |
  | Save as new, no restriction in force, or one that is "any" on both halves    | "Any key and mode", "Only {key} {mode}"                                   |
  | Save as new, a restriction in force that is exactly the current key and mode | "Only {key} {mode}", "Any key and mode"                                   |
  | Save changes                                                                 | "Any key and mode", "Only {key} {mode}"                                   |

  `{key} {mode}` are the current Written key and Collection, in those controls' own labels
  ("G Dorian", "F-sharp/G-flat Mixolydian"). **{restriction in words}** is: for a list of modes in
  any key, "{modes} in any key" ("Mixolydian or Dorian in any key", "Major in any key"); for a list
  of keys in any mode, "{keys} in any mode"; for lists on both halves, "{keys}, in {modes}"; for
  one key and one mode, "only {key} {mode}". Lists read "A, B or C". The same words describe a
  player preset under the preset box (`screens/phrase-workspace/handoff.md`, **The preset bar**).

- **The reason** (Save changes only), one `p`: "Your key and mode, {key} {mode}, are outside what
  “{name}” is meant for: {its restriction in words}. Choose what it is meant for from now on."
- **Main action.** `Save` (Save as new), `Save changes` or `Rename`, `btn btn-primary`, then
  `Cancel` (`btn`), primary first in markup, visual and focus order. The main action is disabled
  only while `name-alert` shows. `Cancel` closes the sheet, asking nothing and saving nothing.
- **Delete confirmation** follows the shared confirmation pattern
  (`flows/kept-sessions/handoff.md`, The Confirmation Pattern): a first `p`, "Your settings stay
  as they are.", a second, "This can't be undone.", then `Delete preset` (`btn btn-error`) and
  `Cancel` (`btn`). While the deletion runs, `Delete preset` takes `is-loading` and the way back
  does nothing. If it fails, the confirmation stays open with `inline-alert alert-error`, "That
  couldn't be deleted. Try again.", under the paragraphs; nothing changes, and `Delete preset`
  tries again, the line leaving as it starts.
- No raw value: every visual value comes from `src/styles/theme.css`, `src/styles/components.css`,
  `ui_ux/token-source-v3.md` and `ui_ux/token-source-v3.1-v3.2.md` through the classes above.

## What the Main Action Does

- **Save** saves the current preset-held settings (the ten controls and the seven figure levels)
  as a new player preset, under the trimmed name, with the restriction chosen ("As now" being the
  restriction in force, or "any" with none), and makes it the selection: the box shows its name,
  in the **Your presets** group of the list. The sheet closes.
- **[v3.3 changed]** The preset-held settings that **Save** and **Save changes** store include the
  Seventh chords level, by value; the sheet asks nothing new about it.
- **Save changes** replaces the base's values with the current preset-held settings and its
  restriction with the one chosen, and makes it the selection. The sheet closes.
- **Rename** gives the preset the trimmed name. It stays the selection, or Custom's base; the box,
  the list (in its new alphabetical place), the description line and `control-summary` follow. With
  the name unchanged, letter case included, the sheet only closes.
- None of the three moves a setting, the written key or the collection, and none regenerates the
  phrase. A save the browser refuses is told by the workspace's notice row once the sheet has
  closed, in its preset wording (or its storage-full wording when storage is full); the result still applies for the visit (`flows/presets/handoff.md`,
  A refused save). While saving is off, the result lasts for the page, with no wording of its own.
- **While a phrase is being generated** behind the sheet (a window change can start one), the main
  action works at once: saving changes no setting.

## Focus and Keyboard

- **On open:** Save as new and Rename, focus goes to the name `text-input`, its text selected;
  Save changes, to the checked `choice-option`; the delete confirmation, to `Cancel`, never to the
  deleting action.
- **Order:** `sheet-close`, then the name field, the `choice-list` (one tab stop: the checked
  option), the main action, `Cancel`. Focus is trapped in `sheet`.
- **`choice-list`:** a roving tab stop as in every `segmented-control`: Up and Left move to the
  previous option, Down and Right to the next, each move checking and focusing its destination;
  Space checks the focused option.
- **Enter** in the name field does what the main action does when it is enabled, and nothing
  otherwise. Enter on a focused `choice-option` does nothing more than check it.
- **Escape, the backdrop and `Close`** do what `Cancel` does, in every mode; while a deletion runs
  they do nothing.
- **On close:** focus returns to the `preset-actions` button that opened the sheet if it is still
  shown and enabled, else to `preset-select`. So after `Cancel` or a rename, the opener; after a
  saved new preset, `Save as new preset`, unless that save reached the limit of 50 and disabled it;
  after `Save changes` or a deletion, `preset-select`, since the button that opened the sheet is no
  longer shown.
- **MIDI:** while the sheet is open, in any mode, no MIDI note starts a session, the starting note
  included.

## Responsive Behavior

- At `bp-mobile-landscape`: the sheet fills the inline size left by the backdrop's padding;
  `text-input` takes the full width up to `--text-input-max-inline-size`; `choice-list`'s options
  take the full width, their labels wrapping when long; `sheet-actions` stacks its buttons full
  width, the main action on top; the sheet scrolls vertically inside itself, which is why
  `name-alert` is a live region and why the main action also carries the refusal by being
  disabled.
- At `bp-tablet-landscape` and `bp-desktop`: centred, up to `--sheet-max-inline-size`;
  `choice-list` options full width of the sheet body; `sheet-actions` one row aligned to the end,
  the main action first.
- Every breakpoint gets every mode, field and action: the phone loses nothing.
- Opening and closing take the sheet's own fade (`motion.md`); `name-alert` appears and leaves with
  no animation.

## States

- **Save as new.** Name prefilled and selected; Key and mode with its default checked; `Save`
  enabled.
- **Save changes.** The reason; Key and mode with "Any key and mode" checked; `Save changes`
  enabled.
- **Rename.** Name prefilled with the current name and selected; `Rename` enabled.
- **Name refused** (within Save as new or Rename). `name-alert` present with its reason; the main
  action disabled; the field and the choice still editable. Leaves as soon as the name is
  accepted.
- **Delete confirmation.** As above; **deleting** (`Delete preset` with `is-loading`, the way back
  inert); **deletion failed** (the error line, `Delete preset` enabled).
- **Empty:** none. Each mode opens filled: a prefilled name, a checked default, the preset's name
  in the title.
- **Loading:** none of its own. Saving and renaming are local and immediate; only a deletion shows
  its running state, on its button.
- **Error:** a refused name is a notice, not an error. A save or rename the browser refuses is told
  outside the sheet, after it closes. The one error-toned line is a failed deletion, inside the
  confirmation.
- **Never during a session:** `preset-actions` is disabled for the whole session, so the sheet
  cannot open, and no session can start while it is open.
