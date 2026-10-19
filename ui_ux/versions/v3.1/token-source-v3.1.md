# Token Source: v3.1 Additions

> **New in v3.1.**

The token source is `src/styles/theme.css` (tokens) and `src/styles/components.css` (component
classes). The new tokens and classes of v3.1 (presets and embellishment figures) are specified
here, in the same terms, until v3.1's token-source pass writes them into those two files under
`v3.1 new` / `v3.1 changed` comments. v3.0's additions are already in the token source, shipped
in 3.0.0. A class or token named in a v3.1 handoff exists in the token source or here, never only
in a handoff.

Everything below reuses the existing colour, type, spacing, radius, shadow, duration and
breakpoint tokens. There is no new colour, no new spacing step and no new duration: the only new
values are two sizes.

## v3.1

### New Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--preset-select-inline-size` | `22rem` | `preset-select`'s inline size (capped at 100 % of its field): one size whatever it shows, "Custom, based on Modal (Dorian)" or a 40-character player preset name, so a change of selection never moves anything; a longer text is cut with an ellipsis by the box. |
| `--segment-mark-size` | `0.375rem` | The diameter of `is-marked`'s dot on a `segment`. |

### Removed Classes

- **`preset-status`, `preset-status-text`** (and `is-reserve`, `is-custom` on them): the musical
  profile's status line goes; the preset box names the selection and a `field-note` describes it.

### New Classes

Each block opens with a comment listing the states it defines, as the token source does for every
component. Every interactive class below is composed with `btn`, `segment`, `toggle-button` or a
native form field, so its states are those classes' own unless stated.

- **`preset-bar`** — the first row of `control-section`, after `control-summary` and before
  `control-group-row`: the Preset `field-group` (its `field-label`, `preset-select`, then the
  description `field-note`) and `preset-actions`. From `bp-tablet-landscape` up one row, the field
  at the inline start and `preset-actions` after it, aligned to the select's block start, wrapping
  under it when the width runs out; below it, stacked. `--spacing-4` between them, `--spacing-5`
  before `control-group-row`. States: none of its own (layout).
- **`preset-select`** — a native `select`, with its `optgroup`s and `option`s: `--font-ui`,
  `--text-md`, `--color-text` on `--color-surface`, a 1px `--color-border` border, `--radius-md`,
  `--spacing-2` `--spacing-3` padding, the `btn`'s minimum block size, inline size
  `min(100%, var(--preset-select-inline-size))`, the browser's own arrow and list (the page's
  `color-scheme` follows the theme, so the open list matches it). States: default; hover
  (`--color-accent` border); focus-visible and open (`--shadow-focus`); read-only (`is-readonly`
  with `aria-readonly="true"`: the dashed `--readonly-ring` outline at `--spacing-1` offset, as
  `segmented-control.is-readonly`, full-strength text, pointer events off, focusable; script
  refuses a keyboard change); disabled (as `btn`, unused by v3.1's design but defined). The
  Custom option is `disabled hidden`: shown as the box's value, never in the list.
- **`preset-actions`** — a row of plain `btn`s (`Save as new preset`, `Save changes`, `Rename
  preset`, `Delete preset`), `--spacing-2` apart, wrapping. Its `field-note`, when `Save as new
  preset` is disabled at the limit, follows the row. States: none of its own; the buttons carry
  `btn`'s, disabled included.
- **`segment.is-marked`** — a segment the key and mode restriction in force allows: a filled dot,
  `--segment-mark-size` across, at the segment's top inline-end corner, inset `--spacing-1` from
  both edges (`segment` takes `position: relative`; the dot is an `::after`, so it adds no
  accessible text). `--color-accent` on an unselected segment, `--color-accent-text` on the
  selected one; both meet 3:1 against the fill under them in both themes (about 5.5:1 and 6:1
  for the unselected dot in light and dark). Kept in every state of the segment, read-only
  included; never combined with disabled (a restriction never disables). States: marked, marked
  and selected. A shape, so colour is never the only signal; the words are in the control's
  `field-note`.
- **`control-group-figures`** — modifier on `control-group` for the Embellishments group: the
  layout of `control-group-session`, unchanged (below `bp-tablet-landscape` stacked after the
  groups before it; from `bp-tablet-landscape` up a row of its own across `control-group-row`,
  its heading and intro across the top, its fields side by side in columns of at least
  `--control-group-min-inline-size`). It sits before `control-group-session`. States: none of its
  own; it takes the read-only ring like every group.
- **`control-group-intro`** — one muted line under a control group's `h3`, `field-note`'s type
  and colour, spanning every column. Static. Used by the Embellishments group.
- **`choice-list`, `choice-option`** — a vertical radiogroup of full-width options inside a sheet:
  `device-picker`'s and `device-option`'s rules exactly (grid with `--spacing-2` gap; each option
  a `--color-surface-muted` box with a `--color-border` border, `--radius-sm`, the `btn`'s minimum
  block size, its label at the inline start). `role="radiogroup"` on the list, `role="radio"` and
  `aria-checked` on each option, roving tab stop and arrow keys as `segmented-control`. States:
  default, hover, focus-visible, active, selected (`aria-checked="true"` and `is-selected`: the
  accent fill), disabled. Used by the preset sheet's Key and mode choice.
- **`name-alert`** — composed as `inline-alert alert-notice name-alert`, under the preset sheet's
  name field: the reason a name is refused, present only while it applies, and a polite live
  region (`role="status"`), as `range-alert` is in the My instrument sheet. Never error-toned.
  States: absent, shown.

- **`sheet-list`, `sheet-list-row`** — a list of named items inside a `sheet-section` (Your
  data's player presets): `sheet-list` a `ul` with no markers, its rows `--spacing-2` apart;
  each `sheet-list-row` the item's name in the sheet's body type at the inline start and one plain
  `btn` at the inline end, wrapping the button under the name, at the inline start, when the row
  cannot hold both. States: none of their own; the button carries `btn`'s.

### Reused Without Change

`sheet` (the preset sheet is a standard-width sheet), `sheet-header`, `sheet-body`,
`sheet-actions`, `field-group`, `field-label`, `field-note`, `text-input` (the name field;
`maxlength` 40), `segmented-control` and `segment` (the seven figure levels), `btn`, `btn-error`
(the delete confirmation).
