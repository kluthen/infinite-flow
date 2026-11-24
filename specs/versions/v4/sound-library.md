# v4.0 — The Sound Library

Status: draft v1 (2026-11-24), consolidated into the [master spec](master-spec.md) v1.0 the same day (D595); the master spec wins where they differ, and the (proposed) tags here were ruled there (D585–D594). How v4.0's system voices get distinct timbres. Grounded in the
[sound library survey](../../../docs/sound-library-survey.md) (2026-10-11) and the structural
review's Tone.js research,
[evidence C §6](../v3/structural-review-evidence/C-tooling-and-tonejs-research.md#6-tonejs-today)
(2026-11-23). Code facts checked on `main` at 6d4c33c3.

## 1. Settled

- **Which library is settled by a spike** at the start of v4.0's build: Tone.js first, plain Web
  Audio with a small AudioWorklet as the fallback (D553; [v4](README.md#settled-direction)).
- **The constraints** of the [v4 README](README.md#settled-direction) hold: our look-ahead
  scheduler is the only clock (no `Transport`), one shared `AudioContext`, the library imported
  lazily, latency and CPU re-measured with the phone, the exports on the pure renderers.
- **The one true sound ban is recorded samples** (owner, 2026-10-11): generated buffers (noise, a
  reverb's impulse response), worklets, WASM DSP and effects are allowed. The atoms and
  `verify:boundaries` still say "oscillators and gains only"; v4.0's master spec rewords them to
  ban recorded sound and audio assets
  ([prerequisites §4, v4.0's rows](../prerequisites.md#v40s-rows)).
- **The guide playback's layers stay** (D491): only the sounding part
  (`src/audio/web-audio-voices.ts`, `web-audio-session-bus.ts`) is replaced.
- **Chrome is the one supported browser** (D399), so Tone.js issue #1457 (Firefox and
  `setContext` on our own context) does not block v4.0 (D584).

## 2. What the spike must settle (O322)

Known from the research, each with a proposed handling:

| Item                         | Fact                                                                                                         | Proposed                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Chunk size                   | Tone 15.1.22: about 224 KiB minified even with nothing used; the six wanted classes about 245 KiB (C §6.2)   | A lazy chunk with its own named budget in `verify:boundaries` (today's default for a lazy chunk is 100 KiB) |
| Start-up budget              | 394,052 B of 400 KiB at v3.4 (release notes); lazy chunks are not counted                                    | Tone never in the first load; the 400 KiB budget untouched (D571)                                          |
| A second `AudioContext`      | Importing Tone creates one                                                                                   | `setContext(appCtx, true)` right after the import; a test counts contexts                                  |
| The synchronous unlock       | `unlock()` runs synchronously in the Start click (`workspace-session-start.ts:161-174`); `openSessionBus` is synchronous | Fetch the chunk at idle after the first paint, so Start finds it loaded; Start stays synchronous; if it is not loaded yet, the session starts with today's oscillator voices |
| Tone's ticker                | Always runs, in a `blob:` Worker; PolySynth frees voices through it                                         | CSP `worker-src 'self' blob:` in `docker/security-headers.conf`; times always passed explicitly            |
| AudioWorklets from `blob:`   | Blocked by `script-src 'self'`; none of the six wanted classes uses one                                     | Use none; no `script-src` change                                                                           |
| Version                      | `latest` 15.1.22 (2025-04); `next` 15.5.x carries 2026 fixes, moves daily                                    | `latest`, pinned, unless the spike hits a fixed bug                                                        |
| Phone CPU                    | No figures; reverb is the heaviest                                                                          | The survey's measure table; reduce voices or reverb before changing library                                |
| Offline                      | Every emitted `.js` must be precached                                                                        | Already covered by the service worker's patterns                                                           |

The survey's [spike plan](../../../docs/sound-library-survey.md#spike-plan) (two adapters behind one
session bus, a fixed test pattern, the measure table and its decision rule) is the spike's brief.

## 3. Sounds per voice (proposed)

- One timbre per system voice, fixed, chosen by ear at the spike; no sound choice for the player
  in v4.0 (`timbre-presets` is a style-pack capability, not v4.0's).
- The backing and the guides may keep their oscillator sound or move to the library; the owner
  hears both at the spike.
- A stopped session fades every voice; a shared reverb's tail is cut with the fade, so nothing
  rings after Stop.
