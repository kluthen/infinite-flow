---
id: module_session_look_ahead_timing
status: REVIEW
version: 0.2
notes: Note corrected 2026-10-07 (same version 0.2, no change of meaning): the sweep counts below now say which phrases lost their carry-in at 60 and 120 BPM, which the earlier wording wrongly put on phrase 2; the product owner locked the same day that at 240 BPM phrase 2 is always requested standalone first. Synced 2026-10-07 after the code landed (post-task sync, same version 0.2): constant names aligned with the code (STANDALONE_BUDGET_SECONDS 0.95 s, WORKER_RESPAWN_SECONDS 0.125 s, their sum STANDALONE_RESERVE_SECONDS 1.075 s, cutoverAt), and the measured consequence recorded: the reserve exceeds one measure at 240 BPM (1 s), so phrase 2 is always requested standalone first there, and so is phrase 2 when a settings change during the count-in requests it again; later phrases keep their carry-in attempts while more than the reserve remains. The full real-cost sweep (568 cases at 60, 120 and 240 BPM, 0 failing) counted carry-in lost to the time rule for 1 phrase at 60 BPM (a Sixteenth case's phrase 3, standalone after the cutover cancelled its carry-in attempt), 2 at 120 BPM (an Eighth case's phrase 6 and a Sixteenth case's phrase 3, both standalone after a cutover cancel) and 568 at 240 BPM (every case's phrase 2, requested standalone first, and no phrase after phrase 2), with no repeat and no undecided phrase at any tempo. Status DRAFT to REVIEW, its status before the revision, now that the code and its linked tests have landed. Earlier: Revised 2026-10-07 before code (previous version 0.1, REVIEW, back to DRAFT; pre-code architecture capture) for the owner-approved failure ladder version 0.4 (spec D203): adds the standalone reserve, two measured constants and their sum, and the pure standaloneDue test that gives the cutover time of a look-ahead phrase. Status DRAFT until the code lands. Earlier: split out on 2026-10-05 from service_session_engine (version 0.5) during documentation debt paydown; the text is moved unchanged in meaning and keeps its DRAFT status.
dependents: []
type: MODULE
layer: ARCHITECTURE
priority: 1
human_name: Session Look-Ahead Timing
tags: session,look-ahead,timing
parents:
  - [[rule_look_ahead_deadline]]
  - [[rule_session_generation_failure_ladder]]
  - [[rule_tempo_never_affects_generation]]
  - [[service_session_engine]]
---

# Session Look-Ahead Timing

## INTENT
Fix when the session engine requests each look-ahead phrase and the deadline by which it must be decided, from the phrases' tempos alone.

## THE RULE / LOGIC
A measure is four beats at the tempo of the phrase it belongs to; phrase 1 plays at the starting tempo, the tempo of the chosen settings. Count-in over is the moment phrase 1 starts sounding; the count-in is one measure at the starting tempo. Phrase 2 is requested at start with its deadline at the count-in's end, and count-in over requests nothing new. When phrase N (N of 2 or more) starts sounding, phrase N+1 is requested with its deadline at the start of phrase N's last measure, computed from phrase N's own tempo. Every event except end first runs the deadline decision for its time; a result arriving at or after the deadline is too late. End runs no deadline decision, so a session that is ending never decides one more phrase (a repeat) that would never be shown. Tempo only sets these times, never an intent.

The failure ladder keeps a fixed reserve of audio time before each deadline for the standalone attempt. The reserve is the sum of two constants: the standalone budget, the time a standalone attempt needs, and the worker respawn cost, the time replacing the generation worker to cancel an attempt costs. Both are measured by the build, and their values are documented with that evidence in the code beside them; neither depends on tempo, settings or phrase. The reserve is longer than one measure at 240 BPM, so there phrase 2, whose deadline is one measure after the start, is always requested standalone first, and so is phrase 2 when a settings change during the count-in requests it again. A look-ahead phrase's cutover time is its deadline minus the reserve, and the standalone attempt is due at a time when that time is at or after the cutover. The test is a pure function of the event time and the deadline: it reads no clock, so the engine stays deterministic for a given timed event list.

## TECHNICAL INTERFACE
The deadline is carried by the engine's request-generation output (`deadline`) and its `wake-at` output; the deadline arithmetic is `phraseTwoDeadline` and `nextPhraseDeadline` in `src/session/session-timing.ts`. The same file exports the two measured constants `STANDALONE_BUDGET_SECONDS` and `WORKER_RESPAWN_SECONDS` (seconds of audio time), their sum `STANDALONE_RESERVE_SECONDS`, `cutoverAt(deadline: AudioTime): AudioTime`, the deadline minus the reserve, and `standaloneDue(at: AudioTime, deadline: AudioTime): boolean`, true when `at >= cutoverAt(deadline)`.

## EXPECTATION
At 60, 120 and 240 BPM, phrase 2 is requested at start with its deadline at the count-in's end, and phrase N+1 is requested when phrase N starts sounding with its deadline at the start of N's last measure; every attempt of one phrase shares that deadline, and the request intents are identical at every tempo. standaloneDue is false before the deadline minus the reserve and true at and after it, and the reserve equals the standalone budget plus the worker respawn cost. At 240 BPM the standalone attempt is already due when phrase 2 is requested; at 60 and 120 BPM it is not.
