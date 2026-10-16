# Open Questions

> **Archived 2026-10-16.** Q76, raised for v3.0 by `spec-writer`, is closed, and v3.0 is released
> as version 3.0.0. Kept verbatim with its section heading. Live summary: [README.md](README.md).
> Text was written from `ui_ux/`.

## v3.0, for `ux-writer` (raised 2026-10-09 by `spec-writer`)

- **Q76 — My instrument's sheet must show the transposition's derived interval name.** **Closed
  2026-10-12 by ux D285** (the name leads the transposition's line; compound names with their
  octave in brackets; the check's confirmation uses the same line). The owner
  ruled (spec D253, master spec §7.1, v1.5) that the transposition is entered as a number of
  octaves and a signed semitone count, never chosen by interval name, and that the interval name
  is derived and shown as the result. The `Sounds` stepper ("{n} lower", "Same", "{n} higher",
  `screens/my-instrument/handoff.md`) now matches the spec; what the design lacks is the derived
  name, shown with the stepper and updated on every step (14 lower: a major ninth lower; 9 lower:
  a major sixth lower; Same: no transposition). Three points for the design: (1) the name comes
  from §7.1's fixed table (0 unison, 1 minor second … 6 augmented fourth, never "tritone" or
  "diminished fifth" … 11 major seventh, plus octaves); how a compound name is worded on screen
  (a major ninth, or a major second plus an octave) is the design's call, for a beginner;
  (2) `screens/my-instrument/intent.md`'s "Interval names were rejected" reasoning needs
  revising: names are still never entered, but they are now shown; (3) the one stepper stays:
  the owner settled (spec D257, master spec §7.1, v1.6) that the transposition is entered with the
  design's single stepper counting semitones across octaves, one direction for the whole
  transposition, octaves included (12 lower is one octave lower), with the derived name beside
  it, not with separate octave and semitone inputs.
  The check's confirmation (`flows/controller-connection/`, "Use this for my instrument") may
  show the same name. Blocks build plan chunk 20, not chunk 16.
