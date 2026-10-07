---
id: rule_my_instrument_transposition_named_interval
status: DRAFT
version: 0.1
priority: 1
human_name: My Instrument's Transposition Is a Named Interval
parents:
  - [[req_my_instrument]]
dependents: []
type: RULE
layer: BUSINESS
tags: [v3, release-v3.0, instrument-profile]
notes: Created 2026-10-07 at DRAFT by the re-sync to the v3.0 master spec v1.3, approved by the product owner. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed v3 revision of the vision is confirmed.
---

# My Instrument's Transposition Is a Named Interval

## INTENT
Spell My instrument's written part correctly, whatever transposition the player gives it.

## THE RULE / LOGIC
From v3.0, My instrument's transposition is chosen by name from a list: unison, minor second, major second, minor third, major third, perfect fourth, augmented fourth, perfect fifth, minor sixth, major sixth, minor seventh or major seventh, plus a number of octaves, with the written pitch above or below the sounding pitch. Each name fixes both the number of semitones and the number of letter-name steps (a major ninth, as for the tenor saxophone, is 14 semitones and 8 steps), and that is how notes, the key signature and chord symbols are spelled in written pitch, exactly as for the built-in profiles. The tritone, 6 semitones, is always spelled as an augmented fourth.

## TECHNICAL INTERFACE
The transposition is entered as a named interval, a number of octaves and a direction (written above or below sounding pitch), never as a bare number of semitones.

## EXPECTATION
- The transposition can only be one of the named intervals, plus whole octaves, written above or below sounding pitch.
- Written notes, the key signature and chord symbols are spelled by the chosen interval's letter-name steps, as for the built-in profiles.
- A 6-semitone transposition is spelled as an augmented fourth.
