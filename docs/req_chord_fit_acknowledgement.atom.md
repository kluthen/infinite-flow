---
id: req_chord_fit_acknowledgement
status: DRAFT
priority: 1
type: REQUIREMENT
layer: BUSINESS
human_name: End-of-Measure Chord-Fit Acknowledgement
tags: [v3, nice-to-have, dropped-in-v3, acknowledgement, midi, harmony]
parents:
  - [[req_midi_controller_input]]
dependents:
  - [[rule_chord_fit_criteria]]
  - [[rule_chord_fit_measure_assignment]]
  - [[rule_chord_fit_only_off_script]]
version: 0.2
notes: Dropped by the v3 scope (2026-10-07, v3.0 spec ingestion): the approved v3 scope drops the end-of-measure chord-fit check, so this nice-to-have is no longer a candidate for any v3 release. Not deleted yet: the vision as it stands (STABLE) still names it as a v3 nice-to-have, so its retirement is proposed together with the vision revision in docs/release/v3.0-intent-change-set.md. No code or test links it.
---

# End-of-Measure Chord-Fit Acknowledgement

## INTENT
Acknowledge a player who embellishes or improvises on the written line in a way that fits the harmony.

## THE RULE / LOGIC
Not committed scope: this acknowledgement is a nice-to-have for v3, not part of v2. It is recorded as the starting point for when it is scheduled, and nothing in it binds any v2 release.

Beyond matching individual expected notes exactly, the app quietly acknowledges, measure by measure, a player who departs from the written line while what they play still makes musical sense over the harmony. The acknowledgement is positive-only and quiet, and distinct on screen from the note-level highlight; exactly how it looks belongs to the interface design. If nothing at all was played in a measure, or what was played does not fit, nothing is ever shown: there is no "almost" signal.

## TECHNICAL INTERFACE
At the end of each measure played off-script, the session view may show one quiet, positive chord-fit acknowledgement.

## EXPECTATION
- A measure that departs from the written line and fits the harmony gets the chord-fit acknowledgement.
- A measure with nothing played, or that does not fit, shows nothing at all.
