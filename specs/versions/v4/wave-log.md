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
- 2026-11-24: chunk 3 merged d854b945 (08d8184d): Thirds and Counter-melody, every rule of §6.3
  and §6.4 an invariant over 884 phrases (the four replay-key corpora, 844, which hold no seventh
  chord, plus a seeded seventh-chord supplement of 40). 5,985 Thirds notes, 2,244 Counter-melody
  notes. 4 agents, 128 tool calls, 10.4M tokens in / 159k out, max context 149k, $7.99 at API
  prices. Readings for `spec-writer` (batched with chunk 4's and 5's): (1) "parallel" fifths and
  octaves read per the lexicon, contrary-motion ("consecutive") fifths skipped too; (2) parallel
  octaves can't occur at a chord change (bass on the root, guide tones never the root); (3)
  counting the seventh never changes the Thirds choice (diatonic chords); (4) my-baritone's High
  window (49–62) gets no Counter-melody, its lane below the floor (40 phrases), for L1; (5) the
  floor leaves 1,145 lead notes undoubled in low windows, for L1; (6) the timing assumes chords of
  two beats or more (true today); (7) a chord with no guide tone in the lane keeps the previous
  note. Chunk 4 started.
- 2026-11-24: chunk 4 stopped before merging on an open reading (WIP 493ce817 on
  `v4.0-c4-fills-drums`): §6.5's "reverses the shape's direction", per note (built) or the whole
  shape. The wave driver ruled the whole shape, under the owner's design delegation; recorded by
  `spec-writer` as spec D604 (d7730b82), with the per-note reading as fallback and an empty fill
  last, and "any note" meaning the notes the fill plays. Spec D605 settles the chunks' readings:
  chunk 3's seven confirmed (6, chords of two beats or more, decided); chunk 4's draw order,
  phrase-end ties below and the eighth-long drum hit decided; three corpus facts added to L1's
  scope (my-baritone High without Counter-melody, Thirds' floor in low windows, most fills under
  four notes). Master spec v1.0.2. Chunk 4's owner resumed with the ruling.
- 2026-11-24: chunk 4 merged a27079cb (f2650eba), to D604 and D605: 1,398 fills in 493 of 884
  phrases, none empty; 64 whole-shape flips, 60 per-note fallbacks, 7 turn steps on the other
  side; corpus guard green (731 tests; lead draws and indexed streams unchanged). For the wave sync:
  `module_named_stream_pseudorandomness` (label `fill-shape`, named registry 1 → 2, its two false
  sentences), and the responding-part atoms absorb D604 and D605. 4 agents, 130 tool calls, 11.9M
  tokens in / 139k out, max context 161k, $7.80 at API prices. Chunk 5 started.
- 2026-11-24: chunk 5 merged 419d1741 (6973f2ee): four mix channels, eight settings keys at data
  version 1 (tolerant loading, no upgrade step), parts off at 0.5/0.5/0.6/0.6 from the tokens; v3.4
  records load unchanged, a changed part setting saves and reloads (fake-indexeddb). Estimated
  first-load growth ≈ +0.6 KB. Each session's bus now sets 16 gains at unlock (parts muted): e2e
  gain logs are the wave gate's to check. 2 agents, 93 tool calls, 9.8M tokens in / 56k out, max
  context 180k, $4.19 at API prices. Every chunk of wave 1 is merged (chunk 1, the spike, is never
  merged and waits on SPK). Wave gate started.

### Wave 1 gate (2026-11-24, AMD Ryzen 5 PRO 8640HS, 12 threads, 11 GiB, Debian 13 / Linux 6.12)

- First `npm run quality` stopped at the code-health lint: `settings-record.ts` linked 11 atoms
  (limit 10), chunk 5's duplicate `rule_parts_off_by_default` link (the parts' defaults are set in
  `readAudioMixDesign`, already linked). Fixed on the wave branch, ef9aedaf.
- `npm run quality` green: unit 678 files / 10,502 tests; build; `verify:boundaries` (65 JS chunks,
  library, session, Jam and lexicon boundaries); e2e 786 passed, 1 skipped, twice (pregeneration
  on and off); a11y 86; notation 121 (4 skipped); `atd:lint` pass. `atd:check` printed "No atoms
  found" (ISS-020: the sync runs `atd check main...HEAD` instead).
- `npm run test:sweep`: 13 files, 167 tests green.
- M1: start-up JavaScript 394,895 B (+843 B on v3.4's 394,052; 19 chunks), entry 339,603 B (+843 B
  on 338,760); budget 409,600 B, 14,705 B left.
- M4, laptop: worst render 2.142 ms (`c-keyboard-levels3-Dorian-s3`), cold pass 1.945 ms, median
  0.109 ms, p95 0.168 ms over 844 phrases × 5; verdict main thread. The reference phone's figure
  is the owner's (gate figure on the phone only).
- 2026-11-24: wave sync 6fbae4f3 (`documentalist`, paused once by the API usage limit): chunk 4's
  revision of `module_named_stream_pseudorandomness` (0.9, REVIEW, pre-authorized); D604/D605
  into `rule_responding_part_register`, `_rhythm`, `_target`, `_shapes` and `req_drum_part`
  (DRAFT). No drift; no CONTRACT bump (19.1.0, VISION 0.14). `atd check main...HEAD`: 54 atoms,
  53 OK (VISION's usual NO_IMPL); `--full` 34 NO_IMPL / 1 NO_TESTS against v3.4's 15 / 1, the 19
  extra being `release-v4.0` atoms later waves build. Proposed, not applied: chunk 7's revision of
  `module_guide_playback_layers` ("…apart from the mix gains each channel sets at unlock");
  `entity_concert_event_timeline`'s drift (harmony held beside the timeline, not in its measures;
  drop the implementation note), for the owner's OK. Asked of the owner: 17 DRAFT → REVIEW
  promotions of the built part rules (the `req_*_part` atoms, `req_accompaniment_parts`,
  `rule_parts_off_by_default` and the two captures stay DRAFT).
- 2026-11-24: `doc-ids compare main v4.0-w1`: 0 collisions. Wave 1 cost: 26 agents, 1,072 tool
  calls, 110.7M tokens in / 1.0M out, max context 238k (the driver), $66.49 at API prices (chunk 1
  $20.52, 2 $5.79, 3 $7.99, 4 $7.80, 5 $4.19, outside chunks $20.19). Reported to the owner; the
  merge waits on the owner's word. Open: SPK (the owner's listening HS and phone rows, then the
  decision closing O322); M4 on the reference phone.
