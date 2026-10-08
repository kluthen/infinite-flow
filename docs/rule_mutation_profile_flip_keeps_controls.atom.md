---
id: rule_mutation_profile_flip_keeps_controls
status: REVIEW
type: RULE
layer: BUSINESS
version: 0.2
human_name: Profile Mutation Changes the Profile Identity Only
notes: Returned 2026-10-08 from STABLE to REVIEW at version 0.2 (previous version 0.1) and removed from the CONTRACT surface, with the explicit confirmation of the product owner, given on 2026-10-08 (spec D246), of contract change set part A (docs/release/v3.1-v3.2-intent-change-set.md, A1), together with the CONTRACT 3.0 MAJOR bump. Text unchanged on purpose: it still describes the running code and keeps its code and test links. v3.1 change pending: v3.1 makes the figures visible settings, so a Neutral and Jazz flip no longer means anything, and Vary settings moves one figure one level instead (rule_vary_settings_figure_step). This atom is deleted in the v3.1 change that replaces the flip with the figure step; its links then move to rule_vary_settings_figure_step, and module_settings_mutation loses it as a parent. Earlier: Captured 2026-10-03 before code in v2 chunk 24 (pre-code capture) from the coding leader plan. Proposed by the coding leader and accepted by the owner on 2026-10-03 (D181).
priority: 1
tags: [v2, release-v2.0, part-v2.1, session, player-controls, changes-in-v3.1]
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
