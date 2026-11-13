# Issue: An injected generation failure is flaky under full load with pregeneration on

**ID:** `Ref_20261104_e2e_injected_failure_flaky_under_load`
**Ref:** `ISS-016`
**Date:** 2026-11-04
**Severity:** Low
**Status:** Open
**Component:** `tests/e2e/workspace-harness/main.ts`
**Affects:** `tests/e2e/session/session-start-conditions.spec.ts` and
`tests/e2e/session/session-midi-start.spec.ts` (both fixed 2026-11-13), the other specs that arm
`failNextGeneration` (listed below), `npm run quality` (the pregeneration pass of `test:e2e`), the
wave gates

---

## Summary

The end-to-end test `session-start-conditions.spec.ts:114` › 'a generation-failure banner over the
retained phrase: disabled' sometimes fails during a full `npm run quality` run, in its
pregeneration pass (`VITE_HARNESS_PREGENERATION=on`): the generation-failure banner does not show
within 5 s. Run alone, it passes every time (40 of 40, pregeneration off and on). It makes a wave
gate red at random and costs a full re-run (about 10 minutes). No product behaviour is known to be
wrong. The same race made `session-midi-start.spec.ts:392` (item 22, the generation-failure
banner) fail in both full runs of v3.3 wave 3's gate; traced on 2026-11-13: a background
pre-generation attempt can take the armed failure, so the click's generation succeeds.

---

## Technical Description

### Background

The test injects one generation failure (`failNextGeneration(page, 'search_limit_exceeded')`),
clicks the primary action, and expects the inline error banner over the retained phrase, then
checks that Start is blocked with `generation_failure` and that the primary action reads
`Retry generation`.

### The Problem Scenario

Confirmed sequence (traced 2026-11-13 on `session-midi-start.spec.ts:392`):

```
1. readyToStart: phrase 1 is shown and every start condition holds, so the
   Idle pre-generation queue runs its 4 background attempts (phrases 2 to 5),
   one after another. On an idle machine all 4 settle ~50 ms after phrase 1's
   answer, and the test arms ~100 ms after it; under load the queue is still
   running when the test arms (4 to 6 runs in 100 at 24 CPU hogs).
2. failNextGeneration arms a failure for "the next gated call": the harness's
   gatedGenerate (tests/e2e/workspace-harness/main.ts) applies it to whichever
   generate call reaches the check first, background attempts included.
3. The queue launches its next background attempt before the click's
   generation reaches the check: that attempt takes the failure (the queue
   just tries again).
4. The clicked generation succeeds, so no banner shows:
   expect('.score-panel > .inline-alert.alert-error').toBeVisible() times out (5 s).
```

A held background attempt released after arming takes the failure every time, and the click's
generation then succeeds with no banner (shown on `main` b8e291e8 and on `v3.3-w3` d84bed91 alike).

### Where This Pattern Exists Today

- `tests/e2e/session/session-start-conditions.spec.ts:114`: fixed 2026-11-13 the same way, after it
  failed in the next full run (v3.3 wave 3, `w3-gate-4`).
- `tests/e2e/session/session-midi-start.spec.ts:392` (item 22, the generation-failure banner):
  fixed 2026-11-13 by holding background attempts (`holdBackground`) before arming.
- Other specs that arm `failNextGeneration` without holding background attempts, to check
  (exposed only where the queue can run when the failure is armed: a phrase shown and every start
  condition holding): `tests/e2e/release/errors-and-retry.spec.ts`,
  `tests/e2e/release/idle-fit-retries.spec.ts`,
  `tests/e2e/release/notation-status-and-recovery.spec.ts`,
  `tests/e2e/release/persistence-absence.spec.ts`, `tests/e2e/session/session-struggling.spec.ts`,
  `tests/e2e/session/jam-ends-before-phrase-one.spec.ts`, `tests/e2e/accessibility.spec.ts`,
  `tests/e2e/review/review-opens.spec.ts`.
- The harness's injected-failure seam (`failNextGeneration`, `gatedGenerate` in
  `tests/e2e/workspace-harness/main.ts`) and pregeneration switch (`VITE_HARNESS_PREGENERATION`);
  see `docs/testing.md`.
