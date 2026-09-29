---
id: rule_mutation_rerolls_unsupported_combination
status: DRAFT
type: RULE
version: 0.1
priority: 1
human_name: Mutation Never Lands on an Unsupported Combination
parents:
  - [[req_settings_mutation_flag]]
dependents: []
layer: BUSINESS
tags: [v2, release-v2.1, session, rhythm]
---

# Mutation Never Lands on an Unsupported Combination

## INTENT
Guarantee that an automatic setting mutation never lands on settings the generator cannot handle.

## THE RULE / LOGIC
If a mutation would land on a setting combination the generator does not support, it mutates again, rerolling until it lands on a supported combination: an unsupported combination is never applied, and a mutation cycle is never silently skipped. Below the tablet-landscape layout's width, the flag treats Sixteenth note density as unavailable: a mutation that would land on it mutates again, as for an unsupported combination.

## TECHNICAL INTERFACE
Every mutation candidate is checked against the supported combinations, and, below the tablet-landscape layout's width, against Sixteenth availability, before it is applied.

## EXPECTATION
- No mutation ever applies an unsupported combination.
- Every mutation cycle applies a supported change; none is skipped.
- Below the tablet-landscape layout's width, no mutation lands on Sixteenth.
