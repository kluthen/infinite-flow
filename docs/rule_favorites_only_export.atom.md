---
id: rule_favorites_only_export
status: DRAFT
notes: v3.2 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): for a Jam session the favorites-only scope opens with the doodle section too (rule_jam_exports_open_with_doodle). Text and status unchanged on purpose: it still describes the running code. Revise it in the change that builds that behaviour, per docs/release/v3.1-v3.2-intent-change-set.md. Earlier: Created 2026-10-07 at DRAFT by the v3.0 spec ingestion, from the v3.0 master spec the product owner approved. Describes intended v3.0 behaviour: nothing of it is built yet, and the running v2.0 code keeps nothing across a reload. It falls within the vision since version 0.8 (2026-10-08, spec D246).
dependents: []
tags: [v3, release-v3.0, export, favorites, changes-in-v3.2]
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
