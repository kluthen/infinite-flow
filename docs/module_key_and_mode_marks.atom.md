---
id: module_key_and_mode_marks
status: DRAFT
layer: ARCHITECTURE
version: 0.1
priority: 1
parents:
  - [[rule_restriction_highlight_never_blocks]]
  - [[rule_restriction_in_force]]
  - [[rule_vary_settings_stays_inside_restriction]]
  - [[ui_segmented_control_marked_option]]
human_name: The Key and Mode Marks
type: MODULE
tags: [v3, release-v3.1, player-controls, presets, session]
dependents: []
---

# The Key and Mode Marks

## INTENT
Work out which Written key and Collection options are marked, and the note under each, from one restriction and one preset name, so the marks keep what Start showed for the whole session.

## THE RULE / LOGIC
The key and mode marks are a pure function of a restriction, or none, and the name of the preset the notes name. For each of Written key and Collection it gives the marked values and the note. A half that is a list marks exactly the values it allows on its control and gives that control's note: under Written key, "{preset} is meant for {list}, marked. Any key works; another one makes your settings Custom."; under Collection, "{preset} is meant for {list}, marked. Any mode works; another one makes your settings Custom.", {list} being the allowed values in the control's own labels, joined as "A, B or C". A half that is any, or no restriction at all, marks nothing and gives no note. The function never disables an option and decides nothing else about the controls.

Its inputs depend on when the controls are drawn. At Idle and in the review mode, the restriction is the restriction in force for the player's own selection, written key and collection, and the preset is the selected one, or in Custom its base. During a session, from an accepted Start to its end's teardown, both come from the session's start settings, the settings the session was started with, never from the settings shown: the restriction is the one frozen into them at the start, absent when none was in force or when the one in force allows every key and mode, and the preset is named from their selection, the selected preset or in Custom its base. The shown key, mode and selection can differ from the start's: with a stale phrase 1 used as it is, the key and mode shown through the count-in and phrase 1 are phrase 1's, and a Vary settings move can turn the shown selection Custom. Taking the start settings keeps the marks and notes as Start showed them for the whole session, which is also the bound Vary settings' key and mode moves stay inside.

## TECHNICAL INTERFACE
src/components/controls/control-options.ts: one pure function over a KeyAndModeRestriction or none and the preset's name, giving for Written key and for Collection the marked option values (the values of tonalCenterOptions and of the Collection options) and the note, or none. Its caller in the foundation group gives it restrictionInForce (src/domain/presets/preset-selection.ts) of the player's own selection, written key and collection at Idle and in the review mode, and during a session the start settings' restriction (SessionSettings.restriction, src/session/session-types.ts, frozen by withRestrictionAtStart in src/session/settings-mutation.ts) and the preset named from their selection; it passes the marked values to the controls' options as the segmented control's marked flag and the note as the radiogroup's describedBy. The session controller exposes the start settings in its readonly state (src/components/workspace/workspace-session-controller-types.ts), read-only: the SessionSettings its start builds, null in the state src/components/workspace/workspace-session-controller.ts creates, set beside shownSettings when the session begins (src/components/workspace/workspace-session-begin.ts), cleared beside it at every end's teardown (src/components/workspace/workspace-session-ends.ts), and null whenever no session runs.

## EXPECTATION
- The same restriction and preset name always give the same marks and notes.
- A half that is a list marks exactly its allowed values on its control, with a note naming the preset and the list in the control's own labels; a half that is any, or no restriction, marks nothing and gives no note.
- At Idle and in the review mode the marks and notes follow the restriction in force for the player's own selection, written key and collection.
- During a session the marks and notes are those Start showed, whatever the shown key, mode and selection; with a stale phrase 1 used whose key or mode lies outside the restriction in force at Start, through the count-in and phrase 1 as well.
- The controller's start settings are null with no session, set from an accepted start, and null again after every end's teardown.
