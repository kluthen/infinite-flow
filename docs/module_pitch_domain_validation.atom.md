---
id: module_pitch_domain_validation
status: REVIEW
human_name: Pitch Domain Validation
type: MODULE
layer: ARCHITECTURE
priority: 1
version: 1.3
dependents: []
tags: pitch
parents:
  - [[entity_pitch_candidate_domain]]
  - [[rule_extensions_never_chord_tones]]
  - [[rule_join_reads_carried_chord_as_triad]]
  - [[rule_seventh_is_chord_tone]]
---

# Pitch Domain Validation

## INTENT
Independently validate a pitch candidate from reconstructed musical facts before it can become a generation result.

## THE RULE / LOGIC
The validator reconstructs range, resolved-window, rhythm, harmony, contour, interval, leap-recovery, arpeggio, and tension facts directly from immutable candidate content and its bound input. It does not trust planner annotations, cached planner state, ranking metadata, diagnostics, or an asserted validity flag. It returns the unchanged valid candidate or stable validation failures without repairing, reranking, selecting, or mutating it.

Each note carries two chord facts, mirroring the pitch search's: a chord-tone fact, whether its pitch class is one of the chord tones of the harmony event sounding under it (the triad's three, plus the seventh when the event takes its seventh form), and a triad-tone fact beside it, whether it is one of the triad's three. Over a triad-form event the two agree, so the validator's answers over triad plans are unchanged. The figure rules and the motion rules' runs read the chord-tone fact; the final note's open ending, the tense ending a phrase generated with carry-in may end on, and the first note when it settles something owed across the join read the triad-tone fact. After a carried tense note the first note must resolve it onto a triad tone. When the carried pitch owes a leap recovery, the first note fails at attack 0 if it repays the recovery on a chord tone outside the triad, the seventh of its chord; the recovery's own interval rule is unchanged, so any other note 1 to 4 semitones back repays it, a figure's decorating note included. A first note that owes nothing may be the seventh. So the validator accepts exactly what the search writes: the seventh as a chord tone inside the phrase, and the triad at the phrase's ends. A ninth, eleventh or thirteenth is never a chord tone.

The figure rules read the request's figure levels. A note outside the key and mode fails (out_of_collection) unless the levels allow chromatic notes, and then fails (invalid_chromatic_ornament) unless it belongs to a complete chromatic approach or enclosure with no bound member whose level is not Off. A scale note outside the chord fails (unexplained_non_chord_tone) unless it belongs to the bound figure, or is a free passing tone, accented passing tone or neighbor tone, a free appoggiatura (entered by a leap of 3 half steps or more from the note before, on beat 1 or 3, and resolved by one scale step onto the next note, a chord tone under the same harmony), or a member of a diatonic enclosure with no bound member (two scale notes outside the chord, one a scale step above and one a scale step below the chord tone after them, in either order, the three back to back under one harmony), each only when its figure's level is not Off; or unless it is the tense note a phrase generated with carry-in may end on for its next phrase to resolve, accepted only where the levels allow a free scale note on that last note (the passing tone for its beat, or the neighbor tone, not Off). Over a seventh chord the seventh and the root lie one scale step apart, so no passing tone or neighbor tone fits between them.

## TECHNICAL INTERFACE
Callers submit one immutable pitch candidate with its bound input and receive an immutable validated phrase candidate or explicit validation failures. The interface accepts no mutable planner state, seed, random source, wall-clock value, diagnostics, or numeric calibration table. reconstructPhraseFacts (src/domain/pitch/validation/phrase-facts.ts) gives each SoundingFact (src/domain/pitch/validation/pitch-validation-types.ts) its chordTone from chordTones(harmony) (src/domain/harmony/harmony-types.ts) and a triad-tone fact from the event's triad. The figure rules are figureFailures in src/domain/pitch/validation/figure-rules.ts; the runs are read in src/domain/pitch/validation/motion-rules.ts; the final note in src/domain/pitch/validation/contour-endpoint-rules.ts and the tense ending and the first note's landing in src/domain/pitch/validation/join-rules.ts read the triad-tone fact. join-rules.ts reads the recovery the carried pitch owes from joinLead's owedLeapDirection and refuses its repayment on a chord tone outside the triad. The tense ending a joined phrase may owe is isOwedTenseEnding in join-rules.ts, which figure-rules.ts and contour-endpoint-rules.ts call; both read the levels through the allowance helpers of src/domain/figures/figure-levels.ts.

## EXPECTATION
No candidate reaches GenerationResult unless independent reconstruction confirms every applicable range/window and melodic obligation. Revalidation of the same immutable values produces the same outcome and cannot be changed by planner annotations or diagnostics. Over triad plans the validator's answers are those it gave before seventh chords existed. Over a seventh-form event it accepts a phrase that lands on, resolves onto and runs through the seventh, and a phrase owing nothing across the join that starts on the seventh; it refuses a phrase generated without carry-in that ends on its final chord's seventh, a tense carried note resolved onto the first chord's seventh, a recovery owed across the join repaid on that seventh, and a ninth treated as a chord tone; a recovery owed across the join repaid on any other note 1 to 4 semitones back still passes.
