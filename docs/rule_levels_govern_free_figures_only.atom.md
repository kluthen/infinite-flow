---
id: rule_levels_govern_free_figures_only
status: DRAFT
type: RULE
version: 0.2
priority: 1
dependents: []
layer: BUSINESS
human_name: Figure Levels Leave Tension's Figure Alone
tags: [v3, release-v3.1, generation, figures, tension]
parents:
  - [[req_embellishment_figure_levels]]
---

# Figure Levels Leave Tension's Figure Alone

## INTENT
Keep every Tension value possible whatever the figure levels.

## THE RULE / LOGIC
The Tension control places at most one figure per phrase of its own, its scheduled figure: optional under Settled and Lift (a passing tone, neighbor tone or appoggiatura), required under Build (a two-note approach in the key) and under Edge (a passing tone, neighbor tone or appoggiatura). Figure levels govern free figures only: Tension keeps its scheduled figure whatever the levels, so with the passing tone Off, Edge still places its required figure and Build its approach. The levels do not reorder Tension's choices: the scheduled appoggiatura stays as rare as before, and raising the appoggiatura's level adds free appoggiaturas.

## TECHNICAL INTERFACE
The figure levels order free-figure candidates only; Tension's scheduled figure is chosen as before.

## EXPECTATION
- With every figure level Off, every Tension value still places its scheduled figure.
- The figure levels do not reorder Tension's choices: its scheduled figure's placements are tried in the same order whatever the levels.
