# Controller Connection Handoff

> **Changes since v2**
>
> - _New:_ the **Use for my instrument** confirmation and its actions ([Layout Tree](#layout-tree),
>   [Named actions](#named-actions), [Focus Management](#focus-management), [States](#states))
> - _New:_ the check's copy when my instrument is selected, and the confirmation's copy
>   ([Check result copy](#check-result-copy))
> - _New:_ the device being checked unplugged during the confirmation
>   ([Device changes while the sheet is open](#device-changes-while-the-sheet-is-open))
> - _Changed:_ a result that is not a match adds `Use this for my instrument`; **Requesting
>   access** goes straight to **Connected** for the remembered controller; **Connected** gains its
>   two optional lines; `Disconnect` also forgets the remembered controller; the check note comes
>   from my instrument's range when it is selected ([States](#states),
>   [Named actions](#named-actions), [Components and Content](#components-and-content))
> - _New:_ the check note drawn in my instrument's clef when it is selected; the confirmation's
>   interval name, its warning that my instrument's sessions go, with how many, and its absence
>   in a tab that must be reloaded ([Components and Content](#components-and-content),
>   [Named actions](#named-actions), [States](#states), [Check result copy](#check-result-copy))
> - _Removed:_ "Layout and actions are identical for every result; only the text differs." (v2 in
>   the [frozen copy](../../versions/v2/screens/controller-connection/handoff.md#states))

## Layout Tree

```text
sheet-backdrop
  sheet (role="dialog" aria-modal="true" aria-labelledby="sheet-title")
    sheet-header
      sheet-title (id="sheet-title")
      sheet-close (btn, "Close")
    sheet-body (exactly one per-state block below at a time)
      inline-alert alert-notice (device-change line; only when a state was reached because a device was unplugged -- see Device changes while the sheet is open)
      -- Requesting access (Checking, or Waiting for your browser)
      -- Unsupported browser
      -- Permission denied
      -- No device found
      -- Multi-device picker
        device-picker (role="group" aria-labelledby the picker's instruction line)
          device-option (button, one per input)
      -- Transposition check
        check-note (the engraved written note)
        prompt text, or exactly one result inline-alert alert-notice
      -- Use for my instrument (v3 new; a confirmation in the sheet's own place, see States)
        paragraphs stating the change
        when my instrument has sessions: the erase paragraphs and sheet-hint, and inline-alert alert-error after a failed save (v3 new)
      -- Connected
        status line ("{device name} is connected.")
        one optional line (v3 new): "{name} now matches your controller.", or the remembered-controller sheet-hint
    sheet-actions (state-specific buttons, primary first -- see States)
```

## Components and Content

- `sheet-backdrop` covers the viewport at `--z-sheet` and dims the workspace with `--color-scrim`
  in both themes. `sheet` shares that layer. A backdrop click is a dismiss action, identical in
  effect to Escape or `sheet-close`.
- `sheet` is a centered panel, not a bottom sheet: the product is landscape-only below
  `bp-desktop`, so there is no portrait thumb-reach case. It is capped at
  `--sheet-max-inline-size` and scrolls vertically inside itself when its content is taller than
  the viewport.
- `sheet-title` names the current state in plain language and changes on every state change.
  `sheet-close` is a `btn` labeled `Close`, always present and always enabled.
- `sheet-body` holds the state's copy as plain paragraphs, plus at most one `inline-alert` of the
  state's own; a state reached because a device was unplugged also shows the device-change line,
  a second `inline-alert alert-notice`, above it (see Device changes while the sheet is open).
  Consecutive paragraphs inside an `inline-alert`, such as a check result's sentence, suggestion
  and profile line, are spaced by the stylesheet, not by the markup. Secondary one-line hints use
  `sheet-hint`.
- **[v3 changed]** `check-note` shows the one written note on a short staff, engraved by the same
  notation pipeline as the score (the current instrument profile's clef and written pitch,
  `--font-music`, `--color-staff`), never as a letter name in text. The built-in profiles are in
  treble clef.
- **[v3 new]** "The current instrument profile" includes my instrument: when it is selected, the
  check note is a written note from its range, in its written pitch and on a staff in its clef,
  treble or bass, and the result compares against its transposition.
- `device-picker` is a group of `device-option` buttons, one per input the browser currently
  reports, labeled with the device's name, in the order the browser reports them; a device plugged
  in while the list is showing is appended at the end. Keyboard: one roving tab stop — the first
  option (or the option marked in use) is `tabindex="0"`, the others `tabindex="-1"`. Up and Left
  move focus to the previous option, Down and Right to the next; arrow keys only move focus and
  never choose. Enter, Space, or a click chooses the focused option and immediately advances to
  **Transposition check** for that device; there is no separate confirm action. When the picker is
  reached from **Connected** through `Choose a different device`, the device currently in use
  carries `is-selected` and the visible words "(in use)" after its name; choosing it again re-runs
  the check for it.
- The dialog is named by `sheet-title`. There is no hidden live region: every state is conveyed by
  its visible title and body.
- Every action in `sheet-actions` is a `btn`. The state's primary action uses `btn btn-primary`;
  every other action uses plain `btn`. The primary action comes first in the markup, and visual
  order matches markup and focus order at every breakpoint. No action uses `btn-error`.
- Tone: every state uses neutral styling (`alert-notice`, `status-dot is-neutral` or
  `is-success`), except **Permission denied**, which uses `inline-alert alert-error` because it is
  a blocked browser setting. Words always carry the state; colour never does alone.

## Named actions

- `Continue without a controller` — closes the sheet. On **Unsupported browser**, **Permission
  denied**, **No device found**, and **Multi-device picker** only.
- `Check again` — on **Permission denied**; re-requests MIDI access and returns to **Requesting
  access**.
- `Try again` — on **No device found**; returns to **Requesting access**.
- `Continue` — on a check result; advances to **Connected**.
- **[v3 new]** `Use this for my instrument` — on a check result that is not a match, after
  `Continue`; opens **Use for my instrument**. Absent on a match, absent in the one case where
  the instrument it would make would sound outside the MIDI note range (see the flow handoff),
  and absent in a tab that must be reloaded while my instrument has kept sessions (see States).
- **[v3 new]** `Use for my instrument` — on **Use for my instrument**; saves and selects my
  instrument with the new transposition (creating it first if there is none) and advances to
  **Connected**. When my instrument has sessions it reads `Use and erase` (`btn btn-error`) and
  also erases them, with the save.
- **[v3 new]** `Back` — on **Use for my instrument**; returns to the check result, nothing changed.
- `Run check again` — on a check result and on **Connected**; returns to the check's *Prompt*
  sub-state for the same device, with no permission request or device resolution.
- `Choose a different device` — on **Connected**, only when more than one input has been seen this
  page session; opens **Multi-device picker**.
- **[v3 changed]** `Disconnect` — on **Connected**; releases the device, forgets it as the
  remembered controller, closes the sheet, and sets the header `controller-status` to the
  no-controller badge.
- `Done` — on **Connected**; closes the sheet, keeping the connection.
- **[v3 changed]** `Close` (`sheet-close`), Escape, backdrop click — close the sheet from any
  state but **Use for my instrument**, where they do what `Back` does.

## Focus Management

- On open and on every state change, focus moves to the new state's main action, named per state
  below. States with no labeled action send focus to `sheet-close`.
- **[v3 new]** On **Use for my instrument**, focus goes to `Back`, never to `Use for my
  instrument`. Returning to the result by `Back`, Escape, the backdrop or `Close` puts focus on
  `Use this for my instrument`. After `Use for my instrument`, **Connected** takes focus on
  `Done`, its main action.
- While the sheet is open, focus is trapped in `sheet`: Tab and Shift+Tab cycle through
  `sheet-close`, any `sheet-body` control, and the `sheet-actions` buttons.
- On close, by any path, focus moves to the first enabled of, in order: the workspace's session
  action; the phrase action (when `Start session` is disabled: an empty workspace, a
  generation-failure banner showing, a notation error); `controller-status`, the element that
  opened the sheet (when both header actions are disabled: **Loading**, or an unsupported rhythm
  combination), which is always interactive outside a session. That order is also the fallback
  whenever a focus target outside the sheet is unclear.

## States

- **[v3 changed]** **Requesting access** — two sub-states, both resolving on their own into
  **Unsupported browser**, **Permission denied**, **No device found**, **Connected** (the
  remembered controller among the inputs, however many there are), **Transposition check**
  (otherwise, exactly one input), or **Multi-device picker** (otherwise, two or more). No labeled action; focus on `sheet-close`.
  - *Checking:* shown while the request resolves without a browser prompt. `sheet-title`
    "Connecting…"; body "Looking for your controller…".
  - *Waiting for your browser:* shown while the browser's own permission prompt is waiting for an
    answer (MIDI permission was not yet decided when the request was made). `sheet-title` "Allow
    MIDI access"; body "Your browser is asking whether this page may use MIDI devices. Choose Allow
    in its prompt, near the address bar." plus `sheet-hint` "You can also close this and practice
    without a controller." Closing the sheet here abandons the attempt (see the flow handoff for
    what a late answer does).
- **Unsupported browser** — `sheet-title` "Controller connection isn't available here". Body
  "This browser can't see MIDI controllers. Practicing without one works exactly the same." plus
  `sheet-hint` "To use a controller, open Infinite Flow in a Chromium-based browser such as Chrome
  or Edge." No `status-dot`. `sheet-actions`: `Continue without a controller` (`btn btn-primary`),
  the main action. No retry.
- **Permission denied** — `sheet-title` "MIDI access is blocked". Body: `inline-alert alert-error`
  reading "Your browser has blocked MIDI devices for this page, so the app can't ask again by
  itself.", then the paragraph "To allow it: click the site-settings icon at the left of the
  address bar, set MIDI devices to Allow, then choose Check again." `sheet-actions`: `Check again`
  (`btn btn-primary`, main action), `Continue without a controller` (`btn`). The header
  `controller-status` shows the MIDI-blocked badge from the moment this state is reached.
- **No device found** — `sheet-title` "No controller found". Body: `inline-alert alert-notice`
  reading "No MIDI controller is plugged in. Plug one in and switch it on, or continue without
  one." `sheet-actions`: `Try again` (`btn btn-primary`, main action), `Continue without a
  controller` (`btn`). While this state shows, a device being plugged in moves the sheet on by
  itself, exactly as `Try again` would.
- **Multi-device picker** — `sheet-title` "Choose a controller". Body: the line "Several MIDI
  devices are plugged in. Choose the one you play." then `device-picker`. `sheet-actions`:
  `Continue without a controller` (`btn`). Main action: the `device-option` holding the roving tab
  stop.
- **Transposition check** — `sheet-title` "Check your controller". From the moment this state is
  entered, the chosen device counts as connected and the header shows the connected badge.
  - *Prompt:* `check-note` shows one written note from the current instrument profile's range.
    Body "Play this note on your controller." plus `sheet-hint` "Playing it here won't start a
    session." No labeled action; focus on `sheet-close`. The first note-on with non-zero velocity
    from the chosen input is the played note; any other input is ignored.
  - **[v3 changed]** *Result:* `check-note` stays; below it one `inline-alert alert-notice` with
    a result sentence and its suggestion (see Check result copy). `sheet-actions` on a match:
    `Continue` (`btn btn-primary`, main action), `Run check again` (`btn`). On every other
    result: `Continue` (`btn btn-primary`, main action), `Use this for my instrument` (`btn`),
    `Run check again` (`btn`). The layout is the same for every result; only the text and that
    one action differ.
- **[v3 new]** **Use for my instrument** — a confirmation in the sheet's own place, from a check
  result. `check-note` and the result leave; the header keeps the connected badge. `sheet-title`
  "Use this for my instrument?". Body, plain paragraphs:
  - "{interval}: a written C4 will sound as {note}.", `{interval}` and `{note}` being, under the
    new transposition, the interval's name with its direction and the note a written C4 sounds
    as, worded and spelled as in `screens/my-instrument/handoff.md` (Transposition): "No
    transposition: a written C4 will sound as C4.", "A major ninth lower (an octave and a major
    second): a written C4 will sound as B♭2."
  - With no my instrument yet: "My instrument will be made from the {profile} profile, named My
    instrument, in treble clef, with that profile's range: {low} to {high} in written notes."
    then `sheet-hint` "You can change it later with Edit my instrument."
  - With my instrument, not selected: "{name} keeps its range, {low} to {high} in written notes,
    and its clef, and becomes the selected instrument."
  - With my instrument selected: "{name} keeps its range, {low} to {high} in written notes, and
    its clef."
  - When my instrument has sessions ({N} of 1 or more, counted as in
    `screens/my-instrument/handoff.md`, The sessions of my instrument), after the paragraph
    above: "Changing the transposition erases the {N} sessions played with {name}, with their
    favorite phrases, comments and played notes." ({N} of 1: "Changing the transposition erases
    the session played with {name}, with its favorite phrases, comment and played notes."), then,
    only when the review on screen shows one of them, the my-instrument sheet's sentence saying
    its review closes; a paragraph "This can't be undone."; and the `sheet-hint` "To keep a
    session, choose Back, close this sheet, then export it from its review." ({N} of 1: "To keep
    it, choose Back, close this sheet, then export it from its review.").

  `sheet-actions`: `Use for my instrument` (`btn btn-primary`), or `Use and erase` (`btn
  btn-error`) when my instrument has sessions, then `Back` (`btn`). Focus on `Back`. No MIDI note
  does anything here. With sessions to erase, the confirming action takes `is-loading` while it
  runs and the way back does nothing; the save and the erasing happen together or not at all, and
  if they fail the confirmation stays with `inline-alert alert-error` "That couldn't be saved, and
  nothing was erased. Try again." under the body, the action trying again. On success the sessions
  go as in `screens/my-instrument/handoff.md` (States, Sessions erased), the review mode behind
  the sheet included, and the sheet goes to **Connected**.
- **[v3 new]** **In a tab that must be reloaded** (an outdated tab), while my instrument has kept
  sessions: a result that is not a match has no `Use this for my instrument`, and its result
  `inline-alert` adds, after its sentences, the paragraph "To use this for {name}, reload the page
  first: changing its transposition would erase the sessions played with it." Its other actions
  are unchanged. When the tab becomes outdated while **Use for my instrument** shows with sessions
  to erase, it returns to the result, erasing nothing, focus on `Continue`.
- **[v3 changed]** **Connected** — `sheet-title` "Controller connected". Body: `status-dot
  is-success` followed by "{device name} is connected.", then at most one more line: after
  `Use for my instrument`, the paragraph "{name} now matches your controller."; when reached
  straight from **Requesting access** for the remembered controller, the `sheet-hint` "This is the
  controller you chose last time. Run the check again if you have changed its settings." Either
  line leaves at the next state change. `sheet-actions`: `Done` (`btn btn-primary`, main action), `Run
  check again` (`btn`), `Choose a different device` (`btn`, conditional, see Named actions),
  `Disconnect` (`btn`).

## Check result copy

Let the current profile be one of `C MIDI keyboard`, `B-flat tenor saxophone`, `E-flat alto
saxophone`, and let *d* be the played concert pitch minus the expected concert pitch, in semitones
(positive: the controller sounds higher). Direction words: *d* > 0 → "higher", and the suggestion
turns it "lower"; *d* < 0 → "lower", and the suggestion turns it "higher".

- **Distance wording.** |*d*| below 12: "{|*d*|} semitone(s)". |*d*| of 12 or more and not a
  multiple of 12: "{|*d*|} semitones ({octaves} octave(s) and {remainder} semitone(s))". A
  multiple of 12: "{|*d*|/12} octave(s)". Singular for 1: "1 semitone", "1 octave".
- **Match** (*d* = 0): "Your controller matches the {profile} profile." / "Nothing to change —
  you're ready to play."
- **Whole octaves** (*d* a non-zero multiple of 12): "Your controller sounds {distance}
  {direction} than the {profile} profile expects." / "Change your controller's octave setting so
  it plays {distance} {opposite direction}, then run the check again." No profile suggestion.
- **Semitones** (any other *d*): "Your controller sounds {distance} {direction} than the {profile}
  profile expects." / "Change your controller's transpose setting so it plays {distance} {opposite
  direction}, then run the check again." Then, only when another profile would match, a second
  line: "If you actually play the {other profile}, choose the {other profile} instrument profile
  instead — no controller change needed."
- **When another profile matches.** Profile transpositions are 0 (C MIDI keyboard), 14 (B-flat
  tenor saxophone), and 9 (E-flat alto saxophone) semitones from concert to written pitch. Another
  profile matches when its transposition equals the current profile's transposition minus *d*.
  The complete set:

  | Current profile | *d* | Suggested profile |
  | --- | --- | --- |
  | B-flat tenor saxophone | +14 | C MIDI keyboard |
  | B-flat tenor saxophone | +5 | E-flat alto saxophone |
  | E-flat alto saxophone | +9 | C MIDI keyboard |
  | E-flat alto saxophone | −5 | B-flat tenor saxophone |
  | C MIDI keyboard | −14 | B-flat tenor saxophone |
  | C MIDI keyboard | −9 | E-flat alto saxophone |

- **Worked example.** B-flat tenor saxophone profile, controller sending the written note
  untransposed (*d* = +14): "Your controller sounds 14 semitones (1 octave and 2 semitones)
  higher than the B-flat tenor saxophone profile expects." / "Change your controller's transpose
  setting so it plays 14 semitones (1 octave and 2 semitones) lower, then run the check again." /
  "If you actually play the C MIDI keyboard, choose the C MIDI keyboard instrument profile instead
  — no controller change needed."

- **[v3 new]** **My instrument selected.** Wherever the copy above names "the {profile} profile",
  it reads "your instrument, {name}," instead: "Your controller matches your instrument, {name}."
  / "Your controller sounds {distance} {direction} than your instrument, {name}, expects." Every
  other sentence is unchanged. The profile suggestion then considers the three built-in profiles:
  with my instrument's transposition expressed as above (semitones from concert to written
  pitch, so 14 for a part that sounds 14 lower), a built-in profile matches when its
  transposition equals my instrument's minus *d*. My instrument is never the suggested profile.
- **[v3 new]** **Worked example, using the result.** No my instrument yet, B-flat tenor saxophone profile, a
  controller sending the written note untransposed (*d* = +14): the result reads as in the worked
  example above, with `Use this for my instrument` after `Continue`. The confirmation reads "No
  transposition: a written C4 will sound as C4." / "My instrument will be made from the B-flat
  tenor saxophone profile, named My instrument, in treble clef, with that profile's range: C4 to
  C6 in written notes." After
  `Use for my instrument`, **Connected** reads "My instrument now matches your controller.", and
  the instrument control shows My instrument selected.

## Device changes while the sheet is open

The sheet follows the inputs the browser currently reports.

- **Requesting access, Unsupported browser, Permission denied:** device changes have no effect; the
  inputs present when access is granted are the ones resolved.

The next two rules apply to devices new to the sheet; the device that was just unplugged coming
back follows its own rule, further down.

- **No device found:** a device plugged in resolves again as `Try again` would — one input present
  → **Transposition check**; two or more → **Multi-device picker**.
- **Multi-device picker:** a device plugged in is appended to `device-picker`. An unplugged device
  is removed; if it held focus, focus moves to the next option, or the previous one when it was
  last. If the list is left with one option, the picker stays (the player chooses it). If none are
  left → **No device found**.
- **Transposition check or Connected, the chosen device unplugged:** the connection ends and the
  header shows the no-controller badge. With other inputs present → **Multi-device picker**; with
  none → **No device found**. Either state then opens with the device-change line,
  `inline-alert alert-notice` reading "{device name} was unplugged.", above its own body. The sheet
  never switches to a different device by itself.
- **[v3 new]** **Use for my instrument, the chosen device unplugged:** handled as during the
  check: the connection ends, nothing is saved, and the sheet goes to **Multi-device picker** or
  **No device found** with the device-change line. Plugged back in, the device returns to the
  check's *Prompt*, as a device unplugged mid-check does.
- **The unplugged device plugged back in while the sheet is still open:** if it had already
  reached **Connected**, it reattaches with no new check and the sheet returns to **Connected**;
  if it was unplugged during the **Transposition check**, the check starts again for it. Either
  way the device-change line is removed. Closing the sheet without choosing another device keeps
  the unplugged device as the selected controller, so plugging it back in later reattaches it by
  itself.
- **Transposition check or Connected, another device plugged in or unplugged:** no visible change,
  except that `Choose a different device` appears on **Connected** once a second input has been
  seen.

## Responsive Behavior

- At `bp-mobile-landscape`: `sheet` fills the inline size left by the backdrop's padding, up to
  `--sheet-max-inline-size`; `sheet-actions` stacks its buttons full-width, primary on top.
- At `bp-tablet-landscape` and `bp-desktop`: `sheet` stays centered at up to
  `--sheet-max-inline-size`; `sheet-actions` lays its buttons out in one row, aligned to the end,
  primary first. When they don't fit the sheet's width in one row (**Connected** with all four
  actions), they wrap onto a second row, each row aligned to the end, in the same order, so
  reading, visual and focus order still match.
- At every breakpoint: `device-picker` options stack vertically and long device names wrap within
  their option; `sheet` never scrolls horizontally, and scrolls vertically inside itself when the
  viewport is too short.
- All visual values come from the tokens and classes in `src/styles/theme.css` and
  `src/styles/components.css`; this handoff declares none of its own.

## Empty, loading, and error states

- Empty: **No device found** (and the zero-option picker case, which becomes it).
- Loading: **Requesting access**, both sub-states.
- Error: **Permission denied**, the only error-toned state. **Unsupported browser** is an
  informational notice, not an error.
- Offline: the sheet works offline; MIDI access is browser-local.
