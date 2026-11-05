---
id: rule_shared_setting_changed_in_jam_mode
status: DRAFT
tags: [v3, release-v3.2, jam, session-mode, player-controls]
parents:
  - [[req_jam]]
dependents:
  - [[module_jam_settings]]
type: RULE
layer: BUSINESS
version: 0.2
priority: 1
human_name: A Shared Setting Changed in Jam Mode Acts on Both Modes
---

# A Shared Setting Changed in Jam Mode Acts on Both Modes

## INTENT
Keep the player and the room the same in both modes.

## THE RULE / LOGIC
The instrument (a built-in one or my instrument), the controller, the audio mix and the theme are shared by both modes. A shared setting changed in Jam mode acts on session mode exactly as the same change made there would, and on Jam mode only when generation reads it: the instrument, my instrument's range or clef included, writes phrase 1 again from a kept doodle; the controller, the audio mix and the theme rewrite nothing. An instrument changed in Jam mode, my instrument's range or clef included, acts on session mode as an instrument switch made there, on returning to session mode: the phrase on screen is checked and written again, and session mode's phrases generated ahead are discarded, by session mode's Idle rules.

## TECHNICAL INTERFACE
Shared settings have one value for both modes.

## EXPECTATION
- A shared setting changed in Jam mode has the same value in session mode.
- After an instrument change in Jam mode, returning to session mode checks and rewrites the phrase on screen and discards its phrases generated ahead, as an instrument switch there would.
- With a kept doodle, an instrument change in Jam mode, my instrument's range or clef included, writes phrase 1 again from the doodle; a change of the controller, the audio mix or the theme writes nothing.
