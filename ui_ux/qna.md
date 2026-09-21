# Open Questions

- **Q7 — jazz preset harmonic motion:** The preset contract replaces six controls but does not state jazz harmonic-motion default. See `docs/first-release-master-spec.md`, Profile.
- **Q8 — instrument range model:** Which instrument/range profiles are first-release generator inputs, and what concert ranges plus Low, Middle, High, and Varying register policies does each define? This replaces the fixed tenor-only 45–58 assumption. See `docs/first-release-master-spec.md`, Register.
- **Q9 — E-flat display instrument:** The E-flat display must name a written transposition interval and octave. See `docs/first-release-master-spec.md`, MIDI and Notation.
- **Q11 — instrument-switch preservation:** When a profile changes, does “fitting once transposed” mean the unchanged concert-pitch timeline lies in the new active concert range and is only redrawn, or may the source phrase itself be transposed to fit? See `flows/generate-phrase/intent.md`, display mode behavior.
