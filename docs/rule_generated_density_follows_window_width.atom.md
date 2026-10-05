---
id: rule_generated_density_follows_window_width
status: DRAFT
parents:
  - [[rule_sixteenth_unavailable_below_tablet_width]]
priority: 1
dependents:
  - [[module_generation_control_catalog]]
  - [[module_idle_window_width_density]]
  - [[module_session_density_step_down]]
  - [[rule_session_density_only_steps_down]]
type: RULE
layer: BUSINESS
version: 0.1
human_name: Generated Note Density Follows Window Width
tags: [v2, release-v2.0, idle, session, rhythm, v1-change]
---

# Generated Note Density Follows Window Width

## INTENT
Decide each phrase's generated note density from the window's width at the moment that phrase is generated.

## THE RULE / LOGIC
Whenever the window is below the tablet-landscape layout's width when a phrase is generated, a chosen Sixteenth generates as Eighth; at or above that width the chosen value applies, as in the first release, except in a session that has stepped down to Eighth. This holds at Idle and during a session alike: a session's locked setting is the chosen value, and the density a phrase is generated with is taken from the window when that phrase is generated. A crossing of that width therefore applies to the next phrase generated, including the next attempt of an Idle retry round; at Idle the chosen Sixteenth applies again to the next phrase generated at or above that width. A phrase already on screen, or a look-ahead phrase already checked and waiting to be drawn, is never regenerated because the window crossed that width: it stays if it still fits; otherwise it is replaced at Idle, gives way to no phrase at Idle if the rhythm settings then block generation, or ends the session.

## TECHNICAL INTERFACE
Every generation request carries the note density it is generated with, derived from the chosen density and the window's width when the request is made.

## EXPECTATION
- Below the tablet-landscape layout's width, every phrase generated with a chosen Sixteenth is generated with Eighth, at Idle and during a session.
- At or above that width, the chosen value applies, except in a session that has stepped down.
- Crossing that width never regenerates a phrase on screen or a phrase already checked and waiting to be drawn.
