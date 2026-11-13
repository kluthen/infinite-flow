---
id: rule_seventh_chance_same_at_every_degree
status: DRAFT
tags: [v3, release-v3.3, generation, chords]
parents:
  - [[req_seventh_chords_level]]
layer: BUSINESS
version: 0.1
priority: 1
human_name: Every Chord Has the Same Chance of Its Seventh
dependents:
  - [[module_named_stream_pseudorandomness]]
type: RULE
---

# Every Chord Has the Same Chance of Its Seventh

## INTENT
Make no style choice about which chords of a progression take a seventh.

## THE RULE / LOGIC
At a given level every harmony event has the same chance of trying its seventh form first, whatever its degree or its harmonic role: no chord, the degree-5 chord included, is favored. As in jazz, where every chord of a progression may take its seventh, which chords sound with one is left to the draw.

## TECHNICAL INTERFACE
The draw for a harmony event reads the level, the phrase's seed and the event's position in the phrase, never its degree or role.

## EXPECTATION
- At each level, every degree and every harmonic role has the same chance of its seventh form being tried first.
