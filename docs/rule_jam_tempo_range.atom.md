---
id: rule_jam_tempo_range
status: DRAFT
type: RULE
layer: BUSINESS
version: 0.1
priority: 1
human_name: Jam's Tempo Runs From 60 to 180 BPM and Is Set Before the Doodle
tags: [v3, release-v3.2, jam, tempo]
parents:
  - [[req_jam_settings]]
dependents:
  - [[rule_jam_tap_in_listening]]
  - [[rule_jam_tempo_from_taps]]
---

# Jam's Tempo Runs From 60 to 180 BPM and Is Set Before the Doodle

## INTENT
Give the doodle a beat grid set in advance, at tempos a Jam can serve.

## THE RULE / LOGIC
Jam's tempo is one of its own settings, set at Jam mode's Idle before the doodle: the count-in plays at it and the doodle is played over the click at it, so the capture, the snapping to sixteenths, the doodle's end and the wait for phrase 1 all follow a beat grid known before Start. Jam's tempo control runs from 60 to 180 BPM in steps of 10. Session mode's tempo range, 60 to 240 BPM, is unchanged. A tempo change, tap-in included, changes no phrase.

## TECHNICAL INTERFACE
Jam's tempo control offers 60 to 180 BPM in steps of 10, at Jam mode's Idle.

## EXPECTATION
- Jam's tempo can be set from 60 to 180 BPM in steps of 10, and a Jam's count-in and click play at it.
- Changing Jam's tempo changes no phrase.
- Session mode's tempo range stays 60 to 240 BPM.
