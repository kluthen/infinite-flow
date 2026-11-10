---
id: rule_carried_seventh_chord_compared_by_triad
status: DRAFT
layer: BUSINESS
version: 0.1
priority: 1
human_name: A Carried Seventh Chord Is Judged by Its Triad
tags: [v3, release-v3.3, session, phrase-join, chords]
dependents:
  - [[entity_phrase_carry_in]]
type: RULE
parents:
  - [[req_seventh_chords_level]]
---

# A Carried Seventh Chord Is Judged by Its Triad

## INTENT
Never let a seventh by itself break the join between two phrases.

## THE RULE / LOGIC
A phrase's final chord, carried into the next phrase, may be a seventh chord. It is accepted across the join and compared with the next phrase's settings by its triad: its degree, its three notes and their quality. Whether a seventh was added is a draw of the phrase, not a property of the settings, so it never by itself makes the carried chord unfit. A key or mode change, or a harmonic motion change whose settings never end a phrase on the carried chord's triad, still drops the harmonic part of carry-in, as for a triad.

## TECHNICAL INTERFACE
Carry-in's final harmony event may hold a seventh chord; its fit is judged on its triad.

## EXPECTATION
- A carried seventh chord crosses the join when its triad fits the next phrase's settings.
- A carried seventh chord whose triad no longer fits, or any carried chord after a key or mode change, is dropped as a triad would be.
- A carried chord that is neither a triad nor the seventh chord on the same degree is refused.
