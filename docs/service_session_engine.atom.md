---
id: service_session_engine
status: DRAFT
human_name: Session Engine
tags: session,look-ahead,failure-ladder
parents:
  - [[module_settings_mutation]]
  - [[module_tension_arc_cycle]]
  - [[req_adaptive_tempo]]
  - [[req_rolling_practice_session]]
  - [[req_settings_mutation_flag]]
  - [[rule_adaptive_tempo_flat_schedule]]
  - [[rule_controller_loss_mid_session]]
  - [[rule_count_in_ending_returns_to_idle]]
  - [[rule_dropped_attempt_cancelled]]
  - [[rule_harmony_change_drops_unfit_harmonic_carry_in]]
  - [[rule_hidden_tab_ends_session]]
  - [[rule_key_change_drops_harmonic_carry_in]]
  - [[rule_look_ahead_deadline]]
  - [[rule_look_ahead_phrase_must_fit_staff]]
  - [[rule_mutation_lands_on_scheduled_phrase]]
  - [[rule_phrase_one_is_idle_phrase]]
  - [[rule_register_change_replaces_carried_window]]
  - [[rule_repeat_phrase_marked_internally_only]]
  - [[rule_session_change_applies_at_phrase_boundary]]
  - [[rule_session_density_only_steps_down]]
  - [[rule_session_generation_failure_ladder]]
  - [[rule_session_never_pauses]]
  - [[rule_session_settings_locked]]
  - [[rule_setting_change_rechecks_pitch_carry_in]]
  - [[rule_stop_ends_session]]
  - [[rule_struggling_generator_notice]]
  - [[rule_tempo_never_affects_generation]]
  - [[rule_varying_register_once_per_session]]
dependents:
  - [[module_session_adaptive_tempo_schedule]]
  - [[module_session_carry_in_after_change]]
  - [[module_session_density_step_down]]
  - [[module_session_failure_ladder]]
  - [[module_session_look_ahead_timing]]
  - [[module_session_mutation_step]]
  - [[module_session_settings_change]]
  - [[module_session_struggling_notice]]
  - [[module_session_tension_arc_step]]
  - [[service_session_history]]
  - [[service_session_runner]]
type: SERVICE
layer: ARCHITECTURE
version: 0.8
priority: 1
notes: Synced 2026-10-07 after the code landed (post-task sync, same version 0.8): the technical interface names src/session/session-ladder-step.ts, which holds the failure-ladder steps moved out of session-engine.ts; no change of meaning. Status stays DRAFT, as before the revision. Earlier: Revised 2026-10-07 before code (previous version 0.7, pre-code architecture capture) for rule_dropped_attempt_cancelled and the owner-approved failure ladder version 0.4 (spec D203): the cutover, run after each event, cancels a carry-in attempt still generating at its cutover time and requests the standalone attempt at once; every carry-in request also outputs a wake-at at that cutover time; and a new cancel-generation output for an attempt dropped while still generating (the deadline repeat, a settings change dropping the look-ahead, the session end), ordered before any request-generation in the same batch, never for an attempt in its fitting stage. Status DRAFT until the code lands. Earlier: Revised 2026-10-07 before code (previous version 0.6, pre-code architecture capture) for the owner-approved failure ladder version 0.3 (spec D200-D202): retry is defined as the rung number, kept when carry-in retries are skipped, and a skipped rung's seed and request id are drawn and discarded. Status DRAFT until the code lands. Earlier: The version 0.5 revision, from the v2 chunk 29 post-task sync, was accepted by the product owner on 2026-10-05 (spec D186). Split on 2026-10-05 during documentation debt paydown (previous version 0.5): timing, the failure ladder, the struggling notice, density, settings mutation, adaptive tempo, the multi-phrase tension arc, the settings change event and the carry-in after a change moved unchanged in meaning into child atoms, one concept each, aligned with the src/session modules; this atom keeps the engine contract (purity, start, events, outputs, phrase record, caller errors) and indexes its children. Status stays DRAFT. Earlier: Revised 2026-10-04 in the v2 chunk 29 post-task sync (previous version 0.4) for the multi-phrase tension arc: the multiPhraseTensionArc start field, checked at start and kept in the engine context, and the settings each phrase is generated under (its tension-arc cycle step, never reaching the settings in effect) as its look-ahead basis and the before side of the next carry-in adaptation. Earlier: revised 2026-10-03 before code in v2 chunk 27 (previous version 0.3, pre-code architecture capture) for the adaptive tempo engine: whether adaptive tempo runs as part of the start, the controller event, the phrase tempo output fixed at each look-ahead deadline, the tempo carried by phrase sounding, per-phrase measure timing for deadlines and the discard guard, and the pure adaptive-tempo schedule module with thin engine glue. Tempo stays out of the settings in effect. Earlier: revised in v2 chunk 24 for the settings-mutation engine. Completed 2026-10-03 in the v2 chunk 27 post-task sync, as built: the controller event is followed with or without adaptive tempo during the count-in and running, throws when it does not change presence and is dropped after the end; at 240 BPM nothing changes any more; the schedule glue lives in session-tempo-step.ts. Status stays DRAFT.
---

