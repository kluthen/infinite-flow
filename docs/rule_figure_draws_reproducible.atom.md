---
id: rule_figure_draws_reproducible
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.1
human_name: Figure Draws Reproduce Everywhere
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.1 master spec the product owner approved on 2026-10-08. Describes intended v3.1 behaviour: nothing of it is built yet. It falls within the vision since version 0.8 (2026-10-08, spec D246).
dependents: []
priority: 1
tags: [v3, release-v3.1, generation, figures, determinism]
parents:
  - [[rule_figure_level_orders_search]]
  - [[rule_seeded_phrase_reproduction]]
---

# Figure Draws Reproduce Everywhere

## INTENT
Keep every phrase reproducible from its inputs once figure levels exist.

## THE RULE / LOGIC
Which notes a Favored or Strongly favored figure is tried first at is drawn from the phrase's seed and the note's position, with whole-number arithmetic only, so every supported browser on every machine draws the same notes. The figure levels are part of what a phrase is generated from: a phrase reproduces from its inputs, a phrase generated ahead at Idle equals the one the session would generate, and a kept session's inputs say how each of its phrases was made.

## TECHNICAL INTERFACE
The figure levels travel in every phrase's generation request; the draws are computed inside generation from the seed.

## EXPECTATION
- The same request, figure levels included, and the same seed give the same phrase in Chrome and Edge, on any machine.
- A pre-generated phrase equals the session's phrase whatever the levels.
