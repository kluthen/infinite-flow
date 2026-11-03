# Issue: A joined phrase's first note is pinned at the window's edge, where its contour cannot start

**ID:** `Ref_20261027_join_first_note_pinned_at_window_edge`
**Ref:** `ISS-015`
**Date:** 2026-10-27
**Severity:** Medium
**Status:** Open (fixes deferred past v3.2, spec D447; the Falling floor case accepted as a known limit, spec D448)
**Component:** `src/domain/generation/carry-in/phrase-ending-debt.ts`
**Affects:** `src/domain/pitch/pitch-candidates.ts` (tense endings offered), `src/domain/pitch/validation/join-rules.ts` (the validator's tense ending), `src/domain/generation/carry-in/carry-in-fit.ts` (the carry-in fit and setting-change recheck), `src/domain/pitch/pitch-advance.ts` and `src/domain/pitch/pitch-contour.ts` (where the next phrase fails), `src/session/failure-ladder.ts` (which hides it), Jam's phrase 1 to phrase 2 join (`src/jam/doodle-join.ts`, v3.2 chunk 18)

---

## Summary

A phrase generated with carry-in may end on a tense note (a scale tone outside the final chord), and the next phrase must resolve it on its first note: a step onto a tone of its opening tonic triad. That resolution almost always leaves exactly one possible first note. When that note is the highest (or lowest) scale tone of the register window the phrase inherits, a Contour of Arch or Rising (or Falling) has no room to make its first required move, so every harmony, rhythm and tension binding is rejected on the first note, for every seed. The carry-in attempt fails (`no_legal_pitch_plan`, or `search_limit_exceeded` when the bindings are numerous), and the failure ladder falls back to a standalone phrase: the player still gets a phrase, but not a joined one, and the tense note stays unresolved. The check that should prevent this, `tenseNoteCanSettle`, only asks whether a resolving triad tone exists inside the window. It never asks whether the next phrase can start there under its contour, so it breaks the module's own stated invariant ("a phrase only ends owing something the next phrase can actually settle"). A related case with no tense note involved, Falling + Smooth with the last note on the window's lowest triad tone, fails the same way through Smooth's interval cap. With the doodle set's controls, Jam's phrase 2 loses its join for every seed in 7 of 33 (doodle, instrument) cases.

---

## Technical Description

### Background

- The join (`rule_join_carry_in_limited`, STABLE) carries the last pitch, the register window, the final chord and the ordinal. The next phrase keeps the carried window and treats the carried pitch as the note before its first attack (`rule_join_interval_obeys_phrase_rules`): the interval cap of its Leapiness applies (Smooth 4, Shaped 7, Leaping 10, Angular 12 semitones).
- The first attack's candidates are only the chord tones of the first chord, always the tonic triad (`ordinaryCandidates`, `pitch-candidates.ts:589`). A carried pitch never prepares a non-chord tone.
- A tense carried pitch must be resolved by the first attack: a step of 1 or 2 semitones onto a chord tone (`leavesCarriedTensionUnresolved`, `pitch-advance.ts:114`, rejected at `:211`; validator `carriedTensionFailures`, `join-rules.ts:138`). This is `rule_join_tense_note_resolution`.
- Contour is checked at four checkpoints, roughly the first fresh attack of each bar (`compileContourPlan` / `advanceContour`, `pitch-contour.ts:196-223`). Arch needs a strict rise to checkpoint 2 or 3, Rising needs at least one strict rise and no fall, and Falling needs at least one strict fall and no rise (`mechanic_pitch_contour_forward_check`).
- A phrase generated with carry-in may end on a tense note only when `tenseNoteCanSettle(midi, collection, window)` holds (`phrase-ending-debt.ts:131`). Three places read it: the planner (`tenseEndingCandidates`, `pitch-candidates.ts:533`), the validator (`isOwedTenseEnding`, `join-rules.ts:113`) and the carry-in fit and setting-change recheck (`carriedDebtProblem`, `carry-in-fit.ts:87`). The module header (`phrase-ending-debt.ts:11-15`) states the intent: "A phrase only ends owing something the next phrase can actually settle."

### The Problem Scenario

Reproduction (C keyboard, C Ionian, Neutral levels, no steering, chord-stabs controls Smooth / Arch / Quarter / Heavily varied / Straight / Sparse / High; phrase 1 seed 9 at Idle, phrase n seed 900+n−1 with the carry-in):

```
phrase 5 (with carry-in)  ... 72 72 71 | final chord C major (C E G), window 60-72
                          last note B4 = 71: tense (not in C E G), a step below the window top
                          tenseNoteCanSettle(71, C Ionian, 60-72) -> true (C5 = 72 is in the window)
                          => tense ending offered, accepted by the validator

phrase 6 (carry-in, any seed)
  attack 0 candidates = tonic triad tones in 60-72: 60 64 67 72
    60, 64, 67 -> carried_tension_unresolved (not a 1-2 semitone step from 71)
    72         -> contour_infeasible: 72 is checkpoint 1 and the highest scale tone
                  of the window; Arch needs a later checkpoint strictly above it
  x 744 bindings (every harmony x rhythm x tension binding): depth 0, nothing accepted
  => no_legal_pitch_plan for seeds 905 and 1-8 alike (the seed only reorders candidates)

failure ladder: carry-in search exhausted -> straight to the standalone rung
  => phrase 6 is standalone: no join, B4 left unresolved
```

The same mechanism without a tense note (sparse-calls doodle controls: Falling / Smooth / Quarter / Breath-heavy, C keyboard, window 54-66):

```
phrase 1 (Falling) ends on G3 = 55, the window's lowest open ending (54 is not in C Ionian)
phrase 2 attack 0: tonic triad tones within Smooth's 4 semitones of 55, inside 54-66 -> {55}
  60 and 64 -> interval_cap_exceeded; 55 -> contour_infeasible (nothing below 55 to fall to)
  => no_legal_pitch_plan for every seed, with or without steering, on all three instruments
```

Counterfactuals on every failing attempt found (scratch probe): with the tense obligation removed (the carried chord dropped) the same request succeeds in 100% of tense failures (84 of 84 in the session runs). With Contour changed to Wandering it succeeds in 100% of all failures. Changing the seed, Shaped instead of Smooth, or steering on or off changes nothing for the depth-0 cases.

The `search_limit_exceeded` variant is the same cause. When the rhythm domain is large (Eighth density, for example the eighth-offbeats controls on B-flat tenor), every one of 31,524 bindings is rejected at attack 0 for a few units of fuel each. The 160,000-unit window fuel runs out before the enumeration ends, so the outcome reads `search_limit_exceeded` (about 1.35 s per attempt in Node here) instead of `no_legal_pitch_plan` (about 3 ms). Under `rule_session_generation_failure_ladder` a search-limit failure keeps its three carry-in retries, so the ladder spends up to about 4 × 1.35 s on retries that cannot succeed before the standalone rung.

### Where This Pattern Exists Today

- `src/domain/generation/carry-in/phrase-ending-debt.ts:131` `tenseNoteCanSettle`: window + triad + step only, with no contour headroom. The same gap applies to `owedRecoveryCanSettle` (`:117`), though no recovery failure was observed.
- `src/domain/pitch/pitch-candidates.ts:533-548` `tenseEndingCandidates`: offers every settleable tense ending.
- `src/domain/pitch/validation/join-rules.ts:113` `isOwedTenseEnding`: accepts it on the validator side.
- `src/domain/generation/carry-in/carry-in-fit.ts:87` `carriedDebtProblem`: the recheck after a setting change uses the same predicate.
- `src/domain/pitch/pitch-advance.ts:114,211,237`: where the next phrase rejects every first note (`carried_tension_unresolved`, `contour_infeasible`).
- `src/domain/pitch/pitch-contour.ts:185-223`: the contour plan's checkpoint viability.
- `src/session/failure-ladder.ts` (`LADDER`): falls back silently, so nothing surfaces.

---

## Risk Assessment

| Factor              | Value                                                                                                                                                                                                                                                                                                                                                      |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Likelihood          | Low with default settings (0 of 315 joins). Medium across the sweep's mix (20 of 126 tense endings, 0.7% of all joins). High for Arch or Rising with a High or Low register (in the grid, every tense ending of Arch or Rising with Shaped or Smooth in High or Low was a dead end), and for the doodle set's controls (7 of 33 Jam cases for every seed). |
| Impact if triggered | Medium. No phrase is lost and no alert appears (designed ladder fallback), but the join is not smoothed, the tense note is never resolved (the feature is defeated where it fires), and the `search_limit_exceeded` variant costs up to about 5 s of generator time on doomed retries.                                                                     |
| Detectability       | Low. Hidden by the ladder: only visible as `origin: 'standalone'` in session history, or as "generated without the join" in the cost and Jam sweeps.                                                                                                                                                                                                       |
| Current mitigant    | The failure ladder (`rule_session_generation_failure_ladder`, STABLE) always produces a phrase; `rule_open_phrase_ending` and `rule_join_tense_note_resolution` explicitly allow a tense ending to stay unresolved when the next phrase is standalone.                                                                                                     |

**Defect or allowed fallback?** The user-visible outcome (a standalone phrase, the tense note dropped) is within spec. The ladder is designed for it, and the two rules above name that case. But the tense ending case is a defect against intent. `rule_join_tense_note_resolution`'s INTENT is that the tense ending resolves onto the next phrase, and the code's own documented invariant (`phrase-ending-debt.ts:11-15`) promises that a phrase only ends owing what the next phrase can settle. Here the ending is offered when the next phrase deterministically cannot settle it: 61% of tense endings in the grid below are dead ends, for every seed. No atom EXPECTATION is literally violated, because they are all conditional on "the next phrase is generated with its carry-in". The non-tense Falling + Smooth floor pin is a design limitation within spec (interval cap + contour + inherited window). It is no defect against an atom.

---

## Decision (2026-10-27)

The owner deferred fixes A and C past v3.2 (spec D447) and accepted the plain floor/ceiling pin
(sparse-calls, Falling + Smooth) as a known limit, option B2 (spec D448). v3.2's Jam sweep (M1),
session sweep (M5), chunk 18 and chunk 29 read their figures with this issue named, not tuned
around it. The known limit is written in `docs/music/pitch-planner-validation.md` ("Joins between
session phrases (v2)"); `documentalist` words it into `rule_join_interval_obeys_phrase_rules` at
wave 4's sync.

---

## Recommended Fix

**Short term (no code change):** record this behaviour in chunk 18's brief. The Jam sweep (M1/M5) will count these cases as "generated without the join", and the eighth-offbeats/B-flat tenor phrase 2 attempt costs about 1.35 s per carry-in attempt, which the ladder's time keeping must absorb at 180 BPM (a phrase lasts 5.33 s). Read those figures with this issue in mind.

**Medium term (fix A, recommended): only end owing what the next phrase can start from.** Extend the single "can settle" predicate in `phrase-ending-debt.ts` with a contour-headroom condition. A tense ending is settleable only when some resolving tonic-triad tone r inside the window still has a collection tone strictly above r (Arch, Rising) or strictly below r (Falling) inside the window. Wandering is unchanged. The contour is the ending phrase's own (a session's next phrase shares it), and `carriedDebtProblem` rechecks it against the receiver's contour after a setting change, dropping the tense part as it already does for an unsettleable debt. All three readers (planner, validator, fit check) pick it up together, so they cannot disagree.

- _Prototype evidence_ (scratch `vi.mock` of `tenseNoteCanSettle`, no repo change): grid failed joins 79 → 15 (every tense failure gone: 64 → 0; tense endings 105 → 41, the 41 that joined fine are all kept). Sweep cases: tense-join failures 20 → 6 (the remaining 6 are deeper failures, below), standalone phrases 19 → 5. Jam probe: 7 of 33 → 3 of 33 (only sparse-calls remains). The predicate is slightly conservative: in the sweep, 7 of 22 "pinned" tense endings did join, because the first attack was not checkpoint 1 and could move before it.
- _Intent impact:_ `rule_join_tense_note_resolution` (REVIEW, BUSINESS) gains the condition that a tense ending is offered only when the next phrase's first note can resolve it and still move as its contour requires. `rule_open_phrase_ending` (STABLE) wording is compatible and needs no change. `rule_join_carry_in_limited` (STABLE) is untouched, since nothing new crosses the join (the contour is a setting, not carry-in). `rule_setting_change_rechecks_pitch_carry_in` (STABLE) may need its recheck sentence widened to cover "a tense pitch it owes must be resolvable" (today it names only the leap recovery). If so, the owner confirms it under `contract_infinite_flow_first_release`.
- _Corpus risk:_ fix A changes the output of successful carry-in phrases, namely those that today end on a pinned tense note. A scan of the recorded corpora found **4 such carry-in phrases in `tests/fixtures/replay-keys/v3.0-neutral-jazz.json`** (0 in `ifk1-v2.0.json`, 0 in `v3.1-corpus.json`), so ungated it turns the v3.0 corpus guard red. It must therefore be gated behind a new request field (v3.2's pattern for `rhythmLock`/`steering`: absent means exactly v3.1's request). That adds a slot to the `ifk4.` replay key or a new key version: `module_phrase_replay_key` (STABLE) and the CONTRACT (MAJOR bump with owner confirmation, as for 10.0). Requests without the field stay byte-identical, so every corpus stays green.

**Medium term (fix C, cheap and corpus-safe): prove the join infeasible before enumerating bindings.** Before the window search enumerates bindings for a carry-in request, compute the set of legal first notes (tonic-triad tones in the window that resolve the tense pitch, or lie within the interval cap) and check them against the contour's checkpoint feasibility (`contourAssignable`, ignoring reach) whenever the first attack is checkpoint 1 for every rhythm. If none can start, return `no_legal_pitch_plan` at once. This turns the 1.35 s `search_limit_exceeded` attempts (and their three doomed retries) into a 3 ms exhausted search, so the ladder goes straight to standalone. Only failure codes and diagnostics of failing requests change; the corpora hold successful timelines only, so they stay byte-identical. Intent: the module or mechanic atoms of the search (`mechanic_pitch_search_policy`, REVIEW) gain the precheck. It must be sound (never reject a feasible request), so its test is a property test against the full search.

**Long term (the plain floor/ceiling pin, sparse-calls):** fix A does not cover it. The phrase before owes nothing; its contour simply drove it to the window's extreme, and Smooth's cap pins the next first note there. There are two options:

- **(B1)** Extend the same headroom condition to every final note of a phrase generated with carry-in, so it cannot end where the next phrase (same contour and leapiness) has no legal start. This covers Jam's phrase 1, which has the doodle's carry-in, and every session phrase from 2 on, under the same gated field as fix A. It cannot cover a session's Idle phrase 1, because `rule_no_carry_in_output_matches_v1` keeps no-carry-in output byte-identical. Not prototyped.
- **(B2)** Accept it as a designed fallback and say so in `rule_join_interval_obeys_phrase_rules`. It hits Falling + Smooth (15 of 90 joins in the grid, Middle register) and the sparse-calls doodle (3 of 33 Jam cases).

The owner's call between B1 and B2.

---

## Extra Data

Measured 2026-10-27 on branch `v3.2-w4` (54e7ffe), Node, idle machine (load about 1.4), with scratch vitest scripts (not committed). Session runs use the real session runner (`runTimedSession` from `tests/unit/session/deadline-sweep.ts`, so the real ladder, seed plan, Vary settings and Tension across phrases apply) at 60 BPM with a 10 ms attempt cost, so timing never cuts a rung. "First carry-in attempt" is rung 0 for phrases 2 to 6.

| Run                                                                                             | Joins | Prev phrase ended tense | Of those, first carry-in attempt failed    | Plain (not tense) joins failed                           | Phrases that fell to standalone    |
| ----------------------------------------------------------------------------------------------- | ----- | ----------------------- | ------------------------------------------ | -------------------------------------------------------- | ---------------------------------- |
| Default settings (Neutral, Arch, Shaped, Middle; 3 instruments × 15 seeds × 8 phrases)          | 315   | 4 (1.3%)                | 0                                          | 0                                                        | 0                                  |
| Deadline-sweep cases (all 568, six-phrase sessions)                                             | 2,827 | 126 (4.5%)              | 20 (15.9%): 15 at the first note, 5 deeper | 4 (0.1%, `search_limit_exceeded`, Sixteenth, retried OK) | 19 (0.7%), 18 after a tense ending |
| Grid: 4 contours × 4 leapiness × 3 registers × 3 instruments × 2 seeds, default rhythm, Neutral | 1,440 | 105 (7.3%)              | 64 (61.0%), all at the first note          | 15 (1.1%), all Falling + Smooth                          | 79 (5.5%)                          |
| Grid with fix A prototype                                                                       | 1,440 | 41 (2.8%)               | 0                                          | 15                                                       | 15                                 |
| Sweep cases with fix A prototype                                                                | 2,828 | 104 (3.7%)              | 6 (5.8%)                                   | 4                                                        | 5                                  |

Grid failures by contour, leapiness and register (joins, tense endings, failed joins): Rising Smooth High 30/10/10, Low 30/11/11; Rising Shaped High 30/6/6, Low 30/10/10; Rising Leaping High 30/4/4, Low 30/4/4; Arch Smooth High 30/3/3, Low 30/3/3; Arch Shaped High 30/3/3, Low 30/1/1; Arch Angular High 30/3/3, Low 30/4/4; Arch Leaping Low 30/2/2; Falling Smooth Middle 30/0/15. No Middle-register tense failure appeared for Arch or Rising: there the window's top scale tone was not a tonic-triad tone (C keyboard Middle 54-66 tops on F), so a scale tone stays above the resolution. 53 of 288 grid sessions lost at least one join.

A geometric predictor ("every legal first note is the window's extreme scale tone in the contour's required direction") matched all 79 grid failures with no false positive. In the sweep cases it caught 15 of the 20 tense failures. The other 5 failed deeper in the phrase (depth 9 to 31): a first note close to the edge leaves the contour too little room further on.

Jam phrase 2 (phrase 1 joined from each doodle of `tests/fixtures/doodles/` with steering at Near and the controls read from the doodle, C Ionian, Neutral; phrase 2 with phrase 1's carry-in, 12 seeds, steering on and off):

| Doodle           | Instrument   | Controls                                  | Phrase 1 end → window            | Phrase 2 with carry-in                      |
| ---------------- | ------------ | ----------------------------------------- | -------------------------------- | ------------------------------------------- |
| quarter-steps    | C keyboard   | Arch / Smooth / Quarter / Sparse          | 72→71 tense, 60-72               | 0/12, `no_legal_pitch_plan`                 |
| quarter-steps    | B-flat tenor | Arch / Smooth / Quarter / Sparse          | 70→69 tense, 58-70               | 0/12, `no_legal_pitch_plan`                 |
| eighth-offbeats  | B-flat tenor | Arch / Smooth / Eighth / Sparse           | 70→69 tense, 58-70               | 0/12, `search_limit_exceeded` (1.35 s each) |
| sixteenth-bursts | B-flat tenor | Arch / Smooth / Sixteenth / Breath-heavy  | 70→69 tense, 58-70               | 0/12, `no_legal_pitch_plan`                 |
| sparse-calls     | all three    | Falling / Smooth / Quarter / Breath-heavy | 55 / 53 / 58 at the window floor | 0/12, `no_legal_pitch_plan` (no tense note) |

The other 26 cases succeeded 12/12. syncopated-push-with-rests on B-flat tenor also ends tense (70→69 in 58-70) but joins 12/12 because its contour is Wandering. That is the one exception the chunk 7 owner saw.

---

## References

- `src/domain/generation/carry-in/phrase-ending-debt.ts`
- `src/domain/pitch/pitch-candidates.ts`, `src/domain/pitch/pitch-advance.ts`, `src/domain/pitch/pitch-contour.ts`, `src/domain/pitch/pitch-context.ts`
- `src/domain/pitch/validation/join-rules.ts`, `src/domain/generation/carry-in/carry-in-fit.ts`
- `src/session/failure-ladder.ts`, `src/jam/doodle-join.ts`
- Atoms: `docs/rule_join_tense_note_resolution.atom.md`, `docs/rule_open_phrase_ending.atom.md`, `docs/rule_join_carry_in_limited.atom.md`, `docs/rule_join_interval_obeys_phrase_rules.atom.md`, `docs/rule_session_generation_failure_ladder.atom.md`, `docs/rule_setting_change_rechecks_pitch_carry_in.atom.md`, `docs/rule_no_carry_in_output_matches_v1.atom.md`, `docs/mechanic_pitch_contour_forward_check.atom.md`, `docs/module_phrase_replay_key.atom.md`
- Tests and fixtures: `tests/unit/jam/doodle-join.spec.ts`, `tests/unit/session/deadline-sweep.ts`, `tests/fixtures/doodles/`, `tests/fixtures/replay-keys/`
