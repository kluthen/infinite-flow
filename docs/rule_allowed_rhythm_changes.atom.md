---
id: rule_allowed_rhythm_changes
status: DRAFT
priority: 1
human_name: Allowed Rhythm Changes
tags: [v3, release-v3.2, session, rhythm, rhythm-lock]
parents:
  - [[req_rhythm_lock]]
type: RULE
layer: BUSINESS
dependents:
  - [[entity_request_rhythm_lock]]
  - [[module_rhythm_change_draw]]
  - [[module_session_lock_and_groups_choices]]
  - [[rule_rhythm_change_kinds]]
  - [[rule_rhythm_change_lasts_one_phrase]]
  - [[rule_rhythm_change_share]]
  - [[ui_field_dependent]]
  - [[ui_toggle_list]]
version: 0.2
---

# Allowed Rhythm Changes

## INTENT
Let the player hear one rhythm varied by small, named edits, without losing the lock.

## THE RULE / LOGIC
The player keeps a list of five kinds of small rhythm edit, each on or off, all off by default, so the lock is strict by default. In session mode the list is set at Idle or in the review and saved like the options for during a session; Jam mode keeps its own list, apart from session mode's, set at Jam mode's Idle and saved with Jam's settings. Presets neither hold nor change it. It acts only while the lock is on; with the lock off it is kept and does nothing. Each change lasts one phrase, so while the lock is set a change can never alter the rhythm for good. The option's description tells the player that what it offers depends on the rhythm settings.

## TECHNICAL INTERFACE
Five on/off kinds of allowed rhythm change, used only under the lock.

## EXPECTATION
- In each mode, all five kinds start off and survive a reload, and neither mode's list changes the other's.
- With the lock off, the list changes nothing.
