# Controller Connection Handoff

## Layout Tree

```text
sheet-backdrop
  sheet (role="dialog" aria-modal="true" aria-labelledby="sheet-title")
    sheet-header
      sheet-title
      sheet-close (btn, "Close")
    sheet-body (exactly one per-state block below, at a time)
      -- Requesting access
      -- Unsupported browser
      -- Permission denied
      -- No device found
      -- Multi-device picker
        device-picker
          device-option (one per input, repeated)
      -- Transposition check
        (prompt sub-state, then exactly one of the three outcome sub-states)
      -- Connected
    sheet-actions (state-specific btn group, see States)
  connection-status (visually hidden role="status" aria-live="polite" aria-atomic="true")
```

## Components and Content

- `sheet-backdrop` covers the full viewport at `--z-sheet`, using the same stacking layer for both
  itself and `sheet` (an overlay above the workspace, distinct from `--z-alert`, which stays
  reserved for in-workspace notices like the generation-failure banner). Backdrop click is a dismiss
  action, identical in effect to Escape or `sheet-close`.
- `sheet` is a centered panel, not a bottom sheet: the product is landscape-only below
  `bp-desktop` and portrait-capable only at `bp-desktop` and above (per `phrase-workspace`'s own
  `orientation-notice` guard), so there is no thumb-reach case this design set needs to account for
  the way a portrait mobile product would. `sheet-title` names the current state in plain language
  (e.g. "Connect a controller," "Choose a controller," "Check your controller," "Controller
  connected") and changes on every state transition; `sheet-close` is always present and always
  enabled, using `btn`.
- `connection-status` is a persistent, visually hidden `role="status"` region with
  `aria-live="polite"` and `aria-atomic="true"`, the same visually-hidden mechanism as
  `phrase-workspace`'s `generation-status`/`notation-status`. It announces once per state entry:
  `Requesting controller access`, `MIDI access blocked`, `No controller found`, `Choose a
  controller`, `Play the note shown to check your controller`, one of the three check-outcome
  announcements (see Transposition check below), or `Controller connected`. It does not announce
  control navigation inside `device-picker` or the transposition check's own play prompt repeating
  itself.
- `device-picker` uses `role="radiogroup"` with an accessible group label ("Choose a controller"),
  modeled directly on `phrase-workspace`'s existing `segmented-control`/`segment` pattern: each
  `device-option` uses `role="radio"` and `aria-checked="true"`/`"false"`, exactly one is checked
  once a selection is made (none is checked on first showing the list — the same "a radiogroup may
  have no checked radio" allowance `phrase-workspace` already uses for the custom musical-profile
  state), and the group uses a roving tab stop: the checked option is `tabindex="0"` and every other
  option is `tabindex="-1"` (the first option is the tab stop before any selection is made). Up and
  Left move to the prior option, Down and Right move to the next, and each move selects and focuses
  its destination, identically to the existing pattern. Selecting a `device-option` immediately
  advances to **Transposition check** for that device; there is no separate confirm action.
- The transposition check's written note renders using the same staff-adjacent visual language as
  the rest of the product (`--font-music`, `--color-staff`) rather than plain text, since a note
  name alone ("D4") is exactly the kind of literal-notation-avoidance this product elsewhere embraces
  by engraving the actual glyph.
- Every action in `sheet-actions` uses `btn`; the state-appropriate primary action (the one that
  moves the flow forward on success) uses `btn btn-primary`, and every other action in the same
  state uses plain `btn`. No action in this screen ever uses `btn-error`.

## Named actions and copy

- `Try again` — re-attempts device resolution from **Permission denied** or **No device found**;
  returns to **Requesting access**.
- `Continue without a controller` — dismisses the sheet; appears only on **Unsupported browser**,
  **Permission denied**, **No device found**, and **Multi-device picker** (see States) since it
  stops reading as a meaningful choice once a device has already been selected.
- `Run check again` — from **Connected**, returns to **Transposition check** for the currently
  connected device, skipping permission and device resolution entirely.
- `Choose a different device` — from **Connected**, present only when more than one input has ever
  been seen this browser session; returns to **Multi-device picker**.
- `Disconnect` — from **Connected**, clears the active device and returns the header
  `controller-status` to its "No controller" badge (see `screens/phrase-workspace/handoff.md`); the
  sheet itself closes.
- `Close` (`sheet-close`) — dismisses the sheet from any state; always present and always enabled.

## Responsive Behavior

- At `bp-mobile-landscape`, `sheet` takes the majority of the available inline size with margin on
  both sides so the backdrop stays visible as a framing cue; `sheet-actions` stacks its buttons
  full-width when more than one is present.
- At `bp-tablet-landscape` and `bp-desktop`, `sheet` caps at a comfortable reading measure and stays
  centered; `sheet-actions` lays its buttons out in a single row.
- `device-picker`'s options wrap onto additional lines rather than causing `sheet` to scroll
  horizontally, at every named breakpoint.
- All visual styling and responsive dimensions use the canonical tokens and component classes in
  `src/styles/theme.css` and `src/styles/components.css`; this handoff declares no independent
  visual values.

## Focus Management

- On open, focus moves to `sheet-title` (given `tabindex="-1"` so it is programmatically focusable
  without being a normal tab stop), identically for every state the sheet can open into, including
  every re-entry case from the header badge. This announces the dialog's current purpose
  immediately without picking a different, state-dependent focus target that would need its own
  justification per state.
- While the sheet is open, focus is trapped within `sheet`: Tab and Shift+Tab cycle only through
  `sheet`'s own focusable elements (the title's own programmatic focus stop excluded from the cycle
  itself, `sheet-close`, any `sheet-body` control such as `device-picker`'s options, and
  `sheet-actions`' buttons), identically to how `phrase-workspace` traps nothing today because it has
  never needed a modal until this screen.
- On close, by any dismiss path, focus returns to the header's `controller-status` element on
  `screens/phrase-workspace/`, regardless of which state the sheet closed from.

## States

- **Requesting access:** `sheet-title` reads "Connecting…". `sheet-body` shows a single line, "Checking
  for a connected controller…", with no interactive control in the body. `sheet-actions` holds only
  the implicit dismiss path (Escape, backdrop, `sheet-close`); there is no labeled action, since
  this state is expected to resolve on its own within a moment. `connection-status` announces
  `Requesting controller access`. Resolves automatically into **Unsupported browser**, **Permission
  denied**, **No device found**, **Transposition check** (exactly one input found), or **Multi-
  device picker** (more than one input found).
- **Unsupported browser:** `sheet-title` reads "Controller connection isn't available here".
  `sheet-body` reads "This browser can't see a MIDI controller. Practicing without one works exactly
  the same." No `status-dot` is shown in this state (there is no device state to represent yet).
  `sheet-actions` holds only `Continue without a controller`; there is no `Try again`, since nothing
  about clicking it again would change which browser is running. `connection-status` announces
  `Requesting controller access` then, once resolved, no separate announcement for this state beyond
  the dialog title itself being read (there is no further action to prompt).
- **Permission denied:** `sheet-title` reads "Controller access is blocked". `sheet-body` reads
  "This browser blocked MIDI access. Allow it in your browser's site settings, then try again." with
  an `alert-notice` `status-dot` marked neutral (never `alert-error`). `sheet-actions` holds `Try
  again` (`btn btn-primary`) and `Continue without a controller` (`btn`). `connection-status`
  announces `MIDI access blocked`.
- **No device found:** `sheet-title` reads "No controller found". `sheet-body` reads "No MIDI
  controller was found. Connect one and try again, or continue without one." with an `alert-notice`
  `status-dot` marked neutral. `sheet-actions` holds `Try again` (`btn btn-primary`) and `Continue
  without a controller` (`btn`). `connection-status` announces `No controller found`.
- **Multi-device picker:** `sheet-title` reads "Choose a controller". `sheet-body` shows
  `device-picker` listing every currently reported input by its device name, plus `Continue without
  a controller` (`btn`) below the list. There is no separate confirm action: selecting a
  `device-option` immediately advances to **Transposition check** for that device.
  `connection-status` announces `Choose a controller`.
- **Transposition check:** `sheet-title` reads "Check your controller". Two sub-states:
  - *Prompt:* `sheet-body` shows the one written note (from the current instrument profile's own
    range) and the instruction "Play the note shown above." `sheet-actions` holds no forward action
    yet (the check advances on its own once a note is played) and the implicit dismiss path.
    `connection-status` announces `Play the note shown to check your controller`.
  - *Result (one of three, shown after a note is played):* `sheet-body` replaces the prompt with an
    `alert-notice` (never `alert-error`, regardless of which of the three) stating the outcome and
    its one-line suggestion:
    - **Match:** "Matches — nothing to change." / suggestion: "Your controller is ready to use."
      `connection-status` announces `Controller check: matches`.
    - **Transposed by N octaves:** "Transposed by {N} octave(s)." / suggestion: "Try setting your
      controller's octave shift to 0, or choose an instrument profile that matches this offset."
      `connection-status` announces `Controller check: transposed by {N} octaves`.
    - **Transposed by N semitones:** "Transposed by {N} semitone(s)." / suggestion: "Try adjusting
      your controller's transpose setting by {N} semitone(s) the other way, or choose an instrument
      profile that matches this offset."
      `connection-status` announces `Controller check: transposed by {N} semitones`.

    `sheet-actions` holds `Continue` (`btn btn-primary`, advances to **Connected**) and `Run check
    again` (`btn`, returns to the *Prompt* sub-state for the same device). All three outcomes use
    identical layout and identical action set; only the body text differs.
- **Connected:** `sheet-title` reads "Controller connected". `sheet-body` shows a `status-dot`
  marked success (`--color-success`; this is the one state in this flow allowed a positive color,
  since it is not one of the "absence is normal" states that the color-discipline policy reserves
  neutral treatment for — see `flows/controller-connection/intent.md`, Color discipline) plus the
  connected device's name.
  `sheet-actions` holds `Run check again` (`btn`), `Choose a different device` (`btn`, present only
  when more than one input has ever been seen this session), `Disconnect` (`btn`), and the implicit
  dismiss path via `sheet-close`. `connection-status` announces `Controller connected`.
