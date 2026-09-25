---
id: module_pitch_domain_validation
status: REVIEW
human_name: Pitch Domain Validation
type: MODULE
layer: ARCHITECTURE
priority: 1
version: 1.0
dependents: []
tags: pitch
parents:
  - [[entity_pitch_candidate_domain]]
---

# Pitch Domain Validation

## INTENT
Independently validate a pitch candidate from reconstructed musical facts before it can become a generation result.

## THE RULE / LOGIC
The validator reconstructs range, resolved-window, rhythm, harmony, contour, interval, leap-recovery, arpeggio, and tension facts directly from immutable candidate content and its bound input. It does not trust planner annotations, cached planner state, ranking metadata, diagnostics, or an asserted validity flag. It returns the unchanged valid candidate or stable validation failures without repairing, reranking, selecting, or mutating it.

## TECHNICAL INTERFACE
Callers submit one immutable pitch candidate with its bound input and receive an immutable validated phrase candidate or explicit validation failures. The interface accepts no mutable planner state, seed, random source, wall-clock value, diagnostics, or numeric calibration table.

## EXPECTATION
No candidate reaches GenerationResult unless independent reconstruction confirms every applicable range/window and melodic obligation. Revalidation of the same immutable values produces the same outcome and cannot be changed by planner annotations or diagnostics.
