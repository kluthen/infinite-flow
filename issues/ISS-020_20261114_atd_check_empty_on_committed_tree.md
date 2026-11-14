# Issue: `npm run atd:check` checks nothing on a committed tree

**ID:** `ISS-020_20261114_atd_check_empty_on_committed_tree`
**Ref:** `ISS-020`
**Date:** 2026-11-14
**Severity:** Medium
**Status:** Open
**Component:** `package.json` (`atd:check` script)
**Affects:** `npm run quality` (its last step), the wave gate and the chunk checks in `specs/versions/v3/build-workflow.md` (lines 83, 96), `README.md`'s quality-gate table (line 450)
**Seen on:** v3.3 wave 5 gate, branch `v3.3-w5` at 5c3da0d4, local host, 2026-11-14
**Reported by:** found while coding (`documentalist`, v3.3 wave 5 sync)

---

## Summary

The quality gate's ATD link-coverage check passes without checking anything when the working tree
is clean. `atd check` with no flag looks only at uncommitted changes against `HEAD`; a wave gate
runs on a merged, fully committed wave branch, so the check finds no atom, prints "No atoms found
for the specified scope" and exits 0. Wave 5's gate reported `atd:check` as passed while it covered
none of the wave. A missing `@spec-link` or `@test-link`, or a link to a renamed atom, can reach
`main` unseen.

---

## What happens

### Expected

`README.md` line 450: `npm run atd:lint && npm run atd:check` checks "`@spec-link`/`@test-link`
coverage for the current diff", and the build workflow's wave gate lists `atd:check` among the
checks of the whole wave.

### Observed

On a clean tree: "No atoms found for the specified scope", exit 0. With edits left uncommitted, the
same command reported all 25 atoms the wave 5 sync touched.

### How to reproduce

1. Check out any committed branch with a clean working tree (e.g. `v3.3-w5` at 025312c0).
2. `npm run atd:check`.
3. It prints "No atoms found for the specified scope" and exits 0.

---

## Cause

**Confirmed** (the wave 5 sync ran it both ways): `package.json:45` runs plain `atd check`, whose
default diff mode compares uncommitted changes with `HEAD`.

```
"atd:check": "atd check",
```

### Where this pattern exists today

Every place that runs `npm run atd:check` after committing: the end of `npm run quality`
(`package.json:46`), the wave gate (`build-workflow.md:96`), the sync's own check
(`build-workflow.md:83`). The pre-commit hook runs before the commit, so it does see the changes.

---

## Spec and intent

- Specs and decisions: build workflow, "Wave gate" and "Intent (ATD)" (`specs/versions/v3/build-workflow.md`).
- Intent records: none (tooling; ATD covers business behaviour only).
- Verdict: **code bug** in the tooling script: the gate claims a check it doesn't run.

---

## Risk assessment

| Factor | Value |
|---|---|
| Likelihood | High: every gate on a committed tree |
| Impact | Low to Medium: link drift reaches `main`; no product behaviour changes |
| Detectability | Low: it prints a line and passes |
| Current mitigation | the pre-commit ATD check; `documentalist`'s wave sync checks the wave's links by hand |

---

## Recommended fix

**Short term:** have the wave gate run `atd check --full` (or `--file` over the wave's changed
files) instead of the plain script.

**Medium term:** make `atd:check` check a committed range, e.g. the diff against the branch's base
on `main`, or `--full` if it is fast enough; and make an empty scope a failure (or at least a
warning) inside `npm run quality`.

**Long term:** —

**Test:** run the script on a clean committed branch that has a known missing link; it must fail.

---

## Extra data

Wave 5 sync: diff mode before the commit reported 25 atoms (23 OK, 2 NO_IMPL: the contract, and
`rule_no_export_carries_seventh_chords_level`).

---

## References

- `package.json:45-46`
- `specs/versions/v3/build-workflow.md:83,96`
- `README.md:60,450`
- `specs/versions/v3/wave-log-v3.3.md`, "Wave 5 sync and report"

---

## Change log

- **2026-11-14**: filed.
