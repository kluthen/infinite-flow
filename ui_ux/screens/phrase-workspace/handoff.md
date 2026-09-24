# Phrase Workspace Handoff

## Layout Tree

```text
layout-app
  layout-header
    brand-mark
    header-actions
      context-group
        score-context
          meter-badge
          tempo-readout
          segmented-control (notation mode)
        theme-control segmented-control (system, light, dark)
      btn btn-primary btn-lg (phrase action)
  layout-workspace
    score-panel
      score-toolbar
        score-context
        generation-status
      staff-viewport
        staff-frame
          staff-empty, staff-loading, staff-error, staff-ready, or staff-content
            chord-symbol
            measure-slot
    control-section
      control-summary
      control-group-row
        control-group (foundation)
          field-group (tempo)
          field-group (tonal center)
          field-group (collection)
          field-group (instrument profile)
            segmented-control
            profile-range-summary
          field-group (musical profile preset)
            segmented-control
            preset-status
          field-group (harmonic motion)
          field-group (tension)
        control-group (rhythm)
          field-group (note density)
          field-group (syncopation)
          field-group (silence density)
        control-group (melodic shape)
          field-group (contour)
          field-group (register)
          field-group (leapiness)
        control-group (character)
          character-disclosure
            field-group (arpeggio chaos)
```

## Components and Content

- The root uses `layout-app`; the header uses `layout-header`; the body uses `layout-workspace`.
- `score-panel` uses `score-panel`; its header uses `score-toolbar`. The visible title is `Four-measure phrase`.
- `staff-frame` renders one `staff-content` unit with exactly four `measure-slot` elements and a semantic SVG music score.
- `chord-symbol` uses `--font-music` or `--font-ui` only when the notation engine cannot engrave chord symbols; it is never placed independently from the harmonic event it labels.
- Every single-select `segmented-control` has `role="radiogroup"` and an accessible group label; each `segment` has `role="radio"` and `aria-checked="true"` or `"false"`. Exactly one segment is checked when a value is active, and the checked segment also receives `is-selected` for its visual state. Each group uses a roving tab stop: the checked segment is the only `tabindex="0"` option, with all others at `tabindex="-1"`; when the custom musical-preset state has no checked segment, its first option is the tab stop. Left and Up move to the prior option, Right and Down move to the next option, and each move selects and focuses its destination.
- `notation-mode segmented control` uses `segmented-control` with `Concert`, `B-flat`, and `E-flat`. One option is always selected.
- `theme-control segmented-control` uses `System`, `Light`, and `Dark`. `System` follows the operating-system preference; `Light` and `Dark` set a manual presentation override. This selection changes presentation only: it cannot change a phrase, any control value, generation request, seed, selected profile, or result.
- The primary action is `btn btn-primary btn-lg`: `Generate phrase` before a result, otherwise `Regenerate phrase`.
- `generation-status` is a persistent, visually hidden `role="status"` region with `aria-live="polite"` and `aria-atomic="true"`. It announces `Generating phrase`, `Phrase ready`, and `Generation failed. Try again.` after the corresponding state has changed; it never announces control navigation, preset changes, or notation/theme display changes.
- The below-score control section groups `field-group` instances: foundation (tempo, tonal center, collection, instrument profile, musical profile preset, harmonic motion, tension); rhythm (note density, syncopation, silence density); melodic shape (contour, register, leapiness); character (arpeggio chaos).
- Instrument profile uses `segmented-control` for C MIDI keyboard, B-flat tenor saxophone, and E-flat alto saxophone. The selected `profile-range-summary` states the profile's active range and Low, Middle, and High whole-phrase windows.
- The first-load tonal context is C Ionian. Every pitch class is selectable; displayed notation uses the selected convention's lowest-accidental spelling, using sharps on a tie. Tempo initially displays 90 BPM and moves by its defined product step within its defined product bounds.
- The collection menu exposes major, minor, Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, and Locrian.
- The neutral preset selects static harmonic motion, quarter-note density, straight syncopation, sparse rests, arch contour, and middle register. The jazz preset selects gentle diatonic harmonic motion, eighth-note density, occasional offbeats, conversational space, wandering contour, and `Varying` register.
- After the player manually changes any preset-controlled value, clear the preset selection and show `preset-status is-custom` as `Custom configuration - Neutral grammar retained` or `Custom configuration - Jazz grammar retained`, according to the preset last applied. The visible status is a polite status region and states that choosing `Neutral` or `Jazz` replaces all six preset-controlled values. Selecting either preset restores its complete bundle, replaces the custom values, selects that preset, and announces the applied preset through the same status region.
- Arpeggio chaos exposes `Predictable`, `Varied`, and `Chaotic`: orderly ascending or descending chord-tone direction; slight inversions and reordering; and the strongest permitted reordering respectively. It never bypasses profile, contour, range, or resolution constraints.
- Every discrete setting uses `segmented-control`; only tempo uses `input-stepper`. Every control has a `field-label`, selected-value feedback, and an accessible description.

## Notation Contract

