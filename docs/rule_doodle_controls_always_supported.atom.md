---
id: rule_doodle_controls_always_supported
status: REVIEW
tags: [v3, release-v3.2, jam, rhythm]
parents:
  - [[rule_doodle_sets_jam_controls]]
dependents:
  - [[module_doodle_controls]]
layer: BUSINESS
version: 0.2
type: RULE
priority: 1
human_name: Controls Read From a Doodle Always Form a Supported Combination
---

# Controls Read From a Doodle Always Form a Supported Combination

## INTENT
Never let a doodle lead the generator onto settings it cannot generate.

## THE RULE / LOGIC
When the four rhythm values read from the doodle (note density as read, a Sixteenth judged as Sixteenth at every window width, rhythmic variety, syncopation and silence density) form a combination the generator does not support, rhythmic variety steps up, Strict to Slightly varied to Heavily varied, until they form a supported one; Heavily varied supports every combination. Nothing else moves. The step depends on no window width, so the controls read from a doodle are the same at every width; no combination at Eighth is unsupported, so they stay supported when a narrow screen generates a Sixteenth as Eighth.

## TECHNICAL INTERFACE
The rhythm values read from the doodle are checked against the supported combinations before the request is built.

## EXPECTATION
- The controls read from any doodle form a supported combination, judged at the note density as read, and the same combination holds at both window widths.
- Only rhythmic variety ever moves to reach one, and only upward.
