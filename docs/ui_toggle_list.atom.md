---
id: ui_toggle_list
status: DRAFT
human_name: A List of Toggles
priority: 2
dependents: []
type: UI
layer: ARCHITECTURE
version: 0.1
tags: [v3, release-v3.2, player-controls, ui]
parents:
  - [[rule_allowed_rhythm_changes]]
  - [[rule_vary_settings_allowed_groups]]
---

# A List of Toggles

## INTENT
Let the player switch each item of a short list on or off on its own.

## THE RULE / LOGIC
A toggle list is a group labelled by its field's label and described by its field's note, holding one toggle button per item, pressed when the item is on; each label is the item's name followed by its state word, on or off, which assistive technology does not read twice, as the audio mix's toggles. Each toggle is its own tab stop and arrow keys do nothing special. The toggles wrap within their column at every breakpoint, none cut. Read-only, during Loading and a session, every toggle shows its value and none can be changed. An item may be disabled: it is shown off and cannot be pressed, its stored choice kept, with a note after the list, named by the toggle's description, saying why; when it is enabled again its stored value shows again. It serves the allowed rhythm changes (five items, all off by default) and Vary settings' allowed groups (six items, all on by default, "Rhythm" disabled under the rhythm lock), and Jam's allowed rhythm changes.

## TECHNICAL INTERFACE
Not built yet: src/components/controls/ToggleList.vue, a `role="group"` of `btn toggle-button`s with `aria-pressed`, each state word a `toggle-button-state` hidden with `aria-hidden`, styled by the `toggle-list` class of the shared component styles (src/styles/components.css).

## EXPECTATION
- Each toggle switches its own item and no other, and is reached by Tab.
- Read-only, no toggle changes; a disabled item shows off, keeps its stored choice, is described by the reason, and shows its stored value again once enabled.
