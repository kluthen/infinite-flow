# Token Source: v3.1 and v3.2 Additions

> **New in v3.1.** Part 2 is new in v3.2.

The token source is `src/styles/theme.css` (tokens) and `src/styles/components.css` (component
classes). The new tokens and classes of v3.1 (presets and embellishment figures) and v3.2 (Jam,
the key and mode suggestion, the rhythm lock, drift and Vary settings' allowed groups) are
specified here, in the same terms, until each release's token-source pass writes them into those
two files. The two parts are applied separately, v3.1 first: each pass writes its own part under
`v3.1 new` / `v3.1 changed` (or `v3.2 …`) comments, and the document is deleted once both parts
are in. v3.0's additions are already in the token source, shipped in 3.0.0. A class or token
named in a v3.1 or v3.2 handoff exists in the token source or here, never only in a handoff.

Everything below reuses the existing colour, type, spacing, radius, shadow, duration and
breakpoint tokens. There is no new colour, no new spacing step and no new duration: the only new
values are two sizes.

## Part 1: v3.1

**Applied.** v3.1's token-source pass has written this part into `src/styles/theme.css` and
`components.css`, under `v3.1 new` / `v3.1 changed` comments; those two files are the source of
truth for it from now on, and it stays here only until part 2 is in too. Removed: chunk 13
took the musical profile's status line out of the controls and, with it, removed
`preset-status`, `preset-status-text`, `is-reserve` and `is-custom` from `components.css`.

### New Tokens

| Token                         | Value      | Use                                                                                                                                                                                                                                                                |
| ----------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--preset-select-inline-size` | `22rem`    | `preset-select`'s inline size (capped at 100 % of its field): one size whatever it shows, "Custom, based on Modal (Dorian)" or a 40-character player preset name, so a change of selection never moves anything; a longer text is cut with an ellipsis by the box. |
| `--segment-mark-size`         | `0.375rem` | The diameter of `is-marked`'s dot on a `segment`.                                                                                                                                                                                                                  |

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

## Part 2: v3.2

### New Tokens

None.

### New Classes

- **`staff-jam`** — a `staff-frame` state, beside `staff-empty`, `staff-ready` and the others:
  Jam mode at Idle without a held doodle, and a Jam before phrase 1 enters. The top system position
  holds one `staff-content` unit that the notation pipeline engraves as an empty system: the
  clef, the key signature of the selected written key and collection, and the 4/4 signature, the
  staff lines running to the system's end, no barline and no measure. The bottom system position
  holds `jam-instruction` and, when it applies, `jam-notice`. The frame keeps its block size.
  States: shown (Idle, count-in, capture, writing, read-in until phrase 1 enters), absent.
- **`jam-instruction`** — a `p` centred in the bottom system position's block, `--text-md`,
  `--color-text-muted`. Static.
- **`jam-notice`** — composed as `inline-alert alert-notice jam-notice`, after `jam-instruction`
  in the same block: the sentence telling that the last Jam could not continue the doodle. Never
  error-toned. Below `bp-tablet-landscape`, where the bottom system position is shortest,
  `jam-instruction` is not rendered while `jam-notice` shows, which takes its place. States:
  absent, shown.
- **`jam-capture`** — a `session-cue-row` child during a Jam's capture: a label (`cue-label-wide`
  "Your doodle", `cue-label-narrow` "Doodle", as `review-link`'s two labels) then a `count-in`
  `ol` of four `count-in-beat` items reading 1 to 4, one per measure, lit on the audio clock with
  the count-in's own `is-current` and `is-past`. States: as `count-in`.
- **`jam-writing`** — a `session-cue-row` child during the generation measure and any extended
  wait: one static line in neutral text at `--text-md`, `cue-label-wide` "Writing your first
  phrase" or `cue-label-narrow` "Writing". No animation of any kind. States: shown, absent.
- **`jam-bar`** — a row in `score-panel` between `score-toolbar` and the generation-failure
  banner's place, present only while a doodle is held: `--color-surface-muted` fill, a 1px
  `--color-border` border, `--radius-md`, `--spacing-3` padding, its children `--spacing-2`
  apart; a `p` then, when there is one, `suggestion-row`. Its `p` and `suggestion-row`'s set
  sentence carry `tabindex="-1"` (focus is moved there after `Keep` or `Use`) and take
  `--shadow-focus` when focused, as `room-notice` does. States: absent, shown, held (during a
  session started from it: unchanged, its buttons disabled with `btn`'s disabled look).
- **`suggestion-row`** — the key and mode suggestion, in `jam-bar` and in `review-doodle`: a `p`
  (the sentence) and its two plain `btn`s at the inline end, one row that wraps; then, when the
  answer is outside the restriction in force, a second `p` at `--text-sm`, `--color-text-muted`.
  States: offering (sentence and buttons), set (one sentence, no button: "Key and mode set to …"),
  no-fit (one sentence, no button), absent.
- **`review-doodle`** — a `section` in `review-panel` before `review-list`, spaced from it as one
  `review-phrase` is from the next: a `review-phrase-header` (its title, its tempo, and the
  `Jam again on this doodle` `btn` at the trailing end, where per-phrase tools go, followed by its
  `field-note` when disabled), a `review-staff` (the doodle's measures at a phrase's measure width,
  from the system's start; the played-notes lane under it when shown), then `suggestion-row`.
  States: none of its own.
- **`toggle-list`** — a wrapping row of `btn toggle-button`s, `--spacing-2` apart, after a
  `field-label` naming the list: Allowed rhythm changes, What may vary. States: default;
  read-only (`is-readonly`, during **Loading** and a session, as every control: the toggles keep
  their words, their `on` bar and full strength and stay focusable, pointer events are off, and
  script refuses activation by Space, Enter or click, as `segmented-control.is-readonly` refuses
  an arrow key; the dashed `--readonly-ring` is drawn once, by the nearest read-only
  `field-group`, never on the list). Each toggle otherwise carries `toggle-button`'s states (its
  `on` bar and words), disabled included.
- **`field-dependent`** — a nested `field-group` inside a "During a session" field, holding the
  option that depends on its switch (Drift, Allowed rhythm changes, What may vary): `--spacing-3`
  above it, a 2px `--color-border` rule along its inline start and `--spacing-3` padding there, so
  it reads as part of the switch above. States: absent, shown. When the switch's `field-group` is read-only,
  `field-dependent` and everything in it are read-only too, and the dashed ring is drawn once,
  around the outer `field-group`: a nested `field-group`, `segmented-control` or `toggle-list`
  inside a read-only `field-group` draws none of its own (the rule the token source already
  applies to a segmented control inside a read-only field).

### Reused Without Change

`session-action` ("Start Jam" fits `--session-action-inline-size`), `count-in`, `count-in-beat`,
`cue-label-wide`, `cue-label-narrow`, `review-phrase-header`, `review-staff`, `played-notes-lane`,
`segmented-control` (Jam, Drift, Rhythm lock), `field-note`, `btn`.
