# ISS-004 feasibility review: rhythmic variety, Mixed retired

**Confirmed by the user on 2026-09-26 (D74, `specs/decisions.md`).** R1 is resolved as the
recommended reading (`Strict` is by nominal value; syncopation-displacement renders, plus rests
and ties from silence density and syncopation, are exempt). R2 is resolved as the recommended
dominance rule (nominal attack share of q, floors 1.0/0.75/0.5, a 50% tie at `Heavily varied`
allowed only with a shorter value). The rare-value sets in §1 are adopted as written, including
Eighth `Slightly varied`'s rare `[3n,1n]` cell. See `specs/first-release-master-spec.md` for the
resulting spec wording and `specs/versions/v1/gate-execution-report.md` §4.2 for the acceptance
pointer.

Status: **for user confirmation** (gate report §3 step 4). Written 2026-09-26 by coding-leader.
Decisions: D59, D60. Scope: the eight items of the gate report, §4.2.

The master spec is authoritative (`specs/first-release-master-spec.md`, lines 44–45, 74, 114
and 149). Where this review needs the spec wording clarified, or to differ from the gate report,
it says so in §11.

**Verdict.** Rhythmic variety is feasible inside the existing `rhythm-mvp-v1` machinery. The
prototype below meets both goals:

- **No new blocked setting.** `Strict` keeps today's six; `Slightly varied` unblocks two;
  `Heavily varied` unblocks all six.
- **Dominance kept.** The selected value stays dominant under the measure in §3.

The whole-catalog latency budget holds. No hard stop condition was hit. Two points need the
user's confirmation, or a spec-writer clarification, before implementation (§10, R1 and R2):

- **R1:** the reading of `Strict`.
- **R2:** the dominance tie rule.

---

## 0. Method and evidence

A throwaway prototype lives at `/home/bastien/work/infinite_flow-iss004-review`. It is
uncommitted, on branch `iss004-review`.

- `src/domain/rhythm/rhythm-variety.ts` (new) holds the value tables, the dominance predicate and
  the gesture prune.
- The existing planner, skeleton, validator, invariants, syncopation, controls, orchestrator,
  memo key and result-validator files are wired to a new input, `rhythmicVariety`.
- Mixed is removed from `src/`.
- `tsc -p tsconfig.app.json` reports 0 errors in `src/`. The test files that still name Mixed are
  listed in §9.

All numbers come from scratch harnesses in `tests/scratch/*.scratch.ts`, run with
`vitest.scratch.config.ts`. They cover 3 densities × 3 levels × 36 rhythm settings, which is
**324 settings**:

| Harness | What it measures |
| --- | --- |
| `variety` | Value distributions and v1 exactness |
| `sweep` | Blocked set, domain size and dominance variants |
| `soundness` | Prefilter oracle |
| `determinism` | Domain hashes |
| `latency` | The `generation-latency.perf.ts` method |

Terms used below:

- Ticks: a sixteenth is 1 tick, so the density value is q = 4 (Quarter), 2 (Eighth) or 1
  (Sixteenth).
- An **attack** is a note event that is not a tie continuation.
- An attack's **nominal value** is `nominalDurationTicks`. For a tied head, that is its first
  source cell's value.

## 1. Value sets (item 1)

Variety is implemented as three things:

1. **Extra beat cells** appended to today's per-density catalog. Today's cells keep their
   indices; `Strict` adds nothing.
2. **A per-level attack band.**
3. **A dominance floor** (§2).

Merges (at most one per gesture, as today) and the syncopation templates are unchanged, apart
from one rule. **A merge inside a single beat must involve a cell longer than q.** Without it, a
[1n,1n] merge duplicates the [2n,1n,1n] cell with different provenance. That skews the uniform
selection and inflates the domain. At Quarter every merge crosses a beat, so Quarter is
unaffected.

