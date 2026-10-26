---
id: ui_field_dependent
status: DRAFT
human_name: A Field's Dependent Option
type: UI
layer: ARCHITECTURE
version: 0.2
tags: [v3, release-v3.2, player-controls, ui]
dependents: []
priority: 2
parents:
  - [[req_rhythm_lock]]
  - [[rule_allowed_rhythm_changes]]
  - [[rule_vary_settings_allowed_groups]]
---

# A Field's Dependent Option

## INTENT
Show an option that depends on a switch right under that switch, only while it applies, without losing what it holds.

## THE RULE / LOGIC
A field dependent is a nested field group under a field's own note, in the same column, ruled along its inline start, holding the control of an option that depends on that field. It is rendered only while its condition holds, usually while its switch shows On; hidden, it keeps the values it holds, which come back with it. It appears and leaves at once, with no animation, the columns rewrapping, and only at Idle and in the review mode, through the player's own action. During Loading and a session it keeps what it showed at the start and is read-only with the field it sits in. It serves session mode's Allowed rhythm changes under the rhythm lock and What may vary under Vary settings (shown also while Vary settings is unavailable for lack of a move), and Jam's Allowed rhythm changes under Jam's lock.

## TECHNICAL INTERFACE
src/components/controls/FieldDependent.vue, props-in only (shown, readonly), its content a slot: a `field-dependent` holding a nested `field-group`, rendered with `v-if` while shown, with no transition, styled by the `field-dependent` class of the shared component styles (src/styles/components.css); what it holds lives in its parent's props, so hiding it loses nothing. Used by src/components/controls/RhythmLockField.vue (the allowed rhythm changes under the rhythm lock) and VarySettingsField.vue (What may vary under Vary settings), both in SessionOptionsControls.vue.

## EXPECTATION
- A dependent shows only while its condition holds, and a value set before it was hidden is back when it shows again.
- It appears and leaves at once, only at Idle and in the review mode, and is read-only during Loading and a session.
