---
id: rule_jam_silence_timer_from_phrase_one
status: DRAFT
type: RULE
version: 0.1
priority: 1
human_name: A Jam's Silence Timer Waits for Phrase 1
tags: [v3, release-v3.2, session, jam, midi, session-end]
parents:
  - [[req_jam]]
layer: BUSINESS
notes: Created 2026-10-08 at DRAFT by the follow-up to the v3.1 and v3.2 spec ingestion, after the v3.2 master spec, approved by the product owner on 2026-10-08, settled how the silence timer runs in a Jam. Describes intended v3.2 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
dependents: []
---

# A Jam's Silence Timer Waits for Phrase 1

## INTENT
Keep the session's silence timer for the phrases, so the notes that start a Jam never time it out.

## THE RULE / LOGIC
In a fresh Jam, one started without a held doodle, neither the home note that starts it nor the doodle's notes start the session's silence timer. Before phrase 1 sounds, such a Jam ends for silence only under its own rule: no doodle note within 30 seconds after its count-in. From phrase 1 on, the silence timer works as after a Start click: it waits for a first note played from phrase 1 on, and once that note has armed it, more than 30 seconds without a played note ends the session. A Jam on a held doodle has no capture and starts on phrase 1's first note as any session does, so its silence timer works as in any session.

## TECHNICAL INTERFACE
In a fresh Jam the session's silence timer is armed only by a note played from phrase 1 on.

## EXPECTATION
- In a fresh Jam, neither the home note nor any doodle note arms the silence timer.
- From phrase 1 on, the timer waits for a first note played from phrase 1 on; after it, more than 30 seconds without a played note ends the session.
- In a Jam on a held doodle, the silence timer behaves as in any session.
