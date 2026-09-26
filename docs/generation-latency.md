# Generation Latency

This document records `generatePhrase` latency across every rhythm setting in the current
`rhythm-mvp-v2` control catalog (ISS-004: rhythmic variety replaces Mixed density), cold (fresh
canonical-rhythm-domain memo) versus warm (memo hit), and the signed-off latency budget those
numbers are checked against. The historical `rhythm-mvp-v1` measurements (144-setting catalog,
Mixed density) are kept at the bottom for record only — see
[Historical: rhythm-mvp-v1 measurements](#historical-rhythm-mvp-v1-measurements). They no longer
describe the current catalog and are not re-checked against the budget.

## Method

`npm run measure:latency` runs `tests/perf/generation-latency.perf.ts` as a Node Vitest harness
(no browser, no Worker). For each of the 324 rhythm settings in the `rhythm-mvp-v2` catalog — every
combination of note density (Quarter/Eighth/Sixteenth), rhythmic variety (Strict/Slightly varied/
Heavily varied), silence density, and syncopation, × 4 tension arcs — it holds every other control
fixed at:

- tonal center C, collection Major, harmonic motion Gentle diatonic
- register Middle, instrument profile B-flat tenor saxophone (`bb-tenor`)
- contour Arch, leapiness Shaped, arpeggio chaos Predictable
- tempo 90 BPM

For each setting it creates one fresh, empty `CanonicalRhythmDomainMemo` and measures:

- **Cold** — one `generatePhrase` call with seed 1 against that fresh memo (materializes the
  rhythm domain for this setting for the first time).
- **Warm** — one `generatePhrase` call with seed 2 against the _same_ memo instance right after
  (a memo hit: the rhythm domain is already materialized, only re-ranked for the new seed).

## Measured results (Node, v2 catalog)

Measured on the reference machine on branch `iss004-rhythmic-variety` (fix round 1), machine load
~0.3-1.8 (12 CPUs, mostly idle). Of the 324 settings, 284 succeed and 40 fail with
`no_legal_rhythm_plan` — exactly the unsupported-rhythm-setting combinations documented in
`src/domain/controls/unsupported-rhythm-settings.ts` (6 blocked Strict settings + 4 blocked
Slightly-varied settings, × 4 tension arcs = 40; Heavily varied blocks none). Unsupported settings
fail fast (all under a few ms) before any search, so they are excluded from the latency statistics
below, which cover only the 284 successful settings.

| Node (ms) | median | p90    | p95    | max    |
| --------- | ------ | ------ | ------ | ------ |
| Cold      | 17.1   | 185.8  | 260.1  | 990.7  |
| Warm      | 1.9    | 18.1   | 27.8   | 111.4  |

5 slowest cold settings:

| Setting                                               | Cold (ms) |
| ------------------------------------------------------ | --------- |
| Sixteenth / Heavily varied / Sparse / ... (slowest)     | 990.7     |
| Sixteenth / Heavily varied / Sparse / ... (2nd slowest) | 989.4     |
| Sixteenth / Heavily varied / ... (3rd slowest)          | 691.7     |
| Sixteenth / Heavily varied / ... (4th slowest)          | 688.5     |
| Sixteenth / Heavily varied / ... (5th slowest)          | 612.9     |

All five slowest settings are Sixteenth density under Heavily varied rhythmic variety: widening the
variety band (see `docs/module_rhythm_variety_grammar.atom.md`) most enlarges the Sixteenth beat-
cell catalog, which is already the largest catalog at Strict.

Cold p90 by note density × rhythmic variety (ms), the 3×3 breakdown of the table above:

| Density   | Strict | Slightly varied | Heavily varied |
| --------- | ------ | ---------------- | --------------- |
| Quarter   | 4.4    | 5.2               | 59.8             |
| Eighth    | 82.4   | 83.9              | 304.9            |
| Sixteenth | 24.0   | 226.6             | 688.5            |

Quarter and Eighth density stay fast at every variety level; Sixteenth grows sharply as the variety
band widens, because Sixteenth's beat-cell catalog is already the richest of the three densities
before any widening. This is expected and is the reason the whole-catalog p90 (which mixes all nine
density × variety cells) still comfortably passes the 500 ms budget while the single worst cell
(Sixteenth × Heavily varied, cold p90 688.5 ms) exceeds it on its own — see
[Latency budget](#latency-budget-signed-off) below for how that reconciles.

## Browser (Chromium)

Measured by `npm run measure:latency:browser` (Playwright, Chromium, production preview build).
Each scenario clicks the primary action and times until the `generation-status` live region reads
"Phrase ready", so the figures include the Worker round trip, boundary re-validation, the
written-notation transform, and VexFlow engraving. Cold is the first generation for that rhythm
setting in a fresh page (empty memo in the Worker); warm is the following Regenerate (memo hit, new
seed).

| Scenario                                                                                 | Cold (ms) | Warm (ms) |
| ----------------------------------------------------------------------------------------- | --------- | --------- |
| Default (Quarter / Slightly varied (the default) / Straight / Sparse / Lift)               | 120       | 82        |
| Worst case (Sixteenth / Heavily varied / Sparse / Active displacement / Build, 2,932 candidates) | 823       | 228       |

The default scenario is `Slightly varied`, not `Strict`: at Quarter density, `Slightly varied`'s
candidate domain (318 validator-accepted candidates, summed across the supported silence x
syncopation x tension-arc settings) is larger than `Strict`'s (184), per the prefilter-soundness
table in `specs/archive/v1/iss004-feasibility-review.md` §3.

Responsiveness: during the worst-case cold generation, a click on the theme control applied the new
`data-theme` attribute in 34 ms (the spec asserts under 200 ms). Generation runs off the main
thread, so the workspace stays interactive while a cold rhythm domain is materialized.

## Latency budget (signed off)

The product owner signed off this budget on 2026-09-24. It is checked against the whole v2 catalog,
not any single density × variety cell:

- **Warm (memo hit) generation:** ≤ 250 ms p95 in Chromium on the reference machine.
- **Cold first generation for a rhythm setting:** ≤ 500 ms p90 across the whole catalog, and the
  browser worst case stays within 2 s.
- **Regression rule:** any measured regression of warm p95 above 250 ms, cold p90 above 500 ms
  (whole catalog), or browser worst-case cold above 2 s fails the budget.

Result against the v2 catalog measured above:

- Whole-catalog warm p95 = 27.8 ms in Node (well under 250 ms; the Chromium default-scenario warm
  figure of 82 ms is also comfortably under budget).
- Whole-catalog cold p90 = 185.8 ms in Node (under the 500 ms bound).
- Browser worst case (Sixteenth / Heavily varied / Sparse / Active displacement / Build) cold =
  823 ms (under the 2 s bound).
- **Honest exception:** the single slowest density × variety cell, Sixteenth × Heavily varied
  alone, has a cold p90 of 688.5 ms — above the 500 ms figure if that cell were judged in isolation.
  The budget is defined and signed off against the whole catalog's p90, not any individual cell, and
  the whole catalog passes; this cell is called out here so the exception is not hidden by the
  aggregate number.

Out of scope for this budget: precomputed rhythm domains, bounded-prefix ranking, and other changes
to what the enumeration yields.

## Historical: rhythm-mvp-v1 measurements

The tables and narrative below describe the retired `rhythm-mvp-v1` catalog (144 settings: note
density Quarter/Eighth/Sixteenth/**Mixed**, no rhythmic-variety control), measured before ISS-004
replaced Mixed density with the rhythmic-variety control. They are kept only as a historical record
of the enumeration-speed-package work and the tension-binding correction; they do not describe the
current catalog and are not checked against the current budget.

Of the 144 v1 settings, 114 succeeded and 30 failed, identically before and after the enumeration
speed package:

- **24 `no_legal_rhythm_plan`** — exactly the 6 constant unsupported-rhythm-settings (as they stood
  under v1) × 4 tension arcs.
- **6 `no_legal_pitch_plan`**, specific to this measurement's fixed pitch context (Middle register,
  `bb-tenor`, C Major/Gentle diatonic, Arch/Shaped/Predictable, tempo 90): Eighth/Breath-heavy/
  Straight/Edge; Eighth/Breath-heavy/Occasional offbeats/Build; Eighth/Breath-heavy/Occasional
  offbeats/Edge; Eighth/Breath-heavy/Active displacement/Build; Eighth/Breath-heavy/Active
  displacement/Edge; Mixed/Breath-heavy/Active displacement/Edge. The later tension-binding
  correction fixed all six (see [below](#tension-binding-correction-v1)); 120 settings now succeed
  and only the 24 `no_legal_rhythm_plan` settings fail.

Latency across the 114 successful v1 settings, measured back to back on the reference machine at
`be9128b` (Step 9, before) and with the enumeration speed package (after). The Step 9 run
originally recorded here (cold median 121.1 / p90 1199.7 / p95 5268.4 / max 16782.0 ms) was on a
more loaded machine; the "before" row is a fresh re-measurement for a like-for-like comparison.

|                  | median | p90    | p95    | max     |
| ---------------- | ------ | ------ | ------ | ------- |
| Cold before (ms) | 71.6   | 1065.2 | 4025.3 | 11394.4 |
| Cold after (ms)  | 36.3   | 219.2  | 316.1  | 689.5   |
| Warm before (ms) | 3.0    | 23.8   | 34.9   | 56.2    |
| Warm after (ms)  | 2.6    | 23.5   | 34.7   | 56.6    |

5 slowest cold v1 settings after the speed package:

| Setting                                        | Cold (ms) | Warm (ms) |
| ----------------------------------------------- | --------- | --------- |
| Mixed / Sparse / Active displacement / Build   | 689.5     | 56.6      |
| Mixed / Sparse / Active displacement / Edge    | 684.4     | 55.9      |
| Mixed / Sparse / Occasional offbeats / Build   | 373.7     | 51.4      |
| Mixed / Sparse / Occasional offbeats / Edge    | 365.5     | 50.3      |
| Mixed / Sparse / Active displacement / Settled | 334.1     | 23.5      |

Before the package the slowest were the four Mixed + Active displacement Build/Edge settings with
Conversational or Sparse silence, at 10.6-11.4 s cold. The 30 unsupported/no-plan settings are
fast in both cases (cold max 577.1 ms before, 200.6 ms after; warm under 2 ms): they fail before
any expensive search.

### Browser (Chromium), v1

Measured by `npm run measure:latency:browser` on the v1 catalog. Two runs each on the reference
machine:

| Scenario                                                         | Cold before | Cold after | Warm before | Warm after |
| ----------------------------------------------------------------- | ----------- | ---------- | ----------- | ---------- |
| Default (Quarter / Straight / Sparse / Lift)                     | 96, 110     | 106, 106   | 122, 119    | 83, 79     |
| Worst case (Mixed / Conversational / Active displacement / Edge) | 9371, 9376  | 324, 321   | 74, 68      | 86, 73     |

(All times in ms.) The browser scenario is the Step 9 worst case; after the package the slowest
Node setting is Mixed / Sparse / Active displacement / Build (689.5 ms cold in Node).

Responsiveness: during the worst-case cold generation, a click on the theme control applied the new
`data-theme` attribute in 32-33 ms after the package (31-32 ms before; the spec asserts under 200
ms). Generation runs off the main thread, so the workspace stays interactive while a cold rhythm
domain is materialized.

### Tension-binding correction (v1)

The signed-off tension-binding correction (rests allowed between a figure and its target within
the documented `maximumResolutionDelay`, and between a preparation and its figure; see
[pitch-planner-validation.md](music/pitch-planner-validation.md#neutral-and-jazz-vocabulary))
changes output, so it was re-measured back to back against `eeef500`, two runs each, on a quiet
reference machine. The six former `no_legal_pitch_plan` settings now succeed, cold 5-58 ms and
warm under 2 ms, so the successful set grows from 114 to 120.

| Node (ms)                               | median     | p90          | p95          | max          |
| ---------------------------------------- | ---------- | ------------ | ------------ | ------------ |
| Cold before (114 successes)             | 39.8, 40.0 | 230.5, 238.8 | 346.6, 342.3 | 741.2, 758.7 |
| Cold after (120 successes)              | 36.5, 38.2 | 181.6, 185.9 | 307.9, 313.9 | 766.7, 768.1 |
| Cold after, same 114 settings as before | —          | 230.6, 231.0 | 335.3, 350.3 | 766.7, 768.1 |
| Warm before (114 successes)             | 2.7, 3.1   | 23.9, 27.0   | 35.7, 35.7   | 56.2, 54.8   |
| Warm after (120 successes)              | 2.4, 2.6   | 23.8, 25.0   | 35.0, 28.2   | 56.4, 55.6   |

The lower after-p90 comes mostly from adding six fast settings; over the same 114 settings the
figures are unchanged within run-to-run noise. The slowest setting is still Mixed / Sparse /
Active displacement / Build (741-768 ms cold), dominated by rhythm enumeration, which the
correction does not touch. In Chromium (`npm run measure:latency:browser`), before → after: default
cold 110, 99 → 114, 105 ms and warm 77, 81 → 71, 74 ms; worst-case cold 316, 323 → 326, 324 ms and
warm 81, 86 → 86, 83 ms; theme response 33-34 → 32-33 ms.

### Enumeration speed package (v1)

The cold worst case was dominated by the Step 6 rhythm-domain enumeration. The speed package makes
that enumeration and the pitch search cheaper without changing any output: the Mixed-density
gesture skip (now generalized to `gestureCannotReachShare` for the full v2 rhythmic-variety
catalog; see `docs/music/rhythm-phrase-structure.md`) and `quickRejectRhythmCandidate` prefilter,
per-expansion transform/selector memos, freezing only yielded rhythm candidates, reusing the
no-plan probe's iterator, computing rhythm identity once, and a pitch search that caches per-state
candidate orderings and tie keys and only freezes the returned phrase (see
`docs/music/rhythm-phrase-structure.md` and `specs/generative-process.md`). Byte identity was
checked over seeds 1-3 × all 144 v1 settings and a 2,880-case differential (outcome hash, kind,
fuel): 0 mismatches. The `rhythm-mvp-v1` manifest and the Step 9 golden fixture are unchanged.
