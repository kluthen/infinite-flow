---
id: module_pitch_domain_validation
status: REVIEW
human_name: Pitch Domain Validation
type: MODULE
layer: ARCHITECTURE
priority: 1
version: 1.1
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

The figure rules read the request's figure levels. A note outside the key and mode fails (out_of_collection) unless the levels allow chromatic notes, and then fails (invalid_chromatic_ornament) unless it belongs to a complete chromatic approach or enclosure with no bound member whose level is not Off. A scale note outside the chord fails (unexplained_non_chord_tone) unless it belongs to the bound figure, or is a free passing tone, accented passing tone or neighbor tone, a free appoggiatura (entered by a leap of 3 half steps or more from the note before, on beat 1 or 3, and resolved by one scale step onto the next note, a chord tone under the same harmony), or a member of a diatonic enclosure with no bound member (two scale notes outside the chord, one a scale step above and one a scale step below the chord tone after them, in either order, the three back to back under one harmony), each only when its figure's level is not Off; or unless it is the tense note a phrase generated with carry-in may end on for its next phrase to resolve, accepted only where the levels allow a free scale note on that last note (the passing tone for its beat, or the neighbor tone, not Off).

## TECHNICAL INTERFACE
Callers submit one immutable pitch candidate with its bound input and receive an immutable validated phrase candidate or explicit validation failures. The interface accepts no mutable planner state, seed, random source, wall-clock value, diagnostics, or numeric calibration table. The figure rules are figureFailures in src/domain/pitch/validation/figure-rules.ts; the tense ending a joined phrase may owe is isOwedTenseEnding in src/domain/pitch/validation/join-rules.ts, which figure-rules.ts and contour-endpoint-rules.ts call; both read the levels through the allowance helpers of src/domain/figures/figure-levels.ts.

## EXPECTATION
No candidate reaches GenerationResult unless independent reconstruction confirms every applicable range/window and melodic obligation. Revalidation of the same immutable values produces the same outcome and cannot be changed by planner annotations or diagnostics.
