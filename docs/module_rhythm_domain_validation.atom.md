---
id: module_rhythm_domain_validation
status: REVIEW
tags: rhythm,validation,typed-failures,step6
version: 0.1
dependents: []
human_name: Rhythm Domain Validation
parents:
  - [[rule_complete_four_four_measures]]
  - [[rule_preserve_metrical_anchor]]
type: MODULE
layer: ARCHITECTURE
priority: 1
---

# Rhythm Domain Validation

## INTENT
Validate rhythm candidates and domains independently of generation, returning stable codes without repair.

## THE RULE / LOGIC
The validator independently checks immutable candidates against the selected grammar version's complete rhythm invariants and reports every applicable stable validation code in canonical order. It separately verifies domain traversal properties that belong to the domain, including normalized-identity uniqueness, contiguous indices, and replayable canonical order. Validation never constructs, ranks, selects, reorders, normalizes, or repairs a candidate; malformed controls and unsupported grammar versions are rejected through the typed planner-input failure path.

## TECHNICAL INTERFACE
Callers submit an immutable candidate or an immutable candidate domain with its normalized input and grammarVersion. They receive the unchanged valid value or ordered stable validation codes and typed failure information. The interface accepts no seed, random source, harmony, pitch, profile, instrument, ranking, selection, calibration table, catalog table, or tooling fixture.

## EXPECTATION
Any violation produces the documented stable code or typed failure rather than a partial, defaulted, altered, or silently accepted value. Revalidating the same candidate or replayed domain produces the same ordered result without consuming randomness or mutating input.
