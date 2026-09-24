---
id: rule_profile_switch_validates_phrase
status: REVIEW
version: 0.1
priority: 1
tags: instrument-profile,profile-switch,range,register-window
dependents: []
layer: BUSINESS
parents:
  - [[req_four_measure_phrase]]
human_name: Profile Switch Phrase Validation
type: RULE
---

# Profile Switch Phrase Validation

## INTENT
Retain a phrase after an instrument-profile switch only when it fits the new active range and resolved whole-phrase register window.

## THE RULE / LOGIC
Switching the selected instrument profile validates every unchanged concert event against the new profile's inclusive active concert range and the whole-phrase register window required by the current Register selection. Low, Middle, and High use the corresponding window of the new profile. Varying deterministically resolves one candidate Low, Middle, or High window from the existing seed using the same fixed candidate order and register-resolution stream as generation. When every event satisfies both constraints, retain the immutable concert phrase and redraw it in the selected display convention. Otherwise retain the current controls, select a fresh seed, and regenerate the complete four-measure phrase under the new profile. Never transpose source events to force a fit.

## TECHNICAL INTERFACE
A profile-switch request supplies the unchanged concert phrase, current Register selection, existing seed, selected new profile, current controls, and selected display convention.

## EXPECTATION
A profile switch retains the original event values only when all events satisfy both the new active range and resolved whole-phrase register window. Failing either constraint causes complete regeneration with retained controls and a fresh seed; source events are never transposed to fit.
