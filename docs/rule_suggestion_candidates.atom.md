---
id: rule_suggestion_candidates
status: DRAFT
version: 0.1
parents:
  - [[req_key_and_mode_suggestion]]
layer: BUSINESS
priority: 1
human_name: How the Suggestion Weighs Keys and Modes
tags: [v3, release-v3.2, jam, key-and-mode-suggestion]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls within the vision since version 0.8 (2026-10-08, spec D246).
dependents:
  - [[rule_doodle_outside_modes_told]]
  - [[rule_suggestion_same_doodle_same_answer]]
  - [[rule_suggestion_withheld]]
type: RULE
---

# How the Suggestion Weighs Keys and Modes

## INTENT
Find the keys and modes the doodle most likely sounds in, without favouring the player's current choice.

## THE RULE / LOGIC
The input is the quantized doodle, after the very-short-note filter; lengths are counted in sixteenths, so the whole computation stays in whole numbers. All 84 key and mode pairs are scored (12 keys with the 7 modes Ionian to Locrian; Major and Minor are scored as Ionian and Aeolian). Each note scores by its role in the candidate, weighted by its length: home note 0.200, fifth 0.165, third 0.145, each of the other four notes 0.1175, a note outside the mode 0.004. The last note counts twice and the first one and a half times when it is the candidate's home note; a note starting on beat 1 or 3 counts one and a half times; lengths count between half a beat and a beat and a half. These are starting values, checked at the owner's listening check. All seven modes have equal chances beforehand, and the player's current selection gets no head start. At most 3 candidates are kept, each within half the best one's chance, ties ordered by score, then home note C to B, then mode Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian, Locrian, so a three-way cut is always the same. The computation is done in concert pitch and the answer named in written pitch.

## TECHNICAL INTERFACE
The suggestion scores 84 key and mode pairs from the quantized doodle and keeps up to three.

## EXPECTATION
- At most three candidates are kept, each within half the best one's chance.
- The current selection never changes the scores.
