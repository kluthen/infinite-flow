# Phrase Workspace Handoff

## Layout Tree

```text
app-shell
  workspace-header
    wordmark
    score-context
      meter badge
      tempo readout
      notation-mode segmented control
    regenerate action
  workspace-body
    score-panel
      score-panel header
        phrase label
        generation status
      staff-viewport
        empty, loading, error, or staff-content
          chord-symbol lane
          engraved staff system
          four measure regions
    control-section
      control summary
      control-group row
        foundation group
        rhythm group
        melodic-shape group
        character disclosure
  optional midi-status
```

## Components and Content

- `app-shell` uses `layout-app`; `workspace-header` uses `layout-header`; `workspace-body` uses `layout-workspace`.
- `score-panel` uses `panel-score`; its header uses `score-toolbar`. The visible title is `Four-measure phrase`.
- `staff-viewport` uses `staff-frame`; it renders one `staff-content` unit with exactly four `measure-slot` elements and a semantic SVG music score.
- `chord-symbol` uses the staff notation font or `font-ui` only when the notation engine cannot engrave chord symbols; it is never placed independently from the harmonic event it labels.
- `notation-mode segmented control` uses `segmented-control` with `Concert`, `B-flat`, and `E-flat`. One option is always selected.
- The primary action is `btn btn-primary btn-lg`: `Generate phrase` before a result, otherwise `Regenerate phrase`.
- The below-score control section groups `field-group` instances: foundation (tempo, tonal center, scale or mode, profile, harmonic motion, tension); rhythm (note density, syncopation, silence density); melodic shape (contour, register, leapiness); character (arpeggio chaos).
- The first-load tonal context is C Ionian. Every pitch class is selectable; use sharp labels unless selected-key or mode spelling requires flats. Tempo initially displays 90 BPM and moves in increments of 10 BPM within the pending product bounds.
- The collection menu exposes major, minor, Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, and Locrian.
- The neutral preset selects static harmonic motion, quarter-note density, straight syncopation, sparse rests, arch contour, and middle register. The jazz preset selects eighth-note density, occasional offbeats, conversational space, wandering contour, and varying register.
- Arpeggio chaos exposes `Predictable`, `Varied`, and `Chaotic`: orderly ascending or descending chord-tone direction; slight inversions and reordering; and the strongest permitted reordering respectively. It never bypasses profile, contour, range, or resolution constraints.
- Discrete settings use `segmented-control`; tempo uses `input-stepper`. Every control has a `field-label`, selected-value feedback, and an accessible description.

## Notation Contract

- `staff-content` renders in the selected display mode from concert-pitch events. Concert uses bass clef; B-flat and E-flat use treble clef.
- The score includes the applicable clef, key signature, 4/4 signature, rhythmic glyphs, rests, beams, ties, accidentals, barlines, and chord symbols. Chord symbols follow the selected display mode.
- `measure-slot` boundaries represent real measure extents from engraving layout. They do not invent beat positions or vertically place pitch glyphs in CSS.
- The layout refuses to show a phrase until all four measure durations validate. A phrase must not be cut off, horizontally scrolled, or split across staff systems at supported breakpoints.

## Responsive Behavior

- At `bp-mobile-landscape`, use one full-width score row above a stacked `control-section`. The header retains notation mode and the primary action; wordmark reduces to `brand-mark`. The score remains a single four-measure staff system. First load selects B-flat display notation.
- At `bp-tablet-landscape`, use one full-width score row above a `control-group-row` that wraps as needed. The controls scroll with the page; `staff-viewport` receives the whole inline size.
- At `bp-desktop`, use the same vertical structure. Orient control groups horizontally across the page and give `staff-viewport` its maximum available inline space; do not add a side rail or third content column.
- At `bp-portrait-guard`, replace the workspace with `orientation-notice` and preserve no interactive score layout.

## States

- **Empty:** `staff-frame staff-empty` shows a short instruction and `btn-primary` without fake notes or placeholder music.
- **Loading:** `staff-frame staff-loading` retains the staff frame and status text; controls are contextually disabled with `is-loading`; the previous valid `staff-content` remains visible during regeneration.
- **Ready:** `staff-frame staff-ready` presents all four engraved measures and chord symbols. `staff-content` uses the defined fade replacement policy.
- **Generation error:** `inline-alert alert-error` appears in `score-toolbar` with retry via `btn-primary`; retain the prior valid score.
- **Notation error:** `staff-frame staff-error` replaces only the affected score content with an error message and retry action; retain the phrase request context.
- **Display switch:** selected segment shows `is-selected`; replace `staff-content` only after the alternate notation has been correctly engraved.
- **Optional MIDI:** `midi-indicator` uses quiet match or mismatch feedback. Mismatch has no note-name or pitch-value content.
