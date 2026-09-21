---
id: rule_preserve_metrical_anchor
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.1
priority: 2
dependents: []
human_name: Preserve Metrical Anchor
tags: rhythm,syncopation,pulse
parents:
  - [[req_four_measure_phrase]]
---

# Preserve Metrical Anchor

## INTENT
Keep the pulse perceptible in every generated bar.

## THE RULE / LOGIC
Each bar preserves at least one metrical anchor. Syncopation may place selected events offbeat or sustain events across stronger beats, but it cannot erase the pulse.

## TECHNICAL INTERFACE
Syncopation control influences event placement within the selected subdivision grid.

## EXPECTATION
Every generated bar contains at least one metrical anchor, including when active syncopation is selected.
