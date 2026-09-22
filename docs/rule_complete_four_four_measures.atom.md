---
id: rule_complete_four_four_measures
status: DRAFT
human_name: Complete Four-Four Measures
type: RULE
layer: BUSINESS
parents:
  - [[req_four_measure_phrase]]
version: 0.1
priority: 1
tags: meter,rhythm,hard-constraint
dependents:
  - [[entity_concert_event_timeline]]
  - [[entity_exact_musical_time]]
---

# Complete Four-Four Measures

## INTENT
Require every generated measure to occupy exactly four beats in 4/4.

## THE RULE / LOGIC
Each of the four generated measures fills exactly four beats using the selected subdivision grid. A generation that cannot satisfy the requested meter fails explicitly instead of returning an incomplete phrase.

## TECHNICAL INTERFACE
The phrase-generation request and result use four measures in 4/4.

## EXPECTATION
Every accepted phrase contains four complete 4/4 measures with no overfilled or underfilled measure.
