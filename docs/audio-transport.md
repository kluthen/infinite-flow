# Audio Transport

This document records how `src/audio/` keeps time and makes sound: the one audio context and how
it is unlocked, the ports that keep it testable, the look-ahead scheduler and its Worker timer,
the click and the count-in, the mix, the fade on stop, what happens when the browser interrupts
the audio, the latency reading for the playhead, how it is tested, and what later chunks add.

## What it is

The audio transport is the audio clock and everything scheduled on it except the backing, which
chunk 11 adds. The **audio clock** is the one master clock of a session: the click, the backing,
the playhead and the session engine's events all read their time from it, as plain seconds.

- **One audio context.** The app has exactly one `AudioContext`, and only `src/audio/` may create
  it. Both boundary checks enforce this: `eslint.config.js` and `scripts/verify-boundaries.mjs`
  (see [Runtime Constraints](../README.md#runtime-constraints)).
- **Created by `unlock()`.** Browsers let audio start only from a player's click, and a MIDI note
  does not count. `unlock()` must therefore run synchronously inside the player's Start or
  "Connect controller" click handler (chunk 15 wires those). Nothing creates the context before.
- **Never suspended or closed.** Once unlocked, the context runs until the page closes. An unlock
  from "Connect controller" therefore still holds when a MIDI note later starts a session.

| File                         | Holds                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| `audio-ports.ts`             | The contract: the clock, output, session bus and wake timer ports, the click type. |
| `audio-mix.ts`               | The four mix controls, their design tokens, range checks and gain values.          |
| `click-track.ts`             | The click and count-in as pure arithmetic on audio time.                           |
| `look-ahead-scheduler.ts`    | The scheduler that plans sound a fixed window ahead of the clock.                  |
| `audio-transport.ts`         | `createAudioTransport(deps)`: unlock, start, stop, the mix and interruptions.      |
| `web-audio-output.ts`        | The output on Web Audio: the one context, the mix graph, `openWebAudioOutput()`.   |
| `web-audio-session-bus.ts`   | One session's fade gains and the synthesized click voice.                          |
| `wake-timer-protocol.ts`     | The wake-up Worker's messages and its pure handler.                                |
| `wake-timer.worker.ts`       | The wake-up Worker's entry point.                                                  |
| `worker-wake-timer.ts`       | The main-thread wake timer backed by that Worker.                                  |
| `browser-audio-transport.ts` | `createBrowserAudioTransport()`: the transport wired to the browser.               |

`createBrowserAudioTransport()` composes `openWebAudioOutput`, the Worker wake timer and
`readAudioMixDesign(getComputedStyle(document.documentElement))`. The workspace session exposes it
as `WorkspaceSession.audio`.

## The ports

The transport talks to the browser only through four ports, declared in `audio-ports.ts`:

- **Clock** (`AudioClock`): `now()` and `outputLatency()`.
- **Output** (`AudioOutput`): the clock, plus `setGain`, `openSessionBus` and `onInterrupted`. It
  has no suspend or pause operation on purpose.
- **Session bus** (`SessionBus`): `scheduleClick` and `fadeOut` for one session's sound.
- **Wake timer** (`WakeTimer`): `start(onWake)` and `stop()`.

Why ports: a fake of each makes every test deterministic. A test advances the fake clock by hand,
fires the fake timer when it chooses, and reads what the fake output recorded, with no real time
and no sound. The Web Audio adapters take a minimal structural slice of the Web Audio types, so
the real context fits them without a cast and a recording fake fits them too.

## The look-ahead scheduler

- **200 ms ahead.** On every wake-up the scheduler hands its source the next slice of audio time,
  up to `LOOK_AHEAD_SECONDS` (0.2 s) past the clock's `now`. Sound is therefore always planned
  before it is due.
- **Half-open slices.** Each slice is `[from, to)` and starts where the last one ended, so no beat
  is planned twice and none is skipped.
- **A 25 ms Worker timer.** The wake-up timer fires every `WAKE_INTERVAL_SECONDS` (25 ms) from a
  Web Worker. A wake-up late by several intervals still plans each click before it is due.

Why a Worker timer is enough: chunk 1 measured the main thread while it engraves on the reference
machine (see [the verdicts of the v2 re-run](generation-latency.md#verdicts-reference-machine)).
The worst main-thread block was 90 ms (103.5 ms by the heartbeat), against the 200 ms window. A
Worker's timer is not throttled like a main-thread timer, but its wake-up still runs on the main
thread, so a long task delays it. That is enough as long as every main-thread task stays shorter
than the window: v2.0 item 15, which the release gate checks.

The window size is still "proposed" in the master spec's
[open questions](../specs/versions/v2/master-spec.md#12-open-questions-carried-forward).

## The click and count-in

- **Quarter notes, beat 1 accented.** The click sounds on every
  [quarter note](music/lexicon.md#quarter-note), and beat 1 of each
  [measure](music/lexicon.md#measure) (the [downbeat](music/lexicon.md#downbeat)) is accented.
- **Times are multiplied, never added up.** A [beat](music/lexicon.md#beat) lasts `60 / tempo`
  seconds. Beat `k` falls at `startAt + k × 60 / tempo`, one multiplication from the start, so a
  long session never drifts.
- **Just ahead of `start`.** The first click falls `START_DELAY_SECONDS` (0.1 s) after `start`, so
  it too is planned ahead.
- **A one-measure count-in.** The count-in is `COUNT_IN_MEASURES` (1, from
  `src/session/session-timing.ts`) measures of click before phrase 1: four beats in 4/4.
- **The count-in's own route.** Count-in clicks go by a route that bypasses the click on/off gain
  but goes through the click volume gain. The count-in therefore sounds with the click off,
  including when the click is turned off during it, and always at the current click volume.
- **`countInEndsAt`.** `start` returns `{ startAt, countInEndsAt }`. `countInEndsAt` is when phrase
  1 starts sounding: the moment of the session engine's `count-in-over`.
- **The accented count-in beat 1 is an inference.** The rules say the count-in clicks and that the
  click accents beat 1; they do not say whether the count-in's first beat is accented. It is,
  because the count-in is one measure of that same click.
- **Synthesized, no audio assets.** Each click is a short sine blip: 1500 Hz and louder on beat 1,
  1000 Hz otherwise, with a 2 ms rise and a 50 ms decay. Its timbre is a placeholder.

## The mix

The mix graph is built once, at unlock:

```
click route:    click-enable -> click-volume -> destination
count-in route:                 click-volume -> destination
backing route:  backing-enable -> backing-volume -> destination
```

The backing gains exist already; the backing voices that feed them arrive in chunk 11.

- **On/off** is an enable gain of 1 or 0. **Volume** is a linear gain equal to the slider level: a
  placeholder mapping until listening tests settle a loudness curve.
- **Muting is a gain at zero,** never a suspended clock (v2.0 item 5). Muting and unmuting leave
  the audio clock's time untouched.
- **Every change applies at once.** A mix change sets its one gain at the current audio time,
  whether a session runs or not. Changes made before unlock are kept and applied at unlock.
- **Ranges and defaults are design tokens.** They come from ux-writer's `--mix-*` tokens in
  `src/styles/theme.css`, read at unlock at the latest. A missing or non-numeric token throws
  rather than guessing. The values are placeholders until the listening tests of ux Q31; the
  release gate needs the real ones.
- **The click is never silent.** The lowest click volume (`--mix-click-volume-min`, currently 0.2)
  must be above zero, which is checked when the tokens are read (v2.0 item 18). A click volume
  outside the range throws.

## Stop

Every session opens a fresh **session bus**: one fade gain per click route. On stop the bus fades
to silence over `STOP_FADE_SECONDS` (0.1 s, the rule's "about 100 ms") and the scheduler halts.
Sound already planned past the fade goes through the faded bus and stays silent, and the next
session gets a fresh bus that the fade never touched. `stop` returns `fadeEndsAt`, when the fade
reaches silence.

A hidden tab ends the session exactly like Stop. Detecting it is chunk 15's job.

## Interruption

The app never stops the audio clock itself, but the browser can: a device change or an operating
system interruption takes the context out of its running state. The output reports it through
`onInterrupted`; the transport then halts the running session and tells its own listeners. Chunk
15 ends the session at once.

**Known limit:** resuming the audio after such an interruption is not built. Nothing asks the
browser to run the context again, so a later session may stay silent.

## The playhead

`outputLatency()` gives the seconds between a sound's scheduled time and the moment it leaves the
speakers. It is exposed so chunk 16 can place the playhead on what is heard, not on what is
scheduled: v2.0 item 6 asks for it to stay within 20 ms of the actual audio output.

## How it's tested

Unit tests drive the transport through its ports: a fake audio clock advanced by hand, a fake
wake timer and a fake output that records every gain, click and fade with its time. The Web Audio
adapters are tested against a recording fake context. The workspace harness injects the fake
clock and output through its `audio` seams, and a real-Chromium test plays a count-in on the real
`AudioContext`. See [`docs/testing.md`](testing.md) for how to drive them.

## What later chunks add

- **Chunk 11:** the backing voices on the backing route, and their scheduler source.
- **Chunk 15:** the Start and "Connect controller" calls to `unlock()`, the session runner's `now`
  reading `WorkspaceSession.audio.now`, the count-in display, the mix controls, and hidden-tab
  detection.
- **Chunk 16:** the playhead, placed using `outputLatency`.

## Choices made while building it

- **Clicks are scheduled whatever the click switch says.** The click-enable gain mutes them. A
  click turned on mid-session is then heard from the next beat, with nothing to re-plan.
- **The mix design is read on first use** (at unlock, or the first mix reading or change before
  it), not when the transport is built, so the stylesheet has loaded by then.
- **`unlock()` is idempotent.** A second click that unlocks does nothing, so Start after "Connect
  controller" keeps the same context.
- **One scheduler for the transport's lifetime,** created at the first `start` and reused. Its
  wake-up timer, and so its Worker, is created once.
