---
id: module_session_start_without_phrase_one
status: REVIEW
type: MODULE
layer: ARCHITECTURE
version: 0.5
priority: 1
human_name: A Session Started Without Phrase 1
tags: [v3, release-v3.2, session, jam]
parents:
  - [[req_jam]]
  - [[rule_jam_click_runs_until_phrase_one]]
  - [[rule_jam_controller_loss_before_phrase_one]]
  - [[rule_jam_ending_before_phrase_one]]
  - [[rule_jam_no_backing_before_phrase_one]]
  - [[rule_jam_phrase_one_failure_ladder]]
  - [[rule_jam_runs_as_session_from_phrase_one]]
  - [[rule_jam_silence_timer_from_phrase_one]]
  - [[service_session_engine]]
dependents: []
---

# A Session Started Without Phrase 1

## INTENT
Let a session begin with no phrase 1, its phrase 1 written after Start by the code that started it, and run from that phrase 1 as any session does, without the session engine knowing what kind of session it runs.

## THE RULE / LOGIC
The way in. A session's start may hold no phrase 1: it then holds the start time, the chosen settings, the session seed and the session's flags, and no phrase 1, no settings phrase 1 was generated under and no ready phrases. Its session seed is drawn once, at Start, inside the Start click or the starting note's callback and before the count-in, from the session-seed provider, since there is no Idle result to take it from; nothing after Start draws a seed (module_session_seed_plan). Such a start records no phrase 1, requests no phrase 2 and queues no backing.

Before phrase 1. Until phrase 1 starts sounding the engine stays in its count-in phase. It requests nothing on its own and sets no deadline of its own. An end in that phase is reported as a count-in end, with its cause: besides Stop, a hidden tab and a staff that can no longer be shown, two causes belong to this phase, no note played within the time its caller allows after the count-in, and no phrase 1 by its deadline. A controller lost in this phase ends the session at once, with no reconnection window. No played note arms the silence timer in this phase: the first note that arms it is one played from phrase 1 on. The click sounds every beat of this phase whatever the click switch says, the count-in's bypass of the click gain lasting until phrase 1 sounds.

Phrase 1's attempts. The caller asks for phrase 1's attempts one at a time, each with its intent and its seed, the step it takes (carry-in when it joins, standalone otherwise), its retry number, the settings it is generated under, its deadline and the steering block every later request of the session carries, whatever this attempt's own intent holds. A newer request supersedes the attempt in flight, and the caller may also drop the attempt in flight without asking for another (a doodle note voiding the doodle's candidate end): the engine then cancels it where it runs while it is still generating. The engine issues each as it issues any attempt: its own attempt id, its generation request, its fit check against the session's staff layout, and its cancellation when a newer request supersedes it or the session ends, so the runner runs it as any attempt. The engine climbs no ladder of its own for phrase 1: it reports each attempt's result to the caller (a phrase that fits, a generation failure, a rejected request, a phrase that does not fit), and the caller's own ladder chooses the next attempt or ends the session.

Phrase 1 decided. The caller hands the engine the fitting attempt as phrase 1, with the time phrase 1 starts sounding, at the barline where phrase 1 is shown, one measure before it sounds. The engine decides phrase 1 under the settings it was generated with, with the origin its attempt has (carry-in when it joined, standalone otherwise; never idle), locks its written bars when the rhythm lock is on, takes the steering block for every later request, and requests phrase 2 at once, at the hand-over, due at the start of phrase 1's last measure; the density's step-down memory starts from phrase 1's own density, so a phrase 1 generated at a lower density than the settings' counts as stepped down. From the hand-over the audio transport takes phrase 1's start from the time handed over, never from the count-in's end: phrase 1's backing starts there, every later phrase starts whole phrases after it, and the silence timer's arming counts from it, so every reader of a phrase's start gets the right one with no change of its own. When phrase 1 starts sounding (the count-in-over event) the session is in its usual running state: from then on nothing tells it from a session started with phrase 1, its failure ladder, deadlines, timers and click switch included.

The engine never names the code that drives it. A fresh Jam's own rules, the home note, the capture of the doodle, phrase 1's rungs, seeds and deadline, live in Jam's code (module_jam_capture), which drives the session through this way in.

