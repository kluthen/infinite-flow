---
id: rule_pregeneration_discarded_on_change
status: REVIEW
type: RULE
tags: [v3, release-v3.0, idle, generation, changes-in-v3.2]
parents:
  - [[req_idle_pregeneration]]
layer: BUSINESS
version: 0.4
priority: 1
human_name: Pre-Generated Phrases Discarded on Change
dependents:
  - [[module_figure_level_options]]
  - [[module_idle_pregeneration_queue]]
  - [[module_player_presets]]
---

# Pre-Generated Phrases Discarded on Change

## INTENT
Never start a session on phrases made for settings or a phrase 1 that no longer hold.

## THE RULE / LOGIC
From v3.0, anything at Idle that replaces phrase 1 or changes a setting phrases are generated from (a generation control, a figure level, the instrument, a regeneration) discards every pre-generated phrase, and pre-generation starts again after the new phrase 1. So does a change to either of the two session options that shape later phrases, Vary settings and Tension across phrases.

Choosing a preset discards them when its values differ from the current ones or it moves the key or mode. Any change of the key and mode restriction in force discards them too, whether Vary settings is on or off: choosing a key or mode outside it (opting out), coming back inside it, or a preset save or deletion that changes it. A restriction that allows any key and any mode counts as no restriction in force, since both leave every key and mode open, so going from one to the other is no change. Saving, renaming or deleting a preset that changes neither a setting nor the restriction in force discards nothing, and nor does choosing a preset identical in values and in restriction.

A change of the tempo or of Rising tempo discards nothing, since tempo never affects generation; nor does a change of my instrument's clef alone, or of its display name, since no phrase is generated from either. A change of window size that changes the note density phrases would be generated with, or the staff layout a session would hold, re-checks the pre-generated phrases instead: the first one that no longer fits is discarded together with every phrase after it. A save of my instrument that changes the staff's shared height without discarding them, such as a change of its clef, or of its range while another profile is selected, re-checks them the same way.

## TECHNICAL INTERFACE
Setting (generation control or figure level), session-option, restriction-in-force and phrase 1 changes clear the pre-generated queue, and so does choosing a preset that changes a setting, the key or the mode; a preset save, rename or deletion that changes neither a setting nor the restriction in force leaves it, and no restriction in force and an any-key-and-mode restriction count as the same; tempo, Rising tempo and my instrument's clef and name changes leave it; window-size changes, and saves of my instrument that change the staff's shared height, truncate it at the first phrase that no longer fits.

## EXPECTATION
- A settings change (a generation control or a figure level), a change to Vary settings or Tension across phrases, or a new phrase 1 discards every pre-generated phrase.
- Choosing a preset whose values differ, or that moves the key or mode, discards every pre-generated phrase; choosing one identical in values and in restriction keeps them.
- Any change of the restriction in force discards every pre-generated phrase, Vary settings on or off: opting out, coming back inside, or a preset save or deletion that changes it; going between no restriction in force and one allowing any key and mode is no change.
- Saving, renaming or deleting a preset that changes neither a setting nor the restriction in force keeps the pre-generated phrases.
- A change of the tempo or of Rising tempo keeps the pre-generated phrases, and so does a change of my instrument's clef or display name alone.
- After a window-size change, the first pre-generated phrase that no longer fits, and every phrase after it, are discarded.
- After a save of my instrument that changes the staff's shared height without discarding them, the pre-generated phrases are checked again as after a window-size change.
