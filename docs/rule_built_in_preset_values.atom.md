---
id: rule_built_in_preset_values
status: REVIEW
version: 0.1
parents:
  - [[req_presets]]
dependents:
  - [[module_preset_model]]
type: RULE
layer: BUSINESS
priority: 1
human_name: The Eight Built-In Presets
tags: [v3, release-v3.1, player-controls, presets, figures]
---

# The Eight Built-In Presets

## INTENT
Give every persona a ready starting point, from a gentle warm-up to dense, decorated styles.

## THE RULE / LOGIC
v3.1 ships eight built-in presets with exactly these values. Controls are listed in the order harmonic motion, tension, note density, rhythmic variety, syncopation, silence density, contour, register, leapiness, arpeggio chaos; then the figure levels.

- Neutral, any key and mode: Gentle diatonic, Lift, Quarter, Slightly varied, Straight, Sparse, Arch, Middle, Shaped, Varied; passing, accented passing and neighbor tone As today; every other figure Off.
- Jazz, any key and mode: Gentle diatonic, Lift, Eighth, Slightly varied, Occasional offbeats, Conversational, Wandering, Varying, Shaped, Varied; passing, accented passing and neighbor tone, chromatic approach and chromatic enclosure As today; appoggiatura and diatonic enclosure Off.
- Gentle, any key and mode: Static, Settled, Quarter, Strict, Straight, Conversational, Arch, Middle, Smooth, Predictable; passing and neighbor tone As today; every other figure Off.
- Speed drill, any key and mode: Active diatonic, Lift, Sixteenth, Heavily varied, Occasional offbeats, Sparse, Wandering, Varying, Leaping, Chaotic; passing, accented passing and neighbor tone, appoggiatura, diatonic enclosure and chromatic approach Favored; chromatic enclosure As today.
- Reel, any key, Mixolydian or Dorian: Gentle diatonic, Settled, Eighth, Strict, Straight, Sparse, Arch, Middle, Shaped, Varied; passing and neighbor tone Favored; accented passing tone As today; every other figure Off.
- Bebop, any key, Major: Active diatonic, Build, Eighth, Strict, Occasional offbeats, Sparse, Wandering, Varying, Leaping, Varied; passing, accented passing and neighbor tone As today; diatonic enclosure Favored; chromatic approach and chromatic enclosure Strongly favored; appoggiatura Off.
- Pop song, any key, Major: Gentle diatonic, Lift, Eighth, Heavily varied, Occasional offbeats, Conversational, Arch, Middle, Shaped, Varied; passing, accented passing and neighbor tone As today; appoggiatura Favored; every other figure Off.
- Modal (Dorian), any key, Dorian: Gentle diatonic, Lift, Eighth, Slightly varied, Occasional offbeats, Conversational, Wandering, Varying, Leaping, Varied; passing and neighbor tone Favored; accented passing tone As today; every other figure Off.

Neutral and Jazz therefore now also hold Tension Lift, Leapiness Shaped and Arpeggio chaos Varied, their earlier first-load values, so choosing either resets those three. The names are working names: each built-in preset is known by a fixed internal identifier, so a later version may rename one without breaking a saved selection or a Custom base. No built-in preset holds a rhythm combination the generator does not support, at Sixteenth or stepped down to Eighth.

## TECHNICAL INTERFACE
Eight built-in presets, each with a fixed internal identifier, hold these values.

## EXPECTATION
- Each built-in preset holds exactly these values and this restriction.
- Each is a supported rhythm setting at Sixteenth and when stepped down to Eighth, and generates in every mode its restriction allows.
