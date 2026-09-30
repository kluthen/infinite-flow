---
id: service_session_engine
status: DRAFT
human_name: Session Engine
tags: session,look-ahead,failure-ladder
parents:
  - [[req_rolling_practice_session]]
  - [[rule_count_in_ending_returns_to_idle]]
  - [[rule_hidden_tab_ends_session]]
  - [[rule_look_ahead_deadline]]
  - [[rule_look_ahead_phrase_must_fit_staff]]
  - [[rule_phrase_one_is_idle_phrase]]
  - [[rule_repeat_phrase_marked_internally_only]]
  - [[rule_session_density_only_steps_down]]
  - [[rule_session_generation_failure_ladder]]
  - [[rule_session_never_pauses]]
  - [[rule_session_settings_locked]]
  - [[rule_stop_ends_session]]
  - [[rule_struggling_generator_notice]]
  - [[rule_tempo_never_affects_generation]]
  - [[rule_varying_register_once_per_session]]
dependents:
  - [[service_session_runner]]
type: SERVICE
layer: ARCHITECTURE
version: 0.1
priority: 1
---

# Session Engine

## INTENT
Decide, as a pure and deterministic state machine that never reads a clock, what a running session requests, shows and ends, from timed session events alone.

## THE RULE / LOGIC
The engine is a stateful closure over immutable state, with no browser API, no Vue and no clock read. Time is audio time: plain seconds carried on every event. Its only injected dependencies are the request-identity and seed providers and a window-width reading that tells whether the window is below the tablet-landscape layout's width. The same event list therefore always yields the same outputs. Every output is deep-frozen, and attempt ids are unique per engine, increasing from 1.

