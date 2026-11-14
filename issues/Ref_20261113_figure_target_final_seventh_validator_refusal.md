# Issue: Above Off, a chromatic figure can aim at the final chord's seventh, and the validator refuses the phrase

**ID:** `Ref_20261113_figure_target_final_seventh_validator_refusal`
**Ref:** `ISS-019`
**Date:** 2026-11-13
**Severity:** Medium
**Status:** Resolved
**Component:** `src/domain/pitch/pitch-candidates.ts`
**Affects:** `src/domain/pitch/validation/phrase-facts.ts`, `src/domain/pitch/validation/figure-rules.ts`, `src/session/failure-ladder.ts` (joined attempts at a Seventh chords level above Off with chromatic figures on, e.g. the built-in Bebop preset)

---

## Summary

At a Seventh chords level above Off, the pitch search can end a joined phrase with a chromatic
enclosure (or approach) whose target is the final chord's seventh. The whole-result validator reads
the final note against the final chord's triad (spec D6.3: a final seventh is a tense note, not a
chord tone), finds no chord-tone target for the figure, and refuses the phrase with
`result_validation_failed`. No phrase is lost: the failure ladder tries the next rung. But each
refusal costs a whole attempt, the search and the validator disagree, and a generated phrase is
thrown away. Found by v3.3 chunk 18's cost guard run (M2): built-in Bebop at Strongly favored, 105
of 6,993 distinct intents refused; 0 at Off, and none in any other measured setting.

---

## Technical Description

### Background

The search and the validator must agree on every phrase: the validator is the independent check of
what the search builds, and only search outcomes (`no_legal_pitch_plan`,
`search_limit_exceeded`, ...) should make a generation fail. Since v3.3 chunk 5 a seventh-form
chord's seventh is a chord tone inside the phrase; at the phrase's end the triad reading holds
(D6.3): a joined phrase may end on the final chord's seventh only as a tense note the next phrase
resolves.

### The Problem Scenario

Sample (joined, B major, built-in Bebop at Strongly favored), bar 4 on F#7 (triad F# A# C#,
seventh E):

```
attack #23  F4  (65) "and" of beat 3   search: upper note of a chromatic enclosure onto #25
attack #24  D#4 (63) beat 4            search: lower note of the enclosure
attack #25  E4  (64) "and" of beat 4   final note, F#7's seventh
                                        search: a chord tone (chordPitchClasses holds the seventh)
                                        validator: a tense ending (chordTone = triadTone), accepted
validator: invalid_chromatic_ornament@23 (target not a chord tone),
           unexplained_non_chord_tone@24
=> window_result_validation_failed => result_validation_failed => next ladder rung
```

Replay: `npm run replay:phrase -- <key>` gives `result_validation_failed` for

`ifk5.WyJzZXNzaW9uLTEiLDEyMjYyNDEyMTQsWzYwLCJCIiwiTWFqb3IiLCJBY3RpdmUgZGlhdG9uaWMiLCJFZGdlIiwiRWlnaHRoIiwiU3RyaWN0IiwiT2NjYXNpb25hbCBvZmZiZWF0cyIsIlNwYXJzZSIsIldhbmRlcmluZyIsIlZhcnlpbmciLCJMZWFwaW5nIiwiVmFyaWVkIiwiYy1rZXlib2FyZCJdLHsicGFzc2luZ1RvbmUiOiJhc1RvZGF5IiwiYWNjZW50ZWRQYXNzaW5nVG9uZSI6ImFzVG9kYXkiLCJuZWlnaGJvclRvbmUiOiJhc1RvZGF5IiwiYXBwb2dnaWF0dXJhIjoib2ZmIiwiZGlhdG9uaWNFbmNsb3N1cmUiOiJmYXZvcmVkIiwiY2hyb21hdGljQXBwcm9hY2giOiJzdHJvbmdseUZhdm9yZWQiLCJjaHJvbWF0aWNFbmNsb3N1cmUiOiJzdHJvbmdseUZhdm9yZWQifSwyLHsibGFzdFBpdGNoIjp7Im1pZGkiOjYxLCJhcnJpdmluZ0ludGVydmFsIjotMSwicmVjb3ZlcnkiOnsia2luZCI6InNldHRsZWQifX0sInJlZ2lzdGVyV2luZG93Ijp7ImtpbmQiOiJSZWdpc3RlcldpbmRvdyIsIm1pbk1pZGkiOjU0LCJtYXhNaWRpIjo2Nn0sImZpbmFsSGFybW9ueSI6eyJ0cmlhZCI6eyJkZWdyZWUiOjUsInBpdGNoQ2xhc3NlcyI6WzYsMTAsMV0sInF1YWxpdHkiOiJtYWpvciJ9LCJzZXZlbnRoIjp7InBpdGNoQ2xhc3MiOjQsInF1YWxpdHkiOiJkb21pbmFudC1zZXZlbnRoIn0sInJvbGUiOiJvcGVuX2Fycml2YWwiLCJlbmRwb2ludCI6eyJraW5kIjoidG9uYWxfZGVncmVlX2ZpdmVfY2hvcmRfdG9uZSIsImRlZ3JlZSI6NX19LCJwaHJhc2VOdW1iZXIiOjF9LG51bGwsbnVsbCxudWxsLHsic2V2ZW50aC1jaG9yZHMiOiJzdHJvbmdseUZhdm9yZWQifV0`

