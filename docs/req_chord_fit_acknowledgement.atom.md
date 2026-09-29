---
id: req_chord_fit_acknowledgement
status: DRAFT
priority: 1
type: REQUIREMENT
layer: BUSINESS
human_name: End-of-Measure Chord-Fit Acknowledgement
tags: [v2, release-v2.3, acknowledgement, midi, harmony]
parents:
  - [[req_midi_controller_input]]
dependents:
  - [[rule_chord_fit_criteria]]
  - [[rule_chord_fit_measure_assignment]]
  - [[rule_chord_fit_only_off_script]]
version: 0.1
---

# End-of-Measure Chord-Fit Acknowledgement

## INTENT
Acknowledge a player who embellishes or improvises on the written line in a way that fits the harmony.

## THE RULE / LOGIC
Beyond matching individual expected notes exactly, the app quietly acknowledges, measure by measure, a player who departs from the written line while what they play still makes musical sense over the harmony. The acknowledgement is positive-only and quiet, and distinct on screen from the note-level highlight; exactly how it looks belongs to the interface design. If nothing at all was played in a measure, or what was played does not fit, nothing is ever shown: there is no "almost" signal.

## TECHNICAL INTERFACE
At the end of each measure played off-script, the session view may show one quiet, positive chord-fit acknowledgement.

## EXPECTATION
- A measure that departs from the written line and fits the harmony gets the chord-fit acknowledgement.
- A measure with nothing played, or that does not fit, shows nothing at all.
