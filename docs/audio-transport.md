# Audio Transport

This document records how `src/audio/` keeps time and makes sound: the one audio context and how
it is unlocked, the ports that keep it testable, the look-ahead scheduler and its Worker timer,
the click and the count-in, the backing, the mix, the fade on stop, what happens when the browser
interrupts the audio, the latency reading for the playhead, the clock anchor MIDI input maps its
timestamps through, how it is tested, and what later chunks add.

## What it is

The audio transport is the audio clock and everything scheduled on it: the click, the count-in
and the backing. The **audio clock** is the one master clock of a session: the click, the backing,
the playhead and the session engine's events all read their time from it, as plain seconds.

- **One audio context.** The app has exactly one `AudioContext`, and only `src/audio/` may create
  it. Both boundary checks enforce this: `eslint.config.js` and `scripts/verify-boundaries.mjs`
  (see [Runtime Constraints](../README.md#runtime-constraints)).
- **Created by `unlock()`.** Browsers let audio start only from a player's click, and a MIDI note
  does not count. `unlock()` must therefore run synchronously inside the player's Start or
  "Connect controller" click handler: the session controller's `start()` calls it in the
  `Start session` click, and the header's `controller-status` click calls it before asking for
  MIDI access (see [The click](controller-connection.md#the-click)). Nothing creates the context
  before.
- **Never suspended or closed.** Once unlocked, the context runs until the page closes. An unlock
  from "Connect controller" therefore still holds when a MIDI note later starts a session.

| File                         | Holds                                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- |
| `audio-ports.ts`             | The contract: the clock, output, session bus and wake timer ports, the click and backing note types. |
| `audio-mix.ts`               | The four mix controls, their design tokens, the sliders' step, range checks and gain values.         |
| `click-track.ts`             | The click and count-in as pure arithmetic on audio time, and `beatAt`, the beat grid.                |
| `backing-track.ts`           | A phrase's rendered backing placed on the beat grid, as pure arithmetic on audio time.               |
| `look-ahead-scheduler.ts`    | The scheduler that plans sound a fixed window ahead of the clock.                                    |
| `audio-transport.ts`         | `createAudioTransport(deps)`: unlock, start, the backing queue, stop, the mix and interruptions.     |
| `web-audio-output.ts`        | The output on Web Audio: the one context, the mix graph, `openWebAudioOutput()`.                     |
| `web-audio-session-bus.ts`   | One session's fade gains and the synthesized click and backing voices.                               |
| `wake-timer-protocol.ts`     | The wake-up Worker's messages and its pure handler.                                                  |
| `wake-timer.worker.ts`       | The wake-up Worker's entry point.                                                                    |
| `worker-wake-timer.ts`       | The main-thread wake timer backed by that Worker.                                                    |
| `browser-audio-transport.ts` | `createBrowserAudioTransport()`: the transport wired to the browser.                                 |

`createBrowserAudioTransport()` composes `openWebAudioOutput`, the Worker wake timer and
`readAudioMixDesign(getComputedStyle(document.documentElement))`. The workspace session exposes it
as `WorkspaceSession.audio`.

The backing's notes are decided outside `src/audio/`, by the pure renderer
`src/domain/backing/backing-renderer.ts` (see [The backing](#the-backing)). It lives in the domain
so the MIDI export can reuse it.

## The ports

The transport talks to the browser only through four ports, declared in `audio-ports.ts`:

- **Clock** (`AudioClock`): `now()`, `outputLatency()` and `anchor()` (see
  [The clock anchor](#the-clock-anchor)).
- **Output** (`AudioOutput`): the clock, plus `setGain`, `openSessionBus` and `onInterrupted`. It
  has no suspend or pause operation on purpose.
- **Session bus** (`SessionBus`): `scheduleClick`, `scheduleBackingNote` and `fadeOut` for one
  session's sound.
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
than the window: the master spec's former v2.0 item 15, which the v2.0 release gate (build-plan chunk 21, which
holds the real-hardware checks since spec D183) checks on the reference machine.

The window size is still "proposed" in the master spec's
[open questions](../specs/versions/v2/master-spec.md#12-open-questions-carried-forward).

## The click and count-in

- **Quarter notes, beat 1 accented.** The click sounds on every
  [quarter note](music/lexicon.md#quarter-note), and beat 1 of each
  [measure](music/lexicon.md#measure) (the [downbeat](music/lexicon.md#downbeat)) is accented.
- **Times are multiplied, never added up.** A [beat](music/lexicon.md#beat) lasts `60 / tempo`
  seconds. Beat `k` falls at `startAt + k × 60 / tempo`, one multiplication from the start, so a
  long session never drifts.
- **A tempo map.** The session's click plan is a tempo map: the starting tempo from beat 0, then
  one tempo change on the first beat of each phrase queued at another tempo. Beat `k` is placed by
  one multiplication from the start of the tempo segment it falls in, so the clicks and the backing
  switch tempo exactly on that phrase's first beat, with no gap or doubled beat, and a session
  rising for hours still does not drift. The count-in always runs at the starting tempo.
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

## The backing

The backing is a bass line and block chords (the chord's notes played together) that follow the
phrase's own [harmony](music/lexicon.md#harmony), in pitch and on the beat. It is built in three
layers: a pure renderer decides the notes, a pure timing step puts them on the audio clock, and
synthesized voices play them.

### The renderer

`renderBacking(harmony, meter)` in `src/domain/backing/backing-renderer.ts` turns one phrase's
harmony events into `{ bass, chords }`: two lists of `BackingNote`, each ordered by start. A
`BackingNote` holds a `pitch` (a concert [MIDI note number](music/lexicon.md#midi-note-number),
that is, the note as it sounds, see [concert pitch](music/lexicon.md#concert-pitch)) and a `start`
and a `duration`, exact values in whole notes from the phrase's start. It has the same shape as the
MIDI export's `MidiBackingNote`, so the export can take the renderer's notes as they are. The
renderer is pure: it reads no clock, draws no random number and never touches audio, and its
result is frozen.

- **Where it attacks.** An attack is the moment a note starts. Each harmony event is cut at every
  [bar line](music/lexicon.md#bar-line) it crosses, into segments, and each segment is one attack.
  The backing therefore attacks at every chord change and on every
  [downbeat](music/lexicon.md#downbeat) (beat 1 of a measure), and nowhere else. A chord held over
  two measures is attacked again on the second measure's beat 1.
- **The bass.** The bass plays the chord's [root](music/lexicon.md#root), the note the chord is
  built on, as MIDI 36 plus the root's pitch class (the note name without its octave, 0 for C up
  to 11 for B): C2 to B2. A segment that fills a whole measure (four beats) plays the root on
  beats 1 and 2 and the fifth on beats 3 and 4. The fifth is the
  [chord tone](music/lexicon.md#chord-tone) (a note of the chord) five letter names above the
  root: G over C. Any shorter segment, such as
  each half of a two-chord measure, plays the root throughout. The fifth stays in the same octave
  band, MIDI 36 to 47, so it can sit below the root: under a G chord the bass plays G2 then D2.
- **The chords.** Each segment holds one close-position [triad](music/lexicon.md#triad): the
  three chord notes stacked as tightly as possible. A triad has three such stacks, with the root,
  the third or the fifth at the bottom (its inversions). The renderer takes the one whose top note
  is the highest at or below E4 (MIDI 64). So the inversion changes with the chord, and every
  chord note stays between F3 (MIDI 53) and E4, its top note between B3 and E4. C major is played
  G3, C4, E4; G major is played G3, B3, D4.
- **The register.** `BACKING_REGISTER` holds the proposed default
  [register](music/lexicon.md#register) (how high or low the notes sit) of the master spec's open
  question O57: the bass from MIDI 36 to 47, the chords' top note at most MIDI 64. It is a
  placeholder until the listening test.
- **What it refuses.** It throws a `BackingRenderError`, and repairs nothing, on a meter other than
  4/4, on harmony events that don't tile the phrase's 16 beats exactly (a gap, an overlap, events
  out of order, a length that isn't a positive whole number of beats), and on a triad whose three
  pitch classes aren't the root, third and fifth of its stated quality.

### Timing on the click's grid

`backing-track.ts` places a phrase's rendered notes on the session's beat grid. It is pure
arithmetic on audio time and reads no clock.

- **The click's own grid.** A backing note's start and end are computed by the click track's own
  `beatAt`, the same multiplication from the session's start. A backing note on beat `k`
  therefore falls at exactly the time of the click on beat `k`, not merely close to it.
- **Phrases back to back.** Phrase 1 starts when the count-in ends, and each next phrase four
  measures (16 beats) later: `phraseStartsAt` gives that time. A note that doesn't start and end
  on a whole beat throws rather than falling between two clicks; the renderer never makes one.
- **One window at a time.** `backingNotesBetween(queue, from, to)` hands the scheduler the queued
  notes with `from <= at < to`. The window is half-open like the click's, so no note is planned
  twice and none is skipped. Each wake-up plans the window's clicks and backing notes together, on
  the session's bus.

### The transport API

- **`queueBacking(phraseNumber, harmony, tempo)`** renders a phrase's backing from its harmony
  events, queues it, and puts the phrase at `tempo` on the tempo map: from its first beat on, the
  clicks and the backing run at that tempo until a later phrase changes it. Phrases must come in
  order, 1, 2, 3 …, and each before planning has reached its start; phrase 1 must be at the
  starting tempo. It throws, leaving the queue and the map as they were, when no session is
  running, when the phrase is not the next one due, when phrase 1 is at another tempo, and when
  planning has already passed the phrase's start (queued too late).
- **A phrase never queued stays silent.** The transport can't tell a phrase is missing until the
  next `queueBacking` call, which then throws: out of order, or too late.
- **`phraseStartsAt(phraseNumber)`** gives when the running session's phrase starts sounding: the
  count-in's end plus the phrases before it, each at its own tempo, so it is known up to the phrase
  after the last queued. It throws when no session is running, and for a later phrase.
- **Only after the count-in, until stop.** Phrase 1 starts when the count-in ends, so the count-in
  has no backing. The backing does not listen to the player: it keeps playing through their
  silence. Stop halts planning, and the fade on stop silences the notes already planned past it.

**How the session controller wires it.** Right after `start`, the session controller (see
[`docs/session-engine.md`](session-engine.md#the-session-controller)) queues phrase 1 with the idle
phrase's harmony at the starting tempo. Then, on each `phrase-tempo` output of the session engine
(see [`docs/session-engine.md`](session-engine.md)), it queues that phrase's number with the
harmony of the phrase its `phrase-ready` gave, `phrase.outcome.provenance.harmony.events` (a
repeat included), at the tempo the engine fixed for it. Phrase 1 gets neither output, which is why
it is queued at start. The engine fixes each later phrase's tempo at its deadline, the start of the
last measure of the phrase before, so it is queued a measure before it starts, well ahead of the
200 ms window.

### The voices

The backing is synthesized from oscillators and gains only: no sample, no audio file and no extra
download. `BACKING_VOICE` in `web-audio-session-bus.ts` sets its placeholder timbre and levels:

- the bass is a triangle wave, each chord note a quieter sine wave;
- each note gets its own oscillator and its own envelope gain: it rises from silence in 5 ms,
  holds, then falls to near silence over the 40 ms before its end, and the oscillator stops at the
  end. A note attacked again on the same pitch is therefore heard again, and no note ends in a
  click;
- a note shorter than the rise plus the fall (45 ms), or a pitch that isn't a whole MIDI number
  from 0 to 127, is refused.

`npm run verify:boundaries` keeps it that way: it rejects the sample and decoding calls of Web Audio
anywhere in `src/`, and any audio or sample file in the build output (see
[`docs/testing.md`](testing.md#scripts)).

## The mix

The mix graph is built once, at unlock:

```
click route:    click-enable -> click-volume -> destination
count-in route:                 click-volume -> destination
backing route:  backing-enable -> backing-volume -> destination
```

Each session's sound enters these routes through its own session bus (see [Stop](#stop)): the
clicks into the click route or the count-in route, the backing voices into the backing route.

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
- **The player sets it in the score toolbar.** `MixControls` (`src/components/workspace/`) holds
  the `Backing` and `Click` toggles and the `Volume` popover's two sliders, whose step is the
  `--mix-volume-step` token (`readMixVolumeStep`, which throws on a missing or non-positive step).
  They call the transport's setters at Idle and during a session alike; the levels live in the
  transport, which starts from the saved mix, and each change is saved (each volume on its
  slider's release; during a session, at its end; see
  [Saving the player's settings](storage.md#saving-the-players-settings) and
  [The audio mix](phrase-workspace.md#the-audio-mix)).

## Stop

Every session opens a fresh **session bus**: three fade gains, one per click route and one for the
backing. On stop the bus fades all three to silence over `STOP_FADE_SECONDS` (0.1 s, the rule's
"about 100 ms") and the scheduler halts. Sound already planned past the fade goes through the
faded bus and stays silent, and the next
session gets a fresh bus that the fade never touched. `stop` returns `fadeEndsAt`, when the fade
reaches silence.

A hidden tab ends the session exactly like Stop. The session controller detects it through its
page-visibility port (see [Ends](session-engine.md#ends)).

## Interruption

The app never stops the audio clock itself, but the browser can: a device change or an operating
system interruption takes the context out of its running state. The output reports it through
`onInterrupted`; the transport then halts the running session and tells its own listeners. The
session controller, which listens from its first start, then ends the session at once, with the
engine's cause `stop`: for the player it is the same as Stop (see
[Ends](session-engine.md#ends)).

**Known limit:** resuming the audio after such an interruption is not built. Nothing asks the
browser to run the context again, so a later session may stay silent.

## The playhead

`outputLatency()` gives the seconds between a sound's scheduled time and the moment it leaves the
speakers. The playhead uses it to follow what is heard, not what is scheduled: v2.0 item 6 asks
for it to stay within 20 ms of the actual audio output.

The session's rolling display (see
[The rolling display](session-engine.md#the-rolling-display)) reads the playhead once per
animation frame, on **heard time**, `now() - outputLatency()`, and finds the measure that time
falls in from each phrase's start and its own tempo: barline k of phrase n at
`phraseStartsAt(n) + k × 240 / tempo`, with phrase n's tempo. Exactly at a barline the playhead is
on the new measure.
The band (`rect.playhead-band`) moves only when the measure changes, in one step with no
transition, so it lags the heard barline by at most one frame (about 17 ms at 60 frames per
second) plus the time to draw it. The scheduler and the engine's deadlines keep reading `now()`
itself; only the display subtracts the latency.

How close the band lands in practice is measured in real Chromium, on the real `AudioContext`
through the workspace harness: the moment the band moves at each barline is compared with that
barline's heard time, mapped to `performance.now()` through `clockAnchor()` (below). The figures,
with the machine and the date, are recorded in
[Rolling display (chunk 16)](generation-latency.md#rolling-display-chunk-16).

## The clock anchor

A MIDI note arrives stamped on the page's `performance.now()` timeline, in milliseconds, not on
the audio clock. `anchor()` on the clock, exposed by the transport as `clockAnchor()`, gives one
simultaneous reading of both: a `ClockAnchor`, an audio time and the `performance.now()` time it
corresponds to. `clockAnchor()` throws before unlock, like `now()`.

- **While the context runs,** the Web Audio output reads `getOutputTimestamp()`, the frame heard at
  a given `performance.now()` time, and adds `outputLatency()`. The anchor is therefore on the
  timeline the clicks, the backing and the playhead are scheduled on.
- **While the audio clock stands still** (the context not running, or its output timestamp still
  at 0), the anchor is `currentTime` at the page's `performance.now()`, which
  `createWebAudioOutput` takes as an injected function.
- **A running context reporting a timestamp that isn't a finite time** throws.

`src/midi/` maps every MIDI timestamp through a fresh anchor. See
[`docs/midi-input.md`](midi-input.md#the-audio-clock) for the mapping, and why the output latency
added here is taken off only once, later.

## How it's tested

Unit tests drive the transport through its ports: a fake audio clock advanced by hand, a fake
wake timer and a fake output that records every gain, click, backing note and fade with its time.
The Web Audio adapters are tested against a recording fake context. The backing renderer is tested
on hand-built harmony and on real planner harmony in every collection, one- and two-chord
measures included, with every pitch class checked against the harmony event it plays under. On
the fake clock, eight bars of backing at 60, 120 and 240 BPM land exactly on the clicks, muting
changes no scheduled time, and the backing plays only from the count-in's end until stop. The
workspace harness injects the fake clock and output through its `audio` seams, and real-Chromium
tests play a count-in and a short backing on the real `AudioContext`. See
[`docs/testing.md`](testing.md) for how to drive them.

## What later chunks add

- **Chunk 15 (built):** the `Start session` click's call to `unlock()`, the session runner's `now`
  reading `WorkspaceSession.audio.now`, the count-in display, the mix controls in the score toolbar
  (see [The audio mix](phrase-workspace.md#the-audio-mix)), hidden-tab detection, the end on an
  interruption, and the `queueBacking` calls (see
  [How the session controller wires it](#the-transport-api)).
- **Chunk 13 (built):** the `controller-status` click's call to `unlock()` (the
  `Connect controller` button or a badge other than the connected one).
- **Chunk 16 (built):** the playhead, read once per frame on heard time, `now()` minus
  `outputLatency()` (see [The playhead](#the-playhead)).
- **Chunk 17 (built):** played notes placed on the audio clock through `clockAnchor()` (chunk 12
  built the mapping, see [`docs/midi-input.md`](midi-input.md)) and read by a session, whose MIDI
  timers run on the audio clock (see
  [The session controller's MIDI side](session-engine.md#the-session-controllers-midi-side)).
- **Chunk 20 (built):** the MIDI export's backing track, from `renderBacking` for each recorded
  phrase's harmony, so the file and the audio play the same notes (see
  [The file](export.md#the-file)).

## Choices made while building it

- **Clicks are scheduled whatever the click switch says.** The click-enable gain mutes them. A
  click turned on mid-session is then heard from the next beat, with nothing to re-plan.
- **The mix design is read on first use** (at unlock, or the first mix reading or change before
  it), not when the transport is built, so the stylesheet has loaded by then.
- **`unlock()` is idempotent.** A second click that unlocks does nothing, so Start after "Connect
  controller" keeps the same context.
- **One scheduler for the transport's lifetime,** created at the first `start` and reused. Its
  wake-up timer, and so its Worker, is created once.

The backing's choices were made in chunk 11 and await the owner's acceptance:

- **A "four-beat harmony event" is read as a full measure under one chord.** So a chord held over
  two measures gets root then fifth in each measure, not once over the eight beats.
- **Chords are attacked on each chord change and each downbeat only,** never again on beat 3.
  This follows O57's wording; the atom's "re-attacked in the same way" is looser.
- **The chord voicing is the highest close-position stack whose top note is at or below E4.** The
  inversion therefore varies with the chord, and the chord's top note always lies between F3 and
  E4.
- **The bass fifth is taken in the same octave band as the root** (MIDI 36 to 47), so it can sit
  below the root.
- **Each note is held for its whole segment,** with a short release before the next attack. The
  timbre and the levels are placeholders.
- **The transport API.** Phrases are queued in order from 1, a late queue throws, and a phrase
  never queued stays silent until the next queue call throws. The renderer lives in
  `src/domain/backing/`, outside `src/audio/`, so the MIDI export can reuse it.
- **The backing is scheduled whatever the backing switch says,** like the click: the
  backing-enable gain mutes it, so switching it on mid-session needs nothing re-planned.
- **`verify:boundaries` gained two explicit rules:** no audio or sample file in `dist/`, and no
  `decodeAudioData`, `createBufferSource`, `createMediaElementSource` or `new AudioBuffer` in
  `src/`.

Still open for the v2.0 gate: O57's listening test (the voicing, the register, the attack pattern
and the timbre), and ux Q31 (the backing volume's range and default, and the linear
volume-to-gain mapping).
