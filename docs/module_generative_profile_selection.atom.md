---
id: module_generative_profile_selection
status: DRAFT
priority: 1
version: 1.0
dependents: []
tags: profile
parents:
  - [[rule_selectable_generative_profiles]]
human_name: Generative Profile Selection
type: MODULE
layer: ARCHITECTURE
---

# Generative Profile Selection

## INTENT
Replace every profile-controlled value when a player selects a generative profile.

## THE RULE / LOGIC
A profile-selection transition reads the selected immutable Neutral or Jazz six-control bundle and replaces all six profile-controlled values in the pending configuration. It never partially applies a bundle, retains a previous controlled value, or mutates the selected bundle. Reselecting either profile repeats the full replacement.

## TECHNICAL INTERFACE
The transition accepts one selected profile identity and its immutable six-control bundle, and returns pending controls with all six profile-controlled values replaced.

## EXPECTATION
After selecting or reselecting Neutral or Jazz, each of the six profile-controlled values exactly matches that profile bundle and the bundle remains unchanged.
