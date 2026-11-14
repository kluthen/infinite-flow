---
id: rule_seventh_chords_level_steps
status: REVIEW
layer: BUSINESS
priority: 1
dependents:
  - [[module_named_stream_pseudorandomness]]
  - [[service_generation_orchestration]]
type: RULE
version: 0.1
human_name: What Each Seventh Chords Level Does
tags: [v3, release-v3.3, generation, chords]
parents:
  - [[req_seventh_chords_level]]
---

# What Each Seventh Chords Level Does

## INTENT
Make each step of the Seventh chords level an ordered, audible difference in how often seventh chords are heard.

## THE RULE / LOGIC
For each harmony event (one span of one chord, from one chord change to the next; a chord held across a barline is one event), the level decides whether the generator tries the chord's seventh form before its triad form:
- Off: never; triads only, and no draw is made;
- Sometimes: at about 1 in 4 harmony events;
- Favored: at about 1 in 2 harmony events;
- Strongly favored: at every harmony event.
The shares of Sometimes and Favored are starting values, tuned by listening and by the generation-cost check. What is fixed is the order: each step up never makes seventh chords rarer, and Off makes none. Strongly favored gives a clear majority, a seventh on nearly every chord: over a fixed sweep of seeds and settings, at least 3 in 4 harmony events take their seventh form.

## TECHNICAL INTERFACE
The level sets, for each harmony event, whether its seventh form or its triad form is tried first.

## EXPECTATION
- At Off no harmony event takes its seventh form.
- Over a fixed sweep of seeds, the share of harmony events in their seventh form never decreases from Off to Sometimes to Favored to Strongly favored.
- At Strongly favored, at least 3 in 4 harmony events over the sweep take their seventh form.
