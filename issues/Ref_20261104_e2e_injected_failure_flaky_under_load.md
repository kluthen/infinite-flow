# Issue: An injected generation failure is flaky under full load with pregeneration on

**ID:** `Ref_20261104_e2e_injected_failure_flaky_under_load`
**Ref:** `ISS-016`
**Date:** 2026-11-04
**Severity:** Low
**Status:** Open
**Component:** `tests/e2e/session/session-start-conditions.spec.ts`
**Affects:** `npm run quality` (the pregeneration pass of `test:e2e`), the wave gates

---

## Summary

The end-to-end test `session-start-conditions.spec.ts:114` › 'a generation-failure banner over the
retained phrase: disabled' sometimes fails during a full `npm run quality` run, in its
pregeneration pass (`VITE_HARNESS_PREGENERATION=on`): the generation-failure banner does not show
within 5 s. Run alone, it passes every time (40 of 40, pregeneration off and on). It makes a wave
gate red at random and costs a full re-run (about 10 minutes). No product behaviour is known to be
wrong.

---

## Technical Description

### Background

The test injects one generation failure (`failNextGeneration(page, 'search_limit_exceeded')`),
clicks the primary action, and expects the inline error banner over the retained phrase, then
checks that Start is blocked with `generation_failure` and that the primary action reads
`Retry generation`.

### The Problem Scenario

Suspected sequence (not yet confirmed):

```
1. gotoSessionHarness, readyToStart: with pregeneration on, a background
   generation for the next phrase may still be running, or start, under load.
2. failNextGeneration arms a failure for "the next generation".
3. Under full load, the background pregeneration request and the clicked
   generation race; the armed failure is consumed by the one the test did
   not mean (or the clicked one is served from a pregenerated phrase).
4. The clicked generation succeeds, so no banner shows:
   expect('.score-panel > .inline-alert.alert-error').toBeVisible() times out (5 s).
```

### Where This Pattern Exists Today

- `tests/e2e/session/session-start-conditions.spec.ts:114` (the test).
- The harness's injected-failure seam (`failNextGeneration`) and pregeneration switch
  (`VITE_HARNESS_PREGENERATION`); see `docs/testing.md`.
- The same kind of flake was seen on 2026-10-28 (an injected generation failure against
  pregeneration under full load, on the dev-tool security batch, reproduced on `main`'s lockfile).

---

## Risk Assessment

| Factor              | Value                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------- |
| Likelihood          | Medium (seen in 1 of 2 full runs at wave 6's gate; once on 2026-10-28)                |
| Impact if triggered | Low (test only; a re-run passes)                                                      |
| Detectability       | High (the gate goes red on this one test)                                             |
| Current mitigant    | Re-run the spec alone to tell the flake from a real failure; re-run `npm run quality` |

---

## Recommended Fix

**Short term:** When a wave gate fails on this test only, re-run it alone (pregeneration off and
on) and re-run `npm run quality`; record it in the wave log as this issue.

**Medium term:** Make the test wait until no pregeneration is in flight before arming the failure,
or arm the failure for a specific request (by request id or by origin: clicked, not pregenerated)
through the harness seam, so the race cannot pick the wrong generation. Check the other tests that
use `failNextGeneration` with pregeneration on for the same pattern.

**Long term:** Give the harness's failure injection an explicit target (which request fails)
instead of "the next one", so no test depends on the order of concurrent generations.

---

## Extra Data

Wave 6 gate, 2026-11-04, AMD Ryzen 5 PRO 8640HS, 12 threads, 11 GiB, Node 22.23.4, no VM: run 1
(15:24–15:33) failed on this test in the pregeneration pass; run 2 (15:34–15:44) all green. Alone:
the whole spec 9/9 (pregeneration off) and 9/9 (on); the test 20/20 (off) and 20/20 (on). No wave 6
commit touches the spec (last changed 65db2a48). The suspected sequence above is a hypothesis,
not traced.

---

## References

- `tests/e2e/session/session-start-conditions.spec.ts`
- `docs/testing.md` (the harness seams and the pregeneration pass)
- `specs/versions/v3/wave-log-v3.2.md`, "## Wave 6", "Wave gate (2026-11-04)"