# Session Engine

## INTENT

Decide, as a pure and deterministic state machine that never reads a clock, what a running session requests, shows and ends, from timed session events alone.

## THE RULE / LOGIC
The engine is a stateful closure over immutable state, with no browser API, no Vue and no clock read. Time is audio time: plain seconds carried on every event. Its only injected dependencies are the request-identity and seed providers, a window-width reading that tells whether the window is below the tablet-landscape layout's width, and a display reading that tells whether any of a given phrase is on screen. The same event list therefore always yields the same outputs. Every output is deep-frozen, and attempt ids are unique per engine, increasing from 1; a skipped ladder rung creates no attempt, but its seed and request id are still drawn from the providers and discarded. Whether the standalone attempt is due is read from the event's own time against the phrase's deadline, never from a clock, and after every event is handled the engine runs the failure ladder's cutover for the open look-ahead phrase, its outputs joining that event's outputs.

- Start takes the start time, the chosen settings (controls and musical profile, deep-frozen at start), phrase 1 (the Idle phrase's intent and successful outcome; any other outcome throws) and the settings-mutation choice: off, or on with the session's mutation seed, which the caller draws and stores, so a session replays from its start and its event list alone. Start also says whether adaptive tempo runs: only when the page-lifetime adaptive-tempo flag is on and the session has a controller at its start (a session started with the selected controller away has none). It says too whether the multi-phrase tension arc runs, a boolean checked at start (anything else throws) and fixed for the session. The settings in effect are part of the engine state, starting as the chosen settings; every intent of the session is built from the settings in effect when its request is built, as its phrase is generated under them (with the multi-phrase tension arc on, the settings in effect with that phrase's tension-arc cycle step applied).
- Events, each with its time: count-in over; phrase started sounding (phrase 2 onward); generation result (attempt id, outcome); generation crashed (attempt id: the generate request was rejected, by a worker crash on that request or by a dead worker); fit result (attempt id, fits); settings change (the complete settings in effect from then on, from an automatic source other than the engine's own mutations); controller (attached or not: a controller lost mid-session going away, or reconnecting); tick; end (cause: stop, hidden tab, staff not shown, silence timeout, controller lost).
- Outputs: request generation (attempt id, phrase number, step carry-in or standalone, retry, intent, deadline), where retry is the attempt's rung on the failure ladder: 0 for the first carry-in attempt, 1 to 3 for the carry-in retries, 4 for the standalone retry, also when the carry-in retries were skipped; check fit (attempt id, phrase number, outcome, and the intent of the attempt being checked); phrase ready (the phrase record to show next as read-ahead, repeats included); phrase sounding (time, phrase record and that phrase's tempo); struggling notice (visible or not); wake at (a time the engine must be woken at: a deadline, output once per deadline when its phrase is requested, not once per retry, since every attempt of one phrase shares that deadline; and, with every carry-in request, that phrase's cutover time, the deadline minus the standalone reserve, at which a carry-in attempt still generating gives way to the standalone attempt); ended (time, cause, phase count-in or running, number of phrases that sounded); settings changed (the first phrase number the change applies to, the settings in effect from that phrase, and its cause: a mutation, which also names the one setting it stepped and the values it stepped from and to, or an automatic change); phrase discarded (the number of a decided look-ahead phrase, already output as phrase ready, dropped to be requested again with new settings); phrase tempo (the number of a phrase from 2 on and the tempo it plays at, output when that tempo is fixed); cancel generation (the attempt id of an attempt the engine drops while it is still in its generating stage, so a later request never waits behind it on the generator: a carry-in attempt still generating at its phrase's cutover time, the attempt in flight when the deadline decides a repeat, the attempt of a look-ahead phrase a settings change drops to request again, and the attempt in flight when the session ends; within one event's outputs it comes before any request generation. An attempt in its fitting stage, whose generation result has arrived and which waits for its fit check, is never cancelled, since its generation is done; its fit result is dropped like any other late result).
- Phrase record: phrase number, origin (idle, carry-in, standalone or repeat), intent, outcome, and for a repeat the number of the phrase directly before it, which is the phrase repeated, even when that phrase is itself a repeat. The repeat origin is the internal repeat mark. Phrase 1 gets no phrase ready, since it is already on screen from Idle; it appears only as the phrase sounding at count-in over.

Caller errors. An event the engine cannot accept throws a typed session engine error rather than being hidden: a settings change that alters the instrument or the tempo; phrase started sounding before the count-in is over or for any phrase but the next decided one; a second count-in over; a time that goes backwards or is not finite; a second generation result, or a crash, for an attempt already waiting for its fit check; a fit result before the attempt's generation result; a controller event that does not change the controller's presence (away while already away, or back while attached); after the end, any event other than a late result, a tick or a controller event.

Parts. The engine's timing, its failure ladder, the struggling notice, density, settings mutation, adaptive tempo, the multi-phrase tension arc, the settings change event and the carry-in after a change each have their own child atom: [[module_session_look_ahead_timing]], [[module_session_failure_ladder]], [[module_session_struggling_notice]], [[module_session_density_step_down]], [[module_session_mutation_step]], [[module_session_adaptive_tempo_schedule]], [[module_session_tension_arc_step]], [[module_session_settings_change]] and [[module_session_carry_in_after_change]].

## TECHNICAL INTERFACE
`createSessionEngine(dependencies: SessionEngineDependencies, start: SessionStart)` in `src/session/session-engine.ts`, called as `createSessionEngine({ providers, viewport, display }, { at, settings, phraseOne, mutation, adaptiveTempo, multiPhraseTensionArc })`, where `providers` are the request-id and seed providers, `viewport` exposes only `isBelowTabletLandscape()`, `display` is a `SessionDisplayReading` exposing only `isPhraseOnScreen(phraseNumber): boolean`, and the `SessionStart` field `mutation` is `{ kind: 'off' } | { kind: 'on', seed }`, the field `adaptiveTempo: boolean` says whether adaptive tempo runs, and the field `multiPhraseTensionArc: boolean` says whether the multi-phrase tension arc runs, checked at start and kept in `EngineContext`. It returns `{ outputsAtStart, handle(event) }`, and `handle` returns the outputs of that one event; no state is exposed. Events: `count-in-over`, `phrase-started-sounding { phraseNumber }`, `generation-result { attemptId, outcome }`, `generation-crashed { attemptId }`, `fit-result { attemptId, fits }`, `settings-change { settings }`, `controller { attached: boolean }`, `tick`, `end { cause }` with cause `'stop' | 'hidden-tab' | 'staff-not-shown' | 'silence-timeout' | 'controller-lost'`, each with `at`. Outputs: `request-generation { attemptId, phraseNumber, step, retry, intent, deadline }`, `check-fit { attemptId, phraseNumber, outcome, intent }`, `phrase-ready`, `phrase-sounding` (carrying that phrase's `tempo`), `struggling-notice`, `wake-at`, `ended { at, cause, phase, soundedPhraseCount }`, `settings-changed`, either `{ phraseNumber, settings, cause: 'mutation', setting, from, to }` or `{ phraseNumber, settings, cause: 'automatic' }`, `phrase-discarded { phraseNumber }`, `phrase-tempo { phraseNumber, tempo }` and `cancel-generation { attemptId }`, the last ordered before any `request-generation` in the same batch. Every carry-in `request-generation` is accompanied by a `wake-at` at its phrase's cutover time; the first rung goes through `firstRung` both in `requestNextPhrase` and when a settings change supersedes a look-ahead phrase, and `runCutover` runs after each event's dispatch. The phrase record is `SessionPhrase { phraseNumber, origin, intent, outcome, repeatOf? }`. A refused event throws `SessionEngineError`. The fit check is a seam the engine asks for through `check-fit`, never computes. Whether a phrase is on screen is a seam too, read through `display`, never computed by the engine. The engine's state and its shared transitions live in `src/session/session-engine-state.ts`, and its failure-ladder steps (`requestFirstRung`, `climb`, `runCutover`, `cancelDropped`) in `src/session/session-ladder-step.ts`.

## EXPECTATION
- Driven by the same timed event list, the engine returns the same, deep-frozen outputs every time, with attempt ids increasing from 1, and never reads a clock.
- Phrase 1 is never output as phrase ready; it is output as sounding at count-in over.
- An end during the count-in reports the count-in phase and no sounded phrase; after the end, late results and ticks are dropped and any other event throws.
- Each event the engine cannot accept throws a session engine error.
- A settings change that alters the instrument or the tempo throws a session engine error.
- A carry-in attempt still generating at its phrase's cutover time, or any attempt still generating when the deadline decides a repeat, when a settings change drops its look-ahead phrase, or when the session ends, is output as cancel generation, before any request generation of the same event; an attempt waiting for its fit check is never output as cancel generation.
- Every carry-in request generation is accompanied by a wake-at at its phrase's cutover time.
