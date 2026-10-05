# Session Engine

This document records how `src/session/` decides what a running practice session asks for, shows
and ends: its boundary, the timed events it takes and the outputs it answers with, the look-ahead
deadlines, the failure ladder, the struggling-generator notice, the settings lock and note-density
step-down, the settings-mutation engine and settings changes at a phrase boundary, the
multi-phrase tension arc, how tempo stays out of generation, adaptive tempo, the runner that
connects the engine to the app's one generation Worker, the session history that records every
phrase that sounded and the notes the player played, the session controller that runs a session on
the workspace from the Start click (or the starting note) to its end, with its MIDI side and the
Review that opens at the end, what later chunks add, and the choices made while building it.

A session plays one [phrase](music/lexicon.md#phrase) after another without stopping. Phrase 1 is
the phrase already on screen at Idle. While a phrase sounds, the next one is generated and shown
ahead of it (the read-ahead), so the player always sees what comes next.

## Boundary

- **Pure.** The engine is a deterministic state machine over immutable state kept in a closure.
  The same start and the same event list always give the same outputs.
- **No clock read.** Every event carries its own time: **audio time**, plain seconds on the audio
  clock, the way `src/domain/acknowledgement/acknowledgement-window.ts` takes it. The engine never
  asks what time it is; the runner (below) stamps each result it feeds back.
- **No browser API, no Vue.** Its only seams are the request-id and seed providers
  (`GenerationIntentProviders`), the window-width reading
  (`Pick<ViewportWidthProvider, 'isBelowTabletLandscape'>`) and the display reading
  (`SessionDisplayReading`, read only for a settings change; see
  [Settings changes at a phrase boundary](#settings-changes-at-a-phrase-boundary)).
- **Immutable outputs.** Every output is deep-frozen, and attempt ids are unique per engine,
  increasing from 1.
- **Caller bugs throw.** An event the engine cannot accept throws a typed `SessionEngineError`
  (see [Choices made while building it](#choices-made-while-building-it) for the list).

| File                              | Holds                                                                                                                             |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `session-types.ts`                | The contract: `AudioTime`, `SessionEndCause`, `SessionPhrase`, `SessionStart`, `SessionEvent`, `SessionOutput`, the error.        |
| `session-timing.ts`               | The measure length and the look-ahead deadlines, as plain arithmetic.                                                             |
| `failure-ladder.ts`               | The ladder's rungs, the attempt in flight, the accepted phrase and the repeat.                                                    |
| `session-intents.ts`              | The settings freeze and how each attempt's intent is built (density, register, carry-in).                                         |
| `struggling-notice.ts`            | The struggling-generator notice as a pure reducer.                                                                                |
| `session-engine.ts`               | `createSessionEngine(deps, start)`: the state machine that ties the others together.                                              |
| `session-engine-state.ts`         | The engine's state between events, and the decided phrase a settings change can take back.                                        |
| `settings-mutation-scales.ts`     | `MUTATION_SCALES`: the scale of every mutable setting, as data, and `scaleNeighbours`.                                            |
| `settings-mutation.ts`            | The pure seeded mutation: the cadence, `mutationCandidates`, `mutateSettings` and the flag.                                       |
| `session-mutation-step.ts`        | `landingMutation`: whether a mutation lands on the phrase about to be requested, and its output.                                  |
| `session-settings-change.ts`      | A look-ahead's basis, each rung's attempt after a change, and the discard rule of a settings change.                              |
| `carry-in-adaptation.ts`          | `adaptCarryIn`: a carry-in adapted to settings that changed at the join, or a standalone phrase.                                  |
| `tension-arc-cycle.ts`            | The multi-phrase tension arc: a phrase's cycle step, and the settings it is generated under.                                      |
| `adaptive-tempo.ts`               | The pure adaptive-tempo schedule: +5 BPM every two counted phrases, never past 240 (see [Adaptive tempo](#adaptive-tempo)).       |
| `session-tempo-step.ts`           | Where the engine meets the schedule: `fixDueTempo`, `soundingTempo`, `onController` and each phrase's fixed tempo.                |
| `session-runner.ts`               | `createSessionRunner(deps, start)`: executes the engine's requests (see [The runner](#the-runner-and-the-one-worker-wiring)).     |
| `session-history.ts`              | `createSessionHistory(settings, wallClock)`: records every phrase that sounded (see [Session history](#session-history)).         |
| `session-history-played-notes.ts` | `withPlayedNotes(records, notes, acknowledgements)`: places the played notes and acknowledgements in the phrase records, on read. |
| `session-history-export.ts`       | The encoder inputs built from a recorded session (see [Handing a session to the encoders](#handing-a-session-to-the-encoders)).   |

The session controller's pure pieces live here too, under the same boundary (see
[The session controller](#the-session-controller)):

| File                          | Holds                                                                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `session-start-conditions.ts` | `sessionStartBlocker(facts)`: the first start condition that fails, or `null`.                                              |
| `count-in-display.ts`         | `countInDisplayAt(startAt, tempo, now)`: each count-in beat's state, and when the display changes.                          |
| `session-agenda.ts`           | `createAudioTimeAgenda()`: actions due at audio times, fired when the clock reaches them.                                   |
| `session-window.ts`           | The session window rule: the layout a session holds, and whether a window change ends it.                                   |
| `rolling-display.ts`          | The rolling display as a pure plan: the playhead's measure, what each system shows, what waits.                             |
| `session-browser-ports.ts`    | The ports of the browser capabilities a session uses: the two screen locks, page visibility, window.                        |
| `starting-note.ts`            | `startingNoteOf(timeline, written)`: the note that starts a session from a MIDI controller, and its label.                  |
| `session-acknowledgement.ts`  | `createSessionAcknowledgement(options)`: one session's acknowledgement, phrase by phrase, and its compensated played notes. |
| `session-midi-timers.ts`      | The silence timeout and the reconnection countdown as pure arithmetic on the audio clock.                                   |

`createSessionEngine(deps, start)` takes the start time, the chosen settings, phrase 1 (its
intent and its successful outcome), the settings-mutation flag (`SessionStart.mutation`),
whether adaptive tempo runs (`SessionStart.adaptiveTempo`; see [Adaptive tempo](#adaptive-tempo))
and whether the multi-phrase tension arc runs (`SessionStart.multiPhraseTensionArc`; see
[Multi-phrase tension arc](#multi-phrase-tension-arc)).
It returns `outputsAtStart` and `handle(event)`, which returns the outputs of that one event.

## Events and outputs

Every event has an `at`, its audio time.

| Event                                      | Meaning                                                                                                                                                                                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `count-in-over`                            | The count-in is over and phrase 1 starts sounding. Sent once.                                                                                                                                                                         |
| `phrase-started-sounding { phraseNumber }` | Phrase N (2 or more) starts sounding. It must be the next decided phrase.                                                                                                                                                             |
| `generation-result { attemptId, outcome }` | The generate seam answered an attempt with a `GenerationOutcome` (a success or a generation failure).                                                                                                                                 |
| `generation-crashed { attemptId }`         | The generate seam rejected: a Worker crash on that one request, or a dead Worker. A failed attempt, never an end.                                                                                                                     |
| `fit-result { attemptId, fits }`           | Whether an attempt's generated phrase fits the staff.                                                                                                                                                                                 |
| `settings-change { settings }`             | New complete settings, in effect from now, from an automatic source other than the engine's own mutations (see [Settings changes at a phrase boundary](#settings-changes-at-a-phrase-boundary)). No part of the app sends it yet.     |
| `controller { attached }`                  | A controller lost mid-session goes away (`attached` false) or reconnects (see [Adaptive tempo](#adaptive-tempo)).                                                                                                                     |
| `tick`                                     | Time has reached `at`; lets the engine see a deadline pass.                                                                                                                                                                           |
| `end { cause }`                            | The session ends: `'stop'` (the player's Stop), `'hidden-tab'` (the tab became hidden), `'staff-not-shown'`, `'silence-timeout'` (more than 30 s without a played note) or `'controller-lost'` (the controller not back within 30 s). |

| Output                                                                          | Meaning                                                                                                          |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `request-generation { attemptId, phraseNumber, step, retry, intent, deadline }` | Generate this intent. `step` is `'carry-in'` or `'standalone'`; `retry` counts the attempts before this one.     |
| `check-fit { attemptId, phraseNumber, outcome, intent }`                        | Check whether this generated phrase fits the staff. `intent` is this attempt's own, which differs per rung.      |
| `phrase-ready { phrase }`                                                       | The phrase to show next as read-ahead, repeats included.                                                         |
| `phrase-sounding { at, phrase, tempo }`                                         | A phrase started sounding, with its full record and the tempo it plays at.                                       |
| `struggling-notice { visible }`                                                 | Show or hide the struggling-generator notice.                                                                    |
| `wake-at { at }`                                                                | Send a `tick` at this time: the next deadline.                                                                   |
| `ended { at, cause, phase, soundedPhraseCount }`                                | The session ended, during the `'count-in'` or while `'running'`, after this many phrases started sounding.       |
| `settings-changed { phraseNumber, settings, cause, … }`                         | New settings apply from this phrase on. `cause` is `'mutation'` (with `setting`, `from`, `to`) or `'automatic'`. |
| `phrase-discarded { phraseNumber }`                                             | A decided look-ahead phrase, not yet on screen, was dropped and is requested again with the new settings.        |
| `phrase-tempo { phraseNumber, tempo }`                                          | The tempo phrase N (2 or more) plays at, fixed at its look-ahead deadline. Output once per phrase.               |

The phrase record, `SessionPhrase`, is `{ phraseNumber, origin, intent, outcome, repeatOf? }`.
`origin` is `'idle'` (phrase 1), `'carry-in'`, `'standalone'` or `'repeat'`. The repeat mark is
internal: no view shows it.

Each `phrase-ready` phrase with origin `'carry-in'` or `'standalone'` prints its
[phrase replay key](phrase-workspace.md#phrase-replay-key) to the developer console once, a
look-ahead phrase readied but never sounded included. A repeat prints none, since it generates
nothing new. The engine itself stays pure: the workspace composition root wraps the runner's
output sink to print the key before forwarding the output unchanged.

## Timing

A **measure** (also called a **bar**) is one group of [beats](music/lexicon.md#beat); the session
is in 4/4 ([meter](music/lexicon.md#meter)), so a measure is four beats. One measure lasts
`4 × 60 / tempo` seconds, that is `240 / tempo`: 1 s at 240 BPM, 4 s at 60 BPM
([tempo](music/lexicon.md#tempo)). A phrase is four measures. The **count-in** is the one measure
of clicks before phrase 1 starts, so the player can feel the tempo.

- **At start**, phrase 2 is requested at once. Its deadline is the end of the count-in: start time
  plus one measure. Phrase 2 is then ready as read-ahead the moment phrase 1 starts sounding.
- **When phrase 1 starts sounding** (`count-in-over`), nothing new is requested: phrase 2 already
  was.
- **When phrase N (2 or more) starts sounding** at time `s`, phrase N+1 is requested with its
  deadline at `s` plus three measures at phrase N's own tempo: the start of phrase N's last
  measure, which leaves at least one measure of read-ahead on screen.
- **Every event except `end`** first runs the deadline check for its time, then fixes the pending
  phrase's tempo once its deadline is reached (see [Adaptive tempo](#adaptive-tempo)). A result
  that arrives at or after the deadline is too late.
- The engine outputs `wake-at` once per deadline, so its caller can send a `tick` then even when
  nothing else happens.

## Failure ladder

Each look-ahead phrase has one attempt in flight at a time, climbing these rungs:

1. **First attempt:** generated with the **carry-in** of the phrase before, with a fresh seed. A
   carry-in is what a phrase hands to the next one so the line continues across the join: its last
   sounding pitch, its [register window](music/lexicon.md#register-window), its final chord and the
   phrase number (see
   [joins between session phrases](music/pitch-planner-validation.md#joins-between-session-phrases-v2)).
2. **Up to three retries** after a failure, each with a fresh seed and the same carry-in.
3. **One standalone retry:** no carry-in, a fresh seed, and the register fixed to the window the
   session already uses ([register](music/lexicon.md#register-1)).
4. **Repeat.** If no valid phrase exists at the deadline (the ladder is exhausted, or an attempt is
   still in flight), the phrase before is repeated as the next phrase, with origin `'repeat'`. The
   repeat is decided at the deadline, never earlier.

A failure is a generation failure outcome, a `generation-crashed`, or a fit result of `false`. A
new rung is requested only before the deadline. A success must pass its fit check before it
becomes `phrase-ready`. The session never ends because of a failure. The phrase after a standalone
phrase or a repeat carries in from that record's intent and outcome, with its own phrase number.

## Struggling notice

The engine counts repeats in a row, in the order phrases are decided.

- The **second repeat in a row** shows the notice (`visible: true`) when it is decided, at its
  deadline.
- Further repeats keep it shown.
- A generated phrase (carry-in or standalone) resets the count; the notice clears
  (`visible: false`) when that phrase starts sounding.
- The end of the session clears a shown notice.

## Settings lock and density step-down

- **Locked settings.** The chosen settings (`controls` and `musicalProfile`, with the written tonal
  center) are copied and deep-frozen at start. Every attempt's intent is built from that copy, so a
  change the caller makes to its own objects later cannot reach the session. The player cannot
  edit them during a session. From v2.1 the settings in effect can still change, but only at a
  phrase boundary, through the engine's own mutations or a `settings-change` event (see
  [Settings mutation and changes at a phrase boundary](#settings-mutation-and-changes-at-a-phrase-boundary)).
- **Density only steps down.** [Note density](music/lexicon.md#note-density) is the main note
  length of the phrase. Sixteenth notes are not generated below the tablet-landscape width (see
  [Note density below `bp-tablet-landscape`](phrase-workspace.md#note-density-below-bp-tablet-landscape)), so each
  attempt's density is resolved with `resolveGeneratedNoteDensity` from the chosen density, the
  window width read when the request is built, and the session's step-down memory. Once any
  request for a chosen Sixteenth is built as Eighth, every later phrase of the session stays
  Eighth, even if the window widens again. A chosen Eighth or Quarter never changes.
- Phrase 1 never sets the memory: it was generated at Idle. Phrase 2's request is built at start
  from the width then.

## Tempo is transport-only

Tempo only sets the times of the measure grid; it never reaches an intent's musical content. The
same event list scaled to 60, 120 and 240 BPM gives identical request intents, compared without
`controls.tempo` (tempo is a field of `GenerationControls`, so it travels in the intent unchanged).

## Adaptive tempo

Adaptive tempo lets a session speed up on its own, on a flat schedule that never looks at what the
player plays. Chunk 27 built the engine side and the page's flag (see
[The session controller](#the-session-controller)); chunk 28 built its control, `Rising tempo`, and
what the screen shows of it (see [On screen](#on-screen)).

### The schedule

`adaptive-tempo.ts` is the schedule as pure values with no time (`AdaptiveTempoSchedule`): whether
it runs, the tempo of the latest phrase whose tempo is fixed, how many counted phrases have started
since the last rise, and whether the controller is attached.

- **A counted phrase** is one that starts sounding while the schedule runs and the controller is
  attached.
- **A rise.** Once two counted phrases (`PHRASES_PER_RISE`) have started since the last rise, the
  next phrase whose tempo is fixed while the controller is attached plays `ADAPTIVE_TEMPO_STEP`
  (5) BPM faster, and the count restarts at 0. A rise due while the controller is away waits for
  the next fixing after it is back.
- **Never past 240, never down.** `ADAPTIVE_TEMPO_CEILING` is the tempo control's ceiling, 240 BPM:
  220 rises to 225, 230, 235, 240 and stays, and a session started at 240 never moves. Nothing
  lowers the tempo.

From 90 BPM the phrases play at 90, 90, 95, 95, 100, 100 …: phrase 3's tempo is fixed after
phrases 1 and 2 have both started sounding.

### In the engine

- **Whether it runs.** `SessionStart.adaptiveTempo` is true only when the page's flag is on and the
  session has a controller at its start; the session controller decides it (see
  [Starting](#starting)). `startSessionTempo` (`session-tempo-step.ts`) builds the engine's tempo
  state, `SessionTempo`: the schedule, and the tempo fixed for each phrase so far, phrase 1's being
  the starting tempo (the chosen settings' tempo). Without adaptive tempo every phrase is fixed at
  the starting tempo, through the same steps.
- **The `controller` event.** `controller { at, attached }` says that a controller lost
  mid-session went away (`false`) or came back (`true`); the session controller sends it only in a
  session that started with one (see [A lost controller](#a-lost-controller)). `onController`
  records the presence, during the count-in or while running, with or without adaptive tempo, after
  running what is due by its time like any other event. It throws `SessionEngineError` when it does
  not change the presence (away twice, or back while attached, a session starting attached) and
  when its time runs backwards. After the end it is dropped, since a loss can race the end.
- **Counting at a phrase's start.** `count-in-over` and `phrase-started-sounding` count the phrase
  that starts, so a phrase starting while the controller is away does not count, and counting
  resumes where it stopped once it is back.
- **The tempo lock at the deadline.** On every event but `end`, after the deadline logic (so a
  repeat decided at that deadline is decided first), `fixDueTempo` fixes the pending phrase's
  tempo once its look-ahead deadline is reached, and outputs `phrase-tempo { phraseNumber, tempo }`,
  once per phrase from phrase 2 on; phrase 2's is fixed at the end of the count-in. A
  `phrase-started-sounding` for a phrase whose tempo is not fixed throws.
- **Why the deadline.** The audio is scheduled ahead: on `phrase-tempo` the session controller
  queues the phrase's backing at that tempo on the transport's
  [tempo map](audio-transport.md#the-click-and-count-in), a measure before it starts. And after its
  deadline the phrase can no longer be discarded, so nothing about it changes again. The
  consequence: a loss in the last measure before a boundary does not stop that boundary's rise,
  already fixed; the phrase starting then just does not count.
- **Each phrase at its own tempo.** `phrase-sounding` carries the phrase's fixed tempo (`tempo`,
  the starting tempo for phrase 1), which the history records (see
  [What it records](#what-it-records)). Phrase N+1's deadline is three measures at phrase N's tempo
  after phrase N starts, and the discard guard of a settings change measures its measure left at
  the sounding phrase's tempo (`soundingTempo`: phrase 1's during the count-in).

### Not a settings change

Tempo is never part of the session settings or of any generation intent (see
[Tempo is transport-only](#tempo-is-transport-only); rule `rule_tempo_never_affects_generation`,
and spec D103 leaves tempo out of the settings mutations). Adaptive tempo therefore deliberately
does not use chunk 24's `settings-change` path or its discard rule:

- the settings in effect keep the starting tempo, and `changedSettings` still throws on a tempo
  change;
- a rise outputs no `settings-changed`, and never discards or regenerates a look-ahead phrase;
- every intent keeps the starting tempo, so the requests, the readied phrases and their
  [replay keys](phrase-workspace.md#phrase-replay-key) are the same with adaptive tempo on or off.

`adaptive-tempo.spec.ts` tests the pure schedule. `session-engine-adaptive-tempo.spec.ts` and
`session-engine-adaptive-tempo-generation.spec.ts` drive whole sessions that follow their own tempo
map (`tests/unit/session/tempo-session.ts`, on the [session driver](testing.md#the-session-driver)).

### On screen

The player calls it **Rising tempo** (the lexicon's word for adaptive tempo).

- **The control.** `Rising tempo`, `Off` or `On`, comes first in the "During a session" group
  (`SessionOptionsControls.vue`), with its note: "Adds 5 BPM every 2 phrases, up to 240 BPM. The
  tempo goes back to your setting when the session ends." It sets the page's flag through
  `setAdaptiveTempo`, at Idle and while the Review shows; it is read-only during a generation, a
  session, and while the controller loads.
- **Unavailable.** While no controller is attached (`adaptiveTempoAvailable` false), `On` is
  natively disabled, `Off` shows checked, and a second note, "Needs a connected controller.",
  names the reason (the disabled segment's `aria-describedby`). The player's own choice is kept:
  a click on that `Off` changes nothing, and a kept `On` shows again once a controller attaches.
  During a session the control keeps the availability the session started with, whether the
  session has a controller (`sessionHasController`), so a controller lost or attached mid-session
  changes nothing in it; `use-rising-tempo-control.ts` reads all this for the shell.
- **The tempo in effect.** During a session the header's `tempo-readout` and the read-only tempo
  stepper show `sessionTempo`, the tempo of the phrase now sounding, from the instant it starts on
  the audio clock, a repeat included; the shell puts it into the settings it shows. A rise can put
  it off the stepper's 10-BPM list ("95 BPM"): `TempoStepper` shows such a value only while
  read-only and inside its bounds, and throws otherwise. Both values sit in fixed-width boxes, so a
  change moves nothing. At the end both show the player's own tempo again, which no session
  writes.
- **The reached tempo.** The controller keeps `lastSessionReachedTempo`, in memory only (the flag's
  `sessionEnded`, in `workspace-adaptive-tempo.ts`): an end once phrase 1 has sounded sets it to
  the Review's `tempoReached` when that session ran adaptive tempo and clears it when it did not;
  a start and an end during the count-in leave it as it is. While it is set the tempo field shows a
  muted note under the stepper, "Last session reached {n} BPM.": a past fact, never compared,
  never a live region.
- **Nothing about performance.** The control, the readout and the note show only the flag and a
  tempo. Whatever the player plays, the tempos and the reached tempo are the same.

## The runner and the one-Worker wiring

`createSessionRunner(deps, start)` in `src/session/session-runner.ts` wraps one engine. Its
dependencies are `generate`, `checkFit`, `now`, `providers`, `viewport`, `onOutput` and `onError`.

- **Generate.** Each `request-generation` runs through the injected `generate` seam; the result
  comes back as a `generation-result` event stamped with `now()`.
- **Crashes.** A rejection that is a `GenerationWorkerCrashError` or a
  `GenerationWorkerTransportError` becomes `generation-crashed` for that attempt: a failed attempt,
  handled by the ladder. Any other rejection is a programming error: it goes to `onError`, never
  swallowed and never counted as a failed attempt.
- **Fit check.** Each `check-fit` runs through `checkFit(candidate, phraseNumber)`, a required
  seam with no default. The candidate (`FitCandidate`) is the attempt's outcome with the intent it
  was generated from, which together give the phrase as the staff would write it. The answer comes
  back as a `fit-result` stamped with `now()`. The session controller answers it with the staff
  planner (see [The rolling display](#the-rolling-display)).
- **Clock.** `now` is the injected audio clock. The runner is the only place in `src/session/`
  that reads a time.
- **Other outputs** go to `onOutput`. Ticks, `count-in-over`, `phrase-started-sounding` and every
  end cause come from the transport that drives the runner.

`WorkspaceSession.loadSessionRunner()`, built by `composeWorkspaceSession` in
`src/components/workspace/create-workspace-session.ts`, loads the runner's module and resolves to
a synchronous starter, which binds each runner to the same `deps.generate` the Idle flow uses, and
so to the app's one generation Worker (see [Session wiring](phrase-workspace.md#session-wiring)).
Phrase 1 and phrase 2 therefore go through the one seam, and phrase 2 reuses the rhythm-domain memo
that generating phrase 1 warmed (see
[Canonical rhythm-domain memo](phrase-workspace.md#canonical-rhythm-domain-memo)).

**Loaded with the controller.** The runner's module (the engine and its failure ladder) is not in
the entry chunk. `createSessionController()` calls `loadSessionRunner()` together with the
controller's own imports, so the runner arrives with the controller, before `Start session` is
enabled. This gave the entry chunk room: it went from 228,797 bytes, just under its 224 KiB budget,
to about 210.7 kB. About 9 kB of domain code shared by the entry and the lazy chunks moved to a
separate chunk, which the entry still loads at startup. The starter settles only once the
replay-key announcer has loaded too (see
[The replay announcer behind a dynamic import](controller-connection.md#the-replay-announcer-behind-a-dynamic-import)).
A load failure is not caught: it rejects, and the controller never loads.

The runner posts no pre-warm of its own, but it shares the Worker and memo with the Idle flow's
[pre-warm](phrase-workspace.md#pre-warm), so a rhythm setting pre-warmed at Idle is already built
when the runner generates on it. A runner `generate` that arrives while a pre-warm is still
building is served between two of its slices, after about one slice (8 ms) at most. Phrase 2's
warm reuse of the memo is unchanged.

## Session history

`createSessionHistory(settings, wallClock)` in `src/session/session-history.ts` keeps an in-memory
record of every phrase of one session that started sounding. The Review and the exports are built
from it (see [The end once phrase 1 has sounded](#the-end-once-phrase-1-has-sounded) and
[`docs/export.md`](export.md)). It never reads the system time, uses no browser API and stores
nothing outside memory. The session controller creates one at each start (see
[The session controller](#the-session-controller)).

`settings` are the session's locked settings, the same the engine got at start. The history takes
the tempo from them. It trusts the settings it is given and only checks that the tempo is a
positive, finite number of BPM.

The history is created once, at the session's start (the Start click or the starting note), and
keeps two facts about the whole session besides its records:

- **`startedAt`** is when the session started, in epoch milliseconds (milliseconds since
  1970-01-01 UTC). It is the one reading of `wallClock`, an injected function that returns the
  current epoch milliseconds, taken at creation. The history never reads it again, so the value
  never changes during the session. Turning it into a local date and time, for example for export
  file names, is the reader's job.
- **`instrumentProfileId`** is the instrument profile of the locked settings. The profile stays
  locked for the whole session, so it holds for every record, even if the player picks another
  instrument after the session ends.

### What it records

The history is fed every engine output, in the order the engine gave it: the runner's `onOutput`.

- **`phrase-sounding` adds one record.** Phrase 1 is recorded at `count-in-over`, and each later
  phrase when it starts sounding.
- **`phrase-ready` is ignored.** A phrase shown only as read-ahead, because the session ended
  before it started sounding, is never recorded. It is in neither the review nor any export.
- **`ended` closes the history.** A session ended during the count-in records nothing.
- **Every other output** is ignored.

The session controller's MIDI side also hands it what the player does, in a session read from a
controller (see [The session controller's MIDI side](#the-session-controllers-midi-side)):

- **`recordPlayedNote(note)`** keeps one finished played note: its
  [concert pitch](music/lexicon.md#concert-pitch), velocity, onset and release. Both times arrive
  with the latency correction already taken off (the same total on both), so the played notes line
  up with the generated notes the player heard. With today's USB correction of 0 they equal the
  raw times. Notes arrive in release order.
- **`recordAcknowledgement(identity)`** keeps one acknowledged expected note, once.

Both are placed in the records **on read**, by `withPlayedNotes`
(`session-history-played-notes.ts`), from everything received so far, so the result is exact
whatever order notes, acknowledgements and records arrive in. A played note belongs to the record
whose span holds its compensated onset: the last phrase started at or before it, the last phrase
taking every later onset. A note whose onset comes before phrase 1 started sounding (one played
during the count-in, the starting note included) belongs to no phrase and appears nowhere. An
acknowledgement belongs to the record of its phrase number.

`phrases()` reads back every record in sounding order, and `phraseCount` says how many phrases have
started sounding so far. Each record, `SessionHistoryRecord`, holds:

| Field                  | Holds                                                                                                                                                                                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `phraseNumber`         | The session phrase number: 1, 2, 3 … with no gap.                                                                                                                                                                                                                                                  |
| `startedAt`            | The audio time the phrase started sounding. The session controller passes the phrase's scheduled start on the transport, so the records sit exactly back to back (see [The history](#the-history)).                                                                                                |
| `outcome`              | The phrase exactly as shown: its timeline (its notes and rests in time order) and the [harmony](music/lexicon.md#harmony) (the chords under the melody) its [chord symbols](music/lexicon.md#chord-symbol) come from.                                                                              |
| `intent`               | What reproduces the phrase: the resolved request with the [note density](music/lexicon.md#note-density) it was actually generated with, its [seed](music/lexicon.md#seed) (the number that drives the generator's random choices) and its carry-in. A phrase stepped down to Eighth stores Eighth. |
| `tempo`                | The [tempo](music/lexicon.md#tempo) it played at, in BPM, from its `phrase-sounding` output; the starting tempo for phrase 1. `tempoReached()` reads the last record's: the tempo the session reached, `null` before phrase 1 sounds.                                                              |
| `isRepeat`, `repeatOf` | The internal repeat mark: whether the failure ladder repeated the phrase before, and which phrase. No view and no export shows it.                                                                                                                                                                 |
| `acknowledgements`     | The phrase's acknowledged expected notes, in arrival order. Empty in a session without a controller.                                                                                                                                                                                               |
| `playedNotes`          | The played notes whose compensated onsets fall inside the phrase, by onset (equal onsets keep their arrival order). Empty in a session without a controller.                                                                                                                                       |

Every record is deep-frozen. The list `phrases()` returns is frozen too, and rebuilt only on the
first read after a new record, played note or acknowledgement, so reading it again costs nothing.

Generation is a pure function of its intent, seed included, so `generatePhrase(record.intent)`
gives back the timeline stored in `record.outcome`. A property test checks this over a whole seed
matrix of real sessions (see [Determinism](testing.md#determinism)).

### Handing a session to the encoders

`src/session/session-history-export.ts` builds the inputs of the two generated-notes encoders and
of the played-notes encoder (see [Export](export.md)) from the stored records. It never
regenerates a phrase.

- `musicXmlInputFromHistory(records)` gives the session's instrument and, for each record, its
  phrase number, its stored phrase written as the staff showed it (in the instrument's
  [written pitch](music/lexicon.md#written-pitch), the note printed for a transposing instrument),
  and its tempo.
- `midiInputFromHistory(records, backing)` gives, for each record, its phrase number, its stored
  timeline in [concert pitch](music/lexicon.md#concert-pitch) (the pitch you actually hear) and
  its tempo, with the backing the caller passes (`null` when the backing is left off).
- `playedNotesMidiInputFromHistory(records)` gives, for each record, its phrase number, its tempo,
  its `startedAt` and its played notes, each as its pitch, velocity, onset and release.

Only those fields travel. The repeat mark never does, so a repeat encodes exactly like any other
phrase. All three throw a typed `SessionHistoryExportError` on an empty history, which has nothing
to export, and on records generated for two different instruments. The Review's export action
calls the first two through `buildGeneratedNotesFile` (see
[From the Review to a download](export.md#from-the-review-to-a-download)); nothing calls the
played-notes one yet, until chunk 23 adds its export action.

### Outputs the history refuses

An output a session cannot produce throws a typed `SessionHistoryError`:

- settings whose tempo is not a positive, finite number of BPM, at creation;
- a `wallClock` reading that is not a finite, non-negative number of epoch milliseconds, at
  creation;
- a `phrase-sounding` whose intent was generated for another instrument profile than the
  session's;
- a `phrase-sounding` that is not the next phrase, or that starts before the phrase before it;
- a repeat that names no earlier phrase, or a phrase that is no repeat but names one;
- any output, played note or acknowledgement after `ended` (so held notes must be released and
  recorded before the engine's `end`);
- an `ended` in the count-in after a phrase was recorded, or whose count of sounded phrases
  differs from the number of records;
- a played note whose times are not finite or that releases before its onset, or whose velocity
  is not a MIDI note-on velocity (1 to 127);
- an acknowledgement that names no possible note (a phrase number below 1, a measure outside 0 to
  3, a negative event index), or one already recorded.

### A long session

A session has no length cap, so the history has a time budget: building and reading back 2 000
phrases (about 2 h 15 min at 60 BPM) must take under 250 ms. The unit test "a long session" in
`tests/unit/session/session-history.spec.ts` checks it and prints the time.

| Date       | Machine                                                                              | Build and read back 2 000 phrases | Budget |
| ---------- | ------------------------------------------------------------------------------------ | --------------------------------- | ------ |
| 2026-09-30 | AMD Ryzen 5 PRO 8640HS (12 threads), bare metal, not a virtual machine; Node 22.23.2 | 2.3 ms                            | 250 ms |

This figure is recorded here, not in [Generation Latency](generation-latency.md), because it
measures no generation.

## The session controller

`createSessionController(deps)` in `src/components/workspace/workspace-session-controller.ts` runs
one practice session at a time on the workspace, from the player's `Start session` click to its
end. It drives the runner, the history, the audio transport and the screen locks; the screen binds
to its reactive state and calls its actions (see
[The session screen](phrase-workspace.md#the-session-screen) for the buttons, the cue row, the
locks on screen and focus). It draws nothing itself: it hands the staff what to draw (see
[The rolling display](#the-rolling-display)). Its contract, `SessionController`, is in
`workspace-session-controller-types.ts`, and `WorkspaceSession.createSessionController()` builds
it (see [Session wiring](phrase-workspace.md#session-wiring)).

| State field                | Holds                                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `phase`                    | `'idle'` (no session), `'count-in'` or `'running'` (phrase 1 or a later phrase sounding).                                            |
| `countIn`                  | While the count-in runs, one state per beat (`muted`, `current` or `past`) and the audio time it next changes; `null` outside it.    |
| `strugglingNotice`         | Whether the engine's latest `struggling-notice` shows it.                                                                            |
| `sessionTempo`             | The exact tempo in effect, in BPM: the starting tempo, then each sounding phrase's own; `null` with no session.                      |
| `heldLayout`               | The staff layout the running session holds, `'one-system'` or `'split'`; `null` with no session.                                     |
| `sessionStaff`             | What the staff shows while a session runs (see [The rolling display](#the-rolling-display)); `null` with no session.                 |
| `latestReady`              | The highest phrase number the running session has readied, 1 until phrase 2 is; `null` with no session.                              |
| `canStart`, `startBlocker` | Whether `Start session` may be clicked, and the first start condition that fails (`null` when none does).                            |
| `lastEnd`                  | How the last session ended: `cause`, `phase` (`'count-in'` or `'running'`) and `soundedPhraseCount`.                                 |
| `lastHistory`              | The closed history of the last session that ended.                                                                                   |
| `review`                   | The last session's Review, `{ history, showing, tempoReached }`, showing or kept; `null` when none exists.                           |
| `startingNote`             | The note that would start a session if played now (its identity, concert pitch and label); `null` unless one may start it.           |
| `controllerLost`           | While a lost controller's countdown runs, `{ secondsLeft }`, 30 down to 1, count-in included; `null` otherwise.                      |
| `acknowledged`             | The running session's acknowledged notes, in acknowledgement order; empty at Idle.                                                   |
| `sessionHasController`     | Whether the running session reads a controller, fixed at its start; `null` at Idle. Nothing on screen reads it yet.                  |
| `adaptiveTempo`            | The page's adaptive-tempo flag: off at page load, kept from one session to the next, in memory only. Nothing on screen reads it yet. |
| `adaptiveTempoAvailable`   | Whether the flag may be turned on: exactly while a controller is attached (the MIDI controller `connected`).                         |

`start()` throws a `SessionControllerError` while a start condition fails, and `stop()` when no
session is running. `isPhraseOnScreen(n)` says whether any part of phrase `n` is on the staff
now (`false` with no session); a phrase number that is not a positive integer throws.
`closeReview()` (`Close review`) and `showReview()` (`Review last session`) move the Review
between showing and kept, and throw when asked out of turn (see
[The end once phrase 1 has sounded](#the-end-once-phrase-1-has-sounded)). `dispose()`
ends a running session with the `stop` cause, stops reading the window and listening to the MIDI
controller, and frees the wake-up timer; `App.vue` calls it when it unmounts.

`setAdaptiveTempo(on)` turns the page's adaptive-tempo flag on or off. It throws a
`SessionControllerError` during the count-in or a running session (the settings are locked then),
and when turning it on with no controller attached; turning it off at Idle is always allowed. The
flag lives in `workspace-adaptive-tempo.ts`, built with the controller and held only in memory:
`App.vue` builds the page's one controller at setup and disposes of it only when the app unmounts,
so the flag lasts exactly as long as the page, and no session's start or end resets it. A
controller unplugged at Idle leaves it on, only unavailable. The `Rising tempo` control sets it
(see [On screen](#on-screen)). `state.lastSessionReachedTempo` is the tempo the last session that
ran adaptive tempo reached, for the tempo field's note.

### Start conditions

`sessionStartBlocker(facts)` checks, in this order, and returns the first that fails:

1. no session running, count-in included (`session_active`);
2. the last session's Review not showing (`review_showing`; see
   [The end once phrase 1 has sounded](#the-end-once-phrase-1-has-sounded));
3. a phrase shown: an Idle result, engraved (`no_phrase`);
4. no Idle generation running: Generate, Regenerate phrase, the fit retries, or a drawing in
   progress (`generation_running`);
5. no notation error (`notation_error`) and no generation-failure banner (`generation_failure`);
6. a rhythm combination that can form a phrase (`rhythm_unsupported`);
7. the staff shown: no rotate-device notice, that is no portrait-shaped window below `bp-desktop`
   (`orientation_notice`), and no room notice (`room_notice`).

A Review kept but not showing blocks nothing. No MIDI fact is an input, so no MIDI state ever
blocks a start. The controller builds the facts
from the Idle state and from the window's shape, which it reads from its creation until `dispose`.

### Starting

`start()` runs synchronously inside the Start click, because a browser opens audio and grants
screen locks only from the player's own gesture. Playing the starting note takes the very same
`start()`, from the MIDI note's callback (see [The starting note](#the-starting-note)); the audio
was already unlocked then by the `Connect controller` click. A start that a condition blocks throws
and touches nothing. An accepted start first discards the kept Review, if any, before anything
else changes. Then, in order, it:

1. unlocks the audio, asks for the screen wake lock and the landscape orientation lock without
   waiting for their answers (a refused or unsupported lock changes nothing and shows nothing),
   and starts the transport at the locked tempo;
2. queues phrase 1's backing with the Idle phrase's harmony;
3. locks the settings (the Idle controls and musical profile), chooses the held layout from the
   window's width alone (`sessionLayoutAtStart`: split below `bp-tablet-landscape`, one system
   from it up), opens a history stamped with the wall clock;
4. begins the session's MIDI side, with or without the controller, fixed now (see
   [The session controller's MIDI side](#the-session-controllers-midi-side));
5. shows the count-in and the session's staff (phrase 1, the very written phrase Idle shows, in
   the held layout), starts the wake-up timer and the display's frame loop, then a runner whose
   phrase 1 is the Idle phrase and whose fit check is the display's, and the end watchers. The
   runner runs adaptive tempo when the flag is on and step 4 found the controller attached
   (`sessionHasController`); a session started with the selected controller away, or with none,
   runs without it.

### The audio-time agenda

A session reads the time only when it wakes up. `createAudioTimeAgenda()` holds actions due at
audio times; at each wake-up the controller calls `fireDue(audio.now())`, which fires every action
due by then, earliest first, ties in scheduling order. The agenda holds:

- **each count-in display change.** `countInDisplayAt` takes each beat's time from the click
  track's own `beatAt`, so a beat lights exactly when it clicks: before the first click all four
  beats are muted, a beat is current from its click to the next, and the row empties when the
  count-in ends;
- **the count-in's end:** the phase becomes `running`, and the runner gets `count-in-over`;
- **each phrase's start, at its own tempo.** The phrase steps
  (`src/components/workspace/workspace-session-phrases.ts`) take phrases 2 on in two steps. On
  `phrase-ready` the phrase goes to the rolling display as read-ahead and is kept. On
  `phrase-tempo`, once the engine has fixed its tempo, the kept phrase's backing is queued with
  `audio.queueBacking(n, harmony, tempo)` (a repeat included), its expected notes go to the MIDI
  side at that tempo, the display's playhead takes the tempo, and `phrase-started-sounding` is
  scheduled at `audio.phraseStartsAt(n)`. Both steps must come in order; one out of order, or a
  tempo for a phrase never readied, throws. On `phrase-sounding` the controller's `sessionTempo`
  becomes that phrase's tempo; the session never writes the Idle tempo control, and the settings
  keep the starting tempo;
- **each engine deadline:** on `wake-at`, a `tick` at that time;
- **the MIDI side's timers:** the silence check and each change of a lost controller's countdown
  (see [The session controller's MIDI side](#the-session-controllers-midi-side)).

The wake-ups come from the controller's own timer, `SessionControllerClock.createWakeTimer`,
built once at the first start: in production a wake-up Worker timer of the same kind as the
transport's scheduler uses, every 25 ms.

**The engine time floor.** Every time the controller hands the engine is raised to the latest
time it already handed it. A scheduled action carries its own due time, while a generation result
is stamped with the clock's time when it arrives, so a deadline due at 4.000 s fired just after a
result stamped at 4.010 s would otherwise go back in time, which the engine refuses.

### The history

Every runner output is recorded in the session's history before the controller acts on it (see
[What it records](#what-it-records)). A `phrase-sounding` is recorded at the phrase's scheduled
start on the transport, `audio.phraseStartsAt(n)`, not at the time the engine was handed. The
engine time floor ([above](#the-audio-time-agenda)) can raise that time past the scheduled start,
by up to a wake-up period (25 ms) or more, when the runner read the clock just before the wake-up
fired. A recorded start that late would shift every played note the history places in the phrase,
and the played-notes export, which needs phrases back to back within 1 ms, would refuse the
session (see [Played notes as MIDI](export.md#played-notes-as-midi)). The engine itself still
gets the floored time.

In a session with a controller, the MIDI side records each finished played note and each
acknowledgement as it comes. When the session ends, its closed history is kept as `lastHistory`.

### The rolling display

During a session the staff shows two systems, one above the other: the player reads one while the
other, never the one being read, is refilled with what comes next. `createSessionDisplay(deps)`
(`src/components/workspace/workspace-session-display.ts`) is one session's display, built at the
start and stopped at teardown. It keeps the written phrases readied so far (phrase 1 is the very
`WrittenPhrase` object Idle shows), the highest phrase number readied (`latestReady`) and the
playhead, and publishes the controller's `sessionStaff` whenever one of them changes.

What goes where is a pure plan in `src/session/rolling-display.ts`, which reads no time:

- **The playhead.** `playheadAt(heardTime, tempoMap)` gives the phrase number and the measure (0
  to 3) being played, or `null` before phrase 1's first barline, during the count-in. The tempo
  map mirrors the transport's click plan: one segment from phrase 1 at the starting tempo, then
  one from each phrase whose tempo differs from the phrase before, starting exactly at the
  transport's `phraseStartsAt(n)`. In a segment, barline k lies at the segment's start plus its
  measures since then × its measure length, computed by multiplication, never by adding up
  measures, so no error builds up over a long session; at one tempo this is phrase 1's start plus
  k measures. Exactly at a barline the playhead is already on the new measure.
- **What each system shows.** `systemsAt(layout, playhead, latestReady)`. In the one-system layout
  phrase n lives on the top system when n is odd and on the bottom one when it is even; the
  phrase being played (phrase 1 during the count-in) shows in its system, and the other system
  shows the next phrase once it is readied, so phrase 2 fades in below phrase 1 as soon as it is
  ready, usually during the count-in. In the split layout, during measures 1 and 2 (and the
  count-in) the phrase's opening (bars 1–2) is on top and its closing (bars 3–4) below; from
  measure 3 the closing stays and the top system takes the next phrase's opening once it is
  readied. Nothing further ahead is shown, and a system never changes while the playhead is in it.
- **What waits.** `waitingMaterial(layout, playhead, latestReady)` lists every readied part not
  shown yet and not yet played. The playhead runs on heard time, behind the audio clock the engine
  runs on, so the phrase after next can be readied while the heard playhead is still in the
  current phrase's last measure; it waits until the playhead reaches the phrase before it.
  `phrasesShownOrWaiting` gives the phrase numbers shown or waiting: the material the window must
  still hold.
- **Read-ahead.** `readAheadMeasures` counts the measures on screen after the one being played.
  The engine's deadline (the start of the sounding phrase's last measure) keeps it at one or more
  in that last measure.
- **On screen.** `isPhraseOnScreen(layout, playhead, latestReady, n)` says whether any part of
  phrase n is shown. The controller exposes it as `isPhraseOnScreen(n)`, and hands the engine the
  display's own answer as its display reading (see [In the workspace](#in-the-workspace)).

The display itself:

- **The frame loop.** The playhead is read once per animation frame, through the frame port
  `SessionControllerClock.frames` (the browser's `requestAnimationFrame` in the app, a fake in unit
  tests), on heard time: `audio.now() - audio.outputLatency()`, through its tempo map, built from
  the starting tempo and each `phraseTempo(n, tempo)` the phrase steps give it. The staff is published only when the position changes, and
  the phrases the playhead has left behind are then forgotten, never a readied phrase at or ahead
  of it. The loop runs from the start until teardown; a throw inside a frame goes to `fail`.
- **Readied phrases.** Each `phrase-ready`, repeats included, adds its written phrase under its
  number and publishes the staff. A phrase out of order throws.
- **The fit check.** The display answers the runner's `checkFit`. It writes the attempt's phrase
  from its outcome and that attempt's own intent, then runs the engraver's `planWrittenPhraseFit`
  at the staff's latest layout inputs in the held viewport, `heldViewport(viewport, heldLayout)`:
  the held layout in the window's height budget (see
  [Pre-draw Checks](notation-engraving.md#pre-draw-checks)). Anything but `fits`, notes too wide
  or no room, is a failed attempt, so the ladder climbs and the misfit is never drawn. The
  planner is loaded with the engraver and its fonts (`loadSessionStaffFitPlanner` in
  `session-staff-fixed-parts.ts`), outside the entry chunk. A check before the staff has reported
  its inputs is a defect and throws.
- **The material check.** `materialFits(inputs)` plans every phrase shown or waiting the same way,
  for the material rule (see [Ends](#ends)).

The screen gets `SessionStaff` (`src/components/notation/session-staff.ts`):
`{ layout, top, bottom, playhead }`, each position a slot (a phrase number and a part, `whole`,
`opening` or `closing`) with its written phrase, or `null` for a blank position. `ScorePanel`
passes it to `PhraseScore`'s `session` prop (see
[During a session](phrase-workspace.md#during-a-session)), and wires `PhraseScore`'s
`session-staff-failed` event, through the Idle layout gate, to the session alone.

### The session controller's MIDI side

`createSessionMidi(deps)` (`src/components/workspace/workspace-session-midi.ts`) is the
controller's MIDI side. It loads with the controller, never in the entry chunk. From the
controller's creation to its `dispose` it follows the MIDI controller's state and every played
note (`WorkspaceSession.midi`, see [`docs/midi-input.md`](midi-input.md)). Every time it handles is
on the audio clock, and every timer it sets is on the session's agenda.

#### The starting note

At Idle, the **starting note** is phrase 1's first fresh attack (a note that is not the
continuation of a [tie](music/lexicon.md#tie)): `startingNoteOf(timeline, written)` in
`src/session/starting-note.ts` gives its identity, its concert pitch, and its label, the staff's
own spelling in [written pitch](music/lexicon.md#written-pitch) with ♭ or ♯ and the
[octave number](music/lexicon.md#octave-number) (octave 4 starts on middle C), for example `B♭4`.
It throws a `StartingNoteError` on a phrase with no attack, or when the staff shows that attack at
another pitch than its concert pitch under the phrase's transposition.

`state.startingNote` is set exactly when all of these hold: `Start session` may be clicked
(`canStart`), the MIDI controller is `connected`, the connection sheet is closed
(`WorkspaceSession.connectionSheetOpen`, see
[`docs/controller-connection.md`](controller-connection.md#the-click)), and the staff shows Idle's
phrase. The cue row's start line and the score's start marker are drawn from it (see
[The cue row](phrase-workspace.md#the-cue-row)).

A played note at Idle starts a session only when `startingNote` is set and the note has exactly
its concert pitch, [octave](music/lexicon.md#octave) included (`isStartingNote`). It then calls the
controller's own `start()`, the path the Start click takes, so every start condition, lock and
count-in is the same. Any other note, or the starting note while nothing is named, does nothing.
The starting note is the first note played in the session: it arms the silence timer (below).

#### With or without the controller, fixed at the start

The session's mode is fixed at its start, by the MIDI controller's state at that moment:

- **`connected`: a session with a controller.** It reads every note until it ends.
- **Any other state: a session without a controller.** It reads no note and sets no timer for its
  whole run, count-in included, even if a device attaches afterwards. When the selected
  controller is `away` at the start, the MIDI side calls `midi.holdReattachment()`, so the same
  device coming back stays `away` and is never opened nor read until the session ends; the
  teardown calls `midi.releaseReattachment()`, and the device then reattaches by itself (see
  [Connected, lost and back again](midi-input.md#connected-lost-and-back-again)). A session started
  while a port is still `opening` holds nothing: it reads no note either, and the device attaches
  afterwards, outside the session.

#### Acknowledgement

A session with a controller builds one `createSessionAcknowledgement({ correction })`
(`src/session/session-acknowledgement.ts`), the stateful layer over the pure pipeline of
[MIDI note acknowledgement](midi-acknowledgement.md):

- **Phrases are added in order, each at its own tempo.** Phrase 1's expected notes from its first
  downbeat, `audio.phraseStartsAt(1)`, at the starting tempo, at the start; each later phrase's
  from its own first downbeat at its own tempo, once the engine has fixed that tempo
  (`addPhrase(n, timeline, startsAt, tempo)`). The windows are placed again over every expected note known so far, so a phrase's
  last note is bounded by the next phrase's first.
- **Each played note is matched once.** Its onset is latency-compensated with the USB correction,
  `latencyCorrectionFor('usb')`, for every controller: Web MIDI does not say how a device is
  connected. A match is recorded in the history (`recordAcknowledgement`) and published as
  `state.acknowledged`, which the score lights (see
  [During a session](phrase-workspace.md#during-a-session)). A note that matches nothing changes
  nothing and leaves no trace.
- **Each finished note is recorded,** onset and release both compensated by the same total
  (`compensatedRecord`), through `recordPlayedNote`.
- **Notes due while the controller was away are passed over.** `passDueBetween(from, to)` excludes
  from matching every expected note known so far whose onset lies in `[from, to]`, both ends
  included. Such a note is never acknowledged afterwards, never recorded as acknowledged, and not
  in `acknowledged()`; a note already acknowledged stays so. A range that is not finite or runs
  backwards throws a `SessionAcknowledgementError`.

The values of the windows and of the correction, and how to tune them on real hardware, are in
[MIDI Tuning](midi-tuning.md).

#### The silence timer

A session with a controller ends with `silence-timeout` after more than
`SILENCE_TIMEOUT_SECONDS` (30 s) without a played note (`src/session/session-midi-timers.ts`).

- **Armed by the first note played.** In a session the starting note started, that is the starting
  note itself, from its onset. In a session the Start click started, it is the first note played
  after it. A session in which no note is ever played never times out.
- **Re-armed by every played note,** from its onset, whether it matches or not.
- **Suspended while the controller is lost.** When it comes back, a timer that was armed is
  re-armed from the reattachment's time, however long the player was silent before the loss; a
  timer not yet armed stays unarmed until the first note played.
- **Checked on the agenda.** A check falls due at the deadline; the session ends only once the
  audio clock is strictly past it, and the check runs again just after otherwise.

#### A lost controller

During a session with a controller, any state other than `connected` counts as lost: `away`, and
`opening` while the same device is being reopened.

- **The countdown** runs from `audio.now()` at the change, for `RECONNECTION_WINDOW_SECONDS`
  (30 s). `state.controllerLost` shows `{ secondsLeft }`: 30 at the loss, one less at each whole
  second after it, 1 in the last second. Each change is scheduled on the agenda.
- **The same device back** (`connected` again) clears the countdown and re-arms the silence
  timer from then, if a note had armed it. First, every expected note whose onset fell between
  the loss and the reattachment is passed over (`passDueBetween`, see
  [Acknowledgement](#acknowledgement)): it stays unacknowledged even if its window is still open.
- **At 0** the session ends with `controller-lost`, which on screen ends exactly as a silence
  timeout does.
- **A count-in keeps running** under the countdown. The cue row shows the disconnect banner over
  it, and the header shows the disconnected badge through its freeze (see
  [Facts and forms](controller-connection.md#facts-and-forms)).
- **The engine hears it too.** The loss and the return are each handed to the controller's
  `controllerPresence` seam, which `workspace-adaptive-tempo.ts` (`forwardPresence`) turns into
  the engine's `controller` event, `attached` false then true, at `audio.now()` raised to the
  engine's time floor. Adaptive tempo follows it: a phrase whose tempo is fixed while the
  controller is away does not rise, and a phrase that starts sounding then does not count. A
  session started without a controller never sends one.

#### Errors

A throw inside the MIDI side's handling of a note or of a state change is a programming error: it
ends the session loudly, like any other (see [Ends](#ends)).

### Ends

Every end takes one path. First, the notes still held on the controller end now and are recorded
(`midi.releaseHeld(audio.now())`, whose ended notes reach the history like any other): the history
refuses anything after its end. Then the runner gets `end { cause }` at the current audio time, and
the engine's `ended` closes the history. Then the controller tears the session down: the agenda is
emptied, the wake-up timer stopped, the display's frame loop stopped, the transport stopped with
its 0.1 s fade (unless an interruption has already halted it), both screen locks released, the
state back to Idle (`sessionStaff` back to `null`, so the staff leaves its session mode), the MIDI
side stopped (its timers dropped, the countdown and the acknowledged notes cleared, a held
reattachment released), and, last, the end watchers stopped. `lastEnd` holds the summary and
`lastHistory` the closed history. An end once phrase 1 has sounded then opens the Review and asks
Idle for the next phrase (see
[The end once phrase 1 has sounded](#the-end-once-phrase-1-has-sounded)); an end during the
count-in does neither. A session ends on:

| What happens                                                                                         | Engine cause      |
| ---------------------------------------------------------------------------------------------------- | ----------------- |
| `Stop`, in the header or the phone's compact one                                                     | `stop`            |
| The browser interrupting the audio (`audio.onInterrupted`)                                           | `stop`            |
| The page becoming hidden (`visibilitychange` to `hidden`)                                            | `hidden-tab`      |
| A portrait-shaped window below `bp-desktop`                                                          | `staff-not-shown` |
| A window too narrow for the held layout, or, below `bp-tablet-landscape`, too short for it           | `staff-not-shown` |
| A staff layout report at which a phrase shown or waiting no longer fits the held layout              | `staff-not-shown` |
| A notation error of phrase 1's Idle engraving reported during the session                            | `staff-not-shown` |
| The staff failing to draw the session (`session-staff-failed`: a refill or a re-engrave that throws) | `staff-not-shown` |
| More than 30 s without a played note, in a session with a controller                                 | `silence-timeout` |
| A controller lost in a session and not back within 30 s                                              | `controller-lost` |

A second cause after the end does nothing. A programming error (a runner `onError`, or a throw
inside a scheduled action) first ends the session with `stop`, so nothing keeps sounding, then
propagates uncaught.

**The end watchers.** `watchSessionEnds` (`workspace-session-end-watchers.ts`) runs from the start
to the end: it listens for the page becoming hidden, judges every window change and every staff
layout report with the session window rule, judges every staff layout report the window rule lets
through with the material rule (below), and diverts the staff's reports from the Idle machinery
(see [The Idle layout gate](#the-idle-layout-gate)). A session staff failure ends the session at
once.

**The material rule.** At a staff layout report measured for the window as it stands, the
watchers ask the display whether every phrase shown or waiting (`phrasesShownOrWaiting`, see
[The rolling display](#the-rolling-display)) still fits the held layout at the new inputs, with
the staff planner's own fit check. Any misfit, notes too wide or no room, ends the session with
`staff-not-shown`, exactly like Stop: a session never shows the notation error, and a phrase
already shown or waiting is never swapped for another. A check that throws (the planner failing
to load, say) is handled like a programming error: the session ends with `stop` and the error
propagates.

**The session window rule.** `windowEndsSession(input)` (`src/session/session-window.ts`) is pure
arithmetic on sizes the caller measures. A portrait-shaped window (height at least the width, as
CSS `orientation: portrait`) below `bp-desktop` ends the session, since the rotate-device notice
then replaces the workspace. Otherwise it asks the staff planner's phrase-independent room check,
at the legibility floor, about the **held** layout: its two system positions in the window's
height budget, whichever layout is held, only while the window is below `bp-tablet-landscape`
(from it up the window gives no height budget); then the held layout's width, with
`planStaffWidthRoom` (`src/notation/notation-layout-policy.ts`), the staff container's width and
phrase 1's fixed parts. Those fixed parts (the leading clef, key signature and time
signature, and the system padding) are measured once per session by the engraver's
`measureStaffFixedParts`, for phrase 1's written key signature; until they are measured, only the
portrait rule is judged. A split layout held across a `bp-tablet-landscape` crossing is still
judged as split, and a one-system layout held into a window below it is judged in that window's
height budget, so a short window ends it with `too_short`. Heights come from the small viewport
height (`100svh`, browser toolbars showing), so a browser toolbar showing or hiding ends nothing.
Right after a breakpoint crossing the staff's latest inputs were measured for the other layout,
so they are skipped, and its next report is judged. Whether the phrase material on screen still
fits at the new size is the material rule's question, which this rule does not ask.

### The Idle layout gate

`createIdleLayoutGate` (`src/components/workspace/idle-layout-gate.ts`) stands between
`PhraseScore`'s reports (its layout inputs and each drawing's outcome) and the Idle machinery, and
always keeps the latest layout inputs. At Idle the reports go straight on. During a session the end
watchers divert them, so the Idle fit retries, the room notice, the regeneration of a phrase a
resize leaves too wide and the notation-error capture never act on the session's staff: a window
change is judged by the session window rule and the material rule alone. The staff's own session
report, `session-staff-failed`, goes through the same gate to the diverting session only; with no
session diverting, it is dropped, since the staff stops drawing a session when it ends, and an
engraving of it still under way then belongs to no session. At the end the gate is released, and
the latest layout inputs are re-applied to the Idle machinery, followed by the last drawing
outcome held during the session. The Idle rules then decide in the layout the window gives
afresh: with no room the workspace shows Needs more room; a phrase now too wide starts the Idle
fresh-seed retries (Loading); a session end never leads to the notation-error state.

### The end once phrase 1 has sounded

An end during the count-in played nothing: the workspace is back at Idle with phrase 1 on screen,
the Idle rules deciding in the layout the window now gives, and a new session may start on it. An
end once phrase 1 has sounded is different, because phrase 1 of a session is never a phrase the
previous session played. After the teardown above, `end` does two more things, in this order:

1. **The Review opens.** `state.review` becomes `{ history, showing: true, tempoReached }` over
   the session's closed history, `tempoReached` being its last sounded phrase's tempo. The screen shows the Review in place of the staff (see
   [The last-session Review](phrase-workspace.md#the-last-session-review)).
2. **Idle is asked for the next phrase.** `idle.actions.startFreshPhrase()`, which the
   controller gets with the Idle state (`SessionControllerDependencies.idle.actions`), starts the
   Idle fit runner with the `'fresh'` start (`generation-session-fit-round.ts`): the played phrase
   leaves the staff at once, with no score shown meanwhile, then the staff's room is checked with
   the next phrase's key signature before anything is generated. With room, a phrase is generated
   from the current controls with a fresh seed and no carry-in, through the Idle attempt budget
   (the first attempt and up to three fresh-seed retries), as `Regenerate phrase` would. With no
   room, nothing is generated: the no-room notice shows (one already showing stays), and the
   phrase comes when the notice clears, by the usual room-notice rules. A too-many-notes notice
   is dropped. Under an unsupported rhythm combination no phrase shows and nothing is generated.
   The call is not awaited: whatever the run ends on (Ready, the no-room notice, the initial
   generation error, Empty) is what the player finds on leaving the Review. That phrase becomes
   the next session's phrase 1 only by the ordinary Idle start.

**Why the fresh phrase never meets a drawing in flight.** `startFreshPhrase` throws a
`SessionUsageError` if Idle is `notating`: a phrase already being drawn can't be dropped, so such
a call is a caller defect. The end can't meet one. A session starts only with no Idle generation
running (start condition 4), and while it runs the Idle layout gate diverts every staff report, so
no Idle run starts during it. At the end the gate hands the latest reports back synchronously, and
a held drawing failure may start a replacement run there, but that run is still `generating`: it
must wait for a generation result before it can draw. `startFreshPhrase` runs right after,
synchronously, and supersedes it through the run token, so its late answer changes nothing.

**While the Review shows.** No session starts: `canStart` is false with the `review_showing`
blocker, so neither the Start click nor any MIDI note starts one, the starting note included, and
`startingNote` stays `null`, so no starting note is named. The hidden staff keeps running the Idle
rules underneath (the fresh phrase is engraved, the room and fit checks keep measuring), so
leaving the Review finds the workspace in the Idle state those rules reached.

**Leaving and coming back.** `closeReview()` (`Close review`) keeps the Review with
`showing: false`; it throws unless the Review shows. `showReview()` (`Review last session`) shows
it again; it throws when no Review exists, when it already shows, or during a session. Each
change replaces the frozen `SessionReview` object (`session-review-state.ts`), never mutates it.

**Discarded by the next start or a reload.** A session start, by the Start click or the starting
note, discards the kept Review (`state.review` back to `null`) without confirmation, before
anything else changes; a session ended during that one's count-in does not restore it. The Review,
its history and `lastHistory` live in memory only, so reloading or closing the page discards
everything.

### Interim seams and open points

- **A dropped wake lock is not asked for again.** If the browser drops the wake lock mid-session
  (the page hidden, a low battery), nothing re-requests it; whether to ask again silently is open
  question O87.
- **The mix levels are placeholders.** The volume ranges and defaults come from the `--mix-*`
  design tokens, whose values wait for the listening tests of ux Q31.

## Settings mutation and changes at a phrase boundary

From v2.1 the settings in effect can change during a session, though the player still cannot edit
them. Two sources exist. The engine's own **settings mutations**, behind the settings-mutation flag
(off by default, spec D176), move one setting by one grade every two to four phrases. A
`settings-change` event gives complete new settings from any other automatic source; no part of
the app sends one yet. Both apply at a phrase boundary: every phrase is generated under one set of
settings, and the event says from which phrase the new ones apply.

### The scale table

`MUTATION_SCALES` (`settings-mutation-scales.ts`) holds one entry per mutable setting: every
generation control except tempo and the instrument, plus the musical profile's identity
(`MutableSetting`). An entry is data: its scale, the value a step starts from (`from`) and how a
step is applied (`apply`). Its type, `MutationScaleTable`, makes a missing or extra setting a type
error. A scale is one of four kinds:

- **ordered:** a list with no wrap, so a value at either end has one neighbour;
- **circular:** a list stepped `step` places either way, wrapping;
- **separate:** ordered groups that are never crossed;
- **nominal:** no order, so every other value is one grade away.

`scaleNeighbours(scale, value)` gives the values one grade away, lower first. A new value is
therefore a table edit, not new code: a future `Custom` note density (D175) is one more entry in
the note-density catalog the scale reads.

| Setting                        | Scale                                                                                     | Status  |
| ------------------------------ | ----------------------------------------------------------------------------------------- | ------- |
| Harmonic motion                | ordered: Static, Gentle diatonic, Active diatonic                                         | settled |
| Tension arc                    | ordered: Settled, Lift, Build, Edge                                                       | settled |
| Note density                   | ordered: Quarter, Eighth, Sixteenth, from the density generated with (D177)               | settled |
| Rhythmic variety               | ordered: Strict, Slightly varied, Heavily varied                                          | settled |
| Syncopation                    | ordered: Straight, Occasional offbeats, Active displacement                               | settled |
| Silence density                | ordered: Sparse, Conversational, Breath-heavy                                             | settled |
| Leapiness                      | ordered: Smooth, Shaped, Leaping, Angular                                                 | settled |
| Arpeggio chaos                 | ordered: Predictable, Varied, Chaotic                                                     | settled |
| Tonal center (the written key) | circular, step 7 semitones: one step around the circle of fifths                          | D181    |
| Collection                     | separate: Major and Minor; the modes from brightest to darkest, Lydian to Locrian         | D181    |
| Contour                        | nominal: Rising, Falling, Arch, Wandering                                                 | D181    |
| Register                       | ordered: Low, Middle, High, never Varying; from Varying, steps from the resolved register | D181    |
| Musical profile                | nominal: Neutral and Jazz flip; every control kept, no bundle applied, marked customized  | D181    |

The **circle of fifths** orders the keys a perfect fifth (seven semitones) apart, so two keys next
to one another differ by one sharp or flat in the
[key signature](music/lexicon.md#key-signature). A **mode** is one of the seven scales built from
the notes of the major scale, each starting on a different one of them. On the same tonic, ordered
from brightest (Lydian) to darkest (Locrian), each mode differs from the next by one note.

The scales marked D181 were proposed by the coding leader and accepted by the owner on
2026-10-03 (spec D181): `rule_mutation_setting_scales` (tonal center, collection, contour,
register), `rule_mutation_profile_flip_keeps_controls` and `rule_mutation_marks_profile_customized`.
A step of a value the musical profile controls marks the profile customized; a step of a value it
does not control leaves the mark as it was. `rule_mutation_sixteenth_blocked_after_step_down`
(below) was accepted with them.

### The draw

`mutateSettings(settings, context, seed, k)` (`settings-mutation.ts`) decides mutation k, purely.
The context (`MutationContext`) is what the settings do not say: whether the window is below
`bp-tablet-landscape`, whether the session has stepped down from Sixteenth, and the register it
resolved.

- `mutationCandidates(settings, context)` lists every step, setting by setting in
  `MUTABLE_SETTINGS` order, each with the settings it lands on and whether the generator supports
  them. A step is unsupported when its rhythm setting is blocked, judged on the density generated
  with, or when it is a note-density step to Sixteenth while Sixteenth is unavailable: below the
  width, or at any point after the session stepped down (D177).
- `drawMutation` draws one setting uniformly among those with a step, then one of its steps
  uniformly, and draws both again from the same stream while the step is unsupported. No cycle is
  skipped. With no supported candidate it throws at once rather than loop.
- Settings that are unsupported to begin with are a caller bug and throw.

### The seeded cadence

The flag is `SettingsMutationFlag`: `{ kind: 'off' }` (`SETTINGS_MUTATION_OFF`, also
`SETTINGS_MUTATION_DEFAULT`), or `{ kind: 'on', seed }`. Every random choice of the mutation
engine comes from an indexed stream, `deriveIndexedStream(seed, label, k)`
(`src/domain/random/streams.ts`), whose state depends only on the seed, the label and k:

- **The gaps.** `mutationGap(seed, k)`, from the `settings-mutation-gap` stream, is the number of
  phrases before mutation k: from `MUTATION_GAP_MIN` (2) to `MUTATION_GAP_MAX` (4).
  `mutationPhrase(seed, k)` is 1 plus the first k gaps, so the first mutation lands on phrase 3, 4
  or 5, and never on phrase 1 or 2. `mutationIndexLandingOn(seed, phraseNumber)` is the reverse.
- **The draw.** Mutation k draws from the `settings-mutation` stream for (seed, k).

No stream is shared, so mutation k never depends on what an earlier mutation consumed, nor on how
many attempts any phrase took: the same mutations land on the same phrases whatever happens to
the attempts.

### Where a mutation lands

`landingMutation` (`session-mutation-step.ts`) runs when phrase N is about to be requested, that
is when phrase N−1 starts sounding. If mutation k lands on N, it is decided then, from the settings
in effect, the window read now, the step-down memory and the register whose window the carry-in
holds. The `settings-changed` output (`cause: 'mutation'`, with `setting`, `from` and `to`) comes
just before phrase N's first `request-generation`, and the new settings are in effect for it.

- **No discard.** No phrase N has been generated under the old settings at that moment, so a
  mutation never discards anything.
- **A repeat.** A mutation landing on a phrase that ends up a repeat still counts. The repeat is
  the phrase before, under its own settings, and the phrase after it uses the new settings.
- **Flag off.** With the flag off the context is never read, and the engine's requests are those
  of chunk 8.

### Settings changes at a phrase boundary

A `settings-change { at, settings }` event gives complete settings. A change of tempo or instrument
throws (`changedSettings`): tempo has its own source (see [Adaptive tempo](#adaptive-tempo)), and
the instrument never changes. A
`settings-change` after the end throws too. The **pending phrase** is the phrase that would show
next: the look-ahead not yet decided, or the decided phrase not yet sounding, which the engine
keeps for this case (`DecidedPhrase` in `session-engine-state.ts`).

`discardsPendingPhrase` discards the pending phrase only when both hold:

- **A measure left.** At least one measure (`240 / tempo` s, at the sounding phrase's tempo)
  remains before its deadline. Exactly
  one measure still discards. The test comes first, so the display is read only when the time
  allows a discard.
- **Nothing on screen.** `display.isPhraseOnScreen(phraseNumber)` is false. The display reading
  (`SessionDisplayReading`) is a seam of the engine; the workspace answers it from the rolling
  display.

On a discard, a decided phrase is taken back (`undecide`): the phrase before is the latest decided
again, and the struggling notice is as it was before the decision. The outputs are
`phrase-discarded` (for a decided phrase only), `settings-changed` (`cause: 'automatic'`) naming
the pending phrase, and a new `request-generation` from the first rung, with the same phrase before
and the same deadline. An attempt still in flight is superseded, so its late result is dropped.
Otherwise the pending phrase stays as it is, its ladder on its own settings, and the
`settings-changed` output names the phrase after it. During the count-in phrase 2 is the pending
phrase; phrase 1 is never discarded.

The one-measure test is there so a regenerated phrase still has a chance to be ready: one measure
is 1 s at 240 BPM, the window the
[latency figures](generation-latency.md#settings-mutation-transitions-chunk-24-2026-10-03) are
judged against.

### The carry-in after a change

Each look-ahead now has a **basis** (`LookAheadBasis` in `failure-ladder.ts`): the settings its
attempts are built from, the settings the phrase before was generated under (a repeat's are those
of the phrase it repeats), and its **source**. `lookAheadBasis` keeps the carry-in as it is when
the two settings are the same object, and otherwise asks `adaptCarryIn`
(`carry-in-adaptation.ts`):

- **Nothing relevant changed** (only note density, rhythmic variety, syncopation, silence density,
  contour, leapiness or arpeggio chaos): the same carry-in.
- **A change to Varying:** no carry-in; the phrase is standalone with Varying, resolved again.
- **A change to a fixed register:** the carried window becomes the new register's.
- **A key or collection change:** the harmonic part is dropped. `CarryIn.finalHarmony` is then an
  explicit `null`; a missing field is still refused.
- **A harmonic motion, tension or profile change:** the carried chord is dropped when the new
  settings never end a phrase on it with that endpoint class
  (`rule_harmony_change_drops_unfit_harmonic_carry_in`, accepted by the owner, spec D181).
- **The pitch part is then re-checked:** the carried pitch must lie in the window, and what it owes
  (a leap to recover, a tense note while a chord is carried) must be payable under the new
  settings. If not, the phrase is standalone, pinned to the new fixed register, or to the
  session's resolved register while Varying stays selected.

The checks are the same predicates the intent's own carry-in check uses (`carry-in-fit.ts`), so an
adapted carry-in is never refused. With the harmony dropped, a carried pitch off the old chord is
no longer a tense note owed a step; the leap-recovery checks stay.

`attemptPlan` maps the ladder onto the source. With a carry-in source, the carry-in rungs use the
adapted carry-in and the standalone rung pins the register whose window it carries, as in
[Failure ladder](#failure-ladder). With a standalone source every rung is standalone, with the
source's register.

### Replay from the inputs

`SessionStart.mutation` holds the flag with the seed the caller drew and stores. The engine has no
randomness of its own: attempt seeds come from the providers, and every mutation from that stored
seed. With the same providers, a session therefore replays from its start and its event list
alone, mutations included.
A phrase requested after a key or collection change carries `finalHarmony: null` in its
[phrase replay key](phrase-workspace.md#key-format). The `ifk1.` format is unchanged: a key
encoded before chunk 24, with a full carried harmony, still decodes to the same intent and
re-encodes to the same key.

### In the workspace

`startWorkspaceSessionRunner` (`src/components/workspace/workspace-session-runner.ts`) starts
every workspace session's runner: the starter that `loadSessionRunner()` resolves to calls it (see
[The runner and the one-Worker wiring](#the-runner-and-the-one-worker-wiring)). Chunk 25 connected
the engine's three points to the app:

- **The flag.** `WorkspaceSessionStart` carries the player's `Vary settings` choice
  (`varySettings`) in place of `mutation`. `mutationFlagFor` turns it into the flag: off, or on
  with a seed drawn from the workspace's seed provider before the engine asks for any attempt
  seed. With the choice off no seed is drawn, so such a session draws the seeds it drew before the
  flag existed. The seed is kept in the session's start, so the session replays from its inputs.
- **The display reading.** The controller hands the runner its rolling display's
  `isPhraseOnScreen` for the held layout. The engine reads it only for a `settings-change`, which
  no part of the app sends yet: the engine's own mutations land on a phrase not yet requested, and
  never read it. The workspace harness sends one (`session.changeSettings`) to test the rule end
  to end.
- **The outputs.** A `phrase-discarded` takes the discarded look-ahead back from the phrase steps
  and the display, before its tempo is fixed, so the same number is readied again. A
  `settings-changed` goes to the settings the controls show (below).

**The page's flag.** The controller holds `Vary settings` in memory for the page's life
(`createVarySettingsFlag`, `src/components/workspace/workspace-session-settings.ts`): off at load
(`SETTINGS_MUTATION_DEFAULT`, spec D176), kept from one session to the next, changed with
`setVarySettings(on)` only outside a session (at Idle or while the Review shows); a change during
the count-in or a running session throws. The "During a session" group shows it
(`SessionOptionsControls.vue`), read-only during a generation, a session, or while the controller
loads.

**What the controls show.** `state.shownSettings` is what the read-only controls show while a
session runs (`createSessionShownSettings`): the start settings, the player's own, during the
count-in, then what the phrase now sounding was generated with. A `settings-changed` output is
kept until a generated phrase it applies to starts sounding, on the audio clock, and shows from
that instant; a repeat shows nothing new, so a change landing on a repeat first shows with the next
generated phrase. When several are due at once the latest reported wins. The shell renders the
controls from it, and from the player's Idle settings when it is null.

**The restore at the end (spec D182).** The session never writes the player's Idle controls or
profile selection: it reads them at its start and changes only what it shows. Every end's teardown
sets `shownSettings` back to null, before the end asks Idle for its fresh phrase, so the controls
show the player's own settings again, a `Varying` register and the profile's customized marking
included, and the fresh phrase is generated from them. The flag's own choice is untouched. The
preset status's live region is `aria-live="off"` from the start, before the count-in renders, and
polite again only once the player's values have rendered back, so neither a change nor the return
is announced.

## Multi-phrase tension arc

The [multi-phrase tension arc](music/lexicon.md#tension-across-phrases) (spec D178) shapes a
longer stretch of a session: instead of generating every phrase with the one
[tension arc](music/lexicon.md#tension) in effect, it raises and then lowers the tension over each
group of four phrases. Chunk 29 built the engine side; chunk 30 built its control,
`Tension across phrases` (see
[The Tension across phrases control](#the-tension-across-phrases-control)).

### The cycle

`tension-arc-cycle.ts` holds the cycle as pure functions, with no seed stream, clock or session
state. The step of session phrase n comes from its number alone, through its position
(n − 1) mod 4 in its group of four (`tensionArcCycleStep`):

| Position | Phrases    | Step                            |
| -------- | ---------- | ------------------------------- |
| 0        | 1, 5, 9 …  | none: the tension arc in effect |
| 1        | 2, 6, 10 … | one step tenser                 |
| 2        | 3, 7, 11 … | none                            |
| 3        | 4, 8, 12 … | one step calmer                 |

A step moves along `TENSION_ARCS`, Settled, Lift, Build, Edge, calmest first, and is clamped at
both ends (`steppedTensionArc`). From Lift the phrases go Lift, Build, Lift, Settled, Lift …; from
Settled, Settled, Lift, Settled, Settled …; from Edge, Edge, Edge, Edge, Build … Phrase 1,
generated at Idle, is at position 0, so it is generated as chosen.

### Settings in effect and settings generated under

`settingsGeneratedUnder(flag, phraseNumber, settingsInEffect)` gives the settings a phrase is
generated under: the settings in effect themselves, the same object, when the flag is off or the
clamped step changes nothing; otherwise a frozen copy with only `controls.tension` replaced.

The engine keeps the two apart. The step never reaches `state.settings`, the settings in effect:
a mutation draws from them and every `settings-changed` output reports them, so the tension-arc
control keeps showing the player's choice, and the arc itself outputs no `settings-changed`. Only
the look-ahead basis, from which every attempt's intent is built, takes the stepped settings.

### Where it applies

- **A phrase about to be requested** (`requestNextPhrase`): the step is applied after any mutation
  landing on that phrase, so the cycle steps around the value then in effect. A tension mutation
  from Lift to Build puts Build in effect, and the phrases from then on step around Build.
- **A phrase requested again after a settings change** (`onSettingsChange`): it is stepped by the
  pending phrase's own number, around the new settings. A change that applies only from the phrase
  after reaches the step when that phrase is requested.
- **Every rung** of a phrase, the standalone retry included, uses that phrase's step.
- **A repeat** is the phrase before exactly as it was generated, its step included. The cycle still
  counts by session phrase number, so the phrase after a repeat takes its own number's step.

### The carry-in across a step

The settings the phrase before was generated under, its step included (`lastDecidedSettings`),
are the `before` side of `lookAheadBasis`. A step between two phrases therefore goes through
`adaptCarryIn` like any tension change (see
[The carry-in after a change](#the-carry-in-after-a-change)): the carried harmony is dropped when
the stepped tension never ends a phrase on it, and the pitch part is then re-checked, the phrase
going standalone when it cannot be paid. These are the intent's own carry-in checks, so every join
stays valid. Applying the two adaptation rules, worded for a setting change, across a step awaits
the owner's sign-off on their extended wording (`module_tension_arc_cycle` stays DRAFT).

### Replay and the flag

- **Replay.** The stepped value is the intent's own `controls.tension`, so a phrase's
  [replay key](phrase-workspace.md#phrase-replay-key) holds it, with no change to the `ifk1.`
  format, and replays the phrase as it was generated. The step adds no randomness: the same start,
  providers and events give the same session.
- **The flag.** `SessionStart.multiPhraseTensionArc` is checked by `createSessionEngine` at start
  (`requireTensionArcFlag`: anything but a boolean, a missing flag included, throws a
  `SessionEngineError`) and kept in the engine context for the whole session. Off, every phrase is
  generated under the settings in effect themselves, so the session is exactly the one without the
  flag. `startWorkspaceSessionRunner` passes on the start's flag, the player's
  `Tension across phrases` choice (below).

### The Tension across phrases control

The player calls it **Tension across phrases** (the lexicon's word for the multi-phrase tension
arc).

- **The control.** `Tension across phrases`, `Off` or `On`, sits between `Rising tempo` and
  `Vary settings` in the "During a session" group (`SessionOptionsControls.vue`), with its note:
  "In groups of 4 phrases: your Tension, one step more, your Tension, one step less." It sets the
  page's flag through `setTensionAcrossPhrases`, at Idle and while the Review shows; it is
  read-only during a generation, a session, and while the controller loads. Changing it
  regenerates nothing.
- **The page's flag.** The controller holds it in memory for the page's life
  (`createTensionAcrossPhrasesFlag`, `src/components/workspace/workspace-session-settings.ts`):
  off at load (spec D178), kept from one session to the next, and changed only outside a session;
  a change during the count-in or a running session throws a `SessionControllerError`. Each
  session's start carries it as `multiPhraseTensionArc`, so the engine runs the cycle for that
  whole session.
- **Never a step on screen.** The read-only Tension control shows the tension in effect, the
  player's own or the value `Vary settings` set, never the step a phrase was generated with:
  `state.shownSettings` changes only on `settings-changed` outputs, and the engine never reports a
  step as one (see
  [Settings in effect and settings generated under](#settings-in-effect-and-settings-generated-under)).

`tension-arc-cycle.spec.ts` tests the pure cycle. `session-engine-tension-arc.spec.ts` and
`session-engine-tension-arc-generation.spec.ts` drive whole sessions on the
[session driver](testing.md#the-session-driver).

## What later chunks add

- **Chunk 9 (built):** the session history, fed from the engine's outputs (see
  [Session history](#session-history)).
- **Chunk 10 (built):** the audio clock is `WorkspaceSession.audio.now` (see
  [the audio transport](audio-transport.md)), and the session controller passes it as the runner's
  `now`.
- **Chunk 15 (built):** the session controller and the session screen (see
  [The session controller](#the-session-controller)): the Start click that unlocks the audio, asks
  for the screen locks and starts the transport; the count-in display; the agenda that sends
  `count-in-over`, `phrase-started-sounding` and ticks on the audio clock; the backing queued
  phrase by phrase; the history fed from every runner output; and the `stop`, `hidden-tab` and
  `staff-not-shown` ends, an audio interruption ending with `stop`.
- **Chunk 16 (built):** the rolling display (see [The rolling display](#the-rolling-display)): the
  fit check behind `checkFit` in the held layout, the two systems refilled as the playhead moves,
  the playhead stepping on heard time, the re-engrave in the held layout when the window changes,
  and the material rule that ends a session whose shown or waiting phrases no longer fit.
- **Chunk 17 (built):** MIDI in the session (see
  [The session controller's MIDI side](#the-session-controllers-midi-side)): a session started by
  the starting note (never while the connection sheet is open), the session with or without a
  controller fixed at its start, live acknowledgement, the `silence-timeout` and
  `controller-lost` ends with the disconnect countdown, and the acknowledgements and played notes
  in the history's records. The runner now loads with the controller. The choices it made are in
  [Technical choices made in chunk 17](midi-input.md#technical-choices-made-in-chunk-17); the
  hardware tuning it could not do is in [MIDI Tuning](midi-tuning.md).
- **Chunk 20 (built):** the Review and the generated-notes export, built from the history (see
  [The end once phrase 1 has sounded](#the-end-once-phrase-1-has-sounded) and
  [`docs/export.md`](export.md)). It replaced an interim end that kept the played phrase on the
  staff and blocked `Start session` until a new Idle phrase.
- **Chunk 24 (built):** the settings-mutation engine and setting changes applied at a phrase
  boundary (see
  [Settings mutation and changes at a phrase boundary](#settings-mutation-and-changes-at-a-phrase-boundary)),
  with the flag off in the workspace.
- **Chunk 25 (built):** the flag's control, the display reading from the rolling display, and the
  handling of `settings-changed` and `phrase-discarded` (see [In the workspace](#in-the-workspace)).
- **Chunk 27 (built):** adaptive tempo's engine side, each phrase at its own tempo on the
  transport's tempo map, and the page's flag (see [Adaptive tempo](#adaptive-tempo)).
- **Chunk 28 (built):** the adaptive-tempo control, `Rising tempo`, the exact tempo in effect on
  screen and the reached-tempo note (see [On screen](#on-screen)).
- **Chunk 29 (built):** the multi-phrase tension arc's engine side, with the flag off in the
  workspace (see [Multi-phrase tension arc](#multi-phrase-tension-arc)).
- **Chunk 30 (built):** the multi-phrase tension arc's control, `Tension across phrases` (see
  [The Tension across phrases control](#the-tension-across-phrases-control)).

## Choices made while building it

- **`retry` counts the attempts before this one:** 0 for the first carry-in attempt, 1 to 3 for the
  carry-in retries, 4 for the standalone retry. One number then says both which rung this is and
  how many attempts the phrase has already used.
- **Phrase 1 gets no `phrase-ready`,** only `phrase-sounding` at `count-in-over`. It is already on
  screen from Idle, so there is nothing new to show ahead of it.
- **`end` does not run the deadline check first.** A session that is ending must not decide one
  more phrase (a repeat) that will never be shown.
- **Results for unknown or superseded attempts are dropped.** The Worker protocol has no cancel, so
  a late answer to an attempt the ladder has moved past, or to one dropped at the deadline or the
  end, is expected and harmless.
- **Caller bugs throw `SessionEngineError`:** a second result for an attempt already waiting for
  its fit check, a fit result before the generation result, time going backwards, a second
  `count-in-over`, or `phrase-started-sounding` out of order. These can only come from a wrong
  caller, so they fail early instead of being hidden.
- **`repeatOf` is the phrase directly before,** even when that phrase is itself a repeat. The record
  says what was shown just before it, which is the phrase actually repeated.
- **`wake-at` once per deadline,** when the phrase is requested, not once per retry: every attempt
  of one phrase shares the same deadline.
- **Settings copied and deep-frozen at start,** so nothing the caller changes afterwards can reach
  the session.
- **The step-down memory is set when a request is built as Eighth, not when it succeeds.** The
  session has then already asked for Eighth, so asking for Sixteenth again would be a step back
  up; waiting for a success would allow exactly that after a failed attempt.
- **The standalone retry pins the session's resolved register:** the register whose window is the
  carried window. A Varying register is then resolved only once per session, and a standalone
  phrase never jumps to another part of the instrument's range.
- **The notice shows when the second repeat in a row is decided,** at its deadline, not when it
  starts sounding. It warns the player as soon as the engine knows it is struggling.
- **Phrase 1 and phrase 2 use the same Worker and `generate` seam.** Phrase 2 is on time inside the
  one-measure count-in only because generating phrase 1 warmed that Worker's rhythm-domain memo: a
  cold phrase 2 takes about 0.95 s against a 1 s window at 240 BPM, too close to count on (see
  [the latency verdicts](generation-latency.md#verdicts-reference-machine)).
- **A history record stores the whole shown outcome as well as the intent.** The intent is what
  reproduces the phrase; the outcome carries the harmony the chord symbols need, and lets the
  Review and the exports use exactly what was shown, with no regeneration.
- **Each history record's tempo comes from its `phrase-sounding` output, never from a default.**
  The history trusts the tempo it is given: only one that is not positive or not finite throws, the
  starting tempo of the settings passed at creation included. The record therefore plays back the
  tempo the engine fixed for that phrase (see [Adaptive tempo](#adaptive-tempo)).
- **The session's start time comes from an injected wall clock, read once at creation.** The
  history never reads the system time itself, so tests pass a fake clock, and a value read once
  cannot drift during the session. Chunk 20 uses it for the export file names and the Review's
  summary line.
- **The history keeps the instrument profile id of the locked settings, and refuses a phrase
  generated for another profile.** The profile is locked for the session, so a phrase for another
  one can only come from a wiring mistake. Keeping the id lets the Review and the exports name the
  session's instrument even after the player picks another one.
- **The history re-checks the engine's ordering and throws on a break:** phrase order, time order,
  the repeat mark and the sounded count at the end. The engine already guarantees them, so a break
  can only be a wiring mistake, and it fails at once instead of giving a wrong review or export.
- **The export adapter takes the instrument from the records and refuses a mix.** Every intent
  names its instrument profile, and one session has one instrument, so records of two instruments
  can only come from a caller bug.

The session controller's choices were made in chunk 15:

- **The controller loads as its own chunk.** Its module, with the measurement of phrase 1's fixed
  parts, is a dynamic import inside `WorkspaceSession.createSessionController()`, which `App.vue`
  calls once at setup; `Start session` stays disabled until it has loaded. The entry chunk has a
  size budget (`npm run verify:boundaries`), and the controller is not needed to show the first
  phrase. The parts that must render at once (the header's session action, the cue row, the mix
  controls, the Idle layout gate) stay in the entry chunk, whose budget rose from 200 KiB to
  212 KiB for them. `start()` itself stays synchronous, so the Start click can unlock the audio.
- **A separate wake-up Worker timer.** The transport gives no per-beat callback, and its
  scheduler's timer is its own. The controller gets a second timer of the same kind, so the
  transport's API stays as chunk 10 built it, and the session's wake-ups are not held back by long
  main-thread tasks either. The workspace harness swaps it for a further fake timer stepped by the
  fake audio clock.
- **One agenda on the audio clock, not timers per event.** Every timed action (a count-in beat,
  the count-in's end, a phrase starting, a deadline) is an entry fired when the clock reaches it,
  so the display, the engine and the sound all read one clock, and a test moves them all by
  advancing it.
- **The engine time floor.** The engine refuses time going backwards, and the controller mixes two
  sources of times: due times of scheduled actions and arrival times of results. Raising each to
  the latest time already handed over keeps their order without changing the engine.
- **The window's height is the small viewport height, read from a probe.** `innerHeight` changes
  when a phone's browser toolbar shows or hides, which must end nothing. The browser adapter
  (`browser-window-shape.ts`) measures one hidden, fixed `100svh` element instead, the same
  `100svh` the phone staff budget is built on, and reads the rem media queries use from the same
  element at `font-size: medium`.
- **An audio interruption ends the session with `stop`.** The engine has no cause for it, and for
  the player it is the same as Stop: the sound has stopped.
- **The window rule judges the held layout, not the one the width would pick.** A session never
  switches layout mid-run, so the question is whether the layout it holds still has room.

The settings-mutation choices were made in chunk 24:

- **One indexed stream per mutation, not one stream for the session.** Mutation k's landing
  phrase and draw depend only on (seed, k), so failures, retries and repeats cannot shift a later
  mutation, and a test can state where mutations land without running a session.
- **A mutation lands on the phrase about to be requested,** when the phrase before it starts
  sounding. Nothing has been generated for that phrase yet, so a mutation never needs the discard
  rule.
- **Unsupported steps are listed, then redrawn** from the same stream, so a redraw is as
  reproducible as the first draw, and a mutation is never skipped.
- **The decided phrase is kept until it sounds,** with the notice before its decision, so a
  settings change can take the decision back cleanly.
- **The workspace refused what it could not handle yet.** Until chunk 25 connected them, a
  `settings-changed` or `phrase-discarded` output, or a display read, threw in the workspace
  runner rather than being dropped.

The multi-phrase tension arc's choices were made in chunk 29:

- **A pure module outside the engine.** The cycle and the settings a phrase is generated under
  live in `tension-arc-cycle.ts`; the engine only calls `settingsGeneratedUnder` where it builds a
  look-ahead basis. `session-engine.ts` thus stays under the file-size warning of 400 effective
  lines ([`CODING_RULE.md`](../CODING_RULE.md)), and the cycle is tested without a session.
- **The step comes from the phrase number, with no seed stream.** The cycle is fixed (spec D178),
  so there is nothing to draw and nothing to store for replay, and failures, retries, repeats and
  discards cannot shift it.
- **The step never becomes the settings in effect.** Otherwise a mutation would draw from a
  stepped value, `settings-changed` would report a tension the player never chose, and every step
  would be a settings change, with its discard rule.

The tension-across-phrases control's choices were made in chunk 30:

- **The engine's own boolean.** `WorkspaceSessionStart` now keeps the engine's
  `multiPhraseTensionArc` as it is, the player's choice: the cycle is fixed and draws nothing, so
  unlike `Vary settings` there is no seed to add and nothing to translate.
- **A flag of its own beside `Vary settings`.** `createTensionAcrossPhrasesFlag` has the same shape
  and lock as `createVarySettingsFlag` but is a separate factory, so the settings-mutation flag's
  code and default (`SETTINGS_MUTATION_DEFAULT`) stay untouched; the controller only wires it.
- **Nothing new to hide.** The rule that the Tension control never shows a step needs no code in
  the screen: the controls already render from `shownSettings`, which only `settings-changed`
  outputs move. A controller spec and the e2e spec pin it while the steps run.

The rolling display's choices were made in chunk 16:

- **The height budget belongs to the window, not to the layout.** A `StaffViewport` is the layout
  drawn plus the window's height budget (`null` from `bp-tablet-landscape` up). A held layout is
  sized and judged in the window it is shown in, so a one-system layout held into a short phone
  window has a height rule, as the split one does.
- **The playhead reads heard time, the engine the audio clock.** The playhead must match what the
  player hears, so it subtracts the output latency; the engine's deadlines are about scheduling
  sound, so they do not. The plan therefore lets the phrase after next wait for a position.
- **One frame loop, read on the audio clock.** The playhead is not put on the audio-time agenda:
  the agenda's wake-ups come every 25 ms, while a frame read lands within one frame of the heard
  barline, and the display can only change at a frame anyway.
- **A misfit of the material shown or waiting ends the session.** A look-ahead attempt that does not
  fit is just a failed attempt, but a phrase shown or waiting is never swapped for another, and a
  session never shows the notation error, so a window change that leaves one unable to fit ends
  the session like Stop.
- **The entry chunk's budget rose from 212 KiB to 220 KiB** (`scripts/verify-boundaries.mjs`) for
  `PhraseScore`'s session mode and its wiring, which must be in place when the first phrase shows.

The settings-mutation control's choices were made in chunk 25:

- **The session shows its settings; it never writes the player's.** The controls render from the
  controller's `shownSettings` while a session runs, and the Idle controls and profile selection
  are never touched. The restore at the end (spec D182) is then the teardown dropping what the
  session showed: nothing can be left half-restored, a `Varying` register and the profile's
  customized marking come back as they were, and the fresh phrase reads the player's settings
  because they never changed. The tempo control already worked this way.
- **A change shows at the phrase that sounds with it, not when it is decided.** The engine reports
  a mutation one phrase ahead; the controller keeps it until that phrase, or a later generated one
  after a repeat, starts sounding on the audio clock (ux D157, D170).
- **The flag lives in the controller,** beside the adaptive-tempo flag, for the page's life. The
  control is read-only while the controller's chunk loads, since nothing could hold the choice.
- **The mutation seed is drawn first, from the workspace's seed provider,** only when the flag is
  on, so a session without it draws exactly the seeds it drew before, and the harness can queue a
  seed that gives a known mutation.
- **A settings change from the harness only.** No part of the app sends a `settings-change`: the
  mutations never discard. The runner's `dispatch` accepts one, and the workspace harness sends it
  through a substitute of the runner module, so the discard rule is tested end to end against the
  real rolling display.
