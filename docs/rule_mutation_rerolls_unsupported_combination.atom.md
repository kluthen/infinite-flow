---
id: rule_mutation_rerolls_unsupported_combination
status: REVIEW
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
tags: [v2, release-v2.0, part-v2.1, session, rhythm, changes-in-v3.1, changes-in-v3.2]
notes: v3.1 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): a key or mode move outside the restriction in force at the session's start is drawn again like an unsupported combination (rule_vary_settings_stays_inside_restriction). v3.2 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): a mutation cycle may be skipped, and recorded in the history, when the narrow-window rule leaves no move mid-session (rule_vary_settings_skips_dead_end). Text and status unchanged on purpose: it still describes the running code. Revise it in the change that builds that behaviour, per docs/release/v3.1-v3.2-intent-change-set.md.
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
