---
id: rule_seventh_chord_symbols
status: DRAFT
layer: BUSINESS
version: 0.1
tags: [v3, release-v3.3, notation, chords]
type: RULE
priority: 1
human_name: Seventh Chord Symbols
parents:
  - [[req_seventh_chords_level]]
dependents:
  - [[rule_seventh_chord_symbols_spoken]]
---

# Seventh Chord Symbols

## INTENT
Name each seventh chord over the staff in the letters the app already writes for chords.

## THE RULE / LOGIC
A seventh chord's symbol is its root followed by a suffix in letters: maj7 for a major seventh (Cmaj7), m7 for a minor seventh (Dm7), 7 for a dominant seventh (G7) and m7♭5 for a half-diminished seventh (Bm7♭5), the flat sign marking the lowered fifth. Signs such as Δ, − and ø are never used. The symbol is shown in the instrument's written pitch: its root moves with the transposition like the notes, and its suffix never changes (a sounding G7 is written A7 for a tenor saxophone). Seventh chord symbols show wherever chord symbols show: the Idle staff, the live session view, the review and a kept session's review, a Jam's included, and the MusicXML export. Two per measure, the longest included, they fit at every supported width without touching each other, crossing a barline or being shrunk. Triad symbols are unchanged.

## TECHNICAL INTERFACE
Chord symbols gain four suffixes, maj7, m7, 7 and m7♭5, one per seventh-chord quality.

## EXPECTATION
- Each seventh chord shows its root and the suffix maj7, m7, 7 or m7♭5, in written pitch.
- Seventh chord symbols show on the Idle staff, in the live view, in the review and in kept sessions' reviews.
- At every supported width, two symbols per measure, the longest included, fit without touching, crossing a barline or being shrunk.
- Triad symbols are as before.
