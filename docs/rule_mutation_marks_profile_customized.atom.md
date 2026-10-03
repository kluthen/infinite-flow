---
id: rule_mutation_marks_profile_customized
status: DRAFT
priority: 1
tags: [v2, release-v2.1, session, player-controls]
parents:
  - [[req_settings_mutation_flag]]
  - [[rule_profile_control_customization]]
notes: Captured 2026-10-03 before code in v2 chunk 24 (pre-code capture) from the coding leader plan. Proposed by the coding leader and accepted by the owner on 2026-10-03 (D181).
layer: BUSINESS
human_name: Mutating a Profile-Controlled Value Marks the Profile Customized
dependents:
  - [[module_settings_mutation]]
type: RULE
version: 0.2
---

# Mutating a Profile-Controlled Value Marks the Profile Customized

## INTENT

Keep the profile's customized mark truthful when a mutation changes a value the profile controls.

## THE RULE / LOGIC
A mutation of a value the selected musical profile controls (harmonic motion, note density, rhythmic variety, syncopation, silence density, contour or register) marks the profile customized, exactly as a manual edit of that value does. The profile identity stays the same. Like the mutation itself, the mark lasts only for the session: when the session ends, the customized marking returns to what it was before the session started.

## TECHNICAL INTERFACE

A mutation of a profile-controlled value leaves the profile identity as it is and marks the profile customized.

## EXPECTATION
- After a mutation of a profile-controlled value, the profile identity is unchanged and the profile is marked customized.
- A mutation of a setting the profile does not control leaves the customized mark as it was.
- After the session ends, the customized marking is what it was before the session started.
