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
        inline-alert alert-error (generation-failure banner; present only in the two generation-error states)
      staff-viewport
        staff-frame
          staff-empty, staff-loading, staff-error, staff-ready, or staff-content
            chord-symbol
            measure-slot
    control-section
      control-section-title
      control-section-copy
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
          inline-alert alert-notice (unsupported-rhythm notice; persistent live region, empty and visually absent otherwise)
        control-group (melodic shape)
          field-group (contour)
          field-group (register)
          field-group (leapiness)
        control-group (character)
          character-static
            field-group (arpeggio chaos)
```

## Components and Content

- The root uses `layout-app`; the header uses `layout-header`; the body uses `layout-workspace`.
- `score-panel` uses `score-panel`; its header uses `score-toolbar`. The visible title is `Four-measure phrase`.
- `staff-frame` renders one `staff-content` unit with exactly four `measure-slot` elements and a semantic SVG music score.
- `chord-symbol` uses `--font-music` or `--font-ui` only when the notation engine cannot engrave chord symbols; it is never placed independently from the harmonic event it labels.
- Every single-select `segmented-control` has `role="radiogroup"` and an accessible group label; each `segment` has `role="radio"` and `aria-checked="true"` or `"false"`. Exactly one segment is checked when a value is active, and the checked segment also receives `is-selected` for its visual state. The one sanctioned exception is the custom musical-preset state (see below), where the musical profile preset `radiogroup` has no checked segment at all — ARIA permits a `radiogroup` with no checked radio, and this design set never adds an unselectable "Custom" radio to stand in for it. Each group uses a roving tab stop: the checked segment is the only `tabindex="0"` option, with all others at `tabindex="-1"`; when the custom musical-preset state has no checked segment, its first option (`Neutral`) is the tab stop. Left and Up move to the prior option, Right and Down move to the next option, and each move selects and focuses its destination.
- `notation-mode segmented control` uses `segmented-control` with `Concert`, `B-flat`, and `E-flat`. One option is always selected.
- `theme-control segmented-control` uses `System`, `Light`, and `Dark`. `System` follows the operating-system preference; `Light` and `Dark` set a manual presentation override. This selection changes presentation only: it cannot change a phrase, any control value, generation request, seed, selected profile, or result.
- The primary action is `btn btn-primary btn-lg`: `Generate phrase` before a result, otherwise `Regenerate phrase`.
- `generation-status` is a persistent, visually hidden `role="status"` region with `aria-live="polite"` and `aria-atomic="true"`. It announces `Generating phrase`, `Phrase ready`, and `Generation failed. Try again.` after the corresponding state has changed; it never announces control navigation, preset changes, or notation/theme display changes.
- `control-summary` is a single line of muted, small static text in `control-section`, after `control-section-title` and `control-section-copy` and before `control-group-row`. It is plain text: not a live region, never announced, and carries no `aria-hidden`. Its copy is `{tonal center label} {collection label} · {musical profile or custom label} · {tension arc label} · {leapiness label}`, with a plain space between the tonal-center and collection labels and ` · ` (U+00B7 surrounded by spaces) between the remaining three segments. The tonal center label matches the label the tonal-center control itself shows (e.g. `C-sharp/D-flat`). The musical-profile segment reads `Neutral` or `Jazz` when a preset is currently selected, or `Custom ({grammar} grammar)` during the custom state, using the same retained-grammar word `preset-status` shows. It recomputes on every change to tonal center, collection, musical profile preset or custom state, tension, or leapiness, and is independent of the notation display mode. Examples: default load `C Ionian · Neutral · Lift · Shaped`; Jazz preset selected `C Ionian · Jazz · Lift · Shaped`; custom state after a Neutral edit `C Ionian · Custom (Neutral grammar) · Lift · Shaped`.
- The below-score control section groups `field-group` instances: foundation (tempo, tonal center, collection, instrument profile, musical profile preset, harmonic motion, tension); rhythm (note density, syncopation, silence density); melodic shape (contour, register, leapiness); character (arpeggio chaos).
- Instrument profile uses `segmented-control` for C MIDI keyboard, B-flat tenor saxophone, and E-flat alto saxophone. The selected `profile-range-summary` states the profile's active range and Low, Middle, and High whole-phrase windows.
- The first-load tonal context is C Ionian. Every pitch class is selectable; displayed notation uses the selected convention's lowest-accidental spelling, using sharps on a tie. Tempo initially displays 90 BPM and moves by its defined product step within its defined product bounds.
- The collection menu exposes major, minor, Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, and Locrian.
- The neutral preset selects static harmonic motion, quarter-note density, straight syncopation, sparse rests, arch contour, and middle register. The jazz preset selects gentle diatonic harmonic motion, eighth-note density, occasional offbeats, conversational space, wandering contour, and `Varying` register.
- After the player manually changes any preset-controlled value, clear the preset selection and show `preset-status is-custom` as `Custom configuration - Neutral grammar retained` or `Custom configuration - Jazz grammar retained`, according to the preset last applied. The visible status is a polite status region and states that choosing `Neutral` or `Jazz` replaces all six preset-controlled values. Selecting either preset restores its complete bundle, replaces the custom values, selects that preset, and announces the applied preset through the same status region.
- Arpeggio chaos exposes `Predictable`, `Varied`, and `Chaotic`: orderly ascending or descending chord-tone direction; slight inversions and reordering; and the strongest permitted reordering respectively. It never bypasses profile, contour, range, or resolution constraints.
- Contour options, in order: `Rising`, `Falling`, `Arch`, `Wandering`.
- The `character` control group holds only Arpeggio chaos. Its `character-static` wrapper is always visible and never collapsible or progressively disclosed; it exists solely for the visual separator (border and spacing) above the group's single field, not for a disclosure interaction.
- Every discrete setting uses `segmented-control`; only tempo uses `input-stepper`. Every control has a `field-label`, selected-value feedback, and an accessible description.
- The rhythm `control-group` ends with a single `inline-alert alert-notice`, `role="status"` with `aria-live="polite"` and `aria-atomic="true"`, reporting when the current note density, syncopation, and silence density combination cannot form a four-bar phrase, together with a nearer-supported-combination suggestion. This region is persistent in the accessibility tree at all times, with empty text and no visible alert styling when the combination is supported, so a screen reader is already tracking it before it ever has something to announce; visibility must never be toggled with a mechanism that removes the region from the accessibility tree (e.g. `display: none`) while blocked could become true. See States, "Unsupported rhythm combination."
- `score-toolbar`'s `inline-alert alert-error` shows exactly one calm, plain-language string, never a raw failure code and never the word "Generation failed" concatenated with the underlying error's own message. Selection: when the failure is a typed generation failure carrying one of the six documented failure codes, show that code's string below; for every other failure (a generation-Worker crash, a Worker transport failure, or any other unrecognized error), show the shared fallback string. This banner is independent of the `generation-status` live region, which stays the fixed announcement "Generation failed. Try again." in every case below.
  - `no_legal_harmony_plan`: "This combination of tonal center, collection, harmonic motion, tension, and musical profile can't produce a phrase. Try a different tonal center, collection, harmonic motion, tension, or profile."
  - `no_legal_rhythm_plan`: "This combination of note density, syncopation, and silence can't form a four-bar phrase. Try a different note density, syncopation, or silence setting."
  - `no_legal_pitch_plan`: "This combination of settings can't produce a phrase. Try a different register, contour, or rhythm setting."
  - `no_eligible_register_window`: "None of this instrument's register windows fit the current settings while register is set to Varying. Try a different contour."
  - `search_limit_exceeded`: "This phrase search hit its work limit before finding a result. That doesn't prove this combination is impossible. Trying again may find a result, or try different settings."
  - `result_validation_failed`: "Something went wrong while building this phrase. This wasn't caused by your settings."
  - Any other failure (Worker crash, transport failure, or unrecognized error): "Generation couldn't complete. Try again."
- `Retry generation` (the workspace-header action's label in both generation-error states) builds a new generation request from the current control values and selected instrument profile, with a fresh seed and request identity — the same construction as `Regenerate phrase` — rather than replaying the failed request unchanged. If the player edits a control after the failure and before pressing it, the retried request reflects that edit; for the four typed failure codes whose alert string names specific settings (harmony, rhythm, pitch, register window), this is how that hint takes effect. `search_limit_exceeded`'s hint to "try different settings" works the same way if the player edits a control, but its "trying again" half can also succeed from the fresh seed alone with no control changed. `Retry notation` (the notation-error state's action) is unrelated: it re-engraves the already-generated phrase's stored request and never builds a new generation request.
- The `alert-error` banner is not re-validated against ordinary control edits: once shown, its content and the `Retry generation` label stay exactly as they are through any number of field-group changes, and change only when the next generation attempt starts — the banner leaves while that attempt is in flight, the workspace moves to Ready on success, and another failure shows the banner again with the new attempt's failure string. The one exception is an instrument-profile switch that invalidates the retained phrase while the current rhythm combination is also unsupported (see Notation Contract; States, "Unsupported rhythm combination"): that switch clears the phrase and returns the workspace to **Empty** without running a generation request, which leaves the "Generation error" state — and its `alert-error` banner and `Retry generation` label — behind in favor of the empty-state `Generate phrase` action and the unsupported-rhythm `inline-alert alert-notice`.

## Notation Contract

- `staff-content` renders in the selected display convention from concert-pitch events, always in treble G2 clef. Concert, B-flat, and E-flat transform the written notes, key, tonal label, chord roots, and slash bass while preserving chord quality and concert events.
- The score includes the applicable clef, key signature, 4/4 signature, rhythmic glyphs, rests, beams, ties, accidentals, barlines, and chord symbols. Chord symbols follow the selected display mode.
- `measure-slot` boundaries represent real measure extents from engraving layout. They do not invent beat positions or vertically place pitch glyphs in CSS.
- The layout refuses to show a phrase until all four measure durations validate. A phrase must not be cut off, horizontally scrolled, shrunk below its legibility floor (the minimum engraving scale at which the score stays readable), or split into more than two staff systems at supported breakpoints; the score's height follows its content.
- At `bp-tablet-landscape` and above, the score always engraves as exactly one staff system holding all four measures; if it cannot fit at the legibility floor, the notation-error state applies (see States). Below `bp-tablet-landscape`, the score first attempts one staff system with all four measures; when that does not fit at the legibility floor, it engraves as two staff systems of two measures each within the same staff area — bars 1-2 on the first system, bars 3-4 on the second — with clef and key signature repeated on the second system and the 4/4 time signature shown only on the first system. All four `measure-slot` regions stay visibly equal in width in both the one-system and two-system layouts, and the two systems' measure columns stay aligned with each other. If two systems also cannot fit at the legibility floor, the notation-error state applies.
- On profile selection, validate the unchanged concert phrase against the newly selected active range and resolved whole-phrase register window. For `Varying`, resolve its candidate window from the current seed before validation. A valid phrase redraws in the current notation convention and is kept exactly as before, regardless of whether the current rhythm combination is supported. An invalid phrase is handled according to the current rhythm combination: if it is supported, keep controls, receive a fresh seed, and regenerate as a complete replacement without transposing source events; if it is unsupported, still apply the profile switch, but clear the phrase and return to the empty state instead of regenerating — see States, "Unsupported rhythm combination."

## Responsive Behavior

- At `bp-mobile-landscape`, use one full-width score row above a stacked `control-section`. `layout-header` wraps and reflows `brand-mark`, notation-mode `segmented-control`, `theme-control segmented-control`, and the primary action through the canonical header classes; no header content overflows. Each `field-group` gives its `segmented-control` the available inline size, and its segments wrap within it; including all twelve tonal-center choices, no segmented control overflows. The score first attempts a single four-measure staff system; when that does not fit at the legibility floor, it falls back to the two-system layout defined in the Notation Contract, with equal-width measure regions and aligned columns across both systems. First load selects B-flat display notation.
- At `bp-tablet-landscape`, use one full-width score row above a `control-group-row` that wraps as needed. The controls scroll with the page; `staff-viewport` uses its full available inline size.
- At `bp-desktop`, use the same vertical structure. Orient control groups horizontally across the page and give `staff-viewport` its maximum available inline space; do not add a side rail or third content column.
- Below `bp-desktop`, when the viewport is portrait, use `orientation-notice` instead of an interactive score layout. At `bp-desktop` and above, do not apply the portrait guard; retain the full-width `staff-viewport` when width is sufficient.
- All visual styling and responsive dimensions use the canonical tokens and component classes in `src/styles/theme.css` and `src/styles/components.css`; this handoff declares no independent visual values.

## States

- **Empty:** `staff-frame staff-empty` shows a short instruction without fake notes or placeholder music. The workspace-header `btn btn-primary btn-lg` is the sole `Generate phrase` action.
- **Loading:** `staff-frame staff-loading` retains the staff frame and status text; only the phrase-generation `btn` is disabled with `is-loading`. Every configuration control receives `is-readonly` and `aria-readonly="true"`, preserving its selected value without accepting changes until the request completes. Read-only controls keep their label, value, and selected-segment colors exactly as the active state (never dimmed) and are marked locked only by the read-only ring; they remain focusable context, but their pointer and keyboard handlers suppress value changes, including radio arrow-key navigation. The previous valid `staff-content` remains visible during regeneration. `generation-status` announces `Generating phrase`.
- **Ready:** `staff-frame staff-ready` presents all four engraved measures and chord symbols. `staff-content` uses the defined fade replacement policy.
- **Initial generation error:** `staff-frame staff-empty` remains in place with its instruction, and `inline-alert alert-error` appears in `score-toolbar` with the content defined above; the sole workspace-header generation action changes label to `Retry generation`, which builds a fresh request from the current controls and profile (see Components and Content). No score or placeholder music is shown.
- **Generation error:** `inline-alert alert-error` appears in `score-toolbar` with the content defined above; retain the prior valid score, and the sole workspace-header generation action changes label to `Retry generation`, which builds a fresh request from the current controls and profile (see Components and Content).
- **Notation error:** `staff-frame staff-error` replaces only the affected score content with an error message; retain the phrase request context, and the sole workspace-header generation action changes label to `Retry notation`.
- **Display switch:** selected segment shows `is-selected`; replace `staff-content` only after the alternate notation has been correctly engraved.
- **Theme override:** `theme-control` marks `System`, `Light`, or `Dark` as selected. It immediately updates semantic presentation tokens without loading or redrawing the score and without changing phrase or request data.
- **Preset customization:** A manual edit to a preset-controlled field clears the selected preset (the musical-profile-preset `radiogroup` has no checked segment; its first option remains the roving tab stop) and updates `preset-status is-custom` to the visible retained grammar, `Neutral` or `Jazz`; `control-summary` updates its musical-profile segment to `Custom ({grammar} grammar)` in the same moment. Selecting either preset restores and announces that preset's complete bundle, and `control-summary` returns to showing `Neutral` or `Jazz`.
- **Unsupported rhythm combination:** When the current note density, syncopation, and silence density combination cannot form a four-bar phrase, `inline-alert alert-notice` becomes visible at the end of the rhythm `control-group` with its message and suggestion, and every phrase action except `Retry notation` becomes disabled (`Retry notation` replays an already-generated phrase's stored request and does not depend on the current rhythm combination). Rhythm and every other control stay fully editable, not read-only, while blocked; the disabled reach is limited to the phrase action. Leaving the unsupported combination re-enables the phrase action and empties, but does not remove, the live region. A profile switch does not clear or regenerate this state by itself. If the switch also invalidates the current phrase against the new active range and register window (see Notation Contract), the switch still applies — the new profile stays selected — but the phrase clears and the workspace returns to **Empty** instead of regenerating, and this `inline-alert alert-notice` stays visible, still explaining why `Generate phrase` is blocked; no generation request runs. A profile switch whose phrase still fits the new range leaves that phrase untouched even while this alert is showing.
- **Offline:** Keep all required generation, notation, controls, and the current phrase available. Do not show an offline blocker because required behavior is browser-local.
