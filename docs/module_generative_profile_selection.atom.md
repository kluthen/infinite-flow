---
id: module_generative_profile_selection
status: REVIEW
priority: 1
version: 1.1
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

A profile-selection transition reads the selected immutable Neutral or Jazz seven-control bundle and replaces all seven profile-controlled values (harmonic motion, note density, rhythmic variety, syncopation, silence density, contour, and register) in the pending configuration. It never partially applies a bundle, retains a previous controlled value, or mutates the selected bundle. Reselecting either profile repeats the full replacement.

## TECHNICAL INTERFACE

The transition accepts one selected profile identity and its immutable seven-control bundle, and returns pending controls with all seven profile-controlled values replaced.

## EXPECTATION

After selecting or reselecting Neutral or Jazz, each of the seven profile-controlled values exactly matches that profile bundle and the bundle remains unchanged.
