---
id: rule_jam_setting_change_rewrites_kept_phrase_one
status: DRAFT
type: RULE
layer: BUSINESS
parents:
  - [[rule_held_doodle_phrase_one_at_idle]]
version: 0.1
priority: 1
human_name: A Jam Setting Changed at Idle Rewrites the Kept Doodle's Phrase 1
tags: [v3, release-v3.2, jam, idle, player-controls]
dependents: []
---

# A Jam Setting Changed at Idle Rewrites the Kept Doodle's Phrase 1

## INTENT
Never start a Jam on a phrase 1 the settings no longer describe, and never lose the doodle for it.

## THE RULE / LOGIC
With a kept doodle, a change at Jam mode's Idle of any Jam setting phrase 1 is written from (every Jam setting but the tempo: key and mode, drift, rhythm lock, allowed rhythm changes, harmonic motion, tension and the Embellishments level) writes phrase 1 again from the kept doodle at once and discards the phrases generated ahead for it, so Start never plays a phrase 1 the settings no longer describe, and a Jam never meets the question asked when the phrase on screen is out of date. The doodle stays kept, and so do the controls read from it. A tempo change, tap-in included, changes no phrase.

## TECHNICAL INTERFACE
A change of a Jam setting at Idle with a kept doodle regenerates phrase 1 from it.

## EXPECTATION
- At Jam mode's Idle with a kept doodle, changing any Jam setting but the tempo writes a new phrase 1 from the doodle at once, keeping the doodle and its controls.
- A Jam never asks whether the phrase on screen is out of date.
- A tempo change leaves phrase 1 as it is.
