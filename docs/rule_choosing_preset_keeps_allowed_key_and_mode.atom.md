---
id: rule_choosing_preset_keeps_allowed_key_and_mode
status: DRAFT
layer: BUSINESS
version: 0.1
parents:
  - [[rule_key_and_mode_restriction]]
dependents: []
type: RULE
priority: 1
human_name: Choosing a Preset Keeps the Key and Mode When It Can
tags: [v3, release-v3.1, player-controls, presets]
---

# Choosing a Preset Keeps the Key and Mode When It Can

## INTENT
Move the key and mode only as far as a restricted preset needs, and predictably.

## THE RULE / LOGIC
When a preset is chosen, each half of its restriction is applied separately: the current key, or mode, is kept if the restriction allows it; otherwise it becomes that half's first listed value. From G Ionian, choosing a preset meant for Dorian gives G Dorian; from A Aeolian, choosing a preset meant for Mixolydian or Dorian gives A Mixolydian; from E Ionian, choosing a player preset kept to G Dorian gives G Dorian. Keeping the key respects a key usually chosen for the instrument or the piece, and keeping the home note while changing the mode is how modes are usually heard; taking the first listed value keeps the result predictable. A preset whose restriction is any never moves the key or mode, so Neutral and Jazz never do, and at first load, with Neutral selected, C Ionian stays. Choosing a preset is the player's own act: the app still never switches the key and mode by itself.

## TECHNICAL INTERFACE
Choosing a preset applies its restriction to the Written key and Collection controls, half by half.

## EXPECTATION
- An allowed key or mode is kept; a disallowed one becomes its half's first listed value; each half is decided on its own.
- Choosing Neutral or Jazz never moves the key or mode.
