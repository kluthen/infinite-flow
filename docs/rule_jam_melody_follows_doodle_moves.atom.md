---
id: rule_jam_melody_follows_doodle_moves
status: DRAFT
version: 0.1
priority: 1
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
dependents: []
type: RULE
human_name: A Jam's Melody Follows the Doodle's Moves
tags: [v3, release-v3.2, session, jam, melody]
parents:
  - [[req_jam]]
layer: BUSINESS
---

# A Jam's Melody Follows the Doodle's Moves

## INTENT
Give the phrases the same ups and downs as the doodle.

## THE RULE / LOGIC
Pitch candidates are ordered to follow the doodle's moves: for each note of a phrase, the next move of the doodle (up, down or the same note; a step of 1 or 2 half steps, a skip of 3 or 4, or a leap of 5 or more), cycled in order. The drift position decides how much: direction and size at Close, direction only at Near, nothing at Free. The preference orders candidates within each rank of the existing order (chord tones first, and favored figures where they are drawn), never across ranks.

## TECHNICAL INTERFACE
Pitch candidates are ordered by agreement with the doodle's next move within each existing rank.

## EXPECTATION
- At Close, candidates matching the doodle's next direction and size come first within their rank; at Near, its direction; at Free, no preference.
- The preference never moves a candidate across ranks.
