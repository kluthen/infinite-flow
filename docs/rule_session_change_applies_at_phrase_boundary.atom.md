---
id: rule_session_change_applies_at_phrase_boundary
status: DRAFT
type: RULE
layer: BUSINESS
human_name: Mid-Session Setting Changes Apply at a Phrase Boundary
dependents:
  - [[rule_automatic_change_updates_controls_quietly]]
  - [[rule_key_change_drops_harmonic_carry_in]]
version: 0.1
priority: 1
tags: [v2, release-v2.0, session, player-controls]
parents:
  - [[rule_session_settings_locked]]
---

# Mid-Session Setting Changes Apply at a Phrase Boundary

## INTENT
Never change a note already on screen when a setting changes during a session.

## THE RULE / LOGIC
Whichever automatic source changes a setting during a session, the change applies at the next phrase boundary: the first phrase that has not yet started sounding. If a look-ahead phrase was already generated with the old settings, it is discarded and regenerated with the new ones, provided at least one measure remains before its deadline; otherwise the change applies one phrase later than that. A change is therefore only ever visible starting at the first phrase that has not begun sounding, and no note already on screen ever changes.

## TECHNICAL INTERFACE
A mid-session setting change is queued for the next phrase boundary; a waiting look-ahead phrase generated with the old settings is regenerated when time allows.

## EXPECTATION
- A setting change during a session first appears in the first phrase that has not begun sounding, or one phrase later when fewer than one measure remains before that phrase's deadline.
- No note already on screen ever changes because of a setting change.
