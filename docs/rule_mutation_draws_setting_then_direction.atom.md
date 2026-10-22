---
id: rule_mutation_draws_setting_then_direction
status: REVIEW
layer: BUSINESS
version: 0.3
priority: 1
human_name: Mutation Draws a Setting
tags: [v2, release-v2.0, part-v2.1, session, player-controls, changes-in-v3.2]
parents:
  - [[req_settings_mutation_flag]]
type: RULE
dependents:
  - [[module_settings_mutation]]
---

# Mutation Draws a Setting

## INTENT

Pick each mutation in a way a session can replay exactly.

## THE RULE / LOGIC
In session mode, the only mode Vary settings runs in, each mutation is picked by a seeded draw in two stages: first one setting Vary settings can move (any generation setting but the instrument and the tempo); then, when that setting is the figure levels, which the draw counts as one setting, one figure; then one of the directions available to that setting or figure from its current value. At an end of a scale with no wrap only one direction is available, and for a setting with no order each other value counts as one direction. If the result is a combination the generator does not support, a value unavailable at that moment, a key or mode outside the restriction in force at the session's start, or a setting of a group the player does not allow (the Rhythm group counting as not allowed while the rhythm lock is on), the whole draw is made again from the same seeded source, until it lands on a supported result. The same seed and the same settings therefore always give the same mutation, and with all six groups allowed and the lock off, the same mutation as before the groups existed.

## TECHNICAL INTERFACE
A mutation is drawn from a seeded source as one eligible setting, for the figure levels one figure, followed by one available direction, redrawn while the result is unsupported or moves a setting of a group that is not allowed.

## EXPECTATION
- Each mutation changes exactly one eligible setting, by one grade, in a direction available from its current value.
- A figure-level mutation draws the setting, then the figure, then the direction; the seven levels together count as one setting.
- The same seed and the same settings always give the same mutation.
- A draw that lands on an unsupported result is redrawn, never applied.
- No mutation moves a setting of a group the player does not allow, or of the Rhythm group while the rhythm lock is on.
- With all six groups allowed and the lock off, the same seed and the same settings give the same mutation as before the groups existed.
