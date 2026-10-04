---
id: module_generation_control_catalog
status: REVIEW
type: MODULE
tags: controls
parents:
  - [[user_story_controlled_phrase_generation]]
  - [[rule_generated_density_follows_window_width]]
human_name: Generation Control Catalog
layer: ARCHITECTURE
priority: 1
version: 1.3
dependents:
  - [[module_generation_request_construction]]
  - [[module_settings_mutation]]
  - [[module_tension_arc_cycle]]
---

# Generation Control Catalog

## INTENT

Define the closed player-selectable generation controls and their canonical first-load configuration.

## THE RULE / LOGIC

The pure catalog boundary owns the closed selectable values for generation controls, literal first-load values, and tempo validation and normalization. First load uses 90 BPM, written C Ionian on the B-flat tenor instrument profile (concert B-flat Ionian), Neutral, Slightly varied rhythmic variety, Lift, Shaped, and Varied arpeggio chaos; Neutral supplies every other profile-controlled default. The catalog exposes immutable Neutral and Jazz bundles, each containing the seven profile-controlled values: harmonic motion, note density, rhythmic variety, syncopation, silence density, contour, and register. Catalog definitions and bundles are immutable and contain no browser, session, presentation, or generation-result state.

Note density keeps its three catalog values, Quarter, Eighth and Sixteenth, at every window width: below the tablet-landscape layout's width Sixteenth cannot be newly chosen, but a chosen Sixteenth stays the chosen value. What the window changes is the density a phrase is generated with. The catalog boundary owns that resolution as a pure function of three plain inputs: the chosen density, whether the window is below the tablet-landscape layout's width when the phrase is generated, and whether the running session has already stepped its density down. A chosen Sixteenth resolves to Eighth when the window is below that width or the session has stepped down; every other case resolves to the chosen value. The resolution reads no browser or session state itself: the caller supplies both inputs, so the catalog stays free of either.

## TECHNICAL INTERFACE

Consumers read closed control vocabularies, literal defaults, normalized tempo values, and immutable Neutral or Jazz seven-control bundles. They also resolve a chosen note density, or a whole set of chosen controls, into the density a phrase is generated with, from whether the window is below the tablet-landscape layout's width and whether the session has stepped down. The catalog has no mutable-state or generation operation interface.

## EXPECTATION

Invalid or non-canonical tempo input cannot enter generation intent without catalog normalization or rejection. First-load state is reproducible from literal catalog defaults. Neither consumers nor profile transitions can mutate a published bundle or catalog definition. The density resolution never yields a density denser than the chosen one, never changes the chosen value, and yields Sixteenth only for a chosen Sixteenth at or above the tablet-landscape layout's width in a session that has not stepped down.
