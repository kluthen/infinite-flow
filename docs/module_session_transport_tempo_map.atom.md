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
version: 0.3
tags: audio,session,tempo
type: MODULE
layer: ARCHITECTURE
---

# Session Transport Tempo Map

## INTENT
Keep the audio transport's beats, phrase starts and clicks drift-free while the phrases of a session play at different tempos.

## THE RULE / LOGIC
The transport's click plan is a piecewise tempo map, a new tempo segment from the first beat of each phrase queued at a tempo other than the one before, so beat times, phrase start times and clicks stay drift-free; the count-in and phrase 1 stay at the starting tempo, and the transport tells a phrase's start only up to the phrase after the last one queued. In a session started without phrase 1, phrase starts are known only from the hand-over of phrase 1: phrase 1 starts at the time handed over, every later phrase whole phrases after it, and the beats up to phrase 1 stay at the starting tempo; before the hand-over no phrase's start is told, and a handed-over time that is not a barline of the click plan at or after the count-in's end is refused. A session started with phrase 1 keeps phrase 1 at the count-in's end.

## TECHNICAL INTERFACE
The audio transport the session controller is built over: queueBacking(phraseNumber, harmony, tempo), its click plan a piecewise tempo map with a new tempo segment from the first beat of each phrase queued at a new tempo, the count-in and phrase 1 at the starting tempo, and phraseStartsAt(phraseNumber) known up to the phrase after the last one queued; in a session started without phrase 1, started with TransportStartOptions.phraseOneStart 'handed-over' (absent, 'count-in-end') and clickForced, phrase 1's first beat is set on the click plan at the hand-over's soundsAt by startPhraseOneAt(soundsAt), phraseStartsAt throws until then, queueBacking(1) starts phrase 1's backing at that beat, and a soundsAt that is not a barline of the click plan at or after the count-in's end is refused (src/audio/audio-transport.ts, over src/audio/backing-track.ts).

## EXPECTATION
The clicks follow the transport's tempo map, the count-in at the starting tempo.
In a session started without phrase 1, phrase 1 and its backing start at the handed-over barline, the beats before it at the starting tempo; asking a phrase's start before the hand-over, or handing over a time off the barlines, fails.
