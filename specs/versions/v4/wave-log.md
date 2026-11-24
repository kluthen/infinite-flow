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
- 2026-11-24: chunk 1 (spike) built, b79c5c93 on `v4.0-c1-spike` (worktree
  `/home/bastien/work/infinite_flow-v4.0-c1` kept for the owner's checks; `SPIKE-REPORT.md` there
  holds the serving and phone/HS steps). 6 agents, 298 tool calls, 31.8M tokens in / 320k out, max
  context 193k, $20.52 at API prices.

  M3, laptop half (AMD Ryzen 5 PRO 8640HS, 12 threads, 11 GiB, Debian 13 / Linux 6.12, headless
  Chromium 153, 48 kHz; 2026-11-24):

  | Measure                                            | A (Tone.js 15.1.22)                                                                                          | B (Web Audio + one AudioWorklet)   |
  | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
  | Chunk size                                         | pass: 239,762 B min / 58,710 B gz, one lazy chunk                                                            | pass: ≈4.5 kB + worklet file       |
  | Start-up budget                                    | pass: 394,687 B index-only (+635 B, widened seam); Tone not in first load                                    | same                               |
  | Offline                                            | pass                                                                                                         | pass (worklet precached)           |
  | One context                                        | pass: 1 live AudioContext on the click (+2 OfflineAudioContexts: reverb impulse, a probe)                    | pass: 1                            |
  | Onset accuracy                                     | pass: max 33 frames                                                                                          | pass: max 6 frames                 |
  | In-graph delay                                     | pass: 0                                                                                                      | pass: 0                            |
  | Main thread                                        | **fail over 30 min**: forced GCs 104 → 224 ms, extra 50–100 ms frames from minute 17; load on Start 54–61 ms | pass: nothing over 50 ms in 30 min |
  | Audio thread (laptop)                              | 0 underruns / 30 min                                                                                         | 0 underruns / 30 min               |
  | Playhead                                           | **fail over 30 min**: ≤ 19.3 ms to minute 18, then up to 42.8 ms                                             | pass: max 17.0 ms                  |
  | Start-up (laptop)                                  | count-in 135–184 ms after click; ready before phrase 1                                                       | count-in 109–154 ms                |
  | Stop                                               | pass (reverb tail cut)                                                                                       | pass                               |
  | Lifecycle                                          | **fail**: JS heap 10.5 → 26.1 MB in 30 min; native AudioParams retained ≈390/s                               | pass                               |
  | CSP (nginx, edited header)                         | pass: 0 violations, `clockSource` worker (without `blob:`: 844 underruns)                                    | pass                               |
  | Audio thread (phone), start-up (phone), sound (HS) | open: owner                                                                                                  | open: owner                        |

  Provisional reading: A fails a laptop row (a leak inside Tone; cause a lead, not confirmed), a
  case the survey's decision rule has no branch for; in its spirit the rule points to B, pending
  the phone rows and HS (gate SPK). Deviations: A follows §9.2 (eight parts, one Reverb; no
  Compressor or FeedbackDelay from the survey's list); A's PolySynth books 12 voices and
  `lookAhead` 0.25 s. Side finding filed on `main` as ISS-021 (808a2f3d): the production Docker
  image doesn't build since v3.4 (`.dockerignore` leaves out `docs/music/lexicon.md`).
- 2026-11-24: chunk 2 merged 334f9968 (48010891): part shape, arranger, lead facts, four empty
  parts, the M4 harness (`npm run measure:arranger`; phone page `arranger-cost.html` on the
  workspace harness dev server). Corpus guard green (563 tests); parts corpus: 844 replay-key
  phrases, v3.2 backing files byte-identical from parts. Laptop smoke M4: worst 1.856 ms. Choices
  on its Record line (settings shape, velocities, roles, channel ids). Paused once by the API
  usage limit, resumed from its red tests. 1 agent, 95 tool calls, 12.3M tokens in / 77k out, max
  context 215k, $5.79 at API prices. Chunk 3 started.
