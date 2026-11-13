# Issue: After "Keep C Major" and a reload, the Review screen's suggestion row sometimes comes back (end-to-end test)

**ID:** `Ref_20261113_e2e_keep_mine_row_back_after_reload`
**Ref:** `ISS-018`
**Date:** 2026-11-13
**Severity:** Low
**Status:** Open
**Component:** `tests/e2e/review/review-suggestion.spec.ts`
**Affects:** `npm run test:e2e:pregeneration`, `npm run quality` (wave gates)

---

## Summary

The end-to-end test "Keep C Major takes the row away for good, after a reload too"
(`tests/e2e/review/review-suggestion.spec.ts:158`) failed once in the v3.3 wave 3 gate
runs, in the pregeneration-on lane under load, and passed in every other run (four full
lanes). After the owner presses "Keep C Major", the row goes away; after a reload, the
Review screen showed the row again. Wave 3 changed nothing in the Review screen or in the
key suggestion, so this is not a wave 3 regression. The cause is not traced: either the
test reloads before the "keep mine" choice is saved, or the app can lose that choice when
a reload follows it quickly. The second would be a real (if rare) product bug.

---

## Technical Description

### Background

`rule_suggestion_keep_mine`: once the owner keeps their own key and mode, the suggestion
row for that Jam session's review never comes back, a reload included.

### The Problem Scenario

1. `gotoJamInCMajor`, `jamReviewed(page, G_MAJOR)`, `expectOffered`, `untilKept(page, 1)`.
2. Click "Keep C Major": the row goes (line 166 passes), Jam again is focused, Jam's key is still C.
3. `reloadHarness(page)` right away, then open the Review screen from Session mode.
4. Line 177 `expect(suggestionRow(page)).toHaveCount(0)` received 1 for the full 5 s:

```
Locator:  ...section.review-doodle ... :scope > .suggestion-row
Expected: 0
Received: 1   (14 × locator resolved to 1 element)
  > 177 |     await expect(suggestionRow(page)).toHaveCount(0)
```

The row's state after the reload comes from storage, so the choice was not in storage
when the page reloaded.

### Where This Pattern Exists Today

- `tests/e2e/review/review-suggestion.spec.ts:157-178`: no wait for the choice to be
  saved between the click (line 164) and `reloadHarness` (line 171). Compare
  `untilKept(page, 1)` (line 162), which waits for the session to be saved first.
- The "keep mine" write path in the review's doodle section (not yet located).

---

## Risk Assessment

| Factor              | Value                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------- |
| Likelihood          | Low: 1 failure in 5 full e2e lanes (about 1 in 5 × 728 tests), under gate load         |
| Impact if triggered | Low for the test; Low/Medium if the app really drops the choice (the row returns once) |
| Detectability       | Medium: shows as a single e2e failure that passes on rerun                             |
| Current mitigant    | None; the gate passed on rerun                                                         |

---

## Recommended Fix

**Short term:** Find where "keep mine" is saved and whether the save is awaited before the
row goes. If the app's write is asynchronous and fire-and-forget, have the test wait for
the stored choice (as `untilKept` does for the session) before `reloadHarness`.

**Medium term:** If the app can drop the choice on a quick reload, save it before the row
leaves (or flush it on `pagehide`), and add a unit test for the order.

**Long term:** A harness helper that waits for every pending storage write before any
`reloadHarness`, so no reload test can race a write (see ISS-017 for the load side).

---

## Extra Data

- Failing run: wave 3 gate, `test:e2e:pregeneration` on branch `v3.3-w3`, 1 failed,
  1 skipped, 727 passed (3.0 m). Same test passed in the other four full lanes of the gate.
- Error context: `test-results/review-review-suggestion-t-ddb02-for-good-after-a-reload-too-chromium/error-context.md`
  (not kept).

---

## References

- `tests/e2e/review/review-suggestion.spec.ts`
- [ISS-016](Ref_20261104_e2e_injected_failure_flaky_under_load.md), [ISS-017](Ref_20261110_e2e_harness_load_timeout_under_load.md): other load-only e2e failures
