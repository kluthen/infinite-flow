---
id: rule_session_change_applies_at_phrase_boundary
status: DRAFT
type: RULE
layer: BUSINESS
human_name: Mid-Session Setting Changes Apply at a Phrase Boundary
dependents:
  - [[rule_automatic_change_updates_controls_quietly]]
  - [[rule_harmony_change_drops_unfit_harmonic_carry_in]]
  - [[rule_key_change_drops_harmonic_carry_in]]
  - [[rule_mutation_lands_on_scheduled_phrase]]
  - [[rule_register_change_replaces_carried_window]]
  - [[rule_setting_change_rechecks_pitch_carry_in]]
  - [[service_session_engine]]
version: 0.2
priority: 1
tags: [v2, release-v2.1, session, player-controls]
parents:
  - [[rule_session_settings_locked]]
---

# Mid-Session Setting Changes Apply at a Phrase Boundary

## INTENT

Never change a note already on screen when a setting changes during a session.

## THE RULE / LOGIC

Whichever automatic source changes a setting during a session, the change applies at the next phrase boundary: the first phrase that has not yet started sounding. A look-ahead phrase already generated with the old settings is discarded and regenerated with the new ones only when none of it is on screen yet and at least one measure remains before its deadline. Otherwise, when some of it is already drawn as read-ahead or less than a measure remains, it stays as it is and the change applies from the phrase after it. A change is therefore only ever visible starting at the first phrase that has not begun sounding, or at the phrase after it, and no note already on screen ever changes because of a setting change.

## TECHNICAL INTERFACE

A mid-session setting change is queued for the next phrase boundary; a waiting look-ahead phrase generated with the old settings is regenerated only while none of it is drawn and at least a measure remains before its deadline.

## EXPECTATION

- A setting change during a session first appears in the first phrase that has not begun sounding, or in the phrase after it when that phrase is already partly drawn as read-ahead or fewer than one measure remains before its deadline.
- A look-ahead phrase of which any part is already on screen is never discarded because of a setting change.
- No note already on screen ever changes because of a setting change.
