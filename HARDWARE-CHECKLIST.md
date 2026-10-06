# MIDI controller hardware checklist (v2.0 gate)

Untracked working file: fill it in as you go, then tell Claude it's done. Claude turns the
results into the tuned constants, `docs/midi-tuning.md` results rows, the controller-check
verdict in `docs/controller-connection.md`, and the answer to O71 (Bluetooth).

Total time: about 1 h 15 min. Parts A–D need the controllers; part E doesn't.

---

## 0. Setup (10 min)

- [ ] The machine you practise on, with the **wired** speakers or headphones you practise with
      (Bluetooth headphones add a lot of output delay and would skew part B).
- [ ] Nothing heavy running (no build, no tests).
- [ ] `npm run dev`, open the printed address in Chrome/Chromium (desktop window, not a phone).
- [ ] Plug the breath controller in over USB. Click `Connect controller`, allow MIDI, pick it.
- [ ] Open DevTools → Console and paste, once per page load:

```js
const app = document.querySelector('#app').__vue_app__._instance.setupState
```

- [ ] Paste this listener too. It prints the raw MIDI note number and velocity of every note
      you play (re-paste it after plugging in another device):

```js
const midi = await navigator.requestMIDIAccess()
for (const input of midi.inputs.values())
  input.addEventListener('midimessage', (e) => {
    const [status, note, velocity] = e.data
    if ((status & 0xf0) === 0x90 && velocity > 0) console.log(input.name, 'note', note, 'velocity', velocity)
  })
```

Words used below:

- **Written pitch**: the note shown on the staff. **Concert pitch**: the note that actually sounds.
- A tenor saxophone sounds 14 semitones (an octave plus a whole step) lower than written; an alto
  saxophone sounds 9 semitones lower. The keyboard sounds as written.
- A breath controller's **transpose setting** (C, B♭, E♭) decides which MIDI note a given
  fingering sends; its **octave setting** shifts that by 12. MIDI note 60 is middle C (C4).

---

## A. Transposition check: breath controller (15 min)

What it settles: whether the app needs a manual input-transposition setting, or whether the
device's own settings are always enough.

For each device transpose setting, in the app's connection sheet run the transposition check
for the instrument profile listed, finger the note it shows, and write down what the console
printed and what the app said. Then change the device's octave setting by one step, play the same
fingering again, and note the new MIDI note. Put the octave setting back afterwards.

The app expects (a match):

| App profile           | Note shown (written) | Expected MIDI note (concert) |
| --------------------- | -------------------- | ---------------------------- |
| C MIDI keyboard       | C4                   | 60                           |
| B♭ tenor saxophone    | C5                   | 58                           |
| E♭ alto saxophone     | C5                   | 63                           |

| Device transpose setting | App profile    | MIDI note sent | Velocity | App verdict (match / octaves / semitones + suggestion) | Note after octave change |
| ------------------------ | -------------- | -------------- | -------- | ------------------------------------------------------ | ------------------------ |
| C                        | C keyboard     |                |          |                                                        |                          |
| B♭                       | B♭ tenor sax   |                |          |                                                        |                          |
| E♭                       | E♭ alto sax    |                |          |                                                        |                          |

- [ ] Velocity: play the same note very softly, then hard. Does the velocity change, or is it
      fixed? Range seen: ______
- [ ] USB keyboard: profile `C MIDI keyboard`, play the shown middle C → expect 60 and "match".
      Result: ______

---

## B. Timing: once per device (about 15 min each)

Do B1–B3 with the breath controller, then again with the USB keyboard.

### B1. Output delay (1 min)

- [ ] After `Connect controller`, in the console: `app.workspace.audio.outputLatency() * 1000`
      → ______ ms
- [ ] Second opinion:

```js
const probe = new AudioContext(); await probe.resume()
await new Promise((done) => setTimeout(done, 1000))
console.log('base', probe.baseLatency * 1000, 'output', probe.outputLatency * 1000); await probe.close()
```

→ base ______ ms, output ______ ms

### B2. Playing on the click (3 min)

- [ ] Tempo 60 BPM, click on. Start a session.
- [ ] From the first beat after the count-in, play one short note exactly on every click for
      about 2 minutes, ignoring the staff (any note; play at least every 30 s or the session
      ends by itself).
- [ ] Click `Stop`, then paste the readout (below). Note the **median** of `beatOffsetMs`
      (positive = late) and how widely it spreads: median ______ ms, spread ______ to ______ ms.

### B3. Playing the phrases (5 min)