### Where This Pattern Exists Today

- Search: `src/domain/pitch/pitch-context.ts` gives every attack, the final one included,
  `chordPitchClasses: chordTones(event)` (the seventh included); `src/domain/pitch/pitch-candidates.ts`
  `approachPaths` / `enclosurePaths` (via `chromaticApproachPaths`), `diatonicEnclosurePaths` and
  `appoggiaturaPaths` take their goal from `chordMidis(facts, target)`.
- Validator: `src/domain/pitch/validation/phrase-facts.ts` `reconstructPhraseFacts` gives the final
  attack `chordTone = triadTone`; `src/domain/pitch/validation/figure-rules.ts` `chromaticOrnament`
  requires `target.chordTone`.
- Only joined phrases: a final note outside the triad is legal only through the tense ending
  (`tenseEndingCandidates`, allowed by `phraseEndingDebtAllowance` with a carry-in).
- Only above Off: at Off `chordTones` is the triad, and the two sides agree.

---

## Risk Assessment

| Factor              | Value                                                                                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Likelihood          | Medium: with Bebop at Strongly favored, 102 of 6,157 joined distinct intents (Sometimes 30, Favored 68); in principle any setting with chromatic figures on |
| Impact if triggered | Low today: the ladder retries, every phrase 2 to 6 was still generated at 60, 120 and 240 BPM; each refusal spends a joined attempt                         |
| Detectability       | High: `result_validation_failed` in the cost runner's distinct-intent failures (`COST_SETTINGS=sevenths`), and the replay key above                         |
| Current mitigant    | The failure ladder (`src/session/failure-ladder.ts` `rungAfterFailure`) sends the failure to the next rung; the app sends Off until v3.3 chunk 19           |

---

## Recommended Fix

**Short term:** Keep the cost runner's distinct-intent failures by code in every M2 report so the
count is watched; nothing reaches players before the Seventh chords control ships (chunk 19).

**Medium term:** In `pitch-candidates.ts`, make the figure paths' goal read the target as the
validator does: for the final attack, its triad (`triadPitchClasses`) instead of
`chordPitchClasses` (a small `figureTargetMidis(facts, target)` used by `approachPaths`,
`enclosurePaths`, `diatonicEnclosurePaths` and `appoggiaturaPaths`). The validator stays as it is:
the spec reads a final seventh as a tense note only. Guard it with the corpus at Off (unchanged) and
a test on the sample key above.

**Long term:** One shared reading of "chord tone at this attack" for the search and the validator,
so a change to the ending rules cannot split them again.

---

## Extra Data

Built-in Bebop, 568 sweep cases at 60, 120 and 240 BPM, flat attempt cost (deterministic):

| Level            | Distinct intents | Standalone / joined | `result_validation_failed` |
| ---------------- | ---------------- | ------------------- | -------------------------- |
| Off              | 6,888            | 678 / 6,210         | 0                          |
| Sometimes        | 6,877            | 678 / 6,199         | 30, all joined             |
| Favored          | 6,854            | 672 / 6,182         | 68, all joined             |
| Strongly favored | 6,834            | 677 / 6,157         | 102, all joined            |

Every refused intent carries exactly `invalid_chromatic_ornament` and
`unexplained_non_chord_tone`; in all of them the last three notes are a chromatic enclosure (upper,
lower) onto a final note on its chord's seventh.

---

## References

- `src/domain/pitch/pitch-candidates.ts`, `src/domain/pitch/pitch-context.ts`
- `src/domain/pitch/validation/phrase-facts.ts`, `src/domain/pitch/validation/figure-rules.ts`
- `tests/sweep/cost-guard.measure.ts` (`npm run measure:cost`, `COST_SETTINGS=sevenths`)
- [Seventh chords: the cost guard](../docs/generation-latency.md#seventh-chords-the-cost-guard)
- Master spec D6.3 (endings read the triad), D10 (the cost guard)

---

## Change Log

- **2026-11-13**: Resolved in v3.3 chunk 5's second addendum (spec D535), on `v3.3-w4`, the
  medium-term fix above. In `src/domain/pitch/pitch-candidates.ts` the five figure paths
  (`boundPaths`, Tension's scheduled figure; `approachPaths` and `enclosurePaths`, through
  `chromaticApproachPaths`; `appoggiaturaPaths`; `diatonicEnclosurePaths`) take their goal from
  `figureGoalMidis(facts, target)`, which reads `figureGoalPitchClasses(target)`
  (`src/domain/pitch/pitch-types.ts`): the target's `triadPitchClasses` on the final attack, its
  `chordPitchClasses` elsewhere. The free domains' cache key reads the targets' goal tones. The
  final note's own candidates and the validator are unchanged; inside the phrase a figure still
  resolves onto the seventh. Guarded by named tests in
  `tests/unit/domain/pitch/pitch-candidates.spec.ts` (each figure kind over the final attack of a
  hand-built Cmaj7 plan) and `tests/unit/generation-worker/phrase-replay-key-final-figure.spec.ts`
  (the key above now replays to a phrase). The corpus guard and the goldens pass unchanged. Re-run
  ([the record](../docs/generation-latency.md#iss-019-fixed-a-figures-goal-on-the-final-attack-v33-chunk-5-second-addendum)):
  Bebop's `result_validation_failed` is 0 at every level (30, 68 and 102 before; 105 in the cost
  runner at Strongly favored), every phrase generated.
