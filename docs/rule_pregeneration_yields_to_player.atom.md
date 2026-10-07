---
id: rule_pregeneration_yields_to_player
status: DRAFT
version: 0.1
priority: 1
human_name: Pre-Generation Yields to the Player
parents:
  - [[req_idle_pregeneration]]
type: RULE
layer: BUSINESS
tags: [v3, release-v3.0, idle, generation]
notes: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed v3 revision of the vision is confirmed.
dependents: []
---

# Pre-Generation Yields to the Player

## INTENT
Keep the player from ever waiting behind background work.

## THE RULE / LOGIC
From v3.0, background pre-generation runs only after the generator has warmed up at load, on the same generator the player's requests use. Any request the player makes at Idle cancels the background attempt in progress, the way a dropped attempt is cancelled in a session, so the player's request is served at once.

## TECHNICAL INTERFACE
A player request at Idle cancels the running background attempt before it is served.

## EXPECTATION
- Any player request at Idle cancels a background attempt in progress and does not wait for it.
