---
id: rule_leapiness_arpeggio_run_limits
status: DRAFT
tags: melody,leapiness,arpeggio,hard-constraint
parents:
  - [[req_four_measure_phrase]]
dependents: []
layer: BUSINESS
priority: 1
human_name: Leapiness Arpeggio Run Limits
type: RULE
version: 0.2
---

# Leapiness Arpeggio Run Limits

## INTENT
Limit recognized same-direction chord-tone runs according to the selected leapiness.

## THE RULE / LOGIC
A recognized run is exactly three consecutive sounding chord tones of one unchanged harmony connected by two same-direction intervals of at least 3 semitones; rests do not break adjacency. A single chord-tone interval is ordinary motion and never counts as a run. Two consecutive same-direction intervals of at least 3 semitones are legal only as a recognized run, and a third such interval is always invalid. Smooth, Shaped, and Leaping permit at most one run per phrase (Smooth runs contain only skips because of its 4-semitone cap). Angular permits at most two runs per phrase and one per measure, counted in the measure of the run's first note.

## TECHNICAL INTERFACE
The selected leapiness constrains recognized arpeggio-run acceptance.

## EXPECTATION
A phrase contains no unrecognized chain of same-direction intervals of at least 3 semitones, no chain longer than a recognized run, and never exceeds its level's per-measure or phrase run limit.
