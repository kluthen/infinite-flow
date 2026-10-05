---
id: rule_adaptive_tempo_flat_schedule
status: REVIEW
type: RULE
layer: BUSINESS
version: 0.2
priority: 1
human_name: Adaptive Tempo Flat Schedule
tags: [v2, release-v2.0, part-v2.2, session, tempo]
parents:
  - [[req_adaptive_tempo]]
dependents:
  - [[module_session_adaptive_tempo_schedule]]
  - [[service_session_engine]]
---

# Adaptive Tempo Flat Schedule

## INTENT
Raise the tempo on a fixed schedule that never depends on how the player performs.

## THE RULE / LOGIC
While adaptive tempo is on, the tempo rises by 5 BPM every 2 phrases, regardless of what the player plays, or whether they play at all. The rise stops at the tempo control's ceiling, 240 BPM. It only ever raises the tempo: it never decreases it automatically. Each rise applies at a phrase boundary, like any mid-session setting change. While a controller lost mid-session is away, the tempo does not rise: the phrases that start sounding meanwhile do not count toward the next rise, and counting resumes where it stopped when the controller reconnects.

## TECHNICAL INTERFACE
A per-session schedule adds 5 BPM every second counted phrase up to 240 BPM; phrases that start sounding while a controller lost mid-session is away are not counted.

## EXPECTATION
- With adaptive tempo on, the tempo rises by exactly 5 BPM every 2 phrases until 240 BPM, whatever the player does.
- The tempo never decreases automatically.
- While a controller lost mid-session is away, the tempo does not rise and the phrases starting meanwhile are not counted; after the reconnection, counting resumes where it stopped.
