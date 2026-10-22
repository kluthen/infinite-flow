---
id: req_key_and_mode_suggestion
status: DRAFT
type: REQUIREMENT
layer: BUSINESS
priority: 1
human_name: The Key and Mode Suggestion
parents:
  - [[req_jam]]
dependents:
  - [[rule_suggestion_candidates]]
  - [[rule_suggestion_ignores_restriction]]
  - [[rule_suggestion_keep_mine]]
  - [[rule_suggestion_named_in_players_family]]
  - [[rule_suggestion_shown_after_jam_only]]
  - [[rule_suggestion_use_it]]
version: 0.2
tags: [v3, release-v3.2, jam, key-and-mode-suggestion]
---

# The Key and Mode Suggestion

## INTENT
Tell the player which key and mode their own idea sounds in, so they can continue it there.

## THE RULE / LOGIC
From v3.2, in Jam mode, after a Jam, the review may propose the key and mode the doodle sounds in. The player uses it for their next Jams on that doodle, keeps their own, or simply goes round again. Jam's selected key and mode stay authoritative: the app never switches them on its own, and the suggestion changes no phrase unless the player confirms it, and then only as a change of Jam's key and mode settings; no replay key carries it, and a confirmed suggestion is recorded as the settings it set. The suggestion never touches session mode's key and mode; in session mode Vary settings, when the player has turned it on, keeps moving the key and mode as before.

## TECHNICAL INTERFACE
The review of a Jam may show one suggested key and mode with Use it and Keep mine.

## EXPECTATION
- Jam's key and mode never change because of a suggestion unless the player chooses Use it.
- The suggestion never changes session mode's key and mode.
- The suggestion is never recorded in a phrase's inputs.
