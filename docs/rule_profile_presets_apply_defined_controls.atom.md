---
id: rule_profile_presets_apply_defined_controls
status: REVIEW
type: RULE
priority: 1
dependents: []
human_name: Profile Presets Apply Defined Controls
layer: BUSINESS
version: 0.2
tags: [profile, preset, controls, changes-in-v3.1]
parents:
  - [[rule_selectable_generative_profiles]]
notes: v3.1 change pending (2026-10-08, v3.1 and v3.2 spec ingestion): choosing Neutral or Jazz sets ten controls and seven figure levels instead of seven controls; both gain Tension Lift, Leapiness Shaped and Arpeggio chaos Varied (rule_built_in_preset_values). Text and status unchanged on purpose: it still describes the running code. Revise it in the change that builds that behaviour, per docs/release/v3.1-v3.2-intent-change-set.md.
---

# Profile Presets Apply Defined Controls

## INTENT

Make each first-release profile preset establish its defined musical-control values.

## THE RULE / LOGIC
The neutral preset is the default and selects gentle diatonic harmonic motion, quarter-note density, Slightly varied rhythmic variety, straight syncopation, sparse rests, arch contour, and middle register. The jazz preset selects gentle diatonic harmonic motion, eighth-note density, Slightly varied rhythmic variety, occasional offbeats, conversational space, wandering contour, and varying register. Selecting either preset replaces every one of these seven profile-controlled values with that preset's complete defined bundle, regardless of the previous configuration.

## TECHNICAL INTERFACE

The player selects the neutral or jazz profile preset.

## EXPECTATION
Selecting either preset replaces every one of the seven profile-controlled values with its specified harmonic-motion, density, rhythmic-variety, syncopation, silence, contour, and register bundle. Selecting jazz applies gentle diatonic harmonic motion and Slightly varied rhythmic variety; selecting neutral applies gentle diatonic harmonic motion and Slightly varied rhythmic variety.
