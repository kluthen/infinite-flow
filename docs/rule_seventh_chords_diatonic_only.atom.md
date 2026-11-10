---
id: rule_seventh_chords_diatonic_only
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.1
human_name: Only the Seventh Chords of the Key and Mode
dependents: []
priority: 1
tags: [v3, release-v3.3, generation, chords]
parents:
  - [[req_seventh_chords_level]]
---

# Only the Seventh Chords of the Key and Mode

## INTENT
Keep every seventh chord inside the selected key and mode, as every triad is.

## THE RULE / LOGIC
The seventh chord on scale degree d takes degrees d, d+2, d+4 and d+6 of the selected key and mode (every other note of the scale, four times), so its quality comes from the key and mode. Only four qualities can occur: the major seventh chord (a major triad plus the note a major seventh above the root, C–E–G–B, Cmaj7), the minor seventh chord (a minor triad plus a minor seventh, C–E♭–G–B♭, Cm7), the dominant seventh chord (a major triad plus a minor seventh, C–E–G–B♭, C7) and the half-diminished seventh chord (a diminished triad plus a minor seventh, C–E♭–G♭–B♭, Cm7♭5). Each of the app's modes holds two major sevenths, three minor sevenths, one dominant seventh and one half-diminished seventh, on degrees the mode sets: in C major they are Cmaj7, Dm7, Em7, Fmaj7, G7, Am7 and Bm7♭5. A chord that needs a note outside the key and mode, such as the diminished seventh, the minor-major seventh, an augmented seventh, a borrowed chord or a secondary dominant, never appears. At every level each chord is either its degree's triad or the seventh chord on the same degree, and one phrase may hold both kinds.

## TECHNICAL INTERFACE
The harmony a phrase is generated with holds, for each harmony event, its degree's triad or that degree's seventh chord.

## EXPECTATION
- Above Off, every chord is a triad or the seventh chord on the same degree, built from degrees d, d+2, d+4 and d+6 of the selected key and mode.
- Every seventh chord is a major seventh, minor seventh, dominant seventh or half-diminished seventh chord, as its degrees in the key and mode give.
- No chord holds a note outside the selected key and mode.