- [ ] Tempo 100 or 120 BPM. Start a session.
- [ ] A few phrases on time (each note you play right should turn the "acknowledged" colour),
      then a few phrases a little early, then a few a little late.
- [ ] `Stop`, paste the readout. Look at `noteOffsetMs` and `nearestLit`:
  - notes you felt were in time but stayed unlit: ______
  - notes clearly early or late that still lit: ______

Don't change the 150 ms early / 200 ms late windows yourself: they are rule text you approved.
Just report what you saw.

### The readout (paste after Stop)

```js
const { deriveExpectedNotes } = await import('/src/domain/acknowledgement/expected-note.ts')
const key = (id) => `${id.phraseNumber}:${id.measureIndex}:${id.eventIndex}`
const rows = []
for (const record of app.sessionController.state.lastHistory.phrases()) {
  const beat = 60 / record.tempo
  const expected = deriveExpectedNotes(record.outcome.result.timeline, {
    phraseNumber: record.phraseNumber, startSeconds: record.startedAt, tempoBpm: record.tempo,
  })
  const lit = new Set(record.acknowledgements.map(key))
  for (const note of record.playedNotes) {
    const sincePhrase = note.onsetAt - record.startedAt
    const nearest = expected.filter((c) => c.pitch === note.pitch)
      .sort((a, b) => Math.abs(a.onsetSeconds - note.onsetAt) - Math.abs(b.onsetSeconds - note.onsetAt))[0]
    rows.push({
      phrase: record.phraseNumber, pitch: note.pitch, velocity: note.velocity,
      beatOffsetMs: Math.round((sincePhrase - Math.round(sincePhrase / beat) * beat) * 1000),
      noteOffsetMs: nearest ? Math.round((note.onsetAt - nearest.onsetSeconds) * 1000) : null,
      nearestLit: nearest ? lit.has(key(nearest.identity)) : false,
    })
  }
}
console.table(rows)
```

Tip: right-click the table → "Copy object", or just screenshot it, and give it to Claude.

### Results

| Device           | Output delay (B1) | Median click offset (B2) | Spread (B2) | Unlit-but-in-time / lit-but-off (B3) | Notes |
| ---------------- | ----------------- | ------------------------ | ----------- | ------------------------------------ | ----- |
| Breath ctrl, USB |                   |                          |             |                                      |       |
| USB keyboard     |                   |                          |             |                                      |       |

---

## C. Bluetooth MIDI (O71) (15 min)

- [ ] **Computer:** pair the breath controller over Bluetooth in the system settings. Does it
      appear under `Connect controller` in Chrome? ______
  - If yes: run B2 over Bluetooth and add a row; the spread shows the jitter.
  - If no: note what you tried.
- [ ] **Android phone (Chrome):** Web MIDI only works on a secure (https) page, and the VPS
      still runs an old build. Either ask Claude to prepare a deploy of the current main (you run
      `scripts/vps.sh`), or use Chrome's USB port forwarding (`chrome://inspect`) to open the
      dev server as `localhost` on the phone. Then note:
  - connected over Bluetooth or USB (OTG)? ______
  - did Chrome see the controller (some phones need the controller's own app or a MIDI-BLE
    connector app first)? ______
  - do played notes light up, and does it feel in time? ______

---

## D. Session sanity with the real controller (10 min)

- [ ] Start a session by playing the starting note on the controller.
- [ ] **240 BPM**, busiest settings, a few phrases: any late or stuttering sound, or a phrase
      that arrives late? ______
- [ ] Mid-session, unplug the controller → the app reports it lost; plug it back within 30 s
      → the session carries on. ______
- [ ] Unplug and wait more than 30 s → the session ends. ______
- [ ] Play, then stay silent more than 30 s → the session ends (silence timeout). ______
- [ ] Between sessions, `Disconnect` → the device is forgotten; a new session starts without
      a controller until you connect again. ______

---

## E. Machine measurements (no controller; any time the machine is idle; about 10 min)

Run each and give Claude the output (or let Claude run them while you're away):

- [ ] `npm run measure:rolling` (playhead against the audio clock, main-thread blocks)
- [ ] `npm run measure:engraving` (longest main-thread task while engraving)
- [ ] `npm run measure:latency:browser` (generation times, cold run included)

---

## F. Optional (only if O105 says these block the tag)

- [ ] Open a MusicXML export in MuseScore for each instrument (saxophones transposed, keyboard not).
- [ ] Open a generated-notes MIDI and a played-notes MIDI of the same session in a DAW: do the
      phrases, tempo and markers line up?
