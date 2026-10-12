---
id: rule_pregeneration_yields_to_player
status: DRAFT
version: 0.2
priority: 1
human_name: Pre-Generation Yields to the Player
parents:
  - [[req_idle_pregeneration]]
type: RULE
layer: BUSINESS
tags: [v3, release-v3.0, idle, generation]
notes: Revised 2026-10-12 to version 0.2 (still DRAFT) by the re-sync to the v3.0 master spec v1.8, approved by the product owner (spec D290, section 8), at the pre-code architecture capture for v3.0 build plan chunk 24: only a background attempt can be cancelled this way, and the player's own requests at Idle are never cancelled, as in v2. Earlier: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls within the vision since version 0.8 (2026-10-08, spec D246).
dependents:
  - [[module_generation_worker_cancellation]]
  - [[module_idle_pregeneration_queue]]
---

# Pre-Generation Yields to the Player

## INTENT
Keep the player from ever waiting behind background work.

## THE RULE / LOGIC
From v3.0, background pre-generation runs only after the generator has warmed up at load, on the same generator the player's requests use. Any request the player makes at Idle cancels the background attempt in progress, the way a dropped attempt is cancelled in a session, so the player's request is served at once. Only a background attempt can be cancelled this way: the player's own requests at Idle are never cancelled, as in v2.

## TECHNICAL INTERFACE
A player request at Idle cancels the running background attempt before it is served; the player's own requests are never cancelled.

## EXPECTATION
- Any player request at Idle cancels a background attempt in progress and does not wait for it.
- A player's own request at Idle is never cancelled.
