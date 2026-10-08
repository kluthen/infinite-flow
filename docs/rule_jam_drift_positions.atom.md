---
id: rule_jam_drift_positions
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.1
human_name: Jam's Drift
tags: [v3, release-v3.2, session, jam, rhythm, melody]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
priority: 1
parents:
  - [[req_jam]]
dependents: []
---

# Jam's Drift

## INTENT
Let the player choose how far a Jam's phrases may wander from the doodle.

## THE RULE / LOGIC
Drift has three positions, closest first: Close, Near (the default) and Free. It is shown only while Jam is on, saved like the options for during a session, set at Idle or in the review, and presets neither hold nor change it. At Close, rhythm candidates with every measure the same as or Close to the doodle's come first, and the melody follows the doodle's moves in direction and size; at Near, every measure at most Near, and the melody follows its directions only; at Free, rhythms keep their seeded order, as without a doodle, and the melody has no preference, only the join from the doodle's last note. With the rhythm lock on, the rhythm part applies to phrase 1 only, through the rhythm nearest the doodle, and the melody part to every phrase.

## TECHNICAL INTERFACE
A three-position drift control, shown while Jam is on.

## EXPECTATION
- Drift starts at Near, survives a reload, and no preset changes it.
- Each position orders rhythm and pitch candidates as stated.