| Density | `Strict` adds | `Slightly varied` adds | `Heavily varied` adds |
| --- | --- | --- | --- |
| Quarter | — | — (today's Quarter exactly) | [2n,2n], [2n,2r], [2r,2n] |
| Eighth | — | [4n], [3n,1n] | [4n], [3n,1n], [2n,1n,1n], [1n,1n,2n] |
| Sixteenth | — | [2n,1n,1n], [1n,1n,2n] | [2n,1n,1n], [1n,1n,2n], [2n,1n,1r] |

Attack band, in attacks per bar (unchanged where the cell shows "today"):

| Density | `Strict` | `Slightly varied` | `Heavily varied` |
| --- | --- | --- | --- |
| Quarter | [2,4] today | [2,4] today | [2,6] |
| Eighth | [4,8] today | [3,9] | [3,10] |
| Sixteenth | [8,16] today | [6,16] | [5,16] |

**Resulting nominal attack value sets.** These are the union over each level's full domain,
measured. Ticks are shown with names:

| Density | `Strict` | `Slightly varied` | `Heavily varied` |
| --- | --- | --- | --- |
| Quarter | {4 ♩} | {4 ♩, 8 half} | {2 ♪, 4 ♩, 6 ♩., 8 half} |
| Eighth | {2 ♪} | {1 ♬, 2 ♪, 3 ♪., 4 ♩, 6 ♩.} | {1, 2, 3, 4, 6, 8} |
| Sixteenth | {1 ♬} | {1, 2 ♪, 3 ♪.} | {1, 2, 3, 4 ♩} |

How the table relates to the spec:

- **Shorter and longer values.** Heavily Quarter adds eighths. Eighth adds sixteenths (shorter)
  plus quarters, dotted values and halves (longer). Sixteenth can only grow longer.
- **Dotted values.** The ♪. (3) and ♩. (6) come from [3n,1n], from cross-beat merges and from
  [2n]+[4n] merges.
- **Ties across beats and barlines** stay available at every level, through the existing merge
  and tie mechanism. `Strict` included: a tied merge renders as q-valued attacks.
- **Rendered values** also include what syncopation displacement produces. For example, Quarter
  renders as 2+6, and Eighth renders as 1+3. This happens today at every density, including
  under `Strict` (see R1).

**Recommendation for acceptance testing:**

- Every accepted phrase's nominal values ⊆ the cell of the table above.
- The union over the domain of each density × level equals that cell.
- Test the nominal values, not the rendered ones (R1).

**Open musical choice: rare values.** Some values are very rare:

- Eighth `Slightly`: sixteenths about 0.1% of attacks and ♪. about 0.07%, because the [3n,1n]
  cell rarely survives the band and floor.
- Sixteenth `Heavily`: quarters about 0.05%.

*Default:* accept this; shorter values at Eighth `Slightly` still appear through syncopation
rendering (6.5% of rendered values). *Alternative:* drop [3n,1n] from Eighth `Slightly` so its
nominal set is {2, 4, 6}. That is simpler to state, but then "variety" at Eighth `Slightly` is
longer values only.

## 2. Weighting and the dominance measure (item 2)

**Measure: the nominal attack share of q**, meaning attacks whose nominal value is q, divided by
all attacks. Beat coverage (the share of sounding time) was measured as an alternative and
rejected. It is biased against longer values: at Heavily Eighth and Sixteenth it drops to 0.27–0.45
even when q has the most attacks. A value-agnostic attack count is what "the value you hear most"
means.

**Rule, per phrase (a hard validator check, code `rhythmic_variety_violation`):**

| Level | Floor on q's attack share | Dominance |
| --- | --- | --- |
| `Strict` | 1.0 | trivially |
| `Slightly varied` | 0.75 | trivially (a tie is impossible above 0.5) |
| `Heavily varied` | 0.5 | q has the most attacks of any value; a tie is allowed **only with a shorter value** (q then covers more sounding time) |

**Weighting.** There is no soft weighting term. Selection stays the uniform seeded tie-break
over the domain, so how often a value appears is set by the cell tables, the band and the floor.

Measured mean distributions (nominal attack share of q; other values as % of attacks):

| Density | `Slightly varied` | `Heavily varied` |
| --- | --- | --- |
| Quarter | 0.86–1.00; halves 0–14% | 0.50–0.96; eighths up to 50%, halves ≤ 11%, ♩. ≤ 2% |
| Eighth | 0.81–1.00; quarters 0–19% | 0.62–1.00; sixteenths 4–19%, quarters 8–25%, dotted ≤ 5%, halves ≤ 3% |
| Sixteenth | 0.81–1.00; eighths 10–19%, ♪. ≤ 2% | 0.50–0.80; eighths 18–42%, ♪. ≤ 8% |

The fraction of phrases containing at least one off-q value depends on the setting:

- `Slightly`: 0–98%, mostly 50–98%.
- `Heavily`: 0–100%, mostly 85–100%.
- The low ends are the settings listed in R3.

**Alternative (R2): strict plurality.** Under this rule a tie with q is never allowed.
Measured cost: `Heavily` **blocks Quarter/Breath-heavy/Active displacement** on all four arcs.
There, every candidate is exactly 50% quarters and 50% eighths; the grammar leaves no other
option. That conflicts with "Heavily never blocks", so it is not recommended. The
tie-with-shorter rule rejects 11% of Eighth `Heavily` candidates (50/50 eighths vs quarters) and
blocks nothing.

## 3. Four-beat fill, prefilter soundness, determinism (item 3)

**Four-beat fill.** Every extra cell sums to 4 ticks, and the oracle checked this for all nine
catalogs (`cellsNotFilling4 = 0`). Merges and transforms are unchanged, and the validator's beat
and bar sum checks still apply.

**Prefilter soundness.** Measured with an oracle run over every raw candidate
(`enumerateRawRhythmCandidates` from `rhythm-prefilter-oracle.ts`), for all 324 settings:

| Density × level | Raw | Validator-accepted | `quickReject` false rejects | Gesture-pruned | Pruned without a variety violation |
| --- | --- | --- | --- | --- | --- |
| Quarter S / Sl / H | 968 / 968 / 27,784 | 184 / 318 / 3,402 | 0 | 0 / 0 / 18,390 | 0 |
| Eighth S / Sl / H | 13,346 / 113,396 / 132,236 | 2,440 / 4,484 / 13,720 | 0 | 0 / 96,094 / 63,174 | 0 |
| Sixteenth S / Sl / H | 1,414 / 43,320 / 102,808 | 524 / 6,784 / 21,946 | 0 | 0 / 9,446 / 296 | 0 |

- `quickRejectRhythmCandidate` calls the same `varietyViolated` predicate as the validator, so it
  is a subset of the validator by construction. The oracle confirms it.
- The new gesture-level prune, `gestureCannotReachShare`, replaces the Mixed prune. It
  over-approximates the share: answers copy the gesture, transforms never change source cells,
  and a tie can at best turn a merged head into its first cell.
- Every candidate from a pruned gesture fails with `rhythmic_variety_violation`.
- **Direct check:** the domain hashes with the prune off equal those with the prune on, for all
  324 settings.

**Determinism.** Each domain is still fully enumerated, with no cutoff, in a deterministic
order. The sha256 of every accepted candidate, in order, is identical:

- across two separate processes;
- when the domain is materialized twice within one process;
- for all 324 settings.

**Oracle and test changes needed.**

- `rhythm-prefilter-oracle.ts` stays as it is; the skeleton enumerators it calls gain a variety
  argument.
- The per-density soundness specs become per density × level, 9 cases. Each checks two things:
  - `quickReject` ⊆ validator;
  - gesture-pruned ⇒ `rhythmic_variety_violation`.
- The Mixed "source-cell duration set" lemma and `coversMixedDurationClasses` are deleted, and so
  is `rhythm-prefilter-soundness-mixed.spec.ts`.
- The full list of fallout is in §9.

## 4. Blocked set (item 4)

Each entry is a density/silence/syncopation setting and blocks on all 4 tension arcs:

| Level | Blocked | Count |
| --- | --- | --- |
| `Strict` | Quarter/Sparse/Active; Quarter/Breath-heavy/Active; Sixteenth/Sparse/Active; Sixteenth/Conversational/Active; Sixteenth/Breath-heavy/Occasional; Sixteenth/Breath-heavy/Active | 6 (identical to today's `UNSUPPORTED_RHYTHM_SETTINGS`) |
| `Slightly varied` (default) | Quarter/Sparse/Active; Quarter/Breath-heavy/Active; Sixteenth/Breath-heavy/Occasional; Sixteenth/Breath-heavy/Active | 4 |
| `Heavily varied` | **none** | 0 |

- **No new blocked setting.** Eighth never blocks at any level.
- `Slightly` unblocks Sixteenth/Sparse/Active and Sixteenth/Conversational/Active, because the
  eighth-bearing cells rescue the attack band under displacement.
- The latency run confirms the set. Every failed generation is `generation_failure` on exactly
  these 10 × 4 = 40 settings, and there are no pitch-plan failures.

**Implementation consequence.** `UNSUPPORTED_RHYTHM_SETTINGS` becomes keyed by
(variety, density, silence, syncopation), with 6 + 4 + 0 entries.

Changing variety can now block or unblock the current setting. Three places need updating
(§11):

- the blocked-status UI;
- atom `rule_unsupported_rhythm_settings_block_generation`;
- master spec line 114 ("the six ... settings").

**Alternative considered and rejected:** keep `Slightly`'s blocked set equal to today's six.
That would need an artificial exclusion, and it gains nothing.

## 5. Tie-break priority (item 5)

Variety is a **hard constraint in the budgets tier**. The master spec order becomes:

> hard feasibility and cadence policy; musical profile, tonal collection, range, and contour;
> **density, rhythmic variety, and silence budgets**; syncopation onset plan; leapiness and
> arpeggio-chaos candidates; tension ranking; then the seeded deterministic tie-break.

- Variety filters the rhythm domain (the validator code plus the prune). It never ranks.
- Tension cannot trade variety away, just as it cannot trade density or silence.

*Alternative:* a seeded, stratified weighting that picks an off-q count first and then a
candidate. It adds a soft term below tension and complicates determinism, so it is not
recommended.

## 6. Latency, measured (item 6)

**Method.** Node, the `tests/perf/generation-latency.perf.ts` method, looped over variety:

- fixed pitch context (C Major, Gentle diatonic, Middle, `bb-tenor`, Arch/Shaped/Predictable,
  90 BPM);
- a fresh memo per setting;
- cold = seed 1, warm = seed 2 on the same memo.

There were two back-to-back runs (a / b) on 2026-09-26 at 12:36–12:37. The load average was
0.88–1.15 (1-minute), and 2.4–2.5 on the 15-minute average, which was still decaying from
earlier jobs. All times are in ms, shown as run a / run b.

| Density × level | ok | cold median | cold p90 | cold p95 | cold max | warm median | warm p95 | warm max |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Quarter Strict | 28/36 | 3 / 3 | 5 / 4 | 5 / 5 | 15 / 16 | 1 / 1 | 2 / 2 | 2 / 2 |
| Quarter Slightly | 28/36 | 3 / 3 | 6 / 5 | 6 / 5 | 7 / 6 | 1 / 1 | 2 / 2 | 2 / 2 |
| Quarter Heavily | 36/36 | 10 / 8 | 64 / 67 | 84 / 84 | 88 / 85 | 2 / 2 | 8 / 9 | 12 / 12 |
| Eighth Strict | 36/36 | 8 / 8 | 94 / 99 | 203 / 202 | 205 / 222 | 2 / 2 | 17 / 17 | 20 / 17 |
| Eighth Slightly | 36/36 | 28 / 28 | 97 / 96 | 206 / 201 | 220 / 211 | 3 / 3 | 17 / 17 | 18 / 18 |
| Eighth Heavily | 36/36 | 54 / 54 | 340 / 361 | 459 / 489 | 465 / 489 | 6 / 7 | 36 / 37 | 37 / 37 |
| Sixteenth Strict | 20/36 | 24 / 26 | 31 / 32 | 31 / 33 | 35 / 33 | 3 / 3 | 4 / 4 | 5 / 4 |
| Sixteenth Slightly | 28/36 | 122 / 130 | 303 / 313 | 351 / 371 | 360 / 391 | 9 / 9 | 33 / 33 | 33 / 36 |
| Sixteenth Heavily | 36/36 | 155 / 164 | 945 / 969 | 1079 / 1153 | 1086 / 1174 | 13 / 11 | 111 / 112 | 113 / 114 |
| **All 324** | 284/324 | 19 / 21 | **221 / 226** | 339 / 361 | **1086 / 1174** | 2 / 2 | **27 / 30** | 113 / 114 |

Per level:

| Level | Settings | Cold p90 | Cold max | Warm p95 |
| --- | --- | --- | --- | --- |
| `Strict` | 84 | 31 / 32 | 205 / 222 | 8 / 5 |
| `Slightly` | 92 | 142 / 159 | 360 / 391 | 24 / 24 |
| `Heavily` | 108 | 343 / 369 | 1086 / 1174 | 70 / 75 |

**v1 baseline**, same machine and method (pristine `main` copy, earlier the same session, load
0.6–1.2), 120 successes:

- cold median 35 / 34, p90 180 / 175, p95 297 / 288, max 710 / 709;
- warm p95 26, max 55 / 56;
- per density, cold p90 / max: Quarter 6/18, Eighth 106/224, Sixteenth 148/164, Mixed 371/710.

**Against the signed-off budget**, measured over the whole catalog as `docs/generation-latency.md`
defines it:

| Budget | Measured | Result |
| --- | --- | --- |
| Warm p95 ≤ 250 | 27–30 | pass |
| Cold p90 ≤ 500 | 221–226 | pass |
| Cold worst case ≤ 2 s | 1.09–1.17 s | pass |

Slowest settings (cold): 6 settings exceed 500 ms, all of them Sixteenth/Heavily/Sparse:

| Setting (Sixteenth / Heavily / Sparse / …) | Cold (ms) |
| --- | --- |
| Active / Build | 1086–1153 |
| Active / Edge | 1079–1174 |
| Straight / Build and Edge | 945–981 |
| Occasional / Build and Edge | 739–803 |

The latency risks are R4 in §10.

## 7. `Slightly varied` at Quarter vs v1 (item 7)

**The candidate set is exact; the outputs are not.**

- With `rhythmicVariety` stripped from the identity, the domain of each of the 28 supported
  Quarter settings has the same sha256 as `rhythm-mvp-v1-manifest.json`: same candidates, same
  order. The 8 blocked Quarter settings are blocked in both.
- But the candidate identity is `JSON(grammarVersion, controls, bars, recurrence, transforms)`,
  and it now includes `rhythmicVariety`, plus a grammar-version bump (§9). So the seeded tie
  keys change, and **seed → phrase outputs at Quarter change**. The Quarter goldens move.

*Default:* accept that and assert the equivalence with a test: project the v2 identity back onto
the v1 fields and match the v1 manifest hashes for Quarter/`Slightly`.

*Alternative:* keep identical Quarter outputs by leaving `rhythmicVariety` out of the identity
and the grammar version at `Slightly`/Quarter. That special-cases the identity for a cosmetic
gain, so it is not recommended.

## 8. v2 note: a phrase starting off beat 1 (item 8; not built)

The downbeat start is enforced in exactly three places:

1. `opensOnDownbeat` in `rhythm-skeleton.ts:136`, applied at `:148`. The bar-1 `x` cell must
   open with a note.
2. The validator code `first_note_off_downbeat` (`rhythm-validator.ts:267`) and its atom.
3. The notation transform: `assertCrossMeasureTieResolvable` in
   `src/domain/notation/written-phrase.ts:51-60` rejects a tie continuation that opens measure 0.

The grammar is cell-based with explicit rest cells, so an off-beat start is feasible:

- A pickup (a leading rest cell or cells) needs only the gate in (1), the rule in (2) and the
  bar-1 form rules relaxed per grammar version.
- A boundary tie from the previous phrase (continuation, prerequisites M and A) also needs (3)
  to accept a tie continuation carried in from an external predecessor, plus a phrase-boundary
  input in the rhythm input and identity.

Nothing in the variety change makes either harder. Variety's cells are all 4-tick beat cells, and
none of them depends on the opening beat.

## 9. Implementation outline

One unit, landing after ISS-003 so the goldens move once per concern.

1. **Controls.**
   - `generation-controls.ts`: `NOTE_DENSITIES` becomes `Quarter | Eighth | Sixteenth`. Add
     `RHYTHMIC_VARIETIES` and a required `rhythmicVariety`, defaulting to `Slightly varied`.
     `makeGenerationControls` rejects `Mixed` and any unknown variety.
   - `profile-selection.ts`: `PROFILE_BUNDLES` becomes 7 controls, and both presets set
     `Slightly varied`.
   - `control-options.ts`: drop Mixed and add the variety options.
   - The worker parser goes through `makeGenerationControls`.
2. **Rhythm.**
   - Add `rhythm-variety.ts` (tables, `varietyViolated`, `gestureCannotReachShare`), without the
     prototype's tunable `VARIETY_CONFIG`: freeze the chosen values.
   - `rhythm-skeleton.ts`: `beatCellCatalog(density, variety)`, the within-beat merge rule, and
     the band from the table. Delete the Mixed catalog.
   - `rhythm-validator.ts`: the provenance lookup uses the variety catalog; add
     `rhythmic_variety_violation`; remove the Mixed coverage check.
   - `rhythm-invariants.ts`: `quickReject` uses `varietyViolated`; delete
     `coversMixedDurationClasses`.
   - `rhythm-planner.ts`: normalize and validate variety, and swap the Mixed prune for the
     variety prune.
   - `syncopation.ts`: delete the Mixed redistribute branch.
   - Bump the grammar to **`rhythm-mvp-v2`**.
3. **Plumbing.**
   - The orchestrator passes variety through.
   - The canonical rhythm-domain memo key includes variety.
   - The result-validator control-mismatch check includes variety.
   - `unsupported-rhythm-settings.ts` becomes keyed by variety (§4).
4. **Fixtures and tests.**
   - A new `rhythm-mvp-v2-manifest.json`, keyed density|variety|silence|syncopation|tension (324
     entries).
   - Keep the v1 manifest only for the Quarter-equivalence test (§7).
   - `generation-outcome-golden.v3.ts`, with the reason documented.
   - The seed matrix covers every density × level, with value-set and dominance assertions (§1,
     §2).
   - Soundness specs per density × level (§3); delete the Mixed spec.
   - Fix the specs that name Mixed:
     - `generation-controls.spec.ts:120`;
     - `generation-outcome-golden.v2.ts:115,137`;
     - `tension-binding-regressions.spec.ts:82`;
     - `rhythm-complete-domain.spec.ts:41`;
     - `rhythm-planner.spec.ts:74`;
     - `rhythm-prefilter-soundness-{quarter,eighth,sixteenth}.spec.ts:62`.
   - Blocked-set tests go per variety.
5. **Latency.**
   - The perf harness loops over variety.
   - The browser worst-case scenario moves off Mixed to
     **Sixteenth / Heavily varied / Sparse / Active displacement / Build**.
   - Re-measure and update `docs/generation-latency.md`.
6. **UI.** Build from the ux-writer handoff (the variety control). The blocked-status message must
   react to variety changes.
7. **ATD.** documentalist:
   - an architecture capture of the variety tables and the dominance rule before coding;
   - a post-task sync afterwards;
   - atoms for the blocked-settings rule, the density control, the tie-break order and the
     Mixed prune.
   - Never run `atd audit` alongside tests.

## 10. Risks and stop conditions

**Stop conditions: none hit.** No level must block a setting that is supported today, `Heavily
varied` blocks nothing, and dominance holds at every setting under the recommended measure. The
two conditional stops below (R1, R2) are hit only if the user picks the alternative reading.

- **R1 — reading of `Strict` (needs spec-writer clarification).**
  - The spec says `Strict` allows "only the selected value, plus the rests and ties that silence
    density and syncopation produce."
  - Syncopation displacement also produces **untied** off-q rendered values: Quarter renders
    2+6, Eighth renders 1+3.
  - *Literal reading* (every rendered attack = q): 0 candidates at Quarter/Conversational/Active
    and at Eighth/{Sparse, Conversational, Breath-heavy}/Active. That is **4 new blocked
    settings, a STOP**.
  - *Recommended reading* (the nominal value = q; rhythm the syncopation plan produces is
    exempt): no new blocks, and `Strict` is 100% q by nominal value everywhere.
  - Spec-writer should adopt the recommended reading explicitly in master spec lines 45 and 149.
- **R2 — dominance at a 50% tie.**
  - At Quarter/Breath-heavy/Active, `Heavily` can only produce phrases with exactly 50% quarters
    and 50% eighths.
  - The recommended rule counts quarters as dominant there, because a tie is allowed with a
    shorter value (quarters cover twice the time).
  - If the user wants strict plurality, `Heavily` blocks that setting, which **conflicts with
    "Heavily never blocks" (STOP, back to spec-writer)**.
- **R3 — levels that do nothing at some settings.** These follow from the grammar's structure;
  none of them blocks.

  | Setting | Behavior | Cause |
  | --- | --- | --- |
  | Quarter/Breath-heavy/Straight | `Heavily` = `Slightly` = v1 | Bar-1 forms allow at most 2 distinct cells, and Breath-heavy needs [4r] next to [4n], leaving no room for an eighth cell |
  | Eighth/Breath-heavy/Active | 100% eighths at every level | — |
  | Sixteenth/Breath-heavy/Straight | `Slightly` = `Strict` (2 rhythms) | — |
  | Quarter/Breath-heavy/Occasional `Heavily`; Eighth/Conversational/Active `Slightly` | only about 1–4% off-q | — |

  A remedy would allow a third distinct cell in the bar-1 forms under `Heavily`, at a latency
  cost. It is not recommended for v1.0; accept this and document it.
- **R4 — latency headroom.**
  - The whole-catalog budget passes, but the Sixteenth × `Heavily` cell on its own has a cold
    p90 of about 950 ms, above the 500 ms figure.
  - The worst case rises from about 0.7 s to about 1.1–1.2 s, so headroom against 2 s falls from
    about 2.8× to about 1.7×.
  - The catalog grows from 144 to 324 rhythm settings, which dilutes the p90. The largest domain is 2,932 candidates, against Mixed's 2,146.
  - **The browser (Chromium) was not measured**: the prototype has no UI control. It must be
    measured on the new worst case during implementation.
  - Pruned configurations that would cut Sixteenth × `Heavily` were tried and each blocked a
    Breath-heavy setting: dropping a cell, a band floor of 6–7, a floor of 0.6, cross-beat-only
    merges, or restricting x to base cells.
- **R5 — `Strict` monotony.**
  - Quarter/Sparse/Straight and Quarter/Conversational/Straight have **one** rhythm for every
    seed under `Strict`, against 4 today; so does Eighth/Breath-heavy/Occasional.
  - This is a correct consequence of removing the half-note merges, and matches the gate
    report's "Quarter + Strict is stricter than today". The user should confirm it is acceptable.
- **R6 — seed stability.** Every stored seed → phrase mapping changes: Quarter through identity
  (§7), and the other densities through their domains. This is expected (gate report: "the
  goldens change on purpose") and argues for the v2 result version stamp (prerequisite N).
- **Not independently reviewed.** This analysis was not put through the reviewer agent. The
  evidence is the scratch harness output listed in §0, which can be reproduced from the worktree.

## 11. Spec and gate-report alignment

- **Master spec line 114** says "the six ... settings ... block generation". The spec allows the
  review to revise that list, so this is not a conflict, but the wording must become
  per-variety (6/4/0, §4).
- **Master spec line 74 (tie-break order)**: add variety to the budgets tier (§5).
- **Master spec lines 45 and 149 (`Strict`)**: clarify it as nominal (R1).
- **Gate report §4.2 acceptance** says "Under `Strict`, every attack uses the selected density's
  value, apart from rests and ties". It omits the spec's "produced by silence density and
  syncopation"; the master spec wording governs.
- **Gate report "Slightly varied = today's Quarter feel"**: consistent. At Quarter it is exact
  at the candidate level (§7). At Eighth and Sixteenth, `Slightly` is new material with a
  0.75 floor, and those goldens change.
- **ui_ux:** blocked status now depends on variety (§4); ux-writer should confirm the handoff
  covers a variety change that blocks or unblocks the current setting.
