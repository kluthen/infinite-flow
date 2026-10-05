---
id: rule_mutation_sixteenth_blocked_after_step_down
status: STABLE
layer: BUSINESS
version: 0.1
priority: 1
human_name: Mutation Never Restores Sixteenth After a Step-Down
parents:
  - [[rule_mutation_rerolls_unsupported_combination]]
  - [[rule_session_density_only_steps_down]]
dependents:
  - [[module_settings_mutation]]
type: RULE
tags: [v2, release-v2.0, part-v2.1, session, rhythm]
notes: Captured 2026-10-03 before code in v2 chunk 24 (pre-code capture). A coding leader reading of whenever the session generates with Eighth because a chosen Sixteenth stepped down, read as once the session has stepped down at any point, consistent with a session density that only steps down under the window-width rule. Proposed by the coding leader and accepted by the owner on 2026-10-03 (D181).
---

# Mutation Never Restores Sixteenth After a Step-Down

## INTENT

Keep a session that has stepped its note density down from ever being mutated back up to Sixteenth.

## THE RULE / LOGIC

Once a session has stepped its note density down from a chosen Sixteenth to Eighth under the window-width rule, at any point, Sixteenth stays unavailable to every later mutation of that session, even after mutations have moved the density away from Sixteenth and Eighth, and even once the window is wide enough again. A mutation that would land on Sixteenth then mutates again, as for an unsupported combination. Below the tablet-landscape layout's width Sixteenth is unavailable to a mutation too, whether or not the session has stepped down.

## TECHNICAL INTERFACE

A note-density mutation treats Sixteenth as unavailable once the session has stepped down, until the session ends, and while the window is below the tablet-landscape layout's width.

## EXPECTATION

- In a session that has stepped down at any point, no mutation ever lands on Sixteenth, whatever the density in effect and the window width.
- Below the tablet-landscape layout's width, no mutation lands on Sixteenth.
