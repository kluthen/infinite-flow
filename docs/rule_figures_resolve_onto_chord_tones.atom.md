---
id: rule_figures_resolve_onto_chord_tones
status: REVIEW
version: 0.1
human_name: Every Figure Resolves Once Onto a Chord Tone
tags: [v3, release-v3.1, generation, figures]
parents:
  - [[req_embellishment_figure_levels]]
type: RULE
layer: BUSINESS
priority: 1
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
