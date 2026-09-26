---
id: module_generation_control_catalog
status: DRAFT
type: MODULE
tags: controls
parents:
  - [[user_story_controlled_phrase_generation]]
human_name: Generation Control Catalog
layer: ARCHITECTURE
priority: 1
version: 1.1
dependents:
  - [[module_generation_request_construction]]
---

# Generation Control Catalog

## INTENT

Define the closed player-selectable generation controls and their canonical first-load configuration.

## THE RULE / LOGIC

The pure catalog boundary owns the closed selectable values for generation controls, literal first-load values, and tempo validation and normalization. First load uses 90 BPM, written C Ionian on the B-flat tenor instrument profile (concert B-flat Ionian), Neutral, Slightly varied rhythmic variety, Lift, Shaped, and Predictable arpeggio chaos; Neutral supplies every other profile-controlled default. The catalog exposes immutable Neutral and Jazz bundles, each containing the seven profile-controlled values: harmonic motion, note density, rhythmic variety, syncopation, silence density, contour, and register. Catalog definitions and bundles are immutable and contain no browser, session, presentation, or generation-result state.

## TECHNICAL INTERFACE

Consumers read closed control vocabularies, literal defaults, normalized tempo values, and immutable Neutral or Jazz seven-control bundles. The catalog has no mutable-state or generation operation interface.

## EXPECTATION

Invalid or non-canonical tempo input cannot enter generation intent without catalog normalization or rejection. First-load state is reproducible from literal catalog defaults. Neither consumers nor profile transitions can mutate a published bundle or catalog definition.
