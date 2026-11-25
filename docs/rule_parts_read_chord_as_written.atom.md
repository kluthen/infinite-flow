---
id: rule_parts_read_chord_as_written
status: REVIEW
priority: 1
human_name: The Parts Read Each Chord as Written
tags: [v4, release-v4.0, session, audio, accompaniment]
layer: BUSINESS
version: 0.1
parents:
  - [[req_accompaniment_parts]]
dependents: []
type: RULE
---

# The Parts Read Each Chord as Written

## INTENT
Make every part agree with the chord the player reads.

## THE RULE / LOGIC
Wherever a part uses a chord's tones, they are the chord as written: its triad, plus its seventh when the phrase's Seventh chords level gave the chord one.

## TECHNICAL INTERFACE
A chord's tones are read from the phrase's harmony events.

## EXPECTATION
- Over a seventh chord, a part may use the seventh; over a triad, it uses only the triad's three notes.
