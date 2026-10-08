---
id: rule_suggestion_named_in_players_family
status: DRAFT
dependents: []
type: RULE
layer: BUSINESS
version: 0.1
priority: 1
human_name: The Suggestion Is Named in the Player's Own Terms
tags: [v3, release-v3.2, jam, key-and-mode-suggestion]
parents:
  - [[req_key_and_mode_suggestion]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
---

# The Suggestion Is Named in the Player's Own Terms

## INTENT
Name the suggestion the way the player's own selection is named.

## THE RULE / LOGIC
With Major or Minor selected, an Ionian answer reads, and sets, Major, and an Aeolian one Minor, since the app's Major and Minor follow the tonal chord plan and its modes the modal one. Any other answer is named as its mode, and Use it then moves the Collection from the Major and Minor group to the modes; the player's confirmation is what allows that, since Vary settings never crosses between the two groups.

## TECHNICAL INTERFACE
The suggestion's label depends on the family of the current Collection.

## EXPECTATION
- With Major or Minor selected, an Ionian or Aeolian answer reads and sets Major or Minor.
- Any other answer is named as its mode.
