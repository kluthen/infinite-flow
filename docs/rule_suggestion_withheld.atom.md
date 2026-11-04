---
id: rule_suggestion_withheld
status: DRAFT
type: RULE
version: 0.3
priority: 1
human_name: When Nothing Is Suggested
tags: [v3, release-v3.2, jam, key-and-mode-suggestion]
parents:
  - [[rule_suggestion_candidates]]
layer: BUSINESS
dependents:
  - [[module_key_suggestion]]
---

# When Nothing Is Suggested

## INTENT
Suggest only when there is something worth suggesting, and say nothing otherwise.

## THE RULE / LOGIC
Nothing is suggested, and nothing is shown about it, when the doodle has too little material (fewer than 5 different pitch classes (note names regardless of octave), 6 notes, or 2 beats of sounding time, after the very-short-note filter), since a short doodle is normal, not a failure; or, for a doodle that fits a mode well enough, when Jam's key and mode are among the kept candidates, comparing Major as Ionian and Minor as Aeolian, since the doodle then fits them. The cases are judged in order: too little material first, then a doodle that fits no mode well enough, which is told as such (rule_doodle_outside_modes_told) whatever Jam's key and mode are, and only then Jam's key and mode among the kept candidates. A Jam whose phrase 1 never came has no review, so no suggestion.

## TECHNICAL INTERFACE
The suggestion is withheld below the material thresholds, or, for a doodle that fits, when Jam's key and mode are a kept candidate.

## EXPECTATION
- Below any threshold, or with Jam's key and mode among the kept candidates of a doodle that fits, no suggestion and no message appear.
- A doodle that fits no mode well enough is told so even when Jam's key and mode are among its kept candidates, under every Jam key and mode.
