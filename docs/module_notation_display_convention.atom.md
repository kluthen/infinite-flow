---
id: module_notation_display_convention
status: DRAFT
version: 1.0
dependents: []
human_name: Notation Display Convention
layer: ARCHITECTURE
priority: 1
tags: notation,display-convention,concert,b-flat,e-flat
parents:
  - [[rule_notation_display_preserves_phrase]]
type: MODULE
---

# Notation Display Convention

## INTENT
Select notation display convention independently from phrase generation.

## THE RULE / LOGIC
Notation accepts an independently selected Concert, B-flat, or E-flat display convention and renders written notation from the unchanged concert-pitch timeline. Changing the display convention never mutates the concert timeline or the selected generator profile.

## TECHNICAL INTERFACE
The notation boundary accepts a concert-pitch event timeline and one selected display convention: Concert, B-flat, or E-flat.

## EXPECTATION
For identical concert-pitch events and generator profile, each display selection changes only the written notation representation.
