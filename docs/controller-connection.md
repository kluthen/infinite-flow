# Controller Connection

This document records how the player connects a MIDI controller between sessions: the header's
`controller-status` and the forms it shows, the connection sheet and its states, the
transposition check, where focus goes, how the code is split so that none of it slows the first
phrase down, and the choices made while building it. How the controller itself reads MIDI is in
[`docs/midi-input.md`](midi-input.md).

## What it is

- **`controller-status`** is one button in the workspace header, before the meter and tempo. It
  is the `Connect controller` button until a controller has connected, then a badge: the
  connected device's name, `No controller`, `MIDI access blocked`, or, during a session only,
  `Controller disconnected`. A click opens the connection sheet.
- **The connection sheet** is a modal dialog over the workspace. It asks the browser for MIDI
  access, says why it can't connect when it can't, lets the player pick one device when several
  are plugged in, runs the transposition check, and shows the connected device with `Done`,
  `Run check again`, `Choose a different device` and `Disconnect`.
- **The transposition check** shows one [written pitch](music/lexicon.md#written-pitch) of the
  current instrument profile on a short staff, and compares the note the controller sends with the
  [concert pitch](music/lexicon.md#concert-pitch) a correctly set controller would send for it.
  The **transposition** is the fixed distance between the two on a
  [transposing instrument](music/lexicon.md#transposing-instrument). The check tells the player
  whether the controller matches the profile, and if not, which controller setting to change, or
  which other profile already matches.
- **Between sessions only.** During a session, count-in included, `controller-status` is disabled
  and only shows the status; the sheet can't open.

The rules come from the master spec's
[§8, MIDI input and note acknowledgement](../specs/versions/v2/master-spec.md#8-midi-input-and-note-acknowledgement),
the [controller-connection flow handoff](../ui_ux/flows/controller-connection/handoff.md) (the
header forms, entry and exit, routing rules), the
[controller-connection screen handoff](../ui_ux/screens/controller-connection/handoff.md) (the
sheet's states, named actions, focus, check result copy and device changes) and the
[phrase-workspace handoff](../ui_ux/screens/phrase-workspace/handoff.md#components-and-content)
(`controller-status`).

## Module layout and lazy loading

The entry chunk has a size budget (`npm run verify:boundaries`, see
[The entry budget](#the-entry-budget)). Only what the header must show at once is in it; the sheet
loads on demand as its own chunk, and the check's note is drawn by the lazy VexFlow engraver.

| File                                                                  | Holds                                                                                                              | Chunk              |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------ |
| `src/midi/controller-status.ts`                                       | The status facts folded from every controller change, and the one header form read from them. Pure.                | Entry              |
| `src/components/workspace/use-controller-status.ts`                   | The facts and the form as reactive state, the form frozen while a session runs.                                    | Entry              |
| `src/components/workspace/ControllerStatus.vue`                       | The `controller-status` button: `Connect controller`, or a badge with a dot and one fixed-width label.             | Entry              |
| `src/components/workspace/use-connection-sheet.ts`                    | The sheet's host: the click (audio unlock, permission read, request), where the sheet opens, its props, its close. | Entry              |
| `src/components/workspace/sheet-close-focus.ts`                       | Where focus goes when the sheet closes. Pure.                                                                      | Entry              |
| `src/components/controller-connection/connection-sheet-contract.ts`   | The props the host hands the sheet. Types only.                                                                    | Entry (no code)    |
| `src/components/controller-connection/load-connection-sheet.ts`       | `loadConnectionSheet()`: the one dynamic import of the sheet, memoized.                                            | Entry              |
| `src/components/controller-connection/ConnectionSheet.vue`            | The dialog: title, Close, the state's body, its actions, the focus trap, Escape and the backdrop.                  | `ConnectionSheet`  |
| `src/components/controller-connection/SheetStateBody.vue`             | One state's body, copy verbatim from the screen handoff, and the device-change line.                               | `ConnectionSheet`  |
| `src/components/controller-connection/DevicePicker.vue`               | The `device-picker`: one `device-option` per input, with one roving tab stop.                                      | `ConnectionSheet`  |
| `src/components/controller-connection/CheckNote.vue`                  | The `check-note` host; loads the engraver and draws the check's written note into it.                              | `ConnectionSheet`  |
| `src/components/controller-connection/connection-sheet-model.ts`      | The sheet as a pure reducer: events in, the next model and its effects out.                                        | `ConnectionSheet`  |
| `src/components/controller-connection/connection-sheet-view.ts`       | Each state's title, action buttons and focus target, as pure data.                                                 | `ConnectionSheet`  |
| `src/components/controller-connection/use-connection-sheet-driver.ts` | Runs the reducer over the controller: feeds it events, runs its effects.                                           | `ConnectionSheet`  |
| `src/domain/controller-check/transposition-check.ts`                  | The check note, the expected concert pitch and the judgement of the played note. Pure.                             | `ConnectionSheet`  |
| `src/domain/controller-check/transposition-check-copy.ts`             | The result's wording, exactly as the screen handoff's Check result copy fixes it. Pure.                            | `ConnectionSheet`  |
| `src/notation/vexflow-check-note-engraver.ts`                         | `engraveCheckNote`, re-exported by `vexflow-engraver.ts`.                                                          | `vexflow-engraver` |

- **One door to the sheet.** `load-connection-sheet.ts` is the only file that imports
  `ConnectionSheet.vue`, and it does so dynamically: a static import anywhere else would pull the
  sheet back into the entry chunk. The promise is memoized, so the warm-up and
  every later open share one fetch; a failed fetch clears the memo and rethrows, so the next open
  tries again.
- **Warmed after mount.** `WorkspaceShell` calls `loadConnectionSheet()` once the workspace has
  mounted, so a click normally finds the chunk already loaded. A warm-up failure is not reported:
  the click retries the same loader, and a failure then propagates (the sheet closes).
- **The contract is types only.** The host and the sheet share `connection-sheet-contract.ts`,
  which holds only types, so naming the sheet's props puts no sheet code in the entry chunk.
- **The host passes the profile list in.** The check may suggest another instrument profile, so
  it needs the profile table, which the workspace already has in the entry chunk. If the sheet
  imported that table itself, the bundler would move it into a third chunk shared by the entry and
  the sheet, and the page would fetch that extra chunk at startup. The host passes
  `ADOPTED_INSTRUMENT_PROFILES` as the `profiles` prop instead, with the current `profile`, so the
  sheet chunk imports no profile table.
- **The check note is drawn by the engraver chunk.** `CheckNote.vue` loads the engraver through
  `loadVexflowEngraver()`, the loader the staff uses, waits for the notation fonts, then calls
  `engraveCheckNote`. VexFlow therefore never enters the sheet's chunk. See
  [Check Note](notation-engraving.md#check-note).

### The replay announcer behind a dynamic import

To make room in the entry chunk, the phrase replay key announcements
(`phrase-replay-announcement.ts` and the key encoder it uses, see
[Phrase replay key](phrase-workspace.md#phrase-replay-key)) moved behind a dynamic import.
`phrase-replay-announcer.ts` is their only door: `createPhraseReplayAnnouncer(log, load?)` starts
loading the module as the workspace session is composed, and announces through it once loaded.

The order of the console lines is unchanged:

- **Idle phrases.** Once the module has loaded, an accepted Idle phrase is announced at once,
  exactly where it was before. A phrase accepted before that is queued, and announced as soon as
  the module loads, in acceptance order. In practice the module has loaded long before: a
  generation is a Worker round trip.
- **Session phrases.** `createSessionController()` awaits the announcer's `loaded` together with
  the controller's own chunk, so a session runner always starts with the module loaded and each
  session phrase is announced before its output is passed on. A runner asking for the announcing
  sink before the module loaded is a wiring defect and throws.
- **A load failure is not caught.** It rejects `loaded`, which keeps the session controller from
  loading, and every Idle announcement waiting on it.

### The entry budget

The entry chunk's budget rose from 220 KiB to 224 KiB (`scripts/verify-boundaries.mjs`) for
`controller-status` and its state, which must show with the first phrase: the status fold, the
reactive status, the badge, the sheet's host and the close-focus rule. Everything else (the sheet,
its reducer, the check and its copy, and the replay announcements) loads on demand. Without moving
the replay announcements out, the entry chunk would have needed more.

## The header: `controller-status`

### Facts and forms

`useControllerStatus(midi, sessionActive)` subscribes to the controller for the workspace's
lifetime and folds every change it reports, the current one first, into four facts
(`foldControllerStatus`):

- **`state`**, the controller's latest state;
- **`everConnected`**, set for good by the first `connected` state of the page session;
- **`blocked`**, set by `denied`, cleared by any state in which access is granted (`no-device`,
  `choosing`, `opening`, `connected`, `away`), and left as it is by `requesting`, `not-requested`
  and `unsupported`, so a request in flight keeps the latest answer;
- **`seenDeviceIds`**, every input id seen this page session, once each. Its count decides whether
  `Choose a different device` shows on Connected.

`controllerStatusForm(facts, { lostInSession })` reads one form from them, the first that holds:

1. **`disconnected`** (error tone) when the controller was lost in a running session;
2. **`connected`**, the device's name, when the state is `connected`, the same device reattached by
   itself included (`opening` and `away` are not connected);
3. **`blocked`**, `MIDI access blocked` (error tone), when the latest request was refused;
4. **`no-controller`**, `No controller` (neutral), when a controller connected earlier in this page
   session;
5. **`connect`**, the `Connect controller` button, otherwise.

So, as the flow handoff's header-form table says, a later successful request replaces the
MIDI-blocked badge, and once a controller has connected the header never returns to
`Connect controller`. A controller unplugged at Idle shows `No controller` with its selection
kept, and comes back as the connected badge by itself, with no check (see
[Connected, lost and back again](midi-input.md#connected-lost-and-back-again)).

**Frozen during a session.** The form is taken synchronously when a session starts (count-in
included) and kept until it ends; the live form then shows again. The header never changes shape
while the player reads, and a refusal or a reattachment during a session shows once it ends.
`lostInSession` is always false today: the controller lost mid-session is chunk 17's (see
[What chunk 17 must know](midi-input.md#what-chunk-17-must-know)).

**The button.** `ControllerStatus.vue` is always one `btn controller-status` button, so focus can
always land on it. Each badge has a decorative `status-dot` (`is-success`, `is-neutral` or
`is-error`) and one fixed-width label, cut with an ellipsis; a connected badge also carries the
device's full name as its `title`. During a session it is disabled with its classes unchanged, so
it keeps full contrast like the other read-only controls.

### The click

`WorkspaceHeader` emits `open-connection-sheet` (only outside a session), and `WorkspaceShell`
runs `useConnectionSheet`'s `open()` synchronously, inside the click:

- **The connected badge** opens the sheet at Connected and asks the browser nothing.
- **Every other form** is the page's audio-unlock click and the MIDI request in one: it calls
  `audio.unlock()` first, then, unless the browser has no Web MIDI, `midi.permission()` and
  `midi.connect()`, and opens the sheet at Requesting access. Both calls start inside the click,
  as the browser requires for its permission prompt and for audio. On a browser without Web MIDI
  nothing is requested, and the sheet resolves at once to Unsupported browser.
- **Then the sheet loads.** The host records where it opened and the connect attempt (the
  permission promise and the connect promise), then awaits `loadConnectionSheet()`. The shell
  renders the component once loaded, with `sheetProps`. A load failure closes the sheet and
  propagates.
- **`connectionSheetOpen`** is true from the click until the sheet closes, its loading included.
  `WorkspaceShell` exposes it. Nothing reads it yet: chunk 17 uses it so that no MIDI note starts
  a session, or its count-in, while the sheet is open.

## The sheet

### A pure reducer and its effects

`connection-sheet-model.ts` holds the sheet's whole behaviour as one pure function,
`reduceSheet(model, event)`, which returns the next model and a list of effects. The model is the
stage shown, the picker's list, the device-change line (the device just unplugged, and whether it
had reached Connected), and the controller's latest snapshot.

- **Events** come from the view (`action` for a named action, `choose` for a device) and from the
  controller (`connect-settled`, `permission-known`, `controller-changed`, `note-played`), plus the
  two openings, `open-requesting` and `open-connected`.
- **Effects** are data: `connect`, `select`, `disconnect` and `abandon-connect`. The reducer never
  calls the controller; `useConnectionSheetDriver` runs the effects on it, in order, after storing
  the new model.
- **The driver** builds the model at the opening the host chose, follows the click's connect
  attempt, subscribes to the controller's changes and played notes, and tells the host once the
  stage is `closed`. Once the sheet unmounts it unsubscribes and ignores late outcomes. A rejected
  connect or select propagates, unhandled.
- **Crash early.** An action or a choice the current stage does not offer throws a
  `ConnectionSheetError`: the view never offers one, so it can only come from a bug.

Every rule can therefore be tested as plain data, with no component and no controller, and the
component specs only check that the view and the driver follow it.

### The states

| Stage         | Shows                                                                                          | Main focus                      |
| ------------- | ---------------------------------------------------------------------------------------------- | ------------------------------- |
| `requesting`  | Requesting access: Checking ("Connecting…") or Waiting for your browser ("Allow MIDI access"). | `sheet-close`                   |
| `unsupported` | Unsupported browser; `Continue without a controller`, no retry.                                | `Continue without a controller` |
| `denied`      | Permission denied; `Check again`, `Continue without a controller`.                             | `Check again`                   |
| `no-device`   | No device found; `Try again`, `Continue without a controller`.                                 | `Try again`                     |
| `picker`      | Multi-device picker; `Continue without a controller`.                                          | The picker's tab stop           |
| `check`       | Transposition check: Prompt (no action), then Result (`Continue`, `Run check again`).          | `sheet-close`, then `Continue`  |
| `connected`   | Connected: `Done`, `Run check again`, `Choose a different device` (conditional), `Disconnect`. | `Done`                          |

- **Requesting access resolves only on `connect-settled`,** from the controller's state then:
  `unsupported`, `denied`, or the inputs present (none: No device found; one: its check, selected
  unless it already is; two or more: the picker in the browser's order). `Try again` and
  `Check again` request again (`connect` effect); `Try again` resolves the same way.
- **The check selects.** Entering the check selects the device (`select` effect) unless it is
  already the controller's opening or open selection, so the header shows the connected badge as
  soon as its port is open, without waiting for the result. Closing during the check leaves it
  connected, but unchecked.
- **The first played note is the result.** Only notes from the selected, connected input reach
  the sheet (the controller reads no other port). The first note-on fills the Prompt; later notes
  are ignored until `Run check again`. A played note does nothing else while the sheet is open.
- **`Choose a different device`** shows on Connected only once more than one input has been seen
  this page session. It opens the picker with the device in use marked "(in use)".
- **`Disconnect`** closes the sheet and runs the controller's `disconnect()`. **`Done`**,
  **`Continue without a controller`**, **Close**, **Escape** and a click on the backdrop close it.

### Checking or Waiting for your browser

Requesting access has two sub-states: **Checking** while the request resolves without a prompt,
and **Waiting for your browser** while the browser's own permission prompt waits for the player.
The browser does not say when it shows its prompt, so the click also reads the `midi` permission
through the Permissions API, which never prompts, alongside the request (`midi.permission()`, see
[Technical choices made in chunk 13](midi-input.md#technical-choices-made-in-chunk-13)).

- The sheet opens at Checking.
- When the permission reads `prompt` while the stage is still `requesting`, it moves to Waiting:
  access was not yet decided when the request was made, so the browser is asking.
- `granted`, `denied` and `unknown` (a browser that can't tell) leave it at Checking. A browser
  that can't tell never shows Waiting: the sheet stays at Checking until the request settles.

### Closing while the browser asks

Closing the sheet while the controller is still `requesting` abandons the attempt
(`abandon-connect` effect, the controller's `abandonConnect()`). The browser can't withdraw its
prompt, so the request stays in flight:

- **A late "allow"** is recorded (access granted, devices listed) but selects nothing and opens
  nothing. The next click then resolves without a prompt.
- **A late "block"** switches the header to the MIDI-blocked badge, at Idle at once, and during a
  session once it ends (the header form is frozen during a session).
- **A new click before the answer** adopts the request in flight rather than asking again: the
  abandon is withdrawn, so the only device present is picked when access is granted, and the new
  sheet follows that same request.

A late answer never reopens the sheet: the reducer resolves Requesting access only while it
shows, and the driver of a closed sheet is gone.

### Device changes while the sheet is open

The sheet follows the inputs the controller reports, by stage, as the screen handoff's Device
changes while the sheet is open says:

- **Requesting access, Unsupported browser, Permission denied:** only the snapshot is kept.
- **No device found:** a device plugged in resolves as `Try again` would, with no new request.
- **Picker:** listed devices keep their place, a new one is appended and an unplugged one removed;
  an empty list becomes No device found. When the option holding the tab stop leaves, the next
  option takes it, or the previous when it was last, with focus if it had it.
- **Check or Connected, the chosen device unplugged:** the picker with the inputs present, or No
  device found, under the line "{device name} was unplugged." The sheet never switches device by
  itself. If that same device comes back while the picker or No device found shows, the sheet
  returns where it was, and the line clears:
  Connected if it had reached it (reattached, no new check, once its port is open again), else
  the check's Prompt.

### Focus

- **On open and on every state change,** focus moves to the new state's main action
  (`sheetFocusTarget`): the picker's tab stop in the picker, the primary action where there is one,
  else `sheet-close` (Requesting access, the check's Prompt). A check result counts as a state
  change.
- **Trapped.** While the sheet is open, Tab and Shift+Tab cycle through `sheet-close`, the body's
  tab stop and the actions, wrapping at both ends.
- **The picker.** One roving tab stop, on the device in use, else the first option. Arrow keys only
  move focus (Up and Left back, Down and Right on, never past either end); Enter, Space or a click
  chooses.
- **On close, by any path,** once the page has rendered without the sheet, focus moves to the
  first enabled of the session action, the phrase action and `controller-status`
  (`sheetCloseFocusTarget`). `controller-status` is always enabled outside a session, and takes
  focus when both header actions are disabled: while a phrase loads, or under an unsupported
  rhythm setting.
- **At a session end** that regenerates phrase 1 (an end during the count-in that leaves Idle
  Loading), focus also goes to `controller-status`, since both header actions are disabled then
  (see [Focus at the end](phrase-workspace.md#focus-at-the-end)).

## The transposition check

The check logic is in `src/domain/controller-check/`, pure and browser-free.

### The note shown

`checkWrittenNote(profile)` picks the C nearest the middle of the profile's written range (the
concert range shifted by the profile's chromatic transposition), the lower C on a tie:

| Profile                | Written range       | Check note                                     | Expected concert pitch |
| ---------------------- | ------------------- | ---------------------------------------------- | ---------------------- |
| C MIDI keyboard        | C3 to C5 (48 to 72) | C4, [middle C](music/lexicon.md#middle-c) (60) | C4 (60)                |
| B-flat tenor saxophone | C4 to C6 (60 to 84) | C5 (72)                                        | B-flat 3 (58)          |
| E-flat alto saxophone  | C4 to C6 (60 to 84) | C5 (72)                                        | E-flat 4 (63)          |

Numbers are [MIDI note numbers](music/lexicon.md#midi-note-number), with 60 as C4. A C needs no
accidental and is easy to find on any instrument, and the middle of the range is comfortable to
play. A C outside the written range throws rather than show a note the instrument can't play; no
adopted profile reaches it. The handoff only asks for "one written note from the instrument's
range": this choice was made in this chunk.

The note is engraved, never named as letters: `check-note` holds a short treble staff with that
one whole note, drawn by the score's own pipeline (see
[Check Note](notation-engraving.md#check-note)).

### The verdict

`expectedConcertPitch(profile, written)` is the written note minus the profile's chromatic
transposition (0 for the keyboard, 14 for the tenor, 9 for the alto). `judgeTranspositionCheck`
computes _d_ = played concert pitch − expected concert pitch, in semitones (positive: the
controller sounds higher), and reports:

- **`match`** when _d_ = 0;
- **`octaves`** when _d_ is a non-zero multiple of 12: the controller is off by whole
  [octaves](music/lexicon.md#octave), which its octave setting fixes;
- **`semitones`** otherwise: off by some [semitones](music/lexicon.md#half-step), which its
  transpose setting fixes. The report also names another profile that would match as it is,
  when one exists: the one whose chromatic transposition equals the current profile's minus _d_.
  For example, on the B-flat tenor saxophone a controller sending the written note untransposed
  gives _d_ = +14, and the C MIDI keyboard profile (transposition 0) would match it.

The candidates for that suggestion are the `profiles` the host passed in; the module imports no
profile table. A played value that is not an integer from 0 to 127 throws.

`transpositionCheckCopy(report, profile)` turns a report into the screen handoff's
[Check result copy](../ui_ux/screens/controller-connection/handoff.md#check-result-copy), word for
word: the result line, the suggestion line, and the other-profile line when there is one. The
distance reads "{n} semitone(s)" below an octave, "{n} octave(s)" for a multiple of 12, and
"{n} semitones ({octaves} octave(s) and {remainder})" otherwise.

**Still open.** The master spec's §12 asks which note a written middle C actually sends on the
reference hardware at each device setting. That answer decides whether a manual
input-transposition setting is also needed. The check is built; that verification closes before
the v2.0 gate.

## How it's tested

- **Unit.** The status fold and form (`tests/unit/midi/controller-status.spec.ts`), the reactive
  status and its session freeze, the badge, the close-focus rule, the replay announcer, the
  shell's click and close focus; the reducer, every state, named action and device change
  (`tests/unit/components/controller-connection/`); and the check with offsets of 0, ±12, ±2, ±14
  and ±9 semitones for each profile, with its copy
  (`tests/unit/domain/controller-check/`).
- **Browser.** The sheet on the workspace harness's fake MIDI access, in every state, and the
  check note on the notation harness's real engraver.

See [Driving the connection sheet](testing.md#driving-the-connection-sheet) for the seams and the
list of specs.

## Choices made in chunk 13

These were decided in the chunk and await the owner's acceptance. The controller's own additions
are in [Technical choices made in chunk 13](midi-input.md#technical-choices-made-in-chunk-13).

- **The check note is the C nearest the middle of the written range:** C4 for the keyboard, C5
  for both saxophones.
- **The sheet is a pure reducer with effects as data,** run by a small driver, so every rule is
  tested without a component or a controller.
- **The sheet is its own lazy chunk, warmed after mount,** and the profile list is passed in by
  the host so no shared startup chunk appears.
- **The replay announcements load on demand,** with their console order kept.
- **The entry budget is 224 KiB,** up from 220 KiB, for the header's status.
- **The header form is frozen for the whole session,** count-in included. The flow handoff asks
  this for a late "block" answer; it is applied to every form change, so the header never changes
  shape while the player reads.
