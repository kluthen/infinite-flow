# Generation Latency

This document records the Step 9 measurement of `generatePhrase` latency across every rhythm
setting, cold (fresh canonical-rhythm-domain memo) versus warm (memo hit), and the proposed latency
budget built from those numbers.

## Method

`npm run measure:latency` runs `tests/perf/generation-latency.perf.ts` as a Node Vitest harness
(no browser, no Worker). For each of the 144 rhythm settings — every combination of note density,
silence density, syncopation, and tension arc — it holds every other control fixed at:

- tonal center C, collection Major, harmonic motion Gentle diatonic
- register Middle, instrument profile B-flat tenor saxophone (`bb-tenor`)
- contour Arch, leapiness Shaped, arpeggio chaos Predictable
- tempo 90 BPM

For each setting it creates one fresh, empty `CanonicalRhythmDomainMemo` and measures:

- **Cold** — one `generatePhrase` call with seed 1 against that fresh memo (materializes the
  rhythm domain for this setting for the first time).
- **Warm** — one `generatePhrase` call with seed 2 against the _same_ memo instance right after
  (a memo hit: the rhythm domain is already materialized, only re-ranked for the new seed).

## Measured results (Node)

Of the 144 settings, 114 succeeded and 30 failed, identically before and after the enumeration
speed package:

- **24 `no_legal_rhythm_plan`** — exactly the 6 constant unsupported-rhythm-settings
  (`src/domain/controls/unsupported-rhythm-settings.ts`) × 4 tension arcs.
