---
id: rule_figure_level_never_a_quota
status: DRAFT
layer: BUSINESS
version: 0.1
priority: 1
tags: [v3, release-v3.1, generation, figures]
parents:
  - [[rule_figure_level_orders_search]]
dependents: []
type: RULE
human_name: A Figure Level Is Never a Quota
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.1 master spec the product owner approved on 2026-10-08. Describes intended v3.1 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
---

# A Figure Level Is Never a Quota

## INTENT
Keep favoring a figure from ever making a phrase impossible or rejected.

## THE RULE / LOGIC
A level only orders the search; it never requires a figure. No phrase is rejected or retried for lacking a favored figure. A favored figure that leads to a dead end is backed out of like any other candidate, and the chord tones are tried next.

## TECHNICAL INTERFACE
Phrase acceptance never checks how many figures a phrase holds.

## EXPECTATION
- A phrase found under any levels is accepted whether or not it holds a favored figure.
- No phrase is rejected or regenerated because a favored figure is missing.
