# Token Source: v3.0 Additions

> **New in v3.**

The token source is `src/styles/theme.css` (tokens) and `src/styles/components.css` (component
classes). v3.0's new tokens and classes are specified here, in the same terms, until they are
written into those two files; that pass then deletes this document, and every handoff that names
a class below keeps its meaning. A class or token named in a v3.0 handoff exists either in the
token source or here, never only in a handoff.

Everything below reuses the existing color, type, spacing, radius, shadow, duration and
breakpoint tokens. There is no new color scale and no new spacing step: the only new values are
one error-hover color pair, a wider sheet, and four sizes.

## New Tokens

Tokens go in `theme.css` under a `v3 new` comment, beside the tokens of the same kind.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--color-error-hover` | `#86221c` | `#ffb5ab` | Hover fill and border of `btn-error`. Meets 4.5:1 against its text token (`--color-accent-text`) in both themes, as `--color-error` does. |

| Token | Value | Use |
| --- | --- | --- |
| `--sheet-wide-max-inline-size` | `36rem` | `sheet-wide`: the My instrument and Your data sheets, whose rows hold a label, a value and an action, or two steppers side by side. |
| `--instrument-stepper-value-inline-size` | `10ch` | The readout of the range and transposition steppers: sized for the longest value, "12 higher" (9 characters), plus one character of slack, in tabular digits, so a value change never moves the stepper's buttons. |
| `--text-input-max-inline-size` | `20rem` | `text-input`: the instrument name field (30 characters at `--text-md`). |
| `--comment-field-min-block-size` | `6.5rem` | `text-area`: four lines of `--text-md` at `--leading-base`, plus its padding. It grows with its content up to the 500-character limit. |
| `--favorite-icon-size` | `1.25rem` | The star in `favorite-toggle`, at every breakpoint. |

## Changed Classes

- **`btn-error`** gains its missing feedback states: hover (`--color-error-hover` fill and
  border), active (the same, moved down by one pixel as `btn-primary` is), focus-visible
  (`--shadow-focus`, as every `btn`), disabled and loading (as `btn`). Its block comment lists
  default, hover, focus-visible, active, disabled, loading. Used only for an action that deletes
  saved data, and only inside a confirmation or as the last action of a sheet: never as a page's
  primary action.

## New Classes

Each block opens with a comment listing the states it defines, as the token source does for
every component. Every interactive class below is composed with `btn`, `segmented-control`,
`input-stepper` or `toggle-button`, or is a native form field, so its hover, focus-visible,
active and disabled states are those classes' own unless stated.

### Sheets

- **`sheet-wide`** — modifier on `sheet`: `max-inline-size: var(--sheet-wide-max-inline-size)`.
  States: none of its own (layout only). Capped at every breakpoint, as `sheet` is at its own
  `--sheet-max-inline-size`: it fills the inline size left by the backdrop's padding up to the
  cap, so a phone in landscape (844 px wide, say) shows it at the cap, as a tablet does, and only
  a viewport narrower than the cap plus that padding makes it fill the width.
