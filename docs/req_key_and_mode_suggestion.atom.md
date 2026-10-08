---
id: req_key_and_mode_suggestion
status: DRAFT
type: REQUIREMENT
layer: BUSINESS
priority: 1
human_name: The Key and Mode Suggestion
parents:
  - [[req_jam]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
dependents:
  - [[rule_suggestion_candidates]]
  - [[rule_suggestion_ignores_restriction]]
  - [[rule_suggestion_keep_mine]]
  - [[rule_suggestion_named_in_players_family]]
  - [[rule_suggestion_shown_after_jam_only]]
  - [[rule_suggestion_use_it]]
version: 0.1
tags: [v3, release-v3.2, jam, key-and-mode-suggestion]
---

# The Key and Mode Suggestion

## INTENT
Tell the player which key and mode their own idea sounds in, so they can continue it there.

## THE RULE / LOGIC
From v3.2, after a Jam, the review may propose the key and mode the doodle sounds in. The player confirms it, keeps their own, or plays the same doodle again. The player's selected key and mode stay authoritative: the app never switches them on its own, and the suggestion changes no phrase unless the player confirms it, and then only as a change of the key and mode settings; no replay key carries it. Vary settings, when the player has turned it on, keeps moving the key and mode as before.

## TECHNICAL INTERFACE
The review of a Jam may show one suggested key and mode with its actions.

## EXPECTATION
- The key and mode never change because of a suggestion unless the player chooses Use it.
- The suggestion is never recorded in a phrase's inputs.
