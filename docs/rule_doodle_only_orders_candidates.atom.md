---
id: rule_doodle_only_orders_candidates
status: DRAFT
layer: BUSINESS
version: 0.2
priority: 1
human_name: The Doodle Sets Jam's Controls, Then Only Orders the Generator's Choices
dependents:
  - [[rule_jam_steering_block]]
type: RULE
tags: [v3, release-v3.2, session, jam, generation]
parents:
  - [[req_jam]]
---

# The Doodle Sets Jam's Controls, Then Only Orders the Generator's Choices

## INTENT
Let the doodle shape the phrases without ever breaking the generator's rules or touching the key and mode.

## THE RULE / LOGIC
The doodle acts on generation in two ways only. First, when it ends, it sets Jam's rhythm and shape controls (note density, rhythmic variety, syncopation, silence density, contour, leapiness and register) as ordinary control values the generator already supports. Then, within those controls, it only decides which of the candidates they allow are tried first: every phrase those controls allow stays possible. It never switches the key or mode. The preference never overrides a rule: it applies after the rules the controls set (contour, leapiness, the register window), which still decide what is allowed. The doodle never shapes the chords, which are planned before any rhythm or pitch, and no later stage of generation ever revises an earlier one's output.

## TECHNICAL INTERFACE
The doodle reaches generation as control values decided before the request is built, and as an ordering of rhythm and pitch candidates.

## EXPECTATION
- Every phrase of a Jam obeys every rule the controls it was generated with impose, and any phrase those controls allow can still be generated.
- The doodle changes neither the key and mode, nor the chord plans considered, nor their order.
