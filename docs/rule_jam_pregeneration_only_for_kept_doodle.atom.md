---
id: rule_jam_pregeneration_only_for_kept_doodle
status: DRAFT
type: RULE
layer: BUSINESS
priority: 1
human_name: Jam Mode Generates Ahead Only for a Kept Doodle
parents:
  - [[rule_held_doodle_phrase_one_at_idle]]
version: 0.1
tags: [v3, release-v3.2, jam, idle, generation]
dependents: []
---

# Jam Mode Generates Ahead Only for a Kept Doodle

## INTENT
Prepare a repeat Jam's phrases ahead, exactly as the Jam would play them.

## THE RULE / LOGIC
Jam mode generates phrases ahead at Idle only for its kept doodle: without one, phrase 1 depends on notes played after Start. With one, the phrases generated ahead carry the controls read from the doodle, the steering block, Jam's rhythm lock and its draws exactly as the Jam would, and a change of a Jam setting the generation reads discards them. They never touch session mode's phrases generated ahead.

## TECHNICAL INTERFACE
Jam mode's Idle generates ahead from the kept doodle only.

## EXPECTATION
- Without a kept doodle, Jam mode generates nothing ahead.
- With one, a phrase generated ahead is exactly the phrase the Jam would generate.
- A change of a Jam setting the generation reads discards Jam's phrases generated ahead and never session mode's.
