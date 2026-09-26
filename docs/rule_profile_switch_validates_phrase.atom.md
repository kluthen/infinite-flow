---
id: rule_profile_switch_validates_phrase
status: DRAFT
version: 1.0
priority: 1
tags: instrument-profile
dependents: []
layer: BUSINESS
parents:
  - [[req_four_measure_phrase]]
human_name: Instrument Profile Switch Regenerates
type: RULE
---

# Instrument Profile Switch Regenerates

## INTENT

Regenerate the complete phrase under the newly selected instrument profile whenever the player switches profile while a phrase is shown, without validating or retaining the previous phrase.

## THE RULE / LOGIC

Switching the selected instrument profile keeps the player's selected written tonal center and collection and every other retained control. Because the new profile's transposition can differ, request construction derives a new concert tonal center from the retained written tonal center, and the complete four-measure phrase regenerates with a fresh seed under the new profile's active concert range and register-window policy. The previous phrase is never retained, revalidated against the new profile's range, or redrawn in the new profile's written pitch, and source events are never transposed to fit the new profile: there is no keep-if-it-fits check. The one exception is when the retained controls are one of the unsupported note-density, silence-density, and syncopation combinations that block generation: the switch still applies and the written tonal center/collection selection changes, but no fresh seed is drawn and no generation runs; the phrase is cleared to the empty workspace instead. With no phrase shown, a switch only changes the selection.

## TECHNICAL INTERFACE

A profile-switch request supplies the retained written tonal center and collection, the retained non-preset controls, the selected new instrument profile, and a freshly injected seed; it produces either a new concert tonal center and a completely regenerated four-measure phrase, or, under a blocked rhythm-settings combination, a cleared empty workspace with no generation.

## EXPECTATION

A profile switch while a phrase is shown always regenerates the complete phrase with a fresh seed and the new profile's derived concert tonal center, unless the retained controls are one of the unsupported note-density, silence-density, and syncopation combinations that block generation, in which case the switch still applies but the phrase is cleared to the empty workspace and no generation runs. The previous phrase is never retained or redrawn in the new profile's written pitch, and source events are never transposed to fit.
