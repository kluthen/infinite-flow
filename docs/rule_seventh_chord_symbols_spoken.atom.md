---
id: rule_seventh_chord_symbols_spoken
status: REVIEW
dependents: []
type: RULE
version: 0.1
parents:
  - [[rule_seventh_chord_symbols]]
layer: BUSINESS
priority: 1
human_name: Seventh Chord Symbols Are Read as Words
tags: [v3, release-v3.3, notation, accessibility, chords]
---

# Seventh Chord Symbols Are Read as Words

## INTENT

Let a player who listens to the score description hear each seventh chord named plainly.

## THE RULE / LOGIC

The spoken score description reads each seventh chord's suffix as words naming its quality, as it reads m as minor: a major seventh, minor seventh, dominant seventh or half-diminished seventh chord is named as such in words, never by the letters of its suffix. The exact words belong to the interface design.

## TECHNICAL INTERFACE

The spoken description maps each of the four suffixes to words.

## EXPECTATION

- The spoken description of a phrase holding all four seventh chords names each chord's quality in words, never its suffix's letters.
