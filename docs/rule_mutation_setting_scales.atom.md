---
id: rule_mutation_setting_scales
status: DRAFT
type: RULE
priority: 1
tags: [v2, release-v2.1, session, player-controls]
parents:
  - [[req_settings_mutation_flag]]
notes: Captured 2026-10-03 before code in v2 chunk 24 (pre-code capture) from the coding leader plan. The ordered scales follow the catalog order the settings controls show. The tonal center, collection, contour and register scales were proposed by the coding leader and accepted by the owner on 2026-10-03 (D181).
dependents:
  - [[module_settings_mutation]]
layer: BUSINESS
version: 0.1
human_name: What One Grade Means for Each Mutable Setting
---

# What One Grade Means for Each Mutable Setting

## INTENT

Define what moving an eligible setting by one grade means, setting by setting, so every mutation is a small, predictable step.

## THE RULE / LOGIC

A mutation moves one eligible setting by one grade: one step along that setting's own scale, never further.

Ordered settings step to a neighbouring value, in the order the settings controls list them, with no wrap, so at either end of a scale only one direction exists:

- harmonic motion: Static, Gentle diatonic, Active diatonic;
- tension arc: Settled, Lift, Build, Edge;
- note density: Quarter, Eighth, Sixteenth;
- rhythmic variety: Strict, Slightly varied, Heavily varied;
- syncopation: Straight, Occasional offbeats, Active displacement;
- silence density: Sparse, Conversational, Breath-heavy;
- leapiness: Smooth, Shaped, Leaping, Angular;
- arpeggio chaos: Predictable, Varied, Chaotic.

The remaining scales:

- Tonal center (the key as written) moves one step around the circle of fifths, seven semitones up or down, wrapping around the circle, which adds or removes one accidental in the key signature.
- Collection moves within one of two separate scales and never crosses from one to the other. The tonal pair is Major and Minor, one grade apart. The modes, ordered from brightest to darkest, are Lydian, Ionian, Mixolydian, Dorian, Aeolian, Phrygian, Locrian, one note changing at each step, with no wrap.
- Contour has no order, so every other contour (Rising, Falling, Arch, Wandering) is one grade away.
- Register moves along Low, Middle, High with no wrap, and a mutation never lands on Varying. When the register setting is Varying, a mutation steps from the register the session resolved it to, and from then on the setting holds that concrete register.

## TECHNICAL INTERFACE

Each eligible generation setting has a scale that gives, for its current value, the values one grade away from it.

## EXPECTATION

- A mutation of an ordered setting lands on a value next to the current one in the controls' order, and never wraps from one end to the other.
- A tonal-center mutation moves the written key a fifth up or down, adding or removing one accidental.
- A collection mutation moves Major to Minor or back, or a mode to the next brighter or darker mode, and never moves between Major or Minor and a mode.
- A contour mutation lands on any contour other than the current one.
- A register mutation never lands on Varying; from Varying it steps from the register the session resolved, and the setting then holds a concrete register.
