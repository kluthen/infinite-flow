# v1 — First Release

Status: **released as `v1.0`** (2026-09-26; `v1.0-rc1` = `2418069` is now history). The v1.0 gate
is closed.

## What v1 is

A finite, four-measure phrase generator with staff notation, driven by player controls. The
player regenerates the phrase explicitly. It applies no time pressure, by design. The full summary
is in the [v1 feature note](../../features/v1-first-release.md). The master spec is
[first-release-master-spec.md](../../first-release-master-spec.md), and the working record is in
the [v1 archive](../../archive/v1/README.md).

## v1.0 gate

The gate was "no open issue in [`issues/`](../../../issues/README.md)". All three issues filed
against it are resolved and merged, so the gate is closed:

1. **ISS-003**: transposition moved onto the instrument template as open integer data, and the
   key is now chosen in written pitch. The notation-display selector was removed; switching
   instrument keeps the written key and regenerates the phrase. v1.0 has no Concert override.
2. **ISS-004**: rhythmic variety (_Strict_ / _Slightly varied_ / _Heavily varied_) shipped as the
   chance of note values other than the selected density appearing, both shorter and longer,
   defaulting to _Slightly varied_ (both presets set it). _Mixed_ density was retired. The rhythm
   grammar moved to `rhythm-mvp-v2` per the feasibility review, confirmed by the user (D74).
3. **ISS-005**: planner behavior is now gated by musical-profile capability flags (starting with
   "chromatic approach and enclosure figures allowed"), never by the profile name. Generated
   output is unchanged, proven byte-identical against the pre-refactor goldens.

The evidence for each is the [issues index](../../../issues/README.md) (all three Resolved), the
archived [gate execution report](../../archive/v1/gate-execution-report.md) and
[ISS-004 feasibility review](../../archive/v1/iss004-feasibility-review.md), and the decisions
behind them: each issue's own file, the
[D47–D71 archive](../../archive/2026-09-25-personas-and-vision/decisions-D47-D71.md) (D56–D60), and the live
[decisions log](../../decisions.md) (D72–D75).
