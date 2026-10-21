---
id: rule_jam_drift_positions
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.2
human_name: Jam's Drift
tags: [v3, release-v3.2, session, jam, rhythm, melody]
priority: 1
parents:
  - [[req_jam]]
dependents: []
---

# Jam's Drift

## INTENT
Let the player choose how far a Jam's phrases may wander from the doodle.

## THE RULE / LOGIC
Drift has three positions, closest first: Close, Near (the default) and Free. It is one of Jam's own settings: shown in Jam mode only, set at Jam mode's Idle and saved with Jam's settings; presets neither hold nor change it. It reaches the generator only as the steering block's band and strength. At Close, rhythm candidates with every measure the same as or Close to the doodle's come first, and the melody follows the doodle's moves in direction and size; at Near, every measure at most Near, and the melody follows its directions only; at Free, rhythms keep their seeded order, as without a doodle, and the melody has no preference, only the join from the doodle's last note. With Jam's rhythm lock on, the rhythm part applies to phrase 1 only, through the rhythm nearest the doodle, and the melody part to every phrase.

## TECHNICAL INTERFACE
A three-position drift control among Jam's settings.

## EXPECTATION
- Drift starts at Near, survives a reload, and is shown in Jam mode only.
- Each position orders rhythm and pitch candidates as stated.
