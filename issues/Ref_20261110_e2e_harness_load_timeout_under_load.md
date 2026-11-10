# Issue: End-to-end harness waits time out under heavy machine load

**ID:** `Ref_20261110_e2e_harness_load_timeout_under_load`
**Ref:** `ISS-017`
**Date:** 2026-11-10
**Severity:** Low
**Status:** Open
**Component:** `tests/e2e/audio/audio-harness-helpers.ts`
**Affects:** `tests/e2e/controller/controller-helpers.ts`, `tests/e2e/audio/audio-guide.spec.ts`,
`tests/e2e/audio/audio-transport-mix.spec.ts`, `tests/e2e/accessibility.spec.ts`, `npm run quality`,
the wave gates

---

## Summary

During v3.3 wave 0's gate (2026-11-10), three full `npm run quality` runs on the same commit, with
no source change since `v3.2.0`, each went red on a different end-to-end test. The machine was
heavily loaded by another project's database jobs plus the run's own end-to-end workers. Two of the
failures are the workspace harness not becoming ready within the 30 s test timeout, and one is a
real-time audio count at 240 BPM. Every failing spec passed when run again on its own. No product
behaviour is known to be wrong. The cost: a wave gate goes red at random and needs a ~10-minute
re-run.

---

## Technical Description

### Background

The end-to-end specs open the workspace harness (`WORKSPACE_HARNESS_URL`) and wait for it with
`page.waitForFunction` until the harness object (or its session) is ready. The Playwright test
timeout is 30 s, and the real-Chromium audio specs count notes scheduled on the audio clock within a
time window.

### The Problem Scenario

```
1. Another process keeps 1–2 cores busy (load 6 before the run).
2. npm run quality starts test:e2e; its parallel workers raise the load to 13–19.
3. A spec calls page.goto(harness) then waitForFunction(harness ready).
4. The page (dev build + worker start-up) doesn't finish loading within the remaining
   test time → "Test timeout of 30000ms exceeded" at the waitForFunction line.
   Or, in a real-time audio spec, the observation window drifts and more notes are
   counted than planned (19 vs 15 backing notes at 240 BPM).
5. quality stops at the first red step, so later steps don't run.
```

Observed on `v3.3-w0` 78ce77c6:

- Run 1 (10:28): `audio-guide.spec.ts:359` (240 BPM, both guides, backing on then off),
  `expect(heardBacking.length).toBe(15)`, received 19. Alone: 60 of 60 passed.
- Run 2 (10:37): `audio-transport-mix.spec.ts:44` and `:103` timed out at
  `audio-harness-helpers.ts:71` (`waitForFunction(() => window.__workspaceHarness?.audio …)`).
- Run 3 (10:47, started at load 2.1): both e2e passes green (726 + 1 skip each);
  `accessibility.spec.ts:770` (a fresh Jam's capture, Dark theme) timed out at
  `controller-helpers.ts:75` (`waitForFunction(() => …session.loaded() === true)`). The remaining
  steps (a11y 76 passed, notation 107 + 4 skipped, `atd:lint`, `atd:check`) then passed when run
  on their own.

### Where This Pattern Exists Today

- `tests/e2e/audio/audio-harness-helpers.ts:71`
- `tests/e2e/controller/controller-helpers.ts:75` (via `tests/e2e/session/jam-helpers.ts:48`)
- `tests/e2e/audio/audio-guide.spec.ts:400` (the real-time count)
- The other harness-opening helpers that wait the same way.

---

## Risk Assessment

| Factor              | Value                                                                     |
| ------------------- | ------------------------------------------------------------------------- |
| Likelihood          | Medium when the machine is shared with other heavy work; low when idle    |
| Impact if triggered | Low: a red gate and a re-run; no product defect                           |
| Detectability       | High: a timeout at a harness wait, or a count off by a few, in one spec   |
| Current mitigant    | Run the gate on an idle machine; re-run the red spec alone, then the rest |

---

## Recommended Fix

**Short term:** Run wave gates only on an idle machine (load under ~2.5 before starting). When a
gate is red only on a harness-wait timeout, re-run that spec alone and the steps `quality` did not
reach, and record both in the wave log.

**Medium term:** Give the harness-ready waits their own explicit timeout and a clear error ("harness
not ready after N s"), and consider fewer e2e workers (`--workers`) when the load is high. For the
real-time audio count, assert on the notes planned in the window rather than on all notes heard.

**Long term:** Run the gate's end-to-end passes against a production build served statically
instead of the dev server, so page start-up does not depend on on-the-fly transforms.

---

## Extra Data

Logs (scratchpad, not kept): runs 1–3 of 2026-11-10, 10:28–10:59. Load at the ends of the runs:
19.1, 18.0, 11.3. Related but distinct: ISS-016 (an injected generation failure under load with
pregeneration on).

---

## References

- `tests/e2e/audio/audio-harness-helpers.ts`
- `tests/e2e/controller/controller-helpers.ts`
- `tests/e2e/audio/audio-guide.spec.ts`
- `tests/e2e/audio/audio-transport-mix.spec.ts`
- `tests/e2e/accessibility.spec.ts`
- `specs/versions/v3/wave-log-v3.3.md` (wave 0 gate)
