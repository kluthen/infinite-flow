---
id: rule_density_mutation_steps_from_generated_density
status: REVIEW
layer: BUSINESS
version: 0.1
tags: [v2, release-v2.0, part-v2.1, session, rhythm]
parents:
  - [[req_settings_mutation_flag]]
dependents:
  - [[module_settings_mutation]]
priority: 1
human_name: Density Mutation Steps From the Generated Density
type: RULE
---

# Density Mutation Steps From the Generated Density

## INTENT

Make a note-density mutation change what is actually generated.

## THE RULE / LOGIC

A note-density mutation steps from the density a phrase is actually generated with, not from the chosen value. So in a session that generates with Eighth because a chosen Sixteenth stepped down under the window-width rule, a note-density mutation moves one grade away from Eighth, Sixteenth staying unavailable to it, and never takes the chosen Sixteenth as its starting point, from which a step down to Eighth would change nothing generated.

## TECHNICAL INTERFACE

A note-density mutation reads the density the session generates with as its starting grade.

## EXPECTATION

- In a session generating with Eighth under the window-width rule, a note-density mutation steps from Eighth, and the phrase generated after it differs in note density from Eighth.
- Where no step-down applies, a note-density mutation steps from the chosen value, which is then also the density generated with.
