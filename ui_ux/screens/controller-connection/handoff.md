# Controller Connection Handoff

> **New in v2.**

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
      -- Connected
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
- `sheet-body` holds the state's copy as plain paragraphs, plus at most one `inline-alert`.
  Secondary one-line hints use `sheet-hint`.
- `check-note` shows the one written note on a short staff, engraved by the same notation pipeline
  as the score (treble clef, the current instrument profile's written pitch, `--font-music`,
  `--color-staff`), never as a letter name in text.
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
- `Run check again` — on a check result and on **Connected**; returns to the check's *Prompt*
  sub-state for the same device, with no permission request or device resolution.
- `Choose a different device` — on **Connected**, only when more than one input has been seen this
  page session; opens **Multi-device picker**.
- `Disconnect` — on **Connected**; releases the device, closes the sheet, and sets the header
  `controller-status` to the no-controller badge.
- `Done` — on **Connected**; closes the sheet, keeping the connection.
- `Close` (`sheet-close`), Escape, backdrop click — close the sheet from any state.

## Focus Management

- On open and on every state change, focus moves to the new state's main action, named per state
  below. States with no labeled action send focus to `sheet-close`.
- While the sheet is open, focus is trapped in `sheet`: Tab and Shift+Tab cycle through
  `sheet-close`, any `sheet-body` control, and the `sheet-actions` buttons.
- On close, by any path, focus moves to the workspace's Start/Stop button. That is also the
  fallback whenever a focus target outside the sheet is unclear.

## States

- **Requesting access** — two sub-states, both resolving on their own into **Unsupported
  browser**, **Permission denied**, **No device found**, **Transposition check** (exactly one
  input), or **Multi-device picker** (two or more). No labeled action; focus on `sheet-close`.
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
  - *Result:* `check-note` stays; below it one `inline-alert alert-notice` with a result sentence
    and its suggestion (see Check result copy). `sheet-actions`: `Continue` (`btn btn-primary`,
    main action), `Run check again` (`btn`). Layout and actions are identical for every result;
    only the text differs.
- **Connected** — `sheet-title` "Controller connected". Body: `status-dot is-success` followed by
  "{device name} is connected." `sheet-actions`: `Done` (`btn btn-primary`, main action), `Run
  check again` (`btn`), `Choose a different device` (`btn`, conditional, see Named actions),
  `Disconnect` (`btn`).

## Check result copy

Let the current profile be one of `C MIDI keyboard`, `B-flat tenor saxophone`, `E-flat alto
saxophone`, and let *d* be the played concert pitch minus the expected concert pitch, in semitones
(positive: the controller sounds higher). Direction words: *d* > 0 → "higher", and the suggestion
turns it "lower"; *d* < 0 → "lower", and the suggestion turns it "higher".

- **Distance wording.** |*d*| below 12: "{|*d*|} semitone(s)". |*d*| of 12 or more and not a
  multiple of 12: "{|*d*|} semitones ({octaves} octave(s) and {remainder})". A multiple of 12:
  "{|*d*|/12} octave(s)". Singular for 1: "1 semitone", "1 octave".
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
  untransposed (*d* = +14): "Your controller sounds 14 semitones (1 octave and 2) higher than the
  B-flat tenor saxophone profile expects." / "Change your controller's transpose setting so it
  plays 14 semitones (1 octave and 2) lower, then run the check again." / "If you actually play
  the C MIDI keyboard, choose the C MIDI keyboard instrument profile instead — no controller change
  needed."

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
  primary first.
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
