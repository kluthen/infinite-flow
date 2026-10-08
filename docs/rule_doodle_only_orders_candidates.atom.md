---
id: rule_doodle_only_orders_candidates
status: DRAFT
layer: BUSINESS
version: 0.1
priority: 1
human_name: The Doodle Only Orders the Generator's Choices
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
dependents: []
type: RULE
tags: [v3, release-v3.2, session, jam, generation]
parents:
  - [[req_jam]]
---

# The Doodle Only Orders the Generator's Choices

## INTENT
Let the doodle shape the phrases without ever overriding the player's settings or the generator's rules.

## THE RULE / LOGIC
The doodle changes no setting and never switches the key or mode: the controls stay as the player set them, and the doodle only decides which of the candidates those controls allow are tried first. Every phrase possible without a doodle stays possible. The preference never overrides a rule: it applies after the rules the controls set (contour, leapiness, the register window), which still decide what is allowed. The doodle never shapes the chords, which are planned before any rhythm or pitch, and no later stage of generation ever revises an earlier one's output.

## TECHNICAL INTERFACE
The doodle enters generation as an ordering of rhythm and pitch candidates and an input to register resolution.

## EXPECTATION
- Every phrase of a Jam obeys every rule its settings impose.
- The doodle changes neither the chord plans considered nor their order.
