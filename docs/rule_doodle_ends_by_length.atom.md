---
id: rule_doodle_ends_by_length
status: DRAFT
human_name: A Doodle Lasts at Most Four Measures
tags: [v3, release-v3.2, session, jam]
parents:
  - [[req_jam]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
dependents: []
layer: BUSINESS
priority: 1
type: RULE
version: 0.1
---

# A Doodle Lasts at Most Four Measures

## INTENT
Keep a doodle short enough to be one idea, and keep the Jam moving.

## THE RULE / LOGIC
When the doodle's fourth measure ends, the doodle ends, whatever is sounding. A note still held is cut at that barline. The next measure is the generation measure.

## TECHNICAL INTERFACE
Capture stops at the end of the doodle's fourth measure.

## EXPECTATION
- A doodle never exceeds four measures; a note held past the fourth barline is cut there.
