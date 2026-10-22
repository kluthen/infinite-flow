---
id: rule_jam_steering_block
status: DRAFT
dependents:
  - [[entity_steering_block]]
type: RULE
layer: BUSINESS
tags: [v3, release-v3.2, jam, generation, privacy]
parents:
  - [[rule_doodle_only_orders_candidates]]
version: 0.2
priority: 1
human_name: The Generator Never Hears of a Doodle
---

# The Generator Never Hears of a Doodle

## INTENT
Keep one generator for both modes, and keep the player's own notes out of what it reads.

## THE RULE / LOGIC
Everything the doodle steers is derived on Jam's side and reaches the generator as plain data: the controls read from the doodle, the join into phrase 1 from the doodle's last note, and one optional steering block. The steering block holds a target rhythm (the note starts and rest starts of each of the phrase's four measures, in sixteenths, the doodle's measures laid over them) with a band, how far a candidate may be and still count as near, and a list of melodic moves in the doodle's order (up, down or the same note; a step, a skip or a leap) with a strength (size and direction, direction only, or none); the drift sets the band and the strength. It holds no pitch. The generator reads it at two points only: ordering the rhythm candidates right after their seeded ranking, and one more preference in the pitch order, below the existing ranks. No doodle, no drift and no mention of Jam reaches the generator, and a request without a steering block is generated exactly as before the steering block existed.

## TECHNICAL INTERFACE
A generation request may hold one optional steering block of rhythm positions and kinds of move, with no pitch.

## EXPECTATION
- A steering block holds no pitch.
- No generation request holds a doodle or a drift.
- A request without a steering block gives the same phrase as before v3.2.
