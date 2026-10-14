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
