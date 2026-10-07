---
id: rule_new_session_never_asks_about_favorites
status: DRAFT
type: RULE
layer: BUSINESS
priority: 1
human_name: A New Session Never Asks About Favorites
notes: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed v3 revision of the vision is confirmed.
version: 0.1
tags: [v3, release-v3.0, favorites, session-start]
parents:
  - [[rule_favorite_pins_session]]
dependents: []
---

# A New Session Never Asks About Favorites

## INTENT
Keep starting a session free of interruptions.

## THE RULE / LOGIC
From v3.0, starting a new session never asks for confirmation. Since favorites live in a pinned session, nothing the player marked is lost by starting one, so there is no warning about favorites not yet exported.

## TECHNICAL INTERFACE
Starting a session shows no confirmation dialog, whatever is kept.

## EXPECTATION
- Starting a session never asks for confirmation, even when the last session has favorites that were never exported.
