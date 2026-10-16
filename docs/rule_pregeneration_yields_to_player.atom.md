---
id: rule_pregeneration_yields_to_player
status: REVIEW
version: 0.2
priority: 1
human_name: Pre-Generation Yields to the Player
parents:
  - [[req_idle_pregeneration]]
type: RULE
layer: BUSINESS
tags: [v3, release-v3.0, idle, generation]
dependents:
  - [[module_generation_worker_cancellation]]
  - [[module_idle_pregeneration_queue]]
  - [[service_idle_generation_session]]
---

# Pre-Generation Yields to the Player

## INTENT
Keep the player from ever waiting behind background work.

## THE RULE / LOGIC
From v3.0, background pre-generation's requests go to the same generator the player's requests use, posted after the generator's warm-up at load has been posted; the generator serves them between warm-up steps, as it serves the player's, so pre-generation does not wait for the warm-up to finish. Any request the player makes at Idle cancels the background attempt in progress, the way a dropped attempt is cancelled in a session, so the player's request is served at once. Only a background attempt can be cancelled this way: the player's own requests at Idle are never cancelled, as in v2.

## TECHNICAL INTERFACE
A player request at Idle cancels the running background attempt before it is served; the player's own requests are never cancelled.

## EXPECTATION
- Any player request at Idle cancels a background attempt in progress and does not wait for it.
- A player's own request at Idle is never cancelled.
