---
id: rule_responding_part_rhythm
status: DRAFT
parents:
  - [[req_responding_part]]
layer: BUSINESS
priority: 1
human_name: A Fill's Rhythm
tags: [v4, release-v4.0, session, audio, accompaniment]
dependents: []
type: RULE
version: 0.2
---

# A Fill's Rhythm

## INTENT
Keep each fill short and clear of the lead's return.

## THE RULE / LOGIC
A fill is made of eighth notes, starting one eighth after the rest begins, at most four of them. A note starts only where a whole eighth fits before the rest ends, so a rest with room for fewer notes takes fewer. The last note lasts until the rest ends or for one beat, whichever is shorter.

## TECHNICAL INTERFACE
A fill's rhythm is read from its rest's start and length.

## EXPECTATION
- A fill's first note starts one eighth after its rest begins.
- A fill holds at most four notes, each an eighth long except the last.
- Every fill note starts at least an eighth before its rest ends.
- The last note ends when the rest ends or one beat after it starts, whichever comes first.
