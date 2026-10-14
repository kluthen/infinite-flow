---
id: rule_suggestion_withheld
status: DRAFT
type: RULE
version: 0.1
priority: 1
human_name: When Nothing Is Suggested
tags: [v3, release-v3.2, jam, key-and-mode-suggestion]
parents:
  - [[rule_suggestion_candidates]]
layer: BUSINESS
dependents: []
---

# When Nothing Is Suggested

## INTENT
Suggest only when there is something worth suggesting, and say nothing otherwise.

## THE RULE / LOGIC
Nothing is suggested, and nothing is shown about it, when the doodle has too little material (fewer than 5 different pitch classes (note names regardless of octave), 6 notes, or 2 beats of sounding time, after the very-short-note filter), since a short doodle is normal, not a failure; or when the player's selection is among the kept candidates, comparing Major as Ionian and Minor as Aeolian, since the doodle then fits it. A Jam whose phrase 1 never came has no review, so no suggestion.

## TECHNICAL INTERFACE
The suggestion is withheld below the material thresholds or when the selection is a kept candidate.

## EXPECTATION
- Below any threshold, or with the selection among the kept candidates, no suggestion and no message appear.
