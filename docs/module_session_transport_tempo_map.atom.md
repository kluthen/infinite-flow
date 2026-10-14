---
id: module_session_transport_tempo_map
status: REVIEW
priority: 1
human_name: Session Transport Tempo Map
parents:
  - [[req_adaptive_tempo]]
  - [[req_session_backing_track]]
  - [[rule_click_track]]
  - [[service_workspace_session_flow]]
dependents: []
version: 0.1
tags: audio,session,tempo
type: MODULE
layer: ARCHITECTURE
---

# Session Transport Tempo Map

## INTENT
Keep the audio transport's beats, phrase starts and clicks drift-free while the phrases of a session play at different tempos.

## THE RULE / LOGIC
The transport's click plan is a piecewise tempo map, a new tempo segment from the first beat of each phrase queued at a tempo other than the one before, so beat times, phrase start times and clicks stay drift-free; the count-in and phrase 1 stay at the starting tempo, and the transport tells a phrase's start only up to the phrase after the last one queued.

## TECHNICAL INTERFACE
The audio transport the session controller is built over: queueBacking(phraseNumber, harmony, tempo), its click plan a piecewise tempo map with a new tempo segment from the first beat of each phrase queued at a new tempo, the count-in and phrase 1 at the starting tempo, and phraseStartsAt(phraseNumber) known up to the phrase after the last one queued.

## EXPECTATION
The clicks follow the transport's tempo map, the count-in at the starting tempo.