## TECHNICAL INTERFACE
The way in belongs to the session engine: createSessionEngine(deps, start) (src/session/session-engine.ts, its state in src/session/session-engine-state.ts) takes a SessionStart or a SessionStartWithoutPhraseOne (src/session/session-phrase-one-types.ts: a SessionStart without phraseOne, phraseOneSettings or readyPhrases) and, for the latter, runs createSessionEngineWithoutPhraseOne (src/session/session-engine-without-phrase-one.ts), whose phase before phrase 1 is src/session/session-before-phrase-one.ts (beforePhraseOneAt, handleBeforePhraseOne, the hand-over as a PhraseOneHandover). Its events are PhraseOneEvent: phrase-one-attempt {at, step, retry, intent, settings, deadline, steering?}, cancel-phrase-one-attempt {at} and phrase-one {at, attemptId, soundsAt}; it reports each attempt's result as the output phrase-one-attempt-result {attemptId, result}, a PhraseOneAttemptResult (fits, generation-failure with its code, crash, not-fitting). SessionEndCause gains no-note-played and no-phrase-one (src/session/session-types.ts), and the engine's state records startedWithoutPhraseOne. The session controller's startWithoutPhraseOne(request: StartWithoutPhraseOne) (src/components/workspace/workspace-session-without-phrase-one.ts, createSessionStartWithoutPhraseOne and beginSessionWithoutPhraseOne) draws the session seed from nextSessionSeed in the Start's callback, starts the transport with clickForced and phraseOneStart handed-over, queues no backing, hands every played note to the caller's port, checks phrase 1's attempts against the held layout itself (phraseOneFitCheck, src/components/workspace/workspace-session-phrase-one-entry.ts), so a StartWithoutPhraseOne is {settings, clef, playedNotes, outputs} with no fit check of the caller's, and returns a SessionWithoutPhraseOne handle {timeline, sessionSeed, attemptSeams, now, wakeAt, dispatch, end, recordDoodle, recordSuggestion, recordDoodleControls}, attemptSeams being the controller's phraseOneSeams dependency (PhraseOneAttemptSeams {nextRequestId, isBelowTabletLandscape}, src/components/workspace/workspace-session-controller-seams.ts) and wakeAt an action on the session's audio-time agenda, dropped once the session has ended; dispatching phrase-one first sets phrase 1's start on the transport (AudioTransport.startPhraseOneAt, src/audio/audio-transport.ts) and the forced click's end (forceClickUntil, src/audio/web-audio-session-bus.ts), then reaches the engine. When the engine readies phrase 1, phraseReadied (src/components/workspace/workspace-session-active.ts) hands it to the session's enterPhraseOne, built by phraseOneEntry (workspace-session-phrase-one-entry.ts): phrase 1's backing and guide notes queued and its notes added for acknowledgement from the start the transport took, the rolling display (createSessionDisplay) with phrase 1 entering the held layout, the phrase steps of phrases 2 on (createSessionPhrases), the read-in measure counted in on the cue row (showCountIn from that measure's start) and, at phrase 1's start, the running phase and count-in-over. src/session/session-midi-timers.ts (noteArmsSilenceBeforePhraseOne, lossEndsAtOnceBeforePhraseOne) and src/components/workspace/workspace-session-midi-run.ts (a session with the controller, run from workspace-session-midi.ts) leave the silence timer unarmed and end at once on a controller loss before phrase 1. No module under src/session or src/audio imports Jam's code (module_jam_code_boundary). Jam's driver of a fresh Jam, startFreshJam (src/jam/fresh-jam.ts), calls startWithoutPhraseOne through the shell's useFreshJam (src/components/workspace/use-fresh-jam.ts), from Start Jam or the home note.

## EXPECTATION
- A start without phrase 1 records no phrase 1, requests no phrase 2, queues no backing and draws exactly one session seed, at Start.
- Before phrase 1 sounds, the engine requests nothing on its own, the click sounds every beat with the click switch off, the silence timer is never armed, a lost controller ends the session at once, and every end is reported as a count-in end with its cause.
- Each phrase 1 attempt the caller asks for is generated, fit-checked and cancelled as any attempt, and its result is reported to the caller; a newer request, or the caller dropping it, cancels the attempt in flight while it still generates.
- Once phrase 1 is handed, phrase 2 is requested at once, due at the start of phrase 1's last measure, and from phrase 1's first beat the session behaves as one started with phrase 1.
- After the hand-over, phrase 1's backing starts at the handed-over time, each later phrase starts whole phrases after it, and the silence timer arms from it, not from the count-in's end.
- A session started with phrase 1 behaves exactly as before.
- No module under src/session names Jam.
