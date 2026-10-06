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
- [ ] Use the **dev server**, not the Docker image or the deployed site: the console lines below
      only work on a development build. (The Docker image also blocked MIDI through its server
      header until the `midi=(self)` fix; once that fix is on main, `docker compose up -d --build`
      rebuilds it, and then the app itself, part A's verdicts included, works there too. Part B's
      readout still needs the dev server.)
- [ ] On the Linux machine itself (Debian's Chrome): `npm run dev`, open `http://localhost:5173`,
      plug the controllers into that machine. That is how the results below were taken.
- [ ] From Windows instead: in the VS Code terminal (connected to the Linux machine), run `npm run dev`. VS Code
      forwards port 5173 to Windows (check the **Ports** panel; add 5173 there if it isn't
      listed).
- [ ] In Chrome on Windows, open **`http://localhost:5173`**, exactly that: Web MIDI only works
      on `https://` or `localhost` pages, so the Linux machine's IP address won't work.
- [ ] Plug the controllers into the **Windows** PC (Chrome reads the MIDI devices of the
      machine it runs on).
- [ ] Click `Connect controller`; Chrome asks for MIDI access, allow it; pick the breath
      controller.
- [ ] Open DevTools → Console and paste, once per page load:

```js
const root = document.querySelector('#app')?.__vue_app__?._instance
if (!root) throw new Error('Not the dev server: open http://localhost:5173 after npm run dev')
const app = root.setupState
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
| 0 (C), the default       | B♭ tenor sax   | 60 (inferred from the rows below, not played) | — | expected "2 semitones higher" (not played) | not tested |
| −2 (B♭)                  | B♭ tenor sax   | 58             | 80       | **match**                                              | not tested               |
| −9                       | B♭ tenor sax   | 51 (computed)  |          | "7 semitones lower … transpose 7 semitones higher" (correct) | not tested |
| −14                      | B♭ tenor sax   | 46 (computed)  |          | "1 octave lower … octave setting 1 octave higher" (correct) | not tested |
| +3                       | B♭ tenor sax   | 63 (computed)  |          | "5 semitones higher … transpose 5 semitones lower", and suggests the E♭ alto profile (correct: alto expects 63) | not tested |
| +3                       | E♭ alto sax    | 63 (computed)  |          | **match** ("Nothing to change — you're ready to play.") | not tested               |
| +12                      | B♭ tenor sax   | 72 (computed)  |          | "14 semitones (1 octave and 2) higher … transpose 14 semitones lower", and suggests the C MIDI keyboard profile (correct: at +12 the device plays at written pitch) | — |

Results, 2026-10-06, TravelSax2 (port name "TravelSax2 MIDI 1"), over USB, Debian's Chrome on the Linux machine (dev server on localhost):

- With the device's transpose at −2 (semitones), the B♭ tenor saxophone profile's check note
  (written C5) sent MIDI 58, and the app said **match**. So at 0 the Travel Sax sends the
  fingered written note **one octave lower** (written C5 → C4, 60): a C instrument an octave
  down. −2 adds the whole step that makes it a B♭ tenor. For the E♭ alto profile (expects 63),
  the same reasoning predicts +3 at the device, or −9 with the octave raised by one. At +3 the
  tenor check said "5 semitones higher" and suggested the alto profile, which confirms 63; the
  check run with the alto profile itself then said **match**.
- At −9 and −14 with the tenor profile, the app's verdicts (7 semitones lower; 1 octave lower)
  agree with a default of 60 for written C5, so the Travel Sax's built-in octave drop is
  confirmed, and the checker's transpose and octave advice both read correctly. −14 (the
  textbook tenor value) and −9 (the textbook alto value) each land an octave low on this device,
  because its 0 already sounds an octave down.
- The device's own transpose setting was enough to reach a match: no manual input-transposition
  setting in the app was needed for the tenor, nor for the alto (+3). At +12 the device plays at
  written pitch (72 for written C5), one octave above its default, so an octave shift moves the
  note by 12 as expected; checked through the transpose setting, not the octave setting itself.
- Copy nit: "14 semitones (1 octave and 2)" lacks the unit after the remainder; it should read
  "1 octave and 2 semitones" (check result copy).
- Other notes played during the check: 59, 53, 58, 55, 57, 55, 53, 55, 57.

- [x] Velocity: the Travel Sax had a fixed-velocity option on, sending 127 on every note. With it
      unchecked, velocity follows the attack: range seen 80–116 on normal notes, plus one stray
      note at velocity 4 (note 59, likely a very soft breath attack; the app counts any velocity
      above 0 as a played note). A note is sent once at its start: breath changes during the note
      do not send a new note (they travel as control messages, which the app doesn't read).
- [ ] USB keyboard: profile `C MIDI keyboard`, play the shown middle C → expect 60 and "match".
      Result: **pending, no USB keyboard at hand yet.**

---

## B. Timing: once per device (about 15 min each)

Do B1–B3 with the breath controller, then again with the USB keyboard.

### B1. Output delay (1 min)

- [ ] After `Connect controller`, in the console: `app.workspace.audio.outputLatency() * 1000`
      → 32 ms
- [ ] Second opinion:

```js
const probe = new AudioContext(); await probe.resume()
await new Promise((done) => setTimeout(done, 1000))
console.log('base', probe.baseLatency * 1000, 'output', probe.outputLatency * 1000); await probe.close()
```

→ base 10.7 ms, output 32 ms (2026-10-06, Debian's Chrome on the Linux machine)

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
const offsets = rows.map((r) => r.beatOffsetMs).sort((a, b) => a - b)
const at = (q) => offsets[Math.min(offsets.length - 1, Math.floor(q * offsets.length))]
console.log(`B2: ${offsets.length} notes, median ${at(0.5)} ms,`,
  `middle 80 % from ${at(0.1)} to ${at(0.9)} ms, extremes ${offsets[0]} to ${offsets.at(-1)} ms`)
```

The last line printed under the table is the B2 summary: the median and spread to write down.
The table holds one row per note, for B3. Tip: right-click the table → "Copy object", or just
screenshot it, and give it to Claude.

### Results

| Device           | Output delay (B1) | Median click offset (B2) | Spread (B2) | Unlit-but-in-time / lit-but-off (B3) | Notes |
| ---------------- | ----------------- | ------------------------ | ----------- | ------------------------------------ | ----- |
| Breath ctrl, USB | 32 ms (base 10.7)  | +9 ms (90 BPM, 32 notes) | −19 to +61 ms (middle 80 %), extremes −29 to +79 | | B2 2026-10-06, Debian Chrome: no change to the delay constants |
| USB keyboard     |                   |                          |             |                                      |       |

---

## C. Bluetooth MIDI (O71) (15 min)

- [ ] **Computer:** pair the breath controller over Bluetooth in the system settings. Does it
      appear under `Connect controller` in Chrome? ______
  - If yes: run B2 over Bluetooth and add a row; the spread shows the jitter.
  - If no: note what you tried.
- [ ] **Android phone (Chrome):** Web MIDI only works on a secure (https) page. The deployed
      site needs the current main, which includes the server-header fix that lets MIDI through:
      ask Claude to prepare the deploy (you run `scripts/vps.sh`). Alternatively, use Chrome's
      USB port forwarding (`chrome://inspect`) to open the dev server as `localhost` on the
      phone. Then note:
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
