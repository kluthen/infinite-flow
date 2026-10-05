---
id: rule_automatic_change_updates_controls_quietly
status: REVIEW
parents:
  - [[rule_session_change_applies_at_phrase_boundary]]
dependents: []
type: RULE
layer: BUSINESS
priority: 1
version: 0.1
human_name: Automatic Setting Changes Update the Controls Quietly
tags: [v2, release-v2.0, part-v2.1, session, player-controls]
---

# Automatic Setting Changes Update the Controls Quietly

## INTENT
Keep the settings display truthful without pulling the player's attention away from the music.

## THE RULE / LOGIC
When an automatic change lands during a session, the settings controls update to show what is currently in effect, but with no highlight, no scroll and no screen shift, so the player's attention stays on what is coming rather than on what just changed behind them.

## TECHNICAL INTERFACE
The read-only settings controls reflect the settings in effect during a session, updating silently.

## EXPECTATION
- After an automatic change lands, the settings controls show the new value.
- The update produces no highlight, scroll or layout shift.
