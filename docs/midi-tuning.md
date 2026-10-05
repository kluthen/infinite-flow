# MIDI Tuning

This document lists the timing constants that decide when a played note counts, says where each
one lives and where its value comes from, and gives the procedure to measure and tune them on the
reference hardware: a breath controller over USB, and a USB keyboard. The master spec asks for
this tuning in the real-hardware checks of the v2.0 release gate (see
[Added by v2.1 and later](../specs/versions/v2/master-spec.md#added-by-v21-and-later), item 9,
and [build plan chunk 21](../specs/versions/v2/build-plan.md#chunk-21--v20-release-gate)).
Until that sitting, the app runs with the starting values below, untuned.

**Nothing is tuned yet.** The reference hardware was not available when MIDI was wired into the
session. Every value below is still its starting value, and the results table is empty.

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
  over USB; about 10 to 15 ms, plus some jitter (small random variation), over Bluetooth LE.
- **Window**: the stretch of time around an expected onset in which a played note at the right
  pitch counts. See [The window rule](midi-acknowledgement.md#the-window-rule).
- **Click**: the metronome tick the app plays on every [beat](music/lexicon.md#beat).

## The constants

| Constant                                     | Value  | File                                                   | Where the value comes from                                                                                                                            |
| -------------------------------------------- | ------ | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EARLY_GRACE_SECONDS`                        | 0.15   | `src/domain/acknowledgement/acknowledgement-window.ts` | Owner-approved rule text: a window opens 150 ms before its onset (`rule_expected_note_window`, version 0.2). To be confirmed by playing.              |
| `LATE_GRACE_SECONDS`                         | 0.2    | `src/domain/acknowledgement/acknowledgement-window.ts` | Owner-approved rule text: a window stays open at least 200 ms after its onset (`rule_expected_note_window`, version 0.2). To be confirmed by playing. |
| `OUTPUT_LATENCY_SECONDS`                     | 0      | `src/domain/acknowledgement/played-onset-latency.ts`   | Provisional: no correction until it is measured on the reference hardware.                                                                            |
| `CONNECTION_LATENCY_SECONDS.usb`             | 0      | `src/domain/acknowledgement/played-onset-latency.ts`   | A wired USB connection adds a negligible delay. To be confirmed.                                                                                      |
| `CONNECTION_LATENCY_SECONDS['bluetooth-le']` | 0.0125 | `src/domain/acknowledgement/played-onset-latency.ts`   | The middle of the 10 to 15 ms Bluetooth LE MIDI typically adds (`rule_played_onset_latency_compensation`). Best-effort, see [Bluetooth](#bluetooth).  |
| `SILENCE_TIMEOUT_SECONDS`                    | 30     | `src/session/session-midi-timers.ts`                   | Product rule (`rule_silence_timeout_ends_session`). Not tuned.                                                                                        |
| `RECONNECTION_WINDOW_SECONDS`                | 30     | `src/session/session-midi-timers.ts`                   | Product rule (`rule_controller_reconnection_window`). Not tuned.                                                                                      |

What may change without the owner, and what may not:

- **The two windows are rule text.** 150 ms and 200 ms are written in `rule_expected_note_window`,
  which the owner approved. Changing either value changes that rule: it needs the owner's sign-off,
  and the rule is revised first.
- **The output latency and the USB delay are free to tune.** The rule only says they are tuned,
  hard-coded constants.
- **The Bluetooth delay is free within 10 to 15 ms.** A value outside that range changes
  `rule_played_onset_latency_compensation`, which states it.
- **The two 30-second timers are product rules,** not hardware tuning. They are listed here only
  because they are timing constants of the same session.

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
   from the nearest expected note of the same pitch, and `nearestLit` says whether that note was
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

This readout prints one row per played note. It loads the app's own expected-note code through the
development server:

```js
const { deriveExpectedNotes } = await import('/src/domain/acknowledgement/expected-note.ts')
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
  for (const note of record.playedNotes) {
    const sincePhrase = note.onsetAt - record.startedAt
    const nearest = expected
      .filter((candidate) => candidate.pitch === note.pitch)
      .sort(
        (a, b) => Math.abs(a.onsetSeconds - note.onsetAt) - Math.abs(b.onsetSeconds - note.onsetAt),
      )[0]
    rows.push({
      phrase: record.phraseNumber,
      pitch: note.pitch,
      beatOffsetMs: Math.round((sincePhrase - Math.round(sincePhrase / beat) * beat) * 1000),
      noteOffsetMs: nearest ? Math.round((note.onsetAt - nearest.onsetSeconds) * 1000) : null,
      nearestLit: nearest ? lit.has(key(nearest.identity)) : false,
    })
  }
}
console.table(rows)
```

`pitch` is the [MIDI note number](music/lexicon.md#midi-note-number) of the
[concert pitch](music/lexicon.md#concert-pitch) (60 is [middle C](music/lexicon.md#middle-c)).
`nearestLit` can be true because another played note lit that expected note.

### What to do with the numbers

1. Fill in one row of [Results](#results) per device and run.
2. Edit the constant in its file, in seconds (for example `0.012` for 12 ms). Rewrite its comment
   to say where the value now comes from: the device, the date and the measurement.
3. Update the latency table in [MIDI note acknowledgement](midi-acknowledgement.md#latency) to
   match.
4. A window value or a Bluetooth value outside 10 to 15 ms needs the owner's sign-off and its rule
   revised first (see [The constants](#the-constants)). Do not change them on your own.
5. The unit tests pin today's values (`played-onset-latency.spec.ts`,
   `acknowledgement-window.spec.ts`); update them with the constant. Then run `npm run quality`.
6. Repeat step 2 of the procedure ([The windows](#2-the-windows)) with the new value to confirm it.

## Results

One row per device and run. Times in milliseconds.

| Device | Connection | Date | Machine | Browser version | Output latency measured | Connection delay measured | Early / late misses observed | Values chosen | Notes |
| ------ | ---------- | ---- | ------- | --------------- | ----------------------- | ------------------------- | ---------------------------- | ------------- | ----- |
|        |            |      |         |                 |                         |                           |                              |               |       |

## Bluetooth

Bluetooth LE MIDI is best-effort until the master spec's open question O71 is settled (see
[open questions](../specs/versions/v2/master-spec.md#12-open-questions-carried-forward)): it
depends on whether the operating system exposes the reference controller's Bluetooth MIDI to
Chromium, and on how much jitter it has. The app reads such a controller through the same Web MIDI
port, and the session applies the USB correction to it, since Web MIDI does not say how a device
is connected. `CONNECTION_LATENCY_SECONDS['bluetooth-le']` exists and is tested, but nothing in a
session uses it today.

If a Bluetooth connection works, run the same procedure over it and record it as its own row.
The spread of `beatOffsetMs` (not just its median) shows the jitter. A connection delay above
the USB one would need a way to tell the connection apart before the session could use it.

## Related open item: the controller check

The master spec's §12 also asks for the transposition check to be verified on the reference
hardware: with the device's own transpose setting at C, B♭ tenor and E♭ alto, which MIDI note a
written middle C sends, whether an octave setting changes it, and what note-on velocity it uses.
That answer decides whether a manual input-transposition setting is needed. It is not a timing
constant, but it is checked on the same hardware, at the same sitting. See
[The verdict](controller-connection.md#the-verdict).
