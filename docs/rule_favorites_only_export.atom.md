---
id: rule_favorites_only_export
status: DRAFT
notes: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed v3 revision of the vision is confirmed.
dependents: []
tags: [v3, release-v3.0, export, favorites]
parents:
  - [[req_favorite_phrases]]
  - [[req_session_export]]
type: RULE
layer: BUSINESS
version: 0.1
priority: 1
human_name: Favorites-Only Export
---

# Favorites-Only Export

## INTENT
Let the player take out only the phrases they liked.

## THE RULE / LOGIC
From v3.0, next to the whole-session scope, the exports offer a favorites-only scope, for the generated notes (MusicXML or MIDI) and for the played notes (MIDI). A favorites-only file holds exactly the session's favorite phrases, in session order, each keeping its session phrase number. A played note held past the end of a favorite phrase stops at that end when the next phrase is not exported. When the session has no favorite, the favorites-only scope is unavailable and says why.

## TECHNICAL INTERFACE
Each export action offers a whole-session or a favorites-only scope.

## EXPECTATION
- A favorites-only file, of either content, holds exactly the favorite phrases, in session order, with their phrase numbers.
- A played note held past a favorite phrase's end stops at that end when the next phrase is not exported.
- With no favorite, the favorites-only scope is unavailable and states the reason.
