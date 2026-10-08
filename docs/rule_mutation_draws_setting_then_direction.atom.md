---
id: rule_mutation_draws_setting_then_direction
status: REVIEW
layer: BUSINESS
version: 0.1
priority: 1
human_name: Mutation Draws a Setting
tags: [v2, release-v2.0, part-v2.1, session, player-controls, changes-in-v3.1, changes-in-v3.2]
parents:
  - [[req_settings_mutation_flag]]
type: RULE
notes: v3.1 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): the figures take the musical profile's one place in the draw, which then picks setting, figure, then direction (rule_vary_settings_figure_step). v3.2 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): only settings of allowed and eligible groups are drawn; the Rhythm group is ineligible under the rhythm lock (rule_vary_settings_allowed_groups). Text and status unchanged on purpose: it still describes the running code. Revise it in the change that builds that behaviour, per docs/release/v3.1-v3.2-intent-change-set.md. Earlier: Captured 2026-10-03 before code in v2 chunk 24 (pre-code capture) from the coding leader plan, settled by the coding leader within the settings-mutation requirement.
dependents:
  - [[module_settings_mutation]]
---

# Mutation Draws a Setting

## INTENT

Pick each mutation in a way a session can replay exactly.

## THE RULE / LOGIC

Each mutation is picked by a seeded draw in two stages: first one eligible setting, then one of the directions available to that setting from its current value. At an end of a scale with no wrap only one direction is available, and for a setting with no order each other value counts as one direction. If the result is a combination the generator does not support, or a value unavailable at that moment, the whole draw is made again from the same seeded source, until it lands on a supported result. The same seed and the same settings therefore always give the same mutation.

## TECHNICAL INTERFACE

A mutation is drawn from a seeded source as one eligible setting followed by one available direction, redrawn while the result is unsupported.

## EXPECTATION

- Each mutation changes exactly one eligible setting, by one grade, in a direction available from its current value.
- The same seed and the same settings always give the same mutation.
- A draw that lands on an unsupported result is redrawn, never applied.
