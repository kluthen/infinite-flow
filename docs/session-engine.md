# Session Engine

This document records how `src/session/` decides what a running practice session asks for, shows
and ends: its boundary, the timed events it takes and the outputs it answers with, the look-ahead
deadlines, the failure ladder, the struggling-generator notice, the settings lock and note-density
step-down, how tempo stays out of generation, the runner that connects the engine to the app's one
generation Worker, the session history that records every phrase that sounded, what later chunks
add, and the choices made while building it.

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
  (`GenerationIntentProviders`) and the window-width reading
  (`Pick<ViewportWidthProvider, 'isBelowTabletLandscape'>`).
- **Immutable outputs.** Every output is deep-frozen, and attempt ids are unique per engine,
  increasing from 1.
- **Caller bugs throw.** An event the engine cannot accept throws a typed `SessionEngineError`
  (see [Choices made while building it](#choices-made-while-building-it) for the list).

| File                        | Holds                                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `session-types.ts`          | The contract: `AudioTime`, `SessionEndCause`, `SessionPhrase`, `SessionStart`, `SessionEvent`, `SessionOutput`, the error.      |
| `session-timing.ts`         | The measure length and the look-ahead deadlines, as plain arithmetic.                                                           |
| `failure-ladder.ts`         | The ladder's rungs, the attempt in flight, the accepted phrase and the repeat.                                                  |
| `session-intents.ts`        | The settings freeze and how each attempt's intent is built (density, register, carry-in).                                       |
| `struggling-notice.ts`      | The struggling-generator notice as a pure reducer.                                                                              |
| `session-engine.ts`         | `createSessionEngine(deps, start)`: the state machine that ties the others together.                                            |
| `session-runner.ts`         | `createSessionRunner(deps, start)`: executes the engine's requests (see [The runner](#the-runner-and-the-one-worker-wiring)).   |
| `session-history.ts`        | `createSessionHistory(settings, wallClock)`: records every phrase that sounded (see [Session history](#session-history)).       |
| `session-history-export.ts` | The encoder inputs built from a recorded session (see [Handing a session to the encoders](#handing-a-session-to-the-encoders)). |

`createSessionEngine(deps, start)` takes the start time, the chosen settings and phrase 1 (its
intent and its successful outcome). It returns `outputsAtStart` and `handle(event)`, which returns
the outputs of that one event.

## Events and outputs

Every event has an `at`, its audio time.

| Event                                      | Meaning                                                                                                           |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `count-in-over`                            | The count-in is over and phrase 1 starts sounding. Sent once.                                                     |
| `phrase-started-sounding { phraseNumber }` | Phrase N (2 or more) starts sounding. It must be the next decided phrase.                                         |
| `generation-result { attemptId, outcome }` | The generate seam answered an attempt with a `GenerationOutcome` (a success or a generation failure).             |
| `generation-crashed { attemptId }`         | The generate seam rejected: a Worker crash on that one request, or a dead Worker. A failed attempt, never an end. |
| `fit-result { attemptId, fits }`           | Whether an attempt's generated phrase fits the staff.                                                             |
| `tick`                                     | Time has reached `at`; lets the engine see a deadline pass.                                                       |
| `end { cause }`                            | The session ends: `'stop'` (the player's Stop), `'hidden-tab'` (the tab became hidden) or `'staff-not-shown'`.    |

| Output                                                                          | Meaning                                                                                                      |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `request-generation { attemptId, phraseNumber, step, retry, intent, deadline }` | Generate this intent. `step` is `'carry-in'` or `'standalone'`; `retry` counts the attempts before this one. |
| `check-fit { attemptId, phraseNumber, outcome }`                                | Check whether this generated phrase fits the staff.                                                          |
| `phrase-ready { phrase }`                                                       | The phrase to show next as read-ahead, repeats included.                                                     |
| `phrase-sounding { at, phrase }`                                                | A phrase started sounding, with its full record.                                                             |
| `struggling-notice { visible }`                                                 | Show or hide the struggling-generator notice.                                                                |
| `wake-at { at }`                                                                | Send a `tick` at this time: the next deadline.                                                               |
| `ended { at, cause, phase, soundedPhraseCount }`                                | The session ended, during the `'count-in'` or while `'running'`, after this many phrases started sounding.   |

The phrase record, `SessionPhrase`, is `{ phraseNumber, origin, intent, outcome, repeatOf? }`.
`origin` is `'idle'` (phrase 1), `'carry-in'`, `'standalone'` or `'repeat'`. The repeat mark is
internal: no view shows it.

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
  deadline at `s` plus three measures: the start of phrase N's last measure, which leaves at least
  one measure of read-ahead on screen.
- **Every event except `end`** first runs the deadline check for its time. A result that arrives
  at or after the deadline is too late.
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
  change the caller makes to its own objects later cannot reach the session.
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

## The runner and the one-Worker wiring

`createSessionRunner(deps, start)` in `src/session/session-runner.ts` wraps one engine. Its
dependencies are `generate`, `checkFit`, `now`, `providers`, `viewport`, `onOutput` and `onError`.

- **Generate.** Each `request-generation` runs through the injected `generate` seam; the result
  comes back as a `generation-result` event stamped with `now()`.
- **Crashes.** A rejection that is a `GenerationWorkerCrashError` or a
  `GenerationWorkerTransportError` becomes `generation-crashed` for that attempt: a failed attempt,
  handled by the ladder. Any other rejection is a programming error: it goes to `onError`, never
  swallowed and never counted as a failed attempt.
- **Fit check.** Each `check-fit` runs through `checkFit`, a required seam with no default; its
  answer comes back as a `fit-result` stamped with `now()`.
- **Clock.** `now` is the injected audio clock. The runner is the only place in `src/session/`
  that reads a time.
- **Other outputs** go to `onOutput`. Ticks, `count-in-over`, `phrase-started-sounding` and every
  end cause come from the transport that drives the runner.

`WorkspaceSession.createSessionRunner(...)`, built by `composeWorkspaceSession` in
`src/components/workspace/create-workspace-session.ts`, binds the runner to the same
`deps.generate` the Idle flow uses, and so to the app's one generation Worker (see
[Session wiring](phrase-workspace.md#session-wiring)). Phrase 1 and phrase 2 therefore go through
the one seam, and phrase 2 reuses the rhythm-domain memo that generating phrase 1 warmed (see
[Canonical rhythm-domain memo](phrase-workspace.md#canonical-rhythm-domain-memo)).

The runner posts no pre-warm of its own, but it shares the Worker and memo with the Idle flow's
[pre-warm](phrase-workspace.md#pre-warm), so a rhythm setting pre-warmed at Idle is already built
when the runner generates on it. A runner `generate` that arrives while a pre-warm is still
building is served between two of its slices, after about one slice (8 ms) at most. Phrase 2's
warm reuse of the memo is unchanged.

## Session history

`createSessionHistory(settings, wallClock)` in `src/session/session-history.ts` keeps an in-memory
record of every phrase of one session that started sounding. The Review screen and the exports will
be built from it. It never reads the system time, uses no browser API and stores nothing outside
memory. Nothing creates a history on screen yet (chunk 15).

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

`phrases()` reads back every record in sounding order, and `phraseCount` says how many phrases have
started sounding so far. Each record, `SessionHistoryRecord`, holds:

| Field                             | Holds                                                                                                                                                                                                                                                                                              |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `phraseNumber`                    | The session phrase number: 1, 2, 3 … with no gap.                                                                                                                                                                                                                                                  |
| `startedAt`                       | The audio time the phrase started sounding.                                                                                                                                                                                                                                                        |
| `outcome`                         | The phrase exactly as shown: its timeline (its notes and rests in time order) and the [harmony](music/lexicon.md#harmony) (the chords under the melody) its [chord symbols](music/lexicon.md#chord-symbol) come from.                                                                              |
| `intent`                          | What reproduces the phrase: the resolved request with the [note density](music/lexicon.md#note-density) it was actually generated with, its [seed](music/lexicon.md#seed) (the number that drives the generator's random choices) and its carry-in. A phrase stepped down to Eighth stores Eighth. |
| `tempo`                           | The [tempo](music/lexicon.md#tempo) it played at, in BPM.                                                                                                                                                                                                                                          |
| `isRepeat`, `repeatOf`            | The internal repeat mark: whether the failure ladder repeated the phrase before, and which phrase. No view and no export shows it.                                                                                                                                                                 |
| `acknowledgements`, `playedNotes` | Empty today. Chunk 17 fills them with the notes the player played.                                                                                                                                                                                                                                 |

Every record is deep-frozen. The list `phrases()` returns is frozen too, and rebuilt only on the
first read after a new record, so reading it again costs nothing.

Generation is a pure function of its intent, seed included, so `generatePhrase(record.intent)`
gives back the timeline stored in `record.outcome`. A property test checks this over a whole seed
matrix of real sessions (see [Determinism](testing.md#determinism)).

### Handing a session to the encoders

`src/session/session-history-export.ts` builds the inputs of the two generated-notes encoders (see
[Export](export.md)) from the stored records. It never regenerates a phrase.

- `musicXmlInputFromHistory(records)` gives the session's instrument and, for each record, its
  phrase number, its stored phrase written as the staff showed it (in the instrument's
  [written pitch](music/lexicon.md#written-pitch), the note printed for a transposing instrument),
  and its tempo.
- `midiInputFromHistory(records, backing)` gives, for each record, its phrase number, its stored
  timeline in [concert pitch](music/lexicon.md#concert-pitch) (the pitch you actually hear) and
  its tempo, with the backing the caller passes (`null` when the backing is left off).

Only those fields travel. The repeat mark never does, so a repeat encodes exactly like any other
phrase. Both throw a typed `SessionHistoryExportError` on an empty history, which has nothing to
export, and on records generated for two different instruments. Nothing calls them yet: the export
action arrives with the Review (chunk 20).

### Outputs the history refuses

An output a session cannot produce throws a typed `SessionHistoryError`:

- settings whose tempo is not a positive, finite number of BPM, at creation;
- a `wallClock` reading that is not a finite, non-negative number of epoch milliseconds, at
  creation;
- a `phrase-sounding` whose intent was generated for another instrument profile than the
  session's;
- a `phrase-sounding` that is not the next phrase, or that starts before the phrase before it;
- a repeat that names no earlier phrase, or a phrase that is no repeat but names one;
- any output after `ended`;
- an `ended` in the count-in after a phrase was recorded, or whose count of sounded phrases
  differs from the number of records.

### A long session

A session has no length cap, so the history has a time budget: building and reading back 2 000
phrases (about 2 h 15 min at 60 BPM) must take under 250 ms. The unit test "a long session" in
`tests/unit/session/session-history.spec.ts` checks it and prints the time.

| Date       | Machine                                                                              | Build and read back 2 000 phrases | Budget |
| ---------- | ------------------------------------------------------------------------------------ | --------------------------------- | ------ |
| 2026-09-30 | AMD Ryzen 5 PRO 8640HS (12 threads), bare metal, not a virtual machine; Node 22.23.2 | 2.3 ms                            | 250 ms |

This figure is recorded here, not in [Generation Latency](generation-latency.md), because it
measures no generation.

## What later chunks add

- **Chunk 9 (built):** the session history, fed from the engine's outputs (see
  [Session history](#session-history)).
- **Chunk 10 (built):** the audio clock is `WorkspaceSession.audio.now` (see
  [the audio transport](audio-transport.md)), and chunk 15 passes it as the runner's `now`.
- **Chunk 15:** the session screen, audio, count-in display and locks, and the transport that sends
  `count-in-over`, `phrase-started-sounding`, ticks and the `stop`, `hidden-tab` and
  `staff-not-shown` ends. It also feeds the runner's outputs to a session history.
- **Chunk 16:** the fit check behind `checkFit`.
- **Chunk 17:** the MIDI end causes (silence timeout, controller lost), and the acknowledgements and
  played notes in the history's records.
- **Chunk 20:** the Review and the generated-notes export, built from the history.
- **Chunk 24:** setting changes applied at a phrase boundary.

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
- **The history's tempo comes from the session's locked settings, passed at creation, never from a
  default.** The history trusts the settings it is given: only a tempo that is not positive or not
  finite throws. Chunk 15 passes the same locked settings to the engine and the history, so the
  history plays back the tempo the engine ran at.
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
