---
id: rule_figure_level_orders_search
status: DRAFT
version: 0.1
priority: 1
parents:
  - [[req_embellishment_figure_levels]]
type: RULE
human_name: What Each Figure Level Does
tags: [v3, release-v3.1, generation, figures]
dependents:
  - [[rule_figure_draws_reproducible]]
  - [[rule_figure_level_never_a_quota]]
layer: BUSINESS
---

# What Each Figure Level Does

## INTENT
Make a raised level audible, so a favored figure is actually heard instead of appearing only when nothing else works.

## THE RULE / LOGIC
A figure's level decides when the generator tries that figure as a free figure, one it may place anywhere its rules allow:

- Off: never written as a free figure;
- As today: tried after the chord tones, exactly as before v3.1, so it appears only where the chord tones lead nowhere;
- Favored: at about 1 in 4 of the notes where the figure could start, tried before the chord tones;
- Strongly favored: the same at about 1 in 2 of those notes.

The shares 1 in 4 and 1 in 2 are starting values, tuned by listening and by measuring generation cost before v3.1 ships; what is fixed is the order: each level up never makes the figure rarer. Where several figures are drawn at the same note, the one with the higher level is tried first.

## TECHNICAL INTERFACE
Each figure's level is part of the generation request and orders the candidates of the pitch search.

## EXPECTATION
- At Off, a figure never appears as a free figure.
- Over a fixed sweep of seeds, the share of phrases containing a figure never decreases from Off to As today to Favored to Strongly favored, and rises wherever the rhythm leaves the figure room.
- At a note where several figures are drawn, the higher level is tried first.
