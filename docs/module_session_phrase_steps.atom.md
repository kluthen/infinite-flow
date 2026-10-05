---
id: module_session_phrase_steps
status: DRAFT
type: MODULE
parents:
  - [[req_adaptive_tempo]]
  - [[req_rolling_practice_session]]
  - [[req_session_backing_track]]
  - [[rule_session_change_applies_at_phrase_boundary]]
  - [[service_workspace_session_flow]]
dependents: []
layer: ARCHITECTURE
version: 0.1
priority: 1
human_name: Session Phrase Steps
tags: workspace,session,tempo
notes: Split out on 2026-10-05 from service_workspace_session_flow (version 1.6) during documentation debt paydown; the text is moved unchanged in meaning and keeps its DRAFT status.
---

# Session Phrase Steps

## INTENT
Carry each look-ahead phrase from 2 on from the moment it is ready to its scheduled sounding at the tempo the engine fixes for it.

## THE RULE / LOGIC
Whatever the adaptive-tempo flag, each phrase from 2 on goes through two steps, kept by the session's phrase steps: at phrase ready the read-ahead display shows it and it is kept; on the phrase tempo output, once the engine has fixed its tempo, the controller queues that phrase's backing on the audio transport at that tempo, adds its expected notes to note acknowledgement at that tempo, hands that tempo to the display's playhead and schedules its starting to sound at the transport's start of that phrase. A phrase-discarded output takes the discarded look-ahead back from the phrase steps and the display before its tempo is fixed, so the same phrase number is readied again. The rolling display's playhead keeps its own per-phrase tempo map, each segment anchored at the transport's start of a phrase whose tempo differs from the one before, never a beat reading of the transport.

## TECHNICAL INTERFACE
A running session's phrases from 2 on go through createSessionPhrases in src/components/workspace/workspace-session-phrases.ts, fed phraseReady(phrase) at the phrase-ready output, phraseTempo(phraseNumber, tempo) at the phrase-tempo output and phraseDiscarded(phraseNumber) at the phrase-discarded output, each in phrase order (out of order, a tempo for a phrase never readied, or a discard of anything but the latest kept phrase, throws); a discarded number is readied again.

## EXPECTATION
Each phrase from 2 on has its backing, its acknowledgement and its sounding scheduled at the tempo the engine fixed for it, and the playhead follows its own per-phrase tempo map anchored at the transport's phrase starts.
