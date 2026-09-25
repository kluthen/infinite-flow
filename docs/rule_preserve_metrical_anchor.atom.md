---
id: rule_preserve_metrical_anchor
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.2
priority: 2
dependents:
  - [[api_rhythm_domain_expansion]]
  - [[entity_rhythm_candidate_domain]]
  - [[mechanic_syncopation_enumeration]]
  - [[mechanic_syncopation_translation]]
  - [[module_rhythm_domain_validation]]
human_name: Preserve Metrical Anchor
tags: rhythm,syncopation,pulse
parents:
  - [[req_four_measure_phrase]]
---

# Preserve Metrical Anchor

## INTENT
Keep the pulse perceptible in every generated bar.

## THE RULE / LOGIC
Each bar preserves at least one metrical anchor: a note sounding on beat 1 or beat 3 (bar-relative tick 0 or 8). The note may be a fresh attack there or a tied note carried through that beat; a rest there does not count. Syncopation may place selected events offbeat or sustain events across stronger beats, but it cannot erase the pulse.

## TECHNICAL INTERFACE
Syncopation control influences event placement within the selected subdivision grid.

## EXPECTATION
Every generated bar contains at least one metrical anchor, including when active syncopation is selected. A bar whose only anchor is a tie continuation is valid.