- `staff-content` renders in the selected display convention from concert-pitch events, always in treble G2 clef. Concert, B-flat, and E-flat transform the written notes, key, tonal label, chord roots, and slash bass while preserving chord quality and concert events.
- The score includes the applicable clef, key signature, 4/4 signature, rhythmic glyphs, rests, beams, ties, accidentals, barlines, and chord symbols. Chord symbols follow the selected display mode.
- `measure-slot` boundaries represent real measure extents from engraving layout. They do not invent beat positions or vertically place pitch glyphs in CSS.
- The layout refuses to show a phrase until all four measure durations validate. A phrase must not be cut off, horizontally scrolled, shrunk below its legibility floor (the minimum engraving scale at which the score stays readable), or split into more than two staff systems at supported breakpoints; the score's height follows its content.
- At `bp-tablet-landscape` and above, the score always engraves as exactly one staff system holding all four measures; if it cannot fit at the legibility floor, the notation-error state applies (see States). Below `bp-tablet-landscape`, the score first attempts one staff system with all four measures; when that does not fit at the legibility floor, it engraves as two staff systems of two measures each within the same staff area — bars 1-2 on the first system, bars 3-4 on the second — with clef and key signature repeated on the second system and the 4/4 time signature shown only on the first system. All four `measure-slot` regions stay visibly equal in width in both the one-system and two-system layouts, and the two systems' measure columns stay aligned with each other. If two systems also cannot fit at the legibility floor, the notation-error state applies.
- On profile selection, validate the unchanged concert phrase against the newly selected active range and resolved whole-phrase register window. For `Varying`, resolve its candidate window from the current seed before validation. A valid phrase redraws in the current notation convention; an invalid phrase keeps controls, receives a fresh seed, and regenerates as a complete replacement without transposing source events.

## Responsive Behavior

- At `bp-mobile-landscape`, use one full-width score row above a stacked `control-section`. `layout-header` wraps and reflows `brand-mark`, notation-mode `segmented-control`, `theme-control segmented-control`, and the primary action through the canonical header classes; no header content overflows. Each `field-group` gives its `segmented-control` the available inline size, and its segments wrap within it; including all twelve tonal-center choices, no segmented control overflows. The score first attempts a single four-measure staff system; when that does not fit at the legibility floor, it falls back to the two-system layout defined in the Notation Contract, with equal-width measure regions and aligned columns across both systems. First load selects B-flat display notation.
- At `bp-tablet-landscape`, use one full-width score row above a `control-group-row` that wraps as needed. The controls scroll with the page; `staff-viewport` uses its full available inline size.
- At `bp-desktop`, use the same vertical structure. Orient control groups horizontally across the page and give `staff-viewport` its maximum available inline space; do not add a side rail or third content column.
- Below `bp-desktop`, when the viewport is portrait, use `orientation-notice` instead of an interactive score layout. At `bp-desktop` and above, do not apply the portrait guard; retain the full-width `staff-viewport` when width is sufficient.
- All visual styling and responsive dimensions use the canonical tokens and component classes in `src/styles/theme.css` and `src/styles/components.css`; this handoff declares no independent visual values.

## States

- **Empty:** `staff-frame staff-empty` shows a short instruction without fake notes or placeholder music. The workspace-header `btn btn-primary btn-lg` is the sole `Generate phrase` action.
- **Loading:** `staff-frame staff-loading` retains the staff frame and status text; only the phrase-generation `btn` is disabled with `is-loading`. Every configuration control receives `is-readonly` and `aria-readonly="true"`, preserving its selected value without accepting changes until the request completes. Read-only controls remain focusable context, but their pointer and keyboard handlers suppress value changes, including radio arrow-key navigation. The previous valid `staff-content` remains visible during regeneration. `generation-status` announces `Generating phrase`.
- **Ready:** `staff-frame staff-ready` presents all four engraved measures and chord symbols. `staff-content` uses the defined fade replacement policy.
- **Initial generation error:** `staff-frame staff-empty` remains in place with its instruction, and `inline-alert alert-error` appears in `score-toolbar`; the sole workspace-header generation action changes label to `Retry generation`. No score or placeholder music is shown.
- **Generation error:** `inline-alert alert-error` appears in `score-toolbar`; retain the prior valid score, and the sole workspace-header generation action changes label to `Retry generation`.
- **Notation error:** `staff-frame staff-error` replaces only the affected score content with an error message; retain the phrase request context, and the sole workspace-header generation action changes label to `Retry notation`.
- **Display switch:** selected segment shows `is-selected`; replace `staff-content` only after the alternate notation has been correctly engraved.
- **Theme override:** `theme-control` marks `System`, `Light`, or `Dark` as selected. It immediately updates semantic presentation tokens without loading or redrawing the score and without changing phrase or request data.
- **Preset customization:** A manual edit to a preset-controlled field clears the selected preset and updates `preset-status is-custom` to the visible retained grammar, `Neutral` or `Jazz`; selecting either preset restores and announces that preset's complete bundle.
- **Offline:** Keep all required generation, notation, controls, and the current phrase available. Do not show an offline blocker because required behavior is browser-local.
