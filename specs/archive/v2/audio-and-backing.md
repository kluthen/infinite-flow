# v2 — Audio Clock, Backing, Click, Count-in and Tempo

> **Archived 2026-09-27.** Consolidated into the v2 master spec. Live summary:
> [versions/v2/master-spec.md §6](../../versions/v2/master-spec.md).

Status: draft v0.1 (2026-09-26)

**Scope of this document.** The product's first audio: the master clock, the backing (bass and
block chords), the click, the count-in, and what tempo means. MIDI timing against this clock is
in [midi-and-acknowledgement.md](midi-and-acknowledgement.md).

Settled items cite their decision. Everything else is `(proposed)`. Question IDs point to the
[register](../../open-questions.md). O57 and O68 have their full text in [§8](#8-open-questions).
O38, O44, O45, O53, O54, O58 and O59/O73 (in [sessions-review-export.md](sessions-review-export.md))
are settled (D76, D84, D85, D89).

## 1. Settled inputs

- **v2 includes backing playback** (D63, D70):
  - a bass line and block chords that follow the generated harmony, in pitch and on the beat;
  - an optional click, and a mute/volume control;
  - it plays only while a session runs, and keeps playing through the player's silences;
  - rudimentary is acceptable.
- **The generated lead line is not played back** (D63).
- **v4+ adds accompaniment with roles** (highlighting, contrasting, responding) (D70). v2 must
  not pretend to be that.

## 2. What v1 gives us (checked, 2026-09-26)

- **There is no audio code.** A search of `src/` for `AudioContext`, `requestMIDIAccess` and
  `performance.now` finds nothing (prerequisites §2 B, re-checked).
- **Tempo reaches no planner.** It exists only in the controls: `TEMPO_VALUES` is 60–240 in steps
  of 10, and the default is 90 (`src/domain/controls/generation-controls.ts`).
  `GenerationRequest` has no tempo field.
- **Exact musical time is available.** `Rational` durations and ticks are in `src/domain/time/`.
  The result deliberately excludes "audio scheduling timestamps"
  (`src/domain/generation/generation-result.ts`).
- **Harmony is available for a backing renderer.** The selected harmony candidate travels beside
  the result as `GenerationProvenance`. Each `HarmonyEvent` carries `barIndex`, `startBeat`
  (`0|2`), `durationBeats`, `triad.pitchClasses` and `role` (`harmony-types.ts`). The generator
  contract already reserves an "optional backing arranger" that "reads the result and creates
  separate accompaniment events. It cannot alter lead events" (§Stage Ownership).

## 3. The clock `(proposed)`

- **The audio clock is the master clock.** `AudioContext.currentTime` is the only time source for
  backing, click, playhead and the end-of-measure chord-fit check.
  - Musical position maps to audio time from the session start time, the tempo of each phrase,
    and exact `Rational` positions. Tempo changes happen only at phrase boundaries, so the
    mapping is piecewise-linear per phrase.
- **Look-ahead scheduling**, following the established "two clocks" pattern:
  - a timer wakes about every 25 ms;
  - each wake-up schedules every audio event due within the next look-ahead window, using
    Web Audio's sample-accurate `start(time)`.

  The reference design uses a 100 ms window. v2 proposes **200 ms**, because engraving a phrase
  runs on the main thread and can hold it long enough to starve a 100 ms window (**O68**).

- **A muted backing does not stop the clock.** A suspended `AudioContext` stops advancing
  `currentTime`. So mute and volume are implemented as gain, never as suspending the context.
- **The playhead shows what is heard.** The visual position is derived from
  `AudioContext.getOutputTimestamp()`, which returns a matched `contextTime` and
  `performanceTime`, and it accounts for `outputLatency` (Chrome 102+). Otherwise the playhead
  runs ahead of the sound by the output latency.
- **Hidden tab (settled, D89).** The page being hidden **ends the session immediately**, the same
  as a manual Stop: the backing and click fade out, and the review opens. This replaces the
  earlier "pause and resume with a count-in" proposal (browsers throttle timers in hidden pages
  anyway, so a paused clock could never resume cleanly).

## 4. Autoplay and the first sound (settled, D76)

- **Chromium's autoplay policy:** an `AudioContext` created before a user gesture starts
  _suspended_, and `resume()` needs a user activation.
- **MIDI messages are not user activation.** The HTML standard's list of activation-triggering
  input events is `keydown`, `mousedown`, `pointerdown` (mouse), `pointerup` (non-mouse) and
  `touchend`. MIDI input is not on it.
- **Consequence for D62's "the first MIDI note starts a session":** it can only start audio if the
  page already has _sticky_ user activation, meaning the player clicked or pressed a key on the
  page at least once.
- **Settled (D76):** the "connect controller" action is a click. It requests MIDI access and
  unlocks audio in the same gesture. For the rest of the page's life, a MIDI note can then start
  a session. Before that click, a MIDI note cannot start a session. The app doesn't have MIDI
  access yet anyway, so the two constraints coincide.
- **If audio can't start** (the context stays suspended or fails): the session does not start,
  and the player is asked to click to enable sound. The app never starts a silent session with a
  frozen clock.

## 5. Backing (settled, D85)

- **The backing is a renderer, not a generated voice.** A pure function maps each phrase's
  harmony events and tempo to backing note events, which are scheduled as audio.
  - It does not enter `GenerationResult` or the timeline, so the multi-voice representation
    stays out until v4 (prerequisites K).
  - It is deterministic from the harmony, so it needs no seed and no stream label.
- **Pattern (v2.0):**
  - **Bass:** the triad root, attacked at each harmony event start and re-attacked on every beat
    1. For a four-beat event, add the fifth on beat 3.
  - **Chords:** the close-position triad, attacked at each harmony event start and re-attacked on
    every beat 1, sustained for the event.
  - Voicing and register are **O57**. Proposed: bass in MIDI 36–47 (C2–B2); chords as the
    closest inversion to the previous one, with the top note at or below MIDI 64 (E4), so the
    backing stays mostly below the lead's register.
- **Sound (O45's second half, settled D85).** **Synthesized in-app with plain Web Audio nodes**
  (oscillators, filters and envelopes). There are no assets, so it is offline-safe with no
  precache growth and no third-party licence.
  - **Alternatives considered:**
    - _Tone.js_: MIT, about 77 kB gzip. It adds a transport and synths, but duplicates the clock
      we need to own anyway.
    - _Sampled General MIDI soundfonts_: the pre-rendered FluidR3_GM set is CC BY 3.0 and needs
      attribution. The MusyngKite and FatBoy sets are CC BY-SA 3.0. All of them add megabytes to
      the offline precache.
    - _WebAudioFont_: GPL-3.0. Rejected for licence reasons.
  - Samples can replace the synth later behind the same renderer boundary.
- **Controls:** backing on/off (mute), backing volume, click on/off, click volume `(proposed)`.
  Where they sit and how they look is ux-writer's decision.

## 6. Click and count-in (settled, D85)

- **Click:** quarter notes, with beat 1 accented. Settled: **on** by default, because the
  click is what makes the tempo readable before the backing makes sense.
- **Count-in:** **one bar** of click before phrase 1, for **both** ways of starting.
  - _Start button:_ the click-in begins immediately.
  - _First MIDI note:_ that note starts the count-in and is **not** matched against phrase 1.
    D62 still holds, because the note starts the session.
  - **Why the MIDI case needs a count-in:** the app cannot know in advance where the player's
    beat 1 falls. Treating the first note as beat 1 would force phrase 1's first note to be
    "already played", and would pin the tempo to an unknown moment.
- A hidden tab now ends the session outright (D89), so there is no "resume after a pause"
  count-in case to design for.
- Phrases 1 and 2 are generated before the count-in ends (O36, see
  [rolling-phrase.md](rolling-phrase.md)). With v1's warm latency, one bar (at most 4 s at
  60 BPM, at least 1 s at 240 BPM) is enough. If the first generation is cold and misses the
  count-in, the count-in extends by whole bars. It is never cut short.

## 7. Tempo (settled, D84)

- **Tempo stays transport-only in v2.** It is not added to the generation request, and material
  does not change with BPM.
  - _Reasoning:_ tempo would enter the reproducibility inputs. More importantly, adaptive tempo
    (D66) would then change generation in response to playing, which the opt-in rule allows but
    which would couple the two features for no settled benefit.
- **Playability at high tempo is a known consequence.** Sixteenth density at 240 BPM means 16
  notes per second. v2.0 does not guard against it: the player chose both values. If testers
  hit this, a later option could have density follow tempo, and it would be visible and opt-in
  (D66). This is recorded as part of O38.
- **Tempo range and steps:**
  - The v1 control stays 60–240 in steps of 10.
  - Adaptive tempo may land on in-between integer values (see
    [adaptive-tempo.md](adaptive-tempo.md)).
  - A tempo change always applies at a phrase boundary (see
    [rolling-phrase.md §5](rolling-phrase.md#5-control-changes-during-a-session-settled-d91-see-also-o77)).
- **Swing:** v1 is straight (Straight, Occasional offbeats and Active displacement are
  syncopation settings, not swing; `docs/music/rhythm-phrase-structure.md`). v2 adds no swing
  feel to the backing or click.

## 8. Open questions

**Settled here:** O38, O44, O45, O53, O54, O58 (D76, D84, D85, D89, above).

- **O57 - Backing voicing and register** _(listening-test calibration)_: bass in MIDI 36–47,
  chords close-position with the top note at or below MIDI 64, attacked per harmony event and
  per downbeat (proposed). Is that acceptable for v2.0, or should the chords sit higher or
  comp rhythmically?
- **O68 - Main-thread engraving vs audio scheduling** _(prototype needed)_: does engraving a
  phrase (VexFlow, main thread) ever block longer than the scheduler's look-ahead? Proposed: a
  200 ms look-ahead, and the scheduler's wake-up timer in a Worker. The v2 prototype measures the
  longest main-thread task during a session at 240 BPM.

## 9. Acceptance criteria (proposed)

1. **In pitch.** For every harmony event, every backing note's pitch class is in that event's
   triad, and the bass sounds the root at each event start.
2. **On the beat.** Every scheduled backing and click event starts at the exact audio time of its
   musical position, sample-accurate as scheduled (checked in a unit test on the renderer and
   scheduler with a fake clock).
3. **Playhead sync.** In a Chromium run, the measured offset between the playhead and the audio
   output position stays within 20 ms for a 5-minute session.
4. **Mute keeps time.** Muting the backing and the click doesn't stop or shift the clock or the
   playhead.
5. **Offline.** Backing works offline after first load with no additional asset download
   (holds automatically if the synth default of O45 is kept).
6. **No autoplay violation.** No audio starts without prior user activation. A MIDI note before
   the connect click starts nothing.

## Sources

- C. Wilson, "A tale of two clocks", web.dev: <https://web.dev/articles/audio-scheduling>
  (25 ms timer, 100 ms look-ahead pattern).
- Chrome autoplay policy (Web Audio section):
  <https://developer.chrome.com/blog/autoplay>.
- HTML Standard, activation-triggering input events:
  <https://html.spec.whatwg.org/multipage/interaction.html>.
- MDN browser-compat-data, `AudioContext.outputLatency` (Chrome 102) and `getOutputTimestamp`
  (Chrome 57): <https://github.com/mdn/browser-compat-data>.
- npm registry and bundlephobia: `tone` 15.1.22 (MIT, about 77 kB gzip).
- gleitz/midi-js-soundfonts README (FluidR3_GM CC BY 3.0; MusyngKite and FatBoy CC BY-SA 3.0):
  <https://github.com/gleitz/midi-js-soundfonts>. `webaudiofont` on npm: GPL-3.0-or-later.
