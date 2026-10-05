---
id: module_profile_control_customization
status: REVIEW
type: MODULE
priority: 1
parents:
  - [[rule_profile_control_customization]]
version: 1.1
dependents: []
human_name: Profile Control Customization
layer: ARCHITECTURE
tags: profile
---

# Profile Control Customization

## INTENT

Mark the current configuration custom when a profile-controlled value is manually changed.

## THE RULE / LOGIC

A customization transition preserves the selected Neutral or Jazz profile identity and grammar while applying the edited profile-controlled value to pending controls and marking the configuration custom. It never mutates an immutable bundle. A later profile selection replaces all seven controlled values (harmonic motion, note density, rhythmic variety, syncopation, silence density, contour, and register) through the separate profile-selection transition.

## TECHNICAL INTERFACE

The transition accepts pending controls, the selected profile identity, and one valid profile-controlled edit, then returns custom pending configuration state.

## EXPECTATION

A manual profile-controlled edit is retained as custom without changing the selected profile definition, and a subsequent profile selection discards every custom controlled value by applying the selected seven-control bundle.
