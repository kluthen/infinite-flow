---
id: rule_neutral_and_jazz_figure_levels
status: DRAFT
version: 0.1
priority: 1
human_name: Neutral and Jazz Keep Their Sound
tags: [v3, release-v3.1, generation, figures, presets, determinism]
dependents: []
type: RULE
layer: BUSINESS
parents:
  - [[req_embellishment_figure_levels]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.1 master spec the product owner approved on 2026-10-08. Describes intended v3.1 behaviour: nothing of it is built yet. It falls within the vision since version 0.8 (2026-10-08, spec D246).
---

# Neutral and Jazz Keep Their Sound

## INTENT
Let Neutral and Jazz sound exactly as before v3.1, so every existing phrase and replay stays valid.

## THE RULE / LOGIC
Neutral and Jazz hold these figure levels: passing tone, accented passing tone and neighbor tone As today in both; the free appoggiatura and the diatonic enclosure Off in both; the chromatic approach and the chromatic enclosure Off in Neutral and As today in Jazz. The rule behind it: every figure a style wrote before v3.1 is As today, and every figure new in v3.1 is Off, because adding a candidate, even after the chord tones, changes what the search finds whenever it backs up past them. Off and As today consume no draw, so a phrase whose levels are all Off or As today is searched in exactly the order used before v3.1. Neutral and Jazz at these levels therefore generate exactly what they generated before v3.1 from the same request and seed, still nearly free of decorations; hearing figures takes a raised level, a preset that raises one, or Vary settings.

## TECHNICAL INTERFACE
Neutral's and Jazz's figure levels are fixed values of the two built-in presets.

## EXPECTATION
- Neutral and Jazz hold exactly these levels.
- With them, the same request and seed give exactly the phrase v3.0 gives, on a fixed sweep of seeds and settings in every mode.
