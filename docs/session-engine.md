# Session Engine

This document records how `src/session/` decides what a running practice session asks for, shows
and ends: its boundary, the timed events it takes and the outputs it answers with, the look-ahead
deadlines, the failure ladder, the struggling-generator notice, the settings lock and note-density
step-down, how tempo stays out of generation, the runner that connects the engine to the app's one
generation Worker, what later chunks add, and the choices made while building it.

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

| File                   | Holds                                                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `session-types.ts`     | The contract: `AudioTime`, `SessionEndCause`, `SessionPhrase`, `SessionStart`, `SessionEvent`, `SessionOutput`, the error.    |
| `session-timing.ts`    | The measure length and the look-ahead deadlines, as plain arithmetic.                                                         |
| `failure-ladder.ts`    | The ladder's rungs, the attempt in flight, the accepted phrase and the repeat.                                                |
| `session-intents.ts`   | The settings freeze and how each attempt's intent is built (density, register, carry-in).                                     |
| `struggling-notice.ts` | The struggling-generator notice as a pure reducer.                                                                            |
| `session-engine.ts`    | `createSessionEngine(deps, start)`: the state machine that ties the others together.                                          |
| `session-runner.ts`    | `createSessionRunner(deps, start)`: executes the engine's requests (see [The runner](#the-runner-and-the-one-worker-wiring)). |

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

## What later chunks add

- **Chunk 9:** the session history, built from `phrase-sounding` outputs.
- **Chunk 10 (built):** the audio clock is `WorkspaceSession.audio.now` (see
  [the audio transport](audio-transport.md)), and chunk 15 passes it as the runner's `now`.
- **Chunk 15:** the session screen, audio, count-in display and locks, and the transport that sends
  `count-in-over`, `phrase-started-sounding`, ticks and the `stop`, `hidden-tab` and
  `staff-not-shown` ends.
- **Chunk 16:** the fit check behind `checkFit`.
- **Chunk 17:** the MIDI end causes (silence timeout, controller lost).
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
