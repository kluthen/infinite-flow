---
id: ui_segmented_control_marked_option
status: REVIEW
version: 0.3
priority: 1
tags: [v3, release-v3.1, player-controls, presets, accessibility]
dependents:
  - [[module_key_and_mode_marks]]
type: UI
layer: ARCHITECTURE
human_name: The Segmented Control's Marked Option
parents:
  - [[rule_restriction_highlight_never_blocks]]
---

# The Segmented Control's Marked Option

## INTENT
Let a segmented control show which of its options a guidance in force points to, without making any option harder to choose.

## THE RULE / LOGIC
A segmented control's option may be marked: a flag beside disabled and the option's describedBy, independent of both. A marked option's segment is drawn with a sign that is a shape and not colour alone, a small filled dot at its top inline-end corner, kept in every state of the segment, selected, focused and read-only included. Marking changes nothing else: a marked option is chosen, checked, focused and reached by the arrow keys, Home and End exactly as an unmarked one, and no option is ever disabled for being unmarked. What the marks mean is said once for the whole control, by the element its radiogroup's aria-describedby names, never by each marked option. The control knows nothing of presets or restrictions: its caller says which options are marked. The Written key and Collection controls take their marked options from the key and mode marks; a control with no marked option renders exactly as one without the flag.

## TECHNICAL INTERFACE
src/components/controls/segmented-control-option.ts: SegmentedControlOption has readonly marked?: boolean beside disabled? and describedBy?. src/components/controls/SegmentedControl.vue gives a marked option's segment the is-marked class (the token source's segment.is-marked, a dot --segment-mark-size across) and names the meaning of the marks through its existing group-level describedBy prop.

## EXPECTATION
- A marked option's segment shows the mark in every state, read-only included; an unmarked option's never does.
- Marked or not, every option that is not disabled is selected by click, arrow keys, Home and End in the same way.
- Marking never disables an option, and no option is disabled because others are marked.
- A screen reader reads the meaning of the marks through the radiogroup's aria-describedby.
