---
id: rule_profile_control_customization
status: REVIEW
priority: 1
tags: [profile, controls, customization, changes-in-v3.1]
type: RULE
layer: BUSINESS
parents:
  - [[rule_selectable_generative_profiles]]
dependents:
  - [[module_profile_control_customization]]
  - [[rule_mutation_marks_profile_customized]]
  - [[rule_mutation_profile_flip_keeps_controls]]
human_name: Profile Control Customization
version: 0.1
notes: v3.1 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): no hidden grammar is retained: Custom names the preset it is based on, only choosing a preset leaves it, and a key or mode chosen outside the restriction in force also makes Custom (rule_custom_selection, rule_custom_names_its_base). Text and status unchanged on purpose: it still describes the running code. Revise it in the change that builds that behaviour, per docs/release/v3.1-v3.2-intent-change-set.md.
---

# Profile Control Customization

## INTENT

Allow a player to customize the values controlled by the selected generative profile.

## THE RULE / LOGIC

Changing any value controlled by the selected generative profile makes the current configuration custom while retaining that profile's musical grammar. A custom configuration does not change the selected profile's defined configuration.

## TECHNICAL INTERFACE

After selecting a generative profile, the player may change each value controlled by that profile.

## EXPECTATION

Manual changes to profile-controlled values are used as the current configuration without changing the selected profile's grammar or its defined configuration.
