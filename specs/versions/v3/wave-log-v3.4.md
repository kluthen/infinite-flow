# Infinite Flow v3.4 — Wave log

The execution record of the [v3.4 build plan](build-plan-v3.4.md), kept by the wave driver: what
each wave preflight found, each gate's results and figures, what was moved and why, and each
report to the owner. Rulings live in [`decisions.md`](../../decisions.md); the plan holds only the
current state.

## Before wave 1

- 2026-11-22: gate A0 cleared: the wave driver approved [master spec Part E](master-spec.md#part-e--v34)
  v1.0 and the plan's wave 1 under the owner's delegation (spec D556; D564, D565).
- 2026-11-22: gate G0 cleared: `spec-writer` read the lexicon page's code facts again on `main`
  828ab396 ([§E13](master-spec.md#e13-existing-code-and-risks)). New since the draft: the 400 KiB
  start-up budget (spec D536; 387,038 B at `3.3.0`), and `WorkspaceShell.vue` at 595 of 600
  effective lines.
- 2026-11-22: gate L0 cleared: the lexicon pass (spec D560), lexicon v1.9, 32868c5d and a follow-up
  commit on branch `v3.4-lexicon-pass`: 334 entries, 11 Internal, 323 shown. To merge into `main`
  before `v3.4-w1` is cut, or into the wave branch before chunk 2's branch.
- Open before wave 1 starts: I0 (Part E's ingestion) and P1 (the wave preflight and its three
  captures); T0 (the token-source pass) before chunk 2. No data preflight: the repo has no data
  register.
