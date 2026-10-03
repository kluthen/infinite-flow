# Generation Latency

This document records `generatePhrase` latency across every rhythm setting in the current
`rhythm-mvp-v2` control catalog (ISS-004: rhythmic variety replaces Mixed density), cold (fresh
canonical-rhythm-domain memo) versus warm (memo hit), and the signed-off latency budget those
numbers are checked against. It also records the first generation after a change to one setting,
and the longest main-thread task while a phrase is engraved. The timing of a running session's
rolling display (the playhead band against the heard barline, and the main thread at 240 BPM) is in
[Rolling display (chunk 16)](#rolling-display-chunk-16), and a 2 000-phrase last-session Review's
opening and closing in [Last-session Review (chunk 20)](#last-session-review-chunk-20). The first
generation after each step a settings mutation can take is in
[Settings-mutation transitions (chunk 24, 2026-10-03)](#settings-mutation-transitions-chunk-24-2026-10-03).
The newest whole-catalog generation figures are in
[Validator-free fast enumeration on the reference machine (2026-09-30)](#validator-free-fast-enumeration-on-the-reference-machine-2026-09-30),
after the [cold-generation speed-up](#cold-generation-speed-up-on-the-reference-machine-2026-09-30);
the verdicts that gate the build plan were set in
[v2 re-run on the reference machine (2026-09-30)](#v2-re-run-on-the-reference-machine-2026-09-30).
The [v2 baseline (chunk 1, 2026-09-29)](#v2-baseline-chunk-1-2026-09-29) below it came from a cloud
virtual machine and is kept for reference; the older tables below that were measured on the
product owner's reference machine and are labelled with their provenance. The historical `rhythm-mvp-v1` measurements (144-setting catalog,
Mixed density) are kept at the bottom for record only — see
[Historical: rhythm-mvp-v1 measurements](#historical-rhythm-mvp-v1-measurements). They no longer
describe the current catalog and are not re-checked against the budget.

## Method

`npm run measure:latency` runs `tests/perf/generation-latency.perf.ts` as a Node Vitest harness
(no browser, no Worker). For each of the 324 rhythm settings in the `rhythm-mvp-v2` catalog — every
combination of note density (Quarter/Eighth/Sixteenth), rhythmic variety (Strict/Slightly varied/
Heavily varied), silence density, and syncopation, × 4 tension arcs — it holds every other control
fixed at:

- tonal center C, collection Major, harmonic motion Gentle diatonic
- register Middle, instrument profile B-flat tenor saxophone (`bb-tenor`)
- contour Arch, leapiness Shaped, arpeggio chaos Predictable
- tempo 90 BPM

For each setting it creates one fresh, empty `CanonicalRhythmDomainMemo` and measures:

- **Cold** — one `generatePhrase` call with seed 1 against that fresh memo (materializes the
  rhythm domain for this setting for the first time).
- **Warm** — one `generatePhrase` call with seed 2 against the _same_ memo instance right after
  (a memo hit: the rhythm domain is already materialized, only re-ranked for the new seed).

The rhythm-domain memo is keyed by the five rhythm controls only (note density, rhythmic variety,
silence density, syncopation, tension arc). A generation is **cold** when its rhythm setting is not
yet in the memo, so the memo first builds that setting's whole rhythm domain; that is the expensive
step. No other control (tonal center, register, contour and so on) enters the key.

**First generation after a settings mutation.** From v2.1 a settings mutation can move one
setting by one grade in the middle of a session (see
[Settings mutation](session-engine.md#settings-mutation-and-changes-at-a-phrase-boundary)), and
the next phrase is then generated with the new setting. The same harness measures that case in a
second test, run after the first in the same process. It models the generation Worker, which
keeps one memo for the whole page and so for the whole session:

- **Starting settings.** Each of the 324 rhythm settings is one starting setting. Since chunk 24 its
  other controls are not fixed: tonal center, collection, harmonic motion, contour, register
  (Low, Middle or High), leapiness, arpeggio chaos and musical profile are drawn for it from a
  fixed seed (mulberry32, seed 24). Each control's catalog is dealt out in order over a seeded
  shuffle of the 324 starting settings, so every value starts equally often (to within one), and
  no two controls, nor a control and the rhythm order, move together. The profile is always
  marked customized, as after any mutation. Tempo stays 90 BPM and the instrument `bb-tenor`.
- **Warm-up.** For each starting setting the harness creates one fresh memo and warms it with one
  generation (seed 1). A starting setting that is blocked, or cannot generate, is skipped, since a
  session can never be playing it: 284 starting settings remain.
- **Transitions.** Against that same memo it then generates once (seed 2) for every step a
  mutation could take from the starting setting, and times that call. The steps are the session's
  own: `mutationCandidates` (`src/session/settings-mutation.ts`), which reads the scales in
  `MUTATION_SCALES`, for a wide window and a session that has not stepped down. So every mutable
  setting is covered: tonal center a fifth up or down around the circle of fifths, collection
  within Major/Minor or along the modes, harmonic motion, contour (every other contour), register,
  leapiness, arpeggio chaos, the profile flip, and the five rhythm settings. No sampling is needed:
  about 20 steps per starting setting, 5,544 transitions in all.
- **Memo.** Every step differs from the starting setting and from every other step, so each
  rhythm-setting step is a memo miss (the harness checks this by the memo's size) and every other
  step keeps the rhythm memo key and is a memo hit.
- **Unsupported steps.** A step that lands on an unsupported setting is counted but not generated:
  a mutation re-rolls it, never applies it.
- **Not measured.** The harness passes no carry-in, so the cold phrase after a key or collection
  change, whose carry-in has its harmony dropped, is timed only as a generation without carry-in.
  Nor does it model the deadline of a regeneration with one measure left.

`LATENCY_OUT` and `LATENCY_TRANSITIONS_OUT` name JSON files for the full per-setting and
per-transition results.

**Browser timing.** `npm run measure:latency:browser` times each generation from the click on the
primary action to the `generation-status` live region reading "Phrase ready", so its figures
include the Worker round trip and the engraving. Its second test measures the first generation
after a one-control change in the browser: in a fresh page it generates a one-step neighbour of the
worst-case setting, changes that one control through the UI to reach the worst case, and times the
next generation; it does the same for a register change and a written-key change that keep the
worst-case rhythm setting. Since chunk 1 every cycle is reported two ways. The **in-page** figure is
exact: a click listener in the page stamps the click and a `MutationObserver` stamps the moment the
live region's text changes. The **wall-clock** figure is what the harness reported before: the time
the test runner waited for Playwright's text assertion. Playwright polls that assertion at growing
intervals, ending at one check every 500 ms, so the wall-clock figure can overstate a cycle longer
than about 300 ms by up to half a second. The v2 baseline uses the in-page figures.
`LATENCY_BROWSER_OUT` and `LATENCY_BROWSER_CHANGE_OUT` name JSON files for the two tests' reports.

The page pre-warms the current rhythm setting's domain in its Worker when it starts and after every
rhythm-setting change (see [Pre-warm](phrase-workspace.md#pre-warm)), so the environment variable
`LATENCY_PREWARM` picks one of three modes, recorded as `prewarmMode` in both JSON reports (any
other value throws):

- **`off`**: every page load uses `?prewarm=off`, so every first generation on a setting is truly
  cold. This is the fair comparison with the figures measured before pre-warm existed.
- **`on`** (the default, since it is what the production page does): each generation is clicked
  right after the rhythm-control change that reaches its setting, so pre-warm has only just
  started.
- **`settled`**: as `on`, but after reaching each setting the test waits 3 s before clicking, so
  pre-warm has finished. The page exposes no completion signal, so this is a fixed wait, well above
  the worst full domain build (under 1 s in Chromium).

**Main-thread engraving.** `npm run measure:engraving` runs
`tests/e2e/workspace/engraving-main-thread.spec.ts` (Playwright, Chromium, production preview
build). Generation runs in the Worker, off the main thread. What runs on the main thread per phrase
is the click handler, the Worker's reply (decoding the result, checking it again, turning it into
written notation) and the animation-frame callback that engraves the phrase with VexFlow and swaps
it onto the screen, followed by that frame's style, layout and paint. The spec installs three
probes in the page before the app loads:

- a buffered `longtask` `PerformanceObserver`, which reports every main-thread task of 50 ms or
  more;
- a buffered `long-animation-frame` observer, which reports long frames with the scripts that ran
  in them, so the engraving callback (`FrameRequestCallback`) is told apart from the Worker's reply
  (`Worker.onmessage`);
- a heartbeat of chained zero-delay timers during each cycle. The longest gap between two beats is
  the longest a main-thread timer callback had to wait, measured below 50 ms too.

It uses the setting that puts the most notes on the staff. Over seeds 1-12, Sixteenth / Strict /
Sparse / Straight / Edge fills all 64 sixteenth-note slots of the four bars, about 58 of them notes
and the rest rests; no other setting has more notes or more glyphs. Every other control keeps the
workspace default. It runs at two large desktop viewports, 2560 × 1440 and 1920 × 1080 CSS pixels:
one fresh page each, one first generation, then 12 regenerations (each with a new random seed),
then 10 re-engravings of the last phrase caused by a 16-pixel width change alone, with no
generation. `ENGRAVING_OUT` names a JSON file for the full report.

## Rolling display (chunk 16)

Two timing checks of a running session in real Chromium, for chunk 16's done-when (see
[the build plan](../specs/versions/v2/build-plan.md#chunk-16--rolling-display)): the playhead
band against the heard barline (v2.0 item 6), and the main thread at 240 BPM with the densest
setting against the scheduler's window (item 15). Since 2026-10-03 both items are checked in the
v2.4 release gate, the real-hardware checks
([build-plan chunk 35](../specs/versions/v2/build-plan.md#chunk-35--v24-release-gate-real-hardware-checks)),
not the v2.0 gate; the figures below are an earlier reading on the same machine, and which
reading of item 6 counts is settled there.

**Machine and date.** Measured on 2026-10-01, 13:49-14:05 CEST, on branch `v2-chunk-16` (`main` at
`99bdd7b` plus chunk 16's uncommitted work), on the reference machine: AMD Ryzen 5 PRO 8640HS (6
cores, 12 threads), 11 GiB RAM, bare metal, Debian 13 (Linux 6.12), Chromium 153.0.8010.12 (the
Playwright 1.63.0 headless shell, which Playwright launches with `--mute-audio`). Each run ran
alone; the owner's desktop session stayed open (about 90 % idle CPU before the first run).

**Method.** `npm run measure:rolling` runs `tests/e2e/session/rolling-display-timing.spec.ts`
against the workspace harness with `?audio=real`: the real `AudioContext` (48 kHz, base latency
10.7 ms, output latency 32-56 ms as read during the runs), the real wake-up Workers and the real
generation Worker, with no controller connected. The session starts from a real click on
`Start session`, after phrase 1 (seed 7) is generated at the chosen tempo. `ROLLING_OUT` names the
JSON reports, one per measurement.

- **Playhead (item 6).** 120 BPM, default settings, 1920 × 1080 (the one-system layout), five
  minutes of audio time from phrase 1's start: 150 barlines, 2 s apart. Before Start, a
  `MutationObserver` on the staff stamps `performance.now()` each time `rect.playhead-band` lands
  on a different measure or system, and, in the same callback, reads a fresh `clockAnchor()` and
  `outputLatency()` through the harness. A `requestAnimationFrame` requested there stamps the next
  frame, and `document.timeline.currentTime` gives the start of the frame that moved the band.
- **The heard barline.** Barline k is at `phraseStartsAt(1) + k × 2 s` on the audio clock, the
  time the band itself uses. The band reads heard time as `now() - outputLatency()`, so the barline
  is heard when the audio clock reads `barline + outputLatency`. The anchor is on that same
  scheduling timeline: the output timestamp's `contextTime`, the frame the output device renders at
  `performanceTimeMs`, plus the output latency (see
  [The audio clock](midi-input.md#the-audio-clock)). So the heard barline on `performance.now()`
  is `performanceTimeMs + (barline + outputLatency - audioTime)`, in seconds converted to ms. The
  latency the anchor adds is taken off once, and the result is the browser's own answer to "when
  does the output device render the barline's frame". A fresh anchor per barline matters: the
  output timestamp drifted against `performance.now()` by 12 ms and 22 ms over the two
  five-minute runs, which one anchor read at the start would have carried into the late barlines.
- **Figures.** Each barline's difference is the band's time minus the heard barline's: positive is
  late. Three band times: the **observer callback** (the band's measure has changed in the page,
  before paint); the **frame start** (the frame whose animation callback moved it); and the
  **next frame** (the next animation frame's timestamp, about when the painted band can first
  reach the screen). The screen's own display latency is in none of them.
- **Main thread (item 15).** 240 BPM, the densest setting (Sixteenth / Strict / Sparse / Straight /
  Edge, as in [Main-thread engraving](#main-thread-engraving)), at 2560 × 1440 and 1920 × 1080:
  one fresh page each, with chunk 1's three probes (`tests/e2e/workspace/main-thread-probes.ts`,
  shared with `measure:engraving`) installed before the app loads and the heartbeat running from
  just before the Start click. The window runs from the Start click (1 s count-in) to 60 s after
  phrase 1's start: 15 phrases, each engraving its system as it enters. As a check that the probes
  fire in this browser, a separate page with a deliberate 120 ms timer task and a 90 ms animation
  callback was caught by all three probes (with `long-animation-frame` naming `setTimeout` and
  `FrameRequestCallback`).

**Playhead band against the heard barline** (ms; 150 barlines each run, every barline seen, the
band never missing from the staff and never landing on a measure out of order):

| Run | 1-min load before → after | Band time         | max \|diff\| | p95 \|diff\| | median \|diff\| | mean | range        | over 20 ms |
| --- | ------------------------- | ----------------- | ------------ | ------------ | --------------- | ---- | ------------ | ---------- |
| 1   | 1.25 → 1.05               | observer callback | 17.2         | 14.0         | 8.8             | 6.6  | -7.5 to 17.2 | 0          |
|     |                           | frame start       | 16.5         | 13.0         | 8.0             | 5.7  | -8.4 to 16.5 | 0          |
|     |                           | next frame        | 33.2         | 29.6         | 24.6            | 22.4 | 8.3 to 33.2  | 108        |
| 2   | 1.10 → 0.65               | observer callback | 15.4         | 10.2         | 7.5             | 5.1  | -7.2 to 15.4 | 0          |
|     |                           | frame start       | 13.8         | 9.1          | 7.1             | 4.2  | -8.5 to 13.8 | 0          |
|     |                           | next frame        | 30.5         | 25.7         | 23.1            | 20.8 | 8.2 to 30.5  | 118        |

- The band can move up to about 8 ms **before** the heard barline. The audio clock's `currentTime`
  advances in steps of one output buffer (512 frames, 10.7 ms), while the output timestamp moves
  smoothly: read in the same callback, `currentTime` was up to 13.5 ms ahead of the anchor's
  timeline. The band follows `currentTime`, so it can cross a barline a little early.
- The next-frame figure is the observer figure plus one frame (16 ms on average), as expected:
  the band moves in one animation frame and is painted at the end of it.

**Main thread at 240 BPM, densest setting** (ms; the window from the Start click to 60 s into the
running session, 16 engravings, the session still running at the end with phrase 17 readied):

| Viewport    | Run | 1-min load before → after | Window (s) | Longest `longtask` | Tasks ≥ 50 ms | Longest long animation frame (top script) | Longest heartbeat gap |
| ----------- | --- | ------------------------- | ---------- | ------------------ | ------------- | ----------------------------------------- | --------------------- |
| 2560 × 1440 | 1   | 0.82 → 0.29 (both sizes)  | 62.3       | none ≥ 50          | 0             | none ≥ 50                                 | 40.1                  |
| 1920 × 1080 | 1   |                           | 61.2       | none ≥ 50          | 0             | none ≥ 50                                 | 39.8                  |
| 2560 × 1440 | 2   | 0.49 → 0.89 (both sizes)  | 62.2       | none ≥ 50          | 0             | none ≥ 50                                 | 42.6                  |
| 1920 × 1080 | 2   |                           | 61.2       | none ≥ 50          | 0             | none ≥ 50                                 | 23.7                  |

`longtask` and `long-animation-frame` report nothing under 50 ms, so the heartbeat gives the only
figure below that: the longest wait any main-thread timer saw was 42.6 ms.

### Verdicts (rolling display)

**Playhead within 20 ms of the heard barline (item 6): met, for the moment the band's measure
changes.** Over 300 barlines in two five-minute runs, the band's measure changed at most 17.2 ms
after the heard barline (p95 14.0 ms) and at most 7.5 ms before it; none was more than 20 ms off.
**Counted to the next animation frame, when the painted band can first reach the screen, it is not
met:** 72-79 % of barlines were more than 20 ms late, at most 33.2 ms. That figure is one frame
later by construction, and matches [The playhead](audio-transport.md#the-playhead)'s own bound,
"at most one frame plus the time to draw it". Which of the two item 6 means is for the owner to
settle; the first is how the build plan's bullet reads ("the playhead band's measure changes").

**No main-thread task longer than the 200 ms scheduler window at 240 BPM, densest setting (item
15): met, with wide room.** No task or animation frame reached 50 ms at either size in either run;
the longest timer wait was 42.6 ms, about 157 ms inside the window. Limits: one desktop machine, a
headless Chromium at 1× device pixel ratio, no controller (no MIDI or acknowledgement work), and
audio muted by Playwright's `--mute-audio`.

## Last-session Review (chunk 20)

A reference measurement of a 2 000-phrase last-session Review (about 2 h 15 min of session at
60 BPM) opening, closing and reopening in Chromium. It is a reference only: no figure is asserted,
and performance never gates.

**Machine and date.** Measured on 2026-10-02, on branch `v2-chunk-20` (`main` at `a48295d` plus
chunk 20's uncommitted work), on the reference machine described in
[Rolling display (chunk 16)](#rolling-display-chunk-16), in the Playwright 1.63.0 headless
Chromium.

**Method.** `tests/e2e/review/review-long.spec.ts`, a correctness spec in `test:e2e` that logs
these figures on the side (see [The Review specs](testing.md#the-review-specs)), on the workspace
harness's fake audio clock at a desktop window of 1280 × 800. The history the Review reads is
inflated to 2 000 phrases with `session.inflateHistory`; the session plays until phrase 1 sounds,
then `Stop` opens the Review. The open, close and reopen times run from the click, stamped in the
page, to the first animation frame showing the result (for an open, all 2 000 items with phrase 1
engraved), on `performance.now()`. The longest task comes from the shared `longtask` probe; the
task, script, layout and style times, the JS heap and the DOM node count from Chromium's
`Performance.getMetrics`, through the DevTools protocol. The spec was run alone, then as part of
the full `test:e2e` run.

| Figure                                                | Run alone | During the full `test:e2e` run |
| ----------------------------------------------------- | --------- | ------------------------------ |
| Open: `Stop` click to all 2 000 items, phrase 1 drawn | 157 ms    | 337 ms                         |
| Longest main-thread task while opening                | 114 ms    | 242 ms                         |
| Task time while opening (`TaskDuration`)              | 202 ms    | 444 ms                         |
| Script time while opening (`ScriptDuration`)          | 5 ms      | 6 ms                           |
| Layout time while opening (`LayoutDuration`)          | 65 ms     | 130 ms                         |
| Style time while opening (`RecalcStyleDuration`)      | 23 ms     | 47 ms                          |
| JS heap, settled                                      | 26.6 MiB  | 26.6 MiB                       |
| DOM nodes, settled                                    | 21 625    | 21 624                         |
| `Close review`                                        | 17 ms     | 34 ms                          |
| `Review last session` (reopen)                        | 117 ms    | 235 ms                         |

The lazy window engraved 6 phrases at the top of the list and 7 at its end. With three
Playwright workers running other specs alongside it, the open took 208-260 ms and the longest
task while opening 160-193 ms.

## Settings-mutation transitions (chunk 24, 2026-10-03)

A reference run, recorded for the record only. It gates nothing: the budgets are checked by the
owner before the release gate that names them (see
[the build plan's workflow](../specs/versions/v2/build-plan.md#3-workflow-for-every-chunk)).

**Machine and date.** Measured on 2026-10-03, 18:17-18:19 CEST, on branch `v2-chunk-24` (`main` at
`da58652` plus chunk 24's uncommitted work), on the reference machine: AMD Ryzen 5 PRO 8640HS
(6 cores, 12 threads), 11 GiB RAM, bare metal, Debian 13 (Linux 6.12.107), Node v22.23.2. One
`npm run measure:latency` run, alone, in 112 s; the 1-minute load average was 1.27 before and
2.69 after (the harness itself keeps one core busy). The owner's desktop session stayed open.

**Node, 284 settings (ms).** The first test is unchanged; 40 settings fail fast (at most 29.1 ms).

| Node, 284 settings (ms) | median | p90  | p95   | max   |
| ----------------------- | ------ | ---- | ----- | ----- |
| Cold                    | 11.9   | 78.0 | 119.1 | 297.9 |
| Warm                    | 1.8    | 9.9  | 12.5  | 41.8  |

4 settings take longer than 250 ms cold, all Sixteenth / Heavily varied / Sparse: Straight / Build
297.9 ms, Straight / Edge 296.4 ms, Active displacement / Build 285.2 ms, Active displacement /
Edge 273.1 ms.

**First generation after a settings mutation** (5,544 transitions from 284 starting settings; 7
fail with a generation failure, which the ladder would retry, and are left out):

| Changed setting (ms) | n     | memo misses | median | p90   | p95   | max   |
| -------------------- | ----- | ----------- | ------ | ----- | ----- | ----- |
| Any rhythm setting   | 1,839 | 1,839       | 13.0   | 96.7  | 138.6 | 682.9 |
| Note density         | 351   | 351         | 14.3   | 86.1  | 137.0 | 373.0 |
| Rhythmic variety     | 351   | 351         | 10.8   | 80.1  | 134.8 | 682.9 |
| Silence density      | 360   | 360         | 15.3   | 92.6  | 125.7 | 594.4 |
| Syncopation          | 352   | 352         | 12.1   | 113.3 | 145.8 | 608.7 |
| Tension arc          | 425   | 425         | 11.6   | 109.1 | 142.5 | 333.7 |
| Any other setting    | 3,698 | 0           | 2.1    | 12.4  | 17.7  | 502.7 |
| Tonal center         | 567   | 0           | 2.3    | 12.3  | 19.1  | 502.7 |
| Collection           | 439   | 0           | 2.0    | 12.1  | 15.3  | 434.7 |
| Harmonic motion      | 380   | 0           | 2.0    | 12.8  | 16.6  | 269.3 |
| Contour              | 852   | 0           | 2.1    | 12.7  | 18.5  | 336.7 |
| Register             | 378   | 0           | 2.1    | 13.9  | 20.9  | 74.3  |
| Leapiness            | 420   | 0           | 2.0    | 11.1  | 16.5  | 180.8 |
| Arpeggio chaos       | 378   | 0           | 2.0    | 11.6  | 16.7  | 449.2 |
| Musical profile      | 284   | 0           | 2.0    | 13.0  | 17.2  | 127.5 |

- **Rhythm steps.** 32 of 1,839 (1.7 %) take longer than 250 ms, 4 longer than 500 ms, none
  longer than 1 s. The slowest is B Dorian, Sixteenth / Slightly varied / Sparse / Active
  displacement / Build, rhythmic variety Slightly varied → Heavily varied: 682.9 ms.
- **Other steps.** These keep the rhythm memo, but 21 of 3,698 still take longer than 100 ms, all
  from a Sixteenth or Eighth setting. The 7 over 250 ms all start from a Sixteenth setting with
  Active diatonic harmonic motion; the rhythm domain is already built there, so the time goes to
  the rest of the generation: A Ionian → D Ionian 502.7 ms, arpeggio chaos Varied → Chaotic from
  G Mixolydian 449.2 ms.
- **Failures.** The 7 failed transitions took 467-592 ms each, all from Sixteenth or Eighth
  settings with Edge or Lift tension and Active or Gentle diatonic motion.
- **Not comparable with earlier runs.** Before chunk 24 every starting setting was C Major,
  Gentle diatonic, Arch, Middle, Shaped, Predictable, Neutral, and only the five rhythm controls,
  tonal center (by a semitone) and register moved. The rhythm steps' median and p90 are close to
  the [validator-free run](#validator-free-fast-enumeration-on-the-reference-machine-2026-09-30)'s
  (12.8 and 82.5 ms); the higher tail comes from the varied keys, modes and harmonic motions.

**Against the windows** (Node, before the Worker round trip and engraving):

- **A mutation: 3 measures.** A mutation lands on the phrase requested when the phrase before it
  starts sounding, so it never discards a phrase, and its deadline is three measures away: 3 s at
  240 BPM. The slowest step, 0.68 s, plus a failed attempt (up to 0.59 s) and a warm retry, stays
  well inside it.
- **A regenerated look-ahead with one measure left: 1 s at 240 BPM.** Only a settings change from
  another source (none before chunk 25) can discard a phrase, and only with at least one measure
  left. The slowest step fits on its first attempt (0.68 s); a failed first attempt followed by a
  retry may not. This harness does not measure that case end to end, and the 250 ms working goal
  is judged in Chromium, which this run did not measure.

## Validator-free fast enumeration on the reference machine (2026-09-30)

Measured on 2026-09-30, 17:44-17:57 CEST, on branch `v2-perf-validator` (`main` at `de8ba3e` plus
this step), on the same reference machine and versions as the speed-up below: AMD Ryzen 5 PRO
8640HS (6 cores, 12 threads), 11 GiB RAM, bare metal, Debian 13.6 (Linux 6.12), Node v22.23.2,
Chromium 153.0.8010.12 (Playwright 1.63.0 headless shell). Each run started once the 1-minute load
average was under 1.5 (1.04-1.45 before a run, up to 1.99 after). The machine was shared, though:
another session's Godot tests and benchmark ran alongside every run, at 76-110 % of one core. The
owner accepted that, as long as the figures stay within bounds. A check of `main` on the same busy
machine right after (below) shows how much that load costs. Every figure is "new (was old)", old
being the [cold-generation speed-up](#cold-generation-speed-up-on-the-reference-machine-2026-09-30).

**What changed.** The first generation for a rhythm setting still builds that setting's whole
rhythm domain, and the output is unchanged byte for byte: the golden fixture and the older oracles
pass unchanged. The fast enumeration no longer runs the full rhythm validator
(`validateRhythmCandidate`) on each candidate. Two early checks, on the fast path only, replace
what only the validator caught:

- **Attack band, once per gesture.** An attack is a note that starts; a tied continuation does not
  count. The attack band is the range of attacks a bar may have for the chosen note density and
  rhythmic variety. The check runs on the gesture's bars (bars 1-2) before any transform, and that
  is exact: no transform changes how many attacks a bar has, and bars 3-4 copy bars 1-2.
- **Answer similarity, per syncopation template.** The answer (bars 3-4) must repeat enough of the
  attack positions of the gesture (bars 1-2). The check runs on the final four bars, from each
  bar's attack positions cached for the expansion.
- **Silence budget: no new check.** It was already enforced per gesture.
- **The validator stays elsewhere.** It still runs on the exact re-run, so a no-plan result
  reports the same codes, and in the independent result check (`rhythm_candidate_invalid`).
- **Proof.** With the validator skipped and no new checks, 46 invalid candidates got through in 20
  settings (30 for answer similarity, 16 for the attack band): 12 Quarter settings with
  Breath-heavy silence and Occasional offbeats, and 8 Eighth / Strict / Breath-heavy settings with
  Occasional offbeats or Active displacement. With the two checks, the exhaustive validation specs
  (`rhythm-domain-exhaustive-validation-{quarter,eighth,sixteenth}.spec.ts`) find no invalid
  candidate, and every one of the 324 settings has the manifest's count. They stay as the
  permanent guard.
- **New browser scenario.** The browser harness also times Sixteenth / Heavily varied / Sparse /
  Straight / Edge, the slowest setting in Node.

**Node** (`npm run measure:latency`; no Worker, no pre-warm). The same 284 settings succeed and the
same 40 fail fast (35 under 28 ms, the slowest 32.6 ms).

| Node, 284 settings (ms) | median      | p90          | p95           | max           |
| ----------------------- | ----------- | ------------ | ------------- | ------------- |
| Cold                    | 14.1 (14.7) | 86.4 (116.3) | 126.7 (174.1) | 327.5 (522.0) |
| Warm                    | 2.1 (1.6)   | 10.6 (9.3)   | 14.3 (12.4)   | 47.9 (42.2)   |

The warm and fail-fast figures are slightly up. That is noise from the shared machine: a warm
generation reuses the memo and never runs the enumeration this step changed. 4 settings (was 6)
take longer than 250 ms cold and none longer than 1 s. The slowest are all Sixteenth / Heavily
varied / Sparse: Straight / Edge 327.5 ms (was 522.0), Straight / Build 316.7 ms (was 507.5),
Active displacement / Build 278.5 ms (was 447.7), Active displacement / Edge 259.8 ms (was 397.9).
Next comes Occasional offbeats / Edge at 245.4 ms.

Cold p90 by note density × rhythmic variety (ms):

| Density   | Strict      | Slightly varied | Heavily varied |
| --------- | ----------- | --------------- | -------------- |
| Quarter   | 4.9 (4.2)   | 3.2 (3.9)       | 26.2 (38.2)    |
| Eighth    | 42.0 (60.5) | 48.6 (60.0)     | 115.3 (152.5)  |
| Sixteenth | 19.4 (21.3) | 97.9 (138.9)    | 259.8 (397.9)  |

First generation after a one-step change to one setting (the same 3,102 transitions, 124 left out):
rhythm-control changes (1,842, all memo misses) median 12.8 (15.6), p90 82.5 (121.7), p95 120.8
(172.6), max 304.2 (542.7) ms; 17 (was 35) take longer than 250 ms, none (was 11) longer than
500 ms, none longer than 1 s. Tonal-center changes: max 50.3 ms; register changes: max 41.0 ms
(was 51.4 for the two together).

**Chromium** (`npm run measure:latency:browser`, run twice in `off` and `on`, once in `settled`).
Click to "Phrase ready", in-page, including the Worker round trip and the engraving. The modes are
as in the speed-up below: `off` is true cold, `on` clicks right after the control changes, and
`settled` waits 3 s for pre-warm first. The worst case is Sixteenth / Heavily varied / Sparse /
Active displacement / Build; Straight / Edge is Sixteenth / Heavily varied / Sparse / Straight /
Edge, not measured before (the speed-up's Node figures put it near 500 ms).

| Scenario (ms), run 1, run 2                         | `off` (true cold)           | `on` (immediate click)      | `settled`           |
| --------------------------------------------------- | --------------------------- | --------------------------- | ------------------- |
| Default, cold                                       | 43.0, 41.3 (43.8, 44.1)     | 46.3, 39.7 (43.9, 40.5)     | 38.2 (44.9, 46.8)   |
| Default, warm                                       | 37.9, 37.4 (37.1, 35.0)     | 36.7, 36.9 (36.4, 39.5)     | 37.0 (36.0, 37.5)   |
| Worst case, cold                                    | 381.1, 319.2 (423.2, 440.1) | 273.4, 295.4 (391.4, 389.8) | 111.6 (65.7, 102.0) |
| Worst case, warm                                    | 45.0, 46.5 (44.3, 44.5)     | 80.4, 76.8 (44.5, 46.5)     | 51.1 (44.4, 46.0)   |
| Straight / Edge, cold (new)                         | 319.9, 289.8                | 283.5, 247.1                | 95.2                |
| Straight / Edge, warm (new)                         | 62.7, 58.8                  | 61.5, 59.5                  | 61.6                |
| Any one-control change into the worst case, slowest | 307.9, 277.2 (464.1)        | 246.9, 269.7 (368.4)        | 93.2 (95.7)         |
| Register or key change, worst rhythm kept, slowest  | 46.1, 40.2 (42.6)           | 81.4, 76.3 (59.0)           | 44.7 (44.1)         |

To see what the shared machine costs, `main` was measured the same way just after: worst case cold
504.7 ms in `off`, 437.3 and 515.8 ms in `on`, warm 42.6 and 43.3 ms in `on`. So on this busy
machine `main` was slower than the speed-up's figures from 14:33, and the branch saves about 120-240 ms on
the worst cold generation. The `settled` worst cold (111.6 ms, one run) is within that noise. The
`on`-mode warm rise, 77-80 ms against 43 ms on `main`, is real on the branch, but it is a shift in
when the Worker's garbage collector runs, not extra work. On the branch the `on`-mode cold
generation allocates less, so V8 runs a full collection just after it (while idle) instead of in
the middle of it; the first ranking after a full collection hashes the tie keys about 2.5× slower
(54 ms instead of about 21 ms), and here that is the warm one. Forcing the same collection on
`main` gives the same effect (warm 60-75 ms instead of 41-45 ms). So a player sees at most 15-35 ms
extra, once, on the first generation after a full collection, on either build. Traces are in the
session scratchpad, `perf-step-2/diag/`.

During the worst case's cold generation a theme click applied in 36 and 39 ms (`off`), 48 and
34 ms (`on`) and 45 ms (`settled`) (was 30-39 ms, and 81 ms once).

**Main-thread engraving** (`npm run measure:engraving`, one run, the densest staff). No task
reached 50 ms at either size (was none). The longest main-thread wait was 51.4 ms at 2560 × 1440
and 54.5 ms at 1920 × 1080, both at the first generation (was 42.6 and 40.5 ms). That rise is noise
from the shared machine: regenerations waited at most 27.2 ms and resize redraws at most 24.0 ms.

### Verdicts (after dropping the fast validator)

**Against the working goal (cold worst case under 250 ms in Chromium):**

- **True cold: still missed, but closer.** The worst case takes 319-381 ms (was 423-440) and
  Straight / Edge 290-320 ms: about 1.2-1.5× the goal.
- **A click right after the change: missed narrowly.** The worst case takes 273-295 ms (was 390);
  Straight / Edge takes 247-284 ms, at the goal in one run of two. In Node, 4 settings, all
  Sixteenth / Heavily varied / Sparse, still take 260-328 ms.
- **When the player pauses before clicking: met.** Once pre-warm has finished, the slowest first
  generations take about 95-112 ms.
- **Everything else: met.** Warm generations and changes that keep the rhythm setting stay under
  about 81 ms, the `on`-mode rise included.

**Against the deadline itself (`rule_look_ahead_deadline`):**

- **3 s window: met.** Cold worst case about 0.38 s, plus four retries at the `on`-mode warm worst
  case (about 0.08 s each): about 0.38 + 4 × 0.08 ≈ 0.70 s.
- **1 s window, phrase 2 during the count-in: met, retries included, even cold.** With the memo
  warmed by phrase 1: about 0.08 + 4 × 0.08 = 0.40 s. A cold phrase 2: about 0.38 + 0.32 = 0.70 s.
- **1 s window, regeneration after a rhythm-control change (v2.1): met with retries.** The slowest
  measured change in Chromium took 308 ms without pre-warm; four retries hit the now-warm memo,
  about 0.08 s each: about 0.63 s. The slowest Node change (304 ms, before the Worker round trip
  and engraving) leaves about the same margin.
- **Main thread:** the longest wait is 54.5 ms, well under the 200 ms scheduler window.

## Cold-generation speed-up on the reference machine (2026-09-30)

Measured on 2026-09-30, 14:33-14:40, on branch `v2-perf-cold-generation` (`main` at `5df8c24` plus
the speed-up), on the same reference machine and versions as the re-run below: AMD Ryzen 5 PRO
8640HS (6 cores, 12 threads), 11 GiB RAM, bare metal, Debian 13 (Linux 6.12), Node v22.23.2,
Chromium 153.0.8010.12 (Playwright 1.63.0 headless shell). Each run ran alone, started once the
1-minute load average was under 1.5 (0.81-1.49 before a run, up to 1.59 after); the owner's desktop
session stayed open. Every figure is "new (was old)", old being the
[2026-09-30 re-run](#v2-re-run-on-the-reference-machine-2026-09-30).

**What changed.** The first generation for a rhythm setting still builds that setting's whole
rhythm domain (every legal four-bar rhythm), and the output is unchanged byte for byte: a golden
fixture recorded before the change (all 324 settings × seeds 1-10, carry-in chains, other controls
varied, the memo's list and the ranked order for seeds 1-20) passes unchanged. What is faster:

- **Reject before building.** The enumeration drops answer lists that can take no syncopation
  template, and runs the anchor, anchor-ratio and ending checks on single bars, before a four-bar
  candidate is assembled. On the worst setting it now assembles 1,797 candidates instead of 10,535.
- **Faster seeded ordering.** Tie keys are hashed incrementally with shared-prefix checkpoints;
  they are the same keys.
- **Less allocation.** Candidates are frozen once, when published, and identities are joined from
  cached per-bar text.
- **Pre-warm.** The generation Worker builds the current setting's domain in the background, at
  start and after every rhythm-setting change, in slices of about 8 ms that a real request
  interrupts (see [`phrase-workspace.md`](phrase-workspace.md#pre-warm)).
- **Not done: dropping the second full validation.** Without it the fast path would yield 46
  invalid candidates in 20 Quarter and Eighth settings with Breath-heavy silence (answer
  similarity and attack band), so the output would change. The validator stays. (A later step
  dropped it behind two early checks; see
  [Validator-free fast enumeration](#validator-free-fast-enumeration-on-the-reference-machine-2026-09-30).)

**Node** (`npm run measure:latency`; no Worker, no pre-warm). The same 284 settings succeed and the
same 40 fail fast (under 28 ms each).

| Node, 284 settings (ms) | median      | p90           | p95           | max             |
| ----------------------- | ----------- | ------------- | ------------- | --------------- |
| Cold                    | 14.7 (17.8) | 116.3 (196.9) | 174.1 (268.5) | 522.0 (1,016.3) |
| Warm                    | 1.6 (1.9)   | 9.3 (18.4)    | 12.4 (28.7)   | 42.2 (112.3)    |

6 settings (was 22) take longer than 250 ms cold and none (was 1) longer than 1 s. The slowest are
all Sixteenth / Heavily varied / Sparse: Straight / Edge 522.0 ms, Straight / Build 507.5 ms (was
770.3), Active displacement / Build 447.7 ms (was 1,016.3), Active displacement / Edge 397.9 ms
(was 970.9). Straight has the largest domain (2,932 rhythms), so it is now the slowest.

Cold p90 by note density × rhythmic variety (ms):

| Density   | Strict      | Slightly varied | Heavily varied |
| --------- | ----------- | --------------- | -------------- |
| Quarter   | 4.2 (5.3)   | 3.9 (4.7)       | 38.2 (63.7)    |
| Eighth    | 60.5 (82.6) | 60.0 (85.7)     | 152.5 (314.2)  |
| Sixteenth | 21.3 (25.5) | 138.9 (229.4)   | 397.9 (710.9)  |

First generation after a one-step change to one setting (the same 3,102 transitions, 124 left out):
rhythm-control changes (1,842, all memo misses) median 15.6 (18.4), p90 121.7 (201.9), p95 172.6
(277.3), max 542.7 (1,157.0) ms; 35 (was 134) take longer than 250 ms, 11 (was 35) longer than
500 ms, none (was 5) longer than 1 s. Tonal-center or register changes: max 51.4 (115.8) ms.

**Chromium** (`npm run measure:latency:browser`, run twice in each pre-warm mode, interleaved).
Click to "Phrase ready", in-page, including the Worker round trip and the engraving. `off` is the
like-for-like comparison with the old figures (no pre-warm, true cold); `on` is the production page
with the click right after the control changes; `settled` waits 3 s for pre-warm first. The
wall-clock figures are left out: Playwright's polling rounds every slow case to 816-832 ms.

| Scenario (ms), run 1, run 2                         | `off` (true cold) | `on` (immediate click) | `settled`   | was (no pre-warm) |
| --------------------------------------------------- | ----------------- | ---------------------- | ----------- | ----------------- |
| Default, cold                                       | 43.8, 44.1        | 43.9, 40.5             | 44.9, 46.8  | 44.9, 48.9        |
| Default, warm                                       | 37.1, 35.0        | 36.4, 39.5             | 36.0, 37.5  | 36.4, 38.5        |
| Worst case, cold                                    | 423.2, 440.1      | 391.4, 389.8           | 65.7, 102.0 | 829.3, 951.4      |
| Worst case, warm                                    | 44.3, 44.5        | 44.5, 46.5             | 44.4, 46.0  | 142.7, 148.0      |
| Any one-control change into the worst case, slowest | 464.1             | 368.4                  | 95.7        | 842.4             |
| Register or key change, worst rhythm kept, slowest  | 42.6              | 59.0                   | 44.1        | 192.3             |

The worst case is Sixteenth / Heavily varied / Sparse / Active displacement / Build. During its
cold generation a theme click applied in 30-39 ms in five runs and 81 ms in one (`settled` run 1;
was 36 and 45 ms). In a separate check of the Worker (six runs per browser), a generation request
sent while a pre-warm was running waited at most 3.3 ms in Chromium, 4 ms in Firefox and 9 ms in
WebKit before the Worker picked it up. A full pre-warm of the worst setting took about 420 ms in
Chromium, 560 ms in Firefox and 580 ms in WebKit.

**Main-thread engraving** (`npm run measure:engraving`, one run, the densest staff). No task
reached 50 ms at either size (was 52, and 90, 63, 68 ms). The longest main-thread wait was 42.6 ms
at 2560 × 1440 and 40.5 ms at 1920 × 1080, both at the first generation (was up to 103.5 ms).

**Memo memory** (retained heap of one rhythm-domain entry, Node, median of 3): Active displacement
/ Build 37.0 MiB (was 38.5); Straight / Build, the largest domain, 49.4 MiB (was 58.5). The memo
still keeps every setting it has built for the page's lifetime.

### Verdicts (after the speed-up)

**Against the working goal (cold worst case under 250 ms in Chromium):**

- **True cold, and a click right after the change: missed, about 2× closer.** The worst case takes
  423-440 ms, or 390 ms when the click follows the change at once (pre-warm has only just
  started), down from 829-951 ms. In Node, 6 settings, all Sixteenth / Heavily varied / Sparse,
  still take 398-522 ms; Straight / Edge, the slowest, was not timed in Chromium but should land
  near 500 ms.
- **When the player pauses before clicking: met.** Once pre-warm has finished, the worst first
  generation takes 60-102 ms. The worst pre-warm takes about 0.4 s in Chromium, so
  under a second of pause is enough.
- **Everything else: met.** Warm generations and changes that keep the rhythm setting stay under
  60 ms (were 143-192 ms).

**Against the deadline itself (`rule_look_ahead_deadline`):**

- **3 s window: met, with more room.** Cold worst case about 0.44 s, plus four retries at a warm
  worst case each (about 0.05 s): about 0.64 s (was 1.55 s).
- **1 s window, phrase 2 during the count-in: met, retries included, even cold.** With the memo
  warmed by phrase 1: about 0.05 + 4 × 0.05 = 0.25 s. Even a cold phrase 2 fits: about
  0.44 + 4 × 0.05 = 0.64 s.
- **1 s window, regeneration after a rhythm-control change (v2.1): now met with retries.** The
  slowest measured change in Chromium took 464 ms without pre-warm; four retries hit the now-warm
  memo, about 0.05 s each: about 0.66 s. The slowest Node change (543 ms, before the Worker round
  trip and engraving) leaves about the same margin. So the conflict chunk 1 named between the
  three DRAFT atoms (`rule_look_ahead_deadline`, `req_settings_mutation_flag`,
  `rule_session_change_applies_at_phrase_boundary`) no longer shows in these figures. A mutation
  engine that posts a pre-warm as soon as it picks the new setting would widen the margin further.
- **Main thread:** the longest wait is 42.6 ms, well under the 200 ms scheduler window.

## v2 re-run on the reference machine (2026-09-30)

Measured on 2026-09-30 on `main` at `adf8d34` (chunks 2, 3, 3b, 4, 7, 14, 18 and 19 merged), on the
product owner's reference machine: AMD Ryzen 5 PRO 8640HS (6 cores, 12 threads), 11 GiB RAM,
bare metal, Debian 13 (Linux 6.12), Node v22.23.2, Chromium 153.0.8010.12 (the Playwright 1.63.0
headless shell). This is the re-run on a real computer that the owner's rule for virtual machines
asks for, so these figures gate. Each run ran alone, but the owner's desktop session (with a
desktop Chrome) stayed open: 1-minute load average 0.9-1.8 before and after each run, up to 3.4
after the first engraving run.

Since the chunk 1 baseline the code has changed in two ways that touch these harnesses. Chunk 7's
carry-in is not used by either harness, and generation without it is v1's, byte for byte, so the
latency figures compare directly. Chunk 3's layout draws the densest staff 192 px tall at both
desktop sizes (263 px before), and moved the engraved staff into one `staff-content` unit per
system position; `tests/e2e/workspace/engraving-main-thread.spec.ts` still looked for the old
`.staff-content__score` element and failed until its two selectors were updated on 2026-09-30.
`npm run measure:engraving` is not part of `npm run quality`, so nothing caught it earlier.

**Node** (`npm run measure:latency`). The same 284 settings succeed and the same 40 fail fast
(under 45 ms each).

| Node, 284 settings (ms) | median | p90   | p95   | max     |
| ----------------------- | ------ | ----- | ----- | ------- |
| Cold                    | 17.8   | 196.9 | 268.5 | 1,016.3 |
| Warm                    | 1.9    | 18.4  | 28.7  | 112.3   |

22 settings take longer than 250 ms cold and 1 longer than 1 s; no warm generation takes longer
than 250 ms. The slowest cold settings are all Sixteenth / Heavily varied / Sparse: Active
displacement / Build 1,016.3 ms, Active displacement / Edge 970.9 ms, Straight / Build 770.3 ms.
Unlike the cloud machine, Edge is not slower than Build here.

Cold p90 by note density × rhythmic variety (ms):

| Density   | Strict | Slightly varied | Heavily varied |
| --------- | ------ | --------------- | -------------- |
| Quarter   | 5.3    | 4.7             | 63.7           |
| Eighth    | 82.6   | 85.7            | 314.2          |
| Sixteenth | 25.5   | 229.4           | 710.9          |

First generation after a one-step change to one setting (the same 3,102 transitions; 124 land on
an unsupported rhythm setting and are left out):

| Changed control (ms)     | n     | memo misses | median | p90   | p95   | max     |
| ------------------------ | ----- | ----------- | ------ | ----- | ----- | ------- |
| Any rhythm control       | 1,842 | 1,842       | 18.4   | 201.9 | 277.3 | 1,157.0 |
| Note density             | 352   | 352         | 18.7   | 189.4 | 318.9 | 1,016.2 |
| Rhythmic variety         | 352   | 352         | 14.1   | 190.5 | 253.1 | 1,001.8 |
| Silence density          | 360   | 360         | 21.7   | 210.3 | 273.0 | 981.2   |
| Syncopation              | 352   | 352         | 19.3   | 217.9 | 297.0 | 995.4   |
| Tension arc              | 426   | 426         | 17.3   | 208.8 | 287.1 | 1,157.0 |
| Tonal center or register | 1,136 | 0           | 2.1    | 20.2  | 29.1  | 115.8   |

Of the 1,842 rhythm-control changes, 134 (7.3 %) take longer than 250 ms, 35 (1.9 %) longer than
500 ms and 5 (0.3 %) longer than 1 s. The slowest is Sixteenth / Heavily varied / Sparse / Active
displacement: Edge → Build, 1,157.0 ms.

**Chromium** (`npm run measure:latency:browser`, run twice). Click to "Phrase ready", in-page
figures, with the wall-clock figure in brackets; both include the Worker round trip and the
engraving.

| Scenario                                                                       | Cold (ms)                   | Warm (ms)               |
| ------------------------------------------------------------------------------ | --------------------------- | ----------------------- |
| Default (Quarter / Slightly varied / Straight / Sparse / Lift)                 | 44.9, 48.9 (138, 162)       | 36.4, 38.5 (70, 111)    |
| Worst case (Sixteenth / Heavily varied / Sparse / Active displacement / Build) | 829.3, 951.4 (1,322, 1,318) | 142.7, 148.0 (209, 209) |

During the worst-case cold generation a click on the theme control applied in 36 ms and 45 ms.

| Starting setting → worst case (control changed)          | Warm-up (ms) | After the change (ms) |
| -------------------------------------------------------- | ------------ | --------------------- |
| Note density: Eighth → Sixteenth                         | 304.6, 313.7 | 813.6, 842.4          |
| Rhythmic variety: Slightly varied → Heavily varied       | 307.9, 297.2 | 759.9, 826.9          |
| Silence density: Conversational → Sparse                 | 236.7, 251.1 | 762.8, 796.6          |
| Syncopation: Occasional offbeats → Active displacement   | 501.7, 532.0 | 786.6, 840.7          |
| Tension: Lift → Build                                    | 305.8, 307.4 | 769.9, 805.1          |
| Register: Middle → High (worst-case rhythm kept)         | 925.4, 778.0 | 192.3, 160.5          |
| Written key: C → C-sharp/D-flat (worst-case rhythm kept) | 794.5, 792.8 | 143.2, 143.2          |

**Main-thread engraving** (`npm run measure:engraving`, run twice; the densest setting, 64 notes
and rests on the staff). In ms:

| Viewport (staff size)        | Run | First generation: longest task (heartbeat gap) | 12 regenerations: tasks ≥ 50 ms | Engraving callback, max | Heartbeat gap, max (median) | 10 resize redraws: heartbeat gap, max (median) |
| ---------------------------- | --- | ---------------------------------------------- | ------------------------------- | ----------------------- | --------------------------- | ---------------------------------------------- |
| 2560 × 1440 (2,462 × 192 px) | 1   | under 50 (53.5)                                | 52                              | 44.1                    | 85.6 (21.3)                 | 32.3 (19.8)                                    |
| 2560 × 1440 (2,462 × 192 px) | 2   | under 50 (40.0)                                | none                            | under 50                | 21.6 (19.5)                 | 20.6 (17.7)                                    |
| 1920 × 1080 (1,822 × 192 px) | 1   | under 50 (39.6)                                | 90, 63, 68                      | 73.0                    | 103.5 (23.8)                | 37.2 (18.4)                                    |
| 1920 × 1080 (1,822 × 192 px) | 2   | under 50 (37.0)                                | none                            | under 50                | 29.6 (20.1)                 | 19.8 (15.7)                                    |

The long tasks of run 1 did not come back in run 2, where no task reached 50 ms at either size;
run 1 is the one after which the load average reached 3.4, so the desktop session likely caused
them. The worst figure of either run is still the one to judge by: 90 ms by `longtask`, 103.5 ms by
the heartbeat.

### Verdicts (reference machine)

**Against the working target (cold worst case under 250 ms in Chromium): missed.** The cold worst
case took 829-951 ms in Chromium, and the first generation after a rhythm-control change up to
842 ms. Warm generations and changes that keep the rhythm setting stay under 200 ms (143-192 ms).
By [chunk 1's rule](../specs/versions/v2/build-plan.md#chunk-1--baseline-checks), a miss stopped the
plan before chunks 8 and 10 until the owner decided. On 2026-09-30 the owner decided that the
250 ms target is, for now, a goal to aim for and not a gate; the deadline below is the gate.

**Against the deadline itself (`rule_look_ahead_deadline`):**

- **3 s window: met, with room to spare.** Cold worst case about 0.95 s, plus four retries at a
  warm worst case each (about 0.15 s): 0.95 + 4 × 0.15 ≈ 1.55 s. The slowest Node setting
  (1,016 ms, before the Worker round trip and engraving) leaves the same margin. The Edge setting
  the cloud run flagged is not slower than Build here.
- **1 s window, phrase 2 during the count-in: met, retries included,** as long as phrase 1 warmed
  the memo, which it does in the same Worker: 0.15 + 4 × 0.15 ≈ 0.75 s. A cold phrase 2 would
  take about 0.95 s, too close to the window to count on.
- **1 s window, regeneration after a rhythm-control change (v2.1): met on the first attempt only.**
  The worst measured case took 842 ms in Chromium, about 160 ms under the window; one retry
  (about 0.15 s more) reaches it, and four retries miss it (about 1.45 s). In Node, 5 of the 1,842
  rhythm changes (0.3 %) took longer than 1 s before engraving. The conflict between the three
  DRAFT atoms chunk 1 named (`rule_look_ahead_deadline`, `req_settings_mutation_flag`,
  `rule_session_change_applies_at_phrase_boundary`) is real, but narrower than on the cloud
  machine: it is the retries, and the few slowest settings, that don't fit.

**Main-thread engraving against the 200 ms scheduler window: under.** The worst main-thread block
was 90 ms by `longtask` (103.5 ms by the heartbeat), in a regeneration during the noisier run;
the quieter run had none of 50 ms or more. A Worker wake-up timer is enough for chunk 10, with
about 100 ms of the window left in the worst case.

**Against the v1 signed-off budget:** whole-catalog cold p90 196.9 ms (under 500 ms), warm p95
28.7 ms in Node (under 250 ms), Chromium worst-case cold 0.95 s (under 2 s): passes.

## v2 baseline (chunk 1, 2026-09-29)

Measured on 2026-09-29 on the v1.0 code (only documentation had changed since the v1.0 tag).

> **Not the reference machine.** These figures come from a cloud container: 4 vCPU Intel Xeon @
> 2.10 GHz, 15 GB RAM, Ubuntu 24.04.4 LTS (Linux 6.18), Node v22.22.2, Chromium 153.0.8010.12
> (the Playwright 1.63.0 headless shell). The product owner's reference machine (12 CPUs), which
> produced every older table in this document, was not available. On the same harness this machine
> is about twice as slow on the cold worst case (2,063 ms here against 990.7 ms there), so the
> owner may want the four commands re-run on the reference machine before deciding. Each run ran
> alone, with no other build or test process on the machine. Load averages (1-minute) before →
> after each run: Node 0.54 → 1.14; Chromium run 1 0.04 → 1.51; Chromium run 2 1.39 → 1.42 and
> engraving 1.31 → 1.04. The last two started seconds after the previous run ended, so their
> starting 1-minute average still carries that run; nothing else was running.

### Node

`npm run measure:latency`. Of the 324 settings, 284 succeed and 40 fail fast with
`no_legal_rhythm_plan` (the documented unsupported rhythm settings, under 101 ms each), as before.

| Node, 284 settings (ms) | median | p90   | p95   | max     |
| ----------------------- | ------ | ----- | ----- | ------- |
| Cold                    | 30.3   | 379.1 | 540.0 | 2,063.2 |
| Warm                    | 3.4    | 26.7  | 44.8  | 160.7   |

43 of the 284 settings take longer than 250 ms cold, and 6 longer than 1 s. No warm generation
takes longer than 250 ms. The five slowest cold settings are all Sixteenth / Heavily varied /
Sparse: Active displacement / Edge 2,063.2 ms, Active displacement / Build 1,859.7 ms, Straight /
Build 1,267.8 ms, Occasional offbeats / Build 1,226.2 ms, Straight / Edge 1,185.4 ms.

Cold p90 by note density × rhythmic variety (ms):

| Density   | Strict | Slightly varied | Heavily varied |
| --------- | ------ | --------------- | -------------- |
| Quarter   | 10.6   | 10.2            | 81.4           |
| Eighth    | 168.4  | 169.0           | 528.9          |
| Sixteenth | 73.2   | 458.7           | 1,226.2        |

**First generation after a one-step change to one setting** (3,102 transitions from the 284
starting settings; 124 land on an unsupported rhythm setting and are left out):

| Changed control (ms)          | n     | memo misses | median | p90   | p95   | max     |
| ----------------------------- | ----- | ----------- | ------ | ----- | ----- | ------- |
| Any rhythm control            | 1,842 | 1,842       | 33.2   | 375.5 | 526.6 | 2,119.4 |
| Note density                  | 352   | 352         | 33.9   | 370.6 | 532.8 | 1,823.8 |
| Rhythmic variety              | 352   | 352         | 27.0   | 363.1 | 473.0 | 1,967.0 |
| Silence density               | 360   | 360         | 36.8   | 382.6 | 544.0 | 1,848.9 |
| Syncopation                   | 352   | 352         | 35.7   | 385.2 | 529.3 | 1,747.6 |
| Tension arc                   | 426   | 426         | 30.7   | 377.6 | 526.6 | 2,119.4 |
| Tonal center or register      | 1,136 | 0           | 3.7    | 24.9  | 41.5  | 280.1   |
| Tonal center (C → C#, B)      | 568   | 0           | 3.8    | 25.7  | 42.9  | 262.1   |
| Register (Middle → Low, High) | 568   | 0           | 3.5    | 23.9  | 40.6  | 280.1   |

Of the 1,842 rhythm-control changes, 278 (15.1 %) take longer than 250 ms, 104 (5.6 %) longer than
500 ms and 34 (1.8 %) longer than 1 s.

The ten slowest transitions all end on a Sixteenth / Heavily varied / Sparse / Active displacement
setting:

| From → to (the control that moved)                                                     | ms      |
| -------------------------------------------------------------------------------------- | ------- |
| Sixteenth / Heavily varied / Sparse / Active displacement: Lift → Build                | 2,119.4 |
| Sixteenth / Sparse / Active displacement / Edge: Slightly → Heavily varied             | 1,967.0 |
| Sixteenth / Heavily varied / Sparse / Active displacement: Edge → Build                | 1,865.8 |
| Sixteenth / Heavily varied / Sparse / Active displacement: Build → Edge                | 1,863.9 |
| Sixteenth / Heavily varied / Active displacement / Build: Conversational → Sparse      | 1,848.9 |
| Heavily varied / Sparse / Active displacement / Build: Eighth → Sixteenth              | 1,823.8 |
| Sixteenth / Sparse / Active displacement / Build: Slightly → Heavily varied            | 1,806.1 |
| Heavily varied / Sparse / Active displacement / Edge: Eighth → Sixteenth               | 1,802.2 |
| Sixteenth / Heavily varied / Sparse / Edge: Occasional offbeats → Active displacement  | 1,747.6 |
| Sixteenth / Heavily varied / Sparse / Build: Occasional offbeats → Active displacement | 1,736.0 |

What makes a generation cold after a change:

- **Any change to a rhythm control** — note density, rhythmic variety, silence density,
  syncopation or tension arc — makes the next generation cold, every time. The memo holding the
  previous setting does not help: its figures match the cold figures of a fresh memo above. The
  cost depends on the setting the change lands on, not on which control moved.
- **A change to tonal center or register** keeps the rhythm setting, so the next generation is a
  memo hit and costs what a warm generation costs. The same holds for every other control outside
  the rhythm memo key (collection, harmonic motion, contour, leapiness, arpeggio chaos): they do not
  enter the key either.

### Chromium

`npm run measure:latency:browser`, run twice. Click to "Phrase ready", in-page figures, with the
wall-clock figure in brackets; both include the Worker round trip and the engraving.

| Scenario                                                                       | Cold (ms)                       | Warm (ms)               |
| ------------------------------------------------------------------------------ | ------------------------------- | ----------------------- |
| Default (Quarter / Slightly varied / Straight / Sparse / Lift)                 | 72.7, 78.1 (175, 186)           | 31.4, 34.6 (83, 86)     |
| Worst case (Sixteenth / Heavily varied / Sparse / Active displacement / Build) | 1,441.4, 1,432.6 (1,887, 1,868) | 233.4, 254.1 (260, 339) |

During the worst-case cold generation a click on the theme control applied in 87 ms and 95 ms
(under the 200 ms the spec asserts).

**First generation after a one-control change into the worst case.** Each row is a fresh page
(one Worker, one empty memo). The page first generates the starting setting ("warm-up"), then one
control is changed through the UI and the next generation is timed.

| Starting setting → worst case (control changed)          | Warm-up (ms)     | After the change (ms) |
| -------------------------------------------------------- | ---------------- | --------------------- |
| Note density: Eighth → Sixteenth                         | 524.0, 596.6     | 1,296.2, 1,470.8      |
| Rhythmic variety: Slightly varied → Heavily varied       | 518.1, 579.9     | 1,306.5, 1,568.4      |
| Silence density: Conversational → Sparse                 | 507.1, 457.1     | 1,272.9, 1,325.9      |
| Syncopation: Occasional offbeats → Active displacement   | 939.6, 1,034.2   | 1,530.6, 1,589.4      |
| Tension: Lift → Build                                    | 611.6, 619.6     | 1,369.3, 1,346.9      |
| Register: Middle → High (worst-case rhythm kept)         | 1,410.3, 1,365.0 | 236.3, 256.5          |
| Written key: C → C-sharp/D-flat (worst-case rhythm kept) | 1,611.1, 1,295.0 | 237.0, 241.0          |

The worst case after a rhythm-control change is 1,589.4 ms; after a register or key change,
256.5 ms, the same as a warm worst-case generation.

**The older wall-clock figures overstate long cycles.** The wall-clock column lands on
Playwright's polling steps (about 850, 1,360 and 1,870 ms) whatever the real duration: for example
1,296 ms in the page was read as 1,356 ms, and 457 ms as 866 ms. The reference machine's 823 ms
worst-case cold figure below was measured the same way, so the real figure there may be up to
about 500 ms lower.

### Main-thread engraving

`npm run measure:engraving`, the densest setting (Sixteenth / Strict / Sparse / Straight / Edge,
64 notes and rests on the staff, 58 of them notes on average). In ms:

| Viewport (staff size)        | First generation: longest task (heartbeat gap) | 12 regenerations: tasks ≥ 50 ms | Engraving callback, max (median) | Heartbeat gap, max (median) | 10 resize redraws: heartbeat gap, max (median) |
| ---------------------------- | ---------------------------------------------- | ------------------------------- | -------------------------------- | --------------------------- | ---------------------------------------------- |
| 2560 × 1440 (2,462 × 263 px) | 83 (93.2)                                      | none                            | 33.7 (18.8)                      | 42.9 (31.5)                 | 88.0 (22.9)                                    |
| 1920 × 1080 (1,822 × 263 px) | 56 (66.6)                                      | none                            | 33.2 (under 5)                   | 42.1 (27.9)                 | 29.2 (20.6)                                    |

- No regeneration or resize redraw produced a main-thread task of 50 ms or more, at either size.
  The longest engraving callback was 33.8 ms (in a 2560 × 1440 resize redraw).
- The longest main-thread block of the whole run was the first generation in a fresh page: 83 ms at
  2560 × 1440 (93.2 ms by heartbeat). That task is the Worker's reply, which on the first phrase
  also mounts the score and engraves it with code that has not run before. In a session, phrase 1
  is on screen before Start, so this first engraving happens before any sound is scheduled.
- The one 88.0 ms heartbeat gap in a resize redraw comes from the whole page being laid out again
  for a new window width, which does not happen during a session unless the window is resized.
- Generation adds nothing to the main thread: the Worker's reply stayed under 50 ms after the first
  phrase. The click-to-ready cycle for these phrases was 54-60 ms (median).

### Verdicts

**Against the working target (cold worst case under 250 ms in Chromium): missed.** The target is a
quarter of one bar at 240 BPM (one bar lasts 1 s). The cold worst case measured 1,432-1,441 ms in
Chromium on this machine, and the first generation after a rhythm-control change up to 1,589 ms.
Both miss, and the target misses even on the reference machine's older, overstated 823 ms. These
figures come from a cloud virtual machine, and the product owner decided on 2026-09-29 that no
performance figure from a virtual machine gates the build plan: **they are recorded for reference
only, stop no chunk, and the check is re-run on a real computer.** Warm generations
and changes that keep the rhythm setting (tonal center, register) stay at or around 250 ms in the
worst case (233-257 ms here).

**Against the deadline itself (`rule_look_ahead_deadline`)** — a separate question from the working
target. The rule: each look-ahead phrase must be generated **and** engraved before it is due. At
240 BPM that is normally 3 bars, 3 s, after it is requested; it is 1 bar, 1 s, for phrase 2 (made
during the one-bar count-in) and, from v2.1, for a phrase regenerated after an automatic settings
change. Up to four retries after a failed attempt share that same window. Only the Chromium
click-to-"Phrase ready" figures include engraving; the Node figures do not. On this machine:

- **3 s window: met for the setting measured in Chromium, not shown for every setting.** The
  Chromium worst case (Sixteenth / Heavily varied / Sparse / Active displacement / Build) took
  1.44 s cold. A retry after a failed attempt runs on the same rhythm setting, which the first
  attempt has already put in the memo, so each retry costs about a warm worst case, about 0.25 s:
  1.44 + 4 × 0.25 ≈ 2.5 s, still inside 3 s, with about 0.5 s to spare. But the Node run found
  slower settings on this machine, before engraving and the Worker round trip: the same setting
  with Edge tension at 2,063 ms cold, and a change into it at 2,119 ms. With four retries that
  comes to about 3.1 s, over the window. Node and Chromium figures don't compare directly (on the
  Build setting, Chromium was faster than Node here), so whether every supported setting meets the
  3 s window needs the Edge setting measured in Chromium.
- **1 s window, phrase 2 during the count-in: met, if phrase 1 warmed the memo.** Phrase 2 has the
  same settings as phrase 1, which was generated in the same Worker before Start, so phrase 2 is a
  warm generation: at most about 0.25 s. It would miss if phrase 2 were cold (1.44 s), and, in the
  worst case, if all four retries were needed (0.25 + 4 × 0.25 ≈ 1.25 s).
- **1 s window, regeneration after a settings change (v2.1): missed.** A rhythm-control change is
  always cold, and the worst measured case took 1.59 s in Chromium. In Node, 1.8 % of the one-step
  rhythm changes took longer than 1 s even before engraving and the Worker round trip. Changes that
  keep the rhythm setting (tonal center, register and the other non-rhythm controls) fit easily.

**Main-thread engraving against the 200 ms scheduler window: under.** The longest main-thread task
while engraving the densest phrase on the largest staff was 83 ms by `longtask` (93.2 ms by the
heartbeat), and that was the first phrase in a fresh page; later phrases stayed under 50 ms (at
most 42.9 ms by the heartbeat). So moving the scheduler's wake-up timer into a Web Worker is enough
here. The reasoning: a timer in a Worker wakes on time even while the main thread is busy, but if
the scheduling work itself (queuing the next notes with the audio clock) then runs on the main
thread, it has to wait for the running main-thread task to finish. That is harmless as long as
every main-thread task is shorter than the look-ahead window, because notes already queued keep
playing on the audio thread and the late wake-up still queues the next notes before they are due. If
a single main-thread task could exceed 200 ms, a Worker timer alone would not guarantee on-time
scheduling, and the scheduling itself would have to move off the main thread too. Measured here,
the worst block leaves about 100 ms of the 200 ms window. Limits of this check: one desktop machine
(not the reference machine, not a phone), a headless Chromium, 1× device pixel ratio, and only
engraving on the main thread: no audio, MIDI or other session work was running.

**Against the v1 signed-off budget,** for the record: on this machine the whole-catalog cold p90 is
379.1 ms (under 500 ms), warm p95 44.8 ms in Node (under 250 ms) and the Chromium worst-case cold
1.44 s (under 2 s), so the v1 budget below still passes here.

### Chunk 7 reference run (2026-09-29)

One `npm run measure:latency` run on 2026-09-29, after the generator learned to continue from the
phrase before (carry-in). The harness generates without carry-in, the path whose output is
byte-identical to v1, so it measures that path only; generation with carry-in is not covered by
it. Same kind of cloud container as the chunk 1 baseline (4 vCPU, Node v22.22.2), **shared with
another chunk's work while it ran**: 1-minute load average 5.0 before and 2.7 after. Figures are
for reference only and gate nothing (the owner's rule for virtual machines, above).

| Node, 284 settings (ms) | median | p90   | p95   | max     |
| ----------------------- | ------ | ----- | ----- | ------- |
| Cold                    | 29.5   | 316.0 | 506.4 | 1,745.8 |
| Warm                    | 3.6    | 23.7  | 35.4  | 206.6   |

The same 40 settings fail fast with `no_legal_rhythm_plan`. 39 settings take longer than 250 ms
cold and 5 longer than 1 s; no warm generation takes longer than 250 ms. The slowest cold setting
is again Sixteenth / Heavily varied / Sparse / Active displacement / Edge.

## Measured results (Node, v2 catalog, reference machine)

Measured on the reference machine on branch `iss004-rhythmic-variety` (fix round 1), machine load
~0.3-1.8 (12 CPUs, mostly idle). Of the 324 settings, 284 succeed and 40 fail with
`no_legal_rhythm_plan` — exactly the unsupported-rhythm-setting combinations documented in
`src/domain/controls/unsupported-rhythm-settings.ts` (6 blocked Strict settings + 4 blocked
Slightly-varied settings, × 4 tension arcs = 40; Heavily varied blocks none). Unsupported settings
fail fast (all under a few ms) before any search, so they are excluded from the latency statistics
below, which cover only the 284 successful settings.

| Node (ms) | median | p90   | p95   | max   |
| --------- | ------ | ----- | ----- | ----- |
| Cold      | 17.1   | 185.8 | 260.1 | 990.7 |
| Warm      | 1.9    | 18.1  | 27.8  | 111.4 |

5 slowest cold settings:

| Setting                                                 | Cold (ms) |
| ------------------------------------------------------- | --------- |
| Sixteenth / Heavily varied / Sparse / ... (slowest)     | 990.7     |
| Sixteenth / Heavily varied / Sparse / ... (2nd slowest) | 989.4     |
| Sixteenth / Heavily varied / ... (3rd slowest)          | 691.7     |
| Sixteenth / Heavily varied / ... (4th slowest)          | 688.5     |
| Sixteenth / Heavily varied / ... (5th slowest)          | 612.9     |

All five slowest settings are Sixteenth density under Heavily varied rhythmic variety: widening the
variety band (see `docs/module_rhythm_variety_grammar.atom.md`) most enlarges the Sixteenth beat-
cell catalog, which is already the largest catalog at Strict.

Cold p90 by note density × rhythmic variety (ms), the 3×3 breakdown of the table above:

| Density   | Strict | Slightly varied | Heavily varied |
| --------- | ------ | --------------- | -------------- |
| Quarter   | 4.4    | 5.2             | 59.8           |
| Eighth    | 82.4   | 83.9            | 304.9          |
| Sixteenth | 24.0   | 226.6           | 688.5          |

Quarter and Eighth density stay fast at every variety level; Sixteenth grows sharply as the variety
band widens, because Sixteenth's beat-cell catalog is already the richest of the three densities
before any widening. This is expected and is the reason the whole-catalog p90 (which mixes all nine
density × variety cells) still comfortably passes the 500 ms budget while the single worst cell
(Sixteenth × Heavily varied, cold p90 688.5 ms) exceeds it on its own — see
[Latency budget](#latency-budget-signed-off) below for how that reconciles.

## Browser (Chromium)

Reference machine, same ISS-004 round as the Node table above; wall-clock figures only (see
[Method](#method) for why long wall-clock figures overstate the cycle). Measured by
`npm run measure:latency:browser` (Playwright, Chromium, production preview build).
Each scenario clicks the primary action and times until the `generation-status` live region reads
"Phrase ready", so the figures include the Worker round trip, boundary re-validation, the
written-notation transform, and VexFlow engraving. Cold is the first generation for that rhythm
setting in a fresh page (empty memo in the Worker); warm is the following Regenerate (memo hit, new
seed).

| Scenario                                                                                         | Cold (ms) | Warm (ms) |
| ------------------------------------------------------------------------------------------------ | --------- | --------- |
| Default (Quarter / Slightly varied (the default) / Straight / Sparse / Lift)                     | 120       | 82        |
| Worst case (Sixteenth / Heavily varied / Sparse / Active displacement / Build, 1,797 candidates) | 823       | 228       |

The default scenario is `Slightly varied`, not `Strict`: at Quarter density, `Slightly varied`'s
candidate domain (318 validator-accepted candidates, summed across the supported silence x
syncopation x tension-arc settings) is larger than `Strict`'s (184), per the prefilter-soundness
table in `specs/archive/v1/iss004-feasibility-review.md` §3.

Responsiveness: during the worst-case cold generation, a click on the theme control applied the new
`data-theme` attribute in 34 ms (the spec asserts under 200 ms). Generation runs off the main
thread, so the workspace stays interactive while a cold rhythm domain is materialized.

## Latency budget (signed off)

The product owner signed off this budget on 2026-09-24. It is checked against the whole v2 catalog,
not any single density × variety cell:

- **Warm (memo hit) generation:** ≤ 250 ms p95 in Chromium on the reference machine.
- **Cold first generation for a rhythm setting:** ≤ 500 ms p90 across the whole catalog, and the
  browser worst case stays within 2 s.
- **Regression rule:** any measured regression of warm p95 above 250 ms, cold p90 above 500 ms
  (whole catalog), or browser worst-case cold above 2 s fails the budget.

Result against the v2 catalog measured above:

- Whole-catalog warm p95 = 27.8 ms in Node (well under 250 ms; the Chromium default-scenario warm
  figure of 82 ms is also comfortably under budget).
- Whole-catalog cold p90 = 185.8 ms in Node (under the 500 ms bound).
- Browser worst case (Sixteenth / Heavily varied / Sparse / Active displacement / Build) cold =
  823 ms (under the 2 s bound).
- **Honest exception:** the single slowest density × variety cell, Sixteenth × Heavily varied
  alone, has a cold p90 of 688.5 ms — above the 500 ms figure if that cell were judged in isolation.
  The budget is defined and signed off against the whole catalog's p90, not any individual cell, and
  the whole catalog passes; this cell is called out here so the exception is not hidden by the
  aggregate number.

Out of scope for this budget: precomputed rhythm domains, bounded-prefix ranking, and other changes
to what the enumeration yields. Pre-warm is not a precomputed domain: the Worker builds the domain
at run time from the grammar, exactly as a cold generation would, only earlier, and its output is
the same.

## Historical: rhythm-mvp-v1 measurements

The tables and narrative below describe the retired `rhythm-mvp-v1` catalog (144 settings: note
density Quarter/Eighth/Sixteenth/**Mixed**, no rhythmic-variety control), measured before ISS-004
replaced Mixed density with the rhythmic-variety control. They are kept only as a historical record
of the enumeration-speed-package work and the tension-binding correction; they do not describe the
current catalog and are not checked against the current budget.

Of the 144 v1 settings, 114 succeeded and 30 failed, identically before and after the enumeration
speed package:

- **24 `no_legal_rhythm_plan`** — exactly the 6 constant unsupported-rhythm-settings (as they stood
  under v1) × 4 tension arcs.
- **6 `no_legal_pitch_plan`**, specific to this measurement's fixed pitch context (Middle register,
  `bb-tenor`, C Major/Gentle diatonic, Arch/Shaped/Predictable, tempo 90): Eighth/Breath-heavy/
  Straight/Edge; Eighth/Breath-heavy/Occasional offbeats/Build; Eighth/Breath-heavy/Occasional
  offbeats/Edge; Eighth/Breath-heavy/Active displacement/Build; Eighth/Breath-heavy/Active
  displacement/Edge; Mixed/Breath-heavy/Active displacement/Edge. The later tension-binding
  correction fixed all six (see [below](#tension-binding-correction-v1)); 120 settings now succeed
  and only the 24 `no_legal_rhythm_plan` settings fail.

Latency across the 114 successful v1 settings, measured back to back on the reference machine at
`be9128b` (Step 9, before) and with the enumeration speed package (after). The Step 9 run
originally recorded here (cold median 121.1 / p90 1199.7 / p95 5268.4 / max 16782.0 ms) was on a
more loaded machine; the "before" row is a fresh re-measurement for a like-for-like comparison.

|                  | median | p90    | p95    | max     |
| ---------------- | ------ | ------ | ------ | ------- |
| Cold before (ms) | 71.6   | 1065.2 | 4025.3 | 11394.4 |
| Cold after (ms)  | 36.3   | 219.2  | 316.1  | 689.5   |
| Warm before (ms) | 3.0    | 23.8   | 34.9   | 56.2    |
| Warm after (ms)  | 2.6    | 23.5   | 34.7   | 56.6    |

5 slowest cold v1 settings after the speed package:

| Setting                                        | Cold (ms) | Warm (ms) |
| ---------------------------------------------- | --------- | --------- |
| Mixed / Sparse / Active displacement / Build   | 689.5     | 56.6      |
| Mixed / Sparse / Active displacement / Edge    | 684.4     | 55.9      |
| Mixed / Sparse / Occasional offbeats / Build   | 373.7     | 51.4      |
| Mixed / Sparse / Occasional offbeats / Edge    | 365.5     | 50.3      |
| Mixed / Sparse / Active displacement / Settled | 334.1     | 23.5      |

Before the package the slowest were the four Mixed + Active displacement Build/Edge settings with
Conversational or Sparse silence, at 10.6-11.4 s cold. The 30 unsupported/no-plan settings are
fast in both cases (cold max 577.1 ms before, 200.6 ms after; warm under 2 ms): they fail before
any expensive search.

### Browser (Chromium), v1

Measured by `npm run measure:latency:browser` on the v1 catalog. Two runs each on the reference
machine:

| Scenario                                                         | Cold before | Cold after | Warm before | Warm after |
| ---------------------------------------------------------------- | ----------- | ---------- | ----------- | ---------- |
| Default (Quarter / Straight / Sparse / Lift)                     | 96, 110     | 106, 106   | 122, 119    | 83, 79     |
| Worst case (Mixed / Conversational / Active displacement / Edge) | 9371, 9376  | 324, 321   | 74, 68      | 86, 73     |

(All times in ms.) The browser scenario is the Step 9 worst case; after the package the slowest
Node setting is Mixed / Sparse / Active displacement / Build (689.5 ms cold in Node).

Responsiveness: during the worst-case cold generation, a click on the theme control applied the new
`data-theme` attribute in 32-33 ms after the package (31-32 ms before; the spec asserts under 200
ms). Generation runs off the main thread, so the workspace stays interactive while a cold rhythm
domain is materialized.

### Tension-binding correction (v1)

The signed-off tension-binding correction (rests allowed between a figure and its target within
the documented `maximumResolutionDelay`, and between a preparation and its figure; see
[pitch-planner-validation.md](music/pitch-planner-validation.md#neutral-and-jazz-vocabulary))
changes output, so it was re-measured back to back against `eeef500`, two runs each, on a quiet
reference machine. The six former `no_legal_pitch_plan` settings now succeed, cold 5-58 ms and
warm under 2 ms, so the successful set grows from 114 to 120.

| Node (ms)                               | median     | p90          | p95          | max          |
| --------------------------------------- | ---------- | ------------ | ------------ | ------------ |
| Cold before (114 successes)             | 39.8, 40.0 | 230.5, 238.8 | 346.6, 342.3 | 741.2, 758.7 |
| Cold after (120 successes)              | 36.5, 38.2 | 181.6, 185.9 | 307.9, 313.9 | 766.7, 768.1 |
| Cold after, same 114 settings as before | —          | 230.6, 231.0 | 335.3, 350.3 | 766.7, 768.1 |
| Warm before (114 successes)             | 2.7, 3.1   | 23.9, 27.0   | 35.7, 35.7   | 56.2, 54.8   |
| Warm after (120 successes)              | 2.4, 2.6   | 23.8, 25.0   | 35.0, 28.2   | 56.4, 55.6   |

The lower after-p90 comes mostly from adding six fast settings; over the same 114 settings the
figures are unchanged within run-to-run noise. The slowest setting is still Mixed / Sparse /
Active displacement / Build (741-768 ms cold), dominated by rhythm enumeration, which the
correction does not touch. In Chromium (`npm run measure:latency:browser`), before → after: default
cold 110, 99 → 114, 105 ms and warm 77, 81 → 71, 74 ms; worst-case cold 316, 323 → 326, 324 ms and
warm 81, 86 → 86, 83 ms; theme response 33-34 → 32-33 ms.

### Enumeration speed package (v1)

The cold worst case was dominated by the Step 6 rhythm-domain enumeration. The speed package makes
that enumeration and the pitch search cheaper without changing any output: the Mixed-density
gesture skip (now generalized to `gestureCannotReachShare` for the full v2 rhythmic-variety
catalog; see `docs/music/rhythm-phrase-structure.md`) and `quickRejectRhythmCandidate` prefilter,
per-expansion transform/selector memos, freezing only yielded rhythm candidates, reusing the
no-plan probe's iterator, computing rhythm identity once, and a pitch search that caches per-state
candidate orderings and tie keys and only freezes the returned phrase (see
`docs/music/rhythm-phrase-structure.md` and `specs/generative-process.md`). Byte identity was
checked over seeds 1-3 × all 144 v1 settings and a 2,880-case differential (outcome hash, kind,
fuel): 0 mismatches. The `rhythm-mvp-v1` manifest and the Step 9 golden fixture are unchanged.
