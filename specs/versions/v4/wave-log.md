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
- 2026-11-24: gate P1 done (d00357dd). Verdicts: chunks 1–4 proceed; chunk 5 proceeds with
  sign-off pending (A2–A4 under C1 at chunk 9's merge, as planned; a new settings data version or
  upgrade step would change STABLE `module_settings_upgrade_step`: the plan's "tolerant loading, no
  upgrade" avoids it). Chunk 4: the fill-shape label goes into the named registry only
  (`STREAM_LABELS` / `STREAM_REGISTRY_VERSION`); the indexed registry stays untouched. Captures
  (ARCHITECTURE, DRAFT 0.1): `entity_accompaniment_part`, `module_accompaniment_arranger`.
  Reworded to spec D597 (DRAFT 0.2): `rule_responding_part_target`, `rule_responding_part_shapes`.
  Plan corrections sent to `spec-writer` (chunk 2's Files: the renderers' importers in
  `src/audio/` and three test helpers; chunk 2's Revisions: `module_guide_playback_layers`; kept-true
  atoms for chunks 2–5; A6's settings half vs chunk 5), with the owner's rulings of today to record
  (VISION 0.14, C1, the design set). Left for a later sync: `entity_concert_event_timeline`'s old
  implementation note.
- 2026-11-24: plan v2 (d2606e9d, `spec-writer`): spec D601 records the owner's "agreed" (VISION
  0.14, C1, D0, A0; gates A0, D0, C1 set done); D602: the renderers keep their output types,
  chunk 2's `accompaniment-part.ts` converts their notes into parts, the transport and export move
  onto parts in chunks 7 and 8; D603: A6's settings half applies with A2–A4 at wave 3's sync, its
  kept-session half with A5 at chunk 8's merge. Sent to `documentalist`: reword
  `entity_accompaniment_part`'s interface to D602 (chunk 2 depends on it) and record C1 in the
  change set.
- 2026-11-24: `documentalist` b32bef67 (`entity_accompaniment_part`, `module_accompaniment_arranger`
  0.2 to spec D602; the atoms say the transport and export don't read parts yet, the move is worded
  by chunks 7 and 8's revisions) and e76b2850 (gate C1 recorded in the change set with each item's
  applying sync; VISION 0.14 applied, CONTRACT unchanged at 19.1.0).
- 2026-11-24: gate T0 done on `v4.0-t0-tokens` (1fb4c406 token pass, ux D508 toolbar grid and D509
  phone Volume popover anchor; a72daef3 `ux-critic`'s two low findings fixed; 9038b11c ux D510
  records the design set's approval), merged into the wave branch. Q90 stays open for hand check
  HT; the `ui_ux/versions/v4.0/` copy is still `ux-writer`'s next step (after Q90).
