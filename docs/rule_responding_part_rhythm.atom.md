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
version: 0.1
---

# A Fill's Rhythm

## INTENT
Keep each fill short and clear of the lead's return.

## THE RULE / LOGIC
A fill is made of eighth notes, starting one eighth after the rest begins, at most four of them. Its last note lasts until the rest ends or for one beat, whichever is shorter. A rest with room for fewer notes takes fewer.

## TECHNICAL INTERFACE
A fill's rhythm is read from its rest's start and length.

## EXPECTATION
- A fill's first note starts one eighth after its rest begins.
- A fill holds at most four notes, each an eighth long except the last.
- The last note ends when the rest ends or one beat after it starts, whichever comes first.