- **6 `no_legal_pitch_plan`**, specific to this measurement's fixed pitch context (Middle register,
  `bb-tenor`, C Major/Gentle diatonic, Arch/Shaped/Predictable, tempo 90): Eighth/Breath-heavy/
  Straight/Edge; Eighth/Breath-heavy/Occasional offbeats/Build; Eighth/Breath-heavy/Occasional
  offbeats/Edge; Eighth/Breath-heavy/Active displacement/Build; Eighth/Breath-heavy/Active
  displacement/Edge; Mixed/Breath-heavy/Active displacement/Edge. The later tension-binding
  correction fixed all six (see [below](#tension-binding-correction)); 120 settings now succeed
  and only the 24 `no_legal_rhythm_plan` settings fail.

Latency across the 114 successful settings, measured back to back on the reference machine at
`be9128b` (Step 9, before) and with the enumeration speed package (after). The Step 9 run
originally recorded here (cold median 121.1 / p90 1199.7 / p95 5268.4 / max 16782.0 ms) was on a
more loaded machine; the "before" row is a fresh re-measurement for a like-for-like comparison.

|                  | median | p90    | p95    | max     |
| ---------------- | ------ | ------ | ------ | ------- |
| Cold before (ms) | 71.6   | 1065.2 | 4025.3 | 11394.4 |
| Cold after (ms)  | 36.3   | 219.2  | 316.1  | 689.5   |
| Warm before (ms) | 3.0    | 23.8   | 34.9   | 56.2    |
| Warm after (ms)  | 2.6    | 23.5   | 34.7   | 56.6    |

5 slowest cold settings after the speed package:

| Setting                                        | Cold (ms) | Warm (ms) |
| ---------------------------------------------- | --------- | --------- |
| Mixed / Sparse / Active displacement / Build   | 689.5     | 56.6      |
| Mixed / Sparse / Active displacement / Edge    | 684.4     | 55.9      |
| Mixed / Sparse / Occasional offbeats / Build   | 373.7     | 51.4      |
| Mixed / Sparse / Occasional offbeats / Edge    | 365.5     | 50.3      |
| Mixed / Sparse / Active displacement / Settled | 334.1     | 23.5      |

Before the package the slowest were the four Mixed + Active displacement Build/Edge settings with
Conversational or Sparse silence, at 10.6-11.4 s cold. The 30 unsupported/no-plan settings are
fast in both cases (cold max 577.1 ms before, 200.6 ms after; warm under 2 ms): they fail before
any expensive search.

## Browser (Chromium)

Measured by `npm run measure:latency:browser` (Playwright, Chromium, production preview build).
Each scenario clicks the primary action and times until the `generation-status` live region reads
"Phrase ready", so the figures include the Worker round trip, boundary re-validation, the
written-notation transform, and VexFlow engraving. Cold is the first generation for that rhythm
setting in a fresh page (empty memo in the Worker); warm is the following Regenerate (memo hit, new
seed). Set `LATENCY_BROWSER_OUT` to write the JSON. Two runs each on the reference machine:

| Scenario                                                         | Cold before | Cold after | Warm before | Warm after |
| ---------------------------------------------------------------- | ----------- | ---------- | ----------- | ---------- |
| Default (Quarter / Straight / Sparse / Lift)                     | 96, 110     | 106, 106   | 122, 119    | 83, 79     |
| Worst case (Mixed / Conversational / Active displacement / Edge) | 9371, 9376  | 324, 321   | 74, 68      | 86, 73     |

(All times in ms.) The browser scenario is the Step 9 worst case; after the package the slowest
Node setting is Mixed / Sparse / Active displacement / Build (689.5 ms cold in Node).

Responsiveness: during the worst-case cold generation, a click on the theme control applied the new
`data-theme` attribute in 32-33 ms after the package (31-32 ms before; the spec asserts under 200
ms). Generation runs off the main thread, so the workspace stays interactive while a cold rhythm
domain is materialized.

## Tension-binding correction

The signed-off tension-binding correction (rests allowed between a figure and its target within
the documented `maximumResolutionDelay`, and between a preparation and its figure; see
[pitch-planner-validation.md](music/pitch-planner-validation.md#neutral-and-jazz-vocabulary))
changes output, so it was re-measured back to back against `eeef500`, two runs each, on a quiet
reference machine. The six former `no_legal_pitch_plan` settings now succeed, cold 5-58 ms and
warm under 2 ms, so the successful set grows from 114 to 120.

| Node (ms)                               | median     | p90          | p95          | max          |
| --------------------------------------- | ---------- | ------------ | ------------ | ------------ |
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
warm 81, 86 → 86, 83 ms; theme response 33-34 → 32-33 ms. All figures stay inside the signed-off
budget below.

## Enumeration speed package

The cold worst case was dominated by the Step 6 rhythm-domain enumeration. The speed package makes
that enumeration and the pitch search cheaper without changing any output: the Mixed-density
gesture skip and `quickRejectRhythmCandidate` prefilter, per-expansion transform/selector memos,
freezing only yielded rhythm candidates, reusing the no-plan probe's iterator, computing rhythm
identity once, and a pitch search that caches per-state candidate orderings and tie keys and only
freezes the returned phrase (see `docs/music/rhythm-phrase-structure.md` and
`specs/generative-process.md`). Byte identity was checked over seeds 1-3 × all 144 settings and a
2,880-case differential (outcome hash, kind, fuel): 0 mismatches. The `rhythm-mvp-v1` manifest and
the Step 9 golden fixture are unchanged.

## Latency budget (signed off)

The product owner signed off this budget on 2026-09-24, after the enumeration speed package landed.
It replaces the provisional Step 9 budget (≤ 1.5 s p90, ≤ 20 s cold worst case). The bounds leave
roughly 2-3× headroom over the post-package measurements above, for slower machines:

- **Warm (memo hit) generation:** ≤ 250 ms p95 in Chromium on the reference machine (measured
  ≤ 86 ms).
- **Cold first generation for a rhythm setting:** ≤ 500 ms p90 (measured 219.2 ms in Node) and
  ≤ 2 s worst case (measured 689.5 ms in Node, 324 ms for the Chromium worst-case scenario), with
  the UI kept responsive throughout — generation runs on the Worker, so controls and theme stay
  interactive and a loading state is shown for the duration.
- **Regression rule:** any measured regression of warm p95 above 250 ms, cold p90 above 500 ms, or
  worst-case cold above 2 s fails the budget.

Out of scope for this budget: precomputed rhythm domains, bounded-prefix ranking, and other
changes to what the enumeration yields; the speed package changes only how fast the same domain
is produced.
