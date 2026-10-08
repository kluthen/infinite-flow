---
id: rule_figures_resolve_onto_chord_tones
status: DRAFT
version: 0.1
human_name: Every Figure Resolves Once Onto a Chord Tone
tags: [v3, release-v3.1, generation, figures]
parents:
  - [[req_embellishment_figure_levels]]
type: RULE
layer: BUSINESS
priority: 1
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.1 master spec the product owner approved on 2026-10-08. Describes intended v3.1 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
dependents: []
---

# Every Figure Resolves Once Onto a Chord Tone

## INTENT
Keep every decoration resolved, whatever the levels, so favoring figures never leaves a clash hanging.

## THE RULE / LOGIC
Every free figure, at every level, resolves once, onto a chord tone, and no figure spans a chord change. Among free figures, two notes outside the chord in a row are allowed only inside an enclosure, diatonic or chromatic, where the two outer notes surround their target. Tension's scheduled figure keeps its own rules.

## TECHNICAL INTERFACE
The result check accepts a phrase only when each of its figures obeys these limits.

## EXPECTATION
- In every generated phrase, each free figure ends on a chord tone under the chord it began under.
- Two consecutive free-figure notes outside the chord occur only as the two outer notes of an enclosure.
