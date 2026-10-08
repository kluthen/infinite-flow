---
id: rule_levels_govern_free_figures_only
status: DRAFT
type: RULE
version: 0.1
priority: 1
dependents: []
layer: BUSINESS
human_name: Figure Levels Leave Tension's Figure Alone
tags: [v3, release-v3.1, generation, figures, tension]
parents:
  - [[req_embellishment_figure_levels]]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.1 master spec the product owner approved on 2026-10-08. Describes intended v3.1 behaviour: nothing of it is built yet. It falls within the vision since version 0.8 (2026-10-08, spec D246).
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
- Changing a figure level never changes which scheduled figure Tension chooses.
