---
id: rule_doodle_sets_jam_controls
status: DRAFT
priority: 1
tags: [v3, release-v3.2, jam, rhythm, melody, player-controls]
parents:
  - [[req_jam_settings]]
dependents:
  - [[rule_doodle_contour_reading]]
  - [[rule_doodle_controls_always_supported]]
  - [[rule_doodle_leapiness_reading]]
  - [[rule_doodle_note_density_reading]]
  - [[rule_doodle_rhythmic_variety_reading]]
  - [[rule_doodle_silence_density_reading]]
  - [[rule_doodle_sixteenth_on_narrow_screens]]
  - [[rule_doodle_syncopation_reading]]
type: RULE
layer: BUSINESS
version: 0.1
human_name: The Doodle Sets Jam's Rhythm and Shape Controls
---

# The Doodle Sets Jam's Rhythm and Shape Controls

## INTENT
Follow what the player played, not a set of controls they must tune.

## THE RULE / LOGIC
When the doodle ends, before phrase 1 is requested, the app reads seven controls from the quantized doodle, after the very-short-note filter: note density, rhythmic variety, syncopation, silence density, contour, leapiness and register. Each takes the value nearest what the doodle shows, note density first, since rhythmic variety and syncopation read its value. A control the doodle cannot show takes session mode's first-visit value: Quarter, Slightly varied, Straight, Sparse, Arch, Shaped and Middle; a doodle of one note shows only its register. The values are ordinary control values, read once, in whole numbers. They belong to the doodle: they are never saved, they stay with a kept doodle when a Jam setting changes, and the player does not set them in Jam mode.

## TECHNICAL INTERFACE
When the doodle ends, Jam's side maps the quantized doodle to seven control values.

## EXPECTATION
- Every Jam is generated with the seven controls read from its doodle.
- A control the doodle cannot show takes session mode's first-visit value.
- The controls read from a doodle are never saved.
