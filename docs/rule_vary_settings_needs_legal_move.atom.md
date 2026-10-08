---
id: rule_vary_settings_needs_legal_move
status: DRAFT
human_name: Vary Settings Needs a Move It Can Make
tags: [v3, release-v3.2, session, player-controls]
parents:
  - [[rule_vary_settings_allowed_groups]]
type: RULE
layer: BUSINESS
version: 0.1
priority: 1
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
dependents: []
---

# Vary Settings Needs a Move It Can Make

## INTENT
Never let Vary settings run with nothing it may change.

## THE RULE / LOGIC
Vary settings needs at least one move, from the current settings, onto a supported combination, among the eligible groups: the Rhythm group does not count under the lock, and the Key and mode group counts only for moves inside the restriction in force. When there is none, Vary settings cannot be turned on and says why. When a later change at Idle (the groups, the lock, a preset, a setting) leaves none, Vary settings becomes unavailable and says why, the player's choice kept; it comes back as soon as a move exists again. A session started meanwhile runs without it.

## TECHNICAL INTERFACE
The Vary settings option is unavailable, with its reason, while no legal move exists.

## EXPECTATION
- With no legal move, Vary settings cannot be turned on, or becomes unavailable with its reason while the choice is kept.
- It becomes available again once a legal move exists.
