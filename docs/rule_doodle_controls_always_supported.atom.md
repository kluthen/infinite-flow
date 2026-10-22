---
id: rule_doodle_controls_always_supported
status: DRAFT
tags: [v3, release-v3.2, jam, rhythm]
parents:
  - [[rule_doodle_sets_jam_controls]]
dependents: []
layer: BUSINESS
version: 0.1
type: RULE
priority: 1
human_name: Controls Read From a Doodle Always Form a Supported Combination
---

# Controls Read From a Doodle Always Form a Supported Combination

## INTENT
Never let a doodle lead the generator onto settings it cannot generate.

## THE RULE / LOGIC
When the four rhythm values read from the doodle (note density as it generates at the current window width, rhythmic variety, syncopation and silence density) form a combination the generator does not support, rhythmic variety steps up, Strict to Slightly varied to Heavily varied, until they form a supported one; Heavily varied supports every combination. Nothing else moves.

## TECHNICAL INTERFACE
The rhythm values read from the doodle are checked against the supported combinations before the request is built.

## EXPECTATION
- The controls read from any doodle form a supported combination.
- Only rhythmic variety ever moves to reach one, and only upward.
