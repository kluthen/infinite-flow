---
id: module_session_look_ahead_timing
status: REVIEW
version: 0.1
notes: Split out on 2026-10-05 from service_session_engine (version 0.5) during documentation debt paydown; the text is moved unchanged in meaning and keeps its DRAFT status.
dependents: []
type: MODULE
layer: ARCHITECTURE
priority: 1
human_name: Session Look-Ahead Timing
tags: session,look-ahead,timing
parents:
  - [[rule_look_ahead_deadline]]
  - [[rule_tempo_never_affects_generation]]
  - [[service_session_engine]]
---

# Session Look-Ahead Timing

## INTENT
Fix when the session engine requests each look-ahead phrase and the deadline by which it must be decided, from the phrases' tempos alone.

## THE RULE / LOGIC
A measure is four beats at the tempo of the phrase it belongs to; phrase 1 plays at the starting tempo, the tempo of the chosen settings. Count-in over is the moment phrase 1 starts sounding; the count-in is one measure at the starting tempo. Phrase 2 is requested at start with its deadline at the count-in's end, and count-in over requests nothing new. When phrase N (N of 2 or more) starts sounding, phrase N+1 is requested with its deadline at the start of phrase N's last measure, computed from phrase N's own tempo. Every event except end first runs the deadline decision for its time; a result arriving at or after the deadline is too late. End runs no deadline decision, so a session that is ending never decides one more phrase (a repeat) that would never be shown. Tempo only sets these times, never an intent.

## TECHNICAL INTERFACE
The deadline is carried by the engine's request-generation output (`deadline`) and its `wake-at` output; the deadline arithmetic is `phraseTwoDeadline` and `nextPhraseDeadline` in `src/session/session-timing.ts`.

## EXPECTATION
At 60, 120 and 240 BPM, phrase 2 is requested at start with its deadline at the count-in's end, and phrase N+1 is requested when phrase N starts sounding with its deadline at the start of N's last measure; every attempt of one phrase shares that deadline, and the request intents are identical at every tempo.