- The same kind of flake was seen on 2026-10-28 (an injected generation failure against
  pregeneration under full load, on the dev-tool security batch, reproduced on `main`'s lockfile).

---

## Risk Assessment

| Factor              | Value                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------- |
| Likelihood          | Medium (1 of 2 full runs at v3.2 wave 6's gate; 2 of 2 at v3.3 wave 3's; 2026-10-28)  |
| Impact if triggered | Low (test only; a re-run passes)                                                      |
| Detectability       | High (the gate goes red on this one test)                                             |
| Current mitigant    | Re-run the spec alone to tell the flake from a real failure; re-run `npm run quality` |

---

## Recommended Fix

**Short term:** In a test that arms `failNextGeneration` for the click's generation while the queue
may run, call `holdBackground(page)` (`tests/e2e/workspace/pregeneration-helpers.ts`) right before
arming: every background attempt launched afterwards waits at the background gate, before the armed
check, and every attempt launched earlier has already passed it. Done for
`session-midi-start.spec.ts:392` and `session-start-conditions.spec.ts:114`. When a wave
gate fails on such a test, re-run it alone (pregeneration off and on) and re-run `npm run quality`;
record it in the wave log as this issue.

**Medium term:** Arm the failure for a specific request (by origin: a call without an abort
signal, never a background attempt) through the harness seam, so the race cannot pick the wrong
generation, and check the other tests listed above.

**Long term:** Give the harness's failure injection an explicit target (which request fails)
instead of "the next one", so no test depends on the order of concurrent generations.

---

## Extra Data

Wave 6 gate, 2026-11-04, AMD Ryzen 5 PRO 8640HS, 12 threads, 11 GiB, Node 22.23.4, no VM: run 1
(15:24–15:33) failed on this test in the pregeneration pass; run 2 (15:34–15:44) all green. Alone:
the whole spec 9/9 (pregeneration off) and 9/9 (on); the test 20/20 (off) and 20/20 (on). No wave 6
commit touches the spec (last changed 65db2a48).

v3.3 wave 3 gate, 2026-11-13, `v3.3-w3` d84bed91: `session-midi-start.spec.ts:392` failed in the
pregeneration pass of 2 of 2 full `npm run quality` runs (load ~12 at the second's start); alone it
passed. Not a wave 3 regression: the flow makes the same calls on `main` b8e291e8 and on d84bed91
(1 click generation, 4 background attempts, no discard or restart, idle and under 16 or 24 CPU
hogs, 6 + 60 + 100 runs each), with the same timing, and the unchanged test failed on b8e291e8
too (1 of 40 at 16 CPU hogs, pregeneration on). With the fix: 80 of 80 at 16 CPU hogs. The next
full run (`a5b0991f`, started at load 2.65) passed it and failed instead on
`session-start-conditions.spec.ts:114`, the same race; with the same fix that test passed 60 of 60
at 16 CPU hogs.

---

## References

- `tests/e2e/session/session-start-conditions.spec.ts`
- `tests/e2e/session/session-midi-start.spec.ts`
- `tests/e2e/workspace-harness/main.ts` (`gatedGenerate`, the background gate)
- `tests/e2e/workspace/pregeneration-helpers.ts` (`holdBackground`)
- `docs/testing.md` (the harness seams and the pregeneration pass)
- `specs/versions/v3/wave-log-v3.2.md`, "## Wave 6", "Wave gate (2026-11-04)"

---

## Change Log

- **2026-11-13**: Traced the race on `session-midi-start.spec.ts:392` (v3.3 wave 3 gate, 2 of 2
  full runs): a background pre-generation attempt takes the armed failure; same calls and same
  failure on `main` b8e291e8, so not a wave 3 regression. Fixed that test by holding background
  attempts before arming; `session-start-conditions.spec.ts:114` and the other specs listed stay
  open.
- **2026-11-13**: `session-start-conditions.spec.ts:114` failed the same way in the next full run;
  fixed the same way. The other specs listed and the medium-term harness fix stay open.
