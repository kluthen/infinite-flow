---
id: rule_doodle_rhythmic_variety_reading
status: DRAFT
version: 0.1
priority: 1
human_name: Rhythmic Variety Read From the Doodle
tags: [v3, release-v3.2, jam, rhythm]
parents:
  - [[rule_doodle_sets_jam_controls]]
dependents: []
type: RULE
layer: BUSINESS
---

# Rhythmic Variety Read From the Doodle

## INTENT
Give a Jam as steady or as varied a rhythm as the doodle has.

## THE RULE / LOGIC
A note's gap is the time in sixteenths from its start to the next note's start; the last note has none. A gap counts as the main value when it equals the note density's value (4 sixteenths for Quarter, 2 for Eighth, 1 for Sixteenth), or is twice it with the note sounding no longer than that value (a note, then a rest of the same value). Rhythmic variety is Strict when every gap counts; Slightly varied when 4 × (gaps that count) ≥ 3 × (gaps); else Heavily varied. A doodle of fewer than 3 notes does not show it.

## TECHNICAL INTERFACE
Rhythmic variety is computed from the gaps between the doodle's note starts and the note density read.

## EXPECTATION
- A doodle whose every gap is the main value reads Strict; one with at least three quarters of its gaps so reads Slightly varied; any other reads Heavily varied.
- A doodle of fewer than three notes takes Slightly varied.
