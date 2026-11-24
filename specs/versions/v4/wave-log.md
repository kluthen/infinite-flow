# Infinite Flow v4.0 — Wave log

The execution record of the [v4.0 build plan](build-plan.md), kept by the wave driver: what each
wave preflight found, each gate's results and figures, what was moved and why, and each report to
the owner. Rulings live in [`decisions.md`](../../decisions.md); the plan holds only the current
state.

## Before wave 1

- 2026-11-24: gates G0 (ade38c12), I0 (256031e6) and D0 (ade38c12) done before the plan was
  written; see the plan's gates table.
- 2026-11-24: gate A0 cleared: the owner's "you may work on v4.0 wave 1", read as approval of the
  plan v1 (4f34d81e). Still asked of the owner, not blocking wave 1: the VISION 0.14 line (change
  set part C), part A's STABLE wordings (gate C1, blocks merges in waves 2 and 3), an explicit
  word on the design set (D0's record in `ui_ux/decisions.md`), and pushing `main`.
- No data preflight: the repo has no data register (gate DP).

## Wave 1

- 2026-11-24: wave branch `v4.0-w1` cut from `main` 4f34d81e in
  `/home/bastien/work/infinite_flow-v4.0-w1`. Dispatched: P1 (`documentalist`, on the wave
  branch), S1 (`security-advisor`, verdict only), T0 (`ux-writer`, branch `v4.0-t0-tokens` from
  the wave branch, merged into it before chunk 5's branch is cut).
- 2026-11-24: the owner answered "agreed, push to main whenever", read as agreement with every
  open ask: the VISION 0.14 line (change set part C), part A's STABLE wordings A1–A6 as drafted
  (gate C1, to be recorded by `documentalist` at the syncs that apply them), and the design set
  (D0's record in `ui_ux/decisions.md`). `main` 4f34d81e pushed (11 commits since 6d4c33c3).
- 2026-11-24: gate S1 done, verdict clear (proceed with notes). `tone` 15.1.22 (npm `latest`;
  `next` 15.5.x is a per-push dev build, not to be used) resolves to four new runtime packages:
  `tone` 15.1.22, `standardized-audio-context` 25.3.77, `automation-events` 7.1.19, `tslib` 2.9.1
  (plus `@babel/runtime` 7.29.7, already locked); no install scripts; `cve-watch` 0 findings on
  every one. Notes: install with `--save-exact`. Tone's ticker builds a blob worker on every
  context, so `worker-src 'self' blob:` is needed (scheduled-ahead notes and source release depend
  on it); the CSP lives only in `docker/security-headers.conf`, so the spike takes one M3 pass on
  the nginx-served build with the edited header (`clockSource === "worker"`, no
  `securitypolicyviolation`). Adapter B's worklet loads from a same-origin file, never a blob
  (that would need `script-src blob:` and a fresh check). Any worklet-based Tone class in chunk 6
  calls `security-advisor` again. S2 checks exactly these four packages and updates `.tech`.
