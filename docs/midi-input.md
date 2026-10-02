# MIDI Input

This document records how `src/midi/` reads the player's MIDI controller: the modules and the
ports that keep them testable, which messages count as played notes, what "connected" and "lost"
mean in code, how a lost controller comes back, how a MIDI timestamp is placed on the audio clock,
how it is tested, what later chunks add, and the choices made in each chunk. How the session uses
the controller is in [Session Engine](session-engine.md#the-session-controllers-midi-side), and the
timing constants still to tune on real hardware are in [MIDI Tuning](midi-tuning.md).

## What it is

MIDI input reads **one** MIDI controller at a time: a keyboard, a wind controller, or any device
that sends MIDI notes. It turns what the player plays into played notes on the audio clock, each
with its [concert pitch](music/lexicon.md#concert-pitch) (the note as it sounds) given as a
[MIDI note number](music/lexicon.md#midi-note-number), its velocity (how hard the note was struck,
1 to 127), its onset (when it started) and, once it ends, its release.

- **Only `src/midi/` uses Web MIDI.** `requestMIDIAccess` is called in one place,
  `web-midi-access.ts`. Both boundary checks enforce the directory (see
  [Runtime Constraints](../README.md#runtime-constraints)).
- **Asked for only by `connect()`.** Building the controller asks the browser for nothing. MIDI
  permission is requested only when the player clicks the header's `controller-status` (the
  `Connect controller` button or a badge), never at page load.
- **Every state is a normal state.** No Web MIDI, a refused permission, no device: each is a typed
  state the app works in, never an exception that reaches the page, and none of them blocks a
  session.
- **The connection sheet drives it.** The workspace session holds the controller as
  `WorkspaceSession.midi` (`src/components/workspace/create-workspace-session.ts`). The header's
  `controller-status` shows its status, and the connection sheet connects, selects and
  disconnects it (see [`docs/controller-connection.md`](controller-connection.md)).

The rules come from the master spec's
[§8, MIDI input and note acknowledgement](../specs/versions/v2/master-spec.md#8-midi-input-and-note-acknowledgement)
and the controller-connection flow's
[What "connected" and "lost" mean](../ui_ux/flows/controller-connection/intent.md#what-connected-and-lost-mean).

## The modules

| File                       | Holds                                                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `midi-message.ts`          | `parseMidiMessage(data)`: one raw message read as a note-on, a note-off or nothing. Pure.                       |
| `played-note-tracker.ts`   | `createPlayedNoteTracker()`: the held notes, keyed by pitch, and the played and ended notes they give. Pure.    |
| `midi-clock-mapping.ts`    | `midiTimestampToAudioTime(timestampMs, anchor)`: a MIDI timestamp placed on the audio clock. Pure.              |
| `midi-access-port.ts`      | The port: the slice of Web MIDI the controller depends on, as plain structural types.                           |
| `web-midi-access.ts`       | `createWebMidiAccessProvider(navigator)`: the port on the browser's Web MIDI, and the app's one access request. |
| `midi-controller-state.ts` | The controller's public shapes: its states, the device snapshot, the change it reports, its typed failure.      |
| `midi-controller.ts`       | `createMidiController({ provider, clock })`: the one controller, from the access request to the played notes.   |
| `controller-status.ts`     | The header's status facts, folded from the controller's changes, and the one header form read from them. Pure.  |

`controller-status.ts` serves the header only; it is described in
[The header: `controller-status`](controller-connection.md#the-header-controller-status).

`createWorkspaceSession` builds the controller on `createWebMidiAccessProvider(navigator)` and on
the audio transport's clock anchor (see [The audio clock](#the-audio-clock)).

## The ports

The controller talks to the browser only through `MidiAccessProvider` and `MidiAccessPort`,
declared in `midi-access-port.ts`:

- **Provider** (`MidiAccessProvider`): `isSupported()`, which answers without asking the player
  anything; `request()`, which asks for MIDI permission and resolves `granted` with the access,
  `denied` or `unsupported`; and `permission()`, which reads the MIDI permission without ever
  prompting and resolves `granted`, `prompt`, `denied` or `unknown` (`MidiPermissionState`).
- **Access** (`MidiAccessPort`): `inputs()`, the inputs present right now, and
  `onInputStateChange(listener)`, called whenever a device is plugged or unplugged or a port
  opens, with the change's timestamp.
- **Input** (`MidiInputPort`): `id`, `name` and `manufacturer`; the live `state()` (`connected` or
  `disconnected`) and `connection()` (`open`, `closed` or `pending`); `open()`; and
  `listen(listener)`, which hands over every raw message with its timestamp.

Why ports: a fake access makes every test deterministic. A test plugs and unplugs devices and
plays notes at exact times, with no hardware and no permission prompt. The browser adapter reads
Web MIDI through structural slices of its types, so the real objects fit them and hand-made fakes
fit them too.

**The browser adapter.** `createWebMidiAccessProvider(navigator)` maps Web MIDI onto the port:

- `isSupported()` checks that `navigator.requestMIDIAccess` exists, without calling it.
- `request()` makes the app's only `requestMIDIAccess` call, always with `{ sysex: false }`.
  Without Web MIDI it resolves `unsupported` without calling.
- A refusal is mapped by its name: `NotAllowedError` (the player refused) and `SecurityError` (the
  browser refused) resolve `denied`; `NotSupportedError` (the browser can't give MIDI on this
  system) resolves `unsupported`. Any other rejection is no known state, and throws a
  `WebMidiAccessError` carrying the browser's own name and message.
- `permission()` queries `navigator.permissions` for `{ name: 'midi' }` and returns the browser's
  `granted`, `prompt` or `denied`. It is `unknown` when the browser can't tell: no Permissions API,
  or a query rejected with a `TypeError` (the browser doesn't know the `midi` name). Any other
  rejection propagates as it is.
- Each browser input gets one wrapper, cached by the input object, so a port keeps its identity
  across an unplug and a replug. Outputs are never exposed.
- A `null` name or manufacturer (Web MIDI's "the system gives none") reads as an empty string.
  Both are display only.

## The message rules

`parseMidiMessage(data)` reads one raw Web MIDI message:

- **A note-on with velocity above 0 is a played note.** It is the only message that is.
- **A note-off, or a note-on with velocity 0, ends a note.** Many keyboards send the second form
  instead of a note-off. Either one is never a played note.
- **Everything else is ignored:** control change (breath data included), pitch bend, channel and
  polyphonic aftertouch (pressure on held keys), program change, SysEx and every system message.
- **Every channel counts.** MIDI carries 16 channels. Input is omni: the channel is reported but
  never filtered, and every pitch is read as concert pitch.
- **A broken message throws.** Web MIDI delivers only complete messages. An empty message, one
  that starts with a data byte, a note message that isn't exactly three bytes, or a data byte with
  its top bit set throws a `MidiMessageError`.

The played-note tracker turns those messages into played and ended notes:

- **Held notes are keyed by pitch.** A note-on holds its pitch and is reported `played` at once.
- **A note-off ends the held note** of that pitch, reported `ended` with its onset and release.
- **A new note-on for a pitch still held** ends the earlier note at the new onset, then plays the
  new one.
- **A note-off for a pitch not held is ignored.** That is normal: a key already down when the
  controller connected, for example.
- **`releaseAll(at)`** ends every held note at `at`, in onset order: at the session's end, or when
  the controller is lost.

An ended note has chunk 9's `RecordedPlayedNote` shape (`src/session/session-history.ts`), so the
session history can record it as it is. `toNoteOnOnAudioClock(note)` hands a played note to chunk
14's latency compensation (`NoteOnOnAudioClock`), with its onset unchanged.

## Connected, lost and back again

A controller is **connected** once MIDI permission is granted, one input is selected (the
player's pick, or the only device present) and that input's port is present and open. No note has
to be played first. It is **lost** when that port reports it has disconnected. This is the one
definition the header, the connection sheet and the session share (see
[What "connected" and "lost" mean](../ui_ux/flows/controller-connection/intent.md#what-connected-and-lost-mean)).

The controller's state is derived, after every change, from the permission, the selection and the
selected port's own readings:

| State           | Meaning                                                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `unsupported`   | This browser has no Web MIDI. Known from the start, without asking the player.                                              |
| `not-requested` | MIDI access was never asked for.                                                                                            |
| `requesting`    | The permission request is in flight.                                                                                        |
| `denied`        | The player or the browser refused MIDI access.                                                                              |
| `no-device`     | Access granted, nothing selected, no input present.                                                                         |
| `choosing`      | Access granted, nothing selected, inputs present: the player must pick one.                                                 |
| `opening`       | The selected input's port is being opened.                                                                                  |
| `connected`     | The selected input's port is present and open: the controller is attached.                                                  |
| `away`          | The selected input's port is disconnected (lost), failed to open, or its reattachment is held: not attached, kept selected. |

The last three carry the selected device (`id`, `name`, `manufacturer`). `subscribe(listener)`
hears every change of state or of the devices present; `onPlayedNote(listener)` hears every played
and ended note.

- **`connect()` is the only path to the request.** From `not-requested` or `denied` it asks for
  access; once access is granted it asks no more. Then, with nothing selected, it selects the only
  device present; with several it leaves the state at `choosing`. An existing selection is kept.
  It rejects with a `MidiControllerError` from `unsupported`, and from `requesting` unless it
  adopts an abandoned request (below).
- **`permission()`** reads the browser's MIDI permission through the provider, in any state, and
  never prompts. The sheet uses it to tell its Checking sub-state from Waiting for your browser.
- **`abandonConnect()`**, only while `requesting` (else it throws), marks the `connect()` in flight
  as abandoned: the player closed the sheet while the browser asks. The answer is still recorded
  (access granted or refused, devices listed), but that `connect()` then selects nothing. A
  `connect()` called before the answer adopts the request: the abandon is withdrawn, no second
  request is made, and it settles with the first one, picking the only device on a grant.
- **`select(id)`** selects a present input, replacing any selection, then listens to it and opens
  it. Notes still held on the device it replaces end at once. Only the selected port is ever
  opened or listened to: several inputs are never merged.
- **`disconnect()`** is the player's Disconnect. Notes still held end at the current audio time,
  the selection clears (the state is `choosing` or `no-device`), and an open still in flight no
  longer counts. The old port is never read again nor reattached by itself: its coming back only
  changes the device list. It throws when nothing is selected.
- **Lost.** When the selected port reports disconnected, the state is `away` and the selection is
  kept. Notes still held end at the unplug's time, placed on the audio clock.
- **The same device comes back by itself.** When the selected port reports connected again, the
  controller reattaches it with no action from the player and no check. If the browser left the
  port closed, the controller reopens it. Only the player's Disconnect clears the selection.
- **A different device is only listed.** A device plugged in while the selected one is away, or
  while another is connected, appears in the device list and is never opened or picked up.
- **`holdReattachment()`** holds back the reattachment, for a session started while the selected
  controller is away (`rule_start_while_controller_away`). While held, the state stays `away`
  whatever the port reads: the same device coming back is never opened nor read, and only the
  device list changes. The selection is kept. `select(id)` rejects with a `MidiControllerError`
  while held, so a session started without a controller never gains one. It throws unless the
  state is `away` and nothing is held yet.
- **`releaseReattachment()`** ends the hold, at the session's teardown. If the selected port is
  present, it reattaches as on a replug (reopened if the browser left it closed); if not, it stays
  `away` and reattaches when it comes back. It throws when nothing is held. The player's
  `disconnect()` also ends a hold, with the selection it held.
- **`releaseHeld(at)`** ends every held note at `at`, for the session's end. The session reads `at`
  from the audio clock directly, which can be a few milliseconds behind the last time mapped from
  the selected device's messages. Message order beats clock jitter: when the last mapped time is
  later, the notes end at that time instead, so a note pressed just before Stop never ends before
  its onset.

## The audio clock

A Web MIDI message carries a timestamp in milliseconds on the page's `performance.now()` timeline.
The session runs on the audio clock, in seconds (see
[`docs/audio-transport.md`](audio-transport.md#the-clock-anchor)). The two clocks run side by side
but are not the same clock, so every played note is mapped from one to the other.

- **A clock anchor.** `ClockAnchor` (`src/audio/audio-ports.ts`) is one simultaneous reading of
  both clocks: an audio time and the `performance.now()` time it corresponds to. The transport
  gives it as `clockAnchor()`; it throws before the audio is unlocked.
- **The mapping.** `midiTimestampToAudioTime(timestampMs, anchor)` is
  `anchor.audioTime + (timestampMs − anchor.performanceTimeMs) / 1000`. A timestamp before the
  anchor maps to an earlier audio time. A value that isn't a finite number throws a
  `MidiClockMappingError`.
- **A fresh anchor per message.** The controller reads a new anchor for each message and each
  unplug, so a slow drift between the two clocks never builds up over a long session.
- **On the scheduling timeline.** The real anchor (`web-audio-output.ts`) reads the context's
  `getOutputTimestamp()`: the audio frame heard at a given `performance.now()` time. It adds the
  same output latency the playhead reads, which puts the anchor on the timeline the clicks, the
  backing and the playhead are scheduled on. So the mapped time is the scheduling clock's time at
  the moment the note was played.
- **Latency is taken off later, once.** The mapping takes no latency off. Chunk 14's
  `compensatePlayedNote` subtracts the output latency and the connection delay from the mapped
  time (see [Latency](midi-acknowledgement.md#latency)), so the output latency is never counted
  twice.
- **A stopped audio clock.** Before the context runs, or while it is suspended, interrupted or
  closed, or while its output timestamp still reads 0, the audio clock stands still. The anchor is
  then `currentTime` at the page's `performance.now()`, read through an injected function. That is
  the defined reading of a stopped clock, not a fallback.

## Bluetooth MIDI

USB is the tested path. A Bluetooth LE MIDI controller that the operating system exposes to
Chromium is read through the same Web MIDI port, with nothing specific to it, but it is
best-effort until the master spec's open question O71 is settled (see
[open questions](../specs/versions/v2/master-spec.md#12-open-questions-carried-forward)). Its
connection delay is one of chunk 14's latency constants, but a session cannot tell a Bluetooth
device from a USB one, so it applies the USB correction to every controller (see
[MIDI Tuning](midi-tuning.md#bluetooth)).

## How it's tested

Unit tests drive the pure modules directly, and the controller through a fake MIDI access on the
fake audio rig: every message, every connection state, the lost controller and its return, and the
clock mapping with a known offset between the two clocks, the permission read, an abandoned and an
adopted request, and the player's Disconnect. The browser adapter is tested on hand-made fakes of
the Web MIDI objects and of `navigator.permissions`, and the real anchor on a recording fake audio
context.
The workspace harness injects the same fake access through its `midi` seams, and Playwright runs
the connection states, the message rules and a lost controller on the fake audio clock, repeats a
scripted run to the same recordings, checks that the production app asks for no MIDI access at
startup, and runs a smoke test on real Chromium's Web MIDI. See
[Fake MIDI access](testing.md#fake-midi-access) for how to drive them.

**The real-Chromium smoke proves little.** Headless Chromium answers `denied` even with the `midi`
permission granted, so the smoke only proves that the adapter turns the browser's answer into a
typed state. Reading a real controller is checked by hand, with `npm run dev` and a USB device.

## What later chunks add

- **Chunk 13 (built):** the connection sheet and the header's `controller-status` (see
  [`docs/controller-connection.md`](controller-connection.md)). The `controller-status` click
  calls `WorkspaceSession.audio.unlock()`, then `midi.permission()` and `midi.connect()`, in that
  order, inside the click. The sheet selects through `select(id)`, abandons a request when it is
  closed while the browser asks, and disconnects through `disconnect()`. In `no-device`, a device
  plugged in moves the controller to `choosing`, and the sheet resolves it as `Try again` would,
  with no new request.
- **Chunks 14 and 17 (built):** each played note is handed to `compensatePlayedNote` through
  `toNoteOnOnAudioClock` before matching.
- **Chunk 17 (built):** MIDI in the session (see
  [The session controller's MIDI side](session-engine.md#the-session-controllers-midi-side)). The
  starting note starts a session; a session reads the controller only if it is `connected` at the
  start. For a session started while the selected controller was away, `holdReattachment()` keeps
  it controller-less until the end. Every played note is acknowledged and every finished note
  recorded in the session history; at the end, `releaseHeld(at)` ends the held notes before the
  history closes. A controller lost in a session starts the 30-second countdown. **Raw or
  compensated times:** the history stores the latency-compensated onsets and releases, so anything
  built from it, the played-notes export included, gets compensated times (see
  [Technical choices made in chunk 17](#technical-choices-made-in-chunk-17)). The timing constants
  still to tune on real hardware are in [MIDI Tuning](midi-tuning.md).

## Technical choices made in chunk 12

These were decided in the chunk and await the owner's acceptance:

- **One input, picked by id.** The device's identity is its Web MIDI port id. Chromium keeps the
  same port object and id when the same device is unplugged and plugged back in within a page, and
  reopens a port that was open. There is no match on name or manufacturer, so two identical
  keyboards stay two distinct devices.
- **The selection lives in memory only.** It survives an unplug but not a page reload: v2 saves
  nothing to browser storage.
- **Only device present, picked by `connect()`.** With exactly one device and nothing selected,
  `connect()` selects it, so the common case needs no pick. A device plugged in later is not
  picked up on its own: the next `connect()` does it.
- **Reattach with no check.** The same port coming back is reattached and, if needed, reopened at
  once. The transposition check is not run again.
- **Held notes end when they can't end otherwise.** On an unplug they end at the unplug's mapped
  time; on a switch to another device, at the current audio time. So every played note gets a
  release.
- **A rejected access request is no state of its own.** When `request()` rejects for an unknown
  reason, the controller goes back to the stage it started from and rethrows the same error, so a
  later `connect()` can ask again.
- **A stale open changes nothing.** An open that completes after a newer one started is ignored,
  so a quick second pick always wins.
- **A failed open is `away`.** When the selected port's open rejects, the state is `away` with the
  selection kept and the error still reaches the caller, and the port's next input change (a
  replug) opens it again.
- **Message order beats clock jitter.** Web MIDI delivers a port's messages in order, so a
  message's audio time is never earlier than the last one mapped from the same selection, which
  keeps a quick release from landing before its onset when two anchors read a few milliseconds
  apart disagree.
- **No SysEx.** The request is always `{ sysex: false }`: SysEx is ignored anyway, and asking for
  it prompts a stronger permission.
- **`NotSupportedError` reads as `unsupported`.** For the player, a browser that can't give MIDI
  on this system means the same as a browser without Web MIDI.
- **One wrapper per browser input.** The adapter caches wrappers by the input object, so the
  identity the controller relies on survives a replug.
- **The anchor is on the scheduling timeline.** The output latency is added to the output
  timestamp, so compensation subtracts it once and only once.
- **A fresh anchor per message,** rather than one anchor read at unlock, so clock drift never
  builds up.

## Technical choices made in chunk 13

Chunk 13 built the connection sheet (see [`docs/controller-connection.md`](controller-connection.md))
and added `permission()`, `abandonConnect()` and `disconnect()` to the controller for it. These
choices were made in the chunk and await the owner's acceptance:

- **Checking or Waiting, from a permission query made alongside the request.** The sheet must show
  "Allow MIDI access" while the browser's own prompt waits for the player, and "Connecting…"
  otherwise, but Web MIDI never says when the browser prompts. So the click reads the `midi`
  permission through the Permissions API, which never prompts, in the same click as the request:
  `prompt` means access was not yet decided, so the browser is asking. The query starts just
  before the request, in the same click. A browser that can't tell (no Permissions API, or no
  `midi` name in it) answers `unknown`, and the sheet stays at Checking, which makes no claim
  about a prompt, until the request settles.
- **Abandon keeps the request in flight.** A browser can't withdraw a permission prompt once
  shown, so closing the sheet while it asks can't cancel the request. `abandonConnect()` only
  marks the `connect()` as abandoned: the answer is still recorded, so a later "block" shows the
  MIDI-blocked badge and a later "allow" leaves access granted, but the abandoned `connect()`
  selects nothing, and the next click resolves without a prompt. A second `connect()` while the
  request is still in flight adopts it rather than asking again, so there is never more than one
  request, and the player answers the prompt already up.
- **`connect()` rejects rather than throws.** It now returns a rejected promise from `unsupported`
  and from `requesting`, so every failure of a connect reaches its caller the same way.
- **Disconnect clears the selection.** The player's Disconnect must mean "stop using this device",
  so `disconnect()` clears the selection, and nothing reattaches when the same port comes back: it
  is only listed, like any other device. Held notes end at the current audio time, as on a switch
  of device. The old port stays listened to, but its messages are never read: only the selected
  port's are.

### What chunk 17 must know

Chunk 17 has done all three; see
[Technical choices made in chunk 17](#technical-choices-made-in-chunk-17).

- **`connectionSheetOpen`.** `WorkspaceShell` exposes it, true from the `controller-status` click
  until the sheet closes, its loading included. Chunk 17 must read it so that no MIDI note starts
  a session or its count-in while the sheet is open, phrase 1's first note included. A note played
  then reaches the sheet's check only.
- **The header form is frozen during a session.** `useControllerStatus` keeps the form the header
  showed when the session started, count-in included, until the session ends.
  `controllerStatusForm` already gives the error-toned `disconnected` form first when its
  `lostInSession` option is set, but the composable passes `false` today, and the frozen form wins
  over the live one during a session. Chunk 17 must let a controller lost mid-session show the
  disconnected badge through the freeze, while its countdown runs.
- **Suspending the reattachment stays chunk 17's.** A session started while the selected
  controller is away must stay without one (`rule_start_while_controller_away`); the controller
  still reattaches the same port by itself whenever it comes back. The frozen header already keeps
  showing `No controller` for such a session.

## Technical choices made in chunk 17

Chunk 17 wired MIDI into the session (see
[The session controller's MIDI side](session-engine.md#the-session-controllers-midi-side)) and
added `holdReattachment()` and `releaseReattachment()` to the controller. These choices were made
in the chunk and await the owner's acceptance:

- **The starting note arms the silence timer.** It is the first note played in the session, so
  the 30 seconds count from its onset. A session started by the Start click arms the timer at the
  first note played; a session in which no note is ever played never times out.
- **A reattachment re-arms the silence timer from the reattachment's time, only if it was
  armed:** if a note had been played before the loss, the 30 seconds count again from the
  reattachment, however long the player was silent before the loss. If no note had been played
  yet, the timer stays unarmed until the first note played.
- **The history stores compensated times.** Each played note's onset and release are stored with
  the latency correction taken off, the same total on both, and a played note's phrase is chosen
  by its compensated onset. So the played notes line up with the generated notes the player
  heard. With today's USB correction of 0 they equal the raw times.
- **The USB correction for every controller.** Web MIDI does not say how a device is connected,
  so a session applies `latencyCorrectionFor('usb')` to every controller. Bluetooth stays
  best-effort until O71 is settled (see [Bluetooth MIDI](#bluetooth-midi) and
  [MIDI Tuning](midi-tuning.md#bluetooth)).
- **Two new end causes,** `silence-timeout` and `controller-lost`. A session ended by a lost
  controller ends on screen exactly as a silence timeout does.
- **The reattachment is held only when the selected controller is `away` at the start** of a
  session without a controller. A session started while a port is still `opening` reads no note
  either, since the mode is fixed at the start, but holds nothing: the device attaches afterwards,
  outside the session. While held, `select(id)` rejects, and `disconnect()` ends the hold.
- **Any state other than `connected` is a loss** during a session with a controller, `opening`
  during a reopen included. The countdown runs from `audio.now()` at the change.
- **A note due while the controller was away is passed over.** When the same device comes back,
  every expected note whose onset fell between the loss and the reattachment is passed over
  (`passDueBetween(lostAt, audio.now())` on the session's acknowledgement). It is never
  acknowledged afterwards, even if its window is still open when the device returns (a long note
  that started during the gap), and it never reaches the history's acknowledgements. The next
  notes are acknowledged as usual.
- **The session runner loads with the controller.** `WorkspaceSession.loadSessionRunner()` loads
  the engine and its failure ladder as part of the controller's load, to give the entry chunk
  room: it went from 228,797 bytes to about 210.7 kB. About 9 kB of shared domain code moved to a
  separate chunk that the entry still loads at startup (see
  [The runner and the one-Worker wiring](session-engine.md#the-runner-and-the-one-worker-wiring)).
- **The connection-sheet flag reaches the controller through an event.** `WorkspaceShell` emits
  `connection-sheet-open-change` from a synchronous watcher, and `App.vue` writes it to
  `WorkspaceSession.connectionSheetOpen`, so a note that arrives right after the click already
  sees the sheet open (see [The click](controller-connection.md#the-click)).
