---
id: rule_two_measures_before_jam_phrase_one
status: DRAFT
version: 0.1
human_name: Two Measures Between the Doodle and Phrase 1
tags: [v3, release-v3.2, session, jam, look-ahead]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
type: RULE
layer: BUSINESS
priority: 1
parents:
  - [[req_jam]]
dependents: []
---

# Two Measures Between the Doodle and Phrase 1

## INTENT
Give the app time to write phrase 1 and the player a measure to read it before it sounds.

## THE RULE / LOGIC
After a doodle, the session generates phrase 1 itself, under its rules for any phrase it generates, during the generation measure; the row above the staff says so. Then comes the read-in measure: phrase 1 is on screen and its beats are counted, before it sounds with the backing. So two measures separate the doodle and phrase 1: 2 s at 240 BPM, 4 s at 120 BPM, 8 s at 60 BPM. The second one keeps the promise of at least one measure of read-ahead on screen. Phrase 1 starts with a fresh note on beat 1, as every phrase does, so no pickup or tie crosses from the doodle.

## TECHNICAL INTERFACE
A Jam's timeline after the doodle has a generation measure and a read-in measure before phrase 1.

## EXPECTATION
- When phrase 1 is ready in time, it is shown one read-in measure before it sounds, and two measures after the doodle ended.
- Phrase 1 begins with a fresh note on beat 1.
