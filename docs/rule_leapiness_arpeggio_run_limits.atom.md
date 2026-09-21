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
version: 0.1
---

# Leapiness Arpeggio Run Limits

## INTENT
Limit recognized same-direction chord-tone runs according to the selected leapiness.

## THE RULE / LOGIC
Smooth permits no leap-producing arpeggio run. Shaped permits one recognized two-note chord-tone skip pair. Leaping permits a large leap to recover immediately or after one recognized same-direction chord-tone run of no more than 3 notes. Angular uses the same recovery allowance and permits no more than one 3-note arpeggio run per measure or two per phrase.

## TECHNICAL INTERFACE
The selected leapiness constrains recognized arpeggio-run acceptance.

## EXPECTATION
A phrase contains only the recognized arpeggio runs permitted by its selected leapiness and never exceeds its per-measure or phrase run limit.
