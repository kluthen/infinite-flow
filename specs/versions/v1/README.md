# v1 — First Release

Status: **reached** (implemented, `v1.0-rc1` = `2418069`). The v1.0 gate is still open.

## What v1 is

A finite, four-measure phrase generator with staff notation, driven by player controls. The
player regenerates the phrase explicitly. It applies no time pressure, by design. The full summary
is in the [v1 feature note](../../features/v1-first-release.md). The master spec is
[first-release-master-spec.md](../../first-release-master-spec.md), and the working record is in
the [v1 archive](../../archive/v1/README.md).

## v1.0 gate

The gate is "no open issue in [`issues/`](../../../issues/README.md)". Both remaining issues have
Three issues remain open. All have settled semantics and are ready for execution; the plan is in
[gate-execution-report.md](gate-execution-report.md):

1. **ISS-003**: transposition belongs to the instrument template, and the key is chosen in
   written pitch. The notation-display selector is removed. Switching instrument keeps the written
   key and regenerates the phrase. v1.0 has no Concert override. Transposition becomes open data,
   so adding an instrument preset stays easy. The first-release contract may be amended for this.
2. **ISS-004**: rhythmic variety (_Strict_ / _Slightly varied_ / _Heavily varied_) is the chance
   of note values other than the selected density appearing, both shorter and longer. The default
   is _Slightly varied_, and both presets set it. _Mixed_ density is retired. **A feasibility
   review of the rhythm grammar comes first** and goes to the user before implementation.
3. **ISS-005**: planner behavior is gated by musical-profile capability flags, never by the
   profile name (D73). The two `'Jazz'` checks become one capability. Generated output must not
   change.

The decisions behind these are recorded in each issue and in the
[D47–D71 archive](../../archive/2026-09-25-decisions-D47-D71.md) (D56–D60), and in the live [decisions log](../../decisions.md) (D72, D73).
