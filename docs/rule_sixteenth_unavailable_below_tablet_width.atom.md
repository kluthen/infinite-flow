---
id: rule_sixteenth_unavailable_below_tablet_width
status: REVIEW
type: RULE
layer: BUSINESS
version: 0.2
priority: 1
human_name: Sixteenth Density Unavailable Below Tablet-Landscape Width
tags: [v2, release-v2.0, idle, rhythm, player-controls, v1-change]
dependents:
  - [[rule_generated_density_follows_window_width]]
parents:
  - [[user_story_controlled_phrase_generation]]
---

# Sixteenth Density Unavailable Below Tablet-Landscape Width

## INTENT
Stop the note density most likely to overflow a phone's staff from being chosen on narrow windows.

## THE RULE / LOGIC
This changes the first release's behaviour. Below the width at which the interface switches to its tablet-landscape layout, the Sixteenth option of the note-density control cannot be chosen, because it is the most likely cause of a phrase too dense to fit a phone's staff. A Sixteenth chosen while the window was wider is kept as the chosen value; what the window's width changes is only the density a phrase is generated with. The kept value is the one saved, so it also comes back as the chosen value after a page reload, whatever the window's width. This is not a ban on sixteenth notes: other settings, such as rhythmic variety, can still produce some. How the unavailable option is shown belongs to the interface design.

## TECHNICAL INTERFACE
Below the tablet-landscape layout's width, the note-density control shows Sixteenth as unavailable while keeping a Sixteenth already chosen as the chosen value.

## EXPECTATION
- Below the tablet-landscape layout's width, Sixteenth cannot be newly chosen.
- A Sixteenth chosen while the window was wider stays the chosen value, after a page reload included.
- Sixteenth notes can still appear in a phrase through other settings.
