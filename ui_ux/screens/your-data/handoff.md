# Your Data Handoff

> **New in v3.**

> **Changes since v3.0**
>
> - _v3.1 new:_ the Presets section, listing every player preset with its own `Delete`, and that
>   deletion's confirmation ([Layout Tree](#layout-tree), [Overview copy](#overview-copy),
>   [Confirmations](#confirmations), [Responsive Behavior](#responsive-behavior))
> - _v3.1 changed:_ the Presets section's `Delete` buttons join the focus order; a preset deleted
>   here returns focus to `Done` ([Focus and Keyboard](#focus-and-keyboard))
> - _v3.1 changed:_ the Settings line names the preset; Delete everything's confirmation names the
>   presets ([Overview copy](#overview-copy), [Confirmations](#confirmations))
> - _v3.1 changed:_ a visit that saves nothing hides the Presets section too ([States](#states))
> - _v3.2 new:_ Jam sessions counted with the sessions; the played-notes confirmation says the
>   written-out doodles stay ([Overview copy](#overview-copy), [Confirmations](#confirmations))

The journey around this sheet, what each deletion removes and what the page beneath shows
afterwards are in [`flows/saved-data/handoff.md`](../../flows/saved-data/handoff.md).

## Layout Tree

```text
sheet-backdrop
  sheet sheet-wide (role="dialog" aria-modal="true" aria-labelledby="sheet-title")
    sheet-header
      sheet-title (id="sheet-title"; "Your data", or the confirmation's question)
      sheet-close (btn, "Close")
    sheet-body (Overview, or one Confirmation -- never both)
      -- Overview
        p (intro)
        inline-alert alert-notice (only in a visit where saving is off -- see States)
        sheet-section (Settings)
          h3, p, p sheet-hint
        sheet-section (My instrument)
          h3, p, p sheet-hint
        sheet-section (Presets; v3.1 new)
          h3, p, p sheet-hint
          ul sheet-list (v3.1 new; only when at least one player preset is listed)
            li sheet-list-row (one per player preset, in the preset box's order)
              the preset's name (plain text)
              btn (Delete; aria-label "Delete preset {name}")
        sheet-section (Controller)
          h3, p, p sheet-hint (only when one is remembered)
        sheet-section (Sessions)
          h3, p, p sheet-hint
          btn (Delete every session; only when {n}, the sessions the list shows, is at least 1)
        sheet-section (Played notes)
          h3
          btn toggle-button (Keep my played notes; aria-pressed)
            toggle-button-state (on or off)
          p sheet-hint, p
          btn (Delete all played notes; only when some are kept)
        sheet-section (Space used)
          h3, p
        sheet-section (Protection)
          h3, p
        sheet-actions-destructive (absent in an outdated tab -- see States)
          btn btn-error (Delete everything)
      -- Confirmation (one of five; v3.1 changed: the preset's added)
        p (what goes)
        p ("This can't be undone.")
        inline-alert alert-error (only after a failed deletion)
    sheet-actions
      -- Overview: btn btn-primary (Done)
      -- Confirmation: btn btn-error (the confirming action), then btn (the way back)
```

## Components and Content

- `sheet-backdrop`, `sheet`, `sheet-header`, `sheet-close`, `sheet-body`, `sheet-hint` and
  `sheet-actions` behave as in the connection sheet (`screens/controller-connection/handoff.md`):
  same layer, scrim, centring, inner scroll, and `Close` always present and enabled. `sheet-wide`
  widens the panel to `--sheet-wide-max-inline-size`.
- `sheet-section` groups each kind of kept data under an `h3`; sections are in the order of the
  tree. Value lines are plain `p` at the sheet's body type; secondary lines are `sheet-hint`.
- No `status-dot`, no icon: every state is in words.
- Counts use the singular for 1 ("1 session", "1 favorite phrase").

### Overview copy

- **Intro:** "Everything here is kept on this device, in this browser only, for anyone who opens
  the app in it. Nothing is ever sent anywhere."
- **[v3.1 changed]** **Settings.** `p`: "The phrase controls, the preset, the instrument choice,
  the theme, the audio mix, the During a session options and the review's choices. They come back
  as you left them." `sheet-hint`: "Delete everything returns them to their defaults."
- **My instrument.** `p`: "{name}, made from the {template}." or "None." `sheet-hint`: "Change or
  delete it with Edit my instrument, in the controls." or, with none, "Make one with Create my
  instrument, in the controls."
- **[v3.1 new]** **Presets.** `p`: "{n} presets of your own." ("1 preset of your own." for one), or
  "None." `sheet-hint`: "Delete one here, or with Delete preset in the controls. Delete everything
  removes them all." (with none: "Save one with Save as new preset, in the controls."). {n} counts
  the player presets the preset box lists, more than 50 included; a record that could not be read
  is not counted and not listed, though `Delete everything` removes it.
  - Then a `ul` `sheet-list`, present when {n} is at least 1, listing every player preset the
    preset box lists, in the box's **Your presets** order (alphabetical ignoring case), more than
    50 included. Each `li` is one row: the preset's name as the player wrote it, as plain text at
    the sheet's body type, then a plain `btn` "Delete" whose accessible name is "Delete preset
    {name}". Player presets sharing a name (saved from two tabs) and a preset given a numbered
    name at load are listed as the box lists them, one row each.
    Each row is a `sheet-list-row`.
  - `Delete` opens the Preset confirmation (Confirmations, below). Deleting from here does
    exactly what `Delete preset` does in the controls (`flows/presets/handoff.md`, Deleting from
    Your data): no setting changes; when the deleted preset is the selection or Custom's base, the
    selection becomes Custom with no base, which the preset box shows once the sheet closes.
- **Controller.** `p`: "{device name}. It reconnects by itself when it's plugged in." or "None
  remembered." `sheet-hint` (only with one): "To forget it, choose Disconnect in the controller
  connection."
- **Sessions.** `p`: "{n} sessions kept: {p} pinned, {f} favorite phrases." ("none pinned", "no
  favorite phrases" for zero), or "No sessions kept yet." `sheet-hint`: "Your most recent session
  is kept until the next one is saved. Pinned sessions stay until you unpin or delete them."
  Then `Delete every session` (plain `btn`) when {n} is at least 1. Sessions this version cannot
  open (saved by a newer version) are counted. A session the session list does not show is not:
  one whose summary is damaged, or one left unlisted for the visit after the device refused to
  delete it (`flows/kept-sessions/handoff.md`, A Damaged Session). `Delete every session` deletes
  it with the others, though {n} does not count it.
  - **[v3.2 new]** Jam sessions are counted with the others, by the same words; nothing about a
    doodle is listed.
- **Played notes.** `btn toggle-button` "Keep my played notes" with `toggle-button-state` "on" /
  "off" (accessible name "Keep my played notes", `aria-pressed`). `sheet-hint`: "When this is on,
  the notes you play are kept with each session. When it's off, they're shown in the review of the
  session that just ended, then forgotten." `p`: "Kept with {n} sessions." or "None kept." Then
  `Delete all played notes` (plain `btn`) when {n} is at least 1.
- **Space used.** `p`: "About {size}", the size of what the app keeps in its database (not the
  app's offline copy of its own files), rounded: "Less than 1 KB", "About {n} KB" (whole numbers),
  "About {n.n} MB" under 10 MB, "About {n} MB" from 10 MB. While being measured: "Measuring…". If
  it can't be measured: "Couldn't be measured."
- **Protection.** `p`, one of: "Protected. The browser won't clear this data to free up space."
  or "Not protected. The browser may clear this data if the device runs short of space. Export
  what you want to be sure to keep." While being checked: "Checking…". When the browser can't say,
  the second.
- **Delete everything:** `btn btn-error` "Delete everything", shown in every state but an
  outdated tab, which deletes nothing until it is reloaded (see States). A visit started from the
  defaults after a failed read is an outdated tab too once data written by a newer version is
  known.
- **`Done`:** `btn btn-primary`, closes the sheet.

### Confirmations

The sheet's state changes in place: `sheet-title` becomes the question, the Overview's content
gives way to two paragraphs, and `sheet-actions` holds the confirming action (`btn btn-error`)
then the way back (`btn`). `Close`, Escape and a backdrop click do what the way back does: return
to the Overview, never close the sheet.

| Confirmation | Opened by | Title | First paragraph | Actions |
| --- | --- | --- | --- | --- |
| Every session | `Delete every session` | "Delete every session?" | "This deletes all {n} kept sessions, pinned ones included, with their favorite phrases, comments and played notes. Your settings, your instrument and the remembered controller stay." (one session: "This deletes the one kept session, with its favorite phrases, comment and played notes. …") | `Delete every session`, `Cancel` |
| All played notes | `Delete all played notes` | "Delete all played notes?" | "This deletes the played notes kept with {n} sessions. The sessions stay, with their favorite phrases and comments." | `Delete all played notes`, `Cancel` |
| Played notes already kept | `Keep my played notes` turned off while {n} is at least 1 (the switch is already off and saved) | "Delete the played notes already kept?" | "Your played notes won't be kept from now on. The ones already kept with {n} sessions can be deleted too; the sessions stay." | `Delete them`, `Keep them` |
| **[v3.1 new]** Preset | a preset's `Delete` in the Presets section | "Delete the preset “{name}”?" | "Your settings stay as they are." | `Delete preset`, `Cancel` |
| **[v3.1 changed]** Everything | `Delete everything` | "Delete everything?" | "This deletes everything the app keeps on this device: your settings, your presets, your instrument, the remembered controller and every kept session, with its favorite phrases, comments and played notes. The page then reloads and starts as on a first visit." | `Delete everything`, `Cancel` |

The second paragraph is always "This can't be undone."

**[v3.2 new]** When at least one of the sessions whose played notes are kept is a Jam
session, the All played notes and Played notes already kept confirmations end their first
paragraph with one more sentence: "Doodles stay as the app wrote them." Deleting played notes
keeps each Jam session's written-out doodle (`flows/saved-data/handoff.md`, Your Data).

- **While a deletion runs,** the confirming action takes `is-loading` and the way back is
  disabled; `Close`, Escape and the backdrop do nothing until it finishes.
- **[v3.1 changed]** **Success:** Everything reloads the page. The others return to the Overview
  with every count updated and the space measured again; after a preset's deletion its row is
  gone from the Presets list.
- **Failure:** the Confirmation stays, adding `inline-alert alert-error` under its paragraphs:
  "That couldn't be deleted. Try again." The confirming action tries again; the line leaves when it
  starts. Anything already deleted stays deleted, and the first paragraph's count shows what
  remains. Static, not a live region, like the review's export error.

## Focus and Keyboard

- **Openers:** the `layout-footer` button `Your data` (`screens/phrase-workspace/`), the
  `sessions-header` button `Your data` (`screens/session-list/`), and the storage-full notice's
  `Your data` (`flows/saved-data/handoff.md`, Notices). All are disabled during a session.
- **On open:** focus moves to `Done`, the main action, without scrolling: the sheet opens scrolled
  to its top.
- **[v3.1 changed]** **Trap:** Tab and Shift+Tab cycle through `Close`, the Overview's buttons in
  tree order (each preset's `Delete` in list order, `Delete every session`,
  `Keep my played notes`, `Delete all played notes`, `Delete everything`), then `Done`. In a Confirmation: `Close`, the confirming action, the way
  back. `Keep my played notes` toggles with Enter or Space and keeps focus.
- **Confirmation opened:** focus moves to the way back (`Cancel` or `Keep them`), never to the
  deleting action.
- **Back to the Overview** by the way back: focus returns to the control that opened the
  Confirmation. After a successful deletion: to that control if it is still shown
  (`Keep my played notes`), else to `Done`.
- **[v3.1 new]** **After a preset's deletion:** its `Delete` has left with its row, so focus goes
  to `Done`, by the rule above. Its way back returns focus to that row's `Delete`.
- **On close,** by `Done`, `Close`, Escape or the backdrop: focus returns to the opener. If the
  opener is no longer shown, focus goes to the first enabled of the session action, the phrase
  action, `controller-status`.
- **MIDI:** while the sheet is open, in any state, no MIDI note starts a session.

## Responsive Behavior

- At `bp-tablet-landscape` and `bp-desktop`: `sheet sheet-wide` centred, up to
  `--sheet-wide-max-inline-size`; `sheet-actions` in one row aligned to the end, as in the
  connection sheet (Confirmation: the confirming action first, then the way back).
- At `bp-mobile-landscape`: the sheet fills the inline size left by the backdrop's padding, up to
  `--sheet-wide-max-inline-size`; `sheet-actions` stacks its buttons full width, the first on top. Section buttons and
  `Delete everything` keep their own width, aligned to the inline start.
- **[v3.1 new]** At every breakpoint, a preset's row holds its name, then its `Delete` at its own
  width; a long name wraps, and when the row cannot hold both, `Delete` goes under the name, at
  the inline start.
- At every breakpoint: sections stack in one column; long names (an instrument, a device) wrap;
  the sheet scrolls vertically inside itself, never horizontally.
- Every visual value comes from the token source; this handoff
  declares none of its own. Opening and closing follow the sheet's existing fade; changing between
  the Overview and a Confirmation has no animation.

## States

- **Overview:** as above. Counts are known when the sheet opens (held since load), so the sheet
  opens at once; only the space and protection lines may read "Measuring…" and "Checking…" for a
  moment.
- **Empty** (nothing kept yet, a first visit): the Overview as above, with "None.", "None
  remembered.", "No sessions kept yet." and "None kept."; `Delete every session` and
  `Delete all played notes` absent; `Delete everything` shown.
  - **[v3.1 new]** The Presets section reads "None." with no list.
- **Saving off this visit:** an outdated tab, or a visit started from the defaults because the
  saved data couldn't be read, or not within the start-up wait. Under the intro,
  `inline-alert alert-notice`, then Space used and Protection; the other five sections are
  absent.
  - **[v3.1 new]** *Presets* is absent as well, in both visits: the sheet cannot honestly count
    what the visit could not read or may not keep. The preset box still lists, in an outdated tab,
    the player presets it could read, and in a visit started from the defaults the built-in
    presets only (`flows/saved-data/handoff.md`).
  - *Outdated tab:* "A newer version of the app saved this data, so it isn't listed here, and
    nothing can be deleted until the page is reloaded. Reload the page to see it."
    `sheet-actions-destructive` is absent: an outdated tab saves and deletes nothing and offers
    no deletion of any kind, and the reload comes first (master spec §4.3). After another tab's
    `Delete everything` the tab is outdated too and shows this form, as its notice shows the
    newer-version wording until the tab can tell the two causes apart
    (`flows/saved-data/handoff.md`, Notices).
  - *Outdated tab, in a visit started from the defaults* (the read failed or was too slow, and
    data written by a newer version is known, at load or since): "Your saved data couldn't be
    read in this visit, so it isn't listed here. A newer version of the app has also saved data
    on this device, so nothing can be deleted until the page is reloaded. Reload the page to use
    the newer version." `sheet-actions-destructive` is absent, as in any outdated tab (master spec
    §4.4).
  - *Becoming outdated while the sheet is open* (a newer version writes, a read that finished
    late reveals its data, or another tab runs `Delete everything`): the Overview takes the matching outdated form in place, losing
    `Delete everything` if it had it; an open Confirmation gives way to it, deleting nothing, and
    focus goes to `Done`. A deletion already running is not interrupted.
  - *Data couldn't be read* (failed or too slow, nothing newer known): "Your saved data couldn't
    be read in this visit, so it isn't listed here. Reload the page to try again, or delete
    everything to start afresh." `Delete everything` follows: the way out when reloading does not
    help, whether the data is unreadable or only slow to read.
- **[v3.1 changed]** **Confirmation:** one of five, above.
- **Loading:** the space and protection lines while measured; a confirming action's
  `is-loading` while its deletion runs.
- **Error:** a failed deletion's line in its Confirmation; "Couldn't be measured." for the space.
  A failed save of `Keep my played notes` is told by the workspace's save-problem notice, not
  here.
- **Offline:** the sheet works offline; everything it shows is on the device.
