# MIDI Tuning

This document lists the timing constants that decide when a played note counts, says where each
one lives and where its value comes from, and gives the procedure to measure and tune them on the
reference hardware: a breath controller over USB, and a USB keyboard. The master spec asks for
this tuning in the real-hardware checks of the v2.0 release gate (see
[Added by v2.1 and later](../specs/versions/v2/master-spec.md#added-by-v21-and-later), item 9,
and [build plan chunk 21](../specs/versions/v2/build-plan.md#chunk-21--v20-release-gate)).

**Tuned for the breath controller on 2026-10-06; the USB keyboard is still to come.** The
reference breath controller (Travel Sax 2) was measured over USB on 2026-10-06, and every constant
kept its starting value: the played notes already land on the click as the app hears them, and the
windows behave as their rule says (see [Results](#results)). The USB keyboard run is pending: the
owner has none at hand yet.

How the constants are used is described in [MIDI note acknowledgement](midi-acknowledgement.md)
(the windows and the latency) and [Session Engine](session-engine.md#the-session-controllers-midi-side)
(the two session timers).

## Words used here

- **Onset**: the moment a note starts, on a clock. A **played onset** is when the player started a
  note; an **expected onset** is when the phrase's note is due.
- **Audio clock**: the clock the app schedules sound on, in seconds. Every time here is on it.
- **Output latency**: the delay between the moment a sound is scheduled and the moment it comes out
  of the speakers. The player plays along with what they hear, so their notes arrive that much
  late.
- **Connection delay**: the extra time a controller's note-on takes to reach the app. Negligible
  over USB. Over Bluetooth LE, the reference breath controller's notes came roughly 70 to 80 ms
  later than over USB, and in batches (see [Bluetooth](#bluetooth)).
- **Window**: the stretch of time around an expected onset in which a played note at the right
  pitch counts. See [The window rule](midi-acknowledgement.md#the-window-rule).
- **Click**: the metronome tick the app plays on every [beat](music/lexicon.md#beat).

## The constants

| Constant                                     | Value  | File                                                   | Where the value comes from                                                                                                                            |
| -------------------------------------------- | ------ | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EARLY_GRACE_SECONDS`                        | 0.15   | `src/domain/acknowledgement/acknowledgement-window.ts` | Owner-approved rule text: a window opens 150 ms before its onset (`rule_expected_note_window`, version 0.2). Played on 2026-10-06: kept.              |
| `LATE_GRACE_SECONDS`                         | 0.2    | `src/domain/acknowledgement/acknowledgement-window.ts` | Owner-approved rule text: a window stays open at least 200 ms after its onset (`rule_expected_note_window`, version 0.2). Played on 2026-10-06: kept. |
| `OUTPUT_LATENCY_SECONDS`                     | 0      | `src/domain/acknowledgement/played-onset-latency.ts`   | Measured on 2026-10-06 (breath controller, USB): kept at 0. The browser reports 32 ms, but the player's anticipation of the click cancels it.        |
| `CONNECTION_LATENCY_SECONDS.usb`             | 0      | `src/domain/acknowledgement/played-onset-latency.ts`   | A wired USB connection adds a negligible delay. Measured on 2026-10-06 (breath controller): kept at 0.                                                |
| `CONNECTION_LATENCY_SECONDS['bluetooth-le']` | 0.0125 | `src/domain/acknowledgement/played-onset-latency.ts`   | Unused: no session applies a Bluetooth-specific correction (`rule_played_onset_latency_compensation`, version 0.3). See [Bluetooth](#bluetooth).         |
| `SILENCE_TIMEOUT_SECONDS`                    | 30     | `src/session/session-midi-timers.ts`                   | Product rule (`rule_silence_timeout_ends_session`). Not tuned.                                                                                        |
| `RECONNECTION_WINDOW_SECONDS`                | 30     | `src/session/session-midi-timers.ts`                   | Product rule (`rule_controller_reconnection_window`). Not tuned.                                                                                      |
| `VERY_SHORT_NOTE_SECONDS`                    | 0.038  | `src/domain/played-notes/stray-notes.ts`               | Measured on 2026-10-15 (breath controller, USB), measurement M1: see [Very short notes (M1)](#very-short-notes-m1). Not used by acknowledgement.      |

What may change without the owner, and what may not:

- **The two windows are rule text.** 150 ms and 200 ms are written in `rule_expected_note_window`,
  which the owner approved. Changing either value changes that rule: it needs the owner's sign-off,
  and the rule is revised first.
- **The output latency and the USB delay are free to tune.** The rule only says they are tuned,
  hard-coded constants.
- **There is no Bluetooth correction to tune.** `rule_played_onset_latency_compensation` (version
  0.3) gives every controller the USB correction and makes Bluetooth best-effort. A
  Bluetooth-specific correction, or extra tolerance for Bluetooth, would change that rule: it needs
  the owner's decision first.
- **The two 30-second timers are product rules,** not hardware tuning. They are listed here only
  because they are timing constants of the same session.
- **The very-short-note threshold is free to tune** within its rule: one constant for every
  controller, never a player setting, well under 62.5 ms (`rule_stray_note_definition`). Played
  notes are stored as received, so a new value applies to every session already kept. It changes
  only the review's lane and the played-notes export, never which notes light.

Three facts about how the latency is applied today:

- **One correction for every controller.** Web MIDI does not say how a device is connected, so a
  session applies the USB correction (`latencyCorrectionFor('usb')`) to every controller. The
  breath controller and the keyboard therefore share one total: `OUTPUT_LATENCY_SECONDS` plus
  `CONNECTION_LATENCY_SECONDS.usb`. If the two devices measure differently, pick a value that
  serves both and note it in the results.
- **The correction is a total.** Matching takes both delays off each played onset, so for USB only
  their sum matters.
- **The playhead is separate.** The on-screen playhead uses the audio context's own reported
  `outputLatency`, read live (see [The rolling display](session-engine.md#the-rolling-display)).
  The constants here change only which notes count, and the played-note times the history stores.

## Measuring on the reference hardware

Run the procedure once per device: the breath controller over USB, then the USB keyboard. Use the
machine and the speakers or headphones you practise with: the output latency depends on them. A
pair of Bluetooth headphones adds far more output latency than wired ones.

### Setting up

1. Run `npm run dev` and open the page it prints in Chromium, on a laptop or desktop window.
2. Plug the device in. Click `Connect controller`, allow MIDI access and pick the device.
3. Run the transposition check in the connection sheet and make sure it reports a match for the
   instrument profile you will use. A controller that sends the wrong
   [octave](music/lexicon.md#octave) acknowledges nothing, which would look like a timing problem.
4. Close the sheet. Open the developer tools' console and paste this line. It reaches the running
   app through Vue's development build, so it works under `npm run dev` only, not on a production
   build:

   ```js
   const app = document.querySelector('#app').__vue_app__._instance.setupState
   ```

### 1. The output latency

1. After the `Connect controller` click, the audio is unlocked. Read the latency the browser
   reports:

   ```js
   app.workspace.audio.outputLatency()
   ```

   It is in seconds. For a second reading, a throwaway context gives `baseLatency` (the browser's
   own processing delay) and `outputLatency` (the whole path to the speakers):

   ```js
   const probe = new AudioContext()
   await probe.resume()
   await new Promise((done) => setTimeout(done, 1000))
   console.log(probe.baseLatency, probe.outputLatency)
   await probe.close()
   ```

2. Set the tempo to 60 BPM and leave the click on. Start a session.
3. From the first beat after the count-in, play one short note exactly with every click, ignoring
   the staff, for about two minutes. Any pitch will do. Play at least once every 30 s, or the
   silence timeout ends the session.
4. Click `Stop`, then paste the readout below (see [Reading the played notes](#reading-the-played-notes)).
   Its `beatOffsetMs` column is how far each played note fell from the nearest click, after the
   current correction: positive is late.
5. The median of `beatOffsetMs` is the delay still left in the played onsets. With today's
   correction of 0 it is the whole delay: output latency, connection delay and the player's own
   habit. Most players land slightly ahead of a click, so compare it with the reported
   `outputLatency`. If the two are close, the reported value is a sound choice for
   `OUTPUT_LATENCY_SECONDS`; if they are far apart, repeat the run before choosing.

### 2. The windows

1. Set a tempo you practise at, for example 100 or 120 BPM, and start a session.
2. Play the phrases as written, on time, for a few phrases. Every note played at the right pitch
   and in time should turn the acknowledged colour on the staff (the `note-ack` overlay). During
   the session, `app.sessionController.state.acknowledged` lists the acknowledged notes.
3. Play a few phrases deliberately a little early, then a few a little late, as a player who is
   slightly ahead or behind would.
4. Click `Stop` and paste the readout. Its `noteOffsetMs` column is how far each played note fell
   from the expected note whose window holds it (else from the nearest expected note of the same
   pitch), `inWindow` says whether any window held it, and `lit` whether that expected note was
   acknowledged.
5. Look for two things:
   - a note you felt was in time but that was not lit: the window is too tight there, or the
     latency correction is wrong;
   - a note clearly early or late that was still lit: the window is too wide.

   Fix the latency first: a latency error shifts every offset the same way and makes the windows
   look wrong. Between two fast notes the window is narrower than 150 / 200 ms by design (the gap
   is split halfway; see [The window rule](midi-acknowledgement.md#the-window-rule)).

### Reading the played notes

The app has no on-screen readout of the played notes. After a session ends, its history is
`app.sessionController.state.lastHistory`. Each phrase record holds the played notes whose onsets
fall inside it (`playedNotes`, each with `pitch`, `velocity`, `onsetAt` and `releaseAt`) and the
acknowledged notes (`acknowledgements`). Played times are stored with the latency correction
already taken off, so they line up with the expected onsets. Notes played during the count-in
belong to no phrase and do not appear.

This readout prints one row per played note, then a summary of the click offsets. It loads the
app's own expected-note and window code through the development server:

```js
const { deriveExpectedNotes } = await import('/src/domain/acknowledgement/expected-note.ts')
const { placeAcknowledgementWindows } = await import(
  '/src/domain/acknowledgement/acknowledgement-window.ts'
)
const key = (id) => `${id.phraseNumber}:${id.measureIndex}:${id.eventIndex}`
const rows = []
for (const record of app.sessionController.state.lastHistory.phrases()) {
  const beat = 60 / record.tempo
  const expected = deriveExpectedNotes(record.outcome.result.timeline, {
    phraseNumber: record.phraseNumber,
    startSeconds: record.startedAt,
    tempoBpm: record.tempo,
  })
  const lit = new Set(record.acknowledgements.map(key))
  const windows = placeAcknowledgementWindows(expected)
  for (const note of record.playedNotes) {
    const sincePhrase = note.onsetAt - record.startedAt
    const nearest = expected
      .filter((candidate) => candidate.pitch === note.pitch)
      .sort(
        (a, b) => Math.abs(a.onsetSeconds - note.onsetAt) - Math.abs(b.onsetSeconds - note.onsetAt),
      )[0]
    // The expected note whose window holds this onset, if any; else the nearest of that pitch.
    const holder = windows.find(
      (candidate) =>
        candidate.pitch === note.pitch &&
        candidate.window.opensAtSeconds <= note.onsetAt &&
        note.onsetAt <= candidate.window.closesAtSeconds,
    )
    const target = holder ?? nearest
    rows.push({
      phrase: record.phraseNumber,
      pitch: note.pitch,
      velocity: note.velocity,
      beatOffsetMs: Math.round((sincePhrase - Math.round(sincePhrase / beat) * beat) * 1000),
      noteOffsetMs: target ? Math.round((note.onsetAt - target.onsetSeconds) * 1000) : null,
      inWindow: Boolean(holder),
      lit: holder ? lit.has(key(holder.identity)) : false,
    })
  }
}
console.table(rows)
const offsets = rows.map((row) => row.beatOffsetMs).sort((a, b) => a - b)
const at = (q) => offsets[Math.min(offsets.length - 1, Math.floor(q * offsets.length))]
console.log(
  `Click offsets: ${offsets.length} notes, median ${at(0.5)} ms,`,
  `middle 80 % from ${at(0.1)} to ${at(0.9)} ms, extremes ${offsets[0]} to ${offsets.at(-1)} ms`,
)
```

`pitch` is the [MIDI note number](music/lexicon.md#midi-note-number) of the
[concert pitch](music/lexicon.md#concert-pitch) (60 is [middle C](music/lexicon.md#middle-c)).
The last line is the click summary for the output-latency run, where every note is played on a
click; in the windows run, off-beat notes make it meaningless. Matching the window that holds the
note, not the nearest note of its pitch, matters for repeated pitches: a played note can fall in
the window of the previous note of the same pitch, and light that one.

### What to do with the numbers

1. Fill in one row of [Results](#results) per device and run.
2. Edit the constant in its file, in seconds (for example `0.012` for 12 ms). Rewrite its comment
   to say where the value now comes from: the device, the date and the measurement.
3. Update the latency table in [MIDI note acknowledgement](midi-acknowledgement.md#latency) to
   match.
4. A window value, or any Bluetooth-specific correction, needs the owner's sign-off and its rule
   revised first (see [The constants](#the-constants)). Do not change them on your own.
5. The unit tests pin today's values (`played-onset-latency.spec.ts`,
   `acknowledgement-window.spec.ts`); update them with the constant. Then run `npm run quality`.
6. Repeat step 2 of the procedure ([The windows](#2-the-windows)) with the new value to confirm it.

## Results

One row per device and run. Times in milliseconds. The click offset is the readout's summary line
from the output-latency run: positive is late, after today's correction of 0.

All the 2026-10-06 rows: the reference breath controller, a Travel Sax 2 (MIDI port
`TravelSax2 MIDI 1`), on the Linux machine with the speakers the owner practises with, in Debian's
Chrome (version not recorded) on the dev server at `localhost`.

| Device       | Connection   | Date       | Output latency measured                                    | Click offset (median; middle 80 %; extremes)                                                         | Early / late misses observed                                                                                                                                                                     | Values chosen                                                    | Notes                                                                                                                                                       |
| ------------ | ------------ | ---------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Travel Sax 2 | USB          | 2026-10-06 | 32 (`baseLatency` 10.7), from the app and a probe context | +9; −19 to +61; −29 to +79 (run 1, 90 BPM, 32 notes)                                                 | —                                                                                                                                                                                                | `OUTPUT_LATENCY_SECONDS` 0, `CONNECTION_LATENCY_SECONDS.usb` 0 | Unchanged. Players anticipate a click, and here that cancels the 32 ms: a 32 ms correction would move the medians to about −25.                         |
| Travel Sax 2 | USB          | 2026-10-06 | —                                                          | +2; −48 to +28; −246 to +36 (run 2, 42 notes, one stray early note)                                  | —                                                                                                                                                                                                | Unchanged                                                        | Confirms run 1.                                                                                                                                             |
| Travel Sax 2 | USB          | 2026-10-06 | —                                                          | —                                                                                                    | Windows run at 60 BPM. No note of the right pitch inside −150 / +200 ms stayed unlit. Early: none lit beyond 150 ms (one 331 ms early stayed unlit). Late: lit up to about +530 on long notes. | Windows unchanged: 150 early, 200 late                           | The late lighting follows the rule: a late edge is the later of +200 ms and the end of the note's written length, cut at the next note's window.             |
| Travel Sax 2 | Bluetooth LE | 2026-10-06 | —                                                          | About +80 (+80, +164, +32, +26 and +82 on the first 5 single-pitch notes, against +2 and +9 over USB) | Not run.                                                                                                                                                                                         | None: no Bluetooth-specific correction                           | Notes arrive in batches. Best-effort, see [Bluetooth](#bluetooth).                                                                                          |
| USB keyboard | USB          | Pending    |                                                            |                                                                                                      |                                                                                                                                                                                                  |                                                                  | Not measured yet: the owner has no USB keyboard at hand.                                                                                                    |

What the windows run showed beyond the figures:

- **The notes that felt in time but stayed unlit were pitch slips.** The controller sent 75 for
  63 (the octave key) or 59 and 57 for 58 (a finger off by a semitone). A note lights only on its
  exact pitch, octave included.
- **In-between notes.** While the fingers change position, the Travel Sax often sends short
  notes between the two (here pitches 50, 51 and 55, often in pairs at velocity 127). They light
  nothing, being the wrong pitch, but they reach the review's played-notes view and the
  played-notes MIDI export. From v3.0 both leave out notes under 38 ms (see
  [Very short notes (M1)](#very-short-notes-m1)).
- **The owner's feel:** the feedback was not a problem; misses were mostly the playing, on a new
  exercise (reading at tempo while managing breath on a controller with no blow resistance).

## Very short notes (M1)

Measurement M1 of the v3.0 build plan
([M1 — The stray-note threshold](../specs/versions/v3/build-plan.md#m1--the-stray-note-threshold))
sets `VERY_SHORT_NOTE_SECONDS`, the length under which a played note counts as a very short
"stray" note ([master spec §9](../specs/versions/v3/master-spec.md#9-stray-notes)): an in-between
note a controller sends while the fingers move from one position to the next. The review's
`Played notes` lane leaves those notes out, and so does the played-notes export unless
`Include very short notes` is on. Acknowledgement never reads the threshold.

**Value: 38 ms.** One full controller step below the shortest note read as intended (45.8 ms), and
24.5 ms under a sixteenth note at 240 BPM (62.5 ms). It leaves out 66 of the 77 in-between notes
found; the other 11 last as long as intended notes do, so no length can tell them apart.

### The recordings

On 2026-10-15 the owner played five sessions on the Travel Sax 2 over USB in v2.0, and exported
each one's played notes (v2.0's played-notes MIDI file, 960 ticks per quarter note: under 0.7 ms
per tick at 90 BPM). They are kept in `tests/fixtures/stray-notes/`, and the filter's tests replay
them.

| File (`infinite-flow-2026-10-15-…`) | What was played               | Tempo   | Length | Notes |
| ----------------------------------- | ----------------------------- | ------- | ------ | ----- |
| `111340-played.slow.mid`            | Slow scales                   | 90 BPM  | 13 s   | 18    |
| `111507-played.fast.mid`            | Fast scales                   | 240 BPM | 12 s   | 65    |
| `111600-played.free.mid`            | Free playing                  | 90 BPM  | 44 s   | 89    |
| `112838-played.fast.mid`            | Fast scales, a longer retake  | 240 BPM | 48 s   | 227   |
| `113100-played.free.mid`            | Free playing, a longer retake | 90 BPM  | 77 s   | 135   |

The "fast scales" are a B-flat major scale, up and down, one note per beat at 240 BPM: about
250 ms a note. The owner found 240 BPM hard.

### The script

`node scripts/stray-note-lengths.mjs [--bin <ms>] [--up-to <ms>] [file.mid ...]` reads
played-notes files (every file of `tests/fixtures/stray-notes/` by default) through the tests'
MIDI reader and its tempo map. For each file it lists every note shorter than `--up-to` (200 ms
by default) with its onset, length, velocity, the pitches just before and after it, and `split`
when a note of the same pitch touches it within 60 ms. Then it draws the histogram of every
note's length in `--bin` bins (5 ms by default). It is tooling: nothing in the app reads it.

### What the notes show

The Travel Sax reports lengths in steps of about 5 ms (4.9, 10.4, 15.3, 20.6, 25.5, 30.5, 35.4,
41.0, 46.4 ms and on), each within about 1 ms. Of the 534 notes, 367 last 130 ms or more; the 167
shorter ones were read one by one, in their melodic context, into four kinds:

- **In-between notes**: a different pitch wedged between two notes, which the scale or the line
  never asks for: G between A and B-flat (the commonest, 5 to 87 ms), F or F' between B-flat and
  C, B an octave up between B and F-sharp (the octave key moving first), and runs of 2 to 4
  pitches 5 ms apart at the start of a note. Often at full velocity, as the windows run of
  2026-10-06 saw.
- **Split halves**: one held note cut in two, the two parts of the same pitch with up to 60 ms
  between them, usually a loud short part and a soft long one (the controller retriggering on the
  breath). Leaving a short half out loses no note: the other half carries its pitch.
- **Intended notes**: the only note of a pitch the scale or the line asks for at that place.
- **Unclear**: a passing note that could be either, and the 9 notes of a fumbled flourish at the
  end of the last recording (74.7 to 75.2 s).

Notes per 5 ms of length, under 130 ms (a bin holds its step and that step's jitter):

| Length (ms) | In-between | Split halves | Intended | Unclear |
| ----------- | ---------- | ------------ | -------- | ------- |
| 0–4         | 10         | 0            | 0        | 0       |
| 5–9         | 13         | 0            | 0        | 0       |
| 10–14       | 8          | 2            | 0        | 0       |
| 15–19       | 12         | 4            | 0        | 2       |
| 20–24       | 7          | 3            | 0        | 1       |
| 25–29       | 7          | 2            | 0        | 0       |
| 30–34       | 2          | 1            | 0        | 1       |
| 35–39       | 7          | 4            | 0        | 0       |
| 40–44       | 2          | 2            | 0        | 2       |
| 45–49       | 2          | 2            | 1        | 0       |
| 50–54       | 0          | 1            | 0        | 1       |
| 55–59       | 2          | 2            | 0        | 1       |
| 60–64       | 0          | 6            | 1        | 1       |
| 65–69       | 1          | 4            | 0        | 0       |
| 70–74       | 2          | 5            | 0        | 0       |
| 75–79       | 0          | 4            | 0        | 1       |
| 80–129      | 2          | 34           | 7        | 4       |

There is no empty gap between the in-between notes and the intended ones, only a dip after the
36 ms step. The two kinds overlap from 41 to 97 ms:

- **The shortest intended notes:** an F (65) of 45.8 ms in a C major run at 16.7 s of the first
  free recording (the same run in the retake holds a 271 ms F), and an F (53) of 61.5 ms at 7.3 s
  of the first fast recording.
- **The longest in-between notes:** 41.0 ms (twice), 46.4, 46.5, 56.8 (twice), 68.1, 70.8, 73.6,
  87.2 and 97.2 ms.

### The threshold

A length alone can only take the in-between notes shorter than the shortest intended one. The
threshold is set for the margin on that side, since leaving out a note the player meant is the
worse error:

- **38 ms** sits between the 36 ms and 41 ms steps. The 41 ms step holds no note read as
  intended, so a full step (about 5 ms, plus the 1 ms jitter) separates the threshold from the
  45.8 ms note. At 43 ms that margin would shrink to less than the jitter.
- **What it leaves out:** 86 notes of the 534: 66 of the 77 in-between notes, 16 short split
  halves (each one's other half stays) and 4 unclear notes; no intended note. Per recording, in
  file order: 3, 2, 22, 30 and 29.
- **What stays:** the 11 in-between notes of 41 ms or more. Raising the threshold to catch them
  would leave out intended notes first.
- **Below 62.5 ms:** 24.5 ms under a sixteenth note at 240 BPM, the shortest note the app writes.

To measure again: record the sessions as above, add their files to `tests/fixtures/stray-notes/`,
run the script, and read the notes under 130 ms in context. A new value goes into
`VERY_SHORT_NOTE_SECONDS` with its basis in its comment, in the constants table above and in this
section; the counts in `tests/unit/domain/played-notes/stray-notes.spec.ts` follow it.

## Bluetooth

Bluetooth LE MIDI is best-effort, and USB is the tested path for v2.0: that is the owner's answer
to the master spec's open question O71 (spec decision D191 in
[the decisions log](../specs/decisions.md)), after the 2026-10-06 trial.

- **It works.** Paired in the system settings, the Travel Sax appears under
  `Connect controller` in Debian's Chrome on the Linux machine, connects, and the right notes
  light.
- **It is later and coarser.** On the click, its notes came about 80 ms late (median of the first
  5 single-pitch notes), against +2 and +9 ms over USB: Bluetooth adds roughly 70 to 80 ms here.
  Notes played close together arrive in batches with the exact same time, where over USB the same
  pairs arrived about 11 ms apart.
- **No Bluetooth correction.** Web MIDI does not say how a device is connected, so the session
  applies the USB correction to every controller. `CONNECTION_LATENCY_SECONDS['bluetooth-le']`
  (12.5 ms) exists and is tested, but nothing in a session uses it.
- **The owner's feel:** workable; the looser feedback was not a problem.
- **Still to try, blocking nothing:** the controller on an Android phone in Chrome, which needs a
  deploy of the current main.

A voluntary "Bluetooth" choice in the connection sheet that gives played notes a little more
timing tolerance is a candidate the owner raised, not committed (spec decision D192).

## The controller check

The transposition check was verified on the same hardware, at the same sitting, on 2026-10-06:
the device's own transpose setting is enough, and no manual input-transposition setting is needed
for the breath controller. See [The verdict](controller-connection.md#the-verdict).
