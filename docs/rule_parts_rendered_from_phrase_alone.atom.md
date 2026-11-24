---
id: rule_parts_rendered_from_phrase_alone
status: DRAFT
priority: 1
parents:
  - [[req_accompaniment_parts]]
dependents:
  - [[module_accompaniment_arranger]]
type: RULE
layer: BUSINESS
version: 0.1
human_name: Each Part Is Rendered From Its Phrase Alone
tags: [v4, release-v4.0, session, audio, accompaniment]
---

# Each Part Is Rendered From Its Phrase Alone

## INTENT
Keep every part a function of the written phrase, so it never depends on what comes next or on how the player plays.

## THE RULE / LOGIC
Each part is rendered per phrase from that phrase alone: its timeline (the lead), its harmony, its register window and its scale. No part reads the next phrase, and no part reads the notes the player plays.

## TECHNICAL INTERFACE
A part's notes are computed from the phrase's own timeline, harmony, window and scale.

## EXPECTATION
- A phrase's parts are the same whatever phrase follows it.
- A phrase's parts are the same whatever the player plays.
