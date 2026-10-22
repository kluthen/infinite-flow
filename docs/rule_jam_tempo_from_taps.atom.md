---
id: rule_jam_tempo_from_taps
status: DRAFT
priority: 1
human_name: The Tempo From the Taps
parents:
  - [[rule_jam_tempo_range]]
dependents: []
type: RULE
layer: BUSINESS
tags: [v3, release-v3.2, jam, tempo, non-scoring]
version: 0.1
---

# The Tempo From the Taps

## INTENT
Turn the player's taps into a tempo without ever judging them.

## THE RULE / LOGIC
From the fourth tap on, Jam's tempo is the mean beat of the last four taps (the time from the first of them to the last, divided by three), rounded to the tempo control's nearest step of 10 BPM, a tie going to the slower, and kept inside 60 to 180 BPM. The tempo control shows it at once, and each further tap updates it. Unevenness is never judged: no tap is refused for being early or late.

## TECHNICAL INTERFACE
The tempo control follows the taps from the fourth on.

## EXPECTATION
- From the fourth tap, Jam's tempo is the mean beat of the last four taps, rounded to the nearest 10 BPM (a tie to the slower) and kept inside 60 to 180 BPM.
- No tap is ever refused or marked for being uneven.
