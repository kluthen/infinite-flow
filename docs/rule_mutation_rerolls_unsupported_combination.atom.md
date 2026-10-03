---
id: rule_mutation_rerolls_unsupported_combination
status: DRAFT
type: RULE
version: 0.2
priority: 1
human_name: Mutation Never Lands on an Unsupported Combination
parents:
  - [[req_settings_mutation_flag]]
dependents:
  - [[module_settings_mutation]]
  - [[rule_mutation_sixteenth_blocked_after_step_down]]
layer: BUSINESS
tags: [v2, release-v2.1, session, rhythm]
---

# Mutation Never Lands on an Unsupported Combination

## INTENT

Guarantee that an automatic setting mutation never lands on settings the generator cannot handle.

## THE RULE / LOGIC

If a mutation would land on a setting combination the generator does not support, it mutates again, rerolling until it lands on a supported combination: an unsupported combination is never applied, and a mutation cycle is never silently skipped. The flag treats Sixteenth note density as unavailable below the tablet-landscape layout's width, and also whenever the session generates with Eighth because a chosen Sixteenth stepped down under the window-width rule, whatever the window's width: a mutation that would land on Sixteenth then mutates again, as for an unsupported combination.

## TECHNICAL INTERFACE

Every mutation candidate is checked against the supported combinations, and against Sixteenth availability (below the tablet-landscape layout's width, or in a session generating with Eighth under the window-width rule), before it is applied.

## EXPECTATION

- No mutation ever applies an unsupported combination.
- Every mutation cycle applies a supported change; none is skipped.
- Below the tablet-landscape layout's width, no mutation lands on Sixteenth.
- In a session generating with Eighth under the window-width rule, no note-density mutation lands on Sixteenth, even once the window is wide enough again.
