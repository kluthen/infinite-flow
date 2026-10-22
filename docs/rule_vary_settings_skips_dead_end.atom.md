---
id: rule_vary_settings_skips_dead_end
status: REVIEW
type: RULE
layer: BUSINESS
priority: 1
human_name: A Dead End Mid-Session Skips One Move
tags: [v3, release-v3.2, session, player-controls]
version: 0.2
parents:
  - [[rule_vary_settings_allowed_groups]]
dependents:
  - [[module_settings_mutation]]
---

# A Dead End Mid-Session Skips One Move

## INTENT
Keep a session running should Vary settings ever be left with no move.

## THE RULE / LOGIC
During a session a reached setting can always step back to where it came from, and the narrow-window step-down never removes the last move, so under today's rules a dead end cannot occur. Should one occur all the same, that move is skipped and recorded in the session history, and the next one is drawn as usual. Nothing stops or fails.

## TECHNICAL INTERFACE
Vary settings skips and records a move it cannot make mid-session.

## EXPECTATION
- A mid-session dead end skips exactly one move, records it in the history, and never stops the session.
