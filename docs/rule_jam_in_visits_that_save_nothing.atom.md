---
id: rule_jam_in_visits_that_save_nothing
status: DRAFT
layer: BUSINESS
version: 0.1
priority: 1
tags: [v3, release-v3.2, session, jam, storage]
notes: Created 2026-10-08 at DRAFT by the v3.1 and v3.2 spec ingestion, from the v3.2 master spec the product owner approved on 2026-10-08. Describes intended v3.2 behaviour: nothing of it is built yet. It falls outside the vision as it stands (STABLE, scoped through v2) until the proposed vision revision is confirmed (docs/release/v3.1-v3.2-intent-change-set.md).
type: RULE
human_name: Jam in a Visit That Saves Nothing
parents:
  - [[req_jam]]
dependents: []
---

# Jam in a Visit That Saves Nothing

## INTENT
Let Jam work in a visit that must not write, without saving or deleting anything.

## THE RULE / LOGIC
In an outdated tab and in a visit whose saved data could not be read, Jam, its review, the key and mode suggestion with Use it and Keep mine, and Jam again on this doodle work in memory for the visit; nothing is saved, a declined suggestion included, and that visit's deletion rules are unchanged. A kept Jam session written by a newer version is listed as such and does not open, as any such session.

## TECHNICAL INTERFACE
Jam writes nothing in visits that save nothing.

## EXPECTATION
- In an outdated tab or a failed-read visit, a Jam runs, reviews, suggests and holds its doodle, and nothing is written.
