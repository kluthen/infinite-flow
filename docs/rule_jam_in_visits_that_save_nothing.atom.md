---
id: rule_jam_in_visits_that_save_nothing
status: DRAFT
layer: BUSINESS
version: 0.2
priority: 1
tags: [v3, release-v3.2, session, jam, storage]
type: RULE
human_name: Jam Mode in a Visit That Saves Nothing
parents:
  - [[req_jam]]
dependents: []
---

# Jam Mode in a Visit That Saves Nothing

## INTENT
Let Jam work in a visit that must not write, without saving or deleting anything.

## THE RULE / LOGIC
In an outdated tab and in a visit whose saved data could not be read, Jam mode, its Jams, their review, the key and mode suggestion with Use it and Keep mine, the kept doodle and Jam again on this doodle work in memory for the visit; nothing is saved, Jam's settings and a declined suggestion included, and that visit's deletion rules are unchanged. A kept Jam session written by a newer version is listed as such and does not open, as any such session.

## TECHNICAL INTERFACE
Jam writes nothing in visits that save nothing.

## EXPECTATION
- In an outdated tab or a failed-read visit, Jam mode runs Jams, reviews them, suggests and keeps its doodle, and nothing is written, Jam's settings included.