- Start takes the start time, the chosen settings (controls and musical profile, deep-frozen at start; every intent of the session is built from them) and phrase 1 (the Idle phrase's intent and successful outcome; any other outcome throws).
- Events, each with its time: count-in over; phrase started sounding (phrase 2 onward); generation result (attempt id, outcome); generation crashed (attempt id: the generate request was rejected, by a worker crash on that request or by a dead worker); fit result (attempt id, fits); tick; end (cause: stop, hidden tab, staff not shown).
- Outputs: request generation (attempt id, phrase number, step carry-in or standalone, retry, intent, deadline), where retry counts the attempts made for that phrase before this one: 0 for the first carry-in attempt, 1 to 3 for the carry-in retries, 4 for the standalone retry; check fit (attempt id, phrase number, outcome); phrase ready (the phrase record to show next as read-ahead, repeats included); phrase sounding (time and phrase record); struggling notice (visible or not); wake at (a deadline, output once per deadline when its phrase is requested, not once per retry, since every attempt of one phrase shares that deadline); ended (time, cause, phase count-in or running, number of phrases that sounded).
- Phrase record: phrase number, origin (idle, carry-in, standalone or repeat), intent, outcome, and for a repeat the number of the phrase directly before it, which is the phrase repeated, even when that phrase is itself a repeat. The repeat origin is the internal repeat mark. Phrase 1 gets no phrase ready, since it is already on screen from Idle; it appears only as the phrase sounding at count-in over.

Timing. A measure is four beats at the frozen tempo. Count-in over is the moment phrase 1 starts sounding; the count-in is one measure. Phrase 2 is requested at start with its deadline at the count-in's end, and count-in over requests nothing new. When phrase N (N of 2 or more) starts sounding, phrase N+1 is requested with its deadline at the start of phrase N's last measure. Every event except end first runs the deadline decision for its time; a result arriving at or after the deadline is too late. End runs no deadline decision, so a session that is ending never decides one more phrase (a repeat) that would never be shown. Tempo only sets these times, never an intent.

Failure ladder. One attempt per look-ahead phrase is in flight at a time. The first attempt carries in from the phrase before, with a fresh seed. A failed attempt (a generation that found no phrase, a rejected generate request, whether a worker crash or a dead worker, or a phrase that does not fit) leads to up to three retries with a fresh seed and the same carry-in, requested only before the deadline, then one standalone retry with no carry-in and a fresh seed, its register fixed to the session's resolved register window so a Varying register stays resolved once per session. A successful outcome becomes ready only after its fit check passes. If no valid phrase exists at the deadline, whether the ladder is exhausted or an attempt is still in flight, the previous phrase is repeated as the next one, decided at the deadline and not earlier. The phrase after a standalone or a repeat carries in normally from that record. Results for an unknown or superseded attempt, or arriving after the deadline or the end, are dropped, since the worker cannot cancel a request; after the end, ticks are dropped too. No failure ever ends the session.

Caller errors. An event the engine cannot accept throws a typed session engine error rather than being hidden: phrase started sounding before the count-in is over or for any phrase but the next decided one; a second count-in over; a time that goes backwards or is not finite; a second generation result, or a crash, for an attempt already waiting for its fit check; a fit result before the attempt's generation result; after the end, any event other than a late result or a tick.

Struggling notice. Repeats are counted consecutively in decision order. The notice becomes visible when the second repeat in a row is decided, at its deadline, and stays through further repeats. A generated phrase, carry-in or standalone, resets the count, and the notice clears when that phrase starts sounding. It clears at the end.

Density. Each request's note density is resolved when the request is built, from the chosen density, the window-width reading at that moment and the session's step-down memory. The memory is set as soon as any attempt's request is built with Eighth for a chosen Sixteenth, whether or not that attempt succeeds, and holds until the session ends. Phrase 1 never sets it; phrase 2's request is built at start from the window then.

## TECHNICAL INTERFACE
`createSessionEngine({ providers, viewport }, { at, settings, phraseOne })` in `src/session/session-engine.ts`, where `providers` are the request-id and seed providers and `viewport` exposes only `isBelowTabletLandscape()`. It returns `{ outputsAtStart, handle(event) }`, and `handle` returns the outputs of that one event; no state is exposed. Events: `count-in-over`, `phrase-started-sounding { phraseNumber }`, `generation-result { attemptId, outcome }`, `generation-crashed { attemptId }`, `fit-result { attemptId, fits }`, `tick`, `end { cause }` with cause `'stop' | 'hidden-tab' | 'staff-not-shown'`, each with `at`. Outputs: `request-generation { attemptId, phraseNumber, step, retry, intent, deadline }`, `check-fit`, `phrase-ready`, `phrase-sounding`, `struggling-notice`, `wake-at`, `ended { at, cause, phase, soundedPhraseCount }`. The phrase record is `SessionPhrase { phraseNumber, origin, intent, outcome, repeatOf? }`. A refused event throws `SessionEngineError`. The fit check is a seam the engine asks for through `check-fit`, never computes.

## EXPECTATION
- Driven by the same timed event list, the engine returns the same, deep-frozen outputs every time, with attempt ids increasing from 1, and never reads a clock.
- At 60, 120 and 240 BPM, phrase 2 is requested at start with its deadline at the count-in's end, and phrase N+1 is requested when phrase N starts sounding with its deadline at the start of N's last measure; every attempt of one phrase shares that deadline, and the request intents are identical at every tempo.
- Phrase 1 is never output as phrase ready; it is output as sounding at count-in over.
- Mixed generation failures, crashes and failed fit checks run up to three carry-in retries, then one standalone retry keeping the resolved register, before the deadline; with no valid phrase at the deadline the previous phrase is repeated, marked as a repeat of the phrase directly before, and the session keeps running.
- A late or superseded result never becomes a phrase.
- The struggling notice shows when the second consecutive repeat is decided, stays through further repeats, clears when a generated phrase starts sounding, and clears at the end.
- Once any request is built with Eighth for a chosen Sixteenth, every later request of the session uses Eighth.
- An end during the count-in reports the count-in phase and no sounded phrase; after the end, late results and ticks are dropped and any other event throws.
- Each event the engine cannot accept throws a session engine error.
