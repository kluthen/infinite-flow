---
id: rule_join_reads_carried_chord_as_triad
status: REVIEW
version: 0.1
priority: 1
parents:
  - [[req_seventh_chords_level]]
dependents:
  - [[entity_phrase_carry_in]]
layer: BUSINESS
human_name: The Join Reads a Carried Seventh Chord as Its Triad
tags: [v3, release-v3.3, session, phrase-join, chords]
type: RULE
---

# The Join Reads a Carried Seventh Chord as Its Triad

## INTENT

Keep the notes where one phrase ends and the next begins as they are without seventh chords, while the chord itself carries its seventh.

## THE RULE / LOGIC

When a phrase ends under a seventh chord and the next phrase joins it, the next phrase reads the carried final note against the carried chord's triad. A final note on the chord's seventh is a tense note, which the next phrase resolves on its first note as it resolves any tense note, and no run is recognized across the join through that seventh. A leap recovery or a tense note owed across the join settles on a note of the tonic triad. So the final and landing notes of joined phrases are those the same plans give without seventh chords.

## TECHNICAL INTERFACE

The carried final note's chord-tone facts are read against the carried chord's triad.

## EXPECTATION

- A carried final note on the carried chord's seventh is resolved by the next phrase's first note.
- No recognized run crosses a join through a carried seventh.
- A leap recovery or a tense note owed across a join settles on a note of the tonic triad.
