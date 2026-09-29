---
id: rule_chord_fit_only_off_script
status: DRAFT
version: 0.1
priority: 1
parents:
  - [[req_chord_fit_acknowledgement]]
dependents: []
type: RULE
layer: BUSINESS
human_name: Chord-Fit Check Runs Only Off-Script
tags: [v2, release-v2.3, acknowledgement, midi, harmony]
---

# Chord-Fit Check Runs Only Off-Script

## INTENT
Reserve the chord-fit acknowledgement for measures where the player departed from the page.

## THE RULE / LOGIC
The chord-fit check only ever runs on a measure where what the player actually played differs from the written phrase for that measure. A measure played exactly as written never triggers it; it only ever gets the per-note highlight. The two acknowledgement signals therefore never double up on the same measure, and the check stays specifically a reward for departing from the page.

## TECHNICAL INTERFACE
Each measure is compared with the written phrase before any chord-fit judgement is made.

## EXPECTATION
For every seed and supported settings combination, playing the app's own generated phrase exactly, with its own timing, never triggers the chord-fit acknowledgement: only the per-note highlight appears on a script-perfect measure. This is checked as a property test over the existing fixture set.
