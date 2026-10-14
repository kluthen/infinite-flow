---
id: module_session_adaptive_tempo_schedule
status: REVIEW
priority: 1
human_name: Session Adaptive Tempo Schedule
parents:
  - [[req_adaptive_tempo]]
  - [[rule_adaptive_tempo_flat_schedule]]
  - [[rule_controller_loss_mid_session]]
  - [[rule_tempo_never_affects_generation]]
  - [[service_session_engine]]
type: MODULE
layer: ARCHITECTURE
tags: session,tempo,adaptive-tempo
dependents: []
version: 0.1
---

# Session Adaptive Tempo Schedule

## INTENT
Fix the tempo each session phrase from 2 on plays at, raising it step by step while the player keeps a controller attached when adaptive tempo runs, without tempo ever reaching the settings in effect.

## THE RULE / LOGIC
Each phrase from 2 on has its tempo fixed at its look-ahead deadline (phrase 2's at the count-in's end), the point after which the decided phrase can no longer be discarded, and output then as phrase tempo: audio must be scheduled ahead, so this is the latest safe moment. Without adaptive tempo every phrase plays at the starting tempo. With it, the schedule is decided by a pure adaptive-tempo module the engine calls through thin glue. A controller event tells the engine when a controller lost mid-session goes away and when it reconnects; the controller is attached at start. The engine follows it whether or not adaptive tempo runs, during the count-in and while running; one that does not change the controller's presence throws, and one arriving after the end is dropped, since a loss can race the end. A phrase counts toward the next rise when it starts sounding (at count-in over for phrase 1, at phrase started sounding from phrase 2) while the controller is attached. Once two counted phrases have started since the last rise, the next phrase whose tempo is fixed while the controller is attached plays 5 BPM faster than the phrase before it, never above 240 BPM, and the count restarts at 0. Once a phrase plays at 240 BPM nothing changes any more: every later phrase plays at 240 BPM and no further rise happens. While the controller is away no rise happens and the due rise waits; a loss in the final measure before a phrase boundary cannot stop that boundary's rise, since that phrase's tempo is already fixed. Tempo is never part of the settings in effect: the settings and every intent keep the starting tempo, so generation and replay keys are unchanged, and a rise is never output as settings changed.

## TECHNICAL INTERFACE
The `SessionStart` field `adaptiveTempo: boolean` says whether adaptive tempo runs. The engine takes the `controller { attached: boolean }` event and outputs `phrase-tempo { phraseNumber, tempo }`; `phrase-sounding` carries that phrase's `tempo`. The adaptive-tempo schedule (counting and rises) is a pure module in `src/session/adaptive-tempo.ts` (`startAdaptiveTempo`, `controllerPresence`, `phraseStartedSounding`, `nextPhraseTempo`), and the engine's thin glue to it is in `src/session/session-tempo-step.ts` (the tempo state at start, fixing a phrase's tempo once its deadline is reached, counting a sounding phrase, the controller event, and the tempo of a given or the sounding phrase), the tempo state `SessionTempo { schedule, fixed }` being kept in the engine state apart from the settings in effect.

## EXPECTATION
Each phrase from 2 on has its tempo fixed and output as phrase tempo at its look-ahead deadline, phrase sounding carries that phrase's tempo, and phrase N+1's deadline is computed from phrase N's own tempo; without adaptive tempo every phrase plays at the starting tempo. With adaptive tempo, once two phrases that started sounding while the controller was attached have started since the last rise, the next phrase whose tempo is fixed while it is attached plays 5 BPM faster, never above 240 BPM; while a controller lost mid-session is away no phrase counts and no rise happens. Once a phrase plays at 240 BPM, every later phrase plays at 240 BPM. The controller event is accepted with or without adaptive tempo, during the count-in and while running; one that does not change the controller's presence throws, and one after the end is dropped. With adaptive tempo, the settings in effect and every request intent keep the starting tempo, and no rise is output as settings changed.
