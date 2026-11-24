---
id: rule_parts_never_drawn
status: DRAFT
version: 0.1
priority: 1
human_name: No Part Is Drawn on the Score
parents:
  - [[req_accompaniment_parts]]
tags: [v4, release-v4.0, session, audio, accompaniment]
dependents: []
type: RULE
layer: BUSINESS
---

# No Part Is Drawn on the Score

## INTENT
Keep the score exactly as the player reads it, whatever is sounding.

## THE RULE / LOGIC
No part is drawn as notes: not on the lead's staff, not on a second staff, not as cue notes. The score shows the lead and its chord symbols, the same with any parts on or off.

## TECHNICAL INTERFACE
The notation reads no part.

## EXPECTATION
- The score is the same with any parts on or off.
