---
id: rule_mutation_profile_flip_keeps_controls
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.1
human_name: Profile Mutation Changes the Profile Identity Only
notes: Captured 2026-10-03 before code in v2 chunk 24 (pre-code capture) from the coding leader plan. Proposed by the coding leader and accepted by the owner on 2026-10-03 (D181).
priority: 1
tags: [v2, release-v2.1, session, player-controls]
parents:
  - [[req_settings_mutation_flag]]
  - [[rule_profile_control_customization]]
dependents:
  - [[module_settings_mutation]]
---

# Profile Mutation Changes the Profile Identity Only

## INTENT

Let a mutation change the musical profile without moving many settings at once.

## THE RULE / LOGIC

The two musical profiles, Neutral and Jazz, are one grade apart, so a mutation of the musical profile flips it from one to the other. The flip changes the profile identity only: every profile-controlled value in effect stays exactly as it was, and the profile is marked customized, as a manual edit of a profile-controlled value marks it. The new profile's own bundle of controlled values is never applied, because applying it would move up to seven settings at once, far more than one grade.

## TECHNICAL INTERFACE

A musical-profile mutation switches the profile identity between Neutral and Jazz and marks it customized, leaving the controlled values untouched.

## EXPECTATION

- After a musical-profile mutation, the profile is the other one of Neutral and Jazz, and it is marked customized.
- Every profile-controlled value in effect is the same before and after a musical-profile mutation.
