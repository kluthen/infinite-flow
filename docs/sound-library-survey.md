# Sound Library Survey (v4)

Status: research (2026-10-11), groundwork for the v4 sound-library spike; not a decision.

## Purpose

v2 plays the session backing with plain Web Audio: a triangle-wave bass, sine chord notes and a
sine click, each note one oscillator and one envelope gain, scheduled by the app's own look-ahead
scheduler on the one shared `AudioContext` ([audio transport](audio-transport.md#the-voices)). v4
adds **accompaniment with roles**: several system voices with distinct timbres, and likely drums
([v4](../specs/versions/v4/README.md)). The owner sees Tone.js as a good candidate and asked
whether another library fits better.

This survey compares the candidates against the constraints already written down in the repo, with
the endgame in mind: a rhythm RPG where characters, locations and events each carry an instrument
preference and a tone, companions and antagonists are system voices, and the mix changes as the
team changes ([endgame](../specs/vision/endgame.md)). It ends with a primary pick, a fallback and a
spike plan. It decides nothing: the v4 spike does.

How to read it:

- **Verified** means checked on 2026-10-11 against the package source, the npm registry, the
  GitHub API or the project's own docs, with a source id (`C1`, `C2`, ...) or a repo path.
- **Measured** means measured for this survey: bundle sizes were produced with esbuild 0.28.2
  (`--bundle --minify --format=esm`) in a scratch directory outside the repo, then gzipped at
  level 9. Vite's Rollup build may differ by a few percent.
- **Inference** is marked as such. It is a reasoned expectation the spike must confirm.

## Our constraints

From the repo, as of `main` at `c498d9c`:

1. **Our scheduler and our audio clock are the only timing source.** The look-ahead scheduler
   plans `[from, to)` slices up to 200 ms ahead of `AudioContext.currentTime`, woken every 25 ms by
   a Web Worker timer ([look-ahead scheduler](audio-transport.md#the-look-ahead-scheduler);
   [`look-ahead-scheduler.ts`](../src/audio/look-ahead-scheduler.ts)). Every note reaches the
   audio side as an absolute audio time (`ScheduledBackingNote.at` / `until`) through the
   `SessionBus` port ([`audio-ports.ts`](../src/audio/audio-ports.ts)). v4 constraint 1: "use the
   library's instruments and effects, never its `Transport`".
2. **One shared `AudioContext`** for the click, the backing and the mix. It is created once, on
   the player's Start or "Connect controller" click, with `latencyHint: 'interactive'`
   ([`web-audio-output.ts`](../src/audio/web-audio-output.ts)). `verify:boundaries` allows the
   words `AudioContext`, `webkitAudioContext` and `OfflineAudioContext` only under `src/audio/`
   ([`verify-boundaries.mjs`](../scripts/verify-boundaries.mjs)). The mix is four gains
   (click and backing, each an on/off gain into a volume gain), and every session opens its own
   bus of fade gains, so stopping a session fades out everything it scheduled.
3. **Dynamic import at session start**, not in the main bundle (v4 constraint 3). The boundary
   script gives each emitted JS chunk a minified-size budget: the entry chunk 224 kB, the
   generation Worker 150 kB, the lazy VexFlow chunk 800 kB, and **any other chunk 100 kB**. A
   library chunk over 100 kB therefore needs its own named budget, as VexFlow has. Every emitted
   `.js`, `.css` and `.woff2` file must be in the service-worker precache (offline PWA), and
   Workbox's `globPatterns` today covers `html, js, css, woff2, png, svg, ico` only
   ([`vite.config.ts`](../vite.config.ts)), so a `.wasm` file (or any other new file type) would
   need a config change to be available offline; a worklet emitted as `.js` is already covered.
4. **Latency and CPU are re-measured with the library's nodes in the path, phone included**
   (v4 constraint 4; "reverb is the heaviest"). The v2 targets that still hold
   ([v2 master spec §11](../specs/versions/v2/master-spec.md#11-definition-of-done)):
   - item 6: the on-screen playhead stays within **20 ms** of the actual audio output (met on
     2026-10-06: at most 14.5 ms);
   - item 15: no main-thread task runs longer than the scheduler's **200 ms** look-ahead window
     during a 240 BPM session (met: no task reached 50 ms);
   - the acknowledgement windows (150 ms early, 200 ms late) and the latency compensation assume
     that `AudioContext.outputLatency` is the whole delay between a scheduled time and the
     speaker ([the playhead](audio-transport.md#the-playhead)). _Inference:_ any processing that
     delays sound inside the graph (a look-ahead compressor, a buffered AudioWorklet, a reverb
     pre-delay on the dry path) is invisible to `outputLatency` and would shift what is heard
     against the playhead and the acknowledgement. The spike must measure it.
   - The reference phone is the owner's Android phone in Chrome
     ([v2 master spec](../specs/versions/v2/master-spec.md#12-open-questions-carried-forward)); the
     app supports Chromium only ([rule](rule_chromium_only_support.atom.md)). Chrome on iOS uses
     WebKit, so iOS Safari quirks matter for the future, not for v4 (_inference_ from the rule).
5. **No samples and no audio assets.** `verify:boundaries` rejects, in every authored source file
   under `src/`, the calls `decodeAudioData`, `createBufferSource`, `createMediaElementSource` and
   `new AudioBuffer(` ("the session's voices are synthesized from oscillators and gains only, so
   nothing decodes, buffers or streams recorded sound"), and rejects in the build output any
   `.wav .mp3 .ogg .oga .opus .flac .aac .m4a .weba .mid .midi .sf2 .sfz` file ("the backing is
   synthesized in the app, with no sample library and no extra download"). Both rules carry
   `@spec-link [[req_session_backing_track]]`. Separately, `fetch(`, `XMLHttpRequest` and
   `WebSocket` are banned everywhere (browser-only, nothing sent or downloaded). Two notes:
   - the scan reads **authored** source only, not `node_modules`. A library that builds a noise
     buffer or renders a reverb impulse response in code passes the scan. That buffer is
     generated, not recorded, so it keeps the rule's purpose, but not its literal wording
     ("oscillators and gains only"). See [Open questions](#open-questions).
   - our own baseline would trip the rule as soon as it plays white noise from a buffer
     (`createBufferSource`); noise made inside an AudioWorklet does not.
6. **The exports stay on the pure renderer.** MIDI and MusicXML are written from
   [`backing-renderer.ts`](../src/domain/backing/backing-renderer.ts) by the app's own encoders,
   with its own Standard MIDI File byte layer
   ([`smf-writer.ts`](../src/export/midi/smf-writer.ts); [export](export.md)). No audio library
   is involved in export.
7. **Licence.** The app is MIT (`package.json`) and lists every shipped third-party component in
   [`THIRD_PARTY_LICENSES.md`](../THIRD_PARTY_LICENSES.md). The endgame may be commercial, so a
   copyleft licence that reaches the whole app (GPL, AGPL) is a blocker unless the app is meant to
   stay open source; LGPL is workable with care.
8. **The seam is ready.** The voice list sits behind `audio-ports.ts`: today
   `BackingVoice = 'bass' | 'chord'`, and the Web Audio adapter
   ([`web-audio-session-bus.ts`](../src/audio/web-audio-session-bus.ts)) is the only code that
   knows how a voice sounds. Tests run on fakes of the clock, timer and output.

Background: the owner accepted the v2 backing as built and closed its listening test O57, noting
Tone.js "mainly to add more accompaniment voices" as an idea for later
([D185](../specs/archive/v2/decisions-D109-D207.md)).

## Candidates at a glance

Verdicts are for **this** app under **these** constraints. "Timing fit" asks whether our
scheduler can drive it with absolute `AudioContext` times on our one context, without its own
transport. Sizes are measured (min / gzip, kB).

| Candidate                      | Synthesis (drums, effects)                                                                                    | Timing fit, shared context                                                                      | Size min / gz                                          | Runtime                                      | Licence                                            | Health (2026-10-11)                         | Verdict                                        |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------- | -------------------------------------------------- | ------------------------------------------- | ---------------------------------------------- |
| **Tone.js** 15.1.22            | Subtractive, FM, AM, pluck; MembraneSynth, NoiseSynth, MetalSynth drums; 18 effects plus filters and dynamics | **Yes** (verified): explicit times, native context accepted; avoid its index import side effect | 296.5 / 75.4 (v4 set); 267.2 / 68.3 deep imports       | Native nodes from main-thread JS; 2 worklets | MIT                                                | Active; `latest` 2025-04, `next` 2026-10-04 | **Primary candidate for the spike**            |
| Plain Web Audio + own worklets | Anything we write; native filters, compressor, convolver                                                      | **Yes** (it is today's code)                                                                    | ~0                                                     | Native nodes; small worklets                 | Ours                                               | Ours                                        | **Fallback**, and the yardstick                |
| standardized-audio-context     | None (a Web Audio wrapper)                                                                                    | Not applicable                                                                                  | 128.4 / 36.5                                           | Main thread                                  | MIT                                                | `latest` 2024-08                            | Not a candidate; comes with Tone.js            |
| Elementary Audio               | DSP primitives, no instruments                                                                                | **Poor**: graph renders apply asap, not at a given time (_inference_)                           | 512.5 / 177.0                                          | WASM in worklet                              | MIT                                                | Low activity                                | Not recommended                                |
| Faust (faustwasm)              | Widest DSP library, physical models, drums, reverbs                                                           | Partly: our context, AudioParam times; note messages not time-stamped (_inference_)             | Compiler 5.7 MB; precompiled DSPs small (not measured) | WASM in worklet                              | LGPL lib; generated code takes its inputs' licence | Very active                                 | Later add-on for signature voices              |
| Csound (`@csound/browser`)     | Everything, own language                                                                                      | **Poor**: own score and clock                                                                   | 4 774 / 3 481                                          | WASM in worklet                              | Apache-2.0 / LGPL-2.1                              | Active, v7 beta                             | Not recommended                                |
| Strudel superdough             | Synths, one synth kick, effects; drums otherwise samples                                                      | **Yes** (verified)                                                                              | 43.6 / 16.1 + worklets                                 | Native nodes + worklets                      | **AGPL-3.0**                                       | Active                                      | Excluded on licence                            |
| Glicol                         | Own language, Rust/WASM                                                                                       | Poor: own clock                                                                                 | npm 2.3 MB unpacked                                    | WASM                                         | MIT                                                | Dormant (2025-01)                           | Not recommended                                |
| RNBO export                    | Whatever is patched in Max                                                                                    | Yes (own context, device events)                                                                | 227.1 / 65.4 + patches                                 | Worklet                                      | MIT engine; generated code revenue-capped or GPLv3 | Active                                      | Not recommended                                |
| WAM 2.0                        | Third-party plugins                                                                                           | Yes (native context only)                                                                       | Per plugin                                             | Worklets                                     | MIT API; plugins vary (GPL...)                     | API alpha since 2023                        | Not a base layer                               |
| WebAudioFont                   | Samples                                                                                                       | Yes                                                                                             | Samples: MBs                                           | Buffers                                      | **GPL-3.0**                                        | Repo active, npm 2022                       | Excluded (samples, licence)                    |
| smplr                          | Samples (piano, kits, soundfonts)                                                                             | Yes (verified)                                                                                  | 66.7 / 22.2 + remote samples                           | Buffers                                      | MIT                                                | Very active                                 | Excluded (samples, runtime fetch)              |
| soundfont-player               | Samples                                                                                                       | Yes                                                                                             | Samples                                                | Buffers                                      | MIT                                                | Last release 2020                           | Excluded; superseded by smplr                  |
| spessasynth_lib                | SoundFont 2 / DLS                                                                                             | Yes                                                                                             | `.sf2` files                                           | Worklet                                      | Apache-2.0                                         | Active                                      | Excluded (samples)                             |
| `@tonejs/midi`                 | None (MIDI files)                                                                                             | Not applicable                                                                                  | 32.6 / 9.5                                             | Main thread                                  | MIT                                                | Last release 2022                           | Not needed: own SMF writer                     |
| Pizzicato, Wad, howler.js      | Wrappers; howler plays files                                                                                  | Weak or not applicable                                                                          | Not measured                                           | Main thread                                  | MIT                                                | Stale or off-topic                          | Unsuitable                                     |
| SuperSonic (scsynth WASM)      | SuperCollider                                                                                                 | Unclear, own server model                                                                       | Not measured                                           | WASM in worklet                              | **AGPL-3.0**                                       | Alpha, created 2025-10                      | Watch; excluded on licence                     |
| Kabelsalat                     | Modular synth                                                                                                 | Not checked                                                                                     | Not measured                                           | Worklet                                      | **AGPL-3.0**                                       | Experimental                                | Excluded on licence                            |
| Cmajor                         | DSP language                                                                                                  | Like Faust                                                                                      | Not measured                                           | WASM in worklet                              | GPLv3 / commercial                                 | Active                                      | Not recommended                                |
| ZzFX                           | Procedural one-shot effects                                                                                   | Own context at load (verified)                                                                  | 1.9 / 1.2                                              | Main-thread render to buffer                 | MIT                                                | Active                                      | Idea source for event sounds, not a dependency |

## Per-candidate notes

Sizes are **measured** (see [Purpose](#purpose)) as minified / gzipped bytes of an ESM bundle that
imports only what we would use. Health figures are from npm and the GitHub API on 2026-10-11.

### Tone.js

- **What it is.** The most widely used Web Audio framework: instruments, effects, signals, a
  musical `Transport` and time notation, in TypeScript (C1, C2). MIT. 14.8k GitHub stars (C3).
- **Synthesis.** Subtractive (`Synth`, `MonoSynth` with filter envelope), FM and AM (`FMSynth`,
  `AMSynth`), `DuoSynth`, Karplus-Strong (`PluckSynth`), and drum voices: `MembraneSynth` (kick,
  toms), `NoiseSynth` (snare, hats), `MetalSynth` (cymbals). `PolySynth` wraps any monophonic
  instrument (default `maxPolyphony` 32). A `Sampler` exists and is simply not used here. Verified
  in the 15.1.22 sources (C4).
- **Effects.** Reverb (convolution, impulse response generated in code), Freeverb, JCReverb,
  FeedbackDelay, PingPongDelay, Chorus, Phaser, Tremolo, Vibrato, AutoFilter, AutoWah,
  BitCrusher, Distortion, Chebyshev, PitchShift, FrequencyShifter, StereoWidener; Filter, EQ3,
  Compressor, MultibandCompressor, Limiter, Gate (C4).
- **Fit with our timing: good, verified in source.**
  - `triggerAttackRelease(note, duration, time, velocity)` takes `time` as a plain number of
    seconds on the context clock; a number passes straight through `toSeconds` (C4). Only an
    **omitted** time falls back to `now()`, which adds Tone's `lookAhead` (0.1 s by default) (C4).
    So our scheduler keeps calling with its own `at` and `until`, and the `Transport` is never
    started.
  - **Sharing our context.** `setContext(nativeAudioContext)` wraps a native context, and every
    Tone node also accepts a `context` option (C4). Tone's own worklet nodes check for a native
    `BaseAudioContext` and then use the native `AudioWorkletNode` (C4). Tone's maintainer and users
    recommend exactly this native-context recipe for interop with native nodes (issue #1423, closed
    2026-03, C5). Its open Firefox bug with native contexts (#1457, 2026-07) does not affect a
    Chromium-only app (C5).
  - **Three traps, verified in source (C4).**
    1. `import ... from 'tone'` runs `getContext().transport` and five similar lines at module
       load, which **creates a second `AudioContext`** (through standardized-audio-context) before
       we can call `setContext`. Dynamic import after the player's click (constraint 3) and then
       `setContext(ours, true)` disposes it, but deep imports (`tone/build/esm/...`) avoid creating
       it at all: only `index.js` makes module-level `getContext()` calls, and `tone` has no `exports`
       map, so deep paths resolve. Any node built without a `context` option also calls
       `getContext()`, so our context must be set before the first node. The spike should use deep
       imports or check that the extra context never exists.
    2. Tone's `Context` starts its own `Ticker`: by default a **Web Worker made from a Blob URL**
       that ticks every ~0.05 s, plus a main-thread handler. It is not a timing source for us, but
       `PolySynth` voice garbage collection and one-shot source clean-up depend on it
       (`context.setInterval` / `setTimeout`), so `clockSource: 'offline'` (no ticker) would leak
       voices. Keep it, and measure its cost. The app sets no Content-Security-Policy today, so the
       Blob worker loads.
    3. Tone logs a banner to the console on load unless `window.TONE_SILENCE_LOGGING` is set.
- **Size: large, and tree-shaking helps little.** `tone` has no `sideEffects: false` and its index
  has the module-level calls above, so even three instruments cost 273.5 kB / 71.0 kB. The v4 set
  (PolySynth, Synth, FMSynth, MonoSynth, MembraneSynth, NoiseSynth, MetalSynth, Filter,
  FeedbackDelay, Reverb, Compressor, Chorus): **296.5 kB / 75.4 kB**; with deep imports
  267.2 kB / 68.3 kB; everything 373.5 kB / 90.9 kB. About 128 kB of it is its dependency
  standardized-audio-context. This is over the 100 kB budget for "other" chunks: the chunk needs its
  own budget, as VexFlow's has. It dynamic-imports cleanly and ships its own types.
- **Runtime.** Main-thread JavaScript that builds native Web Audio nodes; the audio itself runs on
  the audio thread. Only `FeedbackCombFilter` (used by Freeverb/JCReverb's combs) and `BitCrusher`
  are AudioWorklets (C4). Each Tone voice is several native nodes (oscillator, envelope built from
  signal nodes, gains), so a Tone voice costs more than our current two-node voice (_inference_
  from the source; the spike measures it). `Reverb` renders its impulse response in an
  `OfflineAudioContext` asynchronously (a `ready` promise) and plays through a `ConvolverNode`,
  which the v4 README already names as the heaviest part on phones.
- **Mobile.** Known reports: crackling with the screen off on mobile (#1300, closed 2025-02 as a
  platform limit), crackling of examples on an Android phone (#604, 2020), iOS offline render
  stopping after many renders (#871, open since 2021) (C5). None is specific to our use.
- **Determinism / testing.** `Tone.Offline` and `OfflineContext` render faster than real time into a
  buffer (C4). With a native `OfflineAudioContext` passed to our output, the same voice code can
  render a phrase for a golden-file test or a WAV export (_inference_; the boundary rule keeps
  `OfflineAudioContext` under `src/audio/`).
- **Health.** npm `latest` is 15.1.22, published 2025-04-27; the `next` dist-tag is at 15.5.57,
  published 2026-10-04, with 68 versions published in the last 12 months and 118 commits in the
  last year; 54 open issues (C2, C3). Essentially one maintainer (Yotam Mann, "tambien"), with
  outside contributors. _Inference:_ healthy but with a long gap between `latest` releases; pin the
  version.
- **Licence.** MIT, as is standardized-audio-context. No obstacle to commercial use.
- **Endgame.** The strongest ready-made palette and effect set of any candidate; presets map to
  plain option objects.

### Plain Web Audio plus our own AudioWorklet synths (the baseline)

- **What it is.** Extend what exists: more voice definitions in
  [`web-audio-session-bus.ts`](../src/audio/web-audio-session-bus.ts) built from native nodes
  (`OscillatorNode` with custom `PeriodicWave`s, `BiquadFilterNode`, `WaveShaperNode`,
  `DynamicsCompressorNode`, `ConvolverNode`, `DelayNode`, `StereoPannerNode`), and a small
  AudioWorklet for what native nodes cannot do (noise, a drum voice, a cheap reverb).
- **Synthesis.** Anything, at our own cost. Subtractive and FM come from native nodes (an
  oscillator modulating another oscillator's `frequency` is FM). Drums: kick = sine with a pitch and
  amplitude envelope (native); snare and hats need noise, either a generated buffer (trips the
  `createBufferSource` rule as worded) or a worklet that writes `Math.random()` (no buffer at all).
- **Fit with our timing.** Perfect by construction: it is today's code.
- **Size.** Zero dependencies; a few kB per voice. A worklet module is a separate file loaded with
  `audioWorklet.addModule`, so it needs a precache entry (Vite emits `.js`, which `globPatterns`
  already covers; _inference_ to check in the spike).
- **Runtime.** Native nodes run on the audio thread in compiled code: the cheapest per voice.
  An AudioWorklet runs JavaScript on the audio thread; it is cheap for noise or a few voices, but
  a heavy worklet can glitch on phones (see [Mobile and runtime notes](#mobile-and-runtime-notes)).
- **Determinism.** The best: our ports already make it testable with fakes, and an
  `OfflineAudioContext` renders the same graph.
- **Health and licence.** Ours. The cost is authoring time and sound-design skill: every timbre,
  every effect, every preset is our code to write, tune and test.
- **Endgame.** Fine for a small set of signature voices; a large palette means re-writing much of
  what Tone.js already offers.

### standardized-audio-context

- A spec-compliant wrapper and polyfill around the browser's Web Audio API (C6), not an instrument
  library. MIT; npm `latest` 25.3.77 from 2024-08-31, repo pushed 2026-09-01 (C6). Alone it costs
  128.4 kB / 36.5 kB.
- For a Chromium-only app it buys little; it matters here only because Tone.js depends on it and
  creates contexts with it. **Not a candidate on its own.** One caveat from Tone's issue tracker:
  nodes from a standardized-audio-context graph cannot connect to native nodes such as a WAM
  plugin's (C5), which is one more reason to give Tone our native context.

### Elementary Audio

- A declarative, functional audio engine: you describe the whole signal graph as a tree of `el.*`
  calls, re-render it on change, and the engine diffs it, in a WebAssembly core inside an
  AudioWorklet (C7). MIT since 2023-03-24 (C7).
- **Synthesis.** Oscillators, filters, envelopes, delays, convolution, sequencers, all as
  composable primitives: very expressive for custom DSP, but no ready instruments or drum kits.
- **Fit with our timing: poor.** A graph render takes effect as soon as it reaches the audio thread,
  not at a given `AudioContext` time (_inference_ from the rendering model; confirm before relying on
  it). Sample-accurate notes would mean moving our note schedule into graph-level sequencers fed
  ahead of time, i.e. a second timing model. It does accept our context
  (`core.initialize(ctx)`, C7).
- **Size.** 512.5 kB / 177.0 kB for core plus web renderer, the worklet and its wasm embedded as a
  `data:` URL.
- **Health.** npm `latest` @elemaudio/core 4.0.1 (2024-12-10) and web-renderer 4.0.3 (2024-12-21);
  `next` 4.0.8 (2025-10-22); last commit on `develop` 2026-01-19; community PRs from 2026-09
  unmerged (C7). Low activity.
- **Verdict.** A good engine for a different architecture; not for one that keeps its own
  scheduler. Not recommended.

### Faust (faustwasm)

- A functional DSP language from GRAME; `@grame/faustwasm` compiles Faust to WebAssembly and runs it
  as an AudioWorklet (C8). Very active: 0.19.0 on 2026-10-01, 39 versions in a year (C8).
- **Synthesis.** The broadest DSP library of any candidate: subtractive, FM, additive, **physical
  models** (strings, winds, percussion, modal bells), drum synthesis, filters, reverbs (Freeverb,
  Zita), compressors (C8).
- **Fit with our timing.** `createNode(context, ...)` takes our own context (C8). A Faust node is
  one AudioWorklet node with `AudioParam`s or parameter setters; notes are gates and frequencies, so
  our scheduler would set them at given times (`AudioParam.setValueAtTime` works; message-based
  setters land on the next render quantum, _inference_). Polyphonic DSPs have their own
  `keyOn`/`keyOff` API, which is message-based, not time-stamped (_inference_).
- **Size.** Compiling in the browser needs libfaust: 3.4 MB wasm plus 2.3 MB data (measured from the
  package). **Precompiled offline** (`faust2wasm -no-template`), each DSP ships as its own small
  `.wasm` plus metadata and the compiler is not needed (C8). `.wasm` is not in Workbox's
  `globPatterns` today (constraint 3).
- **Runtime.** WASM in an AudioWorklet: efficient, but one worklet per voice or per instrument adds
  per-node overhead on phones (_inference_).
- **Licence.** faustwasm is LGPL-2.1-or-later (its npm field says LGPL-3.0, a mismatch, C8). Code the
  compiler **generates** takes the licence of its input files; the unmodified Faust libraries and
  architecture files are stated to be compatible with proprietary use (Faust FAQ, C9).
- **Verdict.** The best upgrade path for a few **signature** sounds (a character's physical-model
  instrument), not the base layer: a build step outside npm, a new file type to precache, and more
  integration per voice.

### Csound WebAssembly (`@csound/browser`)

- The full Csound language in WebAssembly, AudioWorklet-only since v7, accepting an existing
  `audioContext` (C10). Decades of instruments and opcodes, including drum and physical-model
  synthesis and every classic effect.
- **Fit with our timing.** Csound has its own score and clock; driving it from our scheduler means
  sending real-time events, which Csound starts on its next control period, not at a given
  `AudioContext` time (_inference_).
- **Size.** 4.77 MB / 3.48 MB (wasm embedded). Far beyond any budget in the repo.
- **Health and licence.** `latest` is 7.0.0-beta38 (2026-10-07), daily commits (C10). The npm
  package is Apache-2.0, Csound itself LGPL-2.1, and the bundled core's licence is not stated (C10).
- **Verdict.** Too large and too foreign to our timing. Not recommended.

### Strudel's superdough

- The sound engine of the Strudel live-coding environment, usable alone (C11).
- **Synthesis.** Oscillators (sine, square, sawtooth, triangle, supersaw, pulse, wavetable,
  bytebeat, zzfx), noises, FM, filters with envelopes, delay, reverb, crush, distortion, phaser,
  vowel; drums are samples except one synthesized kick (`sbd`) (C11).
- **Fit with our timing: good.** `superdough(value, time, duration)` takes explicit `AudioContext`
  times and `setAudioContext(ctx)` takes ours (verified in its source, C11).
- **Size.** 43.6 kB / 16.1 kB, plus worklet modules loaded by URL.
- **Licence: blocking.** **AGPL-3.0-or-later** (C11). Shipping it makes the whole app AGPL. The app is
  MIT today and the endgame may be commercial.
- **Verdict.** Excluded on licence. Its design (one call per note with explicit times and a
  parameter object) is a good model for our own voice API.

### Glicol

- A graph-oriented live-coding language with a Rust audio engine compiled to WebAssembly (C12). MIT.
- **Health.** Last commit 2025-01-23, npm 0.4.0 from 2023-05-20 (C12). Dormant.
- **Fit.** Its own language and clock; same objection as Csound, smaller.
- **Verdict.** Not recommended.

### RNBO (Cycling '74) export

- Patches built in Max's RNBO are exported to a JavaScript device run by `@rnbo/js` (C13).
- **Synthesis.** Whatever is patched in Max: very expressive, but authored in Max, a paid desktop
  tool, outside our repo and review flow.
- **Fit with our timing.** `createDevice({ context, patcher })` takes our context; events are
  scheduled in the device's own time, with an AudioWorklet or ScriptProcessor (C13).
- **Size.** Runtime 227.1 kB / 65.4 kB, plus each exported patch.
- **Licence.** The engine is MIT; the **generated code** is under Cycling '74's export licence or
  GPLv3. The Cycling '74 licence is free for entities under 200 000 USD of annual revenue or
  funding; above that, contact Cycling '74. No fee for RNBO 1.x, but they reserve the right to change
  terms after 1.x (C14).
- **Verdict.** A revenue-capped licence and a closed authoring tool for the core of the product's
  sound. Not recommended.

### Web Audio Modules 2.0 (WAM)

- A plugin standard for the web (like VST for browsers): hosts load third-party instruments and
  effects as native `AudioWorkletNode` subclasses (C15).
- **Health.** The API never left alpha: `@webaudiomodules/api` 2.0.0-alpha.6 from 2023-03-06,
  `sdk` 0.0.12 from 2024-07-26; examples repo last committed 2024-10-17 (C15).
- **Fit.** Plugins share the host's native context; WAM nodes cannot join a standardized-audio-
  context graph (Tone issues #1423 and #1457, C5). Plugin quality and licences vary (Dexed GPL-3.0;
  webdx7 MIT with an Apache-2.0 engine) (C15).
- **Verdict.** Not a base layer. Worth remembering only if the endgame ever wants third-party
  instruments; giving Tone our native context keeps that door open.

### WebAudioFont, smplr, soundfont-player, spessasynth_lib (sample-based)

- **WebAudioFont**: GM instruments as sample data in JavaScript files; GPL-3.0; npm 3.0.4 from 2022,
  repo pushed 2026-09-04 (C18).
- **smplr**: modern TypeScript sample player (piano, soundfonts, drum machines, mellotron) by the
  author of soundfont-player; MIT; 1.1.0 on 2026-09-28, 16 versions in a year (C17). It takes our
  `AudioContext` and schedules with `time` and `duration` in seconds (C17), so it would fit our
  timing well. 66.7 kB / 22.2 kB of code, **but its default sounds are fetched at runtime from
  `smpldsnds.github.io` and `gleitz.github.io`** (verified in its bundle).
- **soundfont-player**: smplr's predecessor; last release 0.12.0 on 2020-01-27. Superseded.
- **spessasynth_lib**: SoundFont 2 / DLS synthesizer in an AudioWorklet; Apache-2.0; 4.3.14 on
  2026-08-18 (C16). Needs `.sf2` files, which the build-output rule forbids.
- **Verdict.** All conflict with constraint 5 (and smplr's defaults with the no-network rule). See
  [Samples vs synthesis](#samples-vs-synthesis).
- Related, sample-free: **webaudio-tinysynth** (g200kg) is a GM-style synth made only of oscillators,
  Apache-2.0, but last committed 2022-12-20 and npm 1.1.3 from 2021 (C16). Inactive; a reference for
  "128 cheap synthesized GM patches", not a dependency.

### `@tonejs/midi` (export side)

- Reads and writes MIDI files as JSON; MIT; 2.0.28 from 2022-02-04, repo last pushed 2023-07-19
  (C19). 32.6 kB / 9.5 kB.
- **Not needed.** The app already writes Standard MIDI Files with its own tested byte layer
  ([`smf-writer.ts`](../src/export/midi/smf-writer.ts)) from the pure backing renderer, and v4
  constraint 6 keeps it that way. Adding a voice to the export means another track from the
  renderer, not a library. The v4 whole-file seed (reading a MIDI file) might one day want a
  reader; that is a separate question, and `@tonejs/midi` is stale.

### Pizzicato, Wad, howler.js

- **Pizzicato**: a convenience wrapper for sounds and effects; last release 0.6.4 on 2018-10-28;
  78 open issues (C20). Unmaintained.
- **Wad** (`web-audio-daw`): "jQuery for your ears", synthesis plus samples and effects; 4.13.4 on
  2025-11-06 (C20). It schedules with its own helpers and owns its context by default; it offers
  nothing Tone.js does not, with a smaller community.
- **howler.js**: plays audio **files** (sprites, spatial audio, HTML5 Audio fallback); not a synth
  (C20). Out of scope under the no-sample rule.
- **Verdict.** Unsuitable.

### 2025-2026 newcomers and other finds

- **SuperSonic** (`supersonic-scsynth`, Sam Aaron, the Sonic Pi author): SuperCollider's `scsynth`
  compiled to WebAssembly in an AudioWorklet; repo created 2025-10-20, 0.88.0 on 2026-10-01; README
  says "still alpha"; **AGPL-3.0-or-later** (C22). The most notable newcomer: SuperCollider's whole
  synthesis vocabulary in the browser. Excluded on licence and maturity; worth watching.
- **Kabelsalat** (`@kabelsalat/web`, Felix Roos, Strudel's author): a live-coded modular synth
  compiled into one AudioWorkletProcessor; 0.4.1 on 2026-01-15; "experimental"; **AGPL-3.0-or-later**
  (C21). Excluded on licence.
- **Cmajor**: a DSP language that can generate a WebAudio/WASM patch; 1.0.3209 on 2026-09-24; dual
  GPLv3 / commercial licence, and the licence of its generated WebAudio output is not stated (only
  generated C++ is freed) (C23). Same role as Faust with a less clear licence. Not recommended.
- **ZzFX**: a 1 kB procedural sound-effect generator; MIT; 1.4.0 on 2026-10-01 (C24). It computes the
  sound in JavaScript on the main thread into an `AudioBuffer` and plays it with
  `createBufferSource`, and its module creates its **own** `AudioContext` at load (verified in its
  bundle). Not an instrument library. _Inference:_ its parameter-vector idea (a whole sound as about
  20 numbers) suits endgame event sounds (a hit, a status effect), re-implemented on our context.
- **genish.js / gibberish** (Charlie Roberts): per-sample code-generated synths in an AudioWorklet;
  MIT; last releases 2020 and 2022 (C26). Inactive.
- **Superpowered Web Audio SDK**: commercial WASM SDK; its farewell page says it is deprecated, issues
  no new licences and the company closes on 2027-07-31 (C25). Avoid.
- No Tone.js fork or successor was found; Tone.js itself is active (C3).

### Mobile and runtime notes

These apply to every candidate, since all of them end up as nodes on the same audio thread.

- **AudioWorklet** is supported since Chrome 66 and Safari 14.1 (C27). WASM inside a worklet works
  in practice (Faust, Elementary, SuperSonic all do it).
- **iOS Safari** (not a target, constraint 4): open WebKit bugs filed 2025-2026 include a context that
  stays silent after a PWA returns from the background, Bluetooth glitches at 48 kHz, and a tab's
  audio dying while the APIs still report success (C28). Any library inherits these.
- **Android Chrome**: no authoritative typical figure exists for `latencyHint: 'interactive'`; a 2021
  Chromium change notes callbacks about 40 ms apart on Pixel phones without AAudio's low-latency
  mode (status unverified) (C29). The spike must measure `baseLatency` and `outputLatency` on the
  owner's phone rather than assume.
- **New Chrome tools for the spike** (verified from release notes and compat data, C30):
  `renderSizeHint` shipped in Chrome 153 (stable 2026-09-08) and lets a context ask for a larger
  render quantum than 128 frames, a possible CPU relief on phones at some latency cost;
  `AudioContext.playbackStats` (Chrome 146 per MDN's compat data) reports latency and underrun
  counts, which gives the spike an objective glitch count.
- **Reverb** is the heaviest common effect: a `ConvolverNode` cost grows with the impulse length
  (_inference_ from how convolution works); Tone's Freeverb and JCReverb use many worklet comb
  filters and were measured heavier in 2019 (Tone #571, C5). A short, shared reverb send (one
  reverb for all voices, not one per voice) is the usual mitigation (_inference_).

## Samples vs synthesis

The repo forbids samples on purpose: the backing is "synthesized in the app, with no sample
library and no extra download" (constraint 5). That keeps the app offline, small, free of sample
licences and free of any network fetch.

**What samples would give.** Realistic acoustic timbres (piano, upright bass, brushed drums, strings)
at almost no CPU cost: a sample player is one `AudioBufferSourceNode` and a gain per note, cheaper
than most synth voices (_inference_ from how the Web Audio API works). Drums in particular are hard
to make convincing with synthesis beyond electronic kits. smplr shows the quality ceiling with very
little code.

**What they would cost here.**

- **Size and offline.** A useful General MIDI set is megabytes. smplr's defaults fetch from
  `smpldsnds.github.io` and `gleitz.github.io` at runtime (verified in its bundle, C17), which the
  browser-only rule forbids (`fetch(` is banned). Self-hosting them puts `.ogg`/`.mp3`/`.sf2` files in
  `dist/`, which the build-output rule forbids, and they would have to be precached for offline use.
- **Licences.** Each sample set carries its own licence (some CC BY-SA, some GPL-family SoundFonts);
  WebAudioFont's library is GPL-3.0 (C18). Every set would need tracking in
  `THIRD_PARTY_LICENSES.md`.
- **Loss of the endgame lever.** A sample is a fixed recording. The endgame wants each character,
  location and event to colour the sound ("a tone"); with synthesis that is a parameter change
  (filter, FM index, envelope, detune), with samples it is a new recording or only an effect chain on
  top. Synthesis also lets a status effect bend timbre continuously (_inference_).
- **Rule and atom work.** `req_session_backing_track` and its boundary rules would have to change.

**What would change if the rule were lifted.** Mainly the drum kit and any "acoustic" companion
voice. The scheduling and seam picture would not change: smplr, WebAudioFont and spessasynth all
accept an existing `AudioContext` and absolute start times.

**Owner's position (2026-10-11):** the only true ban is on samples (recorded sound). Everything
else is open: generated buffers, AudioWorklets, WASM DSP and effect chains are all acceptable in
principle. The sample-based candidates stay excluded; the boundary rule's "oscillators and gains
only" wording is narrower than this intent and is due for rewording in the v4 spec.

**Not recommended now.** Nothing in v4's roles (highlight, contrast, respond) needs acoustic realism,
and the endgame's need for per-character colour favours synthesis. A middle path keeps the rule's
purpose: **generated** buffers (noise, a reverb impulse response, a wavetable built in code) are not
recordings, ship no asset and download nothing. If the spike needs them, the rule's wording, not its
intent, is what would change (see [Open questions](#open-questions)). If realistic instruments are
ever wanted, the cleaner route is an opt-in, separately downloaded sound pack decided as its own
product question, not a v4 side effect.

## Endgame fit

What the endgame asks of the sound layer, read from [endgame](../specs/vision/endgame.md) and
D228 (presets for characters, locations and events carry "an instrument preference and a tone"):

| Need                                                 | What it means for the library                                                            | Tone.js                                                          | Plain Web Audio + own worklets                              | Faust (precompiled)                                                                                  |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Many distinct, characterful timbres                  | A wide palette per role: bass, pad, lead, plucks, bells, drums                           | Strong: 10+ instrument classes, every one parametric (C1)        | Grows with our own work; each voice is code we write        | Strongest for signature sounds (physical models, the Faust libraries), each one compiled and wrapped |
| "Tone" as a preset                                   | A preset is data: instrument class + parameters + an effect chain                        | Natural fit: instruments and effects take plain option objects   | Same, but we define the schema and every node               | Parameters are AudioParams of one node; the chain is ours                                            |
| Voices joining and leaving live                      | Create, connect, fade and dispose voices without clicks or glitches while the clock runs | Supported (`dispose()`, `connect`, `Param` ramps)                | Already how the session bus works (fade gains per session)  | Node creation is async (compile/instantiate), so warm them before use (_inference_)                  |
| Mix that follows the team                            | One bus per system voice under our mix gains; per-voice level, pan, send                 | Gains, panners and sends are ordinary nodes                      | Same                                                        | Same, around the nodes                                                                               |
| Status effects on sound ("tone deaf", "pitch scare") | Detune, filter sweeps, bit-crush, wobble on a running voice                              | Many ready effects (BitCrusher, Vibrato, PitchShift, AutoFilter) | Native nodes cover filters and detune; the rest is our code | Anything expressible as DSP                                                                          |
| Call-and-response exchanges                          | Precise starts at given audio times, any number of short phrases                         | Explicit-time triggers (verified)                                | Native                                                      | Through our own parameter or message scheduling                                                      |

_Inference:_ the endgame does not change the v4 pick. A library that exposes instruments and effects
as nodes on our own context, driven by our times, keeps every option open: the preset/tone schema
lives in our domain code (pure data, testable, exportable), and the library is a renderer behind the
`audio-ports.ts` seam. The decision that would be hard to undo is letting a library own timing or the
context, which every recommendation below avoids.

## Recommendation

### Primary pick: Tone.js, as an instrument and effect library only

Why, in order:

1. **It is the only candidate that covers the whole v4 need off the shelf without samples**:
   distinct synth voices, three drum synths, and a full effect set (C4).
2. **Its timing fits ours, verified in source**: explicit `AudioContext` times pass straight through,
   it accepts our native context, and its `Transport` simply never starts (C4, C5). That satisfies v4
   constraints 1 and 2 without patching it.
3. **MIT, active, by far the largest community** (C2, C3), with types and a clean dynamic import.
4. **The endgame's presets map onto it**: an instrument class plus option objects plus an effect
   chain is plain data our domain can own.

What it costs, all to be measured in the spike:

- a **~270-300 kB minified (~70-75 kB gzipped) chunk**, which needs its own named budget in
  `verify:boundaries` (the default for other chunks is 100 kB);
- a few integration rules: deep imports (or a check) so no second `AudioContext` appears, our native
  context passed in, its ticker Worker kept alive for voice clean-up, the console banner silenced;
- more native nodes per voice than today, so more audio-thread CPU on the phone;
- generated buffers inside the library (noise, reverb impulse) that the rule's purpose allows but its
  wording does not mention.

### Fallback: extend plain Web Audio, with a small AudioWorklet

If Tone.js fails the spike (phone glitches the baseline does not have, an unacceptable chunk, or any
need to give it timing), extend today's adapter: new voice definitions from native nodes, a noise and
drum AudioWorklet (no buffers, so the boundary rule holds as worded), one shared convolution or
feedback-delay-network reverb. Zero dependencies and full control, paid for in authoring time. Faust,
precompiled to small WASM worklets, is the upgrade path for a few signature voices later, under
either pick.

### Spike plan

**Prototype** (on a spike branch, nothing merged to `main`):

1. Widen the seam: `BackingVoice` becomes a role list for the spike, for example `bass`, `pad`,
   `counter-line`, `kick`, `snare`, `hat`, still fed by `ScheduledBackingNote`s with absolute times.
2. Build **two adapters behind the same `SessionBus`**:
   - **A, Tone.js**: deep imports, dynamic-imported on the Start click, a Tone `Context` wrapping our
     `AudioContext`; `MonoSynth` bass, `PolySynth(FMSynth)` pad, `Synth` counter-line,
     `MembraneSynth` kick, `NoiseSynth` snare, `MetalSynth` hat; one shared `Reverb` send, one
     `FeedbackDelay` send, a `Compressor` on the backing bus; output into the session's backing
     fade gain.
   - **B, plain Web Audio**: the same six roles from native nodes plus one noise/drum AudioWorklet and
     one shared reverb.
3. Drive both from a fixed test pattern: four phrases with all six roles, 16th-note hats as the worst
   case, at 120 and 240 BPM, plus voices joining and leaving at phrase boundaries.

**Measure** (reference machine and the owner's Android phone in Chrome):

| What                 | How                                                                               | Pass                                                                                         |
| -------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Chunk size           | Real `vite build`, then `verify:boundaries` with a provisional budget             | A: at most 300 kB minified and 80 kB gzipped; entry chunk unchanged                          |
| Offline availability | Precache manifest in `dist/sw.js`                                                 | Every emitted file precached; no `.wasm` or other new file type unhandled                    |
| One context          | Spy on the `AudioContext` constructor in a Playwright run                         | Exactly one context, created on the click                                                    |
| Onset accuracy       | Render the pattern in an `OfflineAudioContext`; detect onsets                     | Every onset within one render quantum (128 frames) of its scheduled time                     |
| In-graph delay       | Compare a voice through the full chain with the dry voice, offline                | Added delay at most 5 ms, or constant and compensated                                        |
| Main thread          | Long tasks over a 5-minute session at 240 BPM (as item 15)                        | No task over 50 ms attributable to audio; item 15 holds (under 200 ms)                       |
| Audio thread         | `playbackStats` underruns if available, DevTools WebAudio render capacity, by ear | Zero underruns or audible glitches over 5 minutes on the phone, all roles and reverb on      |
| Playhead             | Re-run the item 6 measurement                                                     | Within 20 ms of the audio output                                                             |
| Start-up             | Click to first count-in click, cold, on the phone                                 | Count-in not delayed; import and reverb impulse ready before phrase 1                        |
| Stop and lifecycle   | Stop mid-phrase; 30-minute run; node and memory counts                            | Fade silences every role (decide what happens to reverb tails); no growth in nodes or memory |
| Sound                | Owner listens to A and B                                                          | Roles clearly distinct; owner prefers or accepts the result                                  |

**Decision rule.** If A passes everything, Tone.js is adopted with its budget and integration rules
written down. If A fails only on the phone audio thread and B passes, take B. If both pass, choose on
the owner's listening and on authoring cost. If both fail on the phone, reduce the voice count or the
reverb before changing library.

**Out of the spike:** exports (constraint 6 keeps them on the pure renderer), the preset schema, UI.

## Open questions

1. **The no-sample rule's wording.** _Answered by the owner, 2026-10-11: the only true ban is on
   samples; generated buffers (white noise, a reverb impulse response, a wavetable computed in code)
   are allowed._ What remains is rewording: the rule's text says the voices are "oscillators and
   gains only" and bans `createBufferSource` in authored code, so the v4 spec must reword
   `req_session_backing_track` and the `verify:boundaries` check to ban recorded audio and audio
   assets rather than buffers. (spec-writer, documentalist)
2. **An audio chunk budget.** Is a ~300 kB minified lazy chunk acceptable, with its own named budget
   like VexFlow's?
3. **Drums in v4.** The owner said "likely". Drums decide whether a noise source is needed at all.
4. **Reverb tails on stop.** The session fade silences everything scheduled; should a shared reverb's
   tail be cut with it or ring out?
5. **Licence posture.** Can the app ever become closed-source or commercial? If yes, GPL and AGPL
   candidates (superdough, Kabelsalat, SuperSonic, WebAudioFont) stay excluded for good.
6. **Which Tone.js version.** `latest` (15.1.22, 2025-04-27) or a pinned `next` build carrying the
   2026 fixes.
7. **Export of new voices.** How each role appears in the MIDI export (track, channel, program; drums
   on channel 10) and whether MusicXML shows them. Outside the library question, but v4 needs it.
8. **iOS.** Out of scope while the app is Chromium-only; the WebKit bugs above would apply to any
   library if that changes.

## Sources

Ids local to this survey (`C1`–`C30`). These software and technical sources are deliberately not
in the music [research sources](music/research-sources.md) register. All accessed 2026-10-11.

- **C1 - Tone.js documentation.** Tone.js: https://tonejs.github.io/
  Useful for: class list, instrument and effect options.
- **C2 - tone on npm.** npm: https://www.npmjs.com/package/tone
  Useful for: `latest` 15.1.22 (2025-04-27), `next` 15.5.57 (2026-10-04), release cadence.
- **C3 - Tonejs/Tone.js repository.** GitHub: https://github.com/Tonejs/Tone.js
  Useful for: stars, open issues, commit activity (118 commits in the last year), maintainers.
- **C4 - Tone.js 15.1.22 source (`build/esm`).** npm package / GitHub:
  https://github.com/Tonejs/Tone.js/tree/main/Tone
  Useful for: `setContext`, `Context` options and ticker, index import side effects, explicit-time
  triggers, `Reverb` and `Noise` internals, worklet nodes, `Offline`.
- **C5 - Tone.js issues #1423, #1457, #1300, #604, #871, #571.** GitHub:
  https://github.com/Tonejs/Tone.js/issues
  Useful for: native-context interop, Firefox bug, mobile crackling, reverb cost.
- **C6 - standardized-audio-context.** GitHub:
  https://github.com/chrisguttandin/standardized-audio-context
  Useful for: what it is, release dates.
- **C7 - Elementary Audio.** GitHub: https://github.com/elemaudio/elementary
  Useful for: MIT licence date, activity, rendering model.
- **C8 - faustwasm.** GitHub: https://github.com/grame-cncm/faustwasm
  Useful for: `createNode(context)`, precompiled `-no-template` output, licence, releases.
- **C9 - Faust FAQ.** GRAME: https://faustdoc.grame.fr/manual/faq/
  Useful for: licence of generated code, libraries and architecture files.
- **C10 - Csound for the browser.** npm and GitHub: https://www.npmjs.com/package/@csound/browser,
  https://github.com/csound/csound
  Useful for: v7 beta, AudioWorklet only, licences.
- **C11 - Strudel superdough.** Codeberg: https://codeberg.org/uzu/strudel
  Useful for: AGPL licence, `superdough(value, time, duration)`, `setAudioContext`, sound list.
- **C12 - Glicol.** GitHub: https://github.com/chaosprint/glicol
  Useful for: last activity.
- **C13 - @rnbo/js.** npm: https://www.npmjs.com/package/@rnbo/js
  Useful for: `createDevice({ context, patcher })`, engine licence.
- **C14 - RNBO export licence and FAQ.** Cycling '74:
  https://support.cycling74.com/hc/en-us/articles/10730031661587,
  https://support.cycling74.com/hc/en-us/articles/10730637742483
  Useful for: revenue cap, GPLv3 alternative, terms after 1.x.
- **C15 - Web Audio Modules.** GitHub: https://github.com/webaudiomodules/api,
  https://github.com/webaudiomodules/wam-examples
  Useful for: alpha status, plugin licences, native-node requirement.
- **C16 - spessasynth_lib and webaudio-tinysynth.** GitHub:
  https://github.com/spessasus/spessasynth_lib, https://github.com/g200kg/webaudio-tinysynth
  Useful for: licences and activity.
- **C17 - smplr.** GitHub: https://github.com/danigb/smplr
  Useful for: explicit-time scheduling, default remote sample URLs, activity.
- **C18 - WebAudioFont.** GitHub: https://github.com/surikov/webaudiofont
  Useful for: GPL-3.0 licence, sample-based model.
- **C19 - @tonejs/midi.** GitHub: https://github.com/Tonejs/Midi
  Useful for: last release, scope.
- **C20 - Pizzicato, Wad, howler.js.** GitHub: https://github.com/alemangui/pizzicato,
  https://github.com/rserota/wad, https://github.com/goldfire/howler.js
  Useful for: purpose and last releases.
- **C21 - Kabelsalat.** Codeberg: https://codeberg.org/froos/kabelsalat
  Useful for: AGPL licence, worklet runtime, maturity.
- **C22 - SuperSonic.** GitHub: https://github.com/samaaron/supersonic
  Useful for: scsynth in WASM, AGPL licence, alpha status.
- **C23 - Cmajor.** GitHub: https://github.com/cmajor-lang/cmajor
  Useful for: licence and WebAudio export.
- **C24 - ZzFX.** GitHub: https://github.com/KilledByAPixel/ZzFX
  Useful for: procedural one-shot sounds, licence.
- **C25 - Superpowered farewell.** Superpowered: https://superpowered.com/superpowered-farewell
  Useful for: deprecation and closing date.
- **C26 - gibberish / genish.js.** GitHub: https://github.com/charlieroberts/gibberish
  Useful for: activity.
- **C27 - AudioWorklet compatibility data.** MDN browser-compat-data:
  https://github.com/mdn/browser-compat-data/blob/main/api/AudioWorklet.json
  Useful for: Chrome 66, Safari 14.1.
- **C28 - WebKit audio bugs 291892, 308412, 323104, 325501, 326286.** WebKit Bugzilla:
  https://bugs.webkit.org/show_bug.cgi?id=291892
  Useful for: iOS audio quirks in 2025-2026.
- **C29 - Chromium Android latency change and AudioWorklet skips.** Chromium:
  https://chromium-review.googlesource.com/c/chromium/src/+/2649225,
  https://issues.chromium.org/issues/40133762
  Useful for: Android callback interval without AAudio low-latency mode (status unverified).
- **C30 - Chrome 153 release notes (`renderSizeHint`) and `playbackStats` compat data.** Chrome for
  Developers / MDN: https://developer.chrome.com/release-notes/153,
  https://chromestatus.com/feature/5078190552907776
  Useful for: render-quantum size control, glitch counters for the spike.