- **`sheet-section`** — a titled group inside `sheet-body`: an `h3` at `--text-md`, weight 700,
  then its rows; `--spacing-5` between sections, a `--color-border` hairline above every section
  but the first. A `btn` placed directly in a section (Your data's section buttons, `Keep my
  played notes` included) keeps its own width at the inline start (`.sheet-section > .btn {
  justify-self: start }`), at every breakpoint, never stretched across the section; no wrapper is
  needed. States: default only (static).
- **`sheet-actions-destructive`** — a row at the end of `sheet-body`, after every section, holding
  one `btn btn-error`; aligned to the inline start, separated from the section above by
  `--spacing-6`, so a deleting action never sits beside `Done` or `Save`. States: none of its own.

### Form fields

- **`text-input`** — a native single-line `input`, full width up to
  `--text-input-max-inline-size`, `--text-md`, `--font-ui`, `--color-text` on `--color-surface`,
  a 1px `--color-border` border, `--radius-md`, `--spacing-2` `--spacing-3` padding, the `btn`'s
  minimum block size. States: default, hover (`--color-accent` border), focus-visible
  (`--shadow-focus`, applied on `:focus-visible` and on `:focus`, since a text field is always
  entered by keyboard once focused), disabled (as `btn`), read-only (the dashed
  `--readonly-ring`, as `segmented-control`'s read-only state). No error state: the one field
  using it never refuses a value (an empty name falls back to a default).
- **`text-area`** — a native `textarea` with the same box as `text-input`, full width of its
  container, `min-block-size: var(--comment-field-min-block-size)`, resizable on the block axis
  only, growing with its content. States: as `text-input`. No error state: its length limit is
  the field's own `maxlength`.
- **`field-count`** — the live character count after a `text-area` ("{n}/500"): `field-note`'s
  type and color, tabular digits, aligned to the inline end. Not a live region (the field's own
  `maxlength` is announced by the browser). States: default only.

### Notices

- **`app-notice-row`** — a stack of `app-notice` items at the top of `layout-workspace`, before
  `score-panel`, `--spacing-2` apart, full width. Absent (not rendered) when it holds none. States:
  absent, shown.
- **`app-notice`** — composed as `inline-alert alert-notice app-notice`: one sentence or two, then
  at most one action `btn` and, when the notice can be dismissed, a `btn` reading "Dismiss",
  laid out as one row that wraps, the actions at the inline end. Never error-toned: a saving
  problem is not the player's fault and needs no alarm. Not a live region (it never appears
  during a session, and appears only after the player's own action or at load). States: shown;
  its buttons carry `btn`'s states. Appears and leaves with no animation.

### Header

- **`brand`** — the header's first item, holding `brand-mark` then `build-id` in one row on a
  shared baseline, `--spacing-2` apart, wrapping if it must. States: none of its own (layout only).
- **`build-id`** — the build the page comes from beside the app name: "{app version} · {short
  commit id}" (e.g. "2.0.0 · c31e18b"), the dot `aria-hidden`; `--text-xs`, `--color-text-muted`,
  tabular digits, never wrapped inside itself. Static: no state, not a live region, not
  interactive. It reads "unknown" in place of the commit id when the build could not tell.

### Footer

- **`layout-footer`** — the page's last block, after `control-section` inside `layout-app`:
  `--text-sm`, `--color-text-muted`, `--spacing-4` block padding, one row (wrapping) holding
  `footer-note` then one `btn` ("Your data"). States: default only; its button carries `btn`'s
  states, including disabled during a session.
- **`footer-note`** — the one-line note in it. Static.

### The session list

- **`sessions-panel`** — the session list's panel, in the staff area's place inside `score-panel`
  as `review-panel` is, with `review-panel`'s surface, border, radius, shadow and padding.
  States: absent, shown. Appears and leaves with no animation.
- **`sessions-header`** — `review-header`'s layout: the heading at the inline start, its one
  action (`Your data`) at the inline end, wrapping under the heading when they do not fit.
- **`sessions-intro`** — one muted `--text-sm` line under the title. Static.
- **`session-list`** — an `ol` with no markers, rows `--spacing-3` apart. States: default, empty
  (replaced by `sessions-empty`).
- **`session-row`** — one kept session: a `--color-surface` block with a `--color-border` bottom
  hairline, `--spacing-3` block padding; a grid with the text column at the inline start and
  `session-row-actions` at the inline end, the actions dropping under the text below
  `bp-tablet-landscape`. Not interactive itself (no hover on the row, no row-wide click
  target). States: default, opening (its `session-row-open` takes `is-loading`), unreadable (see
  `session-row-note`).
- **`session-row-open`** — the row's title, a `btn` styled as text: no border or fill, `--text-md`,
  weight 700, `--color-text`, underlined on hover, the `btn`'s minimum block size and
  `--shadow-focus` on focus-visible. States: default, hover, focus-visible, active, disabled
  (unreadable row), loading (`is-loading`, as `btn`).
- **`session-row-meta`** — the detail line and the status line, `--text-sm`,
  `--color-text-muted`, each one line that wraps. Static.
- **`session-row-comment`** — the comment's first line: `--text-sm`, `--color-text`, cut to one
  line with an ellipsis. Static. Absent when the session has no comment.
- **`session-row-note`** — a muted `--text-sm` line in place of the comment when the row cannot be
  opened ("This session was saved by a newer version of the app. Reload the page to open it.").
  Static.
- **`session-row-actions`** — `Pin`/`Unpin` and `Delete`, two plain `btn`s, `--spacing-2` apart.
  States: none of its own.
- **`sessions-empty`** — the list's empty state: one muted `--text-md` paragraph, centred in a
  block of `--spacing-8` padding. Static.

### The review (additions)

- **`cue-label-wide`, `cue-label-narrow`** — the two labels of `review-link` ("Review last
  session", "Last session"): `cue-label-wide` rendered from `bp-tablet-landscape` up,
  `cue-label-narrow` below it, never both, as `room-notice-wide` and `room-notice-narrow` are.
  Static.
- **`cue-clause`** — an inline run inside `start-note-line` rendered from `bp-tablet-landscape`
  up only, as `session-alert-clause` is inside the disconnect banner; the shorter phone wording is
  what remains without it. Static.
- **Rows of `review-panel` and `sessions-panel`** (`review-nav`, the heading row, `review-comment`,
  `review-actions`, `review-view`, then the list) are `--spacing-3` apart. `sessions-panel` takes
  its title from `review-title` and its heading block from `review-heading`; no class of its own.

- **`sessions-link`** — composed as `btn sessions-link`, the cue row's second link ("All
  sessions"), after `review-link` at the row's trailing end, `--spacing-2` after it. With both
  shown, `review-link` keeps the row's `margin-inline-start: auto` and `sessions-link` takes
  none; shown alone, `sessions-link` takes it. States: `btn`'s own; absent during a session and
  while the review shows.

- **`review-nav`** — a row before `review-header` holding one `btn` (`All sessions`), aligned to
  the inline start. States: none of its own.
- **`review-keep-line`** — one muted `--text-sm` line under `review-summary`: the session's
  keeping state in words. Static; its text changes in place, with no animation.
- **`review-session-tools`** — `Pin`/`Unpin` and `Delete session`, two plain `btn`s at the inline
  end of the heading row, `--spacing-2` apart, wrapping under the heading with
  `review-actions`. States: none of its own.
- **`review-comment`** — a row after `review-header`: collapsed, a `btn` (`Add a comment`) or the
  comment's text (`--text-md`, `--color-text`, wrapping, never cut) followed by a `btn`
  (`Edit comment`); editing, a `field-group` holding `field-label` ("Comment"), `text-area`,
  `field-count` and a `btn` (`Done`). States: collapsed-empty, collapsed-filled, editing.
- **`review-scope`** — the export scope's `field-group` (`field-label` "Export", a
  `segmented-control` and, while `Favorites only` is unavailable, a `field-note`), first in
  `review-actions`, separated from the groups after it by the gap `review-actions` already puts
  between groups. States: none of its own; the segment carries `segment`'s disabled state.
- **`review-export-played`** — the played-notes export's group in `review-actions`: a
  `btn toggle-button` (`Include very short notes`), then `btn review-export-action`
  (`Export played notes`), then, when that button is disabled, its `field-note`. Replaces the lone
  button of v2 in the same place. States: none of its own.
- **`favorite-toggle`** — composed as `btn favorite-toggle`, at the trailing end of
  `review-phrase-header`: a star (`--favorite-icon-size`, inline SVG drawn in `currentColor`)
  and, from `bp-tablet-landscape` up, the word "Favorite"; below it the star alone, with the
  `btn`'s minimum square target. Off: outline star in `--color-text-muted`. On
  (`aria-pressed='true'`): filled star in `--color-accent`, the word in `--color-text`, the
  `--color-accent` border. Shape, not colour, carries the state. States: default (off), on,
  hover, focus-visible, active; never disabled (the review shows only between sessions, and the
  change applies in memory at once, a failed save being told by `app-notice`). Changes state with the ordinary `--duration-feedback` button feedback, no other
  animation.

### My instrument

- **`instrument-actions`** — a row after `profile-range-summary` in the instrument profile's
  `field-group`, holding one plain `btn` (`Create my instrument` or `Edit my instrument`).
  States: none of its own; the `btn` is disabled during a session, like every control.
- **`note-stepper`** — composed as `input-stepper note-stepper`: the existing stepper (two
  `stepper-button`s and an `input-stepper-value`) whose value is a note name with its octave
  number, or a transposition in words, at `--instrument-stepper-value-inline-size`. Used for the
  lowest note, the highest note and the transposition. States: `input-stepper`'s own (default,
  hover, focus-visible, active, disabled, read-only), and a disabled `stepper-button` at the
  stepper's own bound (the MIDI note range).
- **`range-row`** — the two range `note-stepper` field groups side by side from
  `bp-tablet-landscape` up, stacked below it. States: none of its own.
- **`range-alert`** — composed as `inline-alert alert-notice range-alert`, under `range-row`: the
  refusal of a range under two octaves, present only while it applies, and a polite live region
  (`role="status"`), so a keyboard player stepping a note hears why `Save` went unavailable.
  States: absent, shown.
