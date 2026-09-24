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

Of the 144 settings, 114 succeeded and 30 failed:

- **24 `no_legal_rhythm_plan`** — exactly the 6 constant unsupported-rhythm-settings
  (`src/domain/controls/unsupported-rhythm-settings.ts`) × 4 tension arcs.
- **6 `no_legal_pitch_plan`**, specific to this measurement's fixed pitch context (Middle register,
  `bb-tenor`, C Major/Gentle diatonic, Arch/Shaped/Predictable, tempo 90): Eighth/Breath-heavy/
  Straight/Edge; Eighth/Breath-heavy/Occasional offbeats/Build; Eighth/Breath-heavy/Occasional
  offbeats/Edge; Eighth/Breath-heavy/Active displacement/Build; Eighth/Breath-heavy/Active
  displacement/Edge; Mixed/Breath-heavy/Active displacement/Edge. These six succeed under the
  workspace's default controls; they are a pitch-planner limit specific to this fixed context, out
  of Step 9's scope.

Latency across the 114 successful settings:

|           | median | p90    | p95    | max     |
| --------- | ------ | ------ | ------ | ------- |
| Cold (ms) | 121.1  | 1199.7 | 5268.4 | 16782.0 |
| Warm (ms) | 4.1    | 30.6   | 41.2   | 63.6    |

5 slowest cold settings, all Mixed note density + Active displacement syncopation:

| Setting                                              | Cold (ms) | Warm (ms) |
| ---------------------------------------------------- | --------- | --------- |
| Mixed / Conversational / Active displacement / Edge  | 16782.0   | 11.1      |
| Mixed / Conversational / Active displacement / Build | 14185.5   | 10.3      |
| Mixed / Sparse / Active displacement / Build         | 13497.0   | 58.6      |
| Mixed / Sparse / Active displacement / Edge          | 13259.1   | 57.8      |
| Mixed / Conversational / Active displacement / Lift  | 5556.8    | 7.5       |

The 30 unsupported/no-plan settings are fast in both cases: cold under 850 ms, warm under 2 ms —
they fail before any expensive search, so the memo isn't the bottleneck there either way.

## Browser (Chromium)

Measured by `npm run measure:latency:browser` (Playwright, Chromium, production preview build).
Each scenario clicks the primary action and times until the `generation-status` live region reads
"Phrase ready", so the figures include the Worker round trip, boundary re-validation, the
written-notation transform, and VexFlow engraving. Cold is the first generation for that rhythm
setting in a fresh page (empty memo in the Worker); warm is the following Regenerate (memo hit, new
seed). Set `LATENCY_BROWSER_OUT` to write the JSON. Two runs on the reference machine:

| Scenario                                                         | Cold (ms)    | Warm (ms) |
| ---------------------------------------------------------------- | ------------ | --------- |
| Default (Quarter / Straight / Sparse / Lift)                     | 124, 117     | 111, 72   |
| Worst case (Mixed / Conversational / Active displacement / Edge) | 10381, 10379 | 65, 85    |

Responsiveness: during the worst-case cold generation, a click on the theme control applied the new
`data-theme` attribute in 35 ms and 39 ms (the spec asserts under 200 ms). Generation runs off the
main thread, so the workspace stays interactive while a cold rhythm domain is materialized.

## Latency budget (signed off, provisional)

The product owner signed off this budget on 2026-09-24 as **provisional**. The approved rhythm-enumeration speed package is planned to land after Step 9; once it does, the cold worst-case bound is to be tightened to about 2 s.

- **Warm (memo hit) generation:** ≤ 250 ms p95 in Chromium on the reference machine.
- **Cold first generation for a rhythm setting:** ≤ 1.5 s p90 and ≤ 20 s worst case, with the UI
  kept responsive throughout — generation runs on the Worker, so controls and theme stay
  interactive and a loading state is shown for the duration.
- **Regression rule:** any measured regression of warm p95 above 250 ms, or of worst-case cold
  above 20 s, fails the budget.

Explicitly out of scope for this budget and this step:

- The Step 6 rhythm-domain enumeration algorithm and its bounded-prefix ranking were **not**
  changed by Step 9 — only the seed-independent memo around its result (see
  `docs/phrase-workspace.md`'s Canonical rhythm-domain memo section).
- Optimizing the cold worst case (Mixed note density + Active displacement, currently ~17 s in Node and ~10.4 s in Chromium) is
  deferred; it needs its own product decision, since it would mean changing the Step 6 enumeration
  itself or its ranking strategy, not just caching around it.
