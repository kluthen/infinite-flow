# MIDI controller hardware checklist (v2.0 gate)

Working file: fill it in as you go, then tell Claude it's done. Claude turns the
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

- [x] Tempo 60 BPM, click on. Start a session.
- [x] From the first beat after the count-in, play one short note exactly on every click for
      about 2 minutes, ignoring the staff (any note; play at least every 30 s or the session
      ends by itself).
- [x] Click `Stop`, then paste the readout (below). Note the **median** of `beatOffsetMs`
      (positive = late) and how widely it spreads:
  - run 1 (90 BPM, 32 notes): median **+9 ms**, middle 80 % −19 to +61 ms, extremes −29 to +79 ms;
  - run 2 (42 notes): median **+2 ms**, middle 80 % −48 to +28 ms, extremes −246 to +36 ms (one
    stray early note).

Verdict: over USB the played notes already land on the click as the app hears them, so the delay
constants stay as they are. `OUTPUT_LATENCY_SECONDS` stays 0 although B1 read 32 ms: players
anticipate a click, and on this setup the two cancel out (a 32 ms correction would move the
medians to about −25 ms).

### B3. Playing the phrases (5 min)

- [x] Tempo 100 or 120 BPM. Start a session. (Run at 60 BPM: reading and playing at 120 was too
      fast for now; the windows are in milliseconds, so the tempo doesn't change the test.)
- [x] A few phrases on time (each note you play right should turn the "acknowledged" colour),
      then a few phrases a little early, then a few a little late.
- [x] `Stop`, paste the readout. Look at `noteOffsetMs` and `lit`:
  - notes you felt were in time but stayed unlit: **a few, by feel; none in the data.** Every
    played note of the right pitch inside −150/+200 ms lit. The surprising unlit notes were pitch
    slips the controller sent (75 for 63: the octave key; 59 or 57 for 58: a finger off by a
    semitone). A note lights only on its exact pitch, octave included.
  - notes clearly early or late that still lit: **early: none** (a note 331 ms early stayed
    unlit). **Late: up to about +530 ms** at 60 BPM. That is the approved rule: a note's late
    edge is the later of +200 ms and the end of its written length, cut at the next note's
    window. Long notes at slow tempos keep their window open longer.
  - The owner's feel (2026-10-06): the feedback wasn't a problem; misses were mostly the playing.
    New exercise (reading at tempo while managing breath on a controller without blow
    resistance), so some misses are the player, not the app.

Stray notes: the Travel Sax often sends short in-between notes while the fingers change position
(here pitches 50, 51, 55, often in pairs at velocity 127). The app ignores them for lighting
(wrong pitch), but they reach the review screen's played-notes view and the played-notes MIDI
export.

Don't change the 150 ms early / 200 ms late windows yourself: they are rule text you approved.
Just report what you saw.

### The readout (paste after Stop)

```js
const { deriveExpectedNotes } = await import('/src/domain/acknowledgement/expected-note.ts')
const { placeAcknowledgementWindows } = await import('/src/domain/acknowledgement/acknowledgement-window.ts')
const key = (id) => `${id.phraseNumber}:${id.measureIndex}:${id.eventIndex}`
const rows = []
for (const record of app.sessionController.state.lastHistory.phrases()) {
  const beat = 60 / record.tempo
  const expected = deriveExpectedNotes(record.outcome.result.timeline, {
    phraseNumber: record.phraseNumber, startSeconds: record.startedAt, tempoBpm: record.tempo,
  })
  const lit = new Set(record.acknowledgements.map(key))
  const windows = placeAcknowledgementWindows(expected)
  for (const note of record.playedNotes) {
    const sincePhrase = note.onsetAt - record.startedAt
    const nearest = expected.filter((c) => c.pitch === note.pitch)
      .sort((a, b) => Math.abs(a.onsetSeconds - note.onsetAt) - Math.abs(b.onsetSeconds - note.onsetAt))[0]
    // The expected note whose window holds this onset, if any; else the nearest of that pitch.
    const holder = windows.find((c) => c.pitch === note.pitch
      && c.window.opensAtSeconds <= note.onsetAt && note.onsetAt <= c.window.closesAtSeconds)
    const target = holder ?? nearest
    rows.push({
      phrase: record.phraseNumber, pitch: note.pitch, velocity: note.velocity,
      beatOffsetMs: Math.round((sincePhrase - Math.round(sincePhrase / beat) * beat) * 1000),
      noteOffsetMs: target ? Math.round((note.onsetAt - target.onsetSeconds) * 1000) : null,
      inWindow: Boolean(holder),
      lit: holder ? lit.has(key(holder.identity)) : false,
    })
  }
}
console.table(rows)
const offsets = rows.map((r) => r.beatOffsetMs).sort((a, b) => a - b)
const at = (q) => offsets[Math.min(offsets.length - 1, Math.floor(q * offsets.length))]
console.log(`Click offsets: ${offsets.length} notes, median ${at(0.5)} ms,`,
  `middle 80 % from ${at(0.1)} to ${at(0.9)} ms, extremes ${offsets[0]} to ${offsets.at(-1)} ms`)
```

The last line printed under the table is the B2 summary: the median and spread to write down
(meaningful for B2 only, where every note is played on a click). The table holds one row per
note, for B3: `noteOffsetMs` is measured from the expected note whose window holds the played
note (else the nearest one of that pitch), `inWindow` says whether any window held it, and `lit`
whether that expected note lit. Tip: right-click the table → "Copy object", or just screenshot
it, and give it to Claude.

### Results

| Device           | Output delay (B1) | Median click offset (B2) | Spread (B2) | Unlit-but-in-time / lit-but-off (B3) | Notes |
| ---------------- | ----------------- | ------------------------ | ----------- | ------------------------------------ | ----- |
| Breath ctrl, USB | 32 ms (base 10.7)  | +9 ms (run 1, 90 BPM), +2 ms (run 2) | −19 to +61 / −48 to +28 ms (middle 80 %) | none unlit in the data; late notes lit up to ~+530 ms on long notes (by rule) | 2026-10-06, Debian Chrome: no change to the delay constants |
| Breath ctrl, Bluetooth LE | — | ~+80 ms (first 5 single-pitch notes) | coarse: notes arrive in batches | not run | 2026-10-06, Debian Chrome; see part C |
| USB keyboard     |                   |                          |             |                                      | pending: no USB keyboard at hand yet |

---

## C. Bluetooth MIDI (O71) (15 min)

- [x] **Computer:** pair the breath controller over Bluetooth in the system settings. Does it
      appear under `Connect controller` in Chrome? **Yes** (2026-10-06, Travel Sax over
      Bluetooth LE, Debian's Chrome on the Linux machine). It connects and the right notes light.
  - If yes: run B2 over Bluetooth and add a row; the spread shows the jitter.
    - Run: 35 notes at 60 BPM. The first 5 were one pitch on the click: +80, +164, +32, +26,
      +82 ms (median **+80 ms**, against +2 to +9 ms over USB). After that the staff was
      followed, so off-beat notes blur the summary (median 131 ms, middle 80 % −16 to +309 ms).
    - Notes arrive in batches: notes played close together carry the exact same time
      (three at 32 ms; pairs at 447, 285, 131 and 204 ms). Over USB the same pairs arrived about
      11 ms apart. So Bluetooth adds roughly 70–80 ms here, and its timing is coarse.
    - The app can't tell Bluetooth from USB (Web MIDI exposes no transport), so it always applies
      the USB correction; `CONNECTION_LATENCY_SECONDS['bluetooth-le']` (12.5 ms) is never used.
    - The owner's feel: workable; the looser feedback wasn't a problem.
    - Outcome: O71 answered (USB is the tested path for v2.0, Bluetooth best-effort). The
      owner's idea, a voluntary "Bluetooth" checkbox in the device dialog that gives a little
      more grace, is recorded in the spec decisions.
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

All checked 2026-10-06, Travel Sax over USB, Debian's Chrome on the Linux machine.

- [x] Start a session by playing the starting note on the controller.
- [x] **240 BPM**, busiest settings, a few phrases: any late or stuttering sound, or a phrase
      that arrives late? **None.**
- [x] Mid-session, unplug the controller → the app reports it lost; plug it back within 30 s
      → the session carries on. **Yes: countdown shown, session recovered.**
- [x] Unplug and wait more than 30 s → the session ends. **Yes.**
- [x] Play, then stay silent more than 30 s → the session ends (silence timeout). **Yes.**
- [x] Between sessions, `Disconnect` → the device is forgotten; a new session starts without
      a controller until you connect again. **Yes.**

---

## E. Machine measurements (no controller; any time the machine is idle; about 10 min)

Run each and give Claude the output (or let Claude run them while you're away).

Run by Claude 2026-10-06 on the Linux machine, Chromium 153, with the machine partly busy (1-min
load 1.4–1.8 on 12 threads; another program held one core). A busy machine can only make the
figures worse.

- [x] `npm run measure:rolling` (playhead against the audio clock, main-thread blocks)
  - Playhead at 120 BPM, 150 barlines over 5 min: the band's measure changes at most 14.5 ms
    after the heard barline (p95 12.1, median 6.7, at most 11.2 ms before it), none over 20 ms:
    **met**. Counted to the next animation frame, one frame later by construction: max 30.4 ms,
    94 of 150 over 20 ms, as in the September runs.
  - Main thread at 240 BPM, densest setting, 60 s: no task or animation frame of 50 ms or more;
    longest timer wait 36.1 ms (2560 × 1440) and 33.5 ms (1920 × 1080), against the 200 ms
    scheduler window: **met**.
- [x] `npm run measure:engraving` (longest main-thread task while engraving)
  - Longest main-thread block 49.3 ms (2560 × 1440) and 52.8 ms (1920 × 1080, the first
    generation), against 200 ms: **met** (September: 90 ms).
- [x] `npm run measure:latency:browser` (generation times, cold run included)
  - Cold worst case (Sixteenth / Heavily varied / Sparse / Active displacement / Build):
    **277 ms** in the page (321 ms from the click), against the 250 ms working target, which is
    a goal, not a gate (owner, 2026-09-30). September: 829–951 ms. Straight / Edge cold 255 ms;
    default cold 42 ms; warm 38–77 ms.
  - First generation after a one-control change into the worst case: 206–229 ms in the page
    (317–326 ms from the click); warm-ups 78–245 ms.
  - The theme control answered within 36 ms during the worst-case cold run.

---

## F. Optional (after the tag, as a v2.0.x hand-check note: spec D193)

Deferred (2026-10-06): the owner has no MuseScore account or DAW at hand. These two checks are to
be validated at a later date and do not block the v2.0 tag (O105).

- [ ] Open a MusicXML export in MuseScore for each instrument (saxophones transposed, keyboard not).
- [ ] Open a generated-notes MIDI and a played-notes MIDI of the same session in a DAW: do the
      phrases, tempo and markers line up?

---

# v3.0 hand checks

Build plan [§5](specs/versions/v3/build-plan.md#5-hand-checks): each check is written here by the
chunk that needs it, and run at that chunk or at the v3.0 gate.

## H2. Start-up wait (chunk 7; about 10 min)

Measurement M2 on the reference machine, then the Chromium tablet if at hand. The start-up wait is
how long the first draw waits for the saved data before starting from the defaults; it is set at
2 s (`STARTUP_WAIT_MS` in `src/storage-bootstrap.ts`) and must stay well above the slowest read.

- [ ] On the reference machine, idle (no `atd audit`, no other test run): `npm run
      measure:startup-read`. It times the load cold (first load after a browser start) and warm,
      with 0, 10, 100 and 500 kept sessions, and prints a table.
- [ ] Copy the table, with the machine and the date, into
      [`docs/storage.md`](docs/storage.md#the-start-up-wait-m2). If the slowest figure is above
      about a quarter of the wait (500 ms), tell the wave driver: the wait may need raising, up to
      2 s at most.
- [ ] Tablet, if at hand: open the app (`npm run dev -- --host`, or the deployed app), change a
      few settings in an earlier visit once saving exists (chunk 7b), then close the browser
      fully and reopen the app: the workspace appears once, already in the saved theme and
      values, with no flash of the defaults. Note how long the page showed only its background.

## H4. Remembered controller (chunk 22; about 10 min)

The Travel Sax over USB, the reference machine, Chromium, a production build or `npm run dev`. The
app reattaches the last controller you chose at load, without asking, only when Chromium already
allows MIDI access for the page; it matches it on the port id Chromium gives it, never by its
name.

- [ ] Connect the Travel Sax through `Connect controller` (allow MIDI access if Chromium asks),
      close the sheet, then reload the page: the header shows the Travel Sax's badge with no
      prompt and no sheet. If it shows `Connect controller` or `No controller` while the Travel
      Sax is plugged in, Chromium did not keep the port's id across the reload: note it for the
      owner (a spec question; the app never matches by name instead).
- [ ] Right after the reload, before any click or key press, play a few notes on the Travel Sax:
      nothing happens and nothing sounds. Click `Generate phrase` (the page's first click), then
      play the starting note: a session starts, the count-in's clicks audible. Chromium made the
      sound from the note itself, after that click; if the count-in is silent or nothing starts,
      note it for the owner.
- [ ] Unplug the Travel Sax: the badge reads `No controller`; plug it back in: its badge returns,
      no sheet.
- [ ] Open the sheet from the badge, `Disconnect`, reload: the header shows `Connect controller`
      and nothing reattaches.

## H6. Pre-generation at 240 BPM (chunk 24; about 10 min)

On the reference machine, then the tablet on battery if at hand. Production build or `npm run dev`;
pre-generation is on unless the page URL has `?pregeneration=off`.

- [ ] Set the tempo to 240 BPM and a busy setting (Sixteenth on a wide window). Generate, then
      press Start **right after** phrase 1 appears, a few times: the session starts at once and
      phrase 2 arrives on time.
- [ ] Generate, wait **a few seconds**, then Start, a few times: phrase 2 joins phrase 1 smoothly
      (it continues from phrase 1's last note and chord instead of starting afresh).
- [ ] Change a control, wait, Start: no phrase made before the change is played.
- [ ] Tablet on battery, for information (M4): note the battery cost of about ten changes at
      Idle, each followed by a few seconds' wait (up to four background generations each).
- [ ] M4 on the reference machine: `npm run test:sweep`, copy the `SWEEP-M4` lines into
      [`docs/generation-latency.md`](docs/generation-latency.md#phrase-2-after-pre-generation-m4-2026-10-12).
