---
id: rule_contrasting_part_timing
status: REVIEW
layer: BUSINESS
priority: 1
tags: [v4, release-v4.0, session, audio, accompaniment]
parents:
  - [[req_contrasting_part]]
dependents: []
version: 0.1
human_name: When a Contrasting Note Starts and Ends
type: RULE
---

# When a Contrasting Note Starts and Ends

## INTENT
Let the counter-melody move where the lead does not.

## THE RULE / LOGIC
A chord's contrasting note starts at the chord's start when no lead note starts there; otherwise at the first eighth inside the chord's first two beats where no lead note starts; otherwise at the chord's start. Each note lasts until the next contrasting note starts, and the last one until the phrase ends.

## TECHNICAL INTERFACE
The starts are read from the lead's attacks in the phrase's timeline.

## EXPECTATION
- A contrasting note starts at its chord's start, or at the first eighth of the chord's first two beats where no lead note starts, by the order above.
- The contrasting part sounds without a gap from its first note to the phrase's end.
